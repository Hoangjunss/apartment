/** @type {import('tailwindcss').Config} */
export default {
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
