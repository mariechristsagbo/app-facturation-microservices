import { z } from 'zod';

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
  const result = schemaForService(service, options).safeParse(values || {});
  if (!result.success) {
    throw new ValidationError(result.error.issues.map((issue) => issue.message));
  }

  return result.data;
}

export function schemaForService(service, options = {}) {
  const shape = Object.fromEntries(
    service.fields.map((field) => [field.name, schemaForField(field, options)])
  );

  return z.object(shape).transform((values) => buildPayload(service, values, options));
}

export class ValidationError extends Error {
  constructor(errors) {
    super(errors.join('. '));
    this.name = 'ValidationError';
    this.errors = errors;
    this.payload = { ok: false, error: this.message, errors };
  }
}

function schemaForField(field, options) {
  return z.any()
    .optional()
    .superRefine((value, context) => {
      if (isEmpty(value)) {
        if (!options.partial && field.required) {
          context.addIssue({ code: z.ZodIssueCode.custom, message: `${field.label} est obligatoire` });
        }
        return;
      }

      if (field.type === 'number' && !Number.isFinite(Number(value))) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: `${field.label} doit être un nombre valide` });
        return;
      }

      if (field.type === 'date' && !isValidDateInput(value)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: `${field.label} doit être une date valide` });
      }
    })
    .transform((value) => normalizeFieldValue(field, value));
}

function normalizeFieldValue(field, value) {
  if (isEmpty(value)) {
    return undefined;
  }

  if (field.type === 'number') {
    return Number(value);
  }

  return value;
}

function buildPayload(service, values, options) {
  if (service.key === 'commande') {
    const payload = removeEmptyValues({
      client_id: values.client_id,
      date: values.date
    });
    const line = removeEmptyValues({
      produit_id: values.produit_id,
      quantite: values.quantite
    });

    if (!options.partial || Object.keys(line).length > 0) {
      payload.lignes = [line];
    }

    return payload;
  }

  return removeEmptyValues(values);
}

function removeEmptyValues(values) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined)
  );
}

function isEmpty(value) {
  return value === '' || value === null || value === undefined;
}

function isValidDateInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
