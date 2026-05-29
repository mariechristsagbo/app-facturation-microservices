import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatDate, formatId, nextNumericId } from '../../shared/api-format.js';
import { requireEnv } from '../../shared/env.js';
import { asyncRoute, createServiceApp, httpError, listen, registerCommonHandlers, requireFields } from '../../shared/express.js';
import { getJson } from '../../shared/http.js';
import { JsonStore } from '../../shared/store.js';

const serviceName = 'order-service';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const orders = new JsonStore(path.join(__dirname, 'data', 'orders.json'), [
  {
    id: 1,
    client_id: 1,
    date: '2026-05-10',
    total: 455000,
    statut: 'validée',
    lignes: [
      { produit_id: 1, quantite: 1, prix: 450000 },
      { produit_id: 3, quantite: 1, prix: 5000 }
    ],
    createdAt: '2026-05-10T00:00:00.000Z'
  },
  {
    id: 2,
    client_id: 2,
    date: '2026-05-12',
    total: 120000,
    statut: 'validée',
    lignes: [{ produit_id: 2, quantite: 1, prix: 120000 }],
    createdAt: '2026-05-12T00:00:00.000Z'
  },
  {
    id: 3,
    client_id: 3,
    date: '2026-05-15',
    total: 13000,
    statut: 'validée',
    lignes: [{ produit_id: 3, quantite: 2, prix: 6500 }],
    createdAt: '2026-05-15T00:00:00.000Z'
  }
]);

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
    client_id: req.body.client_id ?? req.body.clientId ?? order.client_id,
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
  const clientId = body.client_id ?? body.clientId;
  const requestLines = body.lignes ?? body.items ?? [];
  const bodyTotal = body.total === undefined ? null : Number(body.total);

  requireFields({ clientId }, ['clientId']);

  if (!Array.isArray(requestLines)) {
    throw httpError(400, 'Les lignes de commande doivent être une liste');
  }

  if (requestLines.length === 0 && bodyTotal === null) {
    throw httpError(400, 'La commande doit contenir au moins un produit ou un total');
  }

  if (bodyTotal !== null && (!Number.isFinite(bodyTotal) || bodyTotal < 0)) {
    throw httpError(400, 'Le total doit être un nombre positif');
  }

  const client = options.validateExternalServices ? await getClient(clientId) : { id: clientId };
  const lines = [];
  const items = [];

  for (const line of requestLines) {
    const productId = line.produit_id ?? line.produitId;
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
      produit_id: formatId(product.id ?? productId),
      quantite: quantity,
      prix: unitPrice
    });

    items.push({
      produitId: product.id ?? productId,
      nom: product.nom || null,
      prixUnitaire: unitPrice,
      quantite: quantity,
      sousTotal: unitPrice * quantity
    });
  }

  const total = bodyTotal ?? lines.reduce((sum, line) => sum + line.prix * line.quantite, 0);
  const orderId = nextNumericId(await orders.all());
  const date = body.date || formatDate();

  return orders.create({
    id: orderId,
    client_id: formatId(client.id ?? clientId),
    date,
    total,
    statut: body.statut || 'validée',
    lignes: lines,
    client: {
      id: client.id ?? clientId,
      nom: client.nom || null,
      telephone: client.telephone || null
    },
    items,
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
    id: formatId(order.id),
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
  return formatId(order.client_id ?? order.client?.id);
}

function getOrderLines(order) {
  if (Array.isArray(order.lignes)) {
    return order.lignes.map((line) => ({
      produit_id: formatId(line.produit_id ?? line.produitId),
      quantite: line.quantite,
      prix: line.prix
    }));
  }

  return (order.items || []).map((item) => ({
    produit_id: formatId(item.produit_id ?? item.produitId),
    quantite: item.quantite,
    prix: item.prix ?? item.prixUnitaire
  }));
}
