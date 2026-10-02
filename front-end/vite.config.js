import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // host: true escucha en todas las interfaces (no solo localhost) para poder abrir
  // el sistema desde un teléfono en la misma red: http://<IP-de-la-PC>:5173
  // En Docker sobre Windows los cambios de archivos del volumen no generan eventos:
  // con VITE_POLLING=true (lo define docker-compose) Vite revisa los archivos periódicamente.
  server: {
    host: true, port: 5173, strictPort: true,
    watch: process.env.VITE_POLLING === 'true' ? { usePolling: true, interval: 300 } : undefined,
  },
  preview: { host: true, port: 5173 },
})
