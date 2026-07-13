CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY,
  commande_id INTEGER NOT NULL,
  numero TEXT NOT NULL,
  date_emission TEXT NOT NULL,
  montant REAL NOT NULL,
  statut TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_commande_id ON invoices(commande_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_numero ON invoices(numero);
