/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Fondo principal azul pastel para la mayoría de vistas
        phase2bg: "rgb(200, 230, 250)",  // Fondo azul pastel

        // Fondo principal azul pastel para la mayoría de vistas
        phase2Cards: "rgb(220,240,255)", // Fondo azul pastel más claro

        // Elementos interactivos en turquesa (botones, íconos)
        phase2Buttons: "rgb(50, 180, 200)",   // Fase 2 items turquesa

        // Tipografía principal (títulos) en azul oscuro para buen contraste
        phase2Titles: "rgb(30, 30, 60)",      // Tipografía clara (Azul oscuro)

        // Tipografía secundaria (fondo claro para textos sutiles)
        phase2SmallTxt: "rgb(240, 220, 250)", // Tipografía fondo (Lila claro)

        // Gris claro para bordes, fondos secundarios y detalles sutiles
        phase2Borders: "rgb(230, 230, 230)",  // Gris claro para bordes y separadores

        // Gris oscuro para textos menos importantes o secundarios
        phase2SecondaryTxt: "rgb(120, 120, 120)",   // Gris oscuro para subtítulos

        // Colores para modo oscuro

        // Fondo oscuro para modo oscuro
        darkBg: "rgb(18, 18, 18)",      // Fondo oscuro para modo oscuro

        // Texto claro para modo oscuro
        darkText: "rgb(220, 220, 220)",   // Texto claro para modo oscuro

        // Azul como color primario para botones y elementos principales
        primary: "rgb(0, 122, 255)",   // Azul primario para botones y enlaces

        // Gris claro para botones secundarios o elementos menos importantes
        secondary: "rgb(200, 200, 200)",  // Gris claro para botones secundarios
      },
    },
  },
  plugins: [],
};
