/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#111827',
          surface: '#1f2937',
          border: '#374151',
          text: '#f9fafb',
          muted: '#9ca3af',
        },
      },
    },
  },
  plugins: [],
};
