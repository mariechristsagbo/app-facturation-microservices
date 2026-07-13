import { openSqliteDatabase, runTransaction, toPlainObject } from '../../shared/sqlite.js';

export function createPaymentStore(filePath, options = {}) {
  const db = openSqliteDatabase(filePath, options.schema);
  migrate(db);

  return {
    async all() {
      return db.prepare(`${PAYMENT_SELECT} ORDER BY id ASC`).all().map(toPlainObject);
    },

    async findById(id) {
      return toPlainObject(db.prepare(`${PAYMENT_SELECT} WHERE id = ?`).get(id));
    },

    async findByIdempotencyKey(key) {
      if (!key) {
        return null;
      }

      return toPlainObject(db.prepare(`${PAYMENT_SELECT} WHERE idempotency_key = ?`).get(key));
    },

    async createWithSync(buildPayment, options = {}) {
      const payment = runTransaction(db, () => {
        const id = nextNumericId(db);
        const generatedPayment = buildPayment(id);
        assertInvoiceTotal(db, generatedPayment, options.invoiceTotal);
        insertPayment(db, generatedPayment);
        queueInvoiceSync(db, generatedPayment.facture_id);
        return generatedPayment;
      });

      return this.findById(payment.id);
    },

    async updateWithSync(id, patch, options = {}) {
      const existing = await this.findById(id);
      if (!existing) {
        return null;
      }

      runTransaction(db, () => {
        assertInvoiceTotal(db, { ...existing, ...patch }, options.invoiceTotal, existing.id);
        db.prepare(
          `
          UPDATE payments
          SET facture_id = ?, montant = ?, mode = ?, date = ?, caisse_id = ?, reference = ?
          WHERE id = ?
        `
        ).run(
          patch.facture_id ?? existing.facture_id,
          patch.montant ?? existing.montant,
          patch.mode ?? existing.mode,
          patch.date ?? existing.date,
          patch.caisse_id ?? existing.caisse_id,
          patch.reference ?? existing.reference,
          id
        );

        queueInvoiceSync(db, existing.facture_id);
        queueInvoiceSync(db, patch.facture_id ?? existing.facture_id);
      });

      return this.findById(id);
    },

    async removeWithSync(id) {
      const existing = await this.findById(id);
      if (!existing) {
        return null;
      }

      runTransaction(db, () => {
        db.prepare('DELETE FROM payments WHERE id = ?').run(id);
        queueInvoiceSync(db, existing.facture_id);
      });

      return existing;
    },

    async sumByInvoice(invoiceId, options = {}) {
      const excludedId = options.excludePaymentId ?? null;
      const row = db
        .prepare(
          `
        SELECT COALESCE(SUM(montant), 0) AS total
        FROM payments
        WHERE facture_id = ? AND (? IS NULL OR id != ?)
      `
        )
        .get(invoiceId, excludedId, excludedId);
      return row.total;
    },

    async pendingInvoiceSyncs(limit = 25) {
      return db
        .prepare(
          `
        SELECT invoice_id, attempts, last_error, updated_at
        FROM invoice_status_sync
        ORDER BY updated_at ASC
        LIMIT ?
      `
        )
        .all(limit)
        .map(toPlainObject);
    },

    async completeInvoiceSync(invoiceId) {
      db.prepare('DELETE FROM invoice_status_sync WHERE invoice_id = ?').run(invoiceId);
    },

    async failInvoiceSync(invoiceId, message) {
      db.prepare(
        `
        UPDATE invoice_status_sync
        SET attempts = attempts + 1, last_error = ?, updated_at = ?
        WHERE invoice_id = ?
      `
      ).run(String(message).slice(0, 500), new Date().toISOString(), invoiceId);
    },

    close() {
      db.close();
    }
  };
}

const PAYMENT_SELECT = `
  SELECT id, facture_id, montant, mode, date, caisse_id, reference, idempotency_key, createdAt
  FROM payments
`;

function migrate(db) {
  const columns = db
    .prepare('PRAGMA table_info(payments)')
    .all()
    .map((column) => column.name);
  if (!columns.includes('idempotency_key')) {
    db.exec('ALTER TABLE payments ADD COLUMN idempotency_key TEXT');
  }

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency_key
      ON payments(idempotency_key)
      WHERE idempotency_key IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_payments_facture_id ON payments(facture_id);

    CREATE TABLE IF NOT EXISTS invoice_status_sync (
      invoice_id INTEGER PRIMARY KEY,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      updated_at TEXT NOT NULL
    );
  `);
}

function insertPayment(db, payment) {
  db.prepare(
    `
    INSERT INTO payments (
      id, facture_id, montant, mode, date, caisse_id, reference, idempotency_key, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    payment.id,
    payment.facture_id,
    payment.montant,
    payment.mode,
    payment.date,
    payment.caisse_id,
    payment.reference,
    payment.idempotency_key,
    payment.createdAt
  );
}

function queueInvoiceSync(db, invoiceId) {
  db.prepare(
    `
    INSERT INTO invoice_status_sync (invoice_id, attempts, last_error, updated_at)
    VALUES (?, 0, NULL, ?)
    ON CONFLICT(invoice_id) DO UPDATE SET
      attempts = 0,
      last_error = NULL,
      updated_at = excluded.updated_at
  `
  ).run(invoiceId, new Date().toISOString());
}

function nextNumericId(db) {
  return db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS id FROM payments').get().id;
}

function assertInvoiceTotal(db, payment, invoiceTotal, excludedPaymentId = null) {
  if (invoiceTotal === undefined) {
    return;
  }

  const paid = db
    .prepare(
      `
      SELECT COALESCE(SUM(montant), 0) AS total
      FROM payments
      WHERE facture_id = ? AND (? IS NULL OR id != ?)
    `
    )
    .get(payment.facture_id, excludedPaymentId, excludedPaymentId).total;

  if (paid + payment.montant > invoiceTotal) {
    const error = new Error('Le montant restant a changé. Rechargez la facture puis réessayez.');
    error.status = 409;
    throw error;
  }
}
