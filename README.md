# BluEye

BluEye es una aplicación móvil multiplataforma enfocada en la prevención y respuesta ante huracanes. Utiliza geolocalización en tiempo real, datos de OpenWeather y un asistente de IA disponible en [ai-blueye](https://github.com/DiegoCM1/ai-blueye) para ofrecer alertas personalizadas y recomendaciones seguras.

## Características principales
- **Alertas en tiempo real** con información meteorológica oficial.
- **Guía asistida por IA** para preguntas de emergencia.
- **Mapeo de rutas seguras y refugios públicos**.
- **Funcionamiento sin conexión** usando los últimos datos guardados.

## Estructura del repositorio
- **frontend/** - Aplicación React Native con Expo. Contiene pantallas, componentes y la conexión con la IA.
- **backend/** - Servidor Express que calcula el riesgo meteorológico y almacena retroalimentación.
- **README.md** - Este documento.

## Building for Android

Para generar un APK de prueba se utiliza **Expo EAS**:

1. Instala la CLI con `npm install -g eas-cli`.
2. Dentro de `frontend/` crea un archivo `eas.json` (ya incluido) con:

   ```json
   {
     "cli": { "appVersionSource": "remote" },
     "build": {
       "preview": { "android": { "buildType": "apk" } }
     }
   }
   ```

3. Inicia sesión con `eas login` y ejecuta:

   ```bash
   eas build --profile preview --platform android
   ```

EAS subirá el proyecto y te entregará un enlace para descargar el APK.

## Cómo empezar
1. Clona este repositorio y el proyecto [ai-blueye](https://github.com/DiegoCM1/ai-blueye).
2. Instala dependencias en cada carpeta con `npm install`.
3. Copia `frontend/.env.example` a `frontend/.env` y coloca tu clave de OpenWeather.
4. En `frontend/` ejecuta `npx expo start` para arrancar la app.
5. En `backend/` ejecuta `npm start` para iniciar la API.

## Contribución
1. Haz un *fork* del repositorio y crea una rama para tus cambios.
2. Envía un *pull request* describiendo la mejora o corrección.
3. Si encuentras problemas, abre un *issue* para poder revisarlo.

“Preparados hoy, seguros mañana”. 🌀
