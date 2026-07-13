import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteStore } from '../shared/sqlite.js';

test('SqliteStore creates an empty database and supports CRUD operations', async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'facturation-sqlite-store-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const databasePath = path.join(dir, 'items.sqlite');

  const db = new DatabaseSync(databasePath);
  db.exec(`
    CREATE TABLE items (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);
  db.close();

  const store = new SqliteStore(databasePath, {
    tableName: 'items',
    columns: ['id', 'name', 'amount', 'createdAt']
  });
  t.after(() => store.close());

  assert.deepEqual(await store.all(), []);
  assert.equal(await store.nextNumericId(), 1);

  const created = await store.createWithGeneratedId((id) => ({
    id,
    name: 'Premier',
    amount: 1500,
    createdAt: '2026-06-04T00:00:00.000Z'
  }));

  assert.deepEqual(created, {
    id: 1,
    name: 'Premier',
    amount: 1500,
    createdAt: '2026-06-04T00:00:00.000Z'
  });
  assert.equal(await store.nextNumericId(), 2);
  assert.deepEqual(await store.findById(1), created);

  const updated = await store.update(1, { amount: 1750 });
  assert.equal(updated.amount, 1750);
  assert.equal(await store.remove(1), true);
  assert.equal(await store.findById(1), null);
  assert.deepEqual(await store.all(), []);
});
