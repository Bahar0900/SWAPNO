/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        finoly: {
          bg: '#023436',
          card: '#064143',
          blue: '#0ea5e9',
          purple: '#a855f7',
          green: '#22c55e'
        }
      }
    },
  },
  plugins: [],
}