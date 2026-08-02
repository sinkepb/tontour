import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { LoadingScreen, EmptyState } from '../components/ui.jsx'

export default function SalleAffichage() {
  const { orgId } = useParams()
  const [org, setOrg] = useState(null)
  const [data, setData] = useState({ appeles: [], prochains: [] })
  const [now, setNow] = useState(new Date())

  const refresh = useCallback(async () => {
    setData(await api.salleAffichage(orgId))
  }, [orgId])

  useEffect(() => {
    api.getOrganisation(orgId).then(setOrg)
    refresh()
  }, [orgId, refresh])

  useEffect(() => {
    const unsubscribe = api.subscribeToOrg(orgId, refresh)
    // filet de sécurité en cas de coupure réseau du temps réel (résilience §9) : re-poll périodique
    const poll = setInterval(refresh, 10000)
    return () => {
      unsubscribe()
      clearInterval(poll)
    }
  }, [orgId, refresh])

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(clock)
  }, [])

  if (!org) return <LoadingScreen />

  const style = { '--org-primary': org.couleur_principale, '--org-secondary': org.couleur_secondaire }

  return (
    <div className="shell" style={style}>
      <div className="topbar">
        <div className="topbar-logo">{org.logo_url ? <img src={org.logo_url} alt="" /> : org.nom.slice(0, 1)}</div>
        <div>
          <div className="topbar-title">{org.nom} — Écran de salle</div>
          <div className="topbar-sub row" style={{ justifyContent: 'flex-start', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', animation: 'pulseDot 1.8s ease infinite' }} />
            Mise à jour en temps réel
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
            <div className="salle-called" key={t.code + t.poste}>
              <div className="code">{t.code}</div>
              <div className="poste">→ {t.poste}</div>
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
