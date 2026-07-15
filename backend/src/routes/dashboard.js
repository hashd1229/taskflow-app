import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, sendError, sendSuccess } from '../middleware/error.js';

const router = Router();

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { profile } = req;

  let projectIds = [];

  if (profile.role !== 'admin') {
    const { data: ownedProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('owner_id', profile.id);
    const { data: memberProjects } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', profile.id);
    projectIds = [
      ...(ownedProjects || []).map((p) => p.id),
      ...(memberProjects || []).map((m) => m.project_id),
    ];
  }

  let query = supabase
    .from('activity_log')
    .select('*, profile:profiles!activity_log_user_id_fkey(full_name)')
    .order('created_at', { ascending: false })
    .limit(20);

  if (profile.role !== 'admin' && projectIds.length > 0) {
    query = query.in('project_id', projectIds);
  } else if (profile.role !== 'admin') {
    return sendSuccess(res, { activity: [] });
  }

  const { data, error } = await query;
  if (error) return sendError(res, 500, error.message);

  return sendSuccess(res, { activity: data || [] });
}));

router.get('/stats', authenticate, asyncHandler(async (req, res) => {
  const { profile } = req;

  let projectIds = [];

  if (profile.role !== 'admin') {
    const { data: ownedProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('owner_id', profile.id);
    const { data: memberProjects } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', profile.id);
    projectIds = [
      ...(ownedProjects || []).map((p) => p.id),
      ...(memberProjects || []).map((m) => m.project_id),
    ];
  }

  let projectsQuery = supabase.from('projects').select('*', { count: 'exact', head: true });
  if (profile.role !== 'admin' && projectIds.length > 0) {
    projectsQuery = projectsQuery.in('id', projectIds);
  } else if (profile.role !== 'admin') {
    return sendSuccess(res, {
      stats: {
        totalProjects: 0, activeProjects: 0,
        totalTasks: 0, completedTasks: 0,
        myTasks: 0, overdueTasks: 0,
      },
    });
  }
  const { count: totalProjects } = await projectsQuery;

  let activeProjectsQuery = supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active');
  if (profile.role !== 'admin' && projectIds.length > 0) {
    activeProjectsQuery = activeProjectsQuery.in('id', projectIds);
  }
  const { count: activeProjects } = await activeProjectsQuery;

  let tasksQuery = supabase.from('tasks').select('*', { count: 'exact', head: true });
  if (profile.role !== 'admin' && projectIds.length > 0) {
    tasksQuery = tasksQuery.in('project_id', projectIds);
  }
  const { count: totalTasks } = await tasksQuery;

  let completedTasksQuery = supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'done');
  if (profile.role !== 'admin' && projectIds.length > 0) {
    completedTasksQuery = completedTasksQuery.in('project_id', projectIds);
  }
  const { count: completedTasks } = await completedTasksQuery;

  const { count: myTasks } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_to', profile.id)
    .neq('status', 'done');

  const today = new Date().toISOString().split('T')[0];
  let overdueQuery = supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .lt('due_date', today)
    .neq('status', 'done');
  if (profile.role !== 'admin' && projectIds.length > 0) {
    overdueQuery = overdueQuery.in('project_id', projectIds);
  }
  const { count: overdueTasks } = await overdueQuery;

  return sendSuccess(res, {
    stats: {
      totalProjects: totalProjects || 0,
      activeProjects: activeProjects || 0,
      totalTasks: totalTasks || 0,
      completedTasks: completedTasks || 0,
      myTasks: myTasks || 0,
      overdueTasks: overdueTasks || 0,
    },
  });
}));

export default router;
