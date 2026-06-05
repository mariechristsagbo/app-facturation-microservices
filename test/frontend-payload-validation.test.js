import assert from 'node:assert/strict';
import test from 'node:test';
import { SERVICES } from '../apps/frontend/src/services.js';
import { toPayload, ValidationError } from '../apps/frontend/src/features/modules/module-payload.js';

const servicesByKey = Object.fromEntries(SERVICES.map((service) => [service.key, service]));

test('frontend payload validation rejects missing required fields on create', () => {
  assert.throws(
    () => toPayload(servicesByKey.client, { nom: '', prenom: 'Cheikh', telephone: '774567890' }),
    (error) => error instanceof ValidationError && error.errors.includes('Nom est obligatoire')
  );
});

test('frontend payload validation rejects invalid numbers', () => {
  assert.throws(
    () => toPayload(servicesByKey.produit, { nom: 'Souris', prix: 'abc' }),
    (error) => error instanceof ValidationError && error.errors.includes('Prix doit être un nombre valide')
  );
});

test('frontend payload validation rejects invalid dates', () => {
  assert.throws(
    () => toPayload(servicesByKey.facture, { commande_id: 1, date_emission: '2026-99-99' }),
    (error) => error instanceof ValidationError && error.errors.includes('Date émission doit être une date valide')
  );
});

test('frontend payload validation keeps existing API shapes', () => {
  assert.deepEqual(
    toPayload(servicesByKey.commande, { client_id: '4', date: '2026-05-20', produit_id: '3', quantite: '2' }),
    { client_id: 4, date: '2026-05-20', lignes: [{ produit_id: 3, quantite: 2 }] }
  );
});
