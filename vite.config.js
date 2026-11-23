import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// Recarrega a página sozinha ao salvar qualquer arquivo de public/ (css, js, imagens)
// ou o index.html. O Vite não observa public/ por padrão.
function liveReloadPublic() {
  return {
    name: 'live-reload-public',
    configureServer(server) {
      const pub = path.resolve(server.config.root, 'public')
      const html = path.resolve(server.config.root, 'index.html')
      server.watcher.add([pub, html])
      const reload = file => {
        const f = path.resolve(file)
        if (f.startsWith(pub) || f === html) server.ws.send({ type: 'full-reload', path: '*' })
      }
      server.watcher.on('change', reload)
      server.watcher.on('add', reload)
    }
  }
}

// base './' deixa o build funcionar em qualquer pasta/hospedagem.
export default defineConfig({
  base: './',
  plugins: [react(), liveReloadPublic()],
  server: { host: true, port: 5173, strictPort: true }
})
