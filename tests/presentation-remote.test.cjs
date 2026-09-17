const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
const ts = require('typescript');

function load(file) {
  const moduleUnderTest = { exports: {} };
  vm.runInNewContext(ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '../lib/presentation-remote', file), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText, { module: moduleUnderTest, exports: moduleUnderTest.exports, require: name => {
    if (name === './slides') return load('slides.ts');
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  return moduleUnderTest.exports;
}
const { isRemoteSession, parseRemoteMessage, inspectCommand, rememberCommand, COMMAND_TTL_MS, PEER_TIMEOUT_MS } = load('protocol.ts');
const { SCENES } = load('slides.ts');

const id = character => character.repeat(32);
const now = 100_000;
const peer = () => ({ connection: id('a'), lease: id('b'), createdAt: now - 1_000,
  lastSeen: now - 100, lastSequence: 0, outcomes: new Map() });
const command = overrides => ({ kind: 'command', controller: id('c'), connection: id('a'),
  lease: id('b'), id: id('d'), sequence: 1, issuedAt: now - 100,
  expiresAt: now + 1_000, expectedActive: 3, command: { type: 'next' }, ...overrides });
const snapshot = { active: 3, elapsed: 42, running: true, videoPlaying: false,
  videoAvailable: false, videoError: null };

test('remote session and message validation reject malformed payloads before acting', () => {
  assert.equal(isRemoteSession('a'.repeat(64)), true);
  for (const token of [null, '', 'a'.repeat(63), 'g'.repeat(64), '../presentation']) assert.equal(isRemoteSession(token), false);
  assert.notEqual(parseRemoteMessage(command()), null);
  for (const bad of [null, [], {}, command({ sequence: 0 }), command({ sequence: Infinity }),
    command({ expectedActive: -1 }), command({ lease: 'wrong' }), command({ command: { type: 'erase' } }),
    command({ command: { type: 'go-to', index: SCENES.length } }),
    command({ command: { type: 'go-to', index: 1.2 } }), command({ command: { type: 'go-to', index: 1000 } })]) {
    assert.equal(parseRemoteMessage(bad), null);
  }
  const state = { kind: 'state', host: id('f'), to: id('c'), connection: id('a'), lease: id('b'),
    revision: 1, sentAt: now, snapshot };
  assert.notEqual(parseRemoteMessage(state), null);
  assert.equal(parseRemoteMessage({ ...state, snapshot: { ...snapshot, active: Infinity } }), null);
  assert.equal(parseRemoteMessage({ ...state, snapshot: { ...snapshot, active: SCENES.length } }), null);
  assert.equal(parseRemoteMessage({ ...state, snapshot: { ...snapshot, videoError: 'x'.repeat(1001) } }), null);
});

test('a repeated command is acknowledged but never executes twice', () => {
  const controller = peer();
  const message = command();
  assert.equal(inspectCommand(message, controller, 3, now).execute, true);
  rememberCommand(controller, message, true);
  const duplicate = inspectCommand(message, controller, 4, now + 10);
  assert.equal(duplicate.execute, false);
  assert.equal(duplicate.accepted, true);
  // Even if old command ids have been evicted, their sequences cannot replay.
  controller.outcomes.clear();
  assert.equal(inspectCommand(message, controller, 3, now + 20).execute, false);
});

test('commands cannot move a slide after expiry, reconnection, or a local keyboard change', () => {
  for (const [message, controller, active, receiptTime] of [
    [command({ expiresAt: now - 1 }), peer(), 3, now],
    [command({ issuedAt: now + 1 }), peer(), 3, now],
    [command({ expiresAt: now + COMMAND_TTL_MS }), peer(), 3, now],
    [command({ issuedAt: now - 2_000 }), peer(), 3, now],
    [command(), { ...peer(), connection: id('e') }, 3, now],
    [command(), { ...peer(), lease: id('e') }, 3, now],
    [command(), { ...peer(), lastSeen: now - PEER_TIMEOUT_MS - 1 }, 3, now],
    [command(), undefined, 3, now],
    [command(), peer(), 4, now],
  ]) {
    assert.equal(inspectCommand(message, controller, active, receiptTime).execute, false);
  }
});

test('timer and video toggles obey the same idempotence and connection rules', () => {
  for (const type of ['toggle-timer', 'toggle-video']) {
    const controller = peer();
    const message = command({ command: { type } });
    assert.equal(inspectCommand(message, controller, 3, now).execute, true);
    rememberCommand(controller, message, true);
    assert.equal(inspectCommand(message, controller, 3, now + 1).execute, false);
  }
});
