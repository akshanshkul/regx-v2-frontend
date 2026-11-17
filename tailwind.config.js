/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        regx: {
          orange: '#EC4D2D',
          dark: '#111315',
          cream: '#FAF8F4',
          muted: '#74777B',
          line: '#E7E3DC'
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif']
      }
    }
  },
  plugins: [],
}
