-- ============================================================================
-- TonTour — schéma Postgres/Supabase
-- Reprend le modèle de données du prototype (organisations, services, agents,
-- postes, tickets) en l'adaptant à Supabase Auth + RLS pour la production.
--
-- Écart documenté vs. le prototype : `agents.mot_de_passe_hash` est remplacé
-- par Supabase Auth (auth.users). `agents.id` référence désormais
-- auth.users.id — Supabase gère le hash et les sessions, on évite de
-- réinventer un stockage de mot de passe. Voir README § "Écarts au cahier
-- des charges".
-- ============================================================================

create extension if not exists pgcrypto;

-- ─── Tables ─────────────────────────────────────────────────────────────

create table organisations (
  id                  uuid primary key default gen_random_uuid(),
  nom                 text not null,
  type                text not null check (type in ('mairie', 'boutique')),
  couleur_principale  text not null default '#4f46e5',
  couleur_secondaire  text not null default '#818cf8',
  logo_url            text,
  adresse             text,
  alerte_delai_min    int not null default 15, -- délai avant alerte "service sans poste"
  cree_le             timestamptz not null default now()
);

create table services (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references organisations(id) on delete cascade,
  nom              text not null,
  prefixe_ticket   text not null,
  temps_moyen_min  int not null default 5,
  documents_requis jsonb not null default '[]',
  motifs_predefinis jsonb not null default '[]', -- Priorité 3 : motifs structurés
  poids            int not null default 1,
  actif            boolean not null default true,
  cree_le          timestamptz not null default now(),
  unique (organisation_id, prefixe_ticket)
);

-- Storie affichée au client pendant l'attente (§3.1) : messages, offres, promotions
-- gérés par le back-office de l'organisation, diffusés en rotation sur l'écran client.
create table promotions (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references organisations(id) on delete cascade,
  type             text not null default 'message' check (type in ('message', 'quiz')),
  titre            text not null,
  texte            text not null, -- message libre, ou énoncé de la question si type = 'quiz'
  options          jsonb not null default '[]', -- type = 'quiz' uniquement : [{ "texte": "...", "correcte": true|false }, ...]
  actif            boolean not null default true,
  ordre            int not null default 0,
  cree_le          timestamptz not null default now()
);

-- Un agent = un utilisateur Supabase Auth. Cette table porte le profil métier.
create table agents (
  id               uuid primary key references auth.users(id) on delete cascade,
  organisation_id  uuid not null references organisations(id) on delete cascade,
  nom              text not null,
  email            text not null,
  role             text not null check (role in ('admin', 'vendeur')) default 'vendeur',
  statut           text not null check (statut in ('actif', 'pause', 'deconnecte')) default 'deconnecte',
  cree_le          timestamptz not null default now()
);

create table postes (
  id                 uuid primary key default gen_random_uuid(),
  organisation_id    uuid not null references organisations(id) on delete cascade,
  nom                text not null,
  agent_id           uuid references agents(id) on delete set null,
  service_ids        jsonb not null default '[]', -- array d'ids de services servis actuellement
  ticket_en_cours_id uuid,
  connecte           boolean not null default false,
  en_pause           boolean not null default false,
  cree_le            timestamptz not null default now()
);

create table tickets (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references organisations(id) on delete cascade,
  service_id       uuid not null references services(id) on delete cascade,
  code             text not null,
  statut           text not null check (statut in ('en_attente', 'en_cours', 'termine', 'annule')) default 'en_attente',
  canal            text not null check (canal in ('mobile', 'papier')) default 'mobile',
  motif            text,
  telephone        text,
  client_token     uuid not null default gen_random_uuid(), -- secret remis au client, sert de "mot de passe" pour suivre son ticket
  poste_id         uuid references postes(id) on delete set null,
  -- Copié depuis postes.agent_id au moment de l'appel (appeler_prochain) : postes.agent_id
  -- change au fil de la journée (déconnexions/reconnexions), donc s'y référer après coup pour
  -- attribuer une note donnerait le mérite au mauvais vendeur. tickets.agent_id fige qui a
  -- réellement servi ce ticket, pour les moyennes par vendeur (notes_moyennes_vendeur).
  agent_id         uuid references agents(id) on delete set null,
  cree_le          timestamptz not null default now(),
  appele_le        timestamptz,
  termine_le       timestamptz,
  note             int check (note between 1 and 5) -- notation client, laissée juste après le traitement
);

