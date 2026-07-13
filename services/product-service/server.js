import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { asyncRoute, createServiceApp, httpError, listen, registerCommonHandlers } from '../../shared/express.js';
import { readSqliteSchema, SqliteStore, sqliteFilePath } from '../../shared/sqlite.js';
import {
  readOptionalNumber,
  readOptionalString,
  readRequiredNumber,
  readRequiredString
} from '../../shared/validation.js';

const serviceName = 'product-service';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const products = new SqliteStore(sqliteFilePath(__dirname, 'products.sqlite'), {
  tableName: 'products',
  columns: ['id', 'nom', 'reference', 'categorie', 'prix', 'createdAt'],
  schema: readSqliteSchema(__dirname)
});

const app = createServiceApp(serviceName);

app.post(
  '/create',
  asyncRoute(async (req, res) => {
    const product = await products.createWithGeneratedId((productId) => ({
      id: productId,
      nom: readRequiredString(req.body, 'nom', 'Nom'),
      reference: readOptionalString(req.body, 'reference', `PRD-${String(productId).padStart(3, '0')}`, 'Référence'),
      categorie: readOptionalString(req.body, 'categorie', null, 'Catégorie'),
      prix: readRequiredNumber(req.body, 'prix', 'Prix', { min: 0 }),
      createdAt: new Date().toISOString()
    }));

    res.status(201).json({
      service: 'produit',
      endpoint: '/create',
      status: 'success',
      message: 'Produit ajouté avec succès',
      data: formatProductSummary(product)
    });
  })
);

app.get(
  '/list',
  asyncRoute(async (req, res) => {
    const data = await products.all();

    res.json({
      service: 'produit',
      endpoint: '/list',
      count: data.length,
      data: data.map(formatProductSummary)
    });
  })
);

app.get(
  '/view/:id',
  asyncRoute(async (req, res) => {
    const product = await products.findById(req.params.id);
    if (!product) {
      throw httpError(404, 'Produit introuvable');
    }

    res.json({
      service: 'produit',
      endpoint: `/view/${req.params.id}`,
      data: formatProductDetails(product)
    });
  })
);

app.patch(
  '/edit/:id',
  asyncRoute(async (req, res) => {
    const product = await products.findById(req.params.id);
    if (!product) {
      throw httpError(404, 'Produit introuvable');
    }

    const updatedProduct = await products.update(req.params.id, {
      nom: readOptionalString(req.body, 'nom', product.nom, 'Nom'),
      reference: readOptionalString(req.body, 'reference', product.reference, 'Référence'),
      categorie: readOptionalString(req.body, 'categorie', product.categorie ?? null, 'Catégorie'),
      prix: readOptionalNumber(req.body, 'prix', product.prix, 'Prix', { min: 0 })
    });

    res.json({
      service: 'produit',
      endpoint: `/edit/${req.params.id}`,
      status: 'success',
      message: 'Produit modifié avec succès',
      data: formatProductDetails(updatedProduct)
    });
  })
);

app.delete(
  '/delete/:id',
  asyncRoute(async (req, res) => {
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
  })
);

registerCommonHandlers(app, serviceName);
listen(app, serviceName, 3003);

function formatProductSummary(product) {
  return {
    id: product.id,
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
