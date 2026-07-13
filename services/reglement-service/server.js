import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatDate } from '../../shared/format-date.js';
import { requireEnv } from '../../shared/env.js';
import { asyncRoute, createServiceApp, httpError, listen, registerCommonHandlers } from '../../shared/express.js';
import { getJson, sendJson } from '../../shared/http.js';
import { readSqliteSchema, sqliteFilePath } from '../../shared/sqlite.js';
import {
  readOptionalDate,
  readOptionalNumber,
  readOptionalPositiveInteger,
  readOptionalString,
  readRequiredNumber,
  readRequiredPositiveInteger,
  readRequiredString
} from '../../shared/validation.js';
import { createPaymentStore } from './store.js';

const serviceName = 'reglement-service';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const payments = createPaymentStore(sqliteFilePath(__dirname, 'payments.sqlite'), {
  schema: readSqliteSchema(__dirname)
});

const INVOICE_SERVICE_URL = requireEnv('INVOICE_SERVICE_URL');
const SYNC_INTERVAL_MS = Number(process.env.INVOICE_SYNC_INTERVAL_MS || 30_000);

const app = createServiceApp(serviceName);

app.post(
  '/create',
  asyncRoute(async (req, res) => {
    const result = await createPayment(req.body, readIdempotencyKey(req));
    res.set('Idempotent-Replayed', String(result.replayed));
    res.status(result.replayed ? 200 : 201).json({
      service: 'reglement',
      endpoint: '/create',
      status: 'success',
      message: result.replayed ? 'Règlement déjà enregistré' : 'Règlement enregistré avec succès',
      data: formatPaymentSummary(result.payment)
    });
  })
);

app.get(
  '/list',
  asyncRoute(async (req, res) => {
    const data = await payments.all();
    res.json({ service: 'reglement', endpoint: '/list', count: data.length, data: data.map(formatPaymentSummary) });
  })
);

app.get(
  '/view/:id',
  asyncRoute(async (req, res) => {
    const payment = await payments.findById(req.params.id);
    if (!payment) {
      throw httpError(404, 'Règlement introuvable');
    }

    res.json({ service: 'reglement', endpoint: `/view/${req.params.id}`, data: formatPaymentDetails(payment) });
  })
);

app.patch(
  '/edit/:id',
  asyncRoute(async (req, res) => {
    const payment = await payments.findById(req.params.id);
    if (!payment) {
      throw httpError(404, 'Règlement introuvable');
    }

    const invoiceId = readOptionalPositiveInteger(req.body, 'facture_id', payment.facture_id, 'Facture');
    const amount = readOptionalNumber(req.body, 'montant', payment.montant, 'Montant', { minExclusive: 0 });
    const invoice = await getInvoice(invoiceId);
    assertPaymentAmount(invoice, amount, await payments.sumByInvoice(invoiceId, { excludePaymentId: payment.id }));

    const updatedPayment = await payments.updateWithSync(
      req.params.id,
      {
        facture_id: invoiceId,
        montant: amount,
        mode: readOptionalString(req.body, 'mode', payment.mode, 'Mode'),
        date: readOptionalDate(req.body, 'date', payment.date, 'Date'),
        caisse_id: readOptionalPositiveInteger(req.body, 'caisse_id', payment.caisse_id, 'Caisse'),
        reference: readOptionalString(req.body, 'reference', payment.reference, 'Référence')
      },
      { invoiceTotal: invoice.montant }
    );

    await syncInvoices([payment.facture_id, invoiceId]);
    res.json({
      service: 'reglement',
      endpoint: `/edit/${req.params.id}`,
      status: 'success',
      message: 'Règlement modifié avec succès',
      data: formatPaymentDetails(updatedPayment)
    });
  })
);

app.delete(
  '/delete/:id',
  asyncRoute(async (req, res) => {
    const payment = await payments.removeWithSync(req.params.id);
    if (!payment) {
      throw httpError(404, 'Règlement introuvable');
    }

    await trySyncInvoiceStatus(payment.facture_id);
    res.json({
      service: 'reglement',
      endpoint: `/delete/${req.params.id}`,
      status: 'success',
      message: 'Règlement supprimé avec succès',
      data: formatPaymentSummary(payment)
    });
  })
);

registerCommonHandlers(app, serviceName);
listen(app, serviceName, 3007);

void retryPendingInvoiceSyncs();
const syncTimer = setInterval(() => void retryPendingInvoiceSyncs(), SYNC_INTERVAL_MS);
syncTimer.unref();

