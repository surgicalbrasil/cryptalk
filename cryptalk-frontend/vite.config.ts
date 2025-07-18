import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {},
    global: 'globalThis',
    // Define logger globally for Magic SDK compatibility
    'logger': 'window.logger',
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Ignora avisos de TypeScript
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
        warn(warning);
      }
    }
  }
})
