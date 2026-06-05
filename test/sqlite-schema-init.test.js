import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { SqliteStore } from '../shared/sqlite.js';

test('SqliteStore creates a missing database from a schema', async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'facturation-sqlite-schema-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const databasePath = path.join(dir, 'nested', 'items.sqlite');

  const store = new SqliteStore(databasePath, {
    tableName: 'items',
    columns: ['id', 'name', 'createdAt'],
    schema: `
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `
  });
  t.after(() => store.close());

  assert.equal(existsSync(databasePath), true);
  assert.deepEqual(await store.all(), []);

  const created = await store.create({
    id: await store.nextNumericId(),
    name: 'Premier',
    createdAt: '2026-06-05T00:00:00.000Z'
  });

  assert.equal(created.id, 1);
  assert.equal(created.name, 'Premier');
});
