import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { asyncRoute, createServiceApp, httpError, listen, registerCommonHandlers } from '../../shared/express.js';
import { readSqliteSchema, SqliteStore, sqliteFilePath } from '../../shared/sqlite.js';
import { readOptionalNumber, readOptionalString, readRequiredString } from '../../shared/validation.js';

const serviceName = 'warehouse-service';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const warehouses = new SqliteStore(sqliteFilePath(__dirname, 'warehouses.sqlite'), {
  tableName: 'warehouses',
  columns: ['id', 'nom', 'ville', 'adresse', 'capacite', 'createdAt'],
  schema: readSqliteSchema(__dirname)
});

const app = createServiceApp(serviceName);

app.post('/create', asyncRoute(async (req, res) => {
  const warehouse = await warehouses.create({
    id: await warehouses.nextNumericId(),
    nom: readRequiredString(req.body, 'nom', 'Nom'),
    ville: readRequiredString(req.body, 'ville', 'Ville'),
    adresse: readOptionalString(req.body, 'adresse', null, 'Adresse'),
    capacite: readOptionalNumber(req.body, 'capacite', null, 'Capacité', { min: 0 }),
    createdAt: new Date().toISOString()
  });

  res.status(201).json({
    service: 'entrepot',
    endpoint: '/create',
    status: 'success',
    message: 'Entrepôt créé avec succès',
    data: formatWarehouseSummary(warehouse)
  });
}));

app.get('/list', asyncRoute(async (req, res) => {
  const data = await warehouses.all();

  res.json({
    service: 'entrepot',
    endpoint: '/list',
    count: data.length,
    data: data.map(formatWarehouseSummary)
  });
}));

app.get('/view/:id', asyncRoute(async (req, res) => {
  const warehouse = await warehouses.findById(req.params.id);
  if (!warehouse) {
    throw httpError(404, 'Entrepôt introuvable');
  }

  res.json({
    service: 'entrepot',
    endpoint: `/view/${req.params.id}`,
    data: formatWarehouseDetails(warehouse)
  });
}));

app.patch('/edit/:id', asyncRoute(async (req, res) => {
  const warehouse = await warehouses.findById(req.params.id);
  if (!warehouse) {
    throw httpError(404, 'Entrepôt introuvable');
  }

  const updatedWarehouse = await warehouses.update(req.params.id, {
    nom: readOptionalString(req.body, 'nom', warehouse.nom, 'Nom'),
    ville: readOptionalString(req.body, 'ville', warehouse.ville, 'Ville'),
    adresse: readOptionalString(req.body, 'adresse', warehouse.adresse ?? null, 'Adresse'),
    capacite: readOptionalNumber(req.body, 'capacite', warehouse.capacite ?? null, 'Capacité', { min: 0 })
  });

  res.json({
    service: 'entrepot',
    endpoint: `/edit/${req.params.id}`,
    status: 'success',
    message: 'Entrepôt modifié avec succès',
    data: formatWarehouseDetails(updatedWarehouse)
  });
}));

app.delete('/delete/:id', asyncRoute(async (req, res) => {
  const warehouse = await warehouses.findById(req.params.id);
  if (!warehouse) {
    throw httpError(404, 'Entrepôt introuvable');
  }

  await warehouses.remove(req.params.id);

  res.json({
    service: 'entrepot',
    endpoint: `/delete/${req.params.id}`,
    status: 'success',
    message: 'Entrepôt supprimé avec succès',
    data: formatWarehouseSummary(warehouse)
  });
}));

registerCommonHandlers(app, serviceName);
listen(app, serviceName, 3009);

function formatWarehouseSummary(warehouse) {
  return {
    id: warehouse.id,
    nom: warehouse.nom,
    ville: warehouse.ville
  };
}

function formatWarehouseDetails(warehouse) {
  return {
    ...formatWarehouseSummary(warehouse),
    adresse: warehouse.adresse || null,
    capacite: warehouse.capacite ?? null
  };
}
