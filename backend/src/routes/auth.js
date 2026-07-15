import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { asyncHandler, sendError, sendSuccess } from '../middleware/error.js';

const router = Router();

router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, fullName } = req.body;

  if (!email || !password) {
    return sendError(res, 400, 'Email and password are required');
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName || '' } },
  });

  if (error) return sendError(res, 400, error.message);

  return sendSuccess(res, {
    user: data.user,
    session: data.session,
    message: 'Account created successfully',
  }, 201);
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, 400, 'Email and password are required');
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return sendError(res, 401, error.message);

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();

  return sendSuccess(res, {
    user: data.user,
    session: data.session,
    profile,
  });
}));

router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  await supabase.auth.signOut({ scope: 'global' });
  return sendSuccess(res, { message: 'Logged out successfully' });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    user: req.user,
    profile: req.profile,
  });
}));

router.put('/me', authenticate, asyncHandler(async (req, res) => {
  const { fullName, avatarUrl } = req.body;

  const updates = {};
  if (fullName !== undefined) updates.full_name = fullName;
  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', req.user.id)
    .select()
    .single();

  if (error) return sendError(res, 400, error.message);

  return sendSuccess(res, { profile: data });
}));

router.get('/users', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return sendError(res, 500, error.message);

  return sendSuccess(res, { users: data });
}));

router.put('/users/:userId/role', authenticate, requireAdmin, asyncHandler(async (req, res) => {
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
