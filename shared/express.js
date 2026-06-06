import express from 'express';
import helmet from 'helmet';

export function createServiceApp(serviceName) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
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
    if (status >= 500) {
      console.error(`[${serviceName}]`, error);
    }

    res.status(status).json(errorResponseBody(serviceName, error));
  });
}

export function errorResponseBody(serviceName, error) {
  const status = error.status || 500;

  return {
    service: serviceName,
    message: status >= 500 ? 'Erreur interne du service' : error.message
  };
}

export function listen(app, serviceName, defaultPort) {
  const port = Number(process.env.PORT || defaultPort);

  app.listen(port, () => {
    console.log(`[${serviceName}] http://localhost:${port}`);
  });
}
