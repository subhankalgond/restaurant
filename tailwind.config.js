/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neutralBg: '#FBF9F5',
        surface: '#F3EFEA',
        surfaceBorder: '#E5DFD7',
        forest: {
          900: '#132E22',
          800: '#1B4332',
          700: '#245842',
          600: '#2D6A4F',
          100: '#E9F3EE',
          50: '#F4F9F6',
        },
        charcoal: {
          900: '#1F2421',
          700: '#404743',
          500: '#6B746E',
          300: '#A2AAA4',
        },
        earthAmber: {
          DEFAULT: '#A76527',
          light: '#F8F1EB',
          border: '#E3CCA8',
        },
        earthRed: {
          DEFAULT: '#9E3A3A',
          light: '#F8ECEC',
          border: '#E8BDBD',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Public Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
      }
    },
  },
  plugins: [],
}