alter table postes
  add constraint fk_poste_ticket_en_cours foreign key (ticket_en_cours_id) references tickets(id) on delete set null;

-- Trace l'offre choisie à l'inscription self-service (onboarding) et l'identifiant
-- Stripe correspondant. En mode démo (pas de clé Stripe configurée), stripe_customer_id
-- est une valeur factice ("cus_demo_...") et statut reste 'demo' — aucun paiement réel
-- n'est jamais traité par cette table ni par le flux d'inscription.
create table abonnements (
  id                      uuid primary key default gen_random_uuid(),
  organisation_id         uuid not null references organisations(id) on delete cascade,
  plan                    text not null,
  montant_mensuel_eur     numeric not null default 0,
  statut                  text not null default 'demo' check (statut in ('demo', 'actif', 'annule')),
  stripe_customer_id      text,
  stripe_subscription_id  text,
  cree_le                 timestamptz not null default now()
);

create index idx_tickets_queue on tickets (organisation_id, service_id, statut, cree_le);
-- (cree_le AT TIME ZONE 'UTC')::date plutôt que cree_le::date : le cast direct dépend du
-- fuseau horaire de la session (STABLE, pas IMMUTABLE) et est refusé dans une expression d'index.
create index idx_tickets_org_jour on tickets (organisation_id, service_id, ((cree_le at time zone 'utc')::date));

