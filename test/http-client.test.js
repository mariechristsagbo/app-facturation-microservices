import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { requestJson } from '../shared/http.js';

test('HTTP client retries transient GET failures', async (t) => {
  let requests = 0;
  const server = createServer((req, res) => {
    requests += 1;
    res.setHeader('Content-Type', 'application/json');
    if (requests === 1) {
      res.writeHead(503).end(JSON.stringify({ message: 'indisponible' }));
      return;
    }
    res.end(JSON.stringify({ status: 'ok' }));
  });
  const url = await listen(server);
  t.after(() => server.close());

  const result = await requestJson(url, { method: 'GET' }, 'Lecture impossible', {
    retries: 1,
    retryDelayMs: 0,
    timeoutMs: 500
  });

  assert.deepEqual(result, { status: 'ok' });
  assert.equal(requests, 2);
});

test('HTTP client aborts requests that exceed the timeout', async (t) => {
  const server = createServer(() => {});
  const url = await listen(server);
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });

  await assert.rejects(
    requestJson(url, { method: 'GET' }, 'Lecture impossible', { retries: 0, timeoutMs: 20 }),
    (error) => error.status === 502 && error.message.startsWith('Lecture impossible:')
  );
});

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}
