import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0f1f',
        foreground: '#f8f9ff',
        
        primary: {
          DEFAULT: '#00ffff',
          light: '#40ffff',
          dark: '#00cccc',
          50: '#e0ffff',
          100: '#c0ffff',
          200: '#80ffff',
          300: '#40ffff',
          400: '#00ffff',
          500: '#00e6e6',
          600: '#00cccc',
          700: '#0099cc',
          800: '#006666',
          900: '#003333',
        },
        
        accent: {
          DEFAULT: '#00ffff',
          light: '#40ffff',
          dark: '#00cccc',
          50: '#e0ffff',
          100: '#c0ffff',
          200: '#80ffff',
          300: '#40ffff',
          400: '#00ffff',
          500: '#00e6e6',
          600: '#00cccc',
          700: '#0099cc',
          800: '#006666',
          900: '#003333',
        },
        
        dark: {
          bg: '#0a0f1f',
          surface: '#141b2e',
          border: '#1f2844',
          hover: '#1f2844',
        },
      },
      
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #00ffff 0%, #40ffff 100%)',
      },
      
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 255, 255, 0.3)',
        'neon-cyan': '0 0 10px rgba(0, 255, 255, 0.5), inset 0 0 10px rgba(0, 255, 255, 0.2)',
      },
      
      borderColor: {
        DEFAULT: '#1f2844',
      },
      
      keyframes: {
        'neon-glow': {
          '0%, 100%': { textShadow: '0 0 5px #00ffff, 0 0 10px #00ffff' },
          '50%': { textShadow: '0 0 10px #00ffff, 0 0 20px #00ffff' },
        },
        'pulse-neon': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 255, 255, 0.8)' },
        },
      },
      
      animation: {
        'neon-glow': 'neon-glow 3s ease-in-out infinite',
        'pulse-neon': 'pulse-neon 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}

export default config
