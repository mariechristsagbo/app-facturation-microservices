import assert from 'node:assert/strict';
import test from 'node:test';
import { getRequestId, requestContextMiddleware } from '../shared/request-context.js';

test('request context preserves a valid request id', () => {
  let responseRequestId;
  requestContextMiddleware(
    { get: () => 'request-1234' },
    {
      set: (name, value) => {
        responseRequestId = [name, value];
      }
    },
    () => assert.equal(getRequestId(), 'request-1234')
  );

  assert.deepEqual(responseRequestId, ['X-Request-Id', 'request-1234']);
});

test('request context replaces invalid request ids', () => {
  let generatedRequestId;
  requestContextMiddleware(
    { get: () => 'x' },
    {
      set: (name, value) => {
        generatedRequestId = value;
      }
    },
    () => assert.match(getRequestId(), /^[0-9a-f-]{36}$/)
  );

  assert.match(generatedRequestId, /^[0-9a-f-]{36}$/);
});
