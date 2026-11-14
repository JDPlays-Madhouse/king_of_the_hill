const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');

const root = path.resolve(__dirname, '..');

function browser(search = '') {
  const sockets = [];
  const timers = new Map();
  const stored = new Map();
  const elements = new Map();
  const logs = [];
  let nextTimer = 1;

  class WebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    constructor(url) {
      this.url = url;
      this.readyState = WebSocket.CONNECTING;
      this.sent = [];
      this.listeners = new Map();
      sockets.push(this);
    }

    addEventListener(name, callback) {
      if (!this.listeners.has(name)) this.listeners.set(name, []);
      this.listeners.get(name).push(callback);
    }

    emit(name, event = {}) {
      this['on' + name]?.(event);
      for (const callback of this.listeners.get(name) || []) callback(event);
    }

    open() {
      this.readyState = WebSocket.OPEN;
      this.emit('open');
    }

    message(packet) {
      this.emit('message', { data: typeof packet === 'string' ? packet : JSON.stringify(packet) });
    }

    send(message) {
      if (this.readyState !== WebSocket.OPEN) throw new Error('Socket is not open');
      this.sent.push(JSON.parse(message));
    }

    close() {
      if (this.readyState === WebSocket.CLOSED) return;
      this.readyState = WebSocket.CLOSED;
      this.emit('close', { code: 1000 });
    }
  }

  function element(id) {
    if (!elements.has(id)) elements.set(id, { innerText: '', innerHTML: '', style: { setProperty() {} } });
    return elements.get(id);
  }

  const sandbox = {
    WebSocket,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    crypto: webcrypto,
    btoa: value => Buffer.from(value, 'binary').toString('base64'),
    atob: value => Buffer.from(value, 'base64').toString('binary'),
    console: Object.fromEntries(['log', 'warn', 'error', 'info', 'debug'].map(name => [name, (...values) => logs.push(values)])),
    location: { search },
    document: {
      getElementById: element,
      styleSheets: [{ cssRules: [{ selectorText: ':root', style: { setProperty() {} } }] }],
    },
    localStorage: {
      getItem: key => stored.has(key) ? stored.get(key) : null,
      setItem: (key, value) => stored.set(key, String(value)),
      removeItem: key => stored.delete(key),
    },
    setTimeout(callback, delay) {
      const id = nextTimer++;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout: id => timers.delete(id),
  };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);

  return {
    context, sockets, timers, stored, elements, logs,
    run(code, filename = 'test-input.js') { return vm.runInContext(code, context, { filename }); },
    load(relative) { return this.run(fs.readFileSync(path.join(root, relative), 'utf8'), relative); },
    helper() { this.load('website/static/js/streamerbot.js'); return context.Streamerbot; },
    fireTimers(delay) {
      for (const [id, timer] of [...timers]) {
        if (delay !== undefined && timer.delay !== delay) continue;
        timers.delete(id);
        timer.callback();
      }
    },
  };
}

function chat(text, login = 'viewer', role = 1, legacy = false) {
  const user = { login, name: login, role };
  return {
    event: { source: 'Twitch', type: 'ChatMessage' },
    data: legacy
      ? { message: { message: text, username: login, displayName: login, role } }
      : { text, user },
  };
}

function whisper(text, login = 'viewer', role = 4) {
  return { event: { source: 'Twitch', type: 'Whisper' }, data: { whisperText: text, user: { login, name: login, role } } };
}

function hello(socket, authentication) {
  socket.open();
  socket.message({ request: 'Hello', info: { version: '1.0.7' }, ...(authentication ? { authentication } : {}) });
}

async function settle(predicate = () => true, { timeout = 1000 } = {}) {
  // Web Crypto runs on workers; event-loop turns do not measure its progress.
  const deadline = performance.now() + timeout;
  do {
    await delay(1);
    if (predicate()) return;
  } while (performance.now() < deadline);
  throw new Error('Asynchronous browser operation did not complete');
}

module.exports = { browser, chat, whisper, hello, settle, root };
