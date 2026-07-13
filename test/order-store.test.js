import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { createOrderStore } from '../services/order-service/store.js';

test('order store persists order lines in a relational table', async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'facturation-order-store-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const databasePath = path.join(dir, 'orders.sqlite');

  const db = new DatabaseSync(databasePath);
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE orders (
      id INTEGER PRIMARY KEY,
      client_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      total REAL NOT NULL,
      statut TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE order_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      produit_id INTEGER NOT NULL,
      quantite REAL NOT NULL,
      prix REAL NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE INDEX idx_order_lines_order_id ON order_lines(order_id);
  `);
  db.close();

  const store = createOrderStore(databasePath);
  t.after(() => store.close());

  assert.deepEqual(await store.all(), []);
  assert.equal(await store.nextNumericId(), 1);

  const created = await store.createWithGeneratedId((id) => ({
    id,
    client_id: 7,
    date: '2026-06-04',
    total: 2500,
    statut: 'validée',
    lignes: [
      { produit_id: 3, quantite: 2, prix: 1000 },
      { produit_id: 4, quantite: 1, prix: 500 }
    ],
    createdAt: '2026-06-04T00:00:00.000Z'
  }));

  assert.deepEqual(created, {
    id: 1,
    client_id: 7,
    date: '2026-06-04',
    total: 2500,
    statut: 'validée',
    lignes: [
      { produit_id: 3, quantite: 2, prix: 1000 },
      { produit_id: 4, quantite: 1, prix: 500 }
    ],
    createdAt: '2026-06-04T00:00:00.000Z'
  });

  const updated = await store.update(1, {
    total: 3000,
    lignes: [{ produit_id: 5, quantite: 3, prix: 1000 }]
  });

  assert.deepEqual(updated.lignes, [{ produit_id: 5, quantite: 3, prix: 1000 }]);
  assert.equal(updated.total, 3000);
  assert.equal(await store.remove(1), true);
  assert.deepEqual(await store.all(), []);

  const recreated = await store.createWithGeneratedId((id) => ({
    id,
    client_id: 8,
    date: '2026-06-05',
    total: 900,
    statut: 'validée',
    lignes: [{ produit_id: 9, quantite: 1, prix: 900 }],
    createdAt: '2026-06-05T00:00:00.000Z'
  }));

  assert.deepEqual(recreated.lignes, [{ produit_id: 9, quantite: 1, prix: 900 }]);
});
