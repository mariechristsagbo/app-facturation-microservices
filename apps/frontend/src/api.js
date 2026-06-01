export async function requestApi(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });
  const raw = await response.text();
  const data = parseJson(raw);
  const payload = {
    ok: response.ok,
    status: response.status,
    path,
    data,
    raw: data === null ? raw : undefined
  };

  if (!response.ok) {
    const error = new Error(data?.error || data?.message || `Erreur HTTP ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function apiPath(service, action, id = null) {
  const suffix = id === null || id === undefined || id === '' ? '' : `/${encodeURIComponent(id)}`;
  return `/api/${service}/${action}${suffix}`;
}

export function formatJson(value) {
  if (value === undefined) {
    return '';
  }

  return JSON.stringify(value, null, 2);
}

function parseJson(raw) {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
