/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // Cambiar de "media" (por defecto) a "class"
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

        // Dark mode colors
        phase2bgDark: "rgb(20, 30, 50)",
        phase2CardsDark: "rgb(40, 60, 80)",
        phase2ButtonsDark: "rgb(60, 200, 220)",
        phase2TitlesDark: "rgb(230, 230, 250)",
        phase2SmallTxtDark: "rgb(150, 150, 170)",
        phase2BordersDark: "rgb(60, 60, 70)",
        phase2SecondaryTxtDark: "rgb(180, 180, 200)",

        // Daltonic mode colors
        phase2bgDaltonic: "#F4F4F4",            // Fondo neutro para daltonismo
        phase2CardsDaltonic: "#E67E22",         // Fondo/acento secundario para daltonismo
        phase2ButtonsDaltonic: "#1ABC9C",       // Acento para elementos interactivos
        phase2TitlesDaltonic: "#0072CE",        // Azul accesible para encabezados
        phase2SmallTxtDaltonic: "#34495E",      // Texto principal en alto contraste
        phase2BordersDaltonic: "#FFC107",       // Color de resaltado accesible
        phase2SecondaryTxtDaltonic: "#34495E",    // Gris de alto contraste para subtítulos

      },
    },
  },
  plugins: [],
};
