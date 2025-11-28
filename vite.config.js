import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Exclude api folder from optimization as it contains Vercel serverless functions
    // that use Node.js modules (fs, path, gray-matter) not compatible with browser
    exclude: ['api']
  }
})
