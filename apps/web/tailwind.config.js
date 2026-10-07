/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colors extracted from Magic Mug Logo (Image 1)
        maroon: {
          50: '#FDF4F5',
          100: '#FBE8E9',
          200: '#F7D4D7',
          300: '#EFB0B6',
          400: '#E1828C',
          500: '#C84D5B',
          600: '#94232F',
          700: '#741A23', // Primary Logo Burgundy/Maroon
          800: '#61161D', // Deep Coffee Cup Maroon
          900: '#4D1016',
          950: '#34080D',
        },
        forest: {
          50: '#F2F9F4',
          100: '#E1F2E6',
          200: '#C4E5CE',
          300: '#97D1A9',
          400: '#64B67E',
          500: '#3D9A5B',
          600: '#2C7D46',
          700: '#1E4D2B', // Primary Logo Script Green
          800: '#194024',
          900: '#15351E',
          950: '#0A1E10',
        },
        surface: {
          50: '#FFFFFF',
          100: '#FAFBFD',
          200: '#F4F5F7', // Main background canvas from Dribbble shot
          300: '#EAECEF',
          400: '#D8DCE2',
          500: '#94A3B8',
          600: '#64748B',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'card': '0 2px 12px -2px rgba(0, 0, 0, 0.04), 0 1px 3px 0 rgba(0, 0, 0, 0.02)',
        'card-hover': '0 12px 24px -4px rgba(116, 26, 35, 0.08), 0 4px 8px -2px rgba(0, 0, 0, 0.03)',
        'glow-maroon': '0 4px 20px -2px rgba(116, 26, 35, 0.35)',
        'glow-forest': '0 4px 20px -2px rgba(30, 77, 43, 0.35)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      }
    },
  },
  plugins: [],
}
