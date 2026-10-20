/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          forest: '#184e32', forestDark: '#0d3822', ochre: '#c59b27', ochreDeep: '#b8860b',
          ivory: '#fcfbf7', warmCard: '#f7f5ee', border: '#e9e5d9',
          herb: '#246942', rust: '#bc4747', charcoal: '#222522', subtle: '#414942'
        }
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
