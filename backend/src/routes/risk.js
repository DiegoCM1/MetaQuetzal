const express = require('express');
const router = express.Router();
const { getRisk } = require('../controllers/riskController');

router.post('/', getRisk);

module.exports = router;
