import { httpError } from './express.js';

export function readRequiredString(body, field, label = field) {
  const value = body?.[field];
  if (isBlank(value)) {
    throw httpError(400, `${label} est obligatoire`);
  }

  if (typeof value !== 'string') {
    throw httpError(400, `${label} doit être du texte`);
  }

  return value.trim();
}

export function readOptionalString(body, field, fallback = null, label = field) {
  const value = body?.[field];
  if (isBlank(value)) {
    return fallback;
  }

  if (typeof value !== 'string') {
    throw httpError(400, `${label} doit être du texte`);
  }

  return value.trim();
}

export function readRequiredNumber(body, field, label = field, options = {}) {
  const value = body?.[field];
  if (isBlank(value)) {
    throw httpError(400, `${label} est obligatoire`);
  }

  return parseNumber(value, label, options);
}

export function readOptionalNumber(body, field, fallback = null, label = field, options = {}) {
  const value = body?.[field];
  if (isBlank(value)) {
    return fallback;
  }

  return parseNumber(value, label, options);
}

export function readRequiredPositiveInteger(body, field, label = field) {
  return readRequiredNumber(body, field, label, { integer: true, min: 1 });
}

export function readOptionalPositiveInteger(body, field, fallback = null, label = field) {
  return readOptionalNumber(body, field, fallback, label, { integer: true, min: 1 });
}

export function readOptionalDate(body, field, fallback = null, label = field) {
  const value = body?.[field];
  if (isBlank(value)) {
    return fallback;
  }

  if (typeof value !== 'string' || !isValidDateInput(value)) {
    throw httpError(400, `${label} doit être une date valide`);
  }

  return value;
}

export function readOptionalEnum(body, field, allowedValues, fallback = null, label = field) {
  const value = body?.[field];
  if (isBlank(value)) {
    return fallback;
  }

  if (!allowedValues.includes(value)) {
    throw httpError(400, `${label} invalide. Valeurs: ${allowedValues.join(', ')}`);
  }

  return value;
}

function parseNumber(value, label, options) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    throw httpError(400, `${label} doit être un nombre valide`);
  }

  if (options.integer && !Number.isInteger(numberValue)) {
    throw httpError(400, `${label} doit être un entier`);
  }

  if (options.min !== undefined && numberValue < options.min) {
    throw httpError(400, `${label} doit être supérieur ou égal à ${options.min}`);
  }

  if (options.minExclusive !== undefined && numberValue <= options.minExclusive) {
    throw httpError(400, `${label} doit être supérieur à ${options.minExclusive}`);
  }

  return numberValue;
}

function isValidDateInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isBlank(value) {
  return value === undefined || value === null || value === '';
}
