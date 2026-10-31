import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// VITE_BASE=/repo-name/ for the GitHub Pages build (project site subpath);
// default '/' for local dev. See .github/workflows/deploy.yml (ADR-0012).
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/products': 'http://localhost:8080',
      '/stock-movements': 'http://localhost:8080',
      '/purchase-orders': 'http://localhost:8080',
      '/loyalty-accounts': 'http://localhost:8080',
      '/loyalty-transactions': 'http://localhost:8080',
      '/analytics': 'http://localhost:8080',
      '/g': 'http://localhost:8080',
      // media variants are served by the backend at /site/media/... (ADR-0013)
      '/site': 'http://localhost:8080',
    },
  },
})
