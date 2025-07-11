import axios from 'axios';
import BACKEND_CONFIG from '../config/backend.js';

// Servicio para interactuar con el backend de riesgo meteorológico
class RiskService {
  constructor() {
    this.baseURL = BACKEND_CONFIG.BASE_URL;
  }

  // Verificar si el backend está funcionando
  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseURL}${BACKEND_CONFIG.ENDPOINTS.HEALTH}`);
      return response.data;
    } catch (error) {
      console.error('Error checking backend health:', error);
      throw new Error('Backend no disponible');
    }
  }

  // Obtener análisis de riesgo para coordenadas específicas
  async getRiskAnalysis(lat, lon) {
    try {
      if (!lat || !lon) {
        throw new Error('Coordenadas lat y lon son requeridas');
      }

      console.log(`Obteniendo análisis de riesgo para: ${lat}, ${lon}`);

      const response = await axios.post(`${this.baseURL}${BACKEND_CONFIG.ENDPOINTS.RISK}`, {
        lat: parseFloat(lat),
        lon: parseFloat(lon)
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 segundos timeout
      });

      return response.data;
    } catch (error) {
      console.error('Error getting risk analysis:', error);
      
      if (error.response) {
        // El servidor respondió con un código de error
        throw new Error(`Error del servidor: ${error.response.data.message || error.response.statusText}`);
      } else if (error.request) {
        // La petición fue hecha pero no se recibió respuesta
        throw new Error('No se pudo conectar con el servidor de riesgo');
      } else {
        // Error al configurar la petición
        throw new Error(`Error de configuración: ${error.message}`);
      }
    }
  }

  // Formatear datos de riesgo para mostrar en el UI
  formatRiskData(riskData) {
    return {
      // Información básica
      location: riskData.location,
      riskLevel: riskData.riskLevel,
      riskScore: riskData.riskScore,
      
      // Para el banner principal
      banner: {
        ...riskData.banner,
        show: riskData.riskLevel !== 'low'
      },
      
      // Para las alertas (compatible con alarmScreens.jsx)
      alert: riskData.alerts.length > 0 ? {
        category: riskData.alerts[0].category,
        title: riskData.alerts[0].title,
        message: riskData.alerts[0].message,
        actions: riskData.alerts[0].actions,
        priority: riskData.alerts[0].priority,
        type: riskData.alerts[0].type
      } : null,
      
      // Condiciones actuales
      weather: {
        temperature: riskData.currentConditions.temperature,
        humidity: riskData.currentConditions.humidity,
        windSpeed: riskData.currentConditions.windSpeed,
        pressure: riskData.currentConditions.pressure,
        description: riskData.currentConditions.description,
        main: riskData.currentConditions.weather
      },
      
      // Recomendaciones
      recommendations: riskData.recommendations,
      
      // Factores de riesgo
      riskFactors: riskData.factors,
      
      // Timestamp
      lastUpdate: new Date(riskData.timestamp)
    };
  }

  // Determinar si se debe mostrar una alerta
  shouldShowAlert(riskLevel) {
    return ['medium', 'high', 'extreme'].includes(riskLevel);
  }

  // Obtener color del banner basado en el nivel de riesgo
  getBannerColor(riskLevel) {
    const colors = {
      low: '#32CD32',      // Verde
      medium: '#FFA500',   // Naranja
      high: '#FF4500',     // Rojo naranja
      extreme: '#8B0000'   // Rojo oscuro
    };
    return colors[riskLevel] || colors.low;
  }

  // Obtener ícono basado en el nivel de riesgo
  getRiskIcon(riskLevel) {
    const icons = {
      low: '✅',
      medium: '⚡',
      high: '⚠️',
      extreme: '🚨'
    };
    return icons[riskLevel] || icons.low;
  }
}

// Instancia singleton del servicio
const riskService = new RiskService();

export default riskService;
