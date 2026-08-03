import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { PageShell, Card, Field, Button, LoadingScreen, IconBadge, EmptyState } from '../components/ui.jsx'
import { serviceIcon } from '../lib/serviceIcon.js'
import StoryViewer from '../components/StoryViewer.jsx'

function storageKey(orgId) {
  return `tontour_ticket_${orgId}`
}

export default function ClientPage() {
  const { orgId } = useParams()
  const [org, setOrg] = useState(null)
  const [services, setServices] = useState([])
  const [selectedService, setSelectedService] = useState(null)
  const [motif, setMotif] = useState('')
  const [telephone, setTelephone] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ticket, setTicket] = useState(null)
  const [promotions, setPromotions] = useState([])
  const [checked, setChecked] = useState({})

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

  useEffect(() => {
    api.getOrganisation(orgId).then(setOrg)
    api.getServices(orgId).then(setServices)
    api.listPromotions(orgId).then(setPromotions)
    refreshTicket()
  }, [orgId, refreshTicket])

  useEffect(() => {
    const unsubscribe = api.subscribeToOrg(orgId, refreshTicket)
    // Filet de sécurité : la table tickets n'accorde aucun accès direct à anon (RLS,
    // voir supabase/schema.sql), donc le realtime postgres_changes peut ne jamais
    // parvenir à un client anonyme selon la configuration du projet Supabase. Ce
    // polling léger (protégé par client_token via la RPC ticket_status) garantit que
    // la notification "c'est votre tour" arrive même si le canal realtime est muet.
    const interval = setInterval(() => {
      if (localStorage.getItem(storageKey(orgId))) refreshTicket()
    }, 4000)
    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [orgId, refreshTicket])

  useEffect(() => {
    if (ticket?.statut !== 'en_cours' && ticket?.statut !== 'termine') return
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200])
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      if (ticket.statut === 'en_cours') {
        new Notification('TonTour — c’est votre tour', { body: `Ticket ${ticket.code} — présentez-vous au ${ticket.poste_nom}` })
      } else {
        new Notification('TonTour — traitement terminé', { body: `Ticket ${ticket.code} — merci ! Donnez votre avis en 1 clic.` })
      }
    }
    // ticket.appele_le dans les dépendances : l'agent peut rappeler (sonnette
    // toujours active après le premier appel) sans changer le statut du ticket,
    // ce re-déclenchement garantit une nouvelle notification à chaque rappel.
  }, [ticket?.statut, ticket?.code, ticket?.poste_nom, ticket?.appele_le])

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
          <Card key={s.id} className="row card-clickable" onClick={() => setSelectedService(s)}>
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

/** Notation 1-5 étoiles, envoyée immédiatement au clic (protégée côté serveur par le client_token). */
function RatingWidget({ ticket }) {
  const [note, setNote] = useState(ticket.note ?? null)
  const [hover, setHover] = useState(0)
  const [sending, setSending] = useState(false)

  async function noter(n) {
    if (sending || note) return
    setSending(true)
    try {
      await api.noterTicket(ticket.id, ticket.client_token, n)
      setNote(n)
    } catch {
      // silencieux : la notation n'est pas critique, on laisse le client réessayer
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
            onClick={() => noter(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            disabled={sending}
            style={{ background: 'none', border: 'none', cursor: sending ? 'default' : 'pointer', fontSize: '2rem', padding: 2, lineHeight: 1 }}
            aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
          >
            {n <= hover ? '⭐' : '☆'}
          </button>
        ))}
      </div>
    </div>
  )
}
