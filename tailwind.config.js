/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vyapaar: {
          blue: '#1e3a8a',      // Deep Blue
          blueDark: '#172554',  
          blueLight: '#eff6ff',
          saffron: '#ea580c',   // Saffron Accent
          saffronHover: '#c2410c',
          emerald: '#059669',   // Success Green
          gray: '#f8fafc',      // App Background
          text: '#1e293b',      // Primary Text
          textMuted: '#64748b'
        }
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'elevated': '0 10px 30px -5px rgba(0, 0, 0, 0.08)',
      }
    },
  },
  plugins: [],
}
