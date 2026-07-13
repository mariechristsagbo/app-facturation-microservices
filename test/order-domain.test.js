import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateTotal, validateOrderLines } from '../services/order-service/domain.js';

test('order lines are validated against products and determine the total', async () => {
  const requestedProducts = [];
  const lines = await validateOrderLines(
    [
      { produit_id: 2, quantite: 3 },
      { produit_id: 4, quantite: 1, prix: 750 }
    ],
    {
      async loadProduct(id) {
        requestedProducts.push(id);
        return { id, prix: id === 2 ? 500 : 900 };
      }
    }
  );

  assert.deepEqual(requestedProducts, [2, 4]);
  assert.deepEqual(lines, [
    { produit_id: 2, quantite: 3, prix: 500 },
    { produit_id: 4, quantite: 1, prix: 750 }
  ]);
  assert.equal(calculateTotal(lines), 2250);
});

test('order lines reject empty and malformed payloads', async () => {
  await assert.rejects(validateOrderLines([]), { status: 400 });
  await assert.rejects(validateOrderLines('invalid'), { status: 400 });
  await assert.rejects(validateOrderLines([{ produit_id: 1, quantite: 0, prix: 100 }]), { status: 400 });
});
