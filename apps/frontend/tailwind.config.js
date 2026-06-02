/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
    '../../modules/*/frontend/pages/**/*.{js,jsx}',
    '../../modules/*/frontend/components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
