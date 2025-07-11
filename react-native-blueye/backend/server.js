const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Endpoint de salud
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'BlueEye Backend funcionando correctamente'
  });
});

// Endpoint principal de riesgo meteorológico
app.post('/risk', async (req, res) => {
  try {
    const { lat, lon } = req.body;
    
    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Coordenadas lat y lon son requeridas'
      });
    }

    console.log(`Analizando riesgo para coordenadas: ${lat}, ${lon}`);

    // Obtener datos meteorológicos actuales
    const currentWeather = await getCurrentWeather(lat, lon);
    
    // Obtener pronóstico extendido
    const forecast = await getForecast(lat, lon);
    
    // Calcular nivel de riesgo
    const riskAnalysis = calculateRiskLevel(currentWeather, forecast);
    
    // Generar alertas específicas
    const alerts = generateAlerts(riskAnalysis, currentWeather);
    
    // Respuesta estructurada
    res.json({
      location: {
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        name: currentWeather.name,
        country: currentWeather.sys.country
      },
      riskLevel: riskAnalysis.level, // 'low', 'medium', 'high', 'extreme'
      riskScore: riskAnalysis.score, // 0-100
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
      alerts: alerts,
      banner: generateBanner(riskAnalysis),
      recommendations: generateRecommendations(riskAnalysis),
      factors: riskAnalysis.factors,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en endpoint /risk:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Función para obtener clima actual
async function getCurrentWeather(lat, lon) {
  const API_KEY = process.env.OPENWEATHER_API_KEY;
  
  if (!API_KEY) {
    throw new Error('API Key de OpenWeatherMap no configurada');
  }

  const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
    params: {
      lat,
      lon,
      appid: API_KEY,
      units: 'metric',
      lang: 'es'
    }
  });
  
  return response.data;
}

// Función para obtener pronóstico
async function getForecast(lat, lon) {
  const API_KEY = process.env.OPENWEATHER_API_KEY;
  
  const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
    params: {
      lat,
      lon,
      appid: API_KEY,
      units: 'metric',
      lang: 'es'
    }
  });
  
  return response.data;
}

// Función principal de cálculo de riesgo
function calculateRiskLevel(currentWeather, forecast) {
  let riskScore = 0;
  let factors = [];

  // Factor 1: Velocidad del viento
  const windSpeed = currentWeather.wind?.speed || 0;
  if (windSpeed > 25) {
    riskScore += 30;
    factors.push(`Vientos extremos (${windSpeed.toFixed(1)} m/s)`);
  } else if (windSpeed > 15) {
    riskScore += 20;
    factors.push(`Vientos fuertes (${windSpeed.toFixed(1)} m/s)`);
  } else if (windSpeed > 8) {
    riskScore += 10;
    factors.push(`Vientos moderados (${windSpeed.toFixed(1)} m/s)`);
  }

  // Factor 2: Presión atmosférica (indicador de tormentas)
  const pressure = currentWeather.main.pressure;
  if (pressure < 980) {
    riskScore += 25;
    factors.push(`Presión atmosférica muy baja (${pressure} hPa)`);
  } else if (pressure < 1000) {
    riskScore += 15;
    factors.push(`Presión atmosférica baja (${pressure} hPa)`);
  }

  // Factor 3: Condiciones meteorológicas
  const weather = currentWeather.weather[0].main.toLowerCase();
  const description = currentWeather.weather[0].description;
  
  if (weather.includes('thunderstorm')) {
    riskScore += 35;
    factors.push(`Tormenta eléctrica: ${description}`);
  } else if (weather.includes('rain') && windSpeed > 10) {
    riskScore += 20;
    factors.push(`Lluvia con vientos: ${description}`);
  } else if (weather.includes('snow') && windSpeed > 15) {
    riskScore += 25;
    factors.push(`Tormenta de nieve: ${description}`);
  } else if (weather.includes('rain')) {
    riskScore += 10;
    factors.push(`Precipitación: ${description}`);
  }

  // Factor 4: Visibilidad
  const visibility = currentWeather.visibility || 10000;
  if (visibility < 1000) {
    riskScore += 20;
    factors.push(`Visibilidad muy baja (${(visibility/1000).toFixed(1)} km)`);
  } else if (visibility < 5000) {
    riskScore += 10;
    factors.push(`Visibilidad reducida (${(visibility/1000).toFixed(1)} km)`);
  }

  // Factor 5: Temperatura extrema
  const temp = currentWeather.main.temp;
  if (temp > 40) {
    riskScore += 15;
    factors.push(`Temperatura extrema alta (${temp}°C)`);
  } else if (temp < -10) {
    riskScore += 15;
    factors.push(`Temperatura extrema baja (${temp}°C)`);
  }

  // Factor 6: Análisis del pronóstico (próximas 24 horas)
  const forecastRisk = analyzeForecastTrend(forecast);
  riskScore += forecastRisk.score;
  factors = factors.concat(forecastRisk.factors);

  // Determinar nivel de riesgo
  let level;
  if (riskScore >= 80) {
    level = 'extreme';
  } else if (riskScore >= 60) {
    level = 'high';
  } else if (riskScore >= 30) {
    level = 'medium';
  } else {
    level = 'low';
  }

  return {
    score: Math.min(riskScore, 100),
    level,
    factors
  };
}

