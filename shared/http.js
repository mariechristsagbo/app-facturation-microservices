export async function getJson(url, message = 'Appel HTTP impossible') {
  return requestJson(url, { method: 'GET' }, message);
}

export async function sendJson(url, method, body, message = 'Appel HTTP impossible') {
  return requestJson(
    url,
    {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    },
    message
  );
}

async function requestJson(url, options, message) {
  try {
    const response = await fetch(url, options);
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const error = new Error(payload?.message || `${message} (${response.status})`);
      error.status = response.status >= 500 ? 502 : response.status;
      throw error;
    }

    return payload;
  } catch (error) {
    if (error.status) {
      throw error;
    }

    const wrapped = new Error(`${message}: ${error.message}`);
    wrapped.status = 502;
    throw wrapped;
  }
}
