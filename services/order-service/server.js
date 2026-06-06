import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatDate } from '../../shared/format-date.js';
import { requireEnv } from '../../shared/env.js';
import { asyncRoute, createServiceApp, httpError, listen, registerCommonHandlers } from '../../shared/express.js';
import { getJson } from '../../shared/http.js';
import { readSqliteSchema, sqliteFilePath } from '../../shared/sqlite.js';
import { readOptionalDate, readOptionalNumber, readOptionalString, readRequiredNumber, readRequiredPositiveInteger } from '../../shared/validation.js';
import { createOrderStore } from './store.js';

const serviceName = 'order-service';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const orders = createOrderStore(sqliteFilePath(__dirname, 'orders.sqlite'), { schema: readSqliteSchema(__dirname) });

const CLIENT_SERVICE_URL = requireEnv('CLIENT_SERVICE_URL');
const PRODUCT_SERVICE_URL = requireEnv('PRODUCT_SERVICE_URL');

const app = createServiceApp(serviceName);

app.post('/create', asyncRoute(async (req, res) => {
  const order = await createOrder(req.body, { validateExternalServices: true });

  res.status(201).json({
    service: 'commande',
    endpoint: '/create',
    status: 'success',
    message: 'Commande créée avec succès',
    data: formatOrderSummary(order)
  });
}));

app.get('/list', asyncRoute(async (req, res) => {
  const data = await orders.all();

  res.json({
    service: 'commande',
    endpoint: '/list',
    count: data.length,
    data: data.map(formatOrderSummary)
  });
}));

app.get('/view/:id', asyncRoute(async (req, res) => {
  const order = await orders.findById(req.params.id);
  if (!order) {
    throw httpError(404, 'Commande introuvable');
  }

  res.json({
    service: 'commande',
    endpoint: `/view/${req.params.id}`,
    data: formatOrderDetails(order)
  });
}));

app.patch('/edit/:id', asyncRoute(async (req, res) => {
  const order = await orders.findById(req.params.id);
  if (!order) {
    throw httpError(404, 'Commande introuvable');
  }

  const updatedOrder = await orders.update(req.params.id, {
    client_id: readOptionalNumber(req.body, 'client_id', order.client_id, 'Client', { integer: true, min: 1 }),
    date: readOptionalDate(req.body, 'date', order.date, 'Date'),
    total: readOptionalNumber(req.body, 'total', order.total, 'Total', { min: 0 }),
    statut: readOptionalString(req.body, 'statut', order.statut, 'Statut'),
    lignes: req.body.lignes ?? order.lignes
  });

  if (!updatedOrder) {
    throw httpError(404, 'Commande introuvable');
  }

  res.json({
    service: 'commande',
    endpoint: `/edit/${req.params.id}`,
    status: 'success',
    message: 'Commande modifiée avec succès',
    data: formatOrderDetails(updatedOrder)
  });
}));

app.delete('/delete/:id', asyncRoute(async (req, res) => {
  const order = await orders.findById(req.params.id);
  if (!order) {
    throw httpError(404, 'Commande introuvable');
  }

  await orders.remove(req.params.id);

  res.json({
    service: 'commande',
    endpoint: `/delete/${req.params.id}`,
    status: 'success',
    message: 'Commande supprimée avec succès',
    data: formatOrderSummary(order)
  });
}));

registerCommonHandlers(app, serviceName);
listen(app, serviceName, 3005);

async function createOrder(body, options = {}) {
  const clientId = readRequiredPositiveInteger(body, 'client_id', 'Client');
  const requestLines = body.lignes ?? [];

  if (!Array.isArray(requestLines)) {
    throw httpError(400, 'Les lignes de commande doivent être une liste');
  }

  if (requestLines.length === 0) {
    throw httpError(400, 'La commande doit contenir au moins un produit');
  }

  const client = options.validateExternalServices ? await getClient(clientId) : { id: clientId };
  const lines = [];

  for (const line of requestLines) {
    const productId = readRequiredPositiveInteger(line, 'produit_id', 'Produit');
    const quantity = readRequiredNumber(line, 'quantite', 'Quantité', { minExclusive: 0 });

    const product = options.validateExternalServices ? await getProduct(productId) : { id: productId, prix: line.prix };
    const unitPrice = readOptionalNumber(line, 'prix', product.prix, 'Prix', { min: 0 });

    lines.push({
      produit_id: Number(product.id ?? productId),
      quantite: quantity,
      prix: unitPrice
    });
  }

  const total = lines.reduce((sum, line) => sum + line.prix * line.quantite, 0);
  const orderId = await orders.nextNumericId();
  const date = readOptionalDate(body, 'date', formatDate(), 'Date');

  return orders.create({
    id: orderId,
    client_id: Number(client.id ?? clientId),
    date,
    total,
    statut: readOptionalString(body, 'statut', 'validée', 'Statut'),
    lignes: lines,
    createdAt: new Date(`${date}T00:00:00.000Z`).toISOString()
  });
}

async function getClient(clientId) {
  const response = await getJson(`${CLIENT_SERVICE_URL}/view/${encodeURIComponent(clientId)}`, 'Impossible de vérifier le client');
  return response.data;
}

async function getProduct(productId) {
  const response = await getJson(`${PRODUCT_SERVICE_URL}/view/${encodeURIComponent(productId)}`, 'Impossible de vérifier le produit');
  return response.data;
}

function formatOrderSummary(order) {
  return {
    id: order.id,
    client_id: getClientId(order),
    date: order.date || formatDate(order.createdAt),
    total: order.total
  };
}

function formatOrderDetails(order) {
  return {
    ...formatOrderSummary(order),
    statut: order.statut,
    lignes: getOrderLines(order)
  };
}

function getClientId(order) {
  return order.client_id;
}

function getOrderLines(order) {
  return order.lignes.map((line) => ({
    produit_id: line.produit_id,
    quantite: line.quantite,
    prix: line.prix
  }));
}
