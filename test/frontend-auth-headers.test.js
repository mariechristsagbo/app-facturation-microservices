import assert from 'node:assert/strict';
import test from 'node:test';
import { identityFromAuthHeaders } from '../apps/frontend/auth-headers.js';

test('frontend auth headers are ignored unless explicitly trusted', () => {
  const req = mockRequest({
    'Remote-User': 'admin',
    'Remote-Email': 'admin@facturation.test',
    'Remote-Groups': 'admin, facturation',
    'Remote-Name': 'Administrator'
  });

  assert.deepEqual(identityFromAuthHeaders(req), { authenticated: false, user: null });
});

test('frontend auth headers build the session when proxy auth is trusted', () => {
  const req = mockRequest({
    'Remote-User': 'admin',
    'Remote-Email': 'admin@facturation.test',
    'Remote-Groups': 'admin, facturation',
    'Remote-Name': 'Administrator'
  });

  assert.deepEqual(identityFromAuthHeaders(req, { trustProxyAuthHeaders: true }), {
    authenticated: true,
    user: {
      username: 'admin',
      groups: ['admin', 'facturation'],
      email: 'admin@facturation.test',
      name: 'Administrator'
    }
  });
});

function mockRequest(headers) {
  return {
    get(name) {
      return headers[name] ?? null;
    }
  };
}
