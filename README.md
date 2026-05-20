# Facturation microservices

Mini-projet Node.js/Express pour le cours de microservices. Chaque dossier dans `services/` est un petit programme indépendant avec sa propre base JSON locale (je vais migrer plus tard vers une bonne base de données PostgreSQL ou SQL Lite).

<img width="1664" height="820" alt="image" src="https://github.com/user-attachments/assets/cbd69bc7-6a87-45bd-8f6f-5235da34fdc7" />


## Services

| Service | Port | Rôle |
| --- | --- | --- |
| `auth-service` | `3001` | Utilisateurs et login |
| `client-service` | `3002` | Gestion des clients |
| `product-service` | `3003` | Gestion des produits |
| `stock-service` | `3004` | Stock, entrées, sorties, réservations |
| `order-service` | `3005` | Création des commandes |
| `invoice-service` | `3006` | Génération des factures |
| `payment-service` | `3007` | Paiements et mise à jour des factures |

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

Créer un client:

```bash
curl -X POST http://localhost:3002/clients \
  -H "Content-Type: application/json" \
  -d '{"nom":"Kossi","telephone":"97000000","email":"kossi@test.com","adresse":"Cotonou"}'
```

Créer un produit:

```bash
curl -X POST http://localhost:3003/produits \
  -H "Content-Type: application/json" \
  -d '{"nom":"Clavier","reference":"CLV-001","prix":15000}'
```

Ajouter du stock pour le produit créé:

```bash
curl -X POST http://localhost:3004/stocks/entrees \
  -H "Content-Type: application/json" \
  -d '{"produitId":"prd_demo","quantite":50,"entrepot":"Entrepôt principal"}'
```

Créer une commande avec les données démo:

```bash
curl -X POST http://localhost:3005/commandes \
  -H "Content-Type: application/json" \
  -d '{"clientId":"cli_demo","items":[{"produitId":"prd_demo","quantite":2}]}'
```

Créer une facture depuis une commande:

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

## Idée importante

Dans ce projet, `order-service` ne modifie pas directement la base de `stock-service`. Il appelle plutôt l'API de `stock-service`. Chaque service garde sa responsabilité et communique avec les autres par HTTP.
