import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const servicesDir = path.join(rootDir, 'services');

test('service data directories do not contain legacy JSON databases', () => {
  const jsonDataFiles = readdirSync(servicesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => findJsonFiles(path.join(servicesDir, entry.name, 'data')))
    .map((filePath) => path.relative(rootDir, filePath));

  assert.deepEqual(jsonDataFiles, []);
});

function findJsonFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return findJsonFiles(entryPath);
    }

    return entry.isFile() && entry.name.endsWith('.json') ? [entryPath] : [];
  });
}
