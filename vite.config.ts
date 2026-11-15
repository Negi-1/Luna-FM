import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'luna-catalog-watcher',
      configureServer(server) {
        const songsDir = path.resolve(__dirname, 'public/songs');
        if (!fs.existsSync(songsDir)) return;

        let debounce: ReturnType<typeof setTimeout> | null = null;
        const watcher = fs.watch(songsDir, { recursive: true }, () => {
          if (debounce) clearTimeout(debounce);
          debounce = setTimeout(() => {
            try {
              execSync('node scripts/generate-music-catalog.mjs', {
                cwd: __dirname,
                stdio: 'inherit',
              });
              server.ws.send({ type: 'full-reload' });
            } catch { /* ignore rebuild errors in dev */ }
          }, 250);
        });

        server.httpServer?.on('close', () => watcher.close());
      },
    },
  ],
});

