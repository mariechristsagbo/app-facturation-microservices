import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatDate } from '../../shared/format-date.js';
import { requireEnv } from '../../shared/env.js';
import { asyncRoute, createServiceApp, httpError, listen, registerCommonHandlers, requireFields } from '../../shared/express.js';
import { getJson } from '../../shared/http.js';
import { readSqliteSchema, sqliteFilePath } from '../../shared/sqlite.js';
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
    client_id: req.body.client_id ?? order.client_id,
    date: req.body.date ?? order.date,
    total: req.body.total === undefined ? order.total : Number(req.body.total),
    statut: req.body.statut ?? order.statut,
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
  requireFields(body, ['client_id']);

  const clientId = body.client_id;
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
    const productId = line.produit_id;
    const quantity = Number(line.quantite);

    if (!productId || !line.quantite) {
      throw httpError(400, 'Chaque ligne doit contenir produit_id et quantite');
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw httpError(400, 'La quantité doit être positive');
    }

    const product = options.validateExternalServices ? await getProduct(productId) : { id: productId, prix: line.prix };
    const unitPrice = Number(line.prix ?? product.prix);

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw httpError(400, 'Le prix doit être un nombre positif');
    }

    lines.push({
      produit_id: Number(product.id ?? productId),
      quantite: quantity,
      prix: unitPrice
    });
  }

  const total = lines.reduce((sum, line) => sum + line.prix * line.quantite, 0);
  const orderId = await orders.nextNumericId();
  const date = body.date || formatDate();

  return orders.create({
    id: orderId,
    client_id: Number(client.id ?? clientId),
    date,
    total,
    statut: body.statut || 'validée',
    lignes: lines,
    createdAt: new Date(`${date}T00:00:00.000Z`).toISOString()
  });
}

async function getClient(clientId) {
  const response = await getJson(`${CLIENT_SERVICE_URL}/view/${clientId}`, 'Impossible de vérifier le client');
  return response.data;
}

async function getProduct(productId) {
  const response = await getJson(`${PRODUCT_SERVICE_URL}/view/${productId}`, 'Impossible de vérifier le produit');
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
