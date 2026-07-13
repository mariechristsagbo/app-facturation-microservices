export function identityFromAuthHeaders(req, options = {}) {
  if (!options.trustProxyAuthHeaders) {
    return { authenticated: false, user: null };
  }

  const username = req.get('Remote-User') || null;
  return {
    authenticated: Boolean(username),
    user: username
      ? {
          username,
          groups: splitHeader(req.get('Remote-Groups')),
          email: req.get('Remote-Email') || null,
          name: req.get('Remote-Name') || username
        }
      : null
  };
}

function splitHeader(value) {
  return value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}
