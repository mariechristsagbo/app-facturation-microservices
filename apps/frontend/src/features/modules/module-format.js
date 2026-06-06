import { COLUMN_LABELS } from '@/app/module-config.js';

export function labelForField(service, field) {
  return service.fields.find((item) => item.name === field)?.label || COLUMN_LABELS[field] || field;
}

export function formatCell(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}
