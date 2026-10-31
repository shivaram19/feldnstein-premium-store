import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// VITE_BASE=/repo-name/ for the GitHub Pages build (project site subpath);
// default '/' for local dev. See .github/workflows/deploy.yml (ADR-0012).
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  server: {
    proxy: {
      // content API + media variants served by the backend (ADR-0013)
      '/site': 'http://localhost:8080',
    },
  },
})