-- ─── RGPD : rétention courte du téléphone ──────────────────────────────────
-- À planifier via pg_cron (Supabase) : purge quotidienne des tickets terminés
-- depuis plus de 24h (téléphone + motif), conservation des seules métriques.
-- Note : le corps de la tâche cron.schedule() est lui-même délimité par des
-- guillemets dollar (dollar-quoting) — à écrire directement dans le SQL
-- Editor le jour de l'activation plutôt qu'ici en commentaire, pour éviter
-- toute confusion avec le dollar-quoting des fonctions plus bas dans ce fichier :
--
--   cron.schedule('purge-tickets-rgpd', '0 3 * * *',
--     'update tickets set telephone = null, motif = null
--      where statut in (''termine'', ''annule'')
--        and coalesce(termine_le, cree_le) < now() - interval ''24 hours''
--        and telephone is not null;');

-- ─── Fonctions utilitaires ──────────────────────────────────────────────

create or replace function agent_organisation_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select organisation_id from agents where id = auth.uid();
$$;

create or replace function agent_role()
returns text
language sql stable security definer set search_path = public as $$
  select role from agents where id = auth.uid();
$$;

-- Génère le code de ticket : PREFIXE-NN, numérotation remise à zéro chaque jour, par service.
create or replace function generer_code_ticket()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_prefixe text;
  v_seq int;
begin
  select prefixe_ticket into v_prefixe from services where id = new.service_id;

  select count(*) + 1 into v_seq
  from tickets
  where service_id = new.service_id
    and cree_le::date = now()::date;

  new.code := v_prefixe || '-' || lpad(v_seq::text, 2, '0');
  return new;
end;
$$;

create trigger trg_generer_code_ticket
  before insert on tickets
  for each row execute function generer_code_ticket();

-- ─── RPC : création de ticket (route citoyenne, anonyme) ──────────────────
drop function if exists creer_ticket(uuid, uuid, text, text, text);
drop function if exists ticket_status(uuid, uuid);

create or replace function creer_ticket(
  p_organisation_id uuid,
  p_service_id uuid,
  p_motif text default null,
  p_telephone text default null,
  p_canal text default 'mobile'
)
returns table (id uuid, code text, client_token uuid, statut text, "position" int, attente_estimee_min int, poste_nom text, service_nom text, documents_requis jsonb, note int, appele_le timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_ticket tickets;
begin
  -- Alias "s" obligatoire : cette fonction déclare RETURNS TABLE(id ...), donc "id" seul
  -- serait ambigu entre la colonne services.id et la variable de sortie "id" de la fonction.
  if not exists (select 1 from services s where s.id = p_service_id and s.organisation_id = p_organisation_id and s.actif) then
    raise exception 'Service invalide ou inactif';
  end if;

  insert into tickets (organisation_id, service_id, motif, telephone, canal)
  values (p_organisation_id, p_service_id, p_motif, p_telephone, p_canal)
  returning * into v_ticket;

  return query select * from ticket_status(v_ticket.id, v_ticket.client_token);
end;
$$;

-- ─── RPC : suivi de position (route citoyenne, anonyme, protégée par token) ─
-- Note : "position" est un mot réservé PostgreSQL (syntaxe POSITION(x IN y)) —
-- doit être entre guillemets doubles dans la déclaration RETURNS TABLE.
create or replace function ticket_status(p_ticket_id uuid, p_client_token uuid)
returns table (id uuid, code text, client_token uuid, statut text, "position" int, attente_estimee_min int, poste_nom text, service_nom text, documents_requis jsonb, note int, appele_le timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_ticket tickets;
  v_temps_moyen int;
begin
  -- Alias "t"/"s" obligatoires : cette fonction déclare RETURNS TABLE(id, client_token, ...),
  -- donc ces noms seuls seraient ambigus avec les variables de sortie du même nom.
  select * into v_ticket from tickets t where t.id = p_ticket_id and t.client_token = p_client_token;
  if not found then
    raise exception 'Ticket introuvable';
  end if;

  select temps_moyen_min into v_temps_moyen from services s where s.id = v_ticket.service_id;

  return query
  select
    v_ticket.id,
    v_ticket.code,
    v_ticket.client_token,
    v_ticket.statut,
    (select count(*)::int from tickets t
       where t.service_id = v_ticket.service_id and t.statut = 'en_attente' and t.cree_le < v_ticket.cree_le)
      as "position",
    ((select count(*)::int from tickets t
       where t.service_id = v_ticket.service_id and t.statut = 'en_attente' and t.cree_le < v_ticket.cree_le)
      * coalesce(v_temps_moyen, 5)) as attente_estimee_min,
    (select p.nom from postes p where p.id = v_ticket.poste_id) as poste_nom,
    (select s.nom from services s where s.id = v_ticket.service_id) as service_nom,
    (select s.documents_requis from services s where s.id = v_ticket.service_id) as documents_requis,
    v_ticket.note,
    v_ticket.appele_le;
end;
$$;

-- ─── RPC : notation de la prestation (route citoyenne, anonyme, protégée par token) ─
-- Autorisée uniquement une fois le ticket terminé, pour éviter qu'un client note
-- avant d'avoir été servi.
create or replace function noter_ticket(p_ticket_id uuid, p_client_token uuid, p_note int)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_note < 1 or p_note > 5 then
    raise exception 'Note invalide (1 à 5)';
  end if;

  update tickets t set note = p_note
  where t.id = p_ticket_id and t.client_token = p_client_token and t.statut = 'termine';
  if not found then
    raise exception 'Ticket introuvable ou pas encore terminé';
  end if;
end;
$$;

-- ─── RPC : annulation (route citoyenne, anonyme, protégée par token) ──────
create or replace function annuler_ticket(p_ticket_id uuid, p_client_token uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update tickets set statut = 'annule'
  where id = p_ticket_id and client_token = p_client_token and statut = 'en_attente';
  if not found then
    raise exception 'Ticket introuvable ou déjà pris en charge';
  end if;
end;
$$;

-- ─── RPC : inscription self-service (route anonyme, depuis la landing page) ─
-- p_agent_id vient de supabase.auth.signUp() côté client, réalisé juste avant
-- cet appel : on l'utilise directement plutôt que auth.uid()/la session en
-- cours, pour que l'inscription fonctionne même si la confirmation email est
-- activée sur le projet (auth.uid() ne résout alors qu'après confirmation,
-- alors que le compte auth.users, lui, existe déjà immédiatement).
-- Provisionne en une transaction : organisation + agent admin + 1er poste +
-- services par défaut + abonnement (démo Stripe pour l'instant : voir
-- commentaire sur la table abonnements).
create or replace function inscrire_organisation(
  p_agent_id uuid,
  p_nom text,
  p_type text,
  p_adresse text,
  p_email text,
  p_agent_nom text,
  p_plan text,
  p_montant_mensuel_eur numeric default 0
)
returns table (organisation_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_org_id uuid;
begin
  if p_agent_id is null or not exists (select 1 from auth.users u where u.id = p_agent_id) then
    raise exception 'Compte introuvable — créez d''abord le compte utilisateur';
  end if;
  if exists (select 1 from agents ag where ag.id = p_agent_id) then
    raise exception 'Ce compte est déjà rattaché à une organisation';
  end if;
  if p_type not in ('mairie', 'boutique') then
    raise exception 'Type d''organisation invalide';
  end if;
  if coalesce(trim(p_nom), '') = '' then
    raise exception 'Le nom de l''organisation est requis';
  end if;

  insert into organisations (nom, type, adresse, couleur_principale, couleur_secondaire)
  values (
    p_nom, p_type, nullif(trim(p_adresse), ''),
    case when p_type = 'boutique' then '#4f46e5' else '#0f766e' end,
    case when p_type = 'boutique' then '#818cf8' else '#5eead4' end
  )
  returning id into v_org_id;

  insert into agents (id, organisation_id, nom, email, role, statut)
  values (p_agent_id, v_org_id, p_agent_nom, p_email, 'admin', 'actif');

  insert into postes (organisation_id, nom) values (v_org_id, 'Poste 1');

  -- Services par défaut selon le type, pour que le compte soit utilisable
  -- immédiatement (l'admin pourra les modifier depuis le back-office).
  if p_type = 'boutique' then
    insert into services (organisation_id, prefixe_ticket, nom, temps_moyen_min, poids) values
      (v_org_id, 'V', 'Ventes', 6, 1),
      (v_org_id, 'S', 'SAV', 10, 2);
  else
    insert into services (organisation_id, prefixe_ticket, nom, temps_moyen_min, poids) values
      (v_org_id, 'A', 'Accueil', 8, 1);
  end if;

  insert into abonnements (organisation_id, plan, montant_mensuel_eur, statut, stripe_customer_id)
  values (v_org_id, p_plan, coalesce(p_montant_mensuel_eur, 0), 'demo', 'cus_demo_' || substr(v_org_id::text, 1, 8));

  return query select v_org_id;
end;
$$;

-- ─── RPC : appeler le prochain ticket (poste vendeur) ─────────────────────
-- Verrouillage transactionnel : FOR UPDATE sur le poste + FOR UPDATE SKIP LOCKED
-- sur la sélection du ticket, pour empêcher qu'un même ticket soit assigné
-- à deux postes en cas d'appels concurrents (critère d'acceptation §10).
create or replace function appeler_prochain(p_poste_id uuid)
returns tickets
language plpgsql security definer set search_path = public as $$
declare
  v_poste postes;
  v_ticket tickets;
begin
  select * into v_poste from postes where id = p_poste_id and organisation_id = agent_organisation_id()
    for update;

  if not found then
    raise exception 'Poste introuvable';
  end if;

  if v_poste.ticket_en_cours_id is not null then
    raise exception 'Un ticket est déjà en cours sur ce poste';
  end if;

  select t.* into v_ticket
  from tickets t
  join services s on s.id = t.service_id
  where t.organisation_id = v_poste.organisation_id
    and t.statut = 'en_attente'
    and t.service_id in (select jsonb_array_elements_text(v_poste.service_ids)::uuid)
  order by s.poids desc, t.cree_le asc
  for update of t skip locked
  limit 1;

  if not found then
    raise exception 'Aucun ticket en attente pour les services de ce poste';
  end if;

  update tickets set statut = 'en_cours', poste_id = p_poste_id, agent_id = v_poste.agent_id, appele_le = now()
  where id = v_ticket.id
  returning * into v_ticket;

  update postes set ticket_en_cours_id = v_ticket.id where id = p_poste_id;

  return v_ticket;
end;
$$;

-- ─── RPC : aperçu du prochain ticket, sans l'assigner (affichage agent) ───
create or replace function apercu_prochain(p_poste_id uuid)
returns table (id uuid, code text, service_id uuid, motif text, cree_le timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare
  v_poste postes;
begin
  -- Alias "p" obligatoire : cette fonction déclare RETURNS TABLE(id ...), donc "id" seul
  -- serait ambigu entre la colonne postes.id et la variable de sortie "id" de la fonction.
  select * into v_poste from postes p where p.id = p_poste_id and p.organisation_id = agent_organisation_id();
  if not found or v_poste.ticket_en_cours_id is not null then
    return;
  end if;

  return query
  select t.id, t.code, t.service_id, t.motif, t.cree_le
  from tickets t
  join services s on s.id = t.service_id
  where t.organisation_id = v_poste.organisation_id
    and t.statut = 'en_attente'
    and t.service_id in (select jsonb_array_elements_text(v_poste.service_ids)::uuid)
  order by s.poids desc, t.cree_le asc
  limit 1;
end;
$$;

-- ─── RPC : terminer le traitement en cours (poste vendeur) ────────────────
create or replace function terminer_traitement(p_poste_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_poste postes;
begin
  select * into v_poste from postes where id = p_poste_id and organisation_id = agent_organisation_id() for update;
  if not found or v_poste.ticket_en_cours_id is null then
    raise exception 'Aucun ticket en cours sur ce poste';
  end if;

  update tickets set statut = 'termine', termine_le = now() where id = v_poste.ticket_en_cours_id;
  update postes set ticket_en_cours_id = null where id = p_poste_id;
end;
$$;

-- ─── RPC : relancer la notification du client en cours (poste vendeur) ────
-- Ne réassigne rien : touche seulement appele_le, pour permettre à l'agent de
-- rappeler un client qui n'a pas répondu, sans perdre le ticket en cours.
create or replace function rappeler_client(p_poste_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_poste postes;
begin
  select * into v_poste from postes where id = p_poste_id and organisation_id = agent_organisation_id();
  if not found or v_poste.ticket_en_cours_id is null then
    raise exception 'Aucun ticket en cours sur ce poste';
  end if;

  update tickets set appele_le = now() where id = v_poste.ticket_en_cours_id;
end;
$$;

-- ─── RPC : écran de salle (lecture publique, sans données sensibles) ──────
create or replace function salle_affichage(p_organisation_id uuid)
returns table (
  appeles jsonb,
  prochains jsonb
)
language sql stable security definer set search_path = public as $$
  select
    (select coalesce(jsonb_agg(jsonb_build_object('code', t.code, 'poste', p.nom) order by t.appele_le desc), '[]')
       from tickets t join postes p on p.id = t.poste_id
       where t.organisation_id = p_organisation_id and t.statut = 'en_cours'),
    (select coalesce(jsonb_agg(jsonb_build_object('code', t.code) order by t.cree_le asc), '[]')
       from tickets t
       where t.organisation_id = p_organisation_id and t.statut = 'en_attente'
       limit 10);
$$;

-- ─── RPC : statistiques du jour (back-office) ─────────────────────────────
create or replace function stats_jour(p_organisation_id uuid)
returns table (tickets_traites int, tickets_total int, attente_moyenne_min numeric, postes_connectes int)
language sql stable security definer set search_path = public as $$
  select
    count(*) filter (where statut = 'termine')::int,
    count(*)::int,
    coalesce(round(avg(extract(epoch from (appele_le - cree_le)) / 60) filter (where appele_le is not null), 1), 0),
    (select count(*)::int from postes where organisation_id = p_organisation_id and connecte)
  from tickets
  where organisation_id = p_organisation_id and cree_le::date = now()::date;
$$;

-- ─── RPC : alerte "service sans poste connecté" (back-office) ─────────────
create or replace function services_en_alerte(p_organisation_id uuid)
returns table (service_id uuid, service_nom text, tickets_en_attente int, plus_ancien_min int)
language sql stable security definer set search_path = public as $$
  select
    s.id,
    s.nom,
    count(t.id)::int,
    coalesce(extract(epoch from (now() - min(t.cree_le))) / 60, 0)::int
  from services s
  join tickets t on t.service_id = s.id and t.statut = 'en_attente'
  join organisations o on o.id = s.organisation_id
  where s.organisation_id = p_organisation_id
    and not exists (
      select 1 from postes p
      where p.organisation_id = s.organisation_id
        and p.connecte and not p.en_pause
        and p.service_ids @> to_jsonb(s.id::text)
    )
  group by s.id, s.nom, o.alerte_delai_min
  having coalesce(extract(epoch from (now() - min(t.cree_le))) / 60, 0) >= o.alerte_delai_min;
$$;

-- ─── RPC : notes moyennes par service (back-office) ───────────────────────
create or replace function notes_moyennes(p_organisation_id uuid)
returns table (service_id uuid, service_nom text, note_moyenne numeric, nb_avis int)
language sql stable security definer set search_path = public as $$
  select s.id, s.nom, round(avg(t.note), 2), count(t.note)::int
  from services s
  left join tickets t on t.service_id = s.id and t.note is not null
  where s.organisation_id = p_organisation_id
  group by s.id, s.nom
  order by s.nom;
$$;

-- ─── RPC : notes moyennes par vendeur (back-office) ───────────────────────
-- Se base sur tickets.agent_id (figé au moment de l'appel), pas sur
-- postes.agent_id (qui change au fil de la journée) : voir commentaire sur
-- la colonne dans la définition de la table tickets plus haut.
create or replace function notes_moyennes_vendeur(p_organisation_id uuid)
returns table (agent_id uuid, agent_nom text, note_moyenne numeric, nb_avis int)
language sql stable security definer set search_path = public as $$
  select a.id, a.nom, round(avg(t.note), 2), count(t.note)::int
  from agents a
  left join tickets t on t.agent_id = a.id and t.note is not null
  where a.organisation_id = p_organisation_id
  group by a.id, a.nom
  order by a.nom;
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table organisations enable row level security;
alter table services enable row level security;
alter table promotions enable row level security;
alter table agents enable row level security;
alter table postes enable row level security;
alter table tickets enable row level security;

-- organisations : lecture publique limitée aux infos de branding (nécessaire
-- pour l'écran client anonyme et l'écran de salle avant authentification).
create policy organisations_public_read on organisations for select
  using (true);
revoke all on organisations from anon, authenticated;
grant select (id, nom, type, couleur_principale, couleur_secondaire, logo_url) on organisations to anon;
grant select on organisations to authenticated;

create policy organisations_admin_write on organisations for update
  using (id = agent_organisation_id() and agent_role() = 'admin');
-- Le "revoke all" ci-dessus retire aussi UPDATE : sans ce grant, la policy
-- ci-dessus ne sert à rien (Postgres refuse la requête avant même d'évaluer
-- la RLS) et le back-office ne peut jamais enregistrer le branding
-- (logo, couleurs) → "permission denied for table organisations".
grant update (couleur_principale, couleur_secondaire, logo_url) on organisations to authenticated;

-- services : lecture publique (nécessaire pour le choix de service côté client).
create policy services_public_read on services for select
  using (actif = true);
create policy services_agent_read on services for select
  using (organisation_id = agent_organisation_id());
create policy services_admin_write on services for insert with check (organisation_id = agent_organisation_id() and agent_role() = 'admin');
create policy services_admin_update on services for update using (organisation_id = agent_organisation_id() and agent_role() = 'admin');
create policy services_admin_delete on services for delete using (organisation_id = agent_organisation_id() and agent_role() = 'admin');
grant select on services to anon;
-- Comme pour organisations : les policies insert/update/delete ci-dessus sont
-- inertes sans le grant de base correspondant pour authenticated.
grant insert, update, delete on services to authenticated;

-- promotions : lecture publique des messages actifs (storie affichée pendant l'attente),
-- écriture réservée à l'admin de l'organisation.
create policy promotions_public_read on promotions for select
  using (actif = true);
create policy promotions_agent_read on promotions for select
  using (organisation_id = agent_organisation_id());
create policy promotions_admin_write on promotions for insert with check (organisation_id = agent_organisation_id() and agent_role() = 'admin');
create policy promotions_admin_update on promotions for update using (organisation_id = agent_organisation_id() and agent_role() = 'admin');
create policy promotions_admin_delete on promotions for delete using (organisation_id = agent_organisation_id() and agent_role() = 'admin');
grant select on promotions to anon;
grant insert, update, delete on promotions to authenticated;

-- agents : un agent ne voit que les agents de sa propre organisation.
create policy agents_self_org_read on agents for select using (organisation_id = agent_organisation_id());
create policy agents_admin_write on agents for update using (organisation_id = agent_organisation_id() and agent_role() = 'admin');
create policy agents_admin_insert on agents for insert with check (organisation_id = agent_organisation_id() and agent_role() = 'admin');

-- postes : lecture/écriture réservées aux agents de l'organisation.
create policy postes_org_read on postes for select using (organisation_id = agent_organisation_id());
create policy postes_org_write on postes for update using (organisation_id = agent_organisation_id());
create policy postes_admin_insert on postes for insert with check (organisation_id = agent_organisation_id() and agent_role() = 'admin');
create policy postes_admin_delete on postes for delete using (organisation_id = agent_organisation_id() and agent_role() = 'admin');

-- tickets : aucun accès direct table pour anon/authenticated — tout passe par
-- les fonctions SECURITY DEFINER ci-dessus (creer_ticket, ticket_status,
-- appeler_prochain, ...), qui vérifient elles-mêmes l'organisation/le token.
-- Seuls les agents authentifiés de l'organisation peuvent lire les tickets
-- (utile pour les stats et le back-office).
create policy tickets_org_read on tickets for select using (organisation_id = agent_organisation_id());
revoke all on tickets from anon;

-- abonnements : lecture réservée à l'admin de l'organisation. Écriture uniquement
-- via inscrire_organisation() (SECURITY DEFINER, contourne la RLS) — aucune
-- policy insert/update/delete ici, la table n'est jamais modifiée directement.
alter table abonnements enable row level security;
create policy abonnements_admin_read on abonnements for select
  using (organisation_id = agent_organisation_id() and agent_role() = 'admin');

-- ============================================================================
-- Realtime : sans ceci, les abonnements postgres_changes (src/lib/api.js
-- subscribeToOrg) ne se déclenchent JAMAIS, silencieusement — ni la
-- notification client ("c'est votre tour"), ni le rafraîchissement du poste
-- agent quand un ticket arrive. Une table créée par le SQL Editor n'est pas
-- ajoutée automatiquement à la publication realtime de Supabase.
-- ============================================================================

alter publication supabase_realtime add table tickets, postes;

-- ============================================================================
-- Storage : upload du logo par organisation (back-office § Identité visuelle)
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Lecture publique (le logo doit s'afficher dans les 4 interfaces, y compris anonymes).
create policy "logos_public_read" on storage.objects for select
  using (bucket_id = 'logos');

-- Écriture réservée à l'admin de l'organisation, dans son propre dossier
-- (le chemin uploadé est toujours "<organisation_id>/logo-*.<ext>", voir src/lib/api.js).
create policy "logos_admin_insert" on storage.objects for insert
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = agent_organisation_id()::text and agent_role() = 'admin');

create policy "logos_admin_update" on storage.objects for update
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = agent_organisation_id()::text and agent_role() = 'admin');

create policy "logos_admin_delete" on storage.objects for delete
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = agent_organisation_id()::text and agent_role() = 'admin');

-- ============================================================================
-- Données de démo (une organisation boutique + une mairie, pour valider
-- l'isolation multi-tenant dès le premier déploiement)
-- ============================================================================

insert into organisations (id, nom, type, couleur_principale, couleur_secondaire, adresse) values
  ('00000000-0000-0000-0000-000000000001', 'Mobile Store Bastille', 'boutique', '#ea580c', '#fb923c', '12 rue de la Roquette, 75011 Paris'),
  ('00000000-0000-0000-0000-000000000002', 'Mairie de Villeneuve', 'mairie', '#0f766e', '#5eead4', '1 place de la Mairie, 33140 Villeneuve');

insert into postes (organisation_id, nom) values
  ('00000000-0000-0000-0000-000000000001', 'Poste 1'),
  ('00000000-0000-0000-0000-000000000001', 'Poste 2'),
  ('00000000-0000-0000-0000-000000000002', 'Guichet 1');

insert into services (organisation_id, prefixe_ticket, nom, temps_moyen_min, poids, documents_requis, motifs_predefinis) values
  ('00000000-0000-0000-0000-000000000001', 'V', 'Ventes', 6, 1, '["Pièce d''identité"]', '["Nouveau forfait", "Changement de forfait", "Nouvel appareil"]'),
  ('00000000-0000-0000-0000-000000000001', 'S', 'SAV', 10, 3, '["Facture ou preuve d''achat", "Pièce d''identité"]', '["Écran cassé", "Batterie", "Panne réseau", "Autre panne"]'),
  ('00000000-0000-0000-0000-000000000001', 'F', 'Fidélité / Résiliation', 8, 2, '["Pièce d''identité"]', '["Résiliation", "Portabilité", "Réclamation"]'),
  ('00000000-0000-0000-0000-000000000002', 'E', 'État civil', 12, 1, '["Livret de famille", "Pièce d''identité"]', '[]'),
  ('00000000-0000-0000-0000-000000000002', 'U', 'Urbanisme', 15, 1, '["Dossier de permis"]', '[]');

insert into promotions (organisation_id, type, titre, texte, options, ordre) values
  ('00000000-0000-0000-0000-000000000001', 'message', '📶 Offre du mois', 'Forfait 100 Go à 9,99€/mois pour toute souscription en boutique aujourd''hui.', '[]', 1),
  ('00000000-0000-0000-0000-000000000001', 'message', '🔧 Le saviez-vous ?', 'Un diagnostic batterie est offert pour tout SAV smartphone, sans rendez-vous.', '[]', 2),
  ('00000000-0000-0000-0000-000000000001', 'quiz', '🎮 Quiz éclair', 'Quel geste économise le plus de batterie au quotidien ?',
    '[{"texte":"Fermer les applications en arrière-plan","correcte":false},{"texte":"Baisser la luminosité de l''écran","correcte":true},{"texte":"Activer le mode avion","correcte":false}]', 3),
  ('00000000-0000-0000-0000-000000000001', 'message', '🎁 Parrainage', 'Parrainez un proche : 20€ offerts sur votre prochaine facture.', '[]', 4),
  ('00000000-0000-0000-0000-000000000002', 'message', 'ℹ️ Information', 'Pensez à vous munir d''une pièce d''identité valide pour toute démarche.', '[]', 1),
  ('00000000-0000-0000-0000-000000000002', 'quiz', '🎮 Quiz éclair', 'Lequel de ces documents n''est PAS nécessaire pour une carte d''identité ?',
    '[{"texte":"Une photo d''identité récente","correcte":false},{"texte":"Un justificatif de domicile","correcte":false},{"texte":"Un relevé bancaire","correcte":true}]', 2),
  ('00000000-0000-0000-0000-000000000002', 'message', '🕑 Horaires d''été', 'L''accueil ferme à 16h30 le vendredi durant l''été.', '[]', 3),
  ('00000000-0000-0000-0000-000000000002', 'message', '💻 Démarche en ligne', 'Certaines démarches sont réalisables directement sur service-public.fr.', '[]', 4);
