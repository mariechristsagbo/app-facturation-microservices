import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 5173);

app.get('/api/me', (req, res) => {
  const username = req.get('Remote-User') || null;

  res.json({
    authenticated: Boolean(username),
    user: username
      ? {
          username,
          groups: splitHeader(req.get('Remote-Groups')),
          email: req.get('Remote-Email') || null,
          name: req.get('Remote-Name') || username
        }
      : null
  });
});

app.use(express.static(path.join(__dirname, 'dist')));

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    return;
  }

  next();
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route introuvable' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[frontend] http://localhost:${port}`);
});

function splitHeader(value) {
  return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : [];
}
