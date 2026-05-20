import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { asyncRoute, createServiceApp, httpError, listen, registerCommonHandlers, requireFields } from '../../shared/express.js';
import { getJson, sendJson } from '../../shared/http.js';
import { createId, JsonStore } from '../../shared/store.js';

const serviceName = 'payment-service';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const payments = new JsonStore(path.join(__dirname, 'data', 'payments.json'), []);

const INVOICE_SERVICE_URL = process.env.INVOICE_SERVICE_URL || 'http://localhost:3006';

const app = createServiceApp(serviceName);

app.get('/paiements', asyncRoute(async (req, res) => {
  res.json(await payments.all());
}));

app.get('/paiements/facture/:factureId', asyncRoute(async (req, res) => {
  const data = await payments.all();
  res.json(data.filter((payment) => payment.factureId === req.params.factureId));
}));

app.post('/paiements', asyncRoute(async (req, res) => {
  requireFields(req.body, ['factureId', 'montant', 'mode']);

  const invoice = await getJson(
    `${INVOICE_SERVICE_URL}/factures/${req.body.factureId}`,
    'Impossible de recuperer la facture'
  );

  if (invoice.statut === 'PAYEE') {
    throw httpError(409, 'Cette facture est deja payee');
  }

  if (invoice.statut === 'ANNULEE') {
    throw httpError(409, 'Impossible de payer une facture annulee');
  }

  const amount = Number(req.body.montant);
  if (amount <= 0) {
    throw httpError(400, 'Le montant doit etre positif');
  }

  const paid = (await payments.all())
    .filter((payment) => payment.factureId === invoice.id)
    .reduce((sum, payment) => sum + payment.montant, 0);
  const remaining = invoice.total - paid;

  if (amount > remaining) {
    throw httpError(400, `Montant trop eleve. Reste a payer: ${remaining}`);
  }

  const payment = await payments.create({
    id: createId('pay'),
    factureId: invoice.id,
    numeroFacture: invoice.numero,
    montant: amount,
    mode: req.body.mode,
    reference: req.body.reference || null,
    createdAt: new Date().toISOString()
  });

  const newStatus = amount === remaining ? 'PAYEE' : 'PARTIELLEMENT_PAYEE';
  const updatedInvoice = await sendJson(
    `${INVOICE_SERVICE_URL}/factures/${invoice.id}/statut`,
    'PATCH',
    { statut: newStatus },
    'Impossible de mettre a jour la facture'
  );

  res.status(201).json({ paiement: payment, facture: updatedInvoice });
}));

registerCommonHandlers(app, serviceName);
listen(app, serviceName, 3007);
