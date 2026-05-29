import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatDate, formatId, nextNumericId } from '../../shared/api-format.js';
import { requireEnv } from '../../shared/env.js';
import { asyncRoute, createServiceApp, httpError, listen, registerCommonHandlers, requireFields } from '../../shared/express.js';
import { getJson } from '../../shared/http.js';
import { JsonStore } from '../../shared/store.js';

const serviceName = 'invoice-service';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const invoices = new JsonStore(path.join(__dirname, 'data', 'invoices.json'), [
  {
    id: 1,
    commande_id: 1,
    numero: 'FAC-2026-001',
    date_emission: '2026-05-10',
    montant: 455000,
    statut: 'payée',
    createdAt: '2026-05-10T00:00:00.000Z'
  },
  {
    id: 2,
    commande_id: 2,
    numero: 'FAC-2026-002',
    date_emission: '2026-05-12',
    montant: 120000,
    statut: 'payée',
    createdAt: '2026-05-12T00:00:00.000Z'
  },
  {
    id: 3,
    commande_id: 3,
    numero: 'FAC-2026-003',
    date_emission: '2026-05-15',
    montant: 13000,
    statut: 'non payée',
    createdAt: '2026-05-15T00:00:00.000Z'
  }
]);

const ORDER_SERVICE_URL = requireEnv('ORDER_SERVICE_URL');

const app = createServiceApp(serviceName);

app.post('/create', asyncRoute(async (req, res) => {
  const invoice = await createInvoice(req.body, { validateOrder: true });

  res.status(201).json({
    service: 'facture',
    endpoint: '/create',
    status: 'success',
    message: 'Facture générée avec succès',
    data: formatInvoiceSummary(invoice)
  });
}));

app.get('/list', asyncRoute(async (req, res) => {
  const data = await invoices.all();

  res.json({
    service: 'facture',
    endpoint: '/list',
    count: data.length,
    data: data.map(formatInvoiceSummary)
  });
}));

app.get('/view/:id', asyncRoute(async (req, res) => {
  const invoice = await invoices.findById(req.params.id);
  if (!invoice) {
    throw httpError(404, 'Facture introuvable');
  }

  res.json({
    service: 'facture',
    endpoint: `/view/${req.params.id}`,
    data: formatInvoiceDetails(invoice)
  });
}));

app.patch('/edit/:id', asyncRoute(async (req, res) => {
  const invoice = await invoices.findById(req.params.id);
  if (!invoice) {
    throw httpError(404, 'Facture introuvable');
  }

  if (req.body.statut !== undefined) {
    validateInvoiceStatus(req.body.statut);
  }

  const updatedInvoice = await invoices.update(req.params.id, {
    commande_id: req.body.commande_id ?? invoice.commande_id,
    numero: req.body.numero ?? invoice.numero,
    date_emission: req.body.date_emission ?? invoice.date_emission,
    montant: req.body.montant === undefined ? invoice.montant : Number(req.body.montant),
    statut: req.body.statut ?? invoice.statut
  });

  res.json({
    service: 'facture',
    endpoint: `/edit/${req.params.id}`,
    status: 'success',
    message: 'Facture modifiée avec succès',
    data: formatInvoiceDetails(updatedInvoice)
  });
}));

app.delete('/delete/:id', asyncRoute(async (req, res) => {
  const invoice = await invoices.findById(req.params.id);
  if (!invoice) {
    throw httpError(404, 'Facture introuvable');
  }

  await invoices.remove(req.params.id);

  res.json({
    service: 'facture',
    endpoint: `/delete/${req.params.id}`,
    status: 'success',
    message: 'Facture supprimée avec succès',
    data: formatInvoiceSummary(invoice)
  });
}));

registerCommonHandlers(app, serviceName);
listen(app, serviceName, 3006);

async function createInvoice(body, options = {}) {
  requireFields(body, ['commande_id']);

  const orderId = body.commande_id;
  const amount = body.montant === undefined ? null : Number(body.montant);

  if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
    throw httpError(400, 'Le montant doit être un nombre positif');
  }

  if (body.statut !== undefined) {
    validateInvoiceStatus(body.statut);
  }

  const existing = (await invoices.all()).find((invoice) => String(getOrderId(invoice)) === String(orderId));
  if (existing) {
    throw httpError(409, 'Cette commande a déjà une facture');
  }

  const order = options.validateOrder ? await getOrder(orderId) : { id: orderId, total: amount ?? 0 };
  const invoiceId = nextNumericId(await invoices.all());
  const date = body.date_emission || formatDate();
  const invoiceAmount = amount ?? order.total;

  return invoices.create({
    id: invoiceId,
    commande_id: formatId(order.id ?? orderId),
    numero: body.numero || formatInvoiceNumber(invoiceId, date),
    date_emission: date,
    montant: invoiceAmount,
    statut: body.statut || 'non payée',
    createdAt: new Date(`${date}T00:00:00.000Z`).toISOString()
  });
}

async function getOrder(orderId) {
  const response = await getJson(`${ORDER_SERVICE_URL}/view/${orderId}`, 'Impossible de récupérer la commande');
  return response.data;
}

function formatInvoiceSummary(invoice) {
  return {
    id: formatId(invoice.id),
    commande_id: getOrderId(invoice),
    numero: invoice.numero,
    montant: invoice.montant
  };
}

function formatInvoiceDetails(invoice) {
  return {
    id: formatId(invoice.id),
    commande_id: getOrderId(invoice),
    numero: invoice.numero,
    date_emission: invoice.date_emission || formatDate(invoice.createdAt),
    montant: invoice.montant,
    statut: invoice.statut
  };
}

function formatInvoiceNumber(id, date) {
  return `FAC-${date.slice(0, 4)}-${String(id).padStart(3, '0')}`;
}

function getOrderId(invoice) {
  return formatId(invoice.commande_id);
}

function validateInvoiceStatus(status) {
  const allowedStatuses = ['non payée', 'partiellement payée', 'payée', 'annulée'];
  if (!allowedStatuses.includes(status)) {
    throw httpError(400, `Statut invalide. Valeurs: ${allowedStatuses.join(', ')}`);
  }
}
