import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { Agent } from 'node:http'

// The backend (Quarkus/undertow) drops the connection on 401 auth challenges; with
// keep-alive pooling, http-proxy can hand the dead socket to the next request, which
// then hangs forever in the browser. Per-request sockets in dev avoid that.
const proxyTarget = {
  target: 'http://localhost:8080',
  agent: new Agent({ keepAlive: false }),
}

// VITE_BASE=/repo-name/ for the GitHub Pages build (project site subpath);
// default '/' for local dev. See .github/workflows/deploy.yml (ADR-0012).
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/products': proxyTarget,
      '/stock-movements': proxyTarget,
      '/purchase-orders': proxyTarget,
      '/loyalty-accounts': proxyTarget,
      '/loyalty-transactions': proxyTarget,
      '/analytics': proxyTarget,
      '/g': proxyTarget,
      // media variants are served by the backend at /site/media/... (ADR-0013)
      '/site': proxyTarget,
    },
  },
})
