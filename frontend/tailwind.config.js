/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/styles/**/*.css"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primaryPurple: {
          DEFAULT: "#7B2CBF", 
          light: "#9D4EDD",
          dark: "#5A189A",
          accent: "#6366f1", 
        },
        gold: {
          light: "#fde68a",
          DEFAULT: "#E7B96A", 
          dark: "#b45309",
        },
        slate: {
          900: "#0f172a",
          950: "#020617", 
        },
      },
      fontFamily: {
        belleza: ["Belleza", "sans-serif"],
        sans: ["Inter", "sans-serif"],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};