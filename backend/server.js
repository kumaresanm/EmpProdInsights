require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { requireAuth, useAuth } = require('./auth');

const entriesRouter = require('./routes/entries');
const uploadRouter = require('./routes/upload');
const dashboardRouter = require('./routes/dashboard');
const adminRouter = require('./routes/admin');

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/config', (req, res) => {
  res.json({
    useAuth: !!useAuth,
    supabaseUrl: useAuth ? process.env.SUPABASE_URL : undefined,
    supabaseAnonKey: useAuth ? process.env.SUPABASE_ANON_KEY : undefined
  });
});

app.use('/api/entries', requireAuth, entriesRouter);
app.use('/api/upload', requireAuth, uploadRouter);
app.use('/api/dashboard', requireAuth, dashboardRouter);
app.use('/api/admin', requireAuth, adminRouter);

// Serve built Angular app (for production deploy e.g. Render)
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir, { index: false }));
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Auth: ${useAuth ? 'enabled (Supabase)' : 'disabled'}`);
});
