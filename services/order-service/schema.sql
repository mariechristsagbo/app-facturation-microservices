CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  client_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  total REAL NOT NULL,
  statut TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  produit_id INTEGER NOT NULL,
  quantite REAL NOT NULL,
  prix REAL NOT NULL,
  position INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_lines_order_id ON order_lines(order_id);
