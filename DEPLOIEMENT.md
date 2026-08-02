# TonTour — Déploiement, environnement par environnement

Trois environnements : **Local** (poste développeur) → **Dev/Preview** (intégration partagée) → **Production**. Chacun a son propre projet Supabase — ne jamais réutiliser les clés d'un environnement dans un autre.

| | Local | Dev / Preview | Production |
|---|---|---|---|
| Objectif | Développer, tester sans rien configurer | Intégration, recette, démo client | Utilisateurs réels |
| Frontend | `npm run dev` (localhost:5173) | Vercel Preview (branche `dev`) | Vercel Production (branche `main`) |
| Données | Mode démo (localStorage) ou Supabase local | Projet Supabase **tontour-dev** | Projet Supabase **tontour-prod** |
| Déploiement | Manuel | Automatique à chaque push sur `dev` | Automatique à chaque merge sur `main` |
| Données de test | Réinitialisables à volonté | Partagées, à nettoyer périodiquement | Réelles — jamais de données de test |

---

## 1. Environnement local

### 1a. Mode démo (par défaut — recommandé pour le développement UI)

```bash
npm install
npm run dev
```

Aucune variable d'environnement requise. Le moteur `src/lib/demoStore.js` simule le backend en `localStorage`, synchronisé entre onglets via `BroadcastChannel`. Pour repartir d'un jeu de données propre :

```js
// dans la console du navigateur
localStorage.removeItem('tontour_demo_v1')
location.reload()
```

Utiliser ce mode pour tout le travail sur l'UI, les parcours, le CSS — c'est instantané et ne dépend d'aucun service externe.

### 1b. Mode Supabase local (recommandé avant de pousser un changement de schéma)

