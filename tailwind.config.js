/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        'xs': '320px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      colors: {
        // OKLCH Color Scheme - Modern perceptual color space
        primary: {
          DEFAULT: 'oklch(45.9% 0.187 3.815)',      // Base color
          50: 'oklch(95% 0.02 3.815)',              // Very light
          100: 'oklch(90% 0.04 3.815)',             // Light
          200: 'oklch(80% 0.08 3.815)',             // Lighter
          300: 'oklch(70% 0.12 3.815)',             // Light-medium
          400: 'oklch(60% 0.15 3.815)',             // Medium-light
          500: 'oklch(45.9% 0.187 3.815)',          // Base (your color)
          600: 'oklch(40% 0.20 3.815)',             // Medium-dark
          700: 'oklch(35% 0.18 3.815)',             // Dark
          800: 'oklch(30% 0.15 3.815)',             // Darker
          900: 'oklch(25% 0.12 3.815)',             // Darkest
        },
        secondary: {
          DEFAULT: 'oklch(55% 0.20 320)',           // Complementary hue
          50: 'oklch(95% 0.02 320)',
          100: 'oklch(90% 0.04 320)',
          200: 'oklch(80% 0.08 320)',
          300: 'oklch(70% 0.12 320)',
          400: 'oklch(60% 0.15 320)',
          500: 'oklch(55% 0.20 320)',
          600: 'oklch(50% 0.22 320)',
          700: 'oklch(45% 0.20 320)',
          800: 'oklch(40% 0.18 320)',
          900: 'oklch(35% 0.15 320)',
        },
        accent: {
          DEFAULT: 'oklch(65% 0.25 30)',            // Vibrant accent
          pink: 'oklch(65% 0.25 30)',
          green: 'oklch(70% 0.18 145)',
          red: 'oklch(55% 0.22 25)',
          yellow: 'oklch(75% 0.15 85)',
        },
        background: {
          DEFAULT: 'oklch(20% 0.02 240)',           // Dark background
          dark: 'oklch(15% 0.015 240)',
          light: 'oklch(25% 0.03 240)',
        },
        surface: {
          DEFAULT: 'oklch(30% 0.04 240)',           // Surface elements
          light: 'oklch(35% 0.05 240)',
          lighter: 'oklch(40% 0.06 240)',
        },
        text: {
          primary: 'oklch(95% 0.01 240)',           // Light text
          secondary: 'oklch(75% 0.03 240)',
          muted: 'oklch(60% 0.04 240)',
        },
        status: {
          success: 'oklch(70% 0.18 145)',
          error: 'oklch(55% 0.22 25)',
          warning: 'oklch(75% 0.15 85)',
          info: 'oklch(60% 0.20 240)',
        },
        glass: {
          white: 'rgba(255, 255, 255, 0.1)',
          dark: 'rgba(0, 0, 0, 0.3)',
          border: 'rgba(255, 255, 255, 0.2)',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      padding: {
        'safe': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
      },
    },
  },
  plugins: [],
}