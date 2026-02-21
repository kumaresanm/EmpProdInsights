const { createClient } = require('@supabase/supabase-js');

const useAuth = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
let supabase = null;
if (useAuth) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

/** Require valid Supabase JWT for /api/* when Supabase is configured. Skip if not. */
function requireAuth(req, res, next) {
  if (!useAuth) return next();
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid token' });
  }
  supabase.auth.getUser(token)
    .then(({ data: { user }, error }) => {
      if (error || !user) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
      }
      req.user = user;
      next();
    })
    .catch(() => res.status(401).json({ error: 'Unauthorized' }));
}

module.exports = { requireAuth, useAuth: !!useAuth };
