import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatDate, formatId, nextNumericId } from '../../shared/api-format.js';
import { requireEnv } from '../../shared/env.js';
import { asyncRoute, createServiceApp, httpError, listen, registerCommonHandlers, requireFields } from '../../shared/express.js';
import { getJson, sendJson } from '../../shared/http.js';
import { JsonStore } from '../../shared/store.js';

const serviceName = 'payment-service';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const payments = new JsonStore(path.join(__dirname, 'data', 'payments.json'), [
  {
    id: 1,
    facture_id: 1,
    montant: 455000,
    mode: 'espèces',
    date: '2026-05-10',
    caisse_id: 1,
    createdAt: '2026-05-10T00:00:00.000Z'
  },
  {
    id: 2,
    facture_id: 2,
    montant: 120000,
    mode: 'virement',
    date: '2026-05-12',
    caisse_id: 1,
    createdAt: '2026-05-12T00:00:00.000Z'
  },
  {
    id: 3,
    facture_id: 3,
    montant: 13000,
    mode: 'mobile money',
    date: '2026-05-15',
    caisse_id: 3,
    createdAt: '2026-05-15T00:00:00.000Z'
  }
]);

const INVOICE_SERVICE_URL = requireEnv('INVOICE_SERVICE_URL');

const app = createServiceApp(serviceName);

app.post('/create', asyncRoute(async (req, res) => {
  const payment = await createPayment(req.body);

  res.status(201).json({
    service: 'reglement',
    endpoint: '/create',
    status: 'success',
    message: 'Règlement enregistré avec succès',
    data: formatPaymentSummary(payment)
  });
}));

app.get('/list', asyncRoute(async (req, res) => {
  const data = await payments.all();

  res.json({
    service: 'reglement',
    endpoint: '/list',
    count: data.length,
    data: data.map(formatPaymentSummary)
  });
}));

app.get('/view/:id', asyncRoute(async (req, res) => {
  const payment = await payments.findById(req.params.id);
  if (!payment) {
    throw httpError(404, 'Règlement introuvable');
  }

  res.json({
    service: 'reglement',
    endpoint: `/view/${req.params.id}`,
    data: formatPaymentDetails(payment)
  });
}));

app.patch('/edit/:id', asyncRoute(async (req, res) => {
  const payment = await payments.findById(req.params.id);
  if (!payment) {
    throw httpError(404, 'Règlement introuvable');
  }

  const updatedPayment = await payments.update(req.params.id, {
    facture_id: req.body.facture_id ?? req.body.factureId ?? payment.facture_id,
    montant: req.body.montant === undefined ? payment.montant : Number(req.body.montant),
    mode: req.body.mode ?? payment.mode,
    date: req.body.date ?? payment.date,
    caisse_id: req.body.caisse_id ?? req.body.caisseId ?? payment.caisse_id
  });

  res.json({
    service: 'reglement',
    endpoint: `/edit/${req.params.id}`,
    status: 'success',
    message: 'Règlement modifié avec succès',
    data: formatPaymentDetails(updatedPayment)
  });
}));

app.delete('/delete/:id', asyncRoute(async (req, res) => {
  const payment = await payments.findById(req.params.id);
  if (!payment) {
    throw httpError(404, 'Règlement introuvable');
  }

  await payments.remove(req.params.id);

  res.json({
    service: 'reglement',
    endpoint: `/delete/${req.params.id}`,
    status: 'success',
    message: 'Règlement supprimé avec succès',
    data: formatPaymentSummary(payment)
  });
}));

registerCommonHandlers(app, serviceName);
listen(app, serviceName, 3007);

async function createPayment(body) {
  const invoiceId = body.facture_id ?? body.factureId;
  requireFields({ invoiceId, montant: body.montant, mode: body.mode }, ['invoiceId', 'montant', 'mode']);

  const amount = Number(body.montant);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw httpError(400, 'Le montant doit être positif');
  }

  const invoice = await getInvoice(invoiceId);
  const remaining = getRemainingAmount(invoice, await payments.all());

  if (amount > remaining) {
    throw httpError(400, `Montant trop élevé. Reste à payer: ${remaining}`);
  }

  const date = body.date || formatDate();
  const payment = await payments.create({
    id: nextNumericId(await payments.all()),
    facture_id: formatId(invoice.id ?? invoiceId),
    factureId: invoice.id ?? invoiceId,
    montant: amount,
    mode: body.mode,
    date,
    caisse_id: body.caisse_id ?? body.caisseId ?? null,
    reference: body.reference || null,
    createdAt: new Date(`${date}T00:00:00.000Z`).toISOString()
  });

  await updateInvoiceStatus(invoice, amount, remaining);
  return payment;
}

async function getInvoice(invoiceId) {
  const response = await getJson(`${INVOICE_SERVICE_URL}/view/${invoiceId}`, 'Impossible de récupérer la facture');
  return response.data;
}

async function updateInvoiceStatus(invoice, amount, remaining) {
  const status = amount === remaining ? 'payée' : 'partiellement payée';

  await sendJson(
    `${INVOICE_SERVICE_URL}/edit/${invoice.id}`,
    'PATCH',
    { statut: status },
    'Impossible de mettre à jour la facture'
  );
}

function getRemainingAmount(invoice, data) {
  if (invoice.statut === 'payée') {
    throw httpError(409, 'Cette facture est déjà payée');
  }

  if (invoice.statut === 'annulée') {
    throw httpError(409, 'Impossible de régler une facture annulée');
  }

  const paid = data
    .filter((payment) => String(getInvoiceId(payment)) === String(invoice.id))
    .reduce((sum, payment) => sum + payment.montant, 0);

  return invoice.montant - paid;
}

function formatPaymentSummary(payment) {
  return {
    id: formatId(payment.id),
    facture_id: getInvoiceId(payment),
    montant: payment.montant,
    mode: payment.mode
  };
}

function formatPaymentDetails(payment) {
  return {
    ...formatPaymentSummary(payment),
    date: payment.date || formatDate(payment.createdAt),
    caisse_id: payment.caisse_id ?? null
  };
}

function getInvoiceId(payment) {
  return formatId(payment.facture_id ?? payment.factureId);
}
