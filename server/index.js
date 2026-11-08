// TD Infinity multiplayer server (optional): runs the room hub (src/hub.js) over WebSockets on
// /ws and serves the built client from ../dist. The game normally plays peer-to-peer instead,
// with the hub running in the room host's browser, so this is only needed for self-hosting.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { createHub } from '../src/hub.js';

const PORT = Number(process.env.PORT) || 8787;
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const hub = createHub();

// ------------------------------------------------------------------ HTTP + WebSocket

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join(DIST, urlPath === '/' ? 'index.html' : urlPath);
  if (!file.startsWith(DIST)) {
    res.writeHead(403).end();
    return;
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Client not built. Run "npm run build", or use "npm run dev" for development.');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }).end(data);
  });
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16 * 1024 });

wss.on('connection', (ws) => {
  const c = hub.connect((msg) => {
    if (ws.readyState === 1) ws.send(JSON.stringify(msg));
  });
  ws.on('message', (data) => {
    let m;
    try {
      m = JSON.parse(data);
    } catch {
      return;
    }
    c.receive(m);
  });
  ws.on('close', () => c.close());
});

server.listen(PORT, () => console.log(`TD Infinity server on http://localhost:${PORT} (WebSocket /ws)`));
