import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { PageShell, Card, Field, Button, LoadingScreen, IconBadge, EmptyState } from '../components/ui.jsx'
import { serviceIcon } from '../lib/serviceIcon.js'
import StoryViewer from '../components/StoryViewer.jsx'

function storageKey(orgId) {
  return `tontour_ticket_${orgId}`
}

// "C'est votre tour" doit être impossible à louper : ~12s de vibration en salves
// (au lieu d'un simple buzz) plutôt qu'une seule longue vibration continue, que la
// plupart des téléphones tronquent ou ignorent au-delà de quelques centaines de ms.
const RING_VIBRATE_PATTERN = Array.from({ length: 16 }, () => [500, 300]).flat()

export default function ClientPage() {
  const { orgId } = useParams()
  const [org, setOrg] = useState(null)
  const [orgError, setOrgError] = useState(false)
  const [services, setServices] = useState([])
  const [selectedService, setSelectedService] = useState(null)
  const [motif, setMotif] = useState('')
  const [telephone, setTelephone] = useState('')
  const [prioritaire, setPrioritaire] = useState(false)
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ticket, setTicket] = useState(null)
  const [promotions, setPromotions] = useState([])
  const [checked, setChecked] = useState({})
  const audioCtxRef = useRef(null)
  const ringNodesRef = useRef([])

  // L'AudioContext doit être créé/débloqué suite à un geste utilisateur (politique
  // autoplay des navigateurs) : on le fait à chaque tap sur la page plutôt qu'une
  // seule fois, pour qu'il reste utilisable même si le navigateur l'a suspendu
  // entre-temps (onglet remis au premier plan après avoir été en arrière-plan).
  const ensureAudioContext = useCallback(() => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return null
    if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx()
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume().catch(() => {})
    return audioCtxRef.current
  }, [])

  useEffect(() => {
    const unlock = () => ensureAudioContext()
    document.addEventListener('pointerdown', unlock)
    return () => document.removeEventListener('pointerdown', unlock)
  }, [ensureAudioContext])

  const stopRingtone = useCallback(() => {
    ringNodesRef.current.forEach((osc) => {
      try { osc.stop() } catch { /* déjà arrêté ou pas encore démarré */ }
    })
    ringNodesRef.current = []
  }, [])

  // Sonnerie synthétisée (bips répétés ~12s) plutôt qu'un fichier audio : pas de
  // ressource à charger, et ça reste audible même si l'appareil est verrouillé
  // tant que l'onglet est resté au premier plan.
  const playRingtone = useCallback(() => {
    const ctx = ensureAudioContext()
    if (!ctx) return
    stopRingtone()
    const durationMs = 12000
    const beepEveryMs = 700
    const beepCount = Math.floor(durationMs / beepEveryMs)
    for (let i = 0; i < beepCount; i++) {
      const start = ctx.currentTime + (i * beepEveryMs) / 1000
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.35, start + 0.02)
      gain.gain.linearRampToValueAtTime(0, start + 0.3)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.32)
      ringNodesRef.current.push(osc)
    }
  }, [ensureAudioContext, stopRingtone])

  useEffect(() => stopRingtone, [stopRingtone])

  const refreshTicket = useCallback(async () => {
    const saved = localStorage.getItem(storageKey(orgId))
    if (!saved) return
    const { id, client_token } = JSON.parse(saved)
    try {
      const status = await api.ticketStatus(id, client_token)
      setTicket({ ...status, client_token })
    } catch {
      localStorage.removeItem(storageKey(orgId))
      setTicket(null)
    }
  }, [orgId])

  // C'est le point d'entrée public de l'app (scan du QR code) : sans ce catch, un
  // orgId invalide ou une erreur réseau transitoire laissait le client bloqué sur
  // <LoadingScreen/> indéfiniment, sans message ni moyen de réessayer.
  const chargerOrg = useCallback(() => {
    setOrgError(false)
    api.getOrganisation(orgId).then(setOrg).catch(() => setOrgError(true))
  }, [orgId])

  useEffect(() => {
    chargerOrg()
    api.getServices(orgId).then(setServices).catch(() => setServices([]))
    api.listPromotions(orgId).then(setPromotions).catch(() => setPromotions([]))
    refreshTicket()
  }, [orgId, refreshTicket, chargerOrg])

  // Pas d'abonnement Realtime ici (vérifié en audit pré-production) : la table tickets
  // n'accorde volontairement aucun accès à anon (RLS, voir supabase/schema.sql — sans
  // quoi n'importe quel visiteur de la page pourrait lire les motifs/téléphones de
  // TOUS les tickets de l'organisation), donc un abonnement postgres_changes anonyme
  // ne recevrait jamais rien : ouvrir quand même la connexion websocket ne ferait que
  // consommer un slot de connexion Realtime pour zéro bénéfice. Ce polling (protégé
  // par client_token via la RPC ticket_status) est donc le seul mécanisme de mise à
  // jour côté client, pas un simple filet de sécurité.
  useEffect(() => {
    const interval = setInterval(() => {
      if (localStorage.getItem(storageKey(orgId))) refreshTicket()
    }, 4000)
    return () => clearInterval(interval)
  }, [orgId, refreshTicket])

  useEffect(() => {
    if (ticket?.statut !== 'en_cours' && ticket?.statut !== 'termine') return
    if (ticket.statut === 'en_cours') {
      // C'est le moment critique (se présenter au poste) : alerte longue et
      // insistante plutôt qu'un simple buzz, sur le modèle d'une sonnerie d'appel.
      if ('vibrate' in navigator) navigator.vibrate(RING_VIBRATE_PATTERN)
      playRingtone()
    } else if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200])
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      if (ticket.statut === 'en_cours') {
        new Notification('TonTour — c’est votre tour', { body: `Ticket ${ticket.code} — présentez-vous au ${ticket.poste_nom}` })
      } else {
        new Notification('TonTour — traitement terminé', { body: `Ticket ${ticket.code} — merci ! Donnez votre avis en 1 clic.` })
      }
    }
    // ticket.appele_le dans les dépendances : l'agent peut rappeler (sonnette
    // toujours active après le premier appel) sans changer le statut du ticket,
    // ce re-déclenchement garantit une nouvelle alerte à chaque rappel.
  }, [ticket?.statut, ticket?.code, ticket?.poste_nom, ticket?.appele_le, playRingtone])

  async function creerTicket(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {})
      }
      const t = await api.creerTicket({
        organisation_id: orgId,
        service_id: selectedService.id,
        motif: motif || null,
        telephone: telephone || null,
        canal: 'mobile',
        prioritaire,
      })
      localStorage.setItem(storageKey(orgId), JSON.stringify({ id: t.id, client_token: t.client_token }))
      setTicket({ ...t, client_token: t.client_token })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function annuler() {
    if (!ticket) return
    await api.annulerTicket(ticket.id, ticket.client_token)
    localStorage.removeItem(storageKey(orgId))
    setTicket(null)
    setSelectedService(null)
    setMotif('')
    setPrioritaire(false)
  }

  // Un ticket terminé n'a plus besoin d'être suivi : on nettoie tout de suite le
  // localStorage pour qu'un nouveau scan du QR code (même URL) reparte sur le choix
  // du service au lieu de rester bloqué sur l'écran de notation de l'ancien ticket.
  useEffect(() => {
    if (ticket?.statut === 'termine') localStorage.removeItem(storageKey(orgId))
  }, [ticket?.statut, orgId])

  function nouveauTicket() {
    setTicket(null)
    setSelectedService(null)
    setMotif('')
    setPrioritaire(false)
  }

  function toggleDoc(doc) {
    setChecked((c) => ({ ...c, [doc]: !c[doc] }))
  }

  // Storie plein écran pendant l'attente : le ticket (code, position, ETA) et
  // les documents à préparer sont eux-mêmes des slides, avant les promotions/quiz.
  const waitingSlides = useMemo(() => {
    if (!ticket) return []
    const slides = [{ id: '__ticket__', type: 'ticket' }]
    if (ticket.documents_requis?.length > 0) slides.push({ id: '__documents__', type: 'documents' })
    return [...slides, ...promotions]
  }, [ticket, promotions])

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

  // ─── Écran de suivi (ticket déjà créé) ────────────────────────────────
  if (ticket && ticket.statut !== 'annule') {
    const enCours = ticket.statut === 'en_cours'
    const termine = ticket.statut === 'termine'

    // L'alerte de la sonnette (en_cours) se pose au-dessus de la storie sans la
    // faire disparaître : le client garde ses infos de ticket/documents sous les
    // yeux, avec le message "c'est votre tour" en overlay par-dessus.
    if (!termine) {
      return (
        <StoryViewer
          items={waitingSlides}
          orgName={org.nom}
          orgLogo={org.logo_url}
          orgPrimary={org.couleur_principale}
          orgSecondary={org.couleur_secondaire}
          ticket={ticket}
          checkedDocs={checked}
          onToggleDoc={toggleDoc}
          fullscreen
          alert={enCours ? { title: 'C’est votre tour !', body: `Présentez-vous au ${ticket.poste_nom} avec le ticket ${ticket.code}` } : null}
          footer={
            enCours ? null : (
              <>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', margin: '0 0 10px' }}>
                  Gardez cette page ouverte (elle peut rester en arrière-plan) : c’est elle qui vous préviendra quand ce sera votre tour.
                </p>
                <Button
                  variant="outline"
                  block
                  onClick={annuler}
                  style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.4)', color: 'white' }}
                >
                  Annuler mon ticket
                </Button>
              </>
            )
          }
        />
      )
    }

    return (
      <PageShell organisation={org} title={org.nom} subtitle="Suivi de votre ticket">
        <Card className="center">
          <div style={{ fontSize: '2.4rem', marginBottom: 8 }}>👋</div>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 4px' }}>Merci de votre visite</p>
          <RatingWidget ticket={ticket} />
          <Button block variant="outline" onClick={nouveauTicket} style={{ marginTop: 18 }}>
            Prendre un nouveau ticket
          </Button>
        </Card>
      </PageShell>
    )
  }

  // ─── Choix du motif (service sélectionné) ─────────────────────────────
  if (selectedService) {
    return (
      <PageShell organisation={org} title={org.nom} subtitle={selectedService.nom} backTo={`/o/${orgId}`}>
        <Card>
          <form onSubmit={creerTicket}>
            {selectedService.motifs_predefinis?.length > 0 && (
              <Field label="Motif de votre visite (optionnel)">
                <div className="stack" style={{ gap: 8 }}>
                  {[...selectedService.motifs_predefinis, '__autre__'].map((m) => {
                    const checked = motif === m
                    return (
                      <Card
                        key={m}
                        className="card-clickable"
                        style={{
                          marginBottom: 0, padding: '10px 14px',
                          borderColor: checked ? 'var(--org-primary)' : 'var(--border)',
                          background: checked ? 'color-mix(in srgb, var(--org-primary) 6%, white)' : 'var(--surface)',
                        }}
                        onClick={() => setMotif(m)}
                      >
                        <label className="checklist-item" style={{ padding: 0, cursor: 'pointer' }} onClick={(e) => e.stopPropagation()}>
                          <input type="radio" name="motif" checked={checked} onChange={() => setMotif(m)} />
                          <span style={{ flex: 1, fontWeight: checked ? 700 : 500 }}>{m === '__autre__' ? 'Autre (préciser)' : m}</span>
                        </label>
                      </Card>
                    )
                  })}
                </div>
              </Field>
            )}
            {(motif === '__autre__' || !selectedService.motifs_predefinis?.length) && (
              <Field label={selectedService.motifs_predefinis?.length ? 'Précisez' : 'Motif de votre visite (optionnel)'}>
                <textarea className="input" rows={2} value={motif === '__autre__' ? '' : motif} onChange={(e) => setMotif(e.target.value)} />
              </Field>
            )}
            <Field>
              <label className="checklist-item" style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                <input type="checkbox" checked={prioritaire} onChange={(e) => setPrioritaire(e.target.checked)} />
                🔴 Besoin prioritaire (personne à mobilité réduite, urgence)
              </label>
              {prioritaire && (
                <p className="muted" style={{ fontSize: '0.78rem', margin: '4px 0 0' }}>
                  Votre ticket sera traité avant les autres, quel que soit le service.
                </p>
              )}
            </Field>
            <Field label="Téléphone (optionnel — pour SMS de secours si la notification échoue)">
              <input className="input" type="tel" placeholder="06 12 34 56 78" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
            </Field>
            {telephone && (
              <Field>
                <label className="checklist-item" style={{ fontSize: '0.82rem' }}>
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
                  J’accepte que mon numéro soit utilisé uniquement pour ce ticket et supprimé sous 24h.
                </label>
              </Field>
            )}
            {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}
            <Button type="submit" block disabled={busy || (telephone && !consent)}>
              {busy ? 'Création du ticket…' : 'Obtenir mon ticket'}
            </Button>
          </form>
        </Card>
      </PageShell>
    )
  }

  // ─── Choix du service ──────────────────────────────────────────────────
  return (
    <PageShell organisation={org} title={org.nom} subtitle="Prendre un ticket">
      <div className="stack">
        {services.map((s) => (
          <Card
            key={s.id}
            className="row card-clickable"
            role="button"
            tabIndex={0}
            onClick={() => setSelectedService(s)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setSelectedService(s)
              }
            }}
          >
            <div className="row" style={{ justifyContent: 'flex-start', gap: 14 }}>
              <IconBadge icon={serviceIcon(s.nom)} />
              <div>
                <strong>{s.nom}</strong>
                <div className="muted" style={{ fontSize: '0.85rem' }}>~{s.temps_moyen_min} min en moyenne</div>
              </div>
            </div>
            <span className="muted" style={{ fontSize: '1.3rem' }}>→</span>
          </Card>
        ))}
        {services.length === 0 && <EmptyState icon="🎫">Aucun service disponible pour le moment.</EmptyState>}
      </div>
    </PageShell>
  )
}

