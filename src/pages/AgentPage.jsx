import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { PageShell, Card, Button, Badge, Avatar, LoadingScreen, EmptyState } from '../components/ui.jsx'

/** Le vendeur ne choisit plus ni poste ni services : les services sont attribués par
 * l'admin (back-office → Agents, agents.service_ids), et l'agent devient "actif" dès
 * l'arrivée sur cette page (RPC activer_agent) — pas de notion de guichet/emplacement
 * physique à s'attribuer, les vendeurs d'une boutique télécom sont mobiles. */
export default function AgentPage() {
  const { orgId } = useParams()
  const { agent, logout } = useAuth()
  const navigate = useNavigate()

  const [org, setOrg] = useState(null)
  const [orgError, setOrgError] = useState(false)
  const [services, setServices] = useState([])
  const [moi, setMoi] = useState(null)
  const [activating, setActivating] = useState(true)
  const [activationError, setActivationError] = useState('')
  const [ticketEnCours, setTicketEnCours] = useState(null)
  const [prochain, setProchain] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const activer = useCallback(async () => {
    setActivating(true)
    try {
      const m = await api.activerAgent(agent.id)
      setMoi(m)
      setActivationError('')
    } catch (err) {
      setActivationError(err.message)
    } finally {
      setActivating(false)
    }
  }, [agent.id])

  const chargerOrg = useCallback(() => {
    setOrgError(false)
    api.getOrganisationAuth(orgId).then(setOrg).catch(() => setOrgError(true))
  }, [orgId])

  useEffect(() => {
    chargerOrg()
    api.getServices(orgId).then(setServices).catch(() => setServices([]))
  }, [orgId, chargerOrg])

  useEffect(() => {
    activer()
  }, [activer])

  // Dépend de agent.id (stable pour toute la session), pas de `moi` : `moi` change de
  // référence à chaque rafraîchissement (nouvel objet renvoyé par listAgents), ce qui
  // recréerait refresh() à l'identique et redéclencherait l'effet ci-dessous en boucle.
  const refresh = useCallback(async () => {
    const tous = await api.listAgents(orgId)
    const actuel = tous.find((a) => a.id === agent.id)
    if (!actuel) return
    setMoi(actuel)
    if (actuel.ticket_en_cours_id) {
      setTicketEnCours(await api.getTicket(actuel.ticket_en_cours_id))
      setProchain(null)
    } else {
      setTicketEnCours(null)
      setProchain(await api.apercuProchain(actuel.id))
    }
  }, [orgId, agent.id])

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
        await api.rappelerClient(moi.id)
      } else {
        await api.appelerProchain(moi.id)
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
      await api.terminerTraitement(moi.id)
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
      await api.marquerAbsent(moi.id)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function pause() {
    await api.basculerPause(moi.id)
    await refresh()
  }

  async function seDeconnecter() {
    await api.deconnecterAgent(moi.id)
    setMoi(null)
    await logout()
    navigate(`/o/${orgId}/connexion`)
  }

  if (orgError) {
    return (
      <div className="loading-screen">
        <div className="center" style={{ maxWidth: 320, padding: 24 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</div>
          <p style={{ fontWeight: 700, margin: '0 0 6px' }}>Impossible de charger cette page</p>
          <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 16 }}>Vérifiez votre connexion internet et réessayez.</p>
          <Button onClick={chargerOrg}>Réessayer</Button>
        </div>
      </div>
    )
  }

  if (!org) return <LoadingScreen />

  // ─── 1. Activation en cours / échec ────────────────────────────────────
  if (!moi) {
    return (
      <PageShell organisation={org} title={org.nom} subtitle={`Bonjour ${agent.nom}`}>
        <Card className="center">
          {activating ? (
            <p className="muted">Connexion…</p>
          ) : (
            <>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</div>
              <p style={{ fontWeight: 700, margin: '0 0 4px' }}>Impossible de vous connecter</p>
              <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 16 }}>{activationError}</p>
              <Button onClick={activer}>Réessayer</Button>
            </>
          )}
        </Card>
      </PageShell>
    )
  }

  // ─── 2. Tableau de bord vendeur ─────────────────────────────────────────
  return (
    <PageShell organisation={org} title={org.nom} subtitle={`${agent.nom} · File d’attente`}>
      <Card>
        <div className="row">
          <div className="row" style={{ justifyContent: 'flex-start', gap: 10 }}>
            <Avatar label={agent.nom} />
            <div>
              <Badge variant={moi.en_pause ? 'warning' : 'success'}>{moi.en_pause ? 'En pause' : 'Disponible'}</Badge>
              <div className="muted" style={{ fontSize: '0.82rem', marginTop: 4 }}>
                {moi.service_ids.map(serviceName).join(' · ') || 'Aucun service attribué — contactez votre administrateur'}
              </div>
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Button sm variant="outline" onClick={pause}>{moi.en_pause ? 'Reprendre' : 'Pause'}</Button>
            <Button sm variant="danger" onClick={seDeconnecter}>Déconnexion</Button>
          </div>
        </div>
      </Card>

      {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}

      {moi.service_ids.length === 0 ? (
        <Card>
          <EmptyState icon="🛎️">Aucun service ne vous a été attribué. Contactez votre administrateur pour commencer à recevoir des clients.</EmptyState>
        </Card>
      ) : moi.en_pause ? (
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
