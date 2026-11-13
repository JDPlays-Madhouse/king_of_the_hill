const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { browser, chat, whisper, hello, settle, root } = require('./browser-harness.cjs');

async function overlay(name) {
  const env = browser();
  env.helper();
  env.load('website/static/js/' + name + '.js');
  const socket = env.sockets[0];
  hello(socket);
  await settle();
  return { ...env, socket };
}

for (const legacy of [false, true]) {
  test(`counter accepts ${legacy ? 'legacy' : 'current'} chat and preserves moderator controls`, async () => {
    const env = await overlay('counter');
    env.socket.message(chat('!slap', 'viewer', 1, legacy));
    assert.equal(env.stored.get('!slap'), '1');
    env.socket.message(chat('!setcount 42', 'viewer', 1, legacy));
    assert.equal(env.stored.get('!slap'), '1', 'A viewer cannot set the counter');
    env.socket.message(chat('!setcount 42', 'moderator', 3, legacy));
    assert.equal(env.stored.get('!slap'), '42');
    env.socket.message(chat('!slap', 'viewer', 1, legacy));
    assert.equal(env.stored.get('!slap'), '43');
  });
}

test('counter accepts known-user whispers without granting claimed chat roles', async () => {
  const env = await overlay('counter');
  env.socket.message(whisper('!setcount 5', 'OZY_VIKING', 0));
  assert.equal(env.stored.get('!slap'), '5');
  env.socket.message(whisper('!setcount 99', 'unknown', 4));
  assert.equal(env.stored.get('!slap'), '5');
  env.socket.message(whisper('!slap', 'viewer', 0));
  assert.equal(env.stored.get('!slap'), '6', 'Whisper count commands retain their existing behavior');
});

for (const name of ['subs', 'subgoal']) {
  test(`${name} counts current string tiers and legacy numeric tiers correctly`, async () => {
    const env = await overlay(name);
    for (const [type, subTier] of [['Sub', '1000'], ['ReSub', '2000'], ['GiftSub', '3000'], ['Sub', 2], ['Sub', 3], ['Sub', 0]]) {
      env.socket.message({ event: { source: 'Twitch', type }, data: { subTier } });
    }
    assert.equal(env.stored.get('tier1'), '2');
    assert.equal(env.stored.get('tier2'), '2');
    assert.equal(env.stored.get('tier3'), '2');
    assert.equal(env.elements.get('total').innerHTML, '16');
    env.socket.message({ event: { source: 'Twitch', type: 'Sub' }, data: { subTier: 'not-a-tier' } });
    assert.equal(env.stored.get('tier1'), '2', 'Unknown subscription data must not manufacture Tier 1 credit');
  });

  test(`${name} authorizes current and legacy chat commands and known-user whispers`, async () => {
    const env = await overlay(name);
    env.socket.message(chat('!setsubcount 9', 'viewer', 1));
    assert.equal(env.stored.get('tier1'), '0');
    env.socket.message(chat('!setsubcount 1 2 3', 'moderator', 3));
    assert.deepEqual(['tier1', 'tier2', 'tier3'].map(key => env.stored.get(key)), ['1', '2', '3']);
    env.socket.message(chat('!setsubcount 4 5 6', 'moderator', 3, true));
    assert.deepEqual(['tier1', 'tier2', 'tier3'].map(key => env.stored.get(key)), ['4', '5', '6']);
    env.socket.message(whisper('!setsubcount 7', 'OZY_VIKING', 0));
    assert.deepEqual(['tier1', 'tier2', 'tier3'].map(key => env.stored.get(key)), ['7', '0', '0']);
    env.socket.message(whisper('!setsubcount 99', 'unknown', 4));
    assert.equal(env.stored.get('tier1'), '7');
  });

  test(`${name} built-in subscription simulation uses a wire-format string tier`, async () => {
    const env = await overlay(name);
    const packet = JSON.parse(env.run('testData("Sub", 2)').data);
    assert.equal(typeof packet.data.subTier, 'string');
    env.socket.message(packet);
    assert.equal(env.stored.get('tier2'), '1');
  });
}

