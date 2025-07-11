const express = require('express');
const router = express.Router();
const { submitFeedback, listFeedback } = require('../controllers/feedbackController');

router.post('/', submitFeedback);
router.get('/', listFeedback);

module.exports = router;