Nécessite Docker Desktop et la [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
npx supabase init        # une seule fois
npx supabase start       # démarre Postgres + Auth + Realtime + Storage en local (Docker)
```

La commande affiche une `API URL` et une `anon key` locales. Les renseigner dans `.env.local` :

```bash
cp .env.example .env.local
# VITE_SUPABASE_URL=http://localhost:54321
# VITE_SUPABASE_ANON_KEY=<clé affichée par supabase start>
```

Appliquer le schéma :

```bash
npx supabase db execute -f supabase/schema.sql
```

```bash
npm run dev
```

L'app tourne maintenant contre un vrai Postgres local avec RLS active — c'est l'environnement le plus fidèle à la production pour valider une évolution de `supabase/schema.sql` avant de la pousser en dev. Créer les comptes agents de test via `npx supabase status` → lien du Studio local (`http://localhost:54323`) → Authentication.

### Avant tout push

```bash
npm run lint
npm test
npm run build
```

Les trois doivent passer sans erreur (voir `package.json`). Aucun de ces contrôles n'est encore branché en CI (GitHub Actions) — à faire avant d'ouvrir le dépôt à plusieurs contributeurs, voir § 5.

---

## 2. Environnement Dev / Preview

Objectif : un environnement partagé, accessible par URL stable, pour la recette fonctionnelle et les démos — sans toucher aux données réelles.

### 2a. Mise en place (une seule fois)

**Supabase**

1. Créer un projet sur [supabase.com](https://supabase.com), nommé par exemple `tontour-dev`
2. **SQL Editor** → coller et exécuter l'intégralité de `supabase/schema.sql` (tables, RLS, fonctions RPC, bucket `logos`, 2 organisations de démo avec leurs services et leur storie — messages + un quiz par organisation)
3. **Authentication → Users → Add user** : créer les 4 comptes de démo (voir README) avec les emails/mots de passe indiqués
4. **SQL Editor** → pour chaque compte créé, récupérer son `id` (Authentication → Users → copier l'UUID) et l'insérer dans `agents` :
   ```sql
   insert into agents (id, organisation_id, nom, email, role, statut) values
     ('<uuid-copié>', '00000000-0000-0000-0000-000000000001', 'Camille Martin', 'vendeur@boutique.demo', 'vendeur', 'deconnecte');
   ```
5. Noter l'`API URL` et l'`anon key` (Project Settings → API)

**Git + Vercel**

```bash
git init
git add .
git commit -m "TonTour — scaffold initial"
git branch -M main
git checkout -b dev
git remote add origin https://github.com/VOTRE_NOM/tontour.git
git push -u origin main dev
```

Sur [vercel.com](https://vercel.com) : **Add New Project → Import Git Repository → tontour**. Framework auto-détecté : **Vite**. Vercel crée un déploiement pour chaque branche.

Dans **Project Settings → Environment Variables**, ajouter, avec le scope **Preview** uniquement :
- `VITE_SUPABASE_URL` = URL du projet `tontour-dev`
- `VITE_SUPABASE_ANON_KEY` = clé anon du projet `tontour-dev`

La branche `dev` obtient une URL stable de la forme `https://tontour-git-dev-<votre-compte>.vercel.app` (pas une URL éphémère par commit — elle reste la même tant que la branche existe).

### 2b. Flux quotidien

```bash
git checkout -b feat/ma-fonctionnalite dev
# ... développement, npm run dev en local ...
npm run lint && npm test && npm run build
git push -u origin feat/ma-fonctionnalite
```

Ouvrir une Pull Request vers `dev` sur GitHub → Vercel poste automatiquement un commentaire avec l'URL de preview de cette PR (éphémère, une par commit) → relecture → merge dans `dev` → l'URL stable `tontour-git-dev-*.vercel.app` se met à jour.

Si le changement touche `supabase/schema.sql`, l'appliquer **manuellement** dans le SQL Editor du projet `tontour-dev` avant de merger (voir § 5 sur les limites de ce fonctionnement en un seul fichier).

### 2c. Vérification après déploiement

- Ouvrir l'URL de preview sur `/` : la landing marketing doit s'afficher, avec bascule de segment **Boutiques télécom / Mairies** fonctionnelle (couleur d'accent, tarifs, illustration du problème)
- Ouvrir `/demo` : liste des organisations de démo, liens vers les 4 interfaces opérationnelles
- Vérifier la console navigateur (pas d'erreur Supabase, pas de mode démo affiché par erreur — la bannière "Mode démo" ne doit **pas** apparaître si les variables sont bien configurées)
- Tester le parcours client complet sur une organisation : prise de ticket, storie (défilement, swipe, quiz avec réponse), documents à préparer
- Back-office → onglet **QR Code** : le QR s'affiche et pointe vers la bonne URL `/o/<organisation_id>` ; onglet **Storie** : créer un message et un quiz, vérifier qu'ils apparaissent côté client
- Vérifier dans Supabase **Table Editor** que le ticket créé pendant le test apparaît bien dans `tickets`, et que le message/quiz créés apparaissent dans `promotions`

---

## 3. Environnement Production

### 3a. Mise en place (une seule fois)

**Supabase** — répéter exactement les étapes du § 2a mais sur un **nouveau projet** `tontour-prod` (ne jamais réutiliser `tontour-dev`). Les comptes créés ici sont les vrais comptes agents/admin des premiers clients, pas des comptes de démo — adapter les emails/mots de passe en conséquence, et **ne pas** insérer les organisations de démo du bloc final de `supabase/schema.sql` (les commenter/supprimer avant exécution, ou les supprimer après coup).

Activer la purge RGPD automatique (téléphone/motif supprimés 24h après passage) : dans **SQL Editor**, décommenter et exécuter le bloc `pg_cron` situé en commentaire dans `supabase/schema.sql` (§ RGPD).

**Vercel**

Dans **Project Settings → Environment Variables**, ajouter avec le scope **Production** :
- `VITE_SUPABASE_URL` = URL du projet `tontour-prod`
- `VITE_SUPABASE_ANON_KEY` = clé anon du projet `tontour-prod`

**Project Settings → Git → Production Branch** doit être `main` (valeur par défaut).

### 3b. Mise en production d'une évolution

```bash
git checkout main
git merge dev
git push origin main
```

Le merge sur `main` déclenche automatiquement le déploiement Production sur Vercel. Appliquer manuellement les changements de schéma sur `tontour-prod` **avant** ce merge (même procédure qu'en dev, sur le bon projet).

### 3c. Checklist avant chaque mise en production

Reprendre les critères d'acceptation §10 du cahier des charges (voir tableau dans le README) :

- [ ] `npm run lint && npm test && npm run build` verts
- [ ] Recette manuelle rejouée sur l'environnement dev avec au moins 2 organisations en parallèle (aucune fuite de branding/données)
- [ ] Vérification RLS : requête directe à l'API REST Supabase avec la clé anon, tentative de lecture de `tickets` d'une autre organisation → doit être refusée
- [ ] Test de concurrence sur `appeler_prochain` (plusieurs appels simultanés sur le même poste → un seul aboutit)
- [ ] Variables d'environnement Production vérifiées (`tontour-prod`, pas `tontour-dev`)
- [ ] Sauvegarde/point de restauration Supabase récent (Project Settings → Database → Backups, activées par défaut sur les plans payants)

### 3d. Domaine personnalisé (optionnel)

**Vercel → Project → Settings → Domains** → saisir le domaine (ex. `tontour.fr`) → chez le registrar (OVH, Gandi…), ajouter :
- `CNAME www → cname.vercel-dns.com`
- `A @ → 76.76.21.21`

Propagation DNS : 5 à 30 minutes en général, jusqu'à 48h dans de rares cas. Le badge devient "Valid Configuration" dans le dashboard Vercel une fois propagé.

### 3e. Rollback

**Frontend** : Vercel conserve tous les déploiements précédents. **Deployments → sélectionner un déploiement antérieur → Promote to Production** (instantané, aucun rebuild). En CLI : `vercel rollback`.

**Base de données** : `supabase/schema.sql` est aujourd'hui un script d'initialisation unique, pas un système de migrations versionnées — un rollback de schéma n'est donc pas automatisé. Voir § 5 pour la limite et la recommandation.

---

## 4. Résilience réseau (§9 du cahier des charges)

L'écran de salle (`SalleAffichage.jsx`) combine l'abonnement temps réel **et** un re-polling toutes les 10 secondes, pour rester à jour même si la connexion Realtime est coupée côté point de vente — c'est le mode dégradé prévu par la spec (l'annonce visuelle continue de fonctionner même si la notification mobile du client échoue).

---

## 5. Limite connue : migrations de schéma

`supabase/schema.sql` est un script d'initialisation complet (tables + RLS + fonctions + données de démo), pensé pour un premier déploiement. Il n'est **pas** rejouable tel quel sur un projet déjà initialisé (les `create table` échoueraient). Pour toute évolution de schéma après le premier déploiement dev/prod :

1. Écrire le changement sous forme de migration incrémentale : `npx supabase migration new <nom>`
2. Le fichier généré dans `supabase/migrations/` contient uniquement le delta (ex. `alter table services add column ...`)
3. Appliquer avec `npx supabase db push` (local) ou en collant le contenu dans le SQL Editor du projet cible (dev puis prod)

Ce dépôt n'a pas encore de dossier `supabase/migrations/` — à créer dès la première évolution de schéma post-lancement, pour ne pas perdre la trace des changements et pouvoir les rejouer dans l'ordre sur dev puis prod.
