CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY,
  nom TEXT NOT NULL,
  prenom TEXT,
  telephone TEXT NOT NULL,
  email TEXT,
  adresse TEXT,
  createdAt TEXT NOT NULL
);
