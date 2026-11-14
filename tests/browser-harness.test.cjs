const assert = require('node:assert/strict');
const test = require('node:test');
const { setTimeout: delay } = require('node:timers/promises');
const { settle } = require('./browser-harness.cjs');

test('settle waits for asynchronous work that takes more than a few event-loop turns', async () => {
  let ready = false;
  const completion = delay(30).then(() => { ready = true; });
  try {
    await settle(() => ready);
    assert.equal(ready, true);
  } finally {
    await completion;
  }
});

test('settle rejects when asynchronous work misses its deadline', async () => {
  const started = performance.now();
  await assert.rejects(
    settle(() => false, { timeout: 20 }),
    /Asynchronous browser operation did not complete/,
  );
  assert.ok(performance.now() - started >= 20, 'The helper must allow the full timeout');
});
