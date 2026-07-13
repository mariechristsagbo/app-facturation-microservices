import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

const storage = new AsyncLocalStorage();

export function requestContextMiddleware(req, res, next) {
  const requestId = normalizeRequestId(req.get('X-Request-Id')) || randomUUID();
  res.set('X-Request-Id', requestId);
  storage.run({ requestId }, next);
}

export function getRequestId() {
  return storage.getStore()?.requestId ?? null;
}

function normalizeRequestId(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const requestId = value.trim();
  return /^[A-Za-z0-9._:-]{8,100}$/.test(requestId) ? requestId : null;
}
