import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { asyncRoute, createServiceApp, httpError, listen, registerCommonHandlers, requireFields } from '../../shared/express.js';
import { createId, JsonStore } from '../../shared/store.js';

const serviceName = 'product-service';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const products = new JsonStore(path.join(__dirname, 'data', 'products.json'), [
  {
    id: 'prd_demo',
    nom: 'Produit Demo',
    reference: 'PRD-001',
    prix: 5000,
    createdAt: new Date().toISOString()
  }
]);

const app = createServiceApp(serviceName);

app.get('/produits', asyncRoute(async (req, res) => {
  res.json(await products.all());
}));

app.get('/produits/:id', asyncRoute(async (req, res) => {
  const product = await products.findById(req.params.id);
  if (!product) {
    throw httpError(404, 'Produit introuvable');
  }

  res.json(product);
}));

app.post('/produits', asyncRoute(async (req, res) => {
  requireFields(req.body, ['nom', 'prix']);

  const product = await products.create({
    id: createId('prd'),
    nom: req.body.nom,
    reference: req.body.reference || createId('REF'),
    prix: Number(req.body.prix),
    createdAt: new Date().toISOString()
  });

  res.status(201).json(product);
}));

app.patch('/produits/:id', asyncRoute(async (req, res) => {
  const patch = { ...req.body };
  if (patch.prix !== undefined) {
    patch.prix = Number(patch.prix);
  }

  const product = await products.update(req.params.id, patch);
  if (!product) {
    throw httpError(404, 'Produit introuvable');
  }

  res.json(product);
}));

app.delete('/produits/:id', asyncRoute(async (req, res) => {
  const deleted = await products.remove(req.params.id);
  if (!deleted) {
    throw httpError(404, 'Produit introuvable');
  }

  res.status(204).send();
}));

registerCommonHandlers(app, serviceName);
listen(app, serviceName, 3003);
