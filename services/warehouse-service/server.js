import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatId, nextNumericId } from '../../shared/api-format.js';
import { asyncRoute, createServiceApp, httpError, listen, registerCommonHandlers, requireFields } from '../../shared/express.js';
import { JsonStore } from '../../shared/store.js';

const serviceName = 'warehouse-service';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const warehouses = new JsonStore(path.join(__dirname, 'data', 'warehouses.json'), [
  {
    id: 1,
    nom: 'Entrepôt Dakar',
    ville: 'Dakar',
    adresse: 'Zone industrielle, Dakar',
    capacite: 5000,
    createdAt: '2026-05-10T00:00:00.000Z'
  },
  {
    id: 2,
    nom: 'Entrepôt Thiès',
    ville: 'Thiès',
    adresse: 'Zone industrielle, Thiès',
    capacite: 3000,
    createdAt: '2026-05-12T00:00:00.000Z'
  },
  {
    id: 3,
    nom: 'Entrepôt Saint-Louis',
    ville: 'Saint-Louis',
    adresse: 'Route nationale, Saint-Louis',
    capacite: 2000,
    createdAt: '2026-05-15T00:00:00.000Z'
  }
]);

const app = createServiceApp(serviceName);

app.post('/create', asyncRoute(async (req, res) => {
  requireFields(req.body, ['nom', 'ville']);

  const warehouse = await warehouses.create({
    id: nextNumericId(await warehouses.all()),
    nom: req.body.nom,
    ville: req.body.ville,
    adresse: req.body.adresse || null,
    capacite: req.body.capacite === undefined ? null : Number(req.body.capacite),
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
    nom: req.body.nom ?? warehouse.nom,
    ville: req.body.ville ?? warehouse.ville,
    adresse: req.body.adresse ?? warehouse.adresse ?? null,
    capacite: req.body.capacite === undefined ? warehouse.capacite ?? null : Number(req.body.capacite)
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
    id: formatId(warehouse.id),
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
