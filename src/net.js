// Thin WebSocket client with typed message handlers.
export class Net {
  constructor() {
    this.ws = null;
    this.handlers = new Map(); // type -> Set<fn>
    this.id = null;
    this.name = null;
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /** Connects (if needed) and says hello. Resolves with the welcome message. */
  connect(name) {
    if (this.connected) {
      this.send({ type: 'setName', name });
      this.name = name;
      return Promise.resolve({ id: this.id, name });
    }
    return new Promise((resolve, reject) => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(`${proto}://${location.host}/ws`);
      this.ws = ws;
      let welcomed = false;
      const timer = setTimeout(() => {
        if (!welcomed) {
          ws.close();
          reject(new Error('timeout'));
        }
      }, 5000);
      ws.onopen = () => ws.send(JSON.stringify({ type: 'hello', name }));
      ws.onerror = () => {
        if (!welcomed) {
          clearTimeout(timer);
          reject(new Error('connection failed'));
        }
      };
      ws.onclose = () => {
        if (this.ws === ws) this.ws = null;
        if (welcomed) this.emit({ type: 'close' });
      };
      ws.onmessage = (ev) => {
        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (msg.type === 'welcome' && !welcomed) {
          welcomed = true;
          clearTimeout(timer);
          this.id = msg.id;
          this.name = msg.name;
          resolve(msg);
        }
        this.emit(msg);
      };
    });
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }

  send(msg) {
    if (this.connected) this.ws.send(JSON.stringify(msg));
  }

  /** Subscribe to a message type. Returns an unsubscribe function. */
  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
    return () => this.handlers.get(type).delete(fn);
  }

  emit(msg) {
    const set = this.handlers.get(msg.type);
    if (set) for (const fn of [...set]) fn(msg);
  }
}
