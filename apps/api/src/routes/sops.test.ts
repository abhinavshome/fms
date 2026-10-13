import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import type { AddressInfo } from 'node:net';
import { createApp } from '../app.js';
import type { SopDatabase } from './sops.js';

type FakeDatabase = {
  manyOrNone: SopDatabase['manyOrNone'];
  one: SopDatabase['one'];
};

const servers: ReturnType<ReturnType<typeof createApp>['listen']>[] = [];

function createFakeDatabase(): FakeDatabase & { calls: { query: string; params?: unknown }[] } {
  const calls: { query: string; params?: unknown }[] = [];
  return {
    calls,
    async manyOrNone(query: string) {
      calls.push({ query });
      return [{ id: 112, name: 'Entry / Exit Procedure' }];
    },
    async one(query: string, params?: unknown) {
      calls.push({ query, params });
      if (query.startsWith('SELECT 1')) return { ok: 1 };
      return { id: 113, name: params instanceof Array ? params[0] : undefined, accountability_role_id: 2 };
    }
  } as FakeDatabase & { calls: { query: string; params?: unknown }[] };
}

async function startApi(database: SopDatabase) {
  const server = createApp(database).listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))));
});

test('GET /api/sops returns the SOP collection', async () => {
  const database = createFakeDatabase();
  const baseUrl = await startApi(database);

  const response = await fetch(`${baseUrl}/api/sops`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [{ id: 112, name: 'Entry / Exit Procedure' }]);
  assert.match(database.calls[0].query, /SELECT \* FROM sops/);
});

test('POST /api/sops rejects missing required fields', async () => {
  const database = createFakeDatabase();
  const baseUrl = await startApi(database);

  const response = await fetch(`${baseUrl}/api/sops`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Incomplete SOP' })
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Name, objective, scope, and accountabilityRoleId are required.' });
  assert.equal(database.calls.length, 0);
});

test('POST /api/sops trims text and creates an SOP', async () => {
  const database = createFakeDatabase();
  const baseUrl = await startApi(database);

  const response = await fetch(`${baseUrl}/api/sops`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: '  Entry SOP  ', objective: '  Keep access controlled. ', scope: '  Quality Control  ', accountabilityRoleId: 2 })
  });

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { id: 113, name: 'Entry SOP', accountability_role_id: 2 });
  assert.deepEqual(database.calls[0].params, ['Entry SOP', 'Keep access controlled.', 'Quality Control', 2]);
});

test('GET /api/health reports database availability', async () => {
  const database = createFakeDatabase();
  const baseUrl = await startApi(database);

  const response = await fetch(`${baseUrl}/api/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', database: 'connected' });
});

test('I should be able to create a SOP', async () => {
  const db = createFakeDatabase();
  

})
