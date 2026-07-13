import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatDate } from '../../shared/format-date.js';
import { requireEnv } from '../../shared/env.js';
import { asyncRoute, createServiceApp, httpError, listen, registerCommonHandlers } from '../../shared/express.js';
import { getJson } from '../../shared/http.js';
import { readSqliteSchema, sqliteFilePath } from '../../shared/sqlite.js';
import {
  readOptionalDate,
  readOptionalEnum,
  readOptionalPositiveInteger,
  readRequiredPositiveInteger
} from '../../shared/validation.js';
import { calculateTotal, ORDER_STATUSES, validateOrderLines } from './domain.js';
import { createOrderStore } from './store.js';

const serviceName = 'order-service';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const orders = createOrderStore(sqliteFilePath(__dirname, 'orders.sqlite'), { schema: readSqliteSchema(__dirname) });

const CLIENT_SERVICE_URL = requireEnv('CLIENT_SERVICE_URL');
const PRODUCT_SERVICE_URL = requireEnv('PRODUCT_SERVICE_URL');

const app = createServiceApp(serviceName);

app.post(
  '/create',
  asyncRoute(async (req, res) => {
    const order = await createOrder(req.body, { validateExternalServices: true });

    res.status(201).json({
      service: 'commande',
      endpoint: '/create',
      status: 'success',
      message: 'Commande créée avec succès',
      data: formatOrderSummary(order)
    });
  })
);

app.get(
  '/list',
  asyncRoute(async (req, res) => {
    const data = await orders.all();

    res.json({
      service: 'commande',
      endpoint: '/list',
      count: data.length,
      data: data.map(formatOrderSummary)
    });
  })
);

app.get(
  '/view/:id',
  asyncRoute(async (req, res) => {
    const order = await orders.findById(req.params.id);
    if (!order) {
      throw httpError(404, 'Commande introuvable');
    }

    res.json({
      service: 'commande',
      endpoint: `/view/${req.params.id}`,
      data: formatOrderDetails(order)
    });
  })
);

app.patch(
  '/edit/:id',
  asyncRoute(async (req, res) => {
    const order = await orders.findById(req.params.id);
    if (!order) {
      throw httpError(404, 'Commande introuvable');
    }

    const clientId = readOptionalPositiveInteger(req.body, 'client_id', order.client_id, 'Client');
    if (clientId !== order.client_id) {
      await getClient(clientId);
    }

    const lines = Object.hasOwn(req.body, 'lignes')
      ? await validateOrderLines(req.body.lignes, { loadProduct: getProduct })
      : order.lignes;

    const updatedOrder = await orders.update(req.params.id, {
      client_id: clientId,
      date: readOptionalDate(req.body, 'date', order.date, 'Date'),
      total: calculateTotal(lines),
      statut: readOptionalEnum(req.body, 'statut', ORDER_STATUSES, order.statut, 'Statut'),
      lignes: lines
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
  })
);

app.delete(
  '/delete/:id',
  asyncRoute(async (req, res) => {
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
  })
);

registerCommonHandlers(app, serviceName);
listen(app, serviceName, 3005);

async function createOrder(body, options = {}) {
  const clientId = readRequiredPositiveInteger(body, 'client_id', 'Client');
  const client = options.validateExternalServices ? await getClient(clientId) : { id: clientId };
  const lines = await validateOrderLines(body.lignes ?? [], {
    loadProduct: options.validateExternalServices ? getProduct : null
  });
  const date = readOptionalDate(body, 'date', formatDate(), 'Date');

  return orders.createWithGeneratedId((orderId) => ({
    id: orderId,
    client_id: Number(client.id ?? clientId),
    date,
    total: calculateTotal(lines),
    statut: readOptionalEnum(body, 'statut', ORDER_STATUSES, 'validée', 'Statut'),
    lignes: lines,
    createdAt: new Date(`${date}T00:00:00.000Z`).toISOString()
  }));
}

async function getClient(clientId) {
  const response = await getJson(
    `${CLIENT_SERVICE_URL}/view/${encodeURIComponent(clientId)}`,
    'Impossible de vérifier le client'
  );
  return response.data;
}

async function getProduct(productId) {
  const response = await getJson(
    `${PRODUCT_SERVICE_URL}/view/${encodeURIComponent(productId)}`,
    'Impossible de vérifier le produit'
  );
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
