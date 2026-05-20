export function formatDate(value = new Date()) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

export function formatId(value) {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && String(numberValue) === String(value) ? numberValue : value;
}

export function nextNumericId(records) {
  const numericIds = records
    .map((record) => Number(record.id))
    .filter((id) => Number.isInteger(id) && id > 0);

  if (numericIds.length > 0) {
    return Math.max(...numericIds) + 1;
  }

  return records.length + 1;
}
