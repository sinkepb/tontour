import LegalLayout, { Placeholder } from './LegalLayout.jsx'
import { CONTACT_EMAIL } from '../../lib/plans.js'

export default function MentionsLegales() {
  return (
    <LegalLayout title="Mentions légales" updated="À finaliser avant mise en ligne réelle">
      <h2>1. Éditeur du site</h2>
      <p>
        Le site et l’application TonTour sont édités par <Placeholder>raison sociale</Placeholder>,{' '}
        <Placeholder>forme juridique (SAS, auto-entreprise…)</Placeholder>, immatriculée sous le numéro{' '}
        <Placeholder>SIRET</Placeholder>, dont le siège social est situé <Placeholder>adresse complète</Placeholder>.
      </p>
      <p>
        Directeur de la publication : <Placeholder>nom du responsable</Placeholder>.<br />
        Contact : <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>

      <h2>2. Hébergement</h2>
      <p>
        L’application (interface web) est hébergée par <strong>Vercel Inc.</strong> (vercel.com).
      </p>
      <p>
        La base de données, l’authentification et le stockage de fichiers sont hébergés par{' '}
        <strong>Supabase Inc.</strong> (supabase.com), sur une infrastructure européenne (région Irlande, eu-west-1).
      </p>

      <h2>3. Propriété intellectuelle</h2>
      <p>
        L’ensemble des éléments du site (textes, graphismes, logo, code source) est protégé par le droit d’auteur.
        Toute reproduction, représentation ou adaptation, totale ou partielle, sans autorisation préalable de
        l’éditeur est interdite, sous réserve des exceptions prévues par le Code de la propriété intellectuelle.
      </p>

      <h2>4. Responsabilité</h2>
      <p>
        L’éditeur s’efforce d’assurer l’exactitude des informations diffusées sur le site et la disponibilité du
        service, sans garantie de résultat. L’éditeur ne saurait être tenu responsable des interruptions de
        service, des erreurs ou omissions, ni des dommages résultant d’une intrusion frauduleuse d’un tiers ayant
        entraîné une modification des informations mises à disposition.
      </p>

      <h2>5. Données personnelles</h2>
      <p>
        Le traitement des données personnelles collectées via TonTour est détaillé dans la{' '}
        <a href="/confidentialite">politique de confidentialité</a>.
      </p>

      <h2>6. Contact</h2>
      <p>
        Pour toute question relative aux présentes mentions légales :{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </LegalLayout>
  )
}
