import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatId, nextNumericId } from '../../shared/api-format.js';
import { asyncRoute, createServiceApp, httpError, listen, registerCommonHandlers, requireFields } from '../../shared/express.js';
import { JsonStore } from '../../shared/store.js';

const serviceName = 'product-service';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const products = new JsonStore(path.join(__dirname, 'data', 'products.json'), [
  {
    id: 1,
    nom: 'Ordinateur portable',
    reference: 'PRD-001',
    categorie: 'Informatique',
    prix: 450000,
    createdAt: '2026-05-10T00:00:00.000Z'
  },
  {
    id: 2,
    nom: 'Imprimante',
    reference: 'PRD-002',
    categorie: 'Informatique',
    prix: 120000,
    createdAt: '2026-05-12T00:00:00.000Z'
  },
  {
    id: 3,
    nom: 'Clé USB 32Go',
    reference: 'PRD-003',
    categorie: 'Informatique',
    prix: 5000,
    createdAt: '2026-05-15T00:00:00.000Z'
  }
]);

const app = createServiceApp(serviceName);

app.post('/create', asyncRoute(async (req, res) => {
  requireFields(req.body, ['nom', 'prix']);

  const productId = nextNumericId(await products.all());

  const product = await products.create({
    id: productId,
    nom: req.body.nom,
    reference: req.body.reference || `PRD-${String(productId).padStart(3, '0')}`,
    categorie: req.body.categorie || null,
    prix: Number(req.body.prix),
    createdAt: new Date().toISOString()
  });

  res.status(201).json({
    service: 'produit',
    endpoint: '/create',
    status: 'success',
    message: 'Produit ajouté avec succès',
    data: formatProductSummary(product)
  });
}));

app.get('/list', asyncRoute(async (req, res) => {
  const data = await products.all();

  res.json({
    service: 'produit',
    endpoint: '/list',
    count: data.length,
    data: data.map(formatProductSummary)
  });
}));

app.get('/view/:id', asyncRoute(async (req, res) => {
  const product = await products.findById(req.params.id);
  if (!product) {
    throw httpError(404, 'Produit introuvable');
  }

  res.json({
    service: 'produit',
    endpoint: `/view/${req.params.id}`,
    data: formatProductDetails(product)
  });
}));

app.patch('/edit/:id', asyncRoute(async (req, res) => {
  const product = await products.findById(req.params.id);
  if (!product) {
    throw httpError(404, 'Produit introuvable');
  }

  const updatedProduct = await products.update(req.params.id, {
    nom: req.body.nom ?? product.nom,
    reference: req.body.reference ?? product.reference,
    categorie: req.body.categorie ?? product.categorie ?? null,
    prix: req.body.prix === undefined ? product.prix : Number(req.body.prix)
  });

  res.json({
    service: 'produit',
    endpoint: `/edit/${req.params.id}`,
    status: 'success',
    message: 'Produit modifié avec succès',
    data: formatProductDetails(updatedProduct)
  });
}));

app.delete('/delete/:id', asyncRoute(async (req, res) => {
  const product = await products.findById(req.params.id);
  if (!product) {
    throw httpError(404, 'Produit introuvable');
  }

  await products.remove(req.params.id);

  res.json({
    service: 'produit',
    endpoint: `/delete/${req.params.id}`,
    status: 'success',
    message: 'Produit supprimé avec succès',
    data: formatProductSummary(product)
  });
}));

registerCommonHandlers(app, serviceName);
listen(app, serviceName, 3003);

function formatProductSummary(product) {
  return {
    id: formatId(product.id),
    nom: product.nom,
    prix: product.prix
  };
}

function formatProductDetails(product) {
  return {
    ...formatProductSummary(product),
    categorie: product.categorie || null,
    reference: product.reference
  };
}
