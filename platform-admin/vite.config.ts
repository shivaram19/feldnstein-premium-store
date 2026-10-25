import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
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
    },
  },
})
