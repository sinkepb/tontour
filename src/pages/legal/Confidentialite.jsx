import LegalLayout, { Placeholder } from './LegalLayout.jsx'
import { CONTACT_EMAIL } from '../../lib/plans.js'

export default function Confidentialite() {
  return (
    <LegalLayout title="Politique de confidentialité" updated="À finaliser avant mise en ligne réelle">
      <p className="muted">
        Cette politique décrit les données réellement traitées par TonTour, leur finalité et leur durée de
        conservation. Elle couvre les deux publics de l’application : le client final (citoyen) et le personnel
        des organisations (boutiques, mairies).
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>
        <Placeholder>raison sociale</Placeholder>, éditeur de TonTour — voir les{' '}
        <a href="/mentions-legales">mentions légales</a>. Pour toute question relative à vos données :{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
      <p>
        Pour les données de ses propres clients, chaque organisation utilisatrice de TonTour (boutique, mairie)
        est responsable de traitement ; TonTour agit en tant que sous-traitant technique au sens du RGPD.
      </p>

      <h2>2. Données collectées côté client (prise de ticket)</h2>
      <p>Aucun compte n’est nécessaire pour prendre un ticket. Les seules données concernées sont :</p>
      <ul>
        <li><strong>Service souhaité</strong> et <strong>motif de visite</strong> (optionnel, texte libre) — utilisés pour orienter le ticket dans la bonne file.</li>
        <li><strong>Numéro de téléphone</strong> (optionnel) — fourni volontairement, affiché uniquement dans l’historique de recherche du back-office de l’organisation concernée.</li>
        <li><strong>Priorité signalée</strong> (personne à mobilité réduite, urgence), si cochée par le client.</li>
        <li><strong>Note et commentaire</strong> laissés après le passage (optionnel).</li>
      </ul>
      <p>
        <strong>Le téléphone et le motif sont supprimés automatiquement 24h après le traitement du ticket</strong>{' '}
        (purge quotidienne programmée). Le code du ticket, son statut, ses horodatages et la note/le commentaire
        sont conservés plus longtemps, pour permettre à l’organisation de suivre ses statistiques d’activité.
      </p>

      <h2>3. Données collectées côté personnel (agents, administrateurs)</h2>
      <ul>
        <li><strong>Nom et adresse email</strong> — création du compte, affichage dans le back-office.</li>
        <li><strong>Mot de passe</strong> — jamais stocké par TonTour : géré directement par Supabase Auth (hachage, sessions), notre prestataire d’authentification.</li>
        <li><strong>Services attribués, statistiques d’activité</strong> — usage interne au back-office de l’organisation.</li>
      </ul>

      <h2>4. Isolation entre organisations</h2>
      <p>
        TonTour héberge plusieurs organisations indépendantes (boutiques, mairies) sur la même infrastructure.
        Une organisation ne peut jamais accéder aux données d’une autre : cette isolation est appliquée au
        niveau de la base de données elle-même (Row Level Security PostgreSQL), pas seulement dans l’interface,
        et a fait l’objet d’un audit de sécurité dédié.
      </p>

      <h2>5. Destinataires des données</h2>
      <ul>
        <li>L’organisation concernée (son personnel autorisé), pour les données de ses propres clients.</li>
        <li><strong>Supabase Inc.</strong> — hébergement de la base de données, authentification, stockage de fichiers (infrastructure européenne, région Irlande).</li>
        <li><strong>Vercel Inc.</strong> — hébergement de l’application web.</li>
        <li>Aucune donnée n’est vendue, louée, ou transmise à des fins publicitaires.</li>
      </ul>

      <h2>6. Durées de conservation</h2>
      <ul>
        <li>Téléphone et motif d’un ticket : <strong>24 heures</strong> après son traitement.</li>
        <li>Autres données de ticket (code, statut, note, commentaire, horodatages) : durée de vie du compte de l’organisation.</li>
        <li>Compte agent/administrateur : durée d’activité au sein de l’organisation, puis suppression sur demande.</li>
      </ul>

      <h2>7. Cookies et traceurs</h2>
      <p>
        TonTour <strong>n’utilise aucun cookie de suivi ou publicitaire</strong>. La session du personnel
        connecté est maintenue via le stockage local du navigateur (pas de cookie), nécessaire au fonctionnement
        du service.
      </p>

      <h2>8. Sécurité</h2>
      <p>
        Les échanges sont chiffrés (HTTPS). L’accès aux données est protégé par authentification et par
        l’isolation stricte entre organisations décrite au point 4. Aucune clé d’accès sensible n’est exposée
        côté client.
      </p>

      <h2>9. Vos droits</h2>
      <p>
        Conformément au RGPD, vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation,
        d’opposition et de portabilité sur vos données. Pour l’exercer :
      </p>
      <ul>
        <li>Concernant un ticket pris auprès d’une organisation : contactez directement cette organisation.</li>
        <li>Concernant un compte agent/administrateur ou une question générale : <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</li>
      </ul>
      <p>
        Vous disposez également du droit d’introduire une réclamation auprès de la CNIL (
        <a href="https://www.cnil.fr" target="_blank" rel="noreferrer">cnil.fr</a>).
      </p>

      <h2>10. Modification de cette politique</h2>
      <p>
        Cette politique peut être mise à jour ; la date de dernière modification figure en haut de page.
      </p>
    </LegalLayout>
  )
}
