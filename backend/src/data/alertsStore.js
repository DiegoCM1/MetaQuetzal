const alerts = [];

exports.add = (alert) => {
  alerts.push(alert);
  return alert;
};

exports.getAll = () => alerts;

exports.getById = (id) => alerts.find((a) => a.id === id);
