# Frontend de BluEye

Esta es la aplicación móvil creada con React Native y Expo. Desde aquí se consume la API del backend y se envían preguntas al asistente de IA mediante el archivo `api/sendMessage.jsx`.

## Uso rápido
1. Ejecuta `npm install` para instalar dependencias.
2. Inicia la aplicación con `npx expo start` y sigue las instrucciones para abrirla en tu dispositivo o simulador.

## Carpetas destacadas
- `app/` — pantallas y navegación principal de la app.
- `components/` — componentes reutilizables e indicadores de categoría de huracán.
- `context/` — proveedores de tema y modo daltónico.
- `api/sendMessage.jsx` — helper que se conecta al servicio de IA alojado en [ai-blueye](https://github.com/DiegoCM1/ai-blueye).
- `assets/` — iconos e imágenes.

## Contribuir
1. Crea una rama desde tu *fork* con los cambios que desees proponer.
2. Abre un *pull request* y describe tu aportación.
3. Para reportar errores usa los *issues* del repositorio.
