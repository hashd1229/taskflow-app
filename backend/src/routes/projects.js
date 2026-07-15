import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate, requireManagerOrAdmin } from '../middleware/auth.js';
import { asyncHandler, sendError, sendSuccess } from '../middleware/error.js';

const router = Router();

// GET / — list all projects (based on role)
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { profile } = req;

  let projectList = [];

  if (profile.role === 'admin') {
    // Admin sees all projects
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return sendError(res, 500, error.message);
    projectList = data || [];
  } else {
    // Non‑admin: own projects + projects where they are a member
    const { data: owned } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', profile.id);

    const { data: memberships } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', profile.id);

    const memberProjectIds = (memberships || []).map(m => m.project_id);
    let memberProjects = [];
    if (memberProjectIds.length > 0) {
      const { data: mData } = await supabase
        .from('projects')
        .select('*')
        .in('id', memberProjectIds);
      memberProjects = mData || [];
    }

    const all = [...(owned || []), ...memberProjects];
    const uniqueIds = new Set();
    projectList = all
      .filter(p => {
        if (uniqueIds.has(p.id)) return false;
        uniqueIds.add(p.id);
        return true;
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const projectIds = projectList.map(p => p.id);
  let memberCounts = {};
  let taskCounts = {};

  if (projectIds.length > 0) {
    const { data: members } = await supabase
      .from('project_members')
      .select('project_id')
      .in('project_id', projectIds);
    (members || []).forEach(m => {
      memberCounts[m.project_id] = (memberCounts[m.project_id] || 0) + 1;
    });

    const { data: tasks } = await supabase
      .from('tasks')
      .select('project_id, status')
      .in('project_id', projectIds);
    (tasks || []).forEach(t => {
      if (!taskCounts[t.project_id]) taskCounts[t.project_id] = { total: 0, done: 0 };
      taskCounts[t.project_id].total++;
      if (t.status === 'done') taskCounts[t.project_id].done++;
    });
  }

  const projects = projectList.map(p => ({
    ...p,
    member_count: memberCounts[p.id] || 0,
    task_total: taskCounts[p.id]?.total || 0,
    task_done: taskCounts[p.id]?.done || 0,
  }));

  return sendSuccess(res, { projects });
}));

// GET /:id — single project with members and tasks (enriched)
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { profile } = req;

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) return sendError(res, 500, error.message);
  if (!project) return sendError(res, 404, 'Project not found');

  if (profile.role !== 'admin' && project.owner_id !== profile.id) {
    const { data: member } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', id)
      .eq('user_id', profile.id)
      .maybeSingle();
    if (!member) return sendError(res, 403, 'You do not have access to this project');
  }

  // Fetch members (without explicit FK hint) and enrich with profiles
  let enrichedMembers = [];
  const { data: members } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', id);

  if (members && members.length > 0) {
    const userIds = [...new Set(members.map(m => m.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, role, avatar_url')
      .in('id', userIds);

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
    enrichedMembers = members.map(m => ({
      ...m,
      profile: profileMap[m.user_id] || null,
    }));
  }

  // Fetch tasks (without explicit FK hints) and enrich with assignee/creator names
  let enrichedTasks = [];
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false });

  if (tasks && tasks.length > 0) {
    const assigneeIds = [...new Set(tasks.map(t => t.assigned_to).filter(Boolean))];
    const creatorIds = [...new Set(tasks.map(t => t.created_by).filter(Boolean))];
    const allUserIds = [...new Set([...assigneeIds, ...creatorIds])];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', allUserIds);

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

    enrichedTasks = tasks.map(t => ({
      ...t,
      assignee: t.assigned_to ? profileMap[t.assigned_to] || null : null,
      creator: t.created_by ? profileMap[t.created_by] || null : null,
    }));
  }

  return sendSuccess(res, {
    project,
    members: enrichedMembers,
    tasks: enrichedTasks,
  });
}));

