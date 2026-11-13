const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const test = require('node:test');
const { browser, chat, whisper, hello, settle } = require('./browser-harness.cjs');

test('normalizes current and legacy Twitch chat while keeping whisper authorization separate', () => {
  const api = browser().helper();
  for (const legacy of [false, true]) {
    const result = api.normalizeTwitchMessage(chat('King with teapot', 'Some_Viewer', 3, legacy));
    assert.equal(result.text, 'King with teapot');
    assert.equal(result.login.toLowerCase(), 'some_viewer');
    assert.equal(result.name, 'Some_Viewer');
    assert.equal(result.role, 3);
  }
  const privateMessage = api.normalizeTwitchMessage(whisper('!setcount 7', 'Some_Viewer', 4));
  assert.equal(privateMessage.text, '!setcount 7');
  assert.equal(privateMessage.role, 0, 'A whisper must not inherit chat moderator privileges');
});

test('ignores control packets, other platforms, and incomplete chat data', () => {
  const api = browser().helper();
  for (const packet of [null, {}, { request: 'Hello' }, { status: 'error', id: '1' },
    { event: { source: 'YouTube', type: 'Message' }, data: { message: 'King' } },
    { event: { source: 'Twitch', type: 'ChatMessage' }, data: null },
    { event: { source: 'Twitch', type: 'ChatMessage' }, data: { text: 4, user: { login: 'viewer' } } },
    { event: { source: 'Twitch', type: 'ChatMessage' }, data: { text: 'King', user: null } },
  ]) assert.equal(api.normalizeTwitchMessage(packet), null);
});

test('accepts legacy and string subscription tiers without crediting unknown tiers', () => {
  const api = browser().helper();
  for (const value of [0, 1, '0', '1', '1000', 'Prime']) assert.equal(api.normalizeSubTier(value), 1);
  for (const value of [2, '2', '2000']) assert.equal(api.normalizeSubTier(value), 2);
  for (const value of [3, '3', '3000']) assert.equal(api.normalizeSubTier(value), 3);
  for (const value of [undefined, null, '', 'garbage', 99, {}, []]) assert.equal(api.normalizeSubTier(value), null);
});

test('connection waits for Hello before subscriptions and queued actions', async () => {
  const env = browser();
  const { Connection } = env.helper();
  const connection = new Connection('ws://localhost:8080/');
  connection.onopen = () => connection.send(JSON.stringify({ request: 'Subscribe', id: 'sub', events: { Twitch: ['ChatMessage'] } }));
  connection.send(JSON.stringify({ request: 'DoAction', id: 'queued', action: { name: 'FightMessageTwitch' } }));
  const socket = env.sockets[0];
  socket.open();
  assert.equal(socket.sent.length, 0, 'No request can precede the server Hello');
  socket.message({ request: 'Hello', info: { version: '1.0.7' } });
  await settle();
  assert.deepEqual(socket.sent.map(packet => packet.request), ['Subscribe', 'DoAction']);
});

test('authenticates with the documented SHA256 challenge before sending application requests', async () => {
  const env = browser();
  const { Connection } = env.helper();
  const password = 'test-password-🍵';
  const salt = 'fixed-salt';
  const challenge = 'fixed-challenge';
  const connection = new Connection('ws://localhost:8080/', { password });
  let opened = 0;
  const delivered = [];
  connection.onopen = () => { opened++; connection.send(JSON.stringify({ request: 'Subscribe', id: 'sub' })); };
  connection.onmessage = event => delivered.push(JSON.parse(event.data));
  connection.send(JSON.stringify({ request: 'DoAction', id: 'queued' }));
  const socket = env.sockets[0];
  hello(socket, { salt, challenge });
  await settle(() => socket.sent.length > 0);
  assert.equal(opened, 0);
  assert.equal(socket.sent.length, 1);
  const secret = createHash('sha256').update(password + salt).digest('base64');
  const expected = createHash('sha256').update(secret + challenge).digest('base64');
  assert.equal(socket.sent[0].request, 'Authenticate');
  assert.equal(socket.sent[0].authentication, expected);
  const authId = socket.sent[0].id;
  socket.message({ status: 'ok', id: authId });
  await settle();
  assert.equal(opened, 1);
  assert.deepEqual(socket.sent.map(packet => packet.request), ['Authenticate', 'Subscribe', 'DoAction']);
  assert.equal(delivered.length, 0, 'Hello and authentication responses are transport packets');
  socket.message(chat('King'));
  await settle();
  assert.equal(delivered.length, 1);
});

