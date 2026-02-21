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
  deleteAllData
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

/** DELETE /api/admin/data – delete all entries and clear machines, employees, programs (Admin only) */
router.delete('/data', async (req, res) => {
  try {
    await deleteAllData();
    res.json({ ok: true, message: 'All data deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to delete data' });
  }
});

module.exports = router;
