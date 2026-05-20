import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { asyncRoute, createServiceApp, httpError, listen, registerCommonHandlers, requireFields } from '../../shared/express.js';
import { createId, JsonStore } from '../../shared/store.js';

const serviceName = 'client-service';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clients = new JsonStore(path.join(__dirname, 'data', 'clients.json'), [
  {
    id: 'cli_demo',
    nom: 'Client Demo',
    telephone: '+229 0100000000',
    email: 'client@demo.test',
    adresse: 'Cotonou',
    createdAt: new Date().toISOString()
  }
]);

const app = createServiceApp(serviceName);

app.get('/clients', asyncRoute(async (req, res) => {
  res.json(await clients.all());
}));

app.get('/clients/:id', asyncRoute(async (req, res) => {
  const client = await clients.findById(req.params.id);
  if (!client) {
    throw httpError(404, 'Client introuvable');
  }

  res.json(client);
}));

app.post('/clients', asyncRoute(async (req, res) => {
  requireFields(req.body, ['nom', 'telephone']);

  const client = await clients.create({
    id: createId('cli'),
    nom: req.body.nom,
    telephone: req.body.telephone,
    email: req.body.email || null,
    adresse: req.body.adresse || null,
    createdAt: new Date().toISOString()
  });

  res.status(201).json(client);
}));

app.patch('/clients/:id', asyncRoute(async (req, res) => {
  const client = await clients.update(req.params.id, req.body);
  if (!client) {
    throw httpError(404, 'Client introuvable');
  }

  res.json(client);
}));

app.delete('/clients/:id', asyncRoute(async (req, res) => {
  const deleted = await clients.remove(req.params.id);
  if (!deleted) {
    throw httpError(404, 'Client introuvable');
  }

  res.status(204).send();
}));

registerCommonHandlers(app, serviceName);
listen(app, serviceName, 3002);
