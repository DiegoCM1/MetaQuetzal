const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const riskRoutes = require('./routes/risk');
const alertsRoutes = require('./routes/alerts');
const feedbackRoutes = require('./routes/feedback');

// Initialize database
require('./services/db');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.use('/risk', riskRoutes);
app.use('/alerts', alertsRoutes);
app.use('/feedback', feedbackRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'BlueEye backend running'
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = app;
