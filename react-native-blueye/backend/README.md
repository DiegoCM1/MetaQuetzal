# BlueEye Backend - Análisis de Riesgo Meteorológico

Este backend proporciona análisis inteligente de riesgo meteorológico basado en datos en tiempo real de OpenWeatherMap.

## Características

✅ **Análisis de Riesgo en Tiempo Real**: Calcula niveles de riesgo basados en múltiples factores meteorológicos
✅ **Integración con OpenWeatherMap**: Consume datos actuales y pronósticos
✅ **Alertas Inteligentes**: Genera alertas automáticas basadas en condiciones peligrosas
✅ **API RESTful**: Endpoint `/risk` fácil de consumir desde el frontend
✅ **Escalable**: Arquitectura modular para agregar más factores de riesgo

## Instalación

```bash
cd backend
npm install
```

## Configuración

Crear archivo `.env`:
```env
OPENWEATHER_API_KEY=tu_api_key_aqui
PORT=3002
```

## Uso

### Iniciar el servidor
```bash
npm start
# o para desarrollo:
npm run dev
```

### Probar el backend
```bash
./test-backend.sh
```

## Endpoints

### GET /health
Verificar estado del servidor
```json
{
  "status": "OK",
  "timestamp": "2025-07-03T...",
  "message": "BlueEye Backend funcionando correctamente"
}
```

### POST /risk
Analizar riesgo meteorológico para coordenadas específicas

**Request:**
```json
{
  "lat": 20.659698,
  "lon": -103.349609
}
```

**Response:**
```json
{
  "location": {
    "lat": 20.659698,
    "lon": -103.349609,
    "name": "Guadalajara",
    "country": "MX"
  },
  "riskLevel": "medium",
  "riskScore": 45,
  "currentConditions": {
    "temperature": 28.5,
    "humidity": 65,
    "pressure": 1008,
    "windSpeed": 12.5,
    "windDirection": 180,
    "visibility": 8000,
    "weather": "Rain",
    "description": "lluvia ligera"
  },
  "alerts": [...],
  "banner": {...},
  "recommendations": [...],
  "factors": [...],
  "timestamp": "2025-07-03T..."
}
```

## Niveles de Riesgo

| Nivel | Score | Descripción |
|-------|-------|-------------|
| `low` | 0-29 | Condiciones normales |
| `medium` | 30-59 | Precaución requerida |
| `high` | 60-79 | Condiciones peligrosas |
| `extreme` | 80-100 | Peligro extremo |

## Factores de Riesgo Analizados

- **Velocidad del viento** (> 8 m/s)
- **Presión atmosférica** (< 1000 hPa)
- **Condiciones meteorológicas** (tormentas, lluvia intensa)
- **Visibilidad** (< 5 km)
- **Temperaturas extremas** (> 40°C o < -10°C)
- **Tendencias del pronóstico** (empeoramiento en 24h)

## Arquitectura

```
backend/
├── server.js          # Servidor principal
├── package.json       # Dependencias
├── .env              # Variables de entorno
├── test-backend.sh   # Script de pruebas
└── README.md         # Documentación
```

## Integración con Frontend

El frontend puede consumir este backend usando el servicio `riskService.js`:

```javascript
import riskService from '../services/riskService.js';

// Obtener análisis de riesgo
const riskData = await riskService.getRiskAnalysis(lat, lon);

// Verificar si se debe mostrar alerta
if (riskService.shouldShowAlert(riskData.riskLevel)) {
  // Mostrar alerta
}
```

## Despliegue

Este backend está preparado para desplegarse en:
- Railway
- Heroku
- DigitalOcean App Platform
- AWS/Google Cloud

## Próximas Mejoras

- [ ] Cache de datos para optimizar peticiones
- [ ] Base de datos para histórico de riesgos
- [ ] Integración con más fuentes de datos meteorológicos
- [ ] Análisis de tendencias históricas
- [ ] Notificaciones push automáticas
- [ ] Análisis específico de huracanes/ciclones

## Soporte

Para reportar problemas o sugerir mejoras, crear un issue en el repositorio.
