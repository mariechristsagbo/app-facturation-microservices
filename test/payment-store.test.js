import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createPaymentStore } from '../services/reglement-service/store.js';

const schema = readFileSync(new URL('../services/reglement-service/schema.sql', import.meta.url), 'utf8');

test('payment mutations atomically queue invoice status synchronization', async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'facturation-payment-store-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const store = createPaymentStore(path.join(dir, 'payments.sqlite'), { schema });
  t.after(() => store.close());

  const payment = await store.createWithSync((id) => ({
    id,
    facture_id: 7,
    montant: 1000,
    mode: 'mobile money',
    date: '2026-07-13',
    caisse_id: null,
    reference: 'PAY-001',
    idempotency_key: 'request-0001',
    createdAt: '2026-07-13T00:00:00.000Z'
  }));

  assert.equal(payment.id, 1);
  assert.equal((await store.findByIdempotencyKey('request-0001')).id, payment.id);
  assert.deepEqual(
    (await store.pendingInvoiceSyncs()).map((item) => item.invoice_id),
    [7]
  );

  await store.completeInvoiceSync(7);
  await store.updateWithSync(payment.id, { facture_id: 8, montant: 750 });
  assert.deepEqual((await store.pendingInvoiceSyncs()).map((item) => item.invoice_id).sort(), [7, 8]);
  assert.equal(await store.sumByInvoice(8), 750);

  await assert.rejects(
    store.createWithSync(
      (id) => ({
        id,
        facture_id: 8,
        montant: 300,
        mode: 'espèces',
        date: '2026-07-13',
        caisse_id: null,
        reference: null,
        idempotency_key: 'request-0002',
        createdAt: '2026-07-13T00:00:00.000Z'
      }),
      { invoiceTotal: 1000 }
    ),
    { status: 409 }
  );

  await store.completeInvoiceSync(7);
  await store.completeInvoiceSync(8);
  await store.removeWithSync(payment.id);
  assert.deepEqual(
    (await store.pendingInvoiceSyncs()).map((item) => item.invoice_id),
    [8]
  );
});
