import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' deixa o build funcionar em qualquer pasta/hospedagem.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true }
})
