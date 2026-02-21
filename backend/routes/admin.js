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
  removeProgram
} = require('../db');

router.get('/machines', (req, res) => {
  try {
    res.json(loadMachines());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/machines', (req, res) => {
  try {
    const raw = req.body && (req.body.name !== undefined ? req.body.name : req.body);
    const name = raw != null ? String(raw).trim() : '';
    if (!name) return res.status(400).json({ error: 'Name required' });
    const list = addMachine(name);
    res.status(201).json(list);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

router.delete('/machines/:name', (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const list = removeMachine(name);
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/employees', (req, res) => {
  try {
    res.json(loadEmployees());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/employees', (req, res) => {
  try {
    const raw = req.body && (req.body.name !== undefined ? req.body.name : req.body);
    const name = raw != null ? String(raw).trim() : '';
    if (!name) return res.status(400).json({ error: 'Name required' });
    const list = addEmployee(name);
    res.status(201).json(list);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

router.delete('/employees/:name', (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const list = removeEmployee(name);
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/programs', (req, res) => {
  try {
    res.json(loadPrograms());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/programs', (req, res) => {
  try {
    const raw = req.body && (req.body.name !== undefined ? req.body.name : req.body);
    const name = raw != null ? String(raw).trim() : '';
    if (!name) return res.status(400).json({ error: 'Name required' });
    const list = addProgram(name);
    res.status(201).json(list);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

router.delete('/programs/:name', (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const list = removeProgram(name);
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