/** Notation 1-5 étoiles + commentaire optionnel, envoyés ensemble (protégé côté
 * serveur par le client_token). Choisir une étoile ouvre le champ commentaire au
 * lieu d'envoyer immédiatement, pour laisser le temps de l'écrire avant de valider. */
function RatingWidget({ ticket }) {
  const [note, setNote] = useState(ticket.note ?? null)
  const [selection, setSelection] = useState(0)
  const [hover, setHover] = useState(0)
  const [commentaire, setCommentaire] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function envoyer() {
    setSending(true)
    setError('')
    try {
      await api.noterTicket(ticket.id, ticket.client_token, selection, commentaire || null)
      setNote(selection)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (note) {
    return (
      <div style={{ marginTop: 12 }}>
        <p className="muted" style={{ fontSize: '0.85rem', margin: '0 0 6px' }}>Merci pour votre retour !</p>
        <div style={{ fontSize: '1.6rem' }}>{'⭐'.repeat(note)}{'☆'.repeat(5 - note)}</div>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 12 }}>
      <p className="muted" style={{ fontSize: '0.85rem', margin: '0 0 8px' }}>Comment s’est passée votre visite ?</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setSelection(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            disabled={sending}
            style={{ background: 'none', border: 'none', cursor: sending ? 'default' : 'pointer', fontSize: '2rem', padding: 2, lineHeight: 1 }}
            aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
          >
            {n <= (hover || selection) ? '⭐' : '☆'}
          </button>
        ))}
      </div>
      {selection > 0 && (
        <div style={{ marginTop: 10 }}>
          <textarea
            className="input"
            rows={2}
            placeholder="Un commentaire à ajouter ? (optionnel)"
            value={commentaire}
            maxLength={1000}
            onChange={(e) => setCommentaire(e.target.value)}
          />
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', margin: '6px 0 0' }}>{error}</p>}
          <Button block disabled={sending} onClick={envoyer} style={{ marginTop: 10 }}>
            {sending ? 'Envoi…' : 'Envoyer mon avis'}
          </Button>
        </div>
      )}
    </div>
  )
}
