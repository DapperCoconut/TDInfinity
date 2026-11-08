import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative asset paths, so it works under /TDInfinity/ on GitHub Pages
  server: {
    host: true, // expose on your LAN so friends can join
    proxy: {
      // WebSocket traffic goes to the multiplayer server (server/index.js).
      '/ws': { target: 'ws://localhost:8787', ws: true },
    },
  },
});
