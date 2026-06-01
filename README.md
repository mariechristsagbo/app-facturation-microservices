# Facturation microservices

Mini-projet Node.js/Express pour le cours de microservices. Chaque dossier dans `services/` est un petit programme indépendant avec sa propre base JSON locale (je vais migrer plus tard vers une bonne base de données PostgreSQL ou SQL Lite).

<img width="1664" height="820" alt="image" src="https://github.com/user-attachments/assets/cbd69bc7-6a87-45bd-8f6f-5235da34fdc7" />


## Services

| Service | Port | Rôle |
| --- | --- | --- |
| `client-service` | `3002` | Gestion des clients |
| `product-service` | `3003` | Gestion des produits |
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

## Lancer le frontend en développement

Le frontend React est une app métier CRUD. En développement, Vite sert uniquement l'interface; les appels API complets passent par la stack Docker décrite plus bas.

```bash
npm run dev:frontend
```

Le frontend React est disponible sur `http://localhost:5173`.

Build du frontend:

```bash
npm run build:frontend
```

## Lancer la stack Traefik + Authelia + LLDAP

Cette stack suit le schéma `Client -> Traefik -> Authelia -> LLDAP -> Microservices`. Traefik est l'API gateway publique; Authelia protège l'app et les routes API; LLDAP sert d'annuaire utilisateurs.

Les fichiers Compose actifs sont à la racine: `docker-compose.yml`, `docker-compose.auth.yml`, `docker-compose.frontend.yml` et `docker-compose.microservices.yml`.

Ajouter les domaines locaux dans `/etc/hosts`:

```text
127.0.0.1 app.facturation.test
127.0.0.1 admin.facturation.test
127.0.0.1 traefik.facturation.test
```

Créer le réseau Docker partagé par Traefik et les services:

```bash
docker network create proxy
```

Créer les variables et secrets locaux:

```bash
cp .env.auth.example .env.auth
```

Remplacer les secrets de `.env.auth` avec `openssl rand -hex 32`. L'utilisateur LLDAP de démonstration est `admin` avec le mot de passe `admin123`.

Générer le certificat TLS local:

```bash
npm run auth:certs
```

Vérifier puis lancer la stack Docker:

```bash
npm run auth:config
npm run auth:up
```

Ouvrir `https://app.facturation.test:8443`. Le navigateur affichera probablement un avertissement car le certificat est auto-signé. L'interface LLDAP est sur `https://admin.facturation.test:8443` et le dashboard Traefik sur `https://traefik.facturation.test:8443`.

Dans ce mode local, seuls les ports Traefik `8080` et `8443` sont publiés sur l'hôte. Le frontend, Authelia, LLDAP et les microservices métier n'ont pas de ports publics; ils restent internes aux réseaux Docker. Les appels métier passent par Traefik avec le pattern `/api/:service/...`.


<img width="2940" height="1608" alt="image" src="https://github.com/user-attachments/assets/9f9124f0-f948-419a-8d76-25b3737270a1" />



## Lancer un seul service

```bash
npm run start:clients
npm run start:produits
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

Dans la stack Docker sécurisée, Traefik expose ces endpoints avec un préfixe service:

| Service | Exemple |
| --- | --- |
| `client` | `/api/client/list` |
| `produit` | `/api/produit/list` |
| `commande` | `/api/commande/list` |
| `facture` | `/api/facture/list` |
| `reglement` | `/api/reglement/list` |
| `caisse` | `/api/caisse/list` |
| `entrepot` | `/api/entrepot/list` |

## Test rapide avec curl

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
