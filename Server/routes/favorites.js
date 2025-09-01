const express = require('express');
const router = express.Router();
const db = require('../db'); // connection ใช้ mysql2 แบบ callback

// GET favorites ทั้งหมดของ user
router.get('/:userId', (req, res) => {
  const { userId } = req.params;
  db.query('SELECT novelId FROM favorites_novel WHERE UserId = ?', [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// POST เพิ่ม favorites
router.post('/', (req, res) => {
  const { userId, novelId } = req.body;
  db.query('INSERT INTO favorites_novel (UserId, novelId) VALUES (?, ?)', [userId, novelId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// DELETE ลบ favorites
router.delete('/', (req, res) => {
  const { userId, novelId } = req.body;
  db.query('DELETE FROM favorites_novel WHERE UserId = ? AND novelId = ?', [userId, novelId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

module.exports = router;