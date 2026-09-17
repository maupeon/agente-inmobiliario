/* Pairing origin and local discovery checks; no actual network interfaces or credentials. */
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function loader(stubs = {}, env = {}) {
  const cache = new Map();
  function load(name) {
    let file = path.resolve(root, name);
    if (!fs.existsSync(file)) file += '.ts';
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} };
    cache.set(file, mod);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const localRequire = (id) => {
      if (Object.hasOwn(stubs, id)) return stubs[id];
      if (id.startsWith('@/')) return load(id.slice(2));
      if (id.startsWith('.')) return load(path.resolve(path.dirname(file), id));
      return require(id);
    };
    vm.runInNewContext(code, {
      module: mod, exports: mod.exports, require: localRequire,
      process: { env }, Response, Request, URL,
    }, { filename: file });
    return mod.exports;
  }
  return load;
}

const links = loader()('lib/presentation-remote/links.ts');
const address = (value, overrides = {}) => ({ address: value, family: 'IPv4', internal: false, ...overrides });
const interfaces = {
  docker0: [address('172.17.0.1')],
  utun8: [address('10.8.0.2')],
  lo0: [address('127.0.0.1', { internal: true })],
  en0: [address('192.168.1.42'), address('fe80::1', { family: 'IPv6' })],
  en1: [address('192.168.1.42'), address('10.0.0.42')],
};

test('loopback detection covers local browser hosts without accepting lookalikes', () => {
  for (const host of ['localhost', 'LOCALHOST.', 'demo.localhost', '127.0.0.1', '127.12.0.1', '::1', '[::1]']) {
    assert.equal(links.isLoopbackHost(host), true, host);
  }
  for (const host of ['localhost.example.com', 'notlocalhost', '192.168.1.42', '127.0.0.256', '127.evil.test', '[::2]']) {
    assert.equal(links.isLoopbackHost(host), false, host);
  }
});

test('controller URL keeps capability entirely in the fragment and validates origin', () => {
  const token = '1a'.repeat(32);
  const url = new URL(links.controllerUrl('http://192.168.1.42:3000', token));
  assert.equal(url.origin, 'http://192.168.1.42:3000');
  assert.equal(url.pathname, '/presentacion/mando');
  assert.equal(url.search, '');
  assert.equal(url.hash, `#${token}`);
  assert.equal(links.controllerUrl('https://habitia.test/', token), `https://habitia.test/presentacion/mando#${token}`);
  for (const origin of ['javascript:alert(1)', 'file:///tmp', 'https://user:pass@habitia.test', 'https://habitia.test/presentacion', 'https://habitia.test/?key=secret', 'https://habitia.test/#old', '//habitia.test']) {
    assert.throws(() => links.controllerUrl(origin, token), origin);
  }
  for (const invalid of ['', 'a'.repeat(63), 'a'.repeat(65), 'z'.repeat(64), 'a'.repeat(63) + '?']) {
    assert.throws(() => links.controllerUrl('https://habitia.test', invalid));
  }
});

test('LAN origins prefer physical networks and preserve the laptop port', () => {
  assert.equal(JSON.stringify(links.privateLanOrigins(interfaces, '3001')), JSON.stringify([
    'http://192.168.1.42:3001', 'http://10.0.0.42:3001',
    'http://172.17.0.1:3001', 'http://10.8.0.2:3001',
  ]));
  assert.equal(links.privateLanOrigins({ en0: [address('192.168.1.42')] }, '', 'https:')[0], 'https://192.168.1.42');
});

