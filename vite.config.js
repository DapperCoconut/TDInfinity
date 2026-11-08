import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative asset paths, so it works under /TDInfinity/ on GitHub Pages
  server: {
    host: true, // expose on your LAN so friends can join
  },
});
