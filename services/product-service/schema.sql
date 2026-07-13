CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  nom TEXT NOT NULL,
  reference TEXT NOT NULL,
  categorie TEXT,
  prix REAL NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_reference ON products(reference);
