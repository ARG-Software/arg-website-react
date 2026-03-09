import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    allowedHosts: [
      'd3b9-2001-8a0-ca52-db00-110b-ef74-2977-6084.ngrok-free.app'
    ]
  },
  build: {
    minify: 'esbuild',
    cssMinify: true,
    modulePreload: false,
    esbuild: {
      drop: ['console', 'debugger'],
    },
    rollupOptions: {
  output: {
    manualChunks(id) {
      if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
        return 'vendor';
      }
      if (id.includes('node_modules/three')) {
        return 'three';
      }
    },
  },
},
  },
});
