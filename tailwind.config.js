/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.{html,js}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#ff4b4b',
          hover: '#e03e3e',
        },
        secondary: {
          DEFAULT: '#3a86ff',
          hover: '#2d6fd9',
        },
        background: '#f8f9fa',
        card: '#ffffff',
        text: {
          primary: '#333333',
          secondary: '#666666',
          muted: '#999999',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} 