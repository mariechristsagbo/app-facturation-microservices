import { openSqliteDatabase, runTransaction, toPlainObject } from '../../shared/sqlite.js';

export function createOrderStore(filePath) {
  const db = openSqliteDatabase(filePath);

  return {
    async all() {
      const orders = db.prepare('SELECT id, client_id, date, total, statut, createdAt FROM orders ORDER BY id ASC').all();
      return orders.map((order) => ({ ...order, lignes: getLines(db, order.id) }));
    },

    async findById(id) {
      const order = toPlainObject(
        db.prepare('SELECT id, client_id, date, total, statut, createdAt FROM orders WHERE id = ?').get(id)
      );
      return order ? { ...order, lignes: getLines(db, order.id) } : null;
    },

    async create(order) {
      runTransaction(db, () => {
        db.prepare(
          'INSERT INTO orders (id, client_id, date, total, statut, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(order.id, order.client_id, order.date, order.total, order.statut, order.createdAt);

        insertLines(db, order.id, order.lignes);
      });

      return this.findById(order.id);
    },

    async update(id, patch) {
      const existing = await this.findById(id);
      if (!existing) {
        return null;
      }

      runTransaction(db, () => {
        db.prepare(
          'UPDATE orders SET client_id = ?, date = ?, total = ?, statut = ? WHERE id = ?'
        ).run(
          patch.client_id ?? existing.client_id,
          patch.date ?? existing.date,
          patch.total ?? existing.total,
          patch.statut ?? existing.statut,
          id
        );

        if (Object.hasOwn(patch, 'lignes')) {
          db.prepare('DELETE FROM order_lines WHERE order_id = ?').run(id);
          insertLines(db, id, patch.lignes ?? []);
        }
      });

      return this.findById(id);
    },

    async remove(id) {
      const result = db.prepare('DELETE FROM orders WHERE id = ?').run(id);
      return result.changes > 0;
    },

    async nextNumericId() {
      const row = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS id FROM orders').get();
      return row.id;
    },

    close() {
      db.close();
    }
  };
}

function getLines(db, orderId) {
  return db
    .prepare('SELECT produit_id, quantite, prix FROM order_lines WHERE order_id = ? ORDER BY position ASC, id ASC')
    .all(orderId)
    .map(toPlainObject);
}

function insertLines(db, orderId, lines = []) {
  const statement = db.prepare(
    'INSERT INTO order_lines (order_id, produit_id, quantite, prix, position) VALUES (?, ?, ?, ?, ?)'
  );

  lines.forEach((line, index) => {
    statement.run(orderId, line.produit_id, line.quantite, line.prix, index);
  });
}
