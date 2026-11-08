import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true, // expose on your LAN so friends can join
    proxy: {
      // WebSocket traffic goes to the multiplayer server (server/index.js).
      '/ws': { target: 'ws://localhost:8787', ws: true },
    },
  },
});