test('LAN origins exclude public, link-local, malformed, IPv6 and internal addresses', () => {
  const excluded = ['8.8.8.8', '169.254.1.1', '172.15.0.1', '172.32.0.1', '192.169.0.1', '10.1.1.256', '010.1.1.1', '10.0.0.1@evil.test', '10.0.0.1/path'];
  const candidates = excluded.map((value) => address(value));
  candidates.push(address('10.0.0.1', { internal: true }));
  candidates.push(address('fd00::1', { family: 'IPv6' }));
  assert.equal(links.privateLanOrigins({ en0: candidates }, '3000').length, 0);
  for (const port of ['0', '65536', '3000/evil', '-1', 'a', '3000@evil.test']) {
    assert.equal(links.privateLanOrigins(interfaces, port).length, 0);
  }
});

test('local endpoint returns LAN hints without caching, including local production', async () => {
  let reads = 0;
  const route = loader({ 'node:os': { networkInterfaces: () => { reads++; return interfaces; } } }, { NODE_ENV: 'production' })('app/api/presentacion/conexion/route.ts');
  const response = route.GET(new Request('http://localhost:3456/api/presentacion/conexion', { headers: { host: 'localhost:3456' } }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.equal((await response.json()).origins[0], 'http://192.168.1.42:3456');
  assert.equal(reads, 1);
});

test('Next wildcard bind URL uses the explicit loopback Host and its browser-facing port', async () => {
  const route = loader({ 'node:os': { networkInterfaces: () => interfaces } }, { NODE_ENV: 'production' })('app/api/presentacion/conexion/route.ts');
  const ipv4 = route.GET(new Request('http://0.0.0.0:3000/api/presentacion/conexion', {
    headers: { host: 'localhost:3000', 'x-forwarded-host': 'localhost:3000' },
  }));
  assert.equal((await ipv4.json()).origins[0], 'http://192.168.1.42:3000');
  const ipv6 = route.GET(new Request('http://[::]:3000/api/presentacion/conexion', {
    headers: { host: '[::1]:3456', 'x-forwarded-host': '[::1]:3456' },
  }));
  assert.equal((await ipv6.json()).origins[0], 'http://192.168.1.42:3456');
});

test('deployed and non-loopback requests never enumerate network interfaces', async () => {
  const blockedInterfaces = { 'node:os': { networkInterfaces: () => { throw new Error('must not enumerate interfaces'); } } };
  const local = loader(blockedInterfaces)('app/api/presentacion/conexion/route.ts');
  for (const request of [
    new Request('https://habitia.test/api/presentacion/conexion'),
    new Request('http://192.168.1.42:3000/api/presentacion/conexion'),
    new Request('http://localhost:3000/api/presentacion/conexion', { headers: { host: 'habitia.test' } }),
    new Request('http://localhost:3000/api/presentacion/conexion', { headers: { 'x-forwarded-host': 'habitia.test' } }),
    new Request('http://localhost:3000/api/presentacion/conexion', { headers: { host: 'localhost:3000@evil.test' } }),
    new Request('http://0.0.0.0:3000/api/presentacion/conexion'),
    new Request('http://[::]:3000/api/presentacion/conexion'),
    new Request('http://0.0.0.0:3000/api/presentacion/conexion', { headers: { host: '192.168.1.42:3000' } }),
    new Request('http://0.0.0.0:3000/api/presentacion/conexion', { headers: { host: 'habitia.test' } }),
    new Request('http://0.0.0.0:3000/api/presentacion/conexion', { headers: { host: 'localhost:3000', 'x-forwarded-host': 'habitia.test' } }),
    new Request('https://habitia.test/api/presentacion/conexion', { headers: { host: 'localhost:3000' } }),
  ]) {
    assert.equal((await local.GET(request).json()).origins.length, 0);
  }
  const deployed = loader(blockedInterfaces, { VERCEL: '1' })('app/api/presentacion/conexion/route.ts');
  assert.equal((await deployed.GET(new Request('http://localhost:3000/api/presentacion/conexion')).json()).origins.length, 0);
  assert.equal((await deployed.GET(new Request('http://0.0.0.0:3000/api/presentacion/conexion', { headers: { host: 'localhost:3000' } })).json()).origins.length, 0);
});
