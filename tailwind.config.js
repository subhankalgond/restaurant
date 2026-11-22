/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme matching screenshot
        darkBg: '#0B0E14',
        darkSidebar: '#080A0F',
        darkCard: '#111622',
        darkCardHover: '#161C2A',
        darkBorder: '#1E2638',
        darkBorderSubtle: '#181F2E',
        emeraldAccent: '#00D26A',
        emeraldHover: '#00B85C',
        
        // Mapped tokens for seamless backwards compatibility
        neutralBg: '#0B0E14',
        surface: '#111622',
        surfaceBorder: '#1E2638',
        forest: {
          900: '#06080C',
          800: '#00D26A',
          700: '#00B85C',
          600: '#059669',
          100: '#00D26A',
          50: '#111622',
        },
        charcoal: {
          900: '#F8FAFC',
          700: '#CBD5E1',
          500: '#94A3B8',
          300: '#64748B',
          100: '#334155',
        },
        earthAmber: {
          DEFAULT: '#F59E0B',
          light: '#78350F',
          border: '#B45309',
        },
        earthRed: {
          DEFAULT: '#EF4444',
          light: '#7F1D1D',
          border: '#B91C1C',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        md: '10px',
        lg: '14px',
        xl: '18px',
      }
    },
  },
  plugins: [],
}
