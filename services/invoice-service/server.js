import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { asyncRoute, createServiceApp, httpError, listen, registerCommonHandlers, requireFields } from '../../shared/express.js';
import { getJson } from '../../shared/http.js';
import { createId, JsonStore } from '../../shared/store.js';

const serviceName = 'invoice-service';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const invoices = new JsonStore(path.join(__dirname, 'data', 'invoices.json'), []);

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3005';

const app = createServiceApp(serviceName);

app.get('/factures', asyncRoute(async (req, res) => {
  res.json(await invoices.all());
}));

app.get('/factures/:id', asyncRoute(async (req, res) => {
  const invoice = await invoices.findById(req.params.id);
  if (!invoice) {
    throw httpError(404, 'Facture introuvable');
  }

  res.json(invoice);
}));

app.get('/factures/commande/:commandeId', asyncRoute(async (req, res) => {
  const invoice = (await invoices.all()).find((item) => item.commandeId === req.params.commandeId);
  if (!invoice) {
    throw httpError(404, 'Facture introuvable pour cette commande');
  }

  res.json(invoice);
}));

app.post('/factures', asyncRoute(async (req, res) => {
  requireFields(req.body, ['commandeId']);

  const existing = (await invoices.all()).find((invoice) => invoice.commandeId === req.body.commandeId);
  if (existing) {
    throw httpError(409, 'Cette commande a deja une facture');
  }

  const order = await getJson(
    `${ORDER_SERVICE_URL}/commandes/${req.body.commandeId}`,
    'Impossible de recuperer la commande'
  );

  const invoice = await invoices.create({
    id: createId('fac'),
    numero: `FAC-${new Date().getFullYear()}-${Date.now()}`,
    commandeId: order.id,
    client: order.client,
    lignes: order.items,
    total: order.total,
    statut: 'NON_PAYEE',
    createdAt: new Date().toISOString()
  });

  res.status(201).json(invoice);
}));

app.patch('/factures/:id/statut', asyncRoute(async (req, res) => {
  requireFields(req.body, ['statut']);

  const allowedStatuses = ['NON_PAYEE', 'PARTIELLEMENT_PAYEE', 'PAYEE', 'ANNULEE'];
  if (!allowedStatuses.includes(req.body.statut)) {
    throw httpError(400, `Statut invalide. Valeurs: ${allowedStatuses.join(', ')}`);
  }

  const invoice = await invoices.update(req.params.id, { statut: req.body.statut });
  if (!invoice) {
    throw httpError(404, 'Facture introuvable');
  }

  res.json(invoice);
}));

registerCommonHandlers(app, serviceName);
listen(app, serviceName, 3006);
