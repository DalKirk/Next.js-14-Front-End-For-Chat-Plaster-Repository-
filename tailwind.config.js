/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // OKLCH Color Scheme - Based on oklch(45.9% 0.187 3.815)
        primary: {
          DEFAULT: 'oklch(45.9% 0.187 3.815)',      // Base color
          50: 'oklch(96% 0.035 3.815)',             // Very light
          100: 'oklch(92% 0.055 3.815)',            // Light
          200: 'oklch(85% 0.09 3.815)',             // Lighter
          300: 'oklch(75% 0.12 3.815)',             // Light-medium
          400: 'oklch(60% 0.15 3.815)',             // Medium-light
          500: 'oklch(45.9% 0.187 3.815)',          // Base
          600: 'oklch(38% 0.19 3.815)',             // Medium-dark
          700: 'oklch(32% 0.17 3.815)',             // Dark
          800: 'oklch(26% 0.14 3.815)',             // Darker
          900: 'oklch(20% 0.11 3.815)',             // Darkest
        },
        secondary: {
          DEFAULT: 'oklch(52% 0.17 3.815)',         // Slightly lighter variant
          50: 'oklch(95% 0.03 3.815)',
          100: 'oklch(90% 0.05 3.815)',
          200: 'oklch(82% 0.09 3.815)',
          300: 'oklch(72% 0.13 3.815)',
          400: 'oklch(62% 0.15 3.815)',
          500: 'oklch(52% 0.17 3.815)',
          600: 'oklch(42% 0.18 3.815)',
          700: 'oklch(35% 0.16 3.815)',
          800: 'oklch(28% 0.13 3.815)',
          900: 'oklch(22% 0.10 3.815)',
        },
        accent: {
          DEFAULT: 'oklch(55% 0.20 3.815)',         // More vibrant
          light: 'oklch(65% 0.18 3.815)',
          dark: 'oklch(40% 0.22 3.815)',
        },
        background: {
          DEFAULT: 'oklch(18% 0.025 3.815)',        // Dark with base hue
          dark: 'oklch(14% 0.02 3.815)',
          light: 'oklch(24% 0.035 3.815)',
          lighter: 'oklch(30% 0.045 3.815)',
        },
        surface: {
          DEFAULT: 'oklch(28% 0.045 3.815)',        // Surface with base hue
          light: 'oklch(34% 0.055 3.815)',
          lighter: 'oklch(40% 0.065 3.815)',
          hover: 'oklch(32% 0.06 3.815)',
        },
        text: {
          primary: 'oklch(96% 0.015 3.815)',        // Light text with hint of base
          secondary: 'oklch(80% 0.04 3.815)',
          muted: 'oklch(65% 0.06 3.815)',
          inverse: 'oklch(25% 0.08 3.815)',
        },
        status: {
          success: 'oklch(65% 0.16 145)',           // Keep functional colors
          error: 'oklch(55% 0.20 25)',
          warning: 'oklch(75% 0.14 85)',
          info: 'oklch(55% 0.18 3.815)',            // Use base hue for info
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
    },
  },
  plugins: [],
}