import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { asyncRoute, createServiceApp, httpError, listen, registerCommonHandlers, requireFields } from '../../shared/express.js';
import { createId, JsonStore } from '../../shared/store.js';

const serviceName = 'auth-service';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const users = new JsonStore(path.join(__dirname, 'data', 'users.json'), [
  {
    id: 'usr_admin',
    nom: 'Marie-Christ Sagbo',
    email: 'mariechristsagbo@gmail.com',
    password: 'admin123',
    role: 'admin',
    createdAt: new Date().toISOString()
  }
]);

const app = createServiceApp(serviceName);

app.get('/utilisateurs', asyncRoute(async (req, res) => {
  const data = await users.all();
  res.json(data.map(({ password, ...user }) => user));
}));

app.post('/utilisateurs', asyncRoute(async (req, res) => {
  requireFields(req.body, ['nom', 'email', 'password']);

  const existing = (await users.all()).find((user) => user.email === req.body.email);
  if (existing) {
    throw httpError(409, 'Cet email existe déjà');
  }

  const user = await users.create({
    id: createId('usr'),
    nom: req.body.nom,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role || 'agent',
    createdAt: new Date().toISOString()
  });

  const { password, ...safeUser } = user;
  res.status(201).json(safeUser);
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
    token: `token-${user.id}`,
    utilisateur: {
      id: user.id,
      nom: user.nom,
      email: user.email,
      role: user.role
    }
  });
}));

registerCommonHandlers(app, serviceName);
listen(app, serviceName, 3001);
