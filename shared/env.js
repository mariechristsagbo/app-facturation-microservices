export function requireEnv(name) {
  const value = process.env[name];

  if (value === undefined || value.trim() === '') {
    throw new Error(`Variable d'environnement obligatoire manquante: ${name}`);
  }

  return value.trim();
}
