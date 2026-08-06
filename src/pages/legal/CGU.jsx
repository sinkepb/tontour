import LegalLayout, { Placeholder } from './LegalLayout.jsx'
import { CONTACT_EMAIL } from '../../lib/plans.js'

export default function CGU() {
  return (
    <LegalLayout title="Conditions générales d’utilisation" updated="À finaliser avant mise en ligne réelle">
      <p className="muted">
        Ces conditions s’appliquent au parcours <strong>client</strong> : scanner un QR code pour obtenir un
        ticket de file d’attente dématérialisé. Elles ne concernent pas l’abonnement des organisations
        (boutiques, mairies) à la plateforme — voir les <a href="/cgv">CGV</a> pour ce volet.
      </p>

      <h2>1. Objet</h2>
      <p>
        TonTour est un service permettant à un client de prendre un ticket de file d’attente en scannant le QR
        code affiché dans un point de vente ou un accueil, sans borne physique ni ticket papier. Le téléphone du
        client fait office de ticket : il affiche sa position dans la file, son temps d’attente estimé, et reçoit
        une notification (vibration, notification web) lorsque c’est son tour.
      </p>

      <h2>2. Accès au service</h2>
      <p>
        L’utilisation de TonTour côté client est <strong>gratuite</strong> et ne nécessite <strong>aucune
        création de compte</strong>. Les seules données transmises sont celles saisies volontairement lors de la
        prise de ticket (service souhaité, motif optionnel, numéro de téléphone optionnel).
      </p>

      <h2>3. Fonctionnement et limites</h2>
      <ul>
        <li>La position affichée et le temps d’attente estimé sont des indications, recalculées en continu, et peuvent varier selon l’activité réelle du point de vente.</li>
        <li>La notification de passage repose sur la notification web du navigateur et/ou la vibration de l’appareil : elle peut ne pas se déclencher si le navigateur est fermé, les notifications désactivées, la batterie de l’appareil épuisée, ou en cas de coupure réseau. Il est recommandé de garder la page ouverte (elle peut rester en arrière-plan) pendant l’attente.</li>
        <li>Un ticket peut être annulé à tout moment par le client tant qu’il n’a pas été appelé.</li>
        <li>Une priorité spéciale (personne à mobilité réduite, urgence) peut être signalée par le client lors de la prise de ticket ; elle est appliquée automatiquement dans l’ordre de passage.</li>
      </ul>

      <h2>4. Obligations de l’utilisateur</h2>
      <p>
        Le client s’engage à faire un usage loyal du service : ne pas prendre plusieurs tickets simultanément
        sans motif légitime, ne pas tenter de contourner les mécanismes de file d’attente, et fournir des
        informations exactes lorsqu’il en communique (motif, téléphone).
      </p>

      <h2>5. Disponibilité du service</h2>
      <p>
        TonTour met en œuvre des moyens raisonnables pour assurer la disponibilité et le bon fonctionnement du
        service, sans garantie de continuité absolue. En cas d’indisponibilité technique, l’organisation
        (boutique, mairie) reste responsable de l’accueil de ses visiteurs par ses moyens habituels.
      </p>

      <h2>6. Responsabilité</h2>
      <p>
        TonTour ne saurait être tenu responsable des conséquences d’une notification non reçue par le client
        (problème réseau, navigateur, appareil) ni des désagréments liés à une estimation de temps d’attente
        s’avérant inexacte compte tenu de l’imprévisibilité de la fréquentation réelle.
      </p>

      <h2>7. Modification des présentes conditions</h2>
      <p>
        L’éditeur se réserve le droit de modifier les présentes CGU à tout moment. La version applicable est
        celle en vigueur au moment de l’utilisation du service.
      </p>

      <h2>8. Droit applicable</h2>
      <p>
        Les présentes conditions sont soumises au droit français. Éditeur : <Placeholder>raison sociale</Placeholder>{' '}
        — voir les <a href="/mentions-legales">mentions légales</a>. Contact :{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </LegalLayout>
  )
}
