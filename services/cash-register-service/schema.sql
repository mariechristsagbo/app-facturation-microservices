CREATE TABLE IF NOT EXISTS cash_registers (
  id INTEGER PRIMARY KEY,
  libelle TEXT NOT NULL,
  solde REAL NOT NULL,
  devise TEXT NOT NULL,
  responsable TEXT,
  createdAt TEXT NOT NULL
);
