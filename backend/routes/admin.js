const express = require('express');
const router = express.Router();
const {
  loadMachines,
  loadEmployees,
  loadPrograms,
  addMachine,
  removeMachine,
  addEmployee,
  removeEmployee,
  addProgram,
  removeProgram,
  loadDayEvents,
  upsertDayEvent,
  removeDayEvent
} = require('../db');

router.get('/machines', async (req, res) => {
  try {
    const list = await loadMachines();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/machines', async (req, res) => {
  try {
    const raw = req.body && (req.body.name !== undefined ? req.body.name : req.body);
    const name = raw != null ? String(raw).trim() : '';
    if (!name) return res.status(400).json({ error: 'Name required' });
    const list = await addMachine(name);
    res.status(201).json(list);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

router.delete('/machines/:name', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const list = await removeMachine(name);
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/employees', async (req, res) => {
  try {
    const list = await loadEmployees();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/employees', async (req, res) => {
  try {
    const raw = req.body && (req.body.name !== undefined ? req.body.name : req.body);
    const name = raw != null ? String(raw).trim() : '';
    if (!name) return res.status(400).json({ error: 'Name required' });
    const list = await addEmployee(name);
    res.status(201).json(list);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

router.delete('/employees/:name', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const list = await removeEmployee(name);
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/programs', async (req, res) => {
  try {
    const list = await loadPrograms();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/programs', async (req, res) => {
  try {
    const raw = req.body && (req.body.name !== undefined ? req.body.name : req.body);
    const name = raw != null ? String(raw).trim() : '';
    if (!name) return res.status(400).json({ error: 'Name required' });
    const list = await addProgram(name);
    res.status(201).json(list);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

router.delete('/programs/:name', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const list = await removeProgram(name);
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/admin/day-events — same as public list (for admin UI refresh) */
router.get('/day-events', async (req, res) => {
  try {
    const list = await loadDayEvents();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** POST /api/admin/day-events — one event per calendar date; replaces existing for that date */
router.post('/day-events', async (req, res) => {
  try {
    const { date, summary, detail } = req.body || {};
    const list = await upsertDayEvent({ date, summary, detail });
    res.status(201).json(list);
  } catch (e) {
    const msg = e.message || 'Failed';
    const code = /required|Invalid/i.test(msg) ? 400 : 500;
    res.status(code).json({ error: msg });
  }
});

/** DELETE /api/admin/day-events/:date — remove day event (date YYYY-MM-DD) */
router.delete('/day-events/:date', async (req, res) => {
  try {
    const date = decodeURIComponent(req.params.date);
    const list = await removeDayEvent(date);
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** DELETE /api/admin/data – disabled (bulk wipe removed to prevent accidental data loss) */
router.delete('/data', (_req, res) => {
  res.status(403).json({ error: 'Delete all data is disabled' });
});

module.exports = router;