async function createPayment(body, idempotencyKey) {
  const existing = await payments.findByIdempotencyKey(idempotencyKey);
  if (existing) {
    assertIdempotentReplay(existing, body);
    return { payment: existing, replayed: true };
  }

  const invoiceId = readRequiredPositiveInteger(body, 'facture_id', 'Facture');
  const amount = readRequiredNumber(body, 'montant', 'Montant', { minExclusive: 0 });
  const invoice = await getInvoice(invoiceId);
  assertPaymentAmount(invoice, amount, await payments.sumByInvoice(invoiceId));
  const date = readOptionalDate(body, 'date', formatDate(), 'Date');

  let payment;
  try {
    payment = await payments.createWithSync(
      (id) => ({
        id,
        facture_id: Number(invoice.id ?? invoiceId),
        montant: amount,
        mode: readRequiredString(body, 'mode', 'Mode'),
        date,
        caisse_id: readOptionalPositiveInteger(body, 'caisse_id', null, 'Caisse'),
        reference: readOptionalString(body, 'reference', null, 'Référence'),
        idempotency_key: idempotencyKey,
        createdAt: new Date(`${date}T00:00:00.000Z`).toISOString()
      }),
      { invoiceTotal: invoice.montant }
    );
  } catch (error) {
    const replay = await payments.findByIdempotencyKey(idempotencyKey);
    if (replay) {
      assertIdempotentReplay(replay, body);
      return { payment: replay, replayed: true };
    }
    throw error;
  }

  await trySyncInvoiceStatus(invoiceId);
  return { payment, replayed: false };
}

async function syncInvoices(invoiceIds) {
  await Promise.all([...new Set(invoiceIds.map(Number))].map(trySyncInvoiceStatus));
}

async function trySyncInvoiceStatus(invoiceId) {
  try {
    const invoice = await getInvoice(invoiceId);
    if (invoice.statut === 'annulée') {
      await payments.completeInvoiceSync(invoiceId);
      return;
    }

    const paid = await payments.sumByInvoice(invoiceId);
    const status = paid <= 0 ? 'non payée' : paid >= invoice.montant ? 'payée' : 'partiellement payée';
    if (invoice.statut !== status) {
      await sendJson(
        `${INVOICE_SERVICE_URL}/edit/${encodeURIComponent(invoice.id)}`,
        'PATCH',
        { statut: status },
        'Impossible de mettre à jour la facture'
      );
    }

    await payments.completeInvoiceSync(invoiceId);
  } catch (error) {
    await payments.failInvoiceSync(invoiceId, error.message);
    console.error(`[${serviceName}] synchronisation facture ${invoiceId} reportée:`, error.message);
  }
}

async function retryPendingInvoiceSyncs() {
  const pending = await payments.pendingInvoiceSyncs();
  for (const item of pending) {
    await trySyncInvoiceStatus(item.invoice_id);
  }
}

async function getInvoice(invoiceId) {
  const response = await getJson(
    `${INVOICE_SERVICE_URL}/view/${encodeURIComponent(invoiceId)}`,
    'Impossible de récupérer la facture'
  );
  return response.data;
}

function assertPaymentAmount(invoice, amount, alreadyPaid) {
  if (invoice.statut === 'annulée') {
    throw httpError(409, 'Impossible de régler une facture annulée');
  }

  const remaining = invoice.montant - alreadyPaid;
  if (remaining <= 0) {
    throw httpError(409, 'Cette facture est déjà payée');
  }

  if (amount > remaining) {
    throw httpError(400, `Montant trop élevé. Reste à payer: ${remaining}`);
  }
}

function assertIdempotentReplay(payment, body) {
  const sameRequest =
    String(payment.facture_id) === String(body.facture_id) &&
    Number(payment.montant) === Number(body.montant) &&
    payment.mode === String(body.mode ?? '').trim();

  if (!sameRequest) {
    throw httpError(409, 'Cette Idempotency-Key a déjà été utilisée avec un autre règlement');
  }
}

function readIdempotencyKey(req) {
  const value = req.get('Idempotency-Key');
  if (!value) {
    return null;
  }

  const key = value.trim();
  if (!/^[A-Za-z0-9._:-]{8,200}$/.test(key)) {
    throw httpError(400, 'Idempotency-Key invalide');
  }
  return key;
}

function formatPaymentSummary(payment) {
  return { id: payment.id, facture_id: payment.facture_id, montant: payment.montant, mode: payment.mode };
}

function formatPaymentDetails(payment) {
  return {
    ...formatPaymentSummary(payment),
    date: payment.date || formatDate(payment.createdAt),
    caisse_id: payment.caisse_id ?? null,
    reference: payment.reference ?? null
  };
}