// POST / — create a project (admin or manager)
router.post('/', authenticate, requireManagerOrAdmin, asyncHandler(async (req, res) => {
  const { name, description, status, startDate, dueDate } = req.body;

  if (!name || !name.trim()) {
    return sendError(res, 400, 'Project name is required');
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: name.trim(),
      description: description || null,
      status: status || 'planning',
      owner_id: req.profile.id,
      start_date: startDate || null,
      due_date: dueDate || null,
    })
    .select()
    .single();

  if (error) return sendError(res, 400, error.message);

  await supabase.from('activity_log').insert({
    action: 'project_created',
    description: `created project "${name}"`,
    project_id: data.id,
    user_id: req.profile.id,
  });

  return sendSuccess(res, { project: data }, 201);
}));

// PUT /:id — update a project
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, status, startDate, dueDate } = req.body;
  const { profile } = req;

  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', id)
    .maybeSingle();

  if (!project) return sendError(res, 404, 'Project not found');

  const canManage =
    profile.role === 'admin' ||
    project.owner_id === profile.id;

  if (!canManage) return sendError(res, 403, 'Insufficient permissions');

  const updates = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (status !== undefined) updates.status = status;
  if (startDate !== undefined) updates.start_date = startDate || null;
  if (dueDate !== undefined) updates.due_date = dueDate || null;

  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return sendError(res, 400, error.message);

  return sendSuccess(res, { project: data });
}));

// DELETE /:id — delete a project
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { profile } = req;

  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', id)
    .maybeSingle();

  if (!project) return sendError(res, 404, 'Project not found');

  if (profile.role !== 'admin' && project.owner_id !== profile.id) {
    return sendError(res, 403, 'Insufficient permissions');
  }

  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) return sendError(res, 400, error.message);

  return sendSuccess(res, { message: 'Project deleted successfully' });
}));

// GET /:id/members — list members of a project
router.get('/:id/members', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('project_members')
    .select('*, profile:profiles!project_members_user_id_fkey(id, full_name, role, avatar_url)')
    .eq('project_id', id)
    .order('created_at', { ascending: false });

  if (error) return sendError(res, 500, error.message);

  return sendSuccess(res, { members: data || [] });
}));

// POST /:id/members — add a member (admin or project owner)
router.post('/:id/members', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, role } = req.body;
  const { profile } = req;

  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', id)
    .maybeSingle();

  if (!project) return sendError(res, 404, 'Project not found');

  const canManage =
    profile.role === 'admin' ||
    project.owner_id === profile.id;

  if (!canManage) return sendError(res, 403, 'Insufficient permissions');

  const { data, error } = await supabase
    .from('project_members')
    .insert({
      project_id: id,
      user_id: userId,
      role: role || 'member',
    })
    .select()
    .single();

  if (error) return sendError(res, 400, error.message);

  const { data: user } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle();

  await supabase.from('activity_log').insert({
    action: 'member_added',
    description: `added ${user?.full_name || 'a member'} to the project`,
    project_id: id,
    user_id: profile.id,
  });

  return sendSuccess(res, { member: data }, 201);
}));

// PUT /:id/members/:memberId — update a member's role
router.put('/:id/members/:memberId', authenticate, asyncHandler(async (req, res) => {
  const { id, memberId } = req.params;
  const { role } = req.body;
  const { profile } = req;

  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', id)
    .maybeSingle();

  if (!project) return sendError(res, 404, 'Project not found');

  if (profile.role !== 'admin' && project.owner_id !== profile.id) {
    return sendError(res, 403, 'Insufficient permissions');
  }

  const { data, error } = await supabase
    .from('project_members')
    .update({ role })
    .eq('id', memberId)
    .select()
    .single();

  if (error) return sendError(res, 400, error.message);

  return sendSuccess(res, { member: data });
}));

// DELETE /:id/members/:memberId — remove a member
router.delete('/:id/members/:memberId', authenticate, asyncHandler(async (req, res) => {
  const { id, memberId } = req.params;
  const { profile } = req;

  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', id)
    .maybeSingle();

  if (!project) return sendError(res, 404, 'Project not found');

  if (profile.role !== 'admin' && project.owner_id !== profile.id) {
    return sendError(res, 403, 'Insufficient permissions');
  }

  const { error } = await supabase.from('project_members').delete().eq('id', memberId);
  if (error) return sendError(res, 400, error.message);

  return sendSuccess(res, { message: 'Member removed successfully' });
}));

export default router;
