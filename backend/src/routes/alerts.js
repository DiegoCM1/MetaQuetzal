const express = require('express');
const router = express.Router();
const { listAlerts, getAlert } = require('../controllers/alertsController');

router.get('/', listAlerts);
router.get('/:id', getAlert);

module.exports = router;
