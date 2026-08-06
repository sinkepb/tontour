import { Link } from 'react-router-dom'
import { CONTACT_EMAIL } from '../../lib/plans.js'

/** Marque visuellement les informations à saisir par l'éditeur du site (identité
 * légale) avant mise en ligne réelle — pas du texte juridique inventé. */
export function Placeholder({ children }) {
  return <strong className="placeholder">[À COMPLÉTER — {children}]</strong>
}

/** Layout partagé par les 4 pages légales — même en-tête/pied que la landing
 * marketing (`.site`, `.site-header`, `.site-footer`), colonne de lecture plus
 * étroite que les sections marketing pour du texte long. */
export default function LegalLayout({ title, updated, children }) {
  return (
    <div className="site">
      <header className="site-header">
        <Link to="/" className="brand link-plain">
          <span className="brand-mark">🎫</span>
          TonTour
        </Link>
        <nav className="site-nav">
          <Link to="/mentions-legales">Mentions légales</Link>
          <Link to="/cgu">CGU</Link>
          <Link to="/cgv">CGV</Link>
          <Link to="/confidentialite">Confidentialité</Link>
        </nav>
        <div className="row" style={{ marginLeft: 'auto', width: 'auto' }}>
          <Link to="/" className="link-plain" style={{ fontWeight: 600, fontSize: '0.88rem' }}>← Retour à l’accueil</Link>
        </div>
      </header>

      <section className="site-section">
        <div className="legal-content">
          <h1>{title}</h1>
          {updated && <p className="muted" style={{ fontSize: '0.82rem', marginTop: -8, marginBottom: 32 }}>Dernière mise à jour : {updated}</p>}
          {children}
        </div>
      </section>

      <footer className="site-footer">
        <p>
          TonTour — File d’attente dématérialisée · <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </footer>
    </div>
  )
}
