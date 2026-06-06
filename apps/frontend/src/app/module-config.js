import {
  BanknoteIcon,
  CircleDollarSignIcon,
  InvoiceIcon,
  PackageIcon,
  ShoppingCart01Icon,
  StoreManagementIcon,
  UserMultipleIcon,
  WarehouseIcon
} from '@hugeicons/core-free-icons';
import { SERVICES } from '@/services.js';

export const SERVICE_ICONS = {
  client: UserMultipleIcon,
  produit: PackageIcon,
  commande: ShoppingCart01Icon,
  facture: InvoiceIcon,
  reglement: CircleDollarSignIcon,
  caisse: BanknoteIcon,
  entrepot: WarehouseIcon
};

export const APP_ICON = StoreManagementIcon;

export const SERVICE_ROUTES = {
  client: '/clients',
  produit: '/produits',
  commande: '/commandes',
  facture: '/factures',
  reglement: '/reglements',
  caisse: '/caisses',
  entrepot: '/entrepots'
};

export const FRONTEND_SERVICES = SERVICES.filter((service) => service.key !== 'commande');

export const COLUMN_LABELS = {
  id: 'ID',
  nom: 'Nom',
  prenom: 'Prénom',
  telephone: 'Téléphone',
  prix: 'Prix',
  client_id: 'Client',
  date: 'Date',
  total: 'Total',
  commande_id: 'Commande',
  numero: 'Numéro',
  montant: 'Montant',
  facture_id: 'Facture',
  mode: 'Mode',
  libelle: 'Libellé',
  solde: 'Solde',
  ville: 'Ville'
};

export const SERVICES_BY_ROUTE = Object.fromEntries(
  FRONTEND_SERVICES.map((service) => [SERVICE_ROUTES[service.key], service])
);

export const DEFAULT_ROUTE = SERVICE_ROUTES[FRONTEND_SERVICES[0].key];
