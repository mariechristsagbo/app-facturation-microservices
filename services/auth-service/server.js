import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatId, nextNumericId } from '../../shared/api-format.js';
import { asyncRoute, createServiceApp, httpError, listen, registerCommonHandlers, requireFields } from '../../shared/express.js';
import { JsonStore } from '../../shared/store.js';

const serviceName = 'auth-service';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const users = new JsonStore(path.join(__dirname, 'data', 'users.json'), [
  {
    id: 1,
    nom: 'Administrateur',
    email: 'admin@facturation.test',
    password: 'admin123',
    role: 'admin',
    createdAt: new Date().toISOString()
  }
]);

const app = createServiceApp(serviceName);

app.post('/create', asyncRoute(async (req, res) => {
  requireFields(req.body, ['nom', 'email', 'password']);

  const existing = (await users.all()).find((user) => user.email === req.body.email);
  if (existing) {
    throw httpError(409, 'Cet email existe déjà');
  }

  const user = await users.create({
    id: nextNumericId(await users.all()),
    nom: req.body.nom,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role || 'agent',
    createdAt: new Date().toISOString()
  });

  res.status(201).json({
    service: 'utilisateur',
    endpoint: '/create',
    status: 'success',
    message: 'Utilisateur créé avec succès',
    data: formatUser(user)
  });
}));

app.get('/list', asyncRoute(async (req, res) => {
  const data = await users.all();

  res.json({
    service: 'utilisateur',
    endpoint: '/list',
    count: data.length,
    data: data.map(formatUser)
  });
}));

app.get('/view/:id', asyncRoute(async (req, res) => {
  const user = await users.findById(req.params.id);
  if (!user) {
    throw httpError(404, 'Utilisateur introuvable');
  }

  res.json({
    service: 'utilisateur',
    endpoint: `/view/${req.params.id}`,
    data: formatUser(user)
  });
}));

app.patch('/edit/:id', asyncRoute(async (req, res) => {
  const user = await users.findById(req.params.id);
  if (!user) {
    throw httpError(404, 'Utilisateur introuvable');
  }

  const updatedUser = await users.update(req.params.id, {
    nom: req.body.nom ?? user.nom,
    email: req.body.email ?? user.email,
    password: req.body.password ?? user.password,
    role: req.body.role ?? user.role
  });

  res.json({
    service: 'utilisateur',
    endpoint: `/edit/${req.params.id}`,
    status: 'success',
    message: 'Utilisateur modifié avec succès',
    data: formatUser(updatedUser)
  });
}));

app.delete('/delete/:id', asyncRoute(async (req, res) => {
  const user = await users.findById(req.params.id);
  if (!user) {
    throw httpError(404, 'Utilisateur introuvable');
  }

  await users.remove(req.params.id);

  res.json({
    service: 'utilisateur',
    endpoint: `/delete/${req.params.id}`,
    status: 'success',
    message: 'Utilisateur supprimé avec succès',
    data: formatUser(user)
  });
}));

app.post('/login', asyncRoute(async (req, res) => {
  requireFields(req.body, ['email', 'password']);

  const user = (await users.all()).find(
    (item) => item.email === req.body.email && item.password === req.body.password
  );

  if (!user) {
    throw httpError(401, 'Vos identifiants sont invalides');
  }

  res.json({
    service: 'auth',
    endpoint: '/login',
    status: 'success',
    message: 'Connexion réussie',
    data: {
      token: `token-${user.id}`,
      utilisateur: formatUser(user)
    }
  });
}));

registerCommonHandlers(app, serviceName);
listen(app, serviceName, 3001);

function formatUser(user) {
  return {
    id: formatId(user.id),
    nom: user.nom,
    email: user.email,
    role: user.role
  };
}
