const { fetchRiskData } = require('../services/openWeather');

exports.getRisk = async (req, res) => {
  try {
    const { lat, lon } = req.body;
    if (!lat || !lon) {
      return res.status(400).json({ error: 'lat and lon are required' });
    }

    const data = await fetchRiskData(lat, lon);
    res.json(data);
  } catch (err) {
    console.error('Risk controller error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
