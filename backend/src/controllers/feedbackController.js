const feedbackStore = require('../data/feedbackStore');

exports.submitFeedback = (req, res) => {
  const { rating, email, message } = req.body;

  if (!rating || Number.isNaN(parseInt(rating))) {
    return res.status(400).json({ error: 'rating is required and must be a number' });
  }

  const feedback = { rating: parseInt(rating), email, message };

  feedbackStore.insert(feedback, (err, id) => {
    if (err) {
      console.error('DB insert error:', err);
      return res.status(500).json({ error: 'failed to save feedback' });
    }
    res.status(201).json({ success: true, id });
  });
};

exports.listFeedback = (req, res) => {
  feedbackStore.getAll((err, rows) => {
    if (err) {
      console.error('DB query error:', err);
      return res.status(500).json({ error: 'failed to fetch feedback' });
    }
    res.json(rows);
  });
};
