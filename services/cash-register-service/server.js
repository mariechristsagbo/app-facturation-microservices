import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { asyncRoute, createServiceApp, httpError, listen, registerCommonHandlers, requireFields } from '../../shared/express.js';
import { SqliteStore, sqliteFilePath } from '../../shared/sqlite.js';

const serviceName = 'cash-register-service';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cashRegisters = new SqliteStore(sqliteFilePath(__dirname, 'cash-registers.sqlite'), {
  tableName: 'cash_registers',
  columns: ['id', 'libelle', 'solde', 'devise', 'responsable', 'createdAt']
});

const app = createServiceApp(serviceName);

app.post('/create', asyncRoute(async (req, res) => {
  requireFields(req.body, ['libelle']);

  const cashRegister = await cashRegisters.create({
    id: await cashRegisters.nextNumericId(),
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
    id: cashRegister.id,
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
