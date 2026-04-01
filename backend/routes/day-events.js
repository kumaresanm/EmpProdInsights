const express = require('express');
const router = express.Router();
const { loadDayEvents } = require('../db');

/** GET /api/day-events — list day-wide events (e.g. power cut) for merging into entries UI */
router.get('/', async (req, res) => {
  try {
    const list = await loadDayEvents();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
