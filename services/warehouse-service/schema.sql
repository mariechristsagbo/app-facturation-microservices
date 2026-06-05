CREATE TABLE IF NOT EXISTS warehouses (
  id INTEGER PRIMARY KEY,
  nom TEXT NOT NULL,
  ville TEXT NOT NULL,
  adresse TEXT,
  capacite REAL,
  createdAt TEXT NOT NULL
);
