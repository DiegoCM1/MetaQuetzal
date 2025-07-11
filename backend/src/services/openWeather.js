const axios = require('axios');

const API_KEY = process.env.OPENWEATHER_API_KEY;

exports.fetchRiskData = async (lat, lon) => {
  if (!API_KEY) {
    throw new Error('Missing OpenWeather API key');
  }

  // Placeholder implementation
  // TODO: fetch real data from OpenWeather and compute risk
  return {
    location: { lat, lon },
    message: 'Risk calculation not implemented'
  };
};
