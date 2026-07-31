import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { spawn } from 'child_process'

function edgeTtsPlugin() {
  return {
    name: 'edge-tts-plugin',
    configureServer(server) {
      server.middlewares.use('/api/tts', (req, res) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const text = url.searchParams.get('text');
        
        if (!text) {
          res.statusCode = 400;
          return res.end('Missing text parameter');
        }

        res.setHeader('Content-Type', 'audio/mpeg');
        
        const child = spawn('edge-tts', ['--voice', 'kk-KZ-AigulNeural', '--text', text]);
        
        child.stdout.pipe(res);
        
        child.stderr.on('data', (data) => {
          console.error(`edge-tts error: ${data}`);
        });

        req.on('close', () => {
           child.kill();
        });
      });
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), edgeTtsPlugin()],
})
