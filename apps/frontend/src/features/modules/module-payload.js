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

  for (const field of service.fields) {
    const value = values[field.name];
    if (value === '' || value === null || value === undefined) {
      if (!options.partial && field.required) {
        payload[field.name] = value;
      }
      continue;
    }

    payload[field.name] = field.type === 'number' ? Number(value) : value;
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
