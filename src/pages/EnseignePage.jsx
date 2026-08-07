import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { PageShell, Card, Button, LoadingScreen, EmptyState } from '../components/ui.jsx'

/** Vue consolidée en lecture seule, tous points de vente d'une même enseigne — pour
 * un admin réseau, pas pour la gestion quotidienne d'une boutique. Rattacher une
 * organisation/un agent à une enseigne se fait en base pour cette première version
 * (voir commentaire sur la table enseignes dans schema.sql), pas d'UI dédiée ici. */
export default function EnseignePage() {
  const { agent, loading: authLoading, logout } = useAuth()
  const [lignes, setLignes] = useState(null)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!agent?.enseigne_id) return
    try {
      setLignes(await api.statsEnseigne(agent.enseigne_id))
    } catch (err) {
      setError(err.message)
    }
  }, [agent])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const poll = setInterval(refresh, 30000)
    return () => clearInterval(poll)
  }, [refresh])

  if (authLoading) return <LoadingScreen />

  if (!agent?.enseigne_id) {
    return (
      <PageShell title="Vue enseigne" subtitle="Accès non configuré">
        <Card className="center">
          <p>Votre compte n’est rattaché à aucune enseigne multi-boutiques.</p>
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            Contactez votre administrateur pour rattacher votre compte à une enseigne.
          </p>
          <Button as={Link} to="/" block style={{ marginTop: 12 }}>Retour à l’accueil</Button>
        </Card>
      </PageShell>
    )
  }

  const totaux = lignes?.reduce(
    (acc, l) => ({
      tickets_traites: acc.tickets_traites + l.tickets_traites,
      tickets_total: acc.tickets_total + l.tickets_total,
      agents_connectes: acc.agents_connectes + l.agents_connectes,
    }),
    { tickets_traites: 0, tickets_total: 0, agents_connectes: 0 }
  )

  return (
    <PageShell title="Vue enseigne" subtitle={`${agent.nom} — tous les points de vente`} wide>
      <div className="row" style={{ marginBottom: 18 }}>
        <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>Aujourd’hui, tous points de vente confondus — actualisé automatiquement.</p>
        <Button sm variant="danger" onClick={logout}>Déconnexion</Button>
      </div>

      {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}

      {totaux && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 18 }}>
          <div className="stat-tile"><div className="value">{totaux.tickets_traites}</div><div className="label">Tickets traités (réseau)</div></div>
          <div className="stat-tile"><div className="value">{totaux.tickets_total}</div><div className="label">Tickets créés (réseau)</div></div>
          <div className="stat-tile"><div className="value">{totaux.agents_connectes}</div><div className="label">Vendeurs connectés (réseau)</div></div>
        </div>
      )}

      <Card>
        <h3 style={{ marginTop: 0 }}>Détail par point de vente</h3>
        {lignes === null ? (
          <p className="muted" style={{ fontSize: '0.85rem' }}>Chargement…</p>
        ) : lignes.length === 0 ? (
          <EmptyState icon="🏬">Aucun point de vente rattaché à cette enseigne.</EmptyState>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Point de vente</th><th>Traités</th><th>Créés</th><th>Attente moy.</th><th>Vendeurs connectés</th></tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.organisation_id}>
                  <td><strong>{l.organisation_nom}</strong></td>
                  <td>{l.tickets_traites}</td>
                  <td>{l.tickets_total}</td>
                  <td>{l.attente_moyenne_min} min</td>
                  <td>{l.postes_connectes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </PageShell>
  )
}
