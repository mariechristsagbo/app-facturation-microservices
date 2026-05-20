import express from 'express';

export function createServiceApp(serviceName) {
  const app = express();

  app.use(express.json());
  app.get('/health', (req, res) => {
    res.json({ service: serviceName, status: 'ok' });
  });

  return app;
}

export function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function requireFields(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');

  if (missing.length > 0) {
    throw httpError(400, `Champs obligatoires: ${missing.join(', ')}`);
  }
}

export function registerCommonHandlers(app, serviceName) {
  app.use((req, res) => {
    res.status(404).json({ service: serviceName, message: 'Route introuvable' });
  });

  app.use((error, req, res, next) => {
    const status = error.status || 500;
    res.status(status).json({ service: serviceName, message: error.message });
  });
}

export function listen(app, serviceName, defaultPort) {
  const port = Number(process.env.PORT || defaultPort);

  app.listen(port, () => {
    console.log(`[${serviceName}] http://localhost:${port}`);
  });
}