test('subgoal updates its goal through public chat and a known-user whisper', async () => {
  const env = await overlay('subgoal');
  env.socket.message(chat('!setsubgoal 25', 'moderator', 3));
  assert.equal(env.stored.get('subgoal'), '25');
  env.socket.message(whisper('!setsubgoal 40', 'OZY_VIKING', 0));
  assert.equal(env.stored.get('subgoal'), '40');
  env.socket.message(whisper('!setsubgoal 99', 'unknown', 4));
  assert.equal(env.stored.get('subgoal'), '40');
});

for (const name of ['counter', 'subs', 'subgoal']) {
  test(`${name} ignores malformed packets and learns the connected broadcaster identity`, async () => {
    const env = await overlay(name);
    for (const packet of ['not-json', null, {}, { status: 'error', id: '1' }, { status: 'ok', id: '1', platforms: {} },
      { event: { source: 'Twitch', type: 'ChatMessage' }, data: null },
      { event: { source: 'Twitch', type: 'ChatMessage' }, data: { text: 'ignored', user: null } },
      { event: { source: 'Twitch', type: 'Sub' }, data: null },
    ]) assert.doesNotThrow(() => env.socket.message(packet));
    const command = name === 'counter' ? '!setcount' : '!setsubcount';
    const key = name === 'counter' ? '!slap' : 'tier1';
    env.socket.message({ status: 'ok', id: '1', platforms: { twitch: { broadcastUser: 'actual_owner', broadcastUserName: 'Actual_Owner' } } });
    env.socket.message(whisper(`${command} 17`, 'ACTUAL_OWNER', 0));
    assert.equal(env.stored.get(key), '17');
  });
}

function kothHandler() {
  const env = browser();
  env.helper();
  const joined = [];
  Object.assign(env.context, {
    ws: { send() {} }, botID: 'koth-test', PLATFORM: { Twitch: 'Twitch', YouTube: 'YouTube' },
    canUserJoin: () => true,
    addFighter: (...args) => joined.push(args),
  });
  const source = fs.readFileSync(path.join(root, 'website/static/js/koth/index.js'), 'utf8');
  const start = source.indexOf('function userJoining(');
  const end = source.indexOf('function canUserJoin(', start);
  assert.ok(start >= 0 && end > start, 'KOTH userJoining handler must remain available for payload regression checks');
  env.run(source.slice(start, end) + '\nuserJoining();', 'koth-userJoining.js');
  return { ...env, joined, message: packet => env.context.ws.onmessage({ data: JSON.stringify(packet) }) };
}

test('KOTH joins fighters from current and legacy Twitch chat', () => {
  const env = kothHandler();
  env.message(chat('King with teapot', 'current_viewer'));
  env.message(chat('King with plunger', 'legacy_viewer', 1, true));
  assert.equal(env.joined.length, 2);
  assert.equal(env.joined[0][0], 'current_viewer');
  assert.equal(env.joined[0][1], 'king with teapot');
  assert.equal(env.joined[1][0], 'legacy_viewer');
});

test('KOTH keeps YouTube joins and rejects whispers, control packets, and incomplete users', () => {
  const env = kothHandler();
  env.message({ event: { source: 'YouTube', type: 'Message' }, data: { message: 'King with teapot', user: { name: 'YouTube Viewer', profileImageUrl: 'https://example.test/avatar.png' } } });
  assert.equal(env.joined.length, 1);
  assert.equal(env.joined[0][0], 'YouTube Viewer');
  assert.equal(env.joined[0][2], 'https://example.test/avatar.png');
  assert.equal(env.joined[0][3], 'YouTube');
  for (const packet of [whisper('King'), null, {}, { status: 'ok' },
    { event: { source: 'Twitch', type: 'ChatMessage' }, data: null },
    { event: { source: 'YouTube', type: 'Message' }, data: { message: 'King', user: null } },
    { event: { source: 'YouTube', type: 'Message' }, data: { message: null, user: { name: 'viewer' } } },
  ]) assert.doesNotThrow(() => env.message(packet));
  assert.equal(env.joined.length, 1);
});
