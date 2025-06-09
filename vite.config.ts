/** WARNING: DON'T EDIT THIS FILE */
/** WARNING: DON'T EDIT THIS FILE */
/** WARNING: DON'T EDIT THIS FILE */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import viteCompression from 'vite-plugin-compression';
import path from 'path';

function getPlugins() {
  const plugins = [
    react(),
    tsconfigPaths(),
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: 'gzip',
      ext: '.gz',
    })
  ];
  return plugins;
}

export default defineConfig({
  plugins: getPlugins(),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-libs': ['framer-motion', 'sonner', 'clsx', 'tailwind-merge'],
          'form-libs': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'chart-libs': ['recharts'],
          'dnd-libs': ['react-dnd', 'react-dnd-html5-backend']
        },
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
