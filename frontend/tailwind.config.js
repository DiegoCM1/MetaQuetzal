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
      fontFamily: {
        'square721':        ['Square721'],
        'poppins':          ['Poppins-Light'],
        'poppins-semibold': ['Poppins-SemiBold'],
      },
      colors: {
        // Brand primary
        'brand-blue':   '#3167ff',
        'brand-indigo': '#3900ff',
        'brand-cyan':   '#2ecaff',
        'brand-black':  '#000000',

        // Brand secondary
        'brand-orange': '#ff8500',
        'brand-yellow': '#ffce00',
        'brand-purple': '#9200ff',
        'brand-green':  '#00e774',
        'brand-red':    '#e24337',
        'brand-teal':   '#4ed5de',

        //Phase 5
        phase5bg: "rgb(240, 220, 250)", // Fase 5 Fondo (Lila claro)
        phase5Cards: "rgb(255, 60, 60)", // Fase 5 Insignia (Rojo brillante)

        //Phase 4
        phase4bg: "rgb(255, 220, 180)", // Fase 4 Fondo (Beige anaranjado)
        phase4Cards: "rgb(255, 150, 50)", // Fase 4 Insignia (Naranja brillante)

        //Phase 3
        phase3bg: "rgb(255, 255, 180)", // Fase 3 Fondo (Amarillo pálido)
        phase3Cards: "rgb(255, 220, 50)", // Fase 3 Insignia (Amarillo brillante)

        //Phase 1
        phase1bg: "rgb(200, 255, 200)", // Fase 1 Fondo (Verde menta claro)
        phase1Cards: "rgb(50, 255, 50)", // Fase 1 Insignia (Verde neón)

        // Daltonic mode colors
        phase2bgDaltonic: "#F4F4F4", // Fondo neutro para daltonismo
        phase2CardsDaltonic: "#E67E22", // Fondo/acento secundario para daltonismo
        phase2ButtonsDaltonic: "#1ABC9C", // Acento para elementos interactivos
        phase2TitlesDaltonic: "#0072CE", // Azul accesible para encabezados
        phase2SmallTxtDaltonic: "#34495E", // Texto principal en alto contraste
        phase2BordersDaltonic: "#FFC107", // Color de resaltado accesible
        phase2SecondaryTxtDaltonic: "#34495E", // Gris de alto contraste para subtítulos
      },
    },
  },
  plugins: [],
};
