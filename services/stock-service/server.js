import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatId, nextNumericId } from '../../shared/api-format.js';
import { asyncRoute, createServiceApp, httpError, listen, registerCommonHandlers, requireFields } from '../../shared/express.js';
import { JsonStore } from '../../shared/store.js';

const serviceName = 'stock-service';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stocks = new JsonStore(path.join(__dirname, 'data', 'stocks.json'), [
  {
    id: 1,
    produit_id: 1,
    entrepot: 'Entrepôt principal',
    quantite: 10,
    createdAt: '2026-05-10T00:00:00.000Z'
  },
  {
    id: 2,
    produit_id: 2,
    entrepot: 'Entrepôt principal',
    quantite: 5,
    createdAt: '2026-05-12T00:00:00.000Z'
  },
  {
    id: 3,
    produit_id: 3,
    entrepot: 'Entrepôt secondaire',
    quantite: 100,
    createdAt: '2026-05-15T00:00:00.000Z'
  }
]);

const app = createServiceApp(serviceName);

app.post('/create', asyncRoute(async (req, res) => {
  requireFields(req.body, ['produit_id', 'quantite']);

  const stock = await stocks.create({
    id: nextNumericId(await stocks.all()),
    produit_id: formatId(req.body.produit_id),
    entrepot: req.body.entrepot || 'Entrepôt principal',
    quantite: Number(req.body.quantite),
    createdAt: new Date().toISOString()
  });

  res.status(201).json({
    service: 'stock',
    endpoint: '/create',
    status: 'success',
    message: 'Stock créé avec succès',
    data: formatStock(stock)
  });
}));

app.get('/list', asyncRoute(async (req, res) => {
  const data = await stocks.all();

  res.json({
    service: 'stock',
    endpoint: '/list',
    count: data.length,
    data: data.map(formatStock)
  });
}));

app.get('/view/:id', asyncRoute(async (req, res) => {
  const stock = await stocks.findById(req.params.id);
  if (!stock) {
    throw httpError(404, 'Stock introuvable');
  }

  res.json({
    service: 'stock',
    endpoint: `/view/${req.params.id}`,
    data: formatStock(stock)
  });
}));

app.patch('/edit/:id', asyncRoute(async (req, res) => {
  const stock = await stocks.findById(req.params.id);
  if (!stock) {
    throw httpError(404, 'Stock introuvable');
  }

  const updatedStock = await stocks.update(req.params.id, {
    produit_id: req.body.produit_id ?? stock.produit_id,
    entrepot: req.body.entrepot ?? stock.entrepot,
    quantite: req.body.quantite === undefined ? stock.quantite : Number(req.body.quantite)
  });

  res.json({
    service: 'stock',
    endpoint: `/edit/${req.params.id}`,
    status: 'success',
    message: 'Stock modifié avec succès',
    data: formatStock(updatedStock)
  });
}));

app.delete('/delete/:id', asyncRoute(async (req, res) => {
  const stock = await stocks.findById(req.params.id);
  if (!stock) {
    throw httpError(404, 'Stock introuvable');
  }

  await stocks.remove(req.params.id);

  res.json({
    service: 'stock',
    endpoint: `/delete/${req.params.id}`,
    status: 'success',
    message: 'Stock supprimé avec succès',
    data: formatStock(stock)
  });
}));

registerCommonHandlers(app, serviceName);
listen(app, serviceName, 3004);

function formatStock(stock) {
  return {
    id: formatId(stock.id),
    produit_id: formatId(stock.produit_id),
    entrepot: stock.entrepot,
    quantite: stock.quantite
  };
}
