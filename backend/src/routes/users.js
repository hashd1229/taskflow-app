import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { asyncHandler, sendError, sendSuccess } from '../middleware/error.js';

const router = Router();

router.get('/', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return sendError(res, 500, error.message);

  const { count: totalProjects } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });

  const { count: totalTasks } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true });

  const admins = (data || []).filter((u) => u.role === 'admin').length;

  return sendSuccess(res, {
    users: data || [],
    stats: {
      totalUsers: data?.length || 0,
      totalProjects: totalProjects || 0,
      totalTasks: totalTasks || 0,
      admins,
    },
  });
}));

router.put('/:userId/role', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!['admin', 'project_manager', 'team_member'].includes(role)) {
    return sendError(res, 400, 'Invalid role');
  }

  if (userId === req.user.id) {
    return sendError(res, 400, 'You cannot change your own role');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) return sendError(res, 400, error.message);

  return sendSuccess(res, { profile: data });
}));

export default router;
