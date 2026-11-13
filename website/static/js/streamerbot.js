// Shared by the classic overlay scripts and the King of the Hill modules.
(() => {
  "use strict";

  function normalizeTwitchMessage(packet) {
    if (packet?.event?.source !== "Twitch" || !packet.data ||
        !["ChatMessage", "Whisper"].includes(packet.event.type)) {
      return null;
    }
    const data = packet.data;
    const legacy = data.message && typeof data.message === "object" ? data.message : {};
    const user = data.user && typeof data.user === "object" ? data.user : {};
    const whisper = packet.event.type === "Whisper";
    const text = (whisper ? data.whisperText : data.text) ?? legacy.message;
    const login = user.login ?? legacy.username;
    const name = user.name ?? legacy.displayName ?? login;
    if (typeof text !== "string" || typeof login !== "string" ||
        !login.trim() || typeof name !== "string" || !name.trim()) {
      return null;
    }
    const role = user.role ?? legacy.role;
    return {
      text,
      login: login.toLowerCase(),
      name,
      // A whisper's base-user object does not establish a channel role.
      role: !whisper && Number.isInteger(role) && role >= 0 && role <= 4 ? role : 0,
    };
  }

  function normalizeSubTier(value) {
    if (typeof value !== "number" && typeof value !== "string") return null;
    switch (String(value).toLowerCase()) {
      case "prime":
      case "0":
      case "1":
      case "1000": return 1;
      case "2":
      case "2000": return 2;
      case "3":
      case "3000": return 3;
      default: return null;
    }
  }

  // SHA-256 fallback for overlays served over HTTP on a LAN, where SubtleCrypto
  // is unavailable. Authentication uses the same UTF-8 SHA-256/Base64 contract.
  function sha256Fallback(bytes) {
    const constants = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];
    const hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const padded = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64);
    padded.set(bytes);
    padded[bytes.length] = 0x80;
    const view = new DataView(padded.buffer);
    view.setUint32(padded.length - 8, Math.floor(bytes.length / 0x20000000));
    view.setUint32(padded.length - 4, bytes.length * 8);
    const words = new Uint32Array(64);
    const rotate = (word, bits) => (word >>> bits) | (word << (32 - bits));
    for (let offset = 0; offset < padded.length; offset += 64) {
      for (let i = 0; i < 16; i++) words[i] = view.getUint32(offset + i * 4);
      for (let i = 16; i < 64; i++) {
        const x = words[i - 15], y = words[i - 2];
        const s0 = rotate(x, 7) ^ rotate(x, 18) ^ (x >>> 3);
        const s1 = rotate(y, 17) ^ rotate(y, 19) ^ (y >>> 10);
        words[i] = words[i - 16] + s0 + words[i - 7] + s1;
      }
      let [a, b, c, d, e, f, g, h] = hash;
      for (let i = 0; i < 64; i++) {
        const sum1 = rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25);
        const choice = (e & f) ^ (~e & g);
        const t1 = (h + sum1 + choice + constants[i] + words[i]) | 0;
        const sum0 = rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22);
        const majority = (a & b) ^ (a & c) ^ (b & c);
        h = g; g = f; f = e; e = (d + t1) | 0;
        d = c; c = b; b = a; a = (t1 + sum0 + majority) | 0;
      }
      [a, b, c, d, e, f, g, h].forEach((word, i) => { hash[i] = (hash[i] + word) | 0; });
    }
    const digest = new Uint8Array(32);
    const result = new DataView(digest.buffer);
    hash.forEach((word, i) => result.setUint32(i * 4, word));
    return digest;
  }

  async function sha256Base64(text) {
    const bytes = new TextEncoder().encode(text);
    const digest = globalThis.crypto?.subtle
      ? new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes))
      : sha256Fallback(bytes);
    return btoa(String.fromCharCode(...digest));
  }

  let authenticationSequence = 0;

  class Connection {
    constructor(url, { password = "", reconnectDelay = 10000 } = {}) {
      this.url = url;
      this.onopen = null;
      this.onmessage = null;
      this.onclose = null;
      this.onerror = null;
      this._password = password;
      this._reconnectDelay = reconnectDelay;
      this._closed = false;
      this._queue = [];
      this._reconnectTimer = null;
      this._connect();
    }

    get readyState() {
      return this._socket.readyState;
    }

    _connect() {
      this._ready = false;
      this._helloReceived = false;
      this._authenticationId = null;
      const socket = this._socket = new WebSocket(this.url);
      socket.onmessage = (event) => {
        if (this._closed || socket !== this._socket) return;
        let packet;
        try { packet = JSON.parse(event.data); } catch { return; }
        if (!packet || typeof packet !== "object") return;
        if (packet.request === "Hello") {
          if (this._helloReceived) return;
          this._helloReceived = true;
          if (packet.authentication && this._password) {
            this._authenticate(packet.authentication, socket).catch(() => {
              if (!this._closed && socket === this._socket) {
                this._fail("Could not authenticate with Streamer.bot.");
              }
            });
          } else {
            // Authentication can be enabled without enforcing it for requests
            // such as Subscribe and DoAction. A password is optional there.
            this._finishReady(event);
          }
          return;
        }
        if (this._authenticationId && packet.id === this._authenticationId) {
          this._authenticationId = null;
          if (packet.status === "ok") this._finishReady(event);
          else this._fail("Streamer.bot authentication failed. Check wsPassword.");
          return;
        }
        if (this._ready && typeof this.onmessage === "function") this.onmessage(event);
      };
      socket.onclose = (event) => {
        if (socket !== this._socket) return;
        this._ready = false;
        if (!this._closed) {
          this._reconnectTimer = setTimeout(() => {
            this._reconnectTimer = null;
            if (!this._closed) this._connect();
          }, this._reconnectDelay);
        }
        if (typeof this.onclose === "function") this.onclose(event);
      };
      socket.onerror = (event) => {
        if (!this._closed && socket === this._socket && typeof this.onerror === "function") {
          this.onerror(event);
        }
      };
    }

    async _authenticate(authentication, socket) {
      if (typeof authentication.salt !== "string" || typeof authentication.challenge !== "string") {
        throw new Error("Invalid authentication challenge");
      }
      const secret = await sha256Base64(this._password + authentication.salt);
      const response = await sha256Base64(secret + authentication.challenge);
      if (this._closed || socket !== this._socket || socket.readyState !== 1) return;
      this._authenticationId = `streamerbot:authenticate:${++authenticationSequence}`;
      socket.send(JSON.stringify({
        request: "Authenticate",
        id: this._authenticationId,
        authentication: response,
      }));
    }

    _finishReady(event) {
      if (this._ready || this._closed || this._socket.readyState !== 1) return;
      this._ready = true;
      if (typeof this.onopen === "function") this.onopen(event);
      const pending = this._queue.splice(0);
      for (const message of pending) this.send(message);
    }

    _fail(message) {
      this.close();
      console.error(message);
      if (typeof this.onerror === "function") this.onerror({ type: "error", message });
    }

    send(message) {
      if (this._closed) return false;
      if (this._ready && this._socket.readyState === 1) this._socket.send(message);
      else this._queue.push(message);
      return true;
    }

    close() {
      this._closed = true;
      this._ready = false;
      this._queue.length = 0;
      if (this._reconnectTimer !== null) clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
      this._socket.close();
    }
  }

  globalThis.Streamerbot = { Connection, normalizeTwitchMessage, normalizeSubTier };
})();
