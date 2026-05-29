import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export class JsonStore {
  constructor(filePath, initialData = []) {
    this.filePath = filePath;
    this.initialData = initialData;
  }

  async read() {
    try {
      const content = await readFile(this.filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }

      const data = structuredClone(this.initialData);
      await this.write(data);
      return data;
    }
  }

  async write(data) {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(data, null, 2));
  }

  async all() {
    return this.read();
  }

  async findById(id) {
    const data = await this.read();
    return data.find((item) => String(item.id) === String(id));
  }

  async create(record) {
    const data = await this.read();
    data.push(record);
    await this.write(data);
    return record;
  }

  async update(id, patch) {
    const data = await this.read();
    const index = data.findIndex((item) => String(item.id) === String(id));

    if (index === -1) {
      return null;
    }

    data[index] = { ...data[index], ...patch };
    await this.write(data);
    return data[index];
  }

  async remove(id) {
    const data = await this.read();
    const filtered = data.filter((item) => String(item.id) !== String(id));

    if (filtered.length === data.length) {
      return false;
    }

    await this.write(filtered);
    return true;
  }
}

export function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
