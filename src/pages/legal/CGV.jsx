import LegalLayout, { Placeholder } from './LegalLayout.jsx'
import { CONTACT_EMAIL } from '../../lib/plans.js'

export default function CGV() {
  return (
    <LegalLayout title="Conditions générales de vente" updated="À finaliser avant mise en ligne réelle">
      <p className="muted">
        Ces conditions s’appliquent à l’abonnement souscrit par une <strong>organisation</strong> (boutique,
        mairie…) pour utiliser la plateforme TonTour. Elles ne concernent pas le client final qui prend un
        ticket — voir les <a href="/cgu">CGU</a> pour ce volet.
      </p>

      <h2>1. Objet</h2>
      <p>
        Les présentes conditions générales de vente régissent la souscription à un abonnement donnant accès à la
        plateforme TonTour (gestion de file d’attente dématérialisée, back-office, statistiques) par une
        organisation cliente.
      </p>

      <h2>2. Offres et tarifs</h2>
      <p>
        Les offres et tarifs en vigueur sont présentés sur la page d’accueil du site. L’offre <strong>Starter</strong>{' '}
        est gratuite et permet de tester le service avec un point de vente. Les offres <strong>Pro</strong> et{' '}
        <strong>Enseigne</strong> sont actuellement <strong>indicatives</strong> : leur mise en production
        (facturation réelle, moyens de paiement) est en cours de finalisation — toute souscription payante fait
        l’objet d’un échange préalable avec l’équipe TonTour à <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>3. Souscription</h2>
      <p>
        La souscription à l’offre Starter se fait en libre-service depuis le site (création de l’organisation,
        du compte administrateur). Les offres Pro et Enseigne sont souscrites après contact avec l’équipe
        commerciale.
      </p>

      <h2>4. Durée et résiliation</h2>
      <p>
        L’abonnement est sans engagement de durée minimale, sauf accord contraire mentionné au devis. La
        résiliation s’effectue en contactant <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. À la
        résiliation, l’accès au back-office est suspendu ; les données sont conservées selon les délais indiqués
        dans la <a href="/confidentialite">politique de confidentialité</a>, puis supprimées sur demande.
      </p>

      <h2>5. Prix et paiement</h2>
      <p>
        Les prix sont indiqués en euros. Les modalités de facturation et de paiement des offres payantes
        (méthode, périodicité, moyens acceptés) seront précisées au moment de l’activation du paiement en
        ligne, aujourd’hui non encore ouvert au public.
      </p>

      <h2>6. Responsabilité et niveau de service</h2>
      <p>
        TonTour met en œuvre des moyens raisonnables pour assurer la disponibilité et la fiabilité du service
        (obligation de moyens). Aucun engagement de niveau de service (SLA) contractuel n’est garanti à ce
        stade ; il pourra être formalisé pour les offres Pro/Enseigne.
      </p>

      <h2>7. Protection des données</h2>
      <p>
        Le traitement des données de l’organisation et de ses clients est détaillé dans la{' '}
        <a href="/confidentialite">politique de confidentialité</a>.
      </p>

      <h2>8. Droit de rétractation</h2>
      <p>
        Conformément à l’article L221-3 du Code de la consommation, le droit de rétractation ne s’applique pas
        aux contrats conclus entre professionnels dans le cadre de leur activité principale.
      </p>

      <h2>9. Droit applicable et litiges</h2>
      <p>
        Les présentes CGV sont soumises au droit français. Tout litige relève, à défaut de résolution amiable,
        des tribunaux compétents. Éditeur : <Placeholder>raison sociale</Placeholder> — voir les{' '}
        <a href="/mentions-legales">mentions légales</a>.
      </p>
    </LegalLayout>
  )
}
