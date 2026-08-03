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
8. **Priorité spéciale (PMR, urgence)** : case à cocher côté client (`tickets.prioritaire`), passe devant tout le monde y compris un service de poids plus élevé — voir `selectNextTicket()` dans `src/lib/queue.js` (poids ignoré tant qu'un ticket prioritaire attend) et son équivalent SQL dans `appeler_prochain`/`apercu_prochain`. `computePosition()` et la RPC `ticket_status` appliquent la même règle pour l'affichage "X devant vous" côté client.
9. **Avis avec commentaire** (`tickets.commentaire`, 1000 caractères max) : saisi en même temps que la note, affiché dans l'onglet "Avis clients" (section "Commentaires récents").
10. **Timeout "client absent"** : statut ticket dédié `'absent'` (distinct de `'annule'`, pour un reporting propre). Le bouton "Marquer absent" côté agent ne s'active qu'après `organisations.delai_absence_min` (5 min par défaut) écoulées depuis le dernier appel — vérifié aussi côté serveur dans la RPC `marquer_absent`, pas seulement dans l'UI.
11. **Recherche/historique** (`src/pages/BackofficePage.jsx` → onglet "Recherche") : par code, téléphone, plage de dates, jusqu'à 500 résultats. Requête directe sur `tickets` (RLS `tickets_org_read` suffit, pas besoin d'une RPC dédiée).
12. **Statistiques graphiques** : tendance quotidienne 14 jours et répartition par heure ("heures de pointe") 30 jours, via les RPC `stats_tendance`/`stats_heures`. Rendu en barres CSS/SVG maison (`.chart-*` dans `index.css`), aucune dépendance de graphiques ajoutée.
13. **Export CSV** (`src/lib/csv.js`) : génération et téléchargement 100% client, à partir du résultat de recherche déjà chargé — aucun aller-retour serveur supplémentaire.
14. **Widget embarquable** (`/widget/:orgId`, back-office → onglet "Widget") : même composant que `/o/:orgId`, seule différence l'en-tête `Content-Security-Policy` (`frame-ancestors`) — ouvert uniquement pour ce chemin dans `vercel.json`, fermé (`'none'`) partout ailleurs.
15. **Vue consolidée multi-boutiques (enseignes)** (`/enseigne`, `src/pages/EnseignePage.jsx`) : lecture seule, agrégée par organisation, protégée côté serveur par `agent_enseigne_id()` (RPC `stats_enseigne` renvoie un jeu de résultats vide si l'appelant n'a pas cette `enseigne_id`). **Pas d'UI de gestion des enseignes dans cette première version** — création d'une enseigne et rattachement d'une organisation/d'un agent se font en SQL (`insert into enseignes ...`, puis `update organisations/agents set enseigne_id = ...`).
16. **Design sans arrondi** : `--radius-sm/md/lg` à `0` dans `index.css`, tous les badges/avatars/pills convertis en rectangles nets. Seule exception : `.spinner` (indicateur de chargement circulaire — convention universelle, pas un choix d'arrondi esthétique).

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

## Sécurité, charge, checklist avant mise en production

Audit réalisé sur ce dépôt avant un lancement réel :

**Vérifié en conditions réelles (contre le projet Supabase de production, pas seulement en théorie) :**
- **Isolation Realtime** : un abonnement `postgres_changes` anonyme sur `tickets` ne reçoit rigoureusement rien (RLS appliquée par Supabase Realtime, pas seulement par PostgREST) — un visiteur ne peut donc pas espionner les motifs/téléphones des autres clients de la même organisation en observant le trafic WebSocket. Vérifié aussi entre deux organisations différentes côté agent authentifié (aucune fuite cross-tenant). Conséquence directe : `ClientPage` et `SalleAffichage` (toutes deux publiques/anonymes) ne s'abonnent plus du tout à Realtime — un abonnement anonyme n'y recevrait jamais rien, autant ne pas garder la connexion WebSocket ouverte pour rien ; elles reposent entièrement sur un polling (4s / 10s), qui est donc leur mécanisme de mise à jour normal et non un simple filet de secours.
- Aucun secret (clé `service_role`, clé Stripe) n'a jamais été commité (historique git entier passé au crible).
- `npm run lint` et `npm test` passent sans erreur.

**Corrigé lors de cet audit :**
- `organisations`/`services`/`promotions` avaient un `revoke all` jamais suivi d'un grant d'écriture pour `authenticated` : les policies RLS admin existaient mais étaient inertes (`permission denied`). Voir les `grant` explicites dans `schema.sql`.
- `stats_jour()` et le trigger `generer_code_ticket()` filtraient par `cree_le::date = now()::date`, une expression qui ne correspondait à AUCUN index existant (le fonctionnel `(cree_le at time zone 'utc')::date` posé plus tôt ne matche pas) — récrit en bornes (`cree_le >= ... and cree_le < ...`), sargable sur `idx_tickets_org_jour`.
- Ajout d'index partiels pour `notes_moyennes`/`notes_moyennes_vendeur` (`where note is not null`).
- Bucket Storage `logos` : `file_size_limit`/`allowed_mime_types` posés côté serveur (la validation de `BackofficePage.jsx` ne protégeait que l'UI, pas un appel direct à l'API Storage).
- Bornes de longueur ajoutées sur les champs texte alimentés par des routes anonymes (`tickets.motif`/`telephone`, `organisations.nom`/`adresse`, `agents.nom`/`email`).
- Plafond anti-spam basique dans `creer_ticket` (500 tickets/jour/service) — ne remplace pas un vrai CAPTCHA, voir ci-dessous.
- En-têtes de sécurité HTTP (`vercel.json`) : CSP, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS, cache long sur les assets hashés.
- Code-splitting (`React.lazy`) : les pages réservées au personnel (agent, back-office, onboarding, connexion) ne sont plus dans le bundle initial du parcours citoyen — `~40 kB` de moins sur la page la plus visitée, celle ouverte sur mobile juste après un scan de QR code.

**Nécessite une action manuelle (hors du champ de `schema.sql`, réglages du dashboard Supabase) :**
- **Longueur minimale des mots de passe** : le formulaire impose 8 caractères côté client, mais un appel direct à `supabase.auth.signUp` contournerait cette limite si le projet Supabase l'autorise. Dashboard → Authentication → Policies → régler la longueur minimale ≥ 8.
- **Protection mots de passe compromis** (option "Leaked password protection" du dashboard Supabase) : à activer.
- **CAPTCHA sur la création de ticket et l'inscription self-service** : `creer_ticket` et `inscrire_organisation` sont des routes anonymes appelables directement (hors UI), sans protection anti-bot au-delà du plafond quotidien ajouté ci-dessus. Une vraie protection nécessite un service tiers (Cloudflare Turnstile, hCaptcha) avec ses propres clés — non configuré dans ce dépôt, à mettre en place avant un lancement à fort trafic.
- **Séparer les projets Supabase Preview/Production** (déjà noté plus haut) — un seul projet `tontour` sert les deux pour l'instant.

**Charge — non testé en conditions réelles, à faire avant un vrai lancement :**
- Test de charge (k6/Artillery) avec plusieurs dizaines de tickets/appels simultanés — item déjà listé dans les critères d'acceptation ci-dessous, toujours ouvert.
- Le polling client (4s, un par onglet ouvert) et l'écran de salle (10s) sont volontairement légers (une RPC ciblée, pas un `select *`), mais leur coût grandit linéairement avec le nombre de clients en attente simultanés — à surveiller si une organisation dépasse largement l'échelle "boutique/mairie unique" visée par ce MVP.

## Critères d'acceptation (§10) — état

- [x] Parcours client complet, position/ETA, notification (<2s en mode démo ; en production, notification côté client par polling 4s — voir § Sécurité ci-dessus sur pourquoi Realtime ne peut pas servir cet écran)
- [x] File pondérée testée avec 3 services de poids différents (`queue.test.js` + test manuel documenté)
- [x] Un seul ticket `en_cours` par poste, refusé sinon (`appeler_prochain` lève une exception ; verrouillage `FOR UPDATE` + `SKIP LOCKED` en production)
- [x] Branding par organisation sans fuite entre organisations (testé manuellement avec 2 organisations en parallèle)
- [x] Authentification agent/back-office avec séparation des rôles (`RequireRole` + RLS `agent_role()`)
- [ ] Flux papier et SMS de secours bout en bout (non implémenté, voir roadmap)
- [ ] Test de charge 50 tickets simultanés (à réaliser une fois un projet Supabase de dev créé — k6/Artillery)
- [x] Documentation de déploiement permettant à un tiers de déployer l'application (ce README)
