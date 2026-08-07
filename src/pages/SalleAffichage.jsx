import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { LoadingScreen, EmptyState, Button } from '../components/ui.jsx'

export default function SalleAffichage() {
  const { orgId } = useParams()
  const [org, setOrg] = useState(null)
  const [orgError, setOrgError] = useState(false)
  const [data, setData] = useState({ appeles: [], prochains: [] })
  const [now, setNow] = useState(new Date())

  const chargerOrg = useCallback(() => {
    setOrgError(false)
    api.getOrganisation(orgId).then(setOrg).catch(() => setOrgError(true))
  }, [orgId])

  const refresh = useCallback(async () => {
    try {
      setData(await api.salleAffichage(orgId))
    } catch {
      // Cet écran tourne en continu, sans surveillance humaine (affichage boutique) :
      // une erreur ponctuelle ne doit pas figer l'affichage, le prochain poll (10s)
      // réessaiera de lui-même.
    }
  }, [orgId])

  useEffect(() => {
    chargerOrg()
    refresh()
  }, [orgId, refresh, chargerOrg])

  // Pas d'abonnement Realtime ici : cet écran est public/anonyme (pas de RequireRole
  // sur cette route), et la table tickets n'accorde aucun accès à anon (RLS) — un
  // abonnement postgres_changes anonyme ne recevrait donc jamais rien (vérifié en
  // audit pré-production). Le polling 10s est le seul mécanisme de mise à jour, pas
  // un filet de sécurité secondaire.
  useEffect(() => {
    const poll = setInterval(refresh, 10000)
    return () => clearInterval(poll)
  }, [refresh])

  // Écran d'affichage boutique, sans surveillance humaine : si le premier chargement
  // de l'organisation échoue, on retente tout seul plutôt que de compter sur
  // quelqu'un pour cliquer "Réessayer" sur un écran que personne ne regarde.
  useEffect(() => {
    if (!orgError) return
    const retry = setInterval(chargerOrg, 10000)
    return () => clearInterval(retry)
  }, [orgError, chargerOrg])

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(clock)
  }, [])

  if (orgError) {
    return (
      <div className="loading-screen">
        <div className="center" style={{ maxWidth: 320, padding: 24 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</div>
          <p style={{ fontWeight: 700, margin: '0 0 6px' }}>Impossible de charger cet écran</p>
          <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 16 }}>Vérifiez la connexion internet et réessayez.</p>
          <Button onClick={chargerOrg}>Réessayer</Button>
        </div>
      </div>
    )
  }

  if (!org) return <LoadingScreen />

  const style = { '--org-primary': org.couleur_principale, '--org-secondary': org.couleur_secondaire }

  return (
    <div className="shell" style={style}>
      <div className="topbar">
        <div className="topbar-logo">{org.logo_url ? <img src={org.logo_url} alt="" /> : org.nom.slice(0, 1)}</div>
        <div>
          <div className="topbar-title">{org.nom} — Écran de salle</div>
          <div className="topbar-sub row" style={{ justifyContent: 'flex-start', gap: 6 }}>
            <span style={{ width: 7, height: 7, background: 'var(--success)', animation: 'pulseDot 1.8s ease infinite' }} />
            Mise à jour automatique
          </div>
        </div>
        <div style={{ marginLeft: 'auto', fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '1.1rem', opacity: 0.95 }}>
          {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      <div className="main main-wide">
        <h2 style={{ marginBottom: 12 }}>📣 Tickets appelés</h2>
        {data.appeles.length === 0 && (
          <div className="card">
            <EmptyState icon="🔈">Aucun ticket appelé pour le moment.</EmptyState>
          </div>
        )}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {data.appeles.map((t) => (
            <div className="salle-called" key={t.code + t.agent}>
              <div className="code">{t.code}</div>
              <div className="agent">→ {t.agent}</div>
            </div>
          ))}
        </div>

        <h2 style={{ margin: '32px 0 12px' }}>⏳ Prochains tickets</h2>
        {data.prochains.length === 0 ? (
          <div className="card">
            <EmptyState icon="✅">File d’attente vide.</EmptyState>
          </div>
        ) : (
          <div className="next-list">
            {data.prochains.map((t) => (
              <div className="next-chip" key={t.code}>{t.code}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
