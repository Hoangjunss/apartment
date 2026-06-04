import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Resolve workspace modules
      'modules': path.resolve(__dirname, '../../modules'),
      // Ensure shared modules resolve to frontend's node_modules
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      'react-router-dom': path.resolve(__dirname, './node_modules/react-router-dom'),
      '@tanstack/react-query': path.resolve(__dirname, './node_modules/@tanstack/react-query'),
      'lucide-react': path.resolve(__dirname, './node_modules/lucide-react'),
      'date-fns': path.resolve(__dirname, './node_modules/date-fns'),
      'axios': path.resolve(__dirname, './node_modules/axios'),
      'react-hot-toast': path.resolve(__dirname, './node_modules/react-hot-toast'),
      'qrcode.react': path.resolve(__dirname, './node_modules/qrcode.react'),
    },
  },
  server: {
    port: 5173,
  },
});
