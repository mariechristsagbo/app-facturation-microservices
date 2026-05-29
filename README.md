# Facturation microservices

Mini-projet Node.js/Express pour le cours de microservices. Chaque dossier dans `services/` est un petit programme indépendant avec sa propre base JSON locale (je vais migrer plus tard vers une bonne base de données PostgreSQL ou SQL Lite).

<img width="1664" height="820" alt="image" src="https://github.com/user-attachments/assets/cbd69bc7-6a87-45bd-8f6f-5235da34fdc7" />


## Services

| Service | Port | Rôle |
| --- | --- | --- |
| `auth-service` | `3001` | Gestion des utilisateurs et login |
| `client-service` | `3002` | Gestion des clients |
| `product-service` | `3003` | Gestion des produits |
| `stock-service` | `3004` | Gestion des stocks |
| `order-service` | `3005` | Gestion des commandes |
| `invoice-service` | `3006` | Gestion des factures |
| `reglement-service` | `3007` | Gestion des règlements |
| `cash-register-service` | `3008` | Gestion des caisses |
| `warehouse-service` | `3009` | Gestion des entrepôts |

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
npm run start:commandes
npm run start:factures
npm run start:reglements
npm run start:caisses
npm run start:entrepots
```

## Endpoints métier

Tous les services métier suivent le même pattern:

| Action | Méthode | Endpoint |
| --- | --- | --- |
| Créer | `POST` | `/create` |
| Lister | `GET` | `/list` |
| Voir le détail | `GET` | `/view/:id` |
| Modifier | `PATCH` | `/edit/:id` |
| Supprimer | `DELETE` | `/delete/:id` |

`auth-service` expose aussi `POST /login` pour la connexion.

## Test rapide avec curl

Login:

```bash
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@facturation.test","password":"admin123"}'
```

Créer un client:

```bash
curl -X POST http://localhost:3002/create \
  -H "Content-Type: application/json" \
  -d '{"nom":"Sarr","prenom":"Cheikh","telephone":"774567890"}'
```

Lister les clients:

```bash
curl http://localhost:3002/list
```

Voir un client:

```bash
curl http://localhost:3002/view/1
```

Créer une commande:

```bash
curl -X POST http://localhost:3005/create \
  -H "Content-Type: application/json" \
  -d '{"client_id":4,"date":"2026-05-20","lignes":[{"produit_id":4,"quantite":1}]}'
```

Créer une facture depuis une commande:

```bash
curl -X POST http://localhost:3006/create \
  -H "Content-Type: application/json" \
  -d '{"commande_id":4,"date_emission":"2026-05-20","montant":8000}'
```

Enregistrer un règlement:

```bash
curl -X POST http://localhost:3007/create \
  -H "Content-Type: application/json" \
  -d '{"facture_id":4,"montant":8000,"mode":"espèces","caisse_id":1}'
```

Créer une caisse:

```bash
curl -X POST http://localhost:3008/create \
  -H "Content-Type: application/json" \
  -d '{"libelle":"Caisse agence Nord"}'
```

Créer un entrepôt:

```bash
curl -X POST http://localhost:3009/create \
  -H "Content-Type: application/json" \
  -d '{"nom":"Entrepôt Kaolack","ville":"Kaolack"}'
```

## Idée importante

Chaque service garde sa propre responsabilité, son propre fichier JSON local et expose la même forme d'API métier. Les échanges entre services se font par HTTP quand une ressource dépend d'une autre.
