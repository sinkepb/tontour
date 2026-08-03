# 🎫 TonTour — File d'attente dématérialisée

> Remplacer le ticket papier par un flux mobile ↔ poste vendeur, en temps réel.

SaaS multi-tenant de gestion de file d'attente pour boutiques télécom et services publics (mairies, CCAS). Ce dépôt contient le **MVP production** : 4 interfaces (citoyen, agent, back-office, écran de salle), backend Postgres/Supabase avec RLS, et un **mode démo** qui fait tourner l'application entièrement en local sans aucun backend.

**En ligne** : [bk-kappa-gold.vercel.app](https://bk-kappa-gold.vercel.app) (branche `main`, connecté au projet Supabase `tontour`).

> Écart courant vs. DEPLOIEMENT.md : un seul projet Supabase (`tontour`) est utilisé pour Preview et Production pour le moment, au lieu de `tontour-dev` / `tontour-prod` séparés — à scinder avant d'avoir de vraies données de production. Le projet Vercel s'appelle `bk` (nom du dossier local, sous l'équipe `ordomail`) plutôt que `tontour` — renommable depuis le dashboard Vercel si besoin, sans impact fonctionnel.

---

## Démarrage local (2 minutes, sans rien configurer)

```bash
npm install
npm run dev
```

Ouvrir `http://localhost:5173`. L'application démarre en **mode démo** : deux organisations de test sont préchargées (une boutique télécom, une mairie), avec des services, des comptes agents et un moteur de file d'attente qui tourne entièrement en `localStorage` + `BroadcastChannel` — **aucune donnée n'est envoyée à un serveur**.

Le mode démo permet de tester les 4 interfaces en parallèle, dans des onglets séparés du même navigateur (ils se synchronisent en temps réel entre eux) :

| Interface | URL |
|---|---|
| Parcours client | `/o/<organisation_id>` |
| Connexion agent / admin | `/o/<organisation_id>/connexion` |
| Poste vendeur | `/o/<organisation_id>/agent` (après connexion) |
| Back-office | `/o/<organisation_id>/backoffice` (après connexion, rôle admin) |
| Écran de salle | `/o/<organisation_id>/salle` |

`/` est la **landing page marketing** (segments boutiques télécom / mairies, fonctionnalités, tarifs indicatifs). La liste des organisations de démo avec liens directs vers chaque interface est sur **`/demo`** — cette page n'existe pas en production (le client arrive directement sur `/o/<organisation_id>` via le QR code de son point de vente, imprimable depuis le back-office → onglet QR Code).

### Comptes de démonstration

| Organisation | Rôle | Email | Mot de passe |
|---|---|---|---|
| Mobile Store Bastille (boutique) | Vendeur | `vendeur@boutique.demo` | `demo123` |
| Mobile Store Bastille (boutique) | Admin (back-office) | `admin@boutique.demo` | `admin123` |
| Mairie de Villeneuve | Agent | `agent@mairie.demo` | `demo123` |
| Mairie de Villeneuve | Admin (back-office) | `admin@mairie.demo` | `admin123` |

Ces 4 comptes existent en mode démo **et** sur le projet Supabase réel `tontour` (créés via l'API Admin lors de la mise en service) — utilisables aussi bien en local qu'en production tant que ce projet Supabase unique est en place.

### Tests automatisés

```bash
npm test    # vitest — logique de file pondérée, position/ETA, génération de code ticket
npm run lint
npm run build
```

Les tests couvrent le critère d'acceptation « priorisation par poids fonctionnelle avec 3 services de poids différents » (`src/lib/queue.test.js`).

---

## Brancher un vrai backend Supabase

Tant que `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` ne sont pas renseignées, l'app reste en mode démo (voir `src/lib/supabase.js`). Pour passer en mode production :

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Dans **SQL Editor**, exécuter `supabase/schema.sql` (tables, RLS, fonctions RPC transactionnelles, données de démo pour 2 organisations)
3. Créer les comptes agents dans **Authentication → Users** (email + mot de passe), puis insérer la ligne correspondante dans la table `agents` avec le même `id` que l'utilisateur Auth créé et l'`organisation_id` voulu
4. Copier `.env.example` vers `.env.local` et renseigner `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (Project Settings → API)
5. `npm run dev` — l'app utilise désormais Supabase (Postgres + Auth + Realtime) au lieu du moteur de démo

Toute la logique métier (file pondérée, verrouillage transactionnel, génération de code ticket, calcul de position) existe en double intentionnellement :
- `src/lib/queue.js` (pur, testé) + `src/lib/demoStore.js` → mode démo
- `supabase/schema.sql` (fonctions `appeler_prochain`, `creer_ticket`, `ticket_status`, …) → mode production

`src/lib/api.js` est le point d'entrée unique utilisé par les pages ; il bascule automatiquement entre les deux selon la configuration.

---

## Déploiement

Process détaillé, environnement par environnement (local, dev/preview, production) : voir **[DEPLOIEMENT.md](DEPLOIEMENT.md)**.

`vercel.json` inclut déjà la réécriture nécessaire pour le routage côté client (React Router).

---

## Structure du projet

```
tontour/
├── src/
│   ├── App.jsx                    ← routes (React Router)
│   ├── main.jsx
│   ├── index.css                   ← design tokens (variables CSS de branding + marketing)
│   ├── components/
│   │   ├── ui.jsx                  ← composants partagés (Button, Card, PageShell, Avatar…)
│   │   ├── QrCode.jsx               ← génération QR code (paquet `qrcode`, local)
│   │   ├── ProblemIllustration.jsx ← illustration SVG "avant / après" (landing page)
│   │   └── StoryViewer.jsx         ← storie façon Instagram/WhatsApp (progress bar, swipe, quiz)
│   ├── pages/
│   │   ├── MarketingLandingPage.jsx← landing "/" — offres télécom & mairie, tarifs indicatifs
│   │   ├── LandingPage.jsx         ← sélecteur d'organisations de démo, "/demo" uniquement
│   │   ├── ClientPage.jsx          ← parcours citoyen (§3.1) — storie dynamique (promotions)
│   │   ├── LoginPage.jsx
│   │   ├── AgentPage.jsx           ← poste vendeur (§3.2)
│   │   ├── BackofficePage.jsx      ← §3.4 — services, postes/agents, storie, branding, QR code
│   │   ├── SalleAffichage.jsx      ← §3.3
│   │   └── QrCodePage.jsx          ← affiche imprimable A4 par point de vente
│   └── lib/
│       ├── api.js                  ← couche unique démo/Supabase
│       ├── supabase.js             ← client + détection du mode
│       ├── demoStore.js            ← moteur de démo (localStorage + BroadcastChannel)
│       ├── queue.js                ← logique métier pure (testée)
│       ├── queue.test.js
│       ├── serviceIcon.js          ← icône par service (mot-clé du nom)
│       └── AuthContext.jsx
├── supabase/
│   └── schema.sql                  ← tables, RLS, fonctions RPC transactionnelles
├── public/
├── .env.example
├── vercel.json
└── README.md
```

---

## Écarts au cahier des charges (à justifier explicitement)

Conformément à la consigne du cahier des charges, voici les écarts assumés par rapport à la spécification et au prototype de référence :

1. **Authentification agents** : le champ `agents.mot_de_passe_hash` du schéma du prototype est remplacé par **Supabase Auth** (`auth.users`). Raison : éviter de réimplémenter un stockage de mot de passe (hash, réinitialisation, sessions) alors que Supabase le fournit nativement et de façon plus sûre. `agents.id` référence désormais `auth.users.id`.
2. **Aucun prototype `guichet-app-v2.zip` fourni** : les fichiers de référence cités (§12 du cahier des charges — prototype, roadmap, readme) n'étaient pas présents dans l'environnement de développement au démarrage de ce chantier. Le schéma de données et la logique de file pondérée ont donc été reconstruits directement depuis la spécification texte (§4, §5) plutôt que repris du code existant. **À faire** : si le prototype est retrouvé, comparer ligne à ligne avec `supabase/schema.sql` et `src/lib/queue.js`, et documenter ici tout écart de comportement constaté.
3. **Accès aux tickets par les rôles anonymes** : plutôt que d'exposer la table `tickets` en lecture directe à `anon` (risque de fuite de motifs/téléphones de tous les clients d'une organisation), tous les accès citoyens passent par des fonctions `SECURITY DEFINER` (`creer_ticket`, `ticket_status`, `annuler_ticket`) protégées par un `client_token` secret propre à chaque ticket. La table `tickets` elle-même n'accorde aucun privilège à `anon`.
4. **Temps réel en mode démo** : simulation via `BroadcastChannel` + `localStorage` plutôt que Socket.io/Supabase Realtime, pour permettre de tester les 4 interfaces sans aucun backend. En mode production, `src/lib/api.js` utilise Supabase Realtime (`postgres_changes`) comme prévu au cahier des charges.
5. **Storie promotionnelle côté client** (ajout demandé en cours de spécification) : entièrement gérée par le back-office (table `promotions`, onglet "Storie" — titre, message, ordre d'affichage, actif/masqué). Lecture publique (RLS `promotions_public_read`, messages actifs uniquement), écriture réservée à l'admin de l'organisation. Présentation façon Instagram/WhatsApp (`src/components/StoryViewer.jsx`) : barre de progression segmentée, navigation par tap/swipe, avance automatique. Deux types de contenu : `message` (offre/info) et `quiz` (question à choix multiples avec réponse correcte, feedback immédiat).
6. **Onboarding self-service** (`/inscription`, `src/pages/OnboardingPage.jsx`) : un prospect crée son organisation, son compte admin et son abonnement en 4 étapes (organisation → offre → compte → paiement), sans intervention manuelle. Provisionné en une transaction par la RPC `SECURITY DEFINER` `inscrire_organisation` (organisation + agent admin + 1er poste + services par défaut + ligne `abonnements`). L'étape de paiement intègre Stripe **en mode démo uniquement** : aucune clé Stripe réelle n'est configurée, l'UI simule le checkout (badge "mode démo" explicite, carte factice non éditable) et `abonnements.statut` reste `'demo'` avec un `stripe_customer_id` factice. Pour brancher un vrai paiement : remplacer `StripeDemoCheckout` par Stripe Elements/Checkout côté client, et créer l'abonnement réel côté serveur (Supabase Edge Function avec la clé secrète Stripe — jamais côté client) avant d'appeler `inscrire_organisation`.
7. **Notation moyenne par service et par vendeur** (`src/pages/BackofficePage.jsx` → onglet "Avis clients") : chaque ticket appelé fige l'agent qui l'a servi dans `tickets.agent_id` (voir commentaire dans `schema.sql` — `postes.agent_id` seul ne suffit pas, il change au fil de la journée). Les moyennes sont calculées à la demande par les RPC `notes_moyennes`/`notes_moyennes_vendeur`, pas de table d'agrégats séparée.

## Ce qui n'est pas encore implémenté (roadmap)

Le cahier des charges liste 4 priorités (§8). Ce MVP couvre la **Priorité 1** (durcissement : auth réelle, RLS, verrouillage transactionnel, tests automatisés) et les flux cœur de la **Priorité 2/3** (ticket papier exclu, alerte back-office, motifs structurés, branding). Restent à développer avant mise en production complète :

- **Impression ticket papier** (agent d'accueil, ESC/POS) — nécessite du matériel physique pour être testé
- **SMS de secours (Twilio/Vonage)** — la fonction Supabase Edge correspondante n'est pas encore écrite ; prévoir `supabase/functions/notify-sms/index.ts` déclenchée sur `appele_le` renseigné
- **Timeout "client ne se présente pas"** — repasse en fin de file ou annulation auto après délai paramétrable
- **Purge RGPD automatique** — la requête est documentée en commentaire dans `supabase/schema.sql`, à planifier via `pg_cron` une fois le projet Supabase créé
- **Export CSV, multilingue** (reste de la Priorité 4)
- **Formulaire de contact réel sur la landing page** — actuellement `mailto:`, à remplacer par un formulaire + CRM lors de la mise à l'échelle commerciale

> Couleurs et logo du magasin sont personnalisables par l'admin (back-office → Image de marque) et s'appliquent aux 4 interfaces. En mode démo, le logo est stocké en base64 dans le navigateur ; en production il est uploadé sur le bucket Supabase Storage `logos` (créé par `supabase/schema.sql`, policies RLS : lecture publique, écriture réservée à l'admin de l'organisation).

> Le QR code de chaque point de vente est généré localement (paquet `qrcode`, aucun appel réseau) et imprimable en A4 depuis le back-office → onglet QR Code (`/o/<organisation_id>/qrcode`).

> Les tarifs affichés sur la landing page (`/`) sont **indicatifs** — aucune facturation réelle n'est branchée (voir Priorité 4 ci-dessus). Les fonctionnalités marquées "(bientôt)" dans les grilles tarifaires correspondent aux items de cette roadmap.

## Critères d'acceptation (§10) — état

- [x] Parcours client complet, position/ETA, notification temps réel (<2s en mode démo, testé)
- [x] File pondérée testée avec 3 services de poids différents (`queue.test.js` + test manuel documenté)
- [x] Un seul ticket `en_cours` par poste, refusé sinon (`appeler_prochain` lève une exception ; verrouillage `FOR UPDATE` + `SKIP LOCKED` en production)
- [x] Branding par organisation sans fuite entre organisations (testé manuellement avec 2 organisations en parallèle)
- [x] Authentification agent/back-office avec séparation des rôles (`RequireRole` + RLS `agent_role()`)
- [ ] Flux papier et SMS de secours bout en bout (non implémenté, voir roadmap)
- [ ] Test de charge 50 tickets simultanés (à réaliser une fois un projet Supabase de dev créé — k6/Artillery)
- [x] Documentation de déploiement permettant à un tiers de déployer l'application (ce README)
