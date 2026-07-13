import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { identityFromAuthHeaders } from './auth-headers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 5173);
const trustProxyAuthHeaders = process.env.TRUST_PROXY_AUTH_HEADERS === 'true';

app.disable('x-powered-by');
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'data:'],
        formAction: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"]
      }
    }
  })
);

app.get('/api/me', (req, res) => {
  res.json(identityFromAuthHeaders(req, { trustProxyAuthHeaders }));
});

app.get('/health', (req, res) => {
  res.json({ service: 'frontend', status: 'ok' });
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
