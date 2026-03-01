import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('firebase')) {
              return 'firebase-vendor';
            }
            if (id.includes('@tauri-apps')) {
              return 'tauri-vendor';
            }
            if (id.includes('recharts')) {
              return 'chart-vendor';
            }
            if (id.includes('date-fns') || id.includes('crypto-js') || id.includes('xlsx')) {
              return 'utils-vendor';
            }
            return 'vendor';
          }
          
          if (id.includes('/pages/')) {
            return 'pages';
          }
          if (id.includes('/components/')) {
            return 'components';
          }
          if (id.includes('/utils/') || id.includes('/hooks/')) {
            return 'utils';
          }
          if (id.includes('/firebase/')) {
            return 'firebase';
          }
        }
      }
    }
  },
  server: {
    port: 5173
  }
})
