import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { asyncRoute, createServiceApp, httpError, listen, registerCommonHandlers, requireFields } from '../../shared/express.js';
import { createId, JsonStore } from '../../shared/store.js';

const serviceName = 'stock-service';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stocks = new JsonStore(path.join(__dirname, 'data', 'stocks.json'), [
  {
    id: 'stk_demo',
    produitId: 'prd_demo',
    entrepot: 'Entrepot principal',
    quantite: 100,
    createdAt: new Date().toISOString()
  }
]);
const movements = new JsonStore(path.join(__dirname, 'data', 'movements.json'), []);

const app = createServiceApp(serviceName);

app.get('/stocks', asyncRoute(async (req, res) => {
  res.json(await stocks.all());
}));

app.get('/stocks/:produitId', asyncRoute(async (req, res) => {
  const stock = await findStock(req.params.produitId);
  if (!stock) {
    throw httpError(404, 'Stock introuvable pour ce produit');
  }

  res.json(stock);
}));

app.get('/mouvements', asyncRoute(async (req, res) => {
  res.json(await movements.all());
}));

app.post('/stocks/entrees', asyncRoute(async (req, res) => {
  requireFields(req.body, ['produitId', 'quantite']);

  const quantity = Number(req.body.quantite);
  if (quantity <= 0) {
    throw httpError(400, 'La quantité doit être positive');
  }

  const stock = await increaseStock(req.body.produitId, quantity, req.body.entrepot || 'Entrepot principal');
  await movements.create(createMovement('ENTREE', req.body.produitId, quantity, req.body.reference));

  res.status(201).json(stock);
}));

app.post('/stocks/sorties', asyncRoute(async (req, res) => {
  requireFields(req.body, ['produitId', 'quantite']);

  const quantity = Number(req.body.quantite);
  const stock = await decreaseStock(req.body.produitId, quantity);
  await movements.create(createMovement('SORTIE', req.body.produitId, quantity, req.body.reference));

  res.json(stock);
}));

app.post('/stocks/reserver', asyncRoute(async (req, res) => {
  requireFields(req.body, ['items']);

  if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
    throw httpError(400, 'La commande doit contenir au moins un produit');
  }

  for (const item of req.body.items) {
    const stock = await findStock(item.produitId);
    const quantity = Number(item.quantite);

    if (!stock || stock.quantite < quantity) {
      throw httpError(409, `Stock insuffisant pour le produit ${item.produitId}`);
    }
  }

  const updatedStocks = [];
  for (const item of req.body.items) {
    const quantity = Number(item.quantite);
    updatedStocks.push(await decreaseStock(item.produitId, quantity));
    await movements.create(createMovement('RESERVATION', item.produitId, quantity, req.body.reference));
  }

  res.json({ message: 'Stock réservé', stocks: updatedStocks });
}));

async function findStock(produitId) {
  const data = await stocks.all();
  return data.find((stock) => stock.produitId === produitId);
}

async function increaseStock(produitId, quantity, entrepot) {
  const data = await stocks.all();
  const index = data.findIndex((stock) => stock.produitId === produitId);

  if (index === -1) {
    const stock = {
      id: createId('stk'),
      produitId,
      entrepot,
      quantite: quantity,
      createdAt: new Date().toISOString()
    };
    data.push(stock);
    await stocks.write(data);
    return stock;
  }

  data[index] = {
    ...data[index],
    quantite: data[index].quantite + quantity,
    updatedAt: new Date().toISOString()
  };
  await stocks.write(data);
  return data[index];
}

async function decreaseStock(produitId, quantity) {
  if (quantity <= 0) {
    throw httpError(400, 'La quantité doit être positive');
  }

  const data = await stocks.all();
  const index = data.findIndex((stock) => stock.produitId === produitId);

  if (index === -1 || data[index].quantite < quantity) {
    throw httpError(409, `Stock insuffisant pour le produit ${produitId}`);
  }

  data[index] = {
    ...data[index],
    quantite: data[index].quantite - quantity,
    updatedAt: new Date().toISOString()
  };
  await stocks.write(data);
  return data[index];
}

function createMovement(type, produitId, quantite, reference) {
  return {
    id: createId('mvt'),
    type,
    produitId,
    quantite,
    reference: reference || null,
    createdAt: new Date().toISOString()
  };
}

registerCommonHandlers(app, serviceName);
listen(app, serviceName, 3004);
