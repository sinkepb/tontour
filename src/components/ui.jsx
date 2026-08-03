import { Link } from 'react-router-dom'

export function Button({ variant = 'primary', block, sm, as: As = 'button', className = '', ...props }) {
  const cls = ['btn', `btn-${variant}`, block && 'btn-block', sm && 'btn-sm', className].filter(Boolean).join(' ')
  return <As className={cls} {...props} />
}

export function Card({ children, className = '', ...props }) {
  return (
    <div className={`card ${className}`} {...props}>
      {children}
    </div>
  )
}

export function Badge({ children, variant = 'muted' }) {
  return <span className={`badge badge-${variant}`}>{children}</span>
}

export function Field({ label, children }) {
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      {children}
    </div>
  )
}

const STATUT_BADGE = {
  en_attente: ['En attente', 'warning'],
  en_cours: ['En cours', 'primary'],
  termine: ['Terminé', 'success'],
  annule: ['Annulé', 'danger'],
  absent: ['Absent', 'danger'],
}

export function StatutBadge({ statut }) {
  const [label, variant] = STATUT_BADGE[statut] || [statut, 'muted']
  return <Badge variant={variant}>{label}</Badge>
}

/** Cercle avec initiale(s) — agents, organisations, points de vente. */
export function Avatar({ label, large }) {
  return <span className={`avatar ${large ? 'avatar-lg' : ''}`}>{(label || '?').trim().slice(0, 1).toUpperCase()}</span>
}

/** Carré arrondi avec un emoji/icône et un fond teinté — stat tiles, listes de fonctionnalités. */
export function IconBadge({ icon, tint = 'var(--org-primary)' }) {
  return (
    <span className="icon-badge" style={{ background: `color-mix(in srgb, ${tint} 15%, white)`, color: tint }}>
      {icon}
    </span>
  )
}

export function Spinner() {
  return <div className="spinner" />
}

/** Écran de chargement plein cadre — affiché le temps de récupérer l'organisation, plutôt qu'un flash blanc. */
export function LoadingScreen() {
  return (
    <div className="loading-screen">
      <Spinner />
    </div>
  )
}

export function EmptyState({ icon = '📭', children }) {
  return (
    <div className="empty-state">
      <div className="icon">{icon}</div>
      <div>{children}</div>
    </div>
  )
}

/** Applique le branding (couleurs + logo) de l'organisation et affiche l'entête. */
export function PageShell({ organisation, title, subtitle, backTo, wide, children }) {
  const style = organisation
    ? { '--org-primary': organisation.couleur_principale, '--org-secondary': organisation.couleur_secondaire }
    : {}
  return (
    <div className="shell" style={style}>
      <div className="topbar">
        <div className="topbar-logo">
          {organisation?.logo_url ? <img src={organisation.logo_url} alt="" /> : (organisation?.nom || 'G').slice(0, 1)}
        </div>
        <div>
          <div className="topbar-title">{title || organisation?.nom || 'TonTour'}</div>
          {subtitle && <div className="topbar-sub">{subtitle}</div>}
        </div>
        {backTo && (
          <Link to={backTo} className="link-plain" style={{ marginLeft: 'auto', fontSize: '0.85rem', opacity: 0.9, fontWeight: 600 }}>
            ← Retour
          </Link>
        )}
      </div>
      <div className={`main ${wide ? 'main-wide' : ''}`}>{children}</div>
    </div>
  )
}
