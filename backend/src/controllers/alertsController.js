const alertsStore = require('../data/alertsStore');

exports.listAlerts = (req, res) => {
  res.json(alertsStore.getAll());
};

exports.getAlert = (req, res) => {
  const alert = alertsStore.getById(req.params.id);
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }
  res.json(alert);
};
