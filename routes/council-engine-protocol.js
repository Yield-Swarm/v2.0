const express = require('express');
const router = express.Router();

router.get('/stats', (req, res) => {
  res.json({
    total_reviews: 0,
    total_votes: 0,
    last_review: null,
    llms_online: 9,
    threshold: 8,
    total_weight: 15,
  });
});

router.get('/reviews', (req, res) => {
  res.json({ reviews: [] });
});

router.get('/votes/:taskId', (req, res) => {
  res.json({ taskId: req.params.taskId, votes: [] });
});

router.post('/review', (req, res) => {
  res.json({ accepted: true, taskId: req.body.task_id });
});

module.exports = router;