import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'

// 🎯 CrypTalk Frontend - Configuração Modular
export default defineConfig({
  plugins: [react()],
  root: './interface',
  publicDir: '../assets/public',
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
        warn(warning);
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@chakra-ui/react', '@emotion/react', '@emotion/styled'],
          utils: ['axios', 'crypto-js']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 5173,
    host: true,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './interface/src'),
      '@components': resolve(__dirname, './interface/src/components'),
      '@services': resolve(__dirname, './interface/src/services'),
      '@config': resolve(__dirname, './interface/src/config'),
      '@utils': resolve(__dirname, './interface/src/utils')
    }
  }
})