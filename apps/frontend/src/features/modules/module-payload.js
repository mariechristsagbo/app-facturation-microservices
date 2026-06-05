export function initialFormValues(service) {
  return valuesFromRecord(service, service.payload || {});
}

export function valuesFromRecord(service, record) {
  if (service.key === 'commande') {
    return {
      client_id: record.client_id ?? '',
      date: record.date ?? '',
      produit_id: record.lignes?.[0]?.produit_id ?? '',
      quantite: record.lignes?.[0]?.quantite ?? ''
    };
  }

  return Object.fromEntries(service.fields.map((field) => [field.name, record[field.name] ?? '']));
}

export function toPayload(service, values, options = {}) {
  const payload = {};
  const errors = [];

  for (const field of service.fields) {
    const value = values[field.name];
    if (value === '' || value === null || value === undefined) {
      if (!options.partial && field.required) {
        errors.push(`${field.label} est obligatoire`);
      }
      continue;
    }

    if (field.type === 'number') {
      const numberValue = Number(value);
      if (!Number.isFinite(numberValue)) {
        errors.push(`${field.label} doit être un nombre valide`);
        continue;
      }

      payload[field.name] = numberValue;
      continue;
    }

    if (field.type === 'date' && !isValidDateInput(value)) {
      errors.push(`${field.label} doit être une date valide`);
      continue;
    }

    payload[field.name] = value;
  }

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }

  if (service.key === 'commande') {
    return {
      client_id: payload.client_id,
      date: payload.date,
      lignes: [{ produit_id: payload.produit_id, quantite: payload.quantite }]
    };
  }

  return payload;
}

export class ValidationError extends Error {
  constructor(errors) {
    super(errors.join('. '));
    this.name = 'ValidationError';
    this.errors = errors;
    this.payload = { ok: false, error: this.message, errors };
  }
}

function isValidDateInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
