import assert from 'node:assert/strict';
import {
  enfilerOperation,
  memoryOutboxStore,
  operationsEnAttente,
  synchroniser,
} from './offlineCaisse';

const UID = 'user-A';
const store = memoryOutboxStore();
await enfilerOperation(
  '/stocks/tomates-1',
  { quantite: 17, idempotency_key: 'stock-op-1' },
  UID,
  store,
  'PATCH',
);

let received: unknown = null;
const result = await synchroniser(async (endpoint, payload, method) => {
  received = { endpoint, payload, method };
}, UID, store);

assert.equal(result.ok, 1);
assert.deepEqual(received, {
  endpoint: '/stocks/tomates-1',
  payload: { quantite: 17, idempotency_key: 'stock-op-1' },
  method: 'PATCH',
});
assert.equal((await operationsEnAttente(UID, store)).length, 0);

console.log('offlineStock: OK');
