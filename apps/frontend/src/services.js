export const SERVICE_ORDER = [
  'client',
  'produit',
  'commande',
  'facture',
  'reglement',
  'caisse',
  'entrepot'
];

export const SERVICE_LABELS = {
  client: 'Clients',
  produit: 'Produits',
  commande: 'Commandes',
  facture: 'Factures',
  reglement: 'Règlements',
  caisse: 'Caisses',
  entrepot: 'Entrepôts'
};

export const DEFAULT_PAYLOADS = {
  client: {
    nom: 'Sarr',
    prenom: 'Cheikh',
    telephone: '774567890',
    email: 'cheikh.sarr@example.com',
    adresse: 'Dakar'
  },
  produit: {
    nom: 'Souris sans fil',
    prix: 8000,
    categorie: 'Informatique',
    reference: 'PRD-004'
  },
  commande: {
    client_id: 4,
    date: '2026-05-20',
    lignes: [{ produit_id: 4, quantite: 1 }]
  },
  facture: {
    commande_id: 4,
    date_emission: '2026-05-20',
    montant: 8000
  },
  reglement: {
    facture_id: 4,
    montant: 8000,
    mode: 'espèces',
    date: '2026-05-20',
    caisse_id: 1
  },
  caisse: {
    libelle: 'Caisse agence Nord',
    devise: 'XOF',
    responsable: 'Moussa Ndiaye',
    solde: 0
  },
  entrepot: {
    nom: 'Entrepôt Kaolack',
    ville: 'Kaolack',
    adresse: 'Route nationale, Kaolack',
    capacite: 3000
  }
};

export const SERVICE_FIELDS = {
  client: [
    { name: 'nom', label: 'Nom', required: true },
    { name: 'prenom', label: 'Prénom', required: true },
    { name: 'telephone', label: 'Téléphone', required: true },
    { name: 'email', label: 'Email' },
    { name: 'adresse', label: 'Adresse' }
  ],
  produit: [
    { name: 'nom', label: 'Nom', required: true },
    { name: 'prix', label: 'Prix', type: 'number', required: true },
    { name: 'categorie', label: 'Catégorie' },
    { name: 'reference', label: 'Référence' }
  ],
  commande: [
    { name: 'client_id', label: 'Client', type: 'number', required: true },
    { name: 'date', label: 'Date', type: 'date' },
    { name: 'produit_id', label: 'Produit', type: 'number', required: true },
    { name: 'quantite', label: 'Quantité', type: 'number', required: true }
  ],
  facture: [
    { name: 'commande_id', label: 'Commande', type: 'number', required: true },
    { name: 'date_emission', label: 'Date émission', type: 'date' },
    { name: 'montant', label: 'Montant', type: 'number' }
  ],
  reglement: [
    { name: 'facture_id', label: 'Facture', type: 'number', required: true },
    { name: 'montant', label: 'Montant', type: 'number', required: true },
    { name: 'mode', label: 'Mode', required: true },
    { name: 'date', label: 'Date', type: 'date' },
    { name: 'caisse_id', label: 'Caisse', type: 'number' }
  ],
  caisse: [
    { name: 'libelle', label: 'Libellé', required: true },
    { name: 'solde', label: 'Solde', type: 'number' },
    { name: 'devise', label: 'Devise' },
    { name: 'responsable', label: 'Responsable' }
  ],
  entrepot: [
    { name: 'nom', label: 'Nom', required: true },
    { name: 'ville', label: 'Ville', required: true },
    { name: 'adresse', label: 'Adresse' },
    { name: 'capacite', label: 'Capacité', type: 'number' }
  ]
};

export const SUMMARY_FIELDS = {
  client: ['id', 'nom', 'prenom', 'telephone'],
  produit: ['id', 'nom', 'prix'],
  commande: ['id', 'client_id', 'date', 'total'],
  facture: ['id', 'commande_id', 'numero', 'montant'],
  reglement: ['id', 'facture_id', 'montant', 'mode'],
  caisse: ['id', 'libelle', 'solde'],
  entrepot: ['id', 'nom', 'ville']
};

export const SERVICES = SERVICE_ORDER.map((key) => ({
  key,
  label: SERVICE_LABELS[key],
  fields: SERVICE_FIELDS[key],
  summaryFields: SUMMARY_FIELDS[key],
  payload: DEFAULT_PAYLOADS[key]
}));
