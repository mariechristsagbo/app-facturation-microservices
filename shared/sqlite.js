import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export function sqliteFilePath(serviceDir, filename) {
  return path.join(process.env.DATA_DIR || path.join(serviceDir, 'data'), filename);
}

export function readSqliteSchema(serviceDir, filename = 'schema.sql') {
  return readFileSync(path.join(serviceDir, filename), 'utf8');
}

export function openSqliteDatabase(filePath, schema = null) {
  if (!existsSync(filePath) && !schema) {
    throw new Error(`Base SQLite introuvable: ${filePath}`);
  }

  mkdirSync(path.dirname(filePath), { recursive: true });
  const db = new DatabaseSync(filePath);
  db.exec('PRAGMA foreign_keys = ON');

  if (schema) {
    db.exec(schema);
  }

  return db;
}

export function runTransaction(db, callback) {
  db.exec('BEGIN IMMEDIATE');

  try {
    const result = callback();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export class SqliteStore {
  constructor(filePath, options) {
    this.db = openSqliteDatabase(filePath, options.schema);
    this.tableName = quoteIdentifier(options.tableName);
    this.columns = options.columns;
    this.columnList = this.columns.map(quoteIdentifier).join(', ');
  }

  async all() {
    return this.db.prepare(`SELECT ${this.columnList} FROM ${this.tableName} ORDER BY id ASC`).all().map(toPlainObject);
  }

  async findById(id) {
    return toPlainObject(this.db.prepare(`SELECT ${this.columnList} FROM ${this.tableName} WHERE id = ?`).get(id));
  }

  async create(record) {
    const columns = this.columns.filter((column) => Object.hasOwn(record, column));
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map((column) => toStorageValue(record[column]));

    this.db
      .prepare(`INSERT INTO ${this.tableName} (${columns.map(quoteIdentifier).join(', ')}) VALUES (${placeholders})`)
      .run(...values);

    return this.findById(record.id);
  }

  async update(id, patch) {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const columns = this.columns.filter((column) => column !== 'id' && Object.hasOwn(patch, column));
    if (columns.length === 0) {
      return existing;
    }

    const assignments = columns.map((column) => `${quoteIdentifier(column)} = ?`).join(', ');
    const values = columns.map((column) => toStorageValue(patch[column]));

    this.db.prepare(`UPDATE ${this.tableName} SET ${assignments} WHERE id = ?`).run(...values, id);
    return this.findById(id);
  }

  async remove(id) {
    const result = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  async nextNumericId() {
    const row = this.db.prepare(`SELECT COALESCE(MAX(id), 0) + 1 AS id FROM ${this.tableName}`).get();
    return row.id;
  }

  close() {
    this.db.close();
  }
}

export function quoteIdentifier(value) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Identifiant SQLite invalide: ${value}`);
  }

  return `"${value}"`;
}

export function toPlainObject(row) {
  return row ? Object.fromEntries(Object.entries(row)) : null;
}

function toStorageValue(value) {
  return value === undefined ? null : value;
}
