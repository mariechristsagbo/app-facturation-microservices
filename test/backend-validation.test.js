import assert from 'node:assert/strict';
import test from 'node:test';
import { errorResponseBody, httpError } from '../shared/express.js';
import {
  readOptionalDate,
  readOptionalEnum,
  readOptionalNumber,
  readRequiredNumber,
  readRequiredString
} from '../shared/validation.js';

test('backend validation parses valid values', () => {
  assert.equal(readRequiredString({ nom: '  Sarr  ' }, 'nom', 'Nom'), 'Sarr');
  assert.equal(readRequiredNumber({ prix: '8000' }, 'prix', 'Prix', { min: 0 }), 8000);
  assert.equal(readOptionalDate({ date: '2026-05-20' }, 'date', null, 'Date'), '2026-05-20');
  assert.equal(readOptionalEnum({ statut: 'payée' }, 'statut', ['payée'], null, 'Statut'), 'payée');
});

test('backend validation rejects invalid values with 400 errors', () => {
  assert.equal(
    getStatus(() => readRequiredString({ nom: '' }, 'nom', 'Nom')),
    400
  );
  assert.equal(
    getStatus(() => readOptionalNumber({ prix: 'abc' }, 'prix', null, 'Prix')),
    400
  );
  assert.equal(
    getStatus(() => readOptionalDate({ date: '2026-99-99' }, 'date', null, 'Date')),
    400
  );
  assert.equal(
    getStatus(() => readOptionalEnum({ statut: 'x' }, 'statut', ['payée'], null, 'Statut')),
    400
  );
});

test('common error response masks unexpected 500 messages', () => {
  assert.deepEqual(errorResponseBody('test-service', new Error('secret implementation detail')), {
    service: 'test-service',
    message: 'Erreur interne du service'
  });

  assert.deepEqual(errorResponseBody('test-service', httpError(400, 'Payload invalide')), {
    service: 'test-service',
    message: 'Payload invalide'
  });
});

function getStatus(task) {
  try {
    task();
    return null;
  } catch (error) {
    return error.status;
  }
}
