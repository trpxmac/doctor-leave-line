/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bsi: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          hospital: '#006699', // Bangkok Hospital Siriroj Primary Blue
          teal: '#008b8b',
          accent: '#f59e0b',
          danger: '#dc2626',
          success: '#16a34a',
        },
        line: {
          green: '#06C755',
          dark: '#05B34C',
          light: '#E6F9EE',
        }
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
        floating: '0 10px 30px -5px rgba(0, 102, 153, 0.2)',
      },
      fontFamily: {
        sans: ['Prompt', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
