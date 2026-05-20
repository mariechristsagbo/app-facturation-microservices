import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { asyncRoute, createServiceApp, httpError, listen, registerCommonHandlers, requireFields } from '../../shared/express.js';
import { getJson, sendJson } from '../../shared/http.js';
import { createId, JsonStore } from '../../shared/store.js';

const serviceName = 'order-service';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const orders = new JsonStore(path.join(__dirname, 'data', 'orders.json'));

const CLIENT_SERVICE_URL = process.env.CLIENT_SERVICE_URL;
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL;
const STOCK_SERVICE_URL = process.env.STOCK_SERVICE_URL;

const app = createServiceApp(serviceName);

app.get('/commandes', asyncRoute(async (req, res) => {
  res.json(await orders.all());
}));

app.get('/commandes/:id', asyncRoute(async (req, res) => {
  const order = await orders.findById(req.params.id);
  if (!order) {
    throw httpError(404, 'Commande introuvable');
  }

  res.json(order);
}));

app.post('/commandes', asyncRoute(async (req, res) => {
  requireFields(req.body, ['clientId', 'items']);

  if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
    throw httpError(400, 'La commande doit contenir au moins un produit');
  }

  const client = await getJson(
    `${CLIENT_SERVICE_URL}/clients/${req.body.clientId}`,
    'Impossible de vérifier le client'
  );
  
  const items = [];
  for (const item of req.body.items) {
    if (!item.produitId || !item.quantite) {
      throw httpError(400, 'Chaque ligne doit contenir produitId et quantite');
    }

    const product = await getJson(
      `${PRODUCT_SERVICE_URL}/produits/${item.produitId}`,
      'Impossible de vérifier le produit'
    );
    const quantity = Number(item.quantite);

    if (quantity <= 0) {
      throw httpError(400, 'La quantité doit être positive');
    }

    items.push({
      produitId: product.id,
      nom: product.nom,
      prixUnitaire: product.prix,
      quantite: quantity,
      sousTotal: product.prix * quantity
    });
  }

  const orderId = createId('cmd');
  await sendJson(
    `${STOCK_SERVICE_URL}/stocks/reserver`,
    'POST',
    {
      reference: orderId,
      items: items.map((item) => ({ produitId: item.produitId, quantite: item.quantite }))
    },
    'Impossible de réserver le stock'
  );

  const order = await orders.create({
    id: orderId,
    client: {
      id: client.id,
      nom: client.nom,
      telephone: client.telephone
    },
    items,
    total: items.reduce((sum, item) => sum + item.sousTotal, 0),
    statut: 'CONFIRMEE',
    createdAt: new Date().toISOString()
  });

  res.status(201).json(order);
}));

app.patch('/commandes/:id/statut', asyncRoute(async (req, res) => {
  requireFields(req.body, ['statut']);

  const order = await orders.update(req.params.id, { statut: req.body.statut });
  if (!order) {
    throw httpError(404, 'Commande introuvable');
  }

  res.json(order);
}));

registerCommonHandlers(app, serviceName);
listen(app, serviceName, 3005);
