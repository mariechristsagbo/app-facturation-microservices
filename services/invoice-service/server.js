import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatDate } from '../../shared/format-date.js';
import { requireEnv } from '../../shared/env.js';
import { asyncRoute, createServiceApp, httpError, listen, registerCommonHandlers } from '../../shared/express.js';
import { getJson } from '../../shared/http.js';
import { readSqliteSchema, SqliteStore, sqliteFilePath } from '../../shared/sqlite.js';
import { readOptionalDate, readOptionalEnum, readOptionalNumber, readOptionalString, readRequiredPositiveInteger } from '../../shared/validation.js';

const serviceName = 'invoice-service';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const invoices = new SqliteStore(sqliteFilePath(__dirname, 'invoices.sqlite'), {
  tableName: 'invoices',
  columns: ['id', 'commande_id', 'numero', 'date_emission', 'montant', 'statut', 'createdAt'],
  schema: readSqliteSchema(__dirname)
});

const ORDER_SERVICE_URL = requireEnv('ORDER_SERVICE_URL');
const INVOICE_STATUSES = ['non payée', 'partiellement payée', 'payée', 'annulée'];

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

  const updatedInvoice = await invoices.update(req.params.id, {
    commande_id: readOptionalNumber(req.body, 'commande_id', invoice.commande_id, 'Commande', { integer: true, min: 1 }),
    numero: readOptionalString(req.body, 'numero', invoice.numero, 'Numéro'),
    date_emission: readOptionalDate(req.body, 'date_emission', invoice.date_emission, 'Date émission'),
    montant: readOptionalNumber(req.body, 'montant', invoice.montant, 'Montant', { min: 0 }),
    statut: readOptionalEnum(req.body, 'statut', INVOICE_STATUSES, invoice.statut, 'Statut')
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
  const orderId = readRequiredPositiveInteger(body, 'commande_id', 'Commande');
  const amount = readOptionalNumber(body, 'montant', null, 'Montant', { min: 0 });

  const existing = (await invoices.all()).find((invoice) => String(getOrderId(invoice)) === String(orderId));
  if (existing) {
    throw httpError(409, 'Cette commande a déjà une facture');
  }

  const order = options.validateOrder ? await getOrder(orderId) : { id: orderId, total: amount ?? 0 };
  const invoiceId = await invoices.nextNumericId();
  const date = readOptionalDate(body, 'date_emission', formatDate(), 'Date émission');
  const invoiceAmount = amount ?? order.total;

  return invoices.create({
    id: invoiceId,
    commande_id: Number(order.id ?? orderId),
    numero: readOptionalString(body, 'numero', formatInvoiceNumber(invoiceId, date), 'Numéro'),
    date_emission: date,
    montant: invoiceAmount,
    statut: readOptionalEnum(body, 'statut', INVOICE_STATUSES, 'non payée', 'Statut'),
    createdAt: new Date(`${date}T00:00:00.000Z`).toISOString()
  });
}

async function getOrder(orderId) {
  const response = await getJson(`${ORDER_SERVICE_URL}/view/${encodeURIComponent(orderId)}`, 'Impossible de récupérer la commande');
  return response.data;
}

function formatInvoiceSummary(invoice) {
  return {
    id: invoice.id,
    commande_id: getOrderId(invoice),
    numero: invoice.numero,
    montant: invoice.montant
  };
}

function formatInvoiceDetails(invoice) {
  return {
    id: invoice.id,
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
  return invoice.commande_id;
}
