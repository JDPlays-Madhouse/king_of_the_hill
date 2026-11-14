const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { browser, root } = require('./browser-harness.cjs');

function loadModule(env, name) {
  const source = fs.readFileSync(path.join(root, 'website/static/js/koth', name), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace(/export default /g, '')
    .replace(/export /g, '');
  env.run(source, name);
}

function animation(search = '') {
  const env = browser(search);
  const tweens = [];
  Object.assign(env.context, {
    modifyStyleSheet() {},
    sides: ['left', 'right'], SIDE: { left: 'left', right: 'right' },
    randomSide: () => 'left', randomPlatform: () => 'Twitch',
    TweenMax: { set() {}, to: (...args) => tweens.push(args) },
    TweenLite: { set() {} }, Sine: { easeInOut: 'ease' },
  });
  env.context.document.createElement = () => ({});
  for (const id of ['winnerDiv', 'lastWinnerDiv']) {
    env.context.document.getElementById(id).appendChild = () => {};
  }
  loadModule(env, 'urlParams.js');
  loadModule(env, 'playerMotion.js');
  return {
    env, tweens,
    show(username, rigged = false, lastWinner = false) {
      const children = [];
      env.context.fighter = { getAttribute: () => username, appendChild: child => children.push(child) };
      env.run(`winnerMotion(fighter, ${lastWinner}, 2.5, ${rigged});`);
      return children;
    },
  };
}

test('default disqualified users are labeled and ordinary and rigged labels remain unchanged', () => {
  const { env, show } = animation();
  assert.equal(env.run('settings().disqualifiedUsers.length'), 2);
  assert.equal(show('Cmdrshephard')[0].innerText, 'Disqualified');
  assert.equal(show('FOXHOUND590')[0].innerText, 'Disqualified');
  assert.equal(show('viewer').length, 0);
  assert.equal(show('Ozy_Viking', true)[0].innerText, '#RIGGED');
});

test('repeated URL usernames show Disqualified for winners and defending champions', () => {
  const { env, show, tweens } = animation('?disqualifiedUser=Some_Viewer&disqualifiedUser=YouTube%20Viewer');
  assert.equal(env.run('settings().disqualifiedUsers.length'), 2);
  assert.equal(show('Cmdrshephard').length, 0);
  assert.equal(show('foxhound590').length, 0);
  for (const [name, defending] of [['SOME_VIEWER', false], ['YouTube Viewer', true]]) {
    const [label] = show(name, false, defending);
    assert.equal(label.innerText, 'Disqualified');
    assert.equal(label.className, 'disqualified');
    assert.ok(tweens.some(([element, , options]) => element === label && options.y === '-=50'));
  }
  assert.equal(show('Some_Viewer_Else').length, 0, 'Only complete usernames match');
});

test('Disqualified takes precedence over rigged and ignores blank list entries', () => {
  const { show } = animation('?disqualifiedUser=%20Some_Viewer%20&disqualifiedUser=');
  const labels = show('some_viewer', true);
  assert.equal(labels.length, 1);
  assert.equal(labels[0].innerText, 'Disqualified');
  assert.equal(show('').length, 0);
  assert.equal(show(null).length, 0);
});

for (const query of ['?disqualifiedUser=', '?disqualifiedUser', '?disqualifiedUser=%20']) {
  test(`blank query clears the disqualified defaults: ${query}`, () => {
    const { env, show } = animation(query);
    assert.equal(env.run('settings().disqualifiedUsers.length'), 0);
    assert.equal(show('Cmdrshephard').length, 0);
    assert.equal(show('foxhound590').length, 0);
  });
}

test('default users must be explicitly included when overriding the list', () => {
  const { env, show } = animation('?disqualifiedUser=Cmdrshephard&disqualifiedUser=foxhound590&disqualifiedUser=AnotherViewer');
  assert.equal(env.run('settings().disqualifiedUsers.length'), 3);
  for (const username of ['Cmdrshephard', 'foxhound590', 'AnotherViewer']) {
    assert.equal(show(username)[0].innerText, 'Disqualified');
  }
});
