/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        severity: {
          low: '#10b981',     // green-500
          medium: '#f59e0b',  // amber-500
          high: '#ef4444',    // red-500
          critical: '#7f1d1d' // red-900
        }
      }
    },
  },
  plugins: [],
}
