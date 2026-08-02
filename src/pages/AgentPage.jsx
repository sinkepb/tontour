import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { PageShell, Card, Button, Badge, Avatar, LoadingScreen, EmptyState } from '../components/ui.jsx'

function posteStorageKey(orgId, agentId) {
  return `tontour_poste_${orgId}_${agentId}`
}

export default function AgentPage() {
  const { orgId } = useParams()
  const { agent, logout } = useAuth()
  const navigate = useNavigate()

  const [org, setOrg] = useState(null)
  const [services, setServices] = useState([])
  const [postes, setPostes] = useState([])
  const [posteId, setPosteId] = useState(() => localStorage.getItem(posteStorageKey(orgId, agent.id)))
  const [selectedServices, setSelectedServices] = useState([])
  const [poste, setPoste] = useState(null)
  const [ticketEnCours, setTicketEnCours] = useState(null)
  const [prochain, setProchain] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const p = await api.listPostes(orgId)
    setPostes(p)
    if (!posteId) return
    const current = p.find((x) => x.id === posteId)
    setPoste(current || null)
    if (!current) return
    if (current.ticket_en_cours_id) {
      setTicketEnCours(await api.getTicket(current.ticket_en_cours_id))
      setProchain(null)
    } else {
      setTicketEnCours(null)
      setProchain(await api.apercuProchain(posteId))
    }
  }, [orgId, posteId])

  useEffect(() => {
    api.getOrganisation(orgId).then(setOrg)
    api.getServices(orgId).then(setServices)
  }, [orgId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const unsubscribe = api.subscribeToOrg(orgId, refresh)
    return unsubscribe
  }, [orgId, refresh])

  function serviceName(id) {
    return services.find((s) => s.id === id)?.nom ?? '—'
  }

  async function choisirPoste(id) {
    setPosteId(id)
    localStorage.setItem(posteStorageKey(orgId, agent.id), id)
    const current = postes.find((x) => x.id === id)
    setSelectedServices(current?.service_ids ?? [])
  }

  async function validerServices() {
    setBusy(true)
    setError('')
    try {
      await api.connecterPoste(posteId, agent.id, selectedServices)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function appeler() {
    setBusy(true)
    setError('')
    try {
      await api.appelerProchain(posteId)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function terminer() {
    setBusy(true)
    setError('')
    try {
      await api.terminerTraitement(posteId)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function pause() {
    await api.togglePause(posteId, poste.en_pause)
    await refresh()
  }

  async function seDeconnecter() {
    await api.deconnecterPoste(posteId)
    localStorage.removeItem(posteStorageKey(orgId, agent.id))
    setPosteId(null)
    setPoste(null)
    await logout()
    navigate(`/o/${orgId}/connexion`)
  }

  if (!org) return <LoadingScreen />

  // ─── 1. Choix du poste ─────────────────────────────────────────────────
  if (!posteId || !poste) {
    return (
      <PageShell organisation={org} title={org.nom} subtitle={`Bonjour ${agent.nom}`}>
        <Card>
          <div className="row" style={{ justifyContent: 'flex-start', gap: 12, marginBottom: 4 }}>
            <Avatar label={agent.nom} large />
            <div>
              <h3 style={{ margin: 0 }}>Choisissez votre poste</h3>
              <p className="muted" style={{ margin: '2px 0 0', fontSize: '0.85rem' }}>Vous pourrez le libérer à tout moment.</p>
            </div>
          </div>
          <div className="stack" style={{ marginTop: 14 }}>
            {postes.map((p) => {
              const occupe = p.connecte && p.agent_id !== agent.id
              return (
                <Card key={p.id} className={occupe ? '' : 'card-clickable'} style={{ opacity: occupe ? 0.55 : 1, marginBottom: 0 }} onClick={occupe ? undefined : () => choisirPoste(p.id)}>
                  <div className="row">
                    <div className="row" style={{ justifyContent: 'flex-start', gap: 12 }}>
                      <span style={{ fontSize: '1.4rem' }}>🖥️</span>
                      <strong>{p.nom}</strong>
                    </div>
                    {occupe ? <Badge variant="muted">Occupé</Badge> : <span className="muted" style={{ fontSize: '1.2rem' }}>→</span>}
                  </div>
                </Card>
              )
            })}
          </div>
        </Card>
      </PageShell>
    )
  }

  // ─── 2. Choix des services servis (avant ou en cours de journée) ──────
  if (!poste.connecte) {
    return (
      <PageShell organisation={org} title={poste.nom} subtitle={`${agent.nom} · ${org.nom}`}>
        <Card>
          <h3 style={{ marginTop: 0 }}>Quels services servez-vous maintenant ?</h3>
          <p className="muted" style={{ fontSize: '0.85rem' }}>Vous pourrez changer à tout moment en cours de journée.</p>
          <div className="stack" style={{ marginTop: 14 }}>
            {services.map((s) => {
              const checked = selectedServices.includes(s.id)
              return (
                <Card
                  key={s.id}
                  className="card-clickable"
                  style={{ marginBottom: 0, borderColor: checked ? 'var(--org-primary)' : 'var(--border)', background: checked ? 'color-mix(in srgb, var(--org-primary) 6%, white)' : 'var(--surface)' }}
                  onClick={() => setSelectedServices((cur) => (checked ? cur.filter((id) => id !== s.id) : [...cur, s.id]))}
                >
                  <label className="checklist-item" style={{ padding: 0, cursor: 'pointer' }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setSelectedServices((cur) => (checked ? cur.filter((id) => id !== s.id) : [...cur, s.id]))}
                    />
                    <span style={{ flex: 1, fontWeight: 600 }}>{s.nom}</span>
                    <Badge variant="primary">poids {s.poids}</Badge>
                  </label>
                </Card>
              )
            })}
          </div>
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}
          <Button block disabled={busy || selectedServices.length === 0} onClick={validerServices} style={{ marginTop: 16 }}>
            Rejoindre la file
          </Button>
        </Card>
      </PageShell>
    )
  }

  // ─── 3. Tableau de bord poste ──────────────────────────────────────────
  return (
    <PageShell organisation={org} title={poste.nom} subtitle={`${agent.nom} · ${org.nom}`}>
      <Card>
        <div className="row">
          <div className="row" style={{ justifyContent: 'flex-start', gap: 10 }}>
            <Avatar label={agent.nom} />
            <div>
              <Badge variant={poste.en_pause ? 'warning' : 'success'}>{poste.en_pause ? 'En pause' : 'Disponible'}</Badge>
              <div className="muted" style={{ fontSize: '0.82rem', marginTop: 4 }}>
                {poste.service_ids.map(serviceName).join(' · ') || 'aucun service'}
              </div>
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Button
              sm
              variant="outline"
              onClick={() => {
                setSelectedServices(poste.service_ids)
                setPoste({ ...poste, connecte: false })
              }}
            >
              Changer services
            </Button>
            <Button sm variant="outline" onClick={pause}>{poste.en_pause ? 'Reprendre' : 'Pause'}</Button>
            <Button sm variant="danger" onClick={seDeconnecter}>Déconnexion</Button>
          </div>
        </div>
      </Card>

      {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}

      {ticketEnCours ? (
        <div className="hero-card">
          <div className="hero-label">Client en cours</div>
          <div className="hero-value">{ticketEnCours.code}</div>
          <div style={{ fontWeight: 600, opacity: 0.92 }}>{serviceName(ticketEnCours.service_id)}</div>
          {ticketEnCours.motif && <div style={{ opacity: 0.85, marginTop: 8, fontSize: '0.9rem' }}>Motif : {ticketEnCours.motif}</div>}
          <Button block variant="outline" disabled={busy} onClick={terminer} style={{ marginTop: 20, background: 'white', position: 'relative' }}>
            Terminer ce traitement
          </Button>
        </div>
      ) : poste.en_pause ? (
        <Card>
          <EmptyState icon="⏸️">En pause — reprenez pour recevoir de nouveaux clients.</EmptyState>
        </Card>
      ) : prochain ? (
        <Card>
          <div className="muted" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Prochain client</div>
          <div className="ticket-code" style={{ textAlign: 'left', margin: '6px 0' }}>{prochain.code}</div>
          <div style={{ fontWeight: 600 }}>{serviceName(prochain.service_id)}</div>
          {prochain.motif && <div className="muted" style={{ marginTop: 4 }}>Motif : {prochain.motif}</div>}
          <Button block disabled={busy} onClick={appeler} style={{ marginTop: 18 }}>
            🔔 Appeler ce client
          </Button>
        </Card>
      ) : (
        <Card>
          <EmptyState icon="✅">Aucun client en attente pour vos services actuels.</EmptyState>
        </Card>
      )}
    </PageShell>
  )
}
