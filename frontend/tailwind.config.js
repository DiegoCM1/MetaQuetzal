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
      },
    },
  },
  plugins: [],
};
