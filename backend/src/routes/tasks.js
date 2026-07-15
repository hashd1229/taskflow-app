import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, sendError, sendSuccess } from '../middleware/error.js';

const router = Router();

async function canAccessProject(projectId, profile) {
  if (profile.role === 'admin') return true;

  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .maybeSingle();

  if (!project) return false;
  if (project.owner_id === profile.id) return true;

  const { data: member } = await supabase
    .from('project_members')
    .select('id, role')
    .eq('project_id', projectId)
    .eq('user_id', profile.id)
    .maybeSingle();

  return !!member;
}

async function canManageProject(projectId, profile) {
  if (profile.role === 'admin') return true;

  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .maybeSingle();

  if (!project) return false;
  if (project.owner_id === profile.id) return true;

  const { data: member } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', profile.id)
    .maybeSingle();

  return member?.role === 'manager';
}

router.get('/project/:projectId', authenticate, asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { profile } = req;

  const hasAccess = await canAccessProject(projectId, profile);
  if (!hasAccess) return sendError(res, 403, 'You do not have access to this project');

  const { data, error } = await supabase
    .from('tasks')
    .select('*, assignee:profiles!tasks_assigned_to_fkey(full_name), creator:profiles!tasks_created_by_fkey(full_name)')
    .eq('project_id', projectId)
    .order('position', { ascending: true });

  if (error) return sendError(res, 500, error.message);

  return sendSuccess(res, { tasks: data || [] });
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { profile } = req;

  const { data: task, error } = await supabase
    .from('tasks')
    .select('*, project:projects(id, name), assignee:profiles!tasks_assigned_to_fkey(full_name), creator:profiles!tasks_created_by_fkey(full_name)')
    .eq('id', id)
    .maybeSingle();

  if (error) return sendError(res, 500, error.message);
  if (!task) return sendError(res, 404, 'Task not found');

  const hasAccess = await canAccessProject(task.project_id, profile);
  if (!hasAccess) return sendError(res, 403, 'You do not have access to this task');

  return sendSuccess(res, { task });
}));

router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { projectId, title, description, status, priority, assignedTo, dueDate } = req.body;
  const { profile } = req;

  if (!title || !title.trim()) return sendError(res, 400, 'Task title is required');
  if (!projectId) return sendError(res, 400, 'Project ID is required');

  const canManage = await canManageProject(projectId, profile);
  if (!canManage) return sendError(res, 403, 'Insufficient permissions');

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id: projectId,
      title: title.trim(),
      description: description || null,
      status: status || 'todo',
      priority: priority || 'medium',
      assigned_to: assignedTo || null,
      created_by: profile.id,
      due_date: dueDate || null,
    })
    .select()
    .single();

  if (error) return sendError(res, 400, error.message);

  await supabase.from('activity_log').insert({
    action: 'task_created',
    description: `created task "${title}"`,
    project_id: projectId,
    task_id: data.id,
    user_id: profile.id,
  });

  return sendSuccess(res, { task: data }, 201);
}));

router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, status, priority, assignedTo, dueDate } = req.body;
  const { profile } = req;

  const { data: task } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', id)
    .maybeSingle();

  if (!task) return sendError(res, 404, 'Task not found');

  const hasAccess = await canAccessProject(task.project_id, profile);
  if (!hasAccess) return sendError(res, 403, 'You do not have access to this task');

  const updates = { updated_at: new Date().toISOString() };
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (status !== undefined) updates.status = status;
  if (priority !== undefined) updates.priority = priority;
  if (assignedTo !== undefined) updates.assigned_to = assignedTo || null;
  if (dueDate !== undefined) updates.due_date = dueDate || null;

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return sendError(res, 400, error.message);

  if (status && status !== task.status) {
    await supabase.from('activity_log').insert({
      action: 'task_status_changed',
      description: `moved "${title || data.title}" to ${status}`,
      project_id: task.project_id,
      task_id: id,
      user_id: profile.id,
    });
  } else {
    await supabase.from('activity_log').insert({
      action: 'task_updated',
      description: `updated task "${title || data.title}"`,
      project_id: task.project_id,
      task_id: id,
      user_id: profile.id,
    });
  }

  return sendSuccess(res, { task: data });
}));

router.patch('/:id/status', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const { profile } = req;

  if (!['todo', 'in_progress', 'review', 'done'].includes(status)) {
    return sendError(res, 400, 'Invalid status');
  }

  const { data: task } = await supabase
    .from('tasks')
    .select('project_id, title, status')
    .eq('id', id)
    .maybeSingle();

  if (!task) return sendError(res, 404, 'Task not found');

  const hasAccess = await canAccessProject(task.project_id, profile);
  if (!hasAccess) return sendError(res, 403, 'You do not have access to this task');

  const { data, error } = await supabase
    .from('tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return sendError(res, 400, error.message);

  await supabase.from('activity_log').insert({
    action: 'task_status_changed',
    description: `moved "${task.title}" to ${status}`,
    project_id: task.project_id,
    task_id: id,
    user_id: profile.id,
  });

  return sendSuccess(res, { task: data });
}));

router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { profile } = req;

  const { data: task } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', id)
    .maybeSingle();

  if (!task) return sendError(res, 404, 'Task not found');

  const canManage = await canManageProject(task.project_id, profile);
  if (!canManage) return sendError(res, 403, 'Insufficient permissions');

  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) return sendError(res, 400, error.message);

  return sendSuccess(res, { message: 'Task deleted successfully' });
}));

router.get('/:id/comments', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { profile } = req;

  const { data: task } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', id)
    .maybeSingle();

  if (!task) return sendError(res, 404, 'Task not found');

  const hasAccess = await canAccessProject(task.project_id, profile);
  if (!hasAccess) return sendError(res, 403, 'You do not have access to this task');

  const { data, error } = await supabase
    .from('task_comments')
    .select('*, profile:profiles!task_comments_user_id_fkey(full_name)')
    .eq('task_id', id)
    .order('created_at', { ascending: true });

  if (error) return sendError(res, 500, error.message);

  return sendSuccess(res, { comments: data || [] });
}));

router.post('/:id/comments', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const { profile } = req;

  if (!content || !content.trim()) return sendError(res, 400, 'Comment content is required');

  const { data: task } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', id)
    .maybeSingle();

  if (!task) return sendError(res, 404, 'Task not found');

  const hasAccess = await canAccessProject(task.project_id, profile);
  if (!hasAccess) return sendError(res, 403, 'You do not have access to this task');

  const { data, error } = await supabase
    .from('task_comments')
    .insert({ task_id: id, content: content.trim() })
    .select('*, profile:profiles!task_comments_user_id_fkey(full_name)')
    .single();

  if (error) return sendError(res, 400, error.message);

  return sendSuccess(res, { comment: data }, 201);
}));

router.delete('/:id/comments/:commentId', authenticate, asyncHandler(async (req, res) => {
  const { id, commentId } = req.params;
  const { profile } = req;

  const { data: comment } = await supabase
    .from('task_comments')
    .select('user_id')
    .eq('id', commentId)
    .maybeSingle();

  if (!comment) return sendError(res, 404, 'Comment not found');

  if (comment.user_id !== profile.id && profile.role !== 'admin') {
    return sendError(res, 403, 'You can only delete your own comments');
  }

  const { error } = await supabase.from('task_comments').delete().eq('id', commentId);
  if (error) return sendError(res, 400, error.message);

  return sendSuccess(res, { message: 'Comment deleted successfully' });
}));

export default router;
