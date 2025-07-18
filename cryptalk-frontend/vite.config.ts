import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      onwarn(warning, warn) {
        // Ignora avisos de TypeScript
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
        target: process.env.VITE_TUNNEL_ACTIVE === 'true' 
          ? (process.env.VITE_TUNNEL_URL || 'https://furthermore-decide-para-ste.trycloudflare.com')
          : 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      },
      '/ws': {
        target: process.env.VITE_TUNNEL_ACTIVE === 'true'
          ? (process.env.VITE_TUNNEL_URL || 'https://furthermore-decide-para-ste.trycloudflare.com').replace('https://', 'wss://')
          : 'ws://localhost:8080',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ws/, '/ws')
      }
    }
  },
  preview: {
    port: 4173,
    host: true,
    cors: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@services': resolve(__dirname, 'src/services'),
      '@config': resolve(__dirname, 'src/config'),
      '@utils': resolve(__dirname, 'src/utils')
    }
  }
})
