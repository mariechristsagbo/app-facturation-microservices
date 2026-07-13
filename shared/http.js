import { getRequestId } from './request-context.js';

export async function getJson(url, message = 'Appel HTTP impossible') {
  return requestJson(url, { method: 'GET' }, message, {
    retries: readPositiveIntegerEnv('HTTP_RETRY_COUNT', 2)
  });
}

export async function sendJson(url, method, body, message = 'Appel HTTP impossible') {
  return requestJson(
    url,
    {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    },
    message,
    { retries: 0 }
  );
}

export async function requestJson(url, options, message, policy = {}) {
  const retries = Math.max(0, policy.retries ?? 0);
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await requestOnce(url, options, message, policy.timeoutMs);
    } catch (error) {
      lastError = error;
      if (!error.status && error.retryable === undefined) {
        error.retryable = true;
      }
      if (!error.retryable || attempt === retries) {
        throw normalizeError(error, message);
      }

      await wait((policy.retryDelayMs ?? 100) * (attempt + 1));
    }
  }

  throw normalizeError(lastError, message);
}

async function requestOnce(url, options, message, timeoutOverride) {
  const timeoutMs = timeoutOverride ?? readPositiveIntegerEnv('HTTP_TIMEOUT_MS', 3_000);
  const requestId = getRequestId();
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
  const response = await fetch(url, {
    ...options,
    signal,
    headers: {
      ...options.headers,
      ...(requestId ? { 'X-Request-Id': requestId } : {})
    }
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(payload?.message || `${message} (${response.status})`);
    error.status = response.status >= 500 ? 502 : response.status;
    error.retryable = response.status === 429 || response.status >= 500;
    throw error;
  }

  return payload;
}

function normalizeError(error, message) {
  if (error.status) {
    return error;
  }

  const wrapped = new Error(`${message}: ${error.message}`);
  wrapped.status = 502;
  return wrapped;
}

function readPositiveIntegerEnv(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
