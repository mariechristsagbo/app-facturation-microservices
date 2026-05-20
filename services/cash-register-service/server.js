import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatId, nextNumericId } from '../../shared/api-format.js';
import { asyncRoute, createServiceApp, httpError, listen, registerCommonHandlers, requireFields } from '../../shared/express.js';
import { JsonStore } from '../../shared/store.js';

const serviceName = 'cash-register-service';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cashRegisters = new JsonStore(path.join(__dirname, 'data', 'cash-registers.json'), [
  {
    id: 1,
    libelle: 'Caisse principale',
    solde: 1500000,
    devise: 'XOF',
    responsable: 'Awa Diop',
    createdAt: '2026-05-10T00:00:00.000Z'
  },
  {
    id: 2,
    libelle: 'Caisse secondaire',
    solde: 350000,
    devise: 'XOF',
    responsable: 'Moussa Ndiaye',
    createdAt: '2026-05-12T00:00:00.000Z'
  },
  {
    id: 3,
    libelle: 'Caisse mobile',
    solde: 75000,
    devise: 'XOF',
    responsable: 'Fatou Fall',
    createdAt: '2026-05-15T00:00:00.000Z'
  }
]);

const app = createServiceApp(serviceName);

app.post('/create', asyncRoute(async (req, res) => {
  requireFields(req.body, ['libelle']);

  const cashRegister = await cashRegisters.create({
    id: nextNumericId(await cashRegisters.all()),
    libelle: req.body.libelle,
    solde: req.body.solde === undefined ? 0 : Number(req.body.solde),
    devise: req.body.devise || 'XOF',
    responsable: req.body.responsable || null,
    createdAt: new Date().toISOString()
  });

  res.status(201).json({
    service: 'caisse',
    endpoint: '/create',
    status: 'success',
    message: 'Caisse créée avec succès',
    data: formatCashRegisterSummary(cashRegister)
  });
}));

app.get('/list', asyncRoute(async (req, res) => {
  const data = await cashRegisters.all();

  res.json({
    service: 'caisse',
    endpoint: '/list',
    count: data.length,
    data: data.map(formatCashRegisterSummary)
  });
}));

app.get('/view/:id', asyncRoute(async (req, res) => {
  const cashRegister = await cashRegisters.findById(req.params.id);
  if (!cashRegister) {
    throw httpError(404, 'Caisse introuvable');
  }

  res.json({
    service: 'caisse',
    endpoint: `/view/${req.params.id}`,
    data: formatCashRegisterDetails(cashRegister)
  });
}));

app.patch('/edit/:id', asyncRoute(async (req, res) => {
  const cashRegister = await cashRegisters.findById(req.params.id);
  if (!cashRegister) {
    throw httpError(404, 'Caisse introuvable');
  }

  const updatedCashRegister = await cashRegisters.update(req.params.id, {
    libelle: req.body.libelle ?? cashRegister.libelle,
    solde: req.body.solde === undefined ? cashRegister.solde : Number(req.body.solde),
    devise: req.body.devise ?? cashRegister.devise ?? 'XOF',
    responsable: req.body.responsable ?? cashRegister.responsable ?? null
  });

  res.json({
    service: 'caisse',
    endpoint: `/edit/${req.params.id}`,
    status: 'success',
    message: 'Caisse modifiée avec succès',
    data: formatCashRegisterDetails(updatedCashRegister)
  });
}));

app.delete('/delete/:id', asyncRoute(async (req, res) => {
  const cashRegister = await cashRegisters.findById(req.params.id);
  if (!cashRegister) {
    throw httpError(404, 'Caisse introuvable');
  }

  await cashRegisters.remove(req.params.id);

  res.json({
    service: 'caisse',
    endpoint: `/delete/${req.params.id}`,
    status: 'success',
    message: 'Caisse supprimée avec succès',
    data: formatCashRegisterSummary(cashRegister)
  });
}));

registerCommonHandlers(app, serviceName);
listen(app, serviceName, 3008);

function formatCashRegisterSummary(cashRegister) {
  return {
    id: formatId(cashRegister.id),
    libelle: cashRegister.libelle,
    solde: cashRegister.solde
  };
}

function formatCashRegisterDetails(cashRegister) {
  return {
    ...formatCashRegisterSummary(cashRegister),
    devise: cashRegister.devise || 'XOF',
    responsable: cashRegister.responsable || null
  };
}
