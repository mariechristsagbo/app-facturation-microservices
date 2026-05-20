import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatId, nextNumericId } from '../../shared/api-format.js';
import { asyncRoute, createServiceApp, httpError, listen, registerCommonHandlers, requireFields } from '../../shared/express.js';
import { JsonStore } from '../../shared/store.js';

const serviceName = 'client-service';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clients = new JsonStore(path.join(__dirname, 'data', 'clients.json'), [
  {
    id: 1,
    nom: 'Diop',
    prenom: 'Awa',
    telephone: '771234567',
    email: 'awa.diop@example.com',
    adresse: 'Dakar',
    createdAt: '2026-05-10T00:00:00.000Z'
  },
  {
    id: 2,
    nom: 'Ndiaye',
    prenom: 'Moussa',
    telephone: '772345678',
    email: 'moussa.ndiaye@example.com',
    adresse: 'Thiès',
    createdAt: '2026-05-12T00:00:00.000Z'
  },
  {
    id: 3,
    nom: 'Fall',
    prenom: 'Fatou',
    telephone: '773456789',
    email: 'fatou.fall@example.com',
    adresse: 'Saint-Louis',
    createdAt: '2026-05-15T00:00:00.000Z'
  }
]);

const app = createServiceApp(serviceName);

app.post('/create', asyncRoute(async (req, res) => {
  requireFields(req.body, ['nom', 'prenom', 'telephone']);

  const client = await createClient(req.body);

  res.status(201).json({
    service: 'client',
    endpoint: '/create',
    status: 'success',
    message: 'Client créé avec succès',
    data: formatClientSummary(client)
  });
}));

app.get('/list', asyncRoute(async (req, res) => {
  const data = await clients.all();

  res.json({
    service: 'client',
    endpoint: '/list',
    count: data.length,
    data: data.map(formatClientSummary)
  });
}));

app.get('/view/:id', asyncRoute(async (req, res) => {
  const result = await findClient(req.params.id);
  if (!result) {
    throw httpError(404, 'Client introuvable');
  }

  res.json({
    service: 'client',
    endpoint: `/view/${req.params.id}`,
    data: formatClientDetails(result.client, result.index)
  });
}));

app.patch('/edit/:id', asyncRoute(async (req, res) => {
  const result = await findClient(req.params.id);
  if (!result) {
    throw httpError(404, 'Client introuvable');
  }

  const client = await clients.update(result.client.id, {
    nom: req.body.nom ?? result.client.nom,
    prenom: req.body.prenom ?? result.client.prenom ?? null,
    telephone: req.body.telephone ?? result.client.telephone,
    email: req.body.email ?? result.client.email ?? null,
    adresse: req.body.adresse ?? result.client.adresse ?? null
  });

  res.json({
    service: 'client',
    endpoint: `/edit/${req.params.id}`,
    status: 'success',
    message: 'Client modifié avec succès',
    data: formatClientDetails(client, result.index)
  });
}));

app.delete('/delete/:id', asyncRoute(async (req, res) => {
  const result = await findClient(req.params.id);
  if (!result) {
    throw httpError(404, 'Client introuvable');
  }

  const deleted = await clients.remove(result.client.id);
  if (!deleted) {
    throw httpError(404, 'Client introuvable');
  }

  res.json({
    service: 'client',
    endpoint: `/delete/${req.params.id}`,
    status: 'success',
    message: 'Client supprimé avec succès',
    data: formatClientSummary(result.client, result.index)
  });
}));

registerCommonHandlers(app, serviceName);
listen(app, serviceName, 3002);

async function createClient(body) {
  const data = await clients.all();

  return clients.create({
    id: nextNumericId(data),
    nom: body.nom,
    prenom: body.prenom || null,
    telephone: body.telephone,
    email: body.email || null,
    adresse: body.adresse || null,
    createdAt: new Date().toISOString()
  });
}

async function findClient(id) {
  const data = await clients.all();
  const exactIndex = data.findIndex((client) => String(client.id) === String(id));

  if (exactIndex !== -1) {
    return { client: data[exactIndex], index: exactIndex };
  }

  const publicId = Number(id);
  if (!Number.isInteger(publicId) || publicId <= 0) {
    return null;
  }

  const publicIndex = data.findIndex((client, index) => getPublicId(client, index) === publicId);
  return publicIndex === -1 ? null : { client: data[publicIndex], index: publicIndex };
}

function formatClientSummary(client, index = 0) {
  return {
    id: getPublicId(client, index),
    nom: client.nom,
    prenom: client.prenom || null,
    telephone: client.telephone
  };
}

function formatClientDetails(client, index = 0) {
  return {
    ...formatClientSummary(client, index),
    email: client.email || null,
    adresse: client.adresse || null
  };
}

function getPublicId(record, index = 0) {
  const id = formatId(record.id);
  return typeof id === 'number' ? id : index + 1;
}
