import { supabase } from '../lib/supabase.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = header.split(' ')[1];

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    req.user = user;
    req.profile = profile || { id: user.id, role: 'team_member', full_name: user.user_metadata?.full_name || '' };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.profile || !roles.includes(req.profile.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

export function requireManagerOrAdmin(req, res, next) {
  return requireRole('admin', 'project_manager')(req, res, next);
}
