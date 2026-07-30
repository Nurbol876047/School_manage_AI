/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          light: '#E6F0EB', // Soft green for background highlight
          DEFAULT: '#10B981', // Calm green (Emerald-500)
          dark: '#059669', // Emerald-600
        },
        background: '#FAFAFA',
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