test('a rejected password cannot make the connection ready or release queued actions', async () => {
  const env = browser();
  const { Connection } = env.helper();
  const connection = new Connection('ws://localhost:8080/', { password: 'wrong-password' });
  let opened = 0;
  connection.onopen = () => opened++;
  connection.send(JSON.stringify({ request: 'DoAction', id: 'must-not-send' }));
  const socket = env.sockets[0];
  hello(socket, { salt: 'salt', challenge: 'challenge' });
  await settle(() => socket.sent.length > 0);
  socket.message({ status: 'error', id: socket.sent[0].id, error: 'Authentication failed' });
  await settle();
  assert.equal(opened, 0);
  assert.ok(socket.sent.every(packet => packet.request === 'Authenticate'));
});

test('HTTP LAN authentication fallback matches SHA256 for Unicode and multiple blocks', async () => {
  for (const password of ['p', 'x'.repeat(55), 'x'.repeat(64), 'x'.repeat(140), '🍵 café '.repeat(30)]) {
    const env = browser();
    env.context.crypto = undefined;
    const { Connection } = env.helper();
    new Connection('ws://192.168.1.10:8080/', { password });
    const salt = 'fixed-salt';
    const challenge = 'fixed-challenge';
    const socket = env.sockets[0];
    hello(socket, { salt, challenge });
    await settle(() => socket.sent.length > 0);
    const secret = createHash('sha256').update(password + salt).digest('base64');
    const expected = createHash('sha256').update(secret + challenge).digest('base64');
    assert.equal(socket.sent[0].request, 'Authenticate');
    assert.equal(socket.sent[0].authentication, expected, `Incorrect fallback for password of ${Buffer.byteLength(password)} UTF-8 bytes`);
  }
});

test('an authentication-enabled server permits ordinary requests without a configured password', async () => {
  const env = browser();
  const { Connection } = env.helper();
  const connection = new Connection('ws://localhost:8080/');
  connection.onopen = () => connection.send(JSON.stringify({ request: 'Subscribe', id: 'sub' }));
  hello(env.sockets[0], { salt: 'salt', challenge: 'challenge' });
  await settle();
  assert.deepEqual(env.sockets[0].sent.map(packet => packet.request), ['Subscribe']);
});

test('unexpected disconnect creates a new socket and restores subscriptions', async () => {
  const env = browser();
  const { Connection } = env.helper();
  const connection = new Connection('ws://localhost:8080/', { reconnectDelay: 10000 });
  connection.onopen = () => connection.send(JSON.stringify({ request: 'Subscribe', id: 'sub' }));
  const first = env.sockets[0];
  hello(first);
  await settle();
  first.close();
  env.fireTimers(10000);
  assert.equal(env.sockets.length, 2);
  const second = env.sockets[1];
  hello(second);
  await settle();
  assert.equal(second.sent.filter(packet => packet.request === 'Subscribe').length, 1);
  connection.close();
  env.fireTimers();
  assert.equal(env.sockets.length, 2, 'An intentional game close must not reconnect');
});

test('closing during a disconnect cancels the pending reconnect', async () => {
  const env = browser();
  const { Connection } = env.helper();
  const connection = new Connection('ws://localhost:8080/', { reconnectDelay: 10000 });
  hello(env.sockets[0]);
  await settle();
  env.sockets[0].close();
  connection.close();
  env.fireTimers();
  assert.equal(env.sockets.length, 1);
});
