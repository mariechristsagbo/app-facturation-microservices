CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY,
  facture_id INTEGER NOT NULL,
  montant REAL NOT NULL,
  mode TEXT NOT NULL,
  date TEXT NOT NULL,
  caisse_id INTEGER,
  reference TEXT,
  createdAt TEXT NOT NULL
);
