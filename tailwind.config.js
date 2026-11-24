/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // CHILI POS exact color specification
        chiliGreen: {
          DEFAULT: '#078F36',
          dark: '#087A32',
          light: '#D8EFDF',
          bg: '#F0F8F3',
        },
        chiliBg: '#F5F6F5',
        chiliCard: '#FFFFFF',
        chiliText: {
          DEFAULT: '#171B18',
          secondary: '#777F79',
          muted: '#9CA3AF',
        },
        chiliBorder: '#E7EBE8',
        chiliWarning: '#F5BD3D',
        chiliError: '#D94A43',

        // Mapped tokens ensuring all existing pages transition seamlessly
        neutralBg: '#F5F6F5',
        surface: '#FFFFFF',
        surfaceBorder: '#E7EBE8',
        forest: {
          900: '#087A32',
          800: '#078F36',
          700: '#087A32',
          600: '#0A9C3D',
          100: '#D8EFDF',
          50: '#F0F8F3',
        },
        charcoal: {
          900: '#171B18',
          700: '#323834',
          500: '#777F79',
          300: '#B5BCB7',
          100: '#E7EBE8',
        },
        earthAmber: {
          DEFAULT: '#F5BD3D',
          light: '#FEF9EE',
          border: '#FDE68A',
        },
        earthRed: {
          DEFAULT: '#D94A43',
          light: '#FDF2F2',
          border: '#FECACA',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        md: '10px',
        lg: '14px',
        xl: '18px',
        '2xl': '22px',
        '3xl': '28px',
      },
      boxShadow: {
        card: '0 2px 8px -2px rgba(23, 27, 24, 0.05), 0 1px 4px -1px rgba(23, 27, 24, 0.03)',
        panel: '0 4px 20px -4px rgba(23, 27, 24, 0.06)',
      }
    },
  },
  plugins: [],
}
