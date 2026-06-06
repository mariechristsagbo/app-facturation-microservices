import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { asyncRoute, createServiceApp, httpError, listen, registerCommonHandlers } from '../../shared/express.js';
import { readSqliteSchema, SqliteStore, sqliteFilePath } from '../../shared/sqlite.js';
import { readOptionalString, readRequiredString } from '../../shared/validation.js';

const serviceName = 'client-service';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clients = new SqliteStore(sqliteFilePath(__dirname, 'clients.sqlite'), {
  tableName: 'clients',
  columns: ['id', 'nom', 'prenom', 'telephone', 'email', 'adresse', 'createdAt'],
  schema: readSqliteSchema(__dirname)
});

const app = createServiceApp(serviceName);

app.post('/create', asyncRoute(async (req, res) => {
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
    nom: readOptionalString(req.body, 'nom', result.client.nom, 'Nom'),
    prenom: readOptionalString(req.body, 'prenom', result.client.prenom ?? null, 'Prénom'),
    telephone: readOptionalString(req.body, 'telephone', result.client.telephone, 'Téléphone'),
    email: readOptionalString(req.body, 'email', result.client.email ?? null, 'Email'),
    adresse: readOptionalString(req.body, 'adresse', result.client.adresse ?? null, 'Adresse')
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
  return clients.create({
    id: await clients.nextNumericId(),
    nom: readRequiredString(body, 'nom', 'Nom'),
    prenom: readRequiredString(body, 'prenom', 'Prénom'),
    telephone: readRequiredString(body, 'telephone', 'Téléphone'),
    email: readOptionalString(body, 'email', null, 'Email'),
    adresse: readOptionalString(body, 'adresse', null, 'Adresse'),
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
  return Number.isInteger(record.id) ? record.id : index + 1;
}