// Análisis de tendencias del pronóstico
function analyzeForecastTrend(forecast) {
  let score = 0;
  let factors = [];

  // Analizar próximas 8 predicciones (24 horas)
  const next24Hours = forecast.list.slice(0, 8);
  
  // Buscar patrones de empeoramiento
  let stormCount = 0;
  let maxWind = 0;
  let minPressure = 1013;
  let heavyRainCount = 0;

  next24Hours.forEach(item => {
    const weather = item.weather[0].main.toLowerCase();
    
    if (weather.includes('thunderstorm')) {
      stormCount++;
    }
    
    if (item.wind?.speed > maxWind) {
      maxWind = item.wind.speed;
    }
    
    if (item.main.pressure < minPressure) {
      minPressure = item.main.pressure;
    }

    // Detectar lluvia intensa
    if (item.rain && item.rain['3h'] > 10) {
      heavyRainCount++;
    }
  });

  if (stormCount >= 3) {
    score += 20;
    factors.push('Tormentas persistentes previstas (24h)');
  }

  if (maxWind > 20) {
    score += 15;
    factors.push(`Vientos fuertes previstos (${maxWind.toFixed(1)} m/s)`);
  }

  if (minPressure < 990) {
    score += 15;
    factors.push(`Caída de presión prevista (${minPressure} hPa)`);
  }

  if (heavyRainCount >= 2) {
    score += 10;
    factors.push('Lluvias intensas previstas');
  }

  return { score, factors };
}

// Generar alertas específicas
function generateAlerts(riskAnalysis, currentWeather) {
  const alerts = [];

  if (riskAnalysis.level === 'extreme') {
    alerts.push({
      type: 'EMERGENCY',
      category: 5,
      title: 'ALERTA METEOROLÓGICA EXTREMA',
      message: 'Condiciones meteorológicas extremas detectadas. Evacue si es necesario.',
      priority: 'high',
      actions: [
        'Busque refugio inmediatamente',
        'Evite salir al exterior',
        'Manténgase informado',
        'Tenga kit de emergencia listo'
      ],
      location: currentWeather.name
    });
  } else if (riskAnalysis.level === 'high') {
    alerts.push({
      type: 'WARNING',
      category: 4,
      title: 'ALERTA METEOROLÓGICA ALTA',
      message: 'Condiciones meteorológicas peligrosas. Tome precauciones inmediatas.',
      priority: 'medium',
      actions: [
        'Limite actividades al aire libre',
        'Asegure objetos sueltos',
        'Monitoree condiciones constantemente',
        'Prepare kit de emergencia'
      ],
      location: currentWeather.name
    });
  } else if (riskAnalysis.level === 'medium') {
    alerts.push({
      type: 'ADVISORY',
      category: 2,
      title: 'AVISO METEOROLÓGICO',
      message: 'Condiciones meteorológicas que requieren atención.',
      priority: 'low',
      actions: [
        'Manténgase informado',
        'Evite actividades de riesgo',
        'Tenga precaución al conducir'
      ],
      location: currentWeather.name
    });
  }

  return alerts;
}

// Generar banner informativo
function generateBanner(riskAnalysis) {
  const banners = {
    extreme: {
      color: '#8B0000',
      backgroundColor: '#FFE4E1',
      text: '🚨 PELIGRO EXTREMO',
      description: 'Condiciones meteorológicas extremas',
      icon: '🚨'
    },
    high: {
      color: '#FF4500',
      backgroundColor: '#FFF8DC',
      text: '⚠️ ALTO RIESGO',
      description: 'Condiciones meteorológicas peligrosas',
      icon: '⚠️'
    },
    medium: {
      color: '#FFA500',
      backgroundColor: '#FFFACD',
      text: '⚡ PRECAUCIÓN',
      description: 'Condiciones meteorológicas adversas',
      icon: '⚡'
    },
    low: {
      color: '#32CD32',
      backgroundColor: '#F0FFF0',
      text: '✅ CONDICIONES NORMALES',
      description: 'Condiciones meteorológicas estables',
      icon: '✅'
    }
  };

  return banners[riskAnalysis.level];
}

// Generar recomendaciones específicas
function generateRecommendations(riskAnalysis) {
  const recommendations = {
    extreme: [
      'Permanezca en un lugar seguro y resistente',
      'No conduzca a menos que sea absolutamente necesario',
      'Tenga agua y alimentos para 72 horas',
      'Mantenga dispositivos cargados y radio funcionando',
      'Escuche alertas oficiales de Protección Civil',
      'Evite ventanas y estructuras débiles'
    ],
    high: [
      'Evite todas las actividades al aire libre',
      'Conduzca con extrema precaución o evítelo',
      'Asegure objetos que puedan volarse con el viento',
      'Tenga linterna, radio y suministros a mano',
      'Manténgase alejado de árboles y estructuras altas'
    ],
    medium: [
      'Planifique actividades al aire libre con cuidado',
      'Lleve ropa adecuada para las condiciones',
      'Manténgase informado de cambios en el clima',
      'Tenga precaución extra al conducir'
    ],
    low: [
      'Disfrute del día con normalidad',
      'Condiciones ideales para actividades al aire libre',
      'Mantenga rutina normal de actividades'
    ]
  };

  return recommendations[riskAnalysis.level];
}

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: 'Algo salió mal procesando la solicitud'
  });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `La ruta ${req.originalUrl} no existe`
  });
});

app.listen(PORT, () => {
  console.log(`🌊 BlueEye Backend ejecutándose en puerto ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`⚡ Risk endpoint: http://localhost:${PORT}/risk`);
});

module.exports = app;
