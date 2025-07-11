const axios = require('axios');
const {
  getCurrentWeather,
  getForecast,
  calculateRiskLevel,
  generateAlerts,
  generateBanner,
  generateRecommendations
} = require('./riskAnalysis');

const API_KEY = process.env.OPENWEATHER_API_KEY;

exports.fetchRiskData = async (lat, lon) => {
  if (!API_KEY) {
    throw new Error('Missing OpenWeather API key');
  }

  const currentWeather = await getCurrentWeather(lat, lon, API_KEY);
  const forecast = await getForecast(lat, lon, API_KEY);
  const risk = calculateRiskLevel(currentWeather, forecast);
  const alerts = generateAlerts(risk, currentWeather);

  return {
    location: {
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      name: currentWeather.name,
      country: currentWeather.sys.country
    },
    riskLevel: risk.level,
    riskScore: risk.score,
    currentConditions: {
      temperature: currentWeather.main.temp,
      humidity: currentWeather.main.humidity,
      pressure: currentWeather.main.pressure,
      windSpeed: currentWeather.wind?.speed || 0,
      windDirection: currentWeather.wind?.deg || 0,
      visibility: currentWeather.visibility || 10000,
      weather: currentWeather.weather[0].main,
      description: currentWeather.weather[0].description
    },
    alerts,
    banner: generateBanner(risk),
    recommendations: generateRecommendations(risk),
    factors: risk.factors,
    timestamp: new Date().toISOString()
  };
};
