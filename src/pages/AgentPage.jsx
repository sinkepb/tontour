import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { PageShell, Card, Button, Badge, Avatar, LoadingScreen, EmptyState } from '../components/ui.jsx'

/** Le vendeur ne choisit plus ni son poste ni ses services : les services sont
 * attribués par l'admin (back-office → Postes & agents, agents.service_ids), et le
 * premier poste libre est assigné automatiquement à la connexion (RPC
 * connecter_poste_auto, verrouillage transactionnel côté serveur pour éviter que
 * deux vendeurs se voient assigner le même poste). */
export default function AgentPage() {
  const { orgId } = useParams()
  const { agent, logout } = useAuth()
  const navigate = useNavigate()

  const [org, setOrg] = useState(null)
  const [services, setServices] = useState([])
  const [poste, setPoste] = useState(null)
  const [connecting, setConnecting] = useState(true)
  const [connectError, setConnectError] = useState('')
  const [ticketEnCours, setTicketEnCours] = useState(null)
  const [prochain, setProchain] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const connecter = useCallback(async () => {
    try {
      const p = await api.connecterPosteAuto(agent.id)
      setPoste(p)
      setConnectError('')
    } catch (err) {
      setConnectError(err.message)
    } finally {
      setConnecting(false)
    }
  }, [agent.id])

  useEffect(() => {
    api.getOrganisationAuth(orgId).then(setOrg)
    api.getServices(orgId).then(setServices)
  }, [orgId])

  useEffect(() => {
    connecter()
  }, [connecter])

  // Tant qu'aucun poste n'est libre, on retente périodiquement — la souscription
  // Realtime ci-dessous ne peut pas nous prévenir puisque tant qu'on n'a pas de
  // poste, il n'y a rien à quoi s'abonner.
  useEffect(() => {
    if (!connectError) return
    const retry = setInterval(connecter, 5000)
    return () => clearInterval(retry)
  }, [connectError, connecter])

  const refresh = useCallback(async () => {
    if (!poste) return
    const tous = await api.listPostes(orgId)
    const actuel = tous.find((p) => p.id === poste.id)
    if (!actuel || !actuel.connecte) {
      // Le poste a été libéré ailleurs (déconnexion forcée depuis le back-office, etc.)
      // : on retente une connexion automatique plutôt que de rester bloqué.
      setPoste(null)
      setConnecting(true)
      connecter()
      return
    }
    setPoste(actuel)
    if (actuel.ticket_en_cours_id) {
      setTicketEnCours(await api.getTicket(actuel.ticket_en_cours_id))
      setProchain(null)
    } else {
      setTicketEnCours(null)
      setProchain(await api.apercuProchain(actuel.id))
    }
  }, [orgId, poste, connecter])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const unsubscribe = api.subscribeToOrg(orgId, refresh)
    return unsubscribe
  }, [orgId, refresh])

  // Fait avancer l'horloge affichée pour que le bouton "Marquer absent" (activé
  // seulement après organisations.delai_absence_min) se débloque tout seul à
  // l'écran, sans que l'agent ait besoin de recharger la page.
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(clock)
  }, [])

  function serviceName(id) {
    return services.find((s) => s.id === id)?.nom ?? '—'
  }

  async function appeler() {
    setBusy(true)
    setError('')
    try {
      // Une fois le ticket en cours, la sonnette reste active : on relance juste la
      // notification (sans réassigner) pour rappeler un client qui n'a pas répondu.
      if (ticketEnCours) {
        await api.rappelerClient(poste.id)
      } else {
        await api.appelerProchain(poste.id)
      }
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
      await api.terminerTraitement(poste.id)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function marquerAbsent() {
    setBusy(true)
    setError('')
    try {
      await api.marquerAbsent(poste.id)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function pause() {
    await api.togglePause(poste.id, poste.en_pause)
    await refresh()
  }

  async function seDeconnecter() {
    await api.deconnecterPoste(poste.id)
    setPoste(null)
    await logout()
    navigate(`/o/${orgId}/connexion`)
  }

  if (!org) return <LoadingScreen />

  // ─── 1. Connexion automatique en cours / aucun poste disponible ────────
  if (!poste) {
    return (
      <PageShell organisation={org} title={org.nom} subtitle={`Bonjour ${agent.nom}`}>
        <Card className="center">
          {connecting ? (
            <p className="muted">Connexion à un poste…</p>
          ) : (
            <>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🖥️</div>
              <p style={{ fontWeight: 700, margin: '0 0 4px' }}>Aucun poste disponible pour le moment</p>
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                {connectError === 'Agent introuvable' ? connectError : 'Tous les postes sont occupés — vous serez connecté·e automatiquement dès qu’un poste se libère.'}
              </p>
            </>
          )}
        </Card>
      </PageShell>
    )
  }

  // ─── 2. Tableau de bord poste ──────────────────────────────────────────
  return (
    <PageShell organisation={org} title={poste.nom} subtitle={`${agent.nom} · ${org.nom}`}>
      <Card>
        <div className="row">
          <div className="row" style={{ justifyContent: 'flex-start', gap: 10 }}>
            <Avatar label={agent.nom} />
            <div>
              <Badge variant={poste.en_pause ? 'warning' : 'success'}>{poste.en_pause ? 'En pause' : 'Disponible'}</Badge>
              <div className="muted" style={{ fontSize: '0.82rem', marginTop: 4 }}>
                {poste.service_ids.map(serviceName).join(' · ') || 'Aucun service attribué — contactez votre administrateur'}
              </div>
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Button sm variant="outline" onClick={pause}>{poste.en_pause ? 'Reprendre' : 'Pause'}</Button>
            <Button sm variant="danger" onClick={seDeconnecter}>Déconnexion</Button>
          </div>
        </div>
      </Card>

      {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}

      {poste.service_ids.length === 0 ? (
        <Card>
          <EmptyState icon="🛎️">Aucun service ne vous a été attribué. Contactez votre administrateur pour commencer à recevoir des clients.</EmptyState>
        </Card>
      ) : poste.en_pause ? (
        <Card>
          <EmptyState icon="⏸️">En pause — reprenez pour recevoir de nouveaux clients.</EmptyState>
        </Card>
      ) : ticketEnCours || prochain ? (
        // Carte unique, toujours affichée pour le ticket courant (prochain ou en cours) :
        // les deux actions (sonnette / terminer) restent visibles ensemble, on ne bascule
        // jamais vers un autre écran qui ferait disparaître les infos du ticket.
        (() => {
          const t = ticketEnCours || prochain
          const delaiAbsenceMs = (org?.delai_absence_min ?? 5) * 60000
          const absenceReadyAt = ticketEnCours?.appele_le ? new Date(ticketEnCours.appele_le).getTime() + delaiAbsenceMs : null
          const absenceReady = absenceReadyAt != null && now >= absenceReadyAt
          const secondesRestantes = absenceReadyAt != null ? Math.max(0, Math.ceil((absenceReadyAt - now) / 1000)) : 0
          return (
            <div className="hero-card">
              <div className="row" style={{ justifyContent: 'flex-start', gap: 8 }}>
                <div className="hero-label">{ticketEnCours ? 'Client en cours' : 'Prochain client'}</div>
                {t.prioritaire && <Badge variant="danger">🔴 Prioritaire</Badge>}
              </div>
              <div className="hero-value">{t.code}</div>
              <div style={{ fontWeight: 600, opacity: 0.92 }}>{serviceName(t.service_id)}</div>
              {t.motif && <div style={{ opacity: 0.85, marginTop: 8, fontSize: '0.9rem' }}>Motif : {t.motif}</div>}
              {ticketEnCours?.appele_le && (
                <div style={{ opacity: 0.75, marginTop: 8, fontSize: '0.78rem' }}>
                  Dernier appel : {new Date(ticketEnCours.appele_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <Button
                  disabled={busy}
                  onClick={appeler}
                  style={{ flex: 1, background: ticketEnCours ? 'rgba(255,255,255,0.15)' : undefined, color: ticketEnCours ? 'white' : undefined, border: ticketEnCours ? '1.5px solid rgba(255,255,255,0.4)' : undefined }}
                >
                  {ticketEnCours ? '🔔 Rappeler le client' : '🔔 Appeler ce client'}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy || !ticketEnCours}
                  onClick={terminer}
                  style={{ flex: 1, background: 'white' }}
                >
                  ✅ Terminer ce traitement
                </Button>
              </div>
              {ticketEnCours && (
                <div style={{ marginTop: 10 }}>
                  <Button
                    variant="outline"
                    sm
                    block
                    disabled={busy || !absenceReady}
                    onClick={marquerAbsent}
                    style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.35)', color: 'white' }}
                  >
                    🚫 Marquer absent{!absenceReady && ` (dans ${Math.ceil(secondesRestantes / 60)} min)`}
                  </Button>
                </div>
              )}
            </div>
          )
        })()
      ) : (
        <Card>
          <EmptyState icon="✅">Aucun client en attente pour vos services actuels.</EmptyState>
        </Card>
      )}
    </PageShell>
  )
}
