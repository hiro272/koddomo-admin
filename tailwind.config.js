/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream:   '#FBF6EC',
        card:    '#FFFFFF',
        ink:     '#16302C',
        muted:   '#5C6B66',
        line:    '#E7DFD0',
        teal:    { DEFAULT: '#0E6E63', dark: '#0B564E', soft: '#2E9E83' },
        amber:   { DEFAULT: '#E0922F', soft: '#F4C879', tint: '#FBEAD0' },
        danger:  '#C2452E',
      },
      fontFamily: {
        display: ['Fredoka', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans:    ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontWeight: { 400: '400', 500: '500', 600: '600', 700: '700' },
      boxShadow: {
        card: '0 1px 2px rgba(22,48,44,.05), 0 6px 20px -12px rgba(22,48,44,.18)',
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
}
