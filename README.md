# Facturation Microservices

Mini-projet Node.js/Express pour un cours de microservices. Chaque dossier dans `services/` est un petit programme independant avec sa propre base JSON locale.

## Services

| Service | Port | Role |
| --- | --- | --- |
| `auth-service` | `3001` | Utilisateurs et login |
| `client-service` | `3002` | Gestion des clients |
| `product-service` | `3003` | Gestion des produits |
| `stock-service` | `3004` | Stock, entrees, sorties, reservations |
| `order-service` | `3005` | Creation des commandes |
| `invoice-service` | `3006` | Generation des factures |
| `payment-service` | `3007` | Paiements et mise a jour des factures |

## Installation

```bash
npm install
```

## Lancer tous les services

```bash
npm start
```

## Lancer un seul service

```bash
npm run start:clients
npm run start:produits
npm run start:stock
```

## Test rapide avec curl

Login:

```bash
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@facturation.test","password":"admin123"}'
```

Creer un client:

```bash
curl -X POST http://localhost:3002/clients \
  -H "Content-Type: application/json" \
  -d '{"nom":"Kossi","telephone":"97000000","email":"kossi@test.com","adresse":"Cotonou"}'
```

Creer un produit:

```bash
curl -X POST http://localhost:3003/produits \
  -H "Content-Type: application/json" \
  -d '{"nom":"Clavier","reference":"CLV-001","prix":15000}'
```

Ajouter du stock pour le produit cree:

```bash
curl -X POST http://localhost:3004/stocks/entrees \
  -H "Content-Type: application/json" \
  -d '{"produitId":"prd_demo","quantite":50,"entrepot":"Entrepot principal"}'
```

Creer une commande avec les donnees demo:

```bash
curl -X POST http://localhost:3005/commandes \
  -H "Content-Type: application/json" \
  -d '{"clientId":"cli_demo","items":[{"produitId":"prd_demo","quantite":2}]}'
```

Creer une facture depuis une commande:

```bash
curl -X POST http://localhost:3006/factures \
  -H "Content-Type: application/json" \
  -d '{"commandeId":"ID_DE_LA_COMMANDE"}'
```

Payer une facture:

```bash
curl -X POST http://localhost:3007/paiements \
  -H "Content-Type: application/json" \
  -d '{"factureId":"ID_DE_LA_FACTURE","montant":10000,"mode":"cash"}'
```

## Idee importante

Dans ce projet, `order-service` ne modifie pas directement la base de `stock-service`. Il appelle plutot l'API de `stock-service`. C'est cela l'esprit microservices: chaque service garde sa responsabilite et communique avec les autres par HTTP.
