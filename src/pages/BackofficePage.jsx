import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { PageShell, Card, Button, Field, Badge, Avatar, IconBadge, LoadingScreen } from '../components/ui.jsx'
import { serviceIcon } from '../lib/serviceIcon.js'
import QrCode from '../components/QrCode.jsx'

const TABS = [
  ['Statistiques', '📊'],
  ['Services', '🛎️'],
  ['Postes & agents', '🖥️'],
  ['Storie', '📣'],
  ['Image de marque', '🎨'],
  ['QR Code', '📱'],
]

export default function BackofficePage() {
  const { orgId } = useParams()
  const { agent, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState(TABS[0][0])
  const [org, setOrg] = useState(null)
  const [services, setServices] = useState([])
  const [postes, setPostes] = useState([])
  const [agents, setAgents] = useState([])
  const [stats, setStats] = useState(null)
  const [alertes, setAlertes] = useState([])
  const [promotions, setPromotions] = useState([])

  const refresh = useCallback(async () => {
    const [o, s, p, ag, st, al, pr] = await Promise.all([
      api.getOrganisation(orgId),
      api.getServices(orgId),
      api.listPostes(orgId),
      api.listAgents(orgId),
      api.statsJour(orgId),
      api.servicesEnAlerte(orgId),
      api.listPromotions(orgId, { onlyActive: false }),
    ])
    setOrg(o)
    setServices(s)
    setPostes(p)
    setAgents(ag)
    setStats(st)
    setAlertes(al)
    setPromotions(pr)
  }, [orgId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const unsubscribe = api.subscribeToOrg(orgId, refresh)
    return unsubscribe
  }, [orgId, refresh])

  async function seDeconnecter() {
    await logout()
    navigate(`/o/${orgId}/connexion`)
  }

  if (!org) return <LoadingScreen />

  return (
    <PageShell organisation={org} title={`${org.nom} — Back-office`} subtitle={`Connecté·e en tant que ${agent.nom}`} wide>
      <div className="row" style={{ marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div className="tab-bar">
          {TABS.map(([t, icon]) => (
            <Button key={t} sm variant={tab === t ? 'primary' : 'outline'} onClick={() => setTab(t)}>
              <span>{icon}</span> {t}
            </Button>
          ))}
        </div>
        <div className="row" style={{ gap: 10, width: 'auto' }}>
          <Avatar label={agent.nom} />
          <Button sm variant="danger" onClick={seDeconnecter}>Déconnexion</Button>
        </div>
      </div>

      {alertes.length > 0 && (
        <div className="alert-box">
          ⚠️ {alertes.length} service(s) sans poste connecté depuis plus du délai configuré :{' '}
          {alertes.map((a) => `${a.service_nom} (${a.tickets_en_attente} en attente, ${a.plus_ancien_min} min)`).join(' · ')}
        </div>
      )}

      {tab === 'Statistiques' && stats && <StatsTab stats={stats} />}
      {tab === 'Services' && <ServicesTab orgId={orgId} services={services} onChange={refresh} />}
      {tab === 'Postes & agents' && <PostesAgentsTab postes={postes} agents={agents} services={services} />}
      {tab === 'Storie' && <PromotionsTab orgId={orgId} promotions={promotions} onChange={refresh} />}
      {tab === 'Image de marque' && <BrandingTab orgId={orgId} org={org} onChange={refresh} />}
      {tab === 'QR Code' && <QrCodeTab orgId={orgId} org={org} />}
    </PageShell>
  )
}

function QrCodeTab({ orgId, org }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/o/${orgId}`

  async function copierId() {
    try {
      await navigator.clipboard.writeText(orgId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Card>
      <h3 style={{ marginTop: 0 }}>QR code du point de vente</h3>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        À scanner par les clients pour prendre un ticket. Chaque point de vente a son propre identifiant et son propre
        QR code — imprimez l’affiche et collez-la en boutique.
      </p>
      <div className="row" style={{ alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', background: 'white' }}>
          <QrCode url={url} size={180} color={org.couleur_principale} />
        </div>
        <div className="stack" style={{ flex: 1, minWidth: 220 }}>
          <Field label="Identifiant de ce point de vente">
            <div className="row" style={{ gap: 8 }}>
              <input className="input" readOnly value={orgId} style={{ fontSize: '0.75rem' }} />
              <Button sm variant="outline" onClick={copierId}>{copied ? 'Copié !' : 'Copier'}</Button>
            </div>
          </Field>
          <Field label="Lien direct">
            <input className="input" readOnly value={url} style={{ fontSize: '0.8rem' }} onFocus={(e) => e.target.select()} />
          </Field>
          <Button as={Link} to={`/o/${orgId}/qrcode`} target="_blank" block>
            Ouvrir l’affiche à imprimer →
          </Button>
        </div>
      </div>
    </Card>
  )
}

const STAT_META = [
  ['tickets_traites', 'Tickets traités aujourd’hui', '✅', '#16a34a'],
  ['tickets_total', 'Tickets créés aujourd’hui', '🎫', '#2563eb'],
  ['attente_moyenne_min', 'Attente moyenne (min)', '⏱️', '#d97706'],
  ['postes_connectes', 'Postes connectés', '🖥️', '#7c3aed'],
]

function StatsTab({ stats }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
      {STAT_META.map(([key, label, icon, tint]) => (
        <div className="stat-tile" key={key}>
          <IconBadge icon={icon} tint={tint} />
          <div className="value" style={{ marginTop: 12 }}>{stats[key]}</div>
          <div className="label">{label}</div>
        </div>
      ))}
    </div>
  )
}

function ServicesTab({ orgId, services, onChange }) {
  const [editing, setEditing] = useState(null) // service en édition, ou {} pour création

  async function save(service) {
    await api.upsertService({ ...service, organisation_id: orgId })
    setEditing(null)
    onChange()
  }

  async function remove(id) {
    await api.supprimerService(id)
    onChange()
  }

  return (
    <Card>
      <div className="row" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Services</h3>
        <Button sm onClick={() => setEditing({})}>+ Nouveau service</Button>
      </div>
      <table className="data-table">
        <thead>
          <tr><th>Nom</th><th>Préfixe</th><th>Temps moyen</th><th>Poids</th><th>Documents</th><th></th></tr>
        </thead>
        <tbody>
          {services.map((s) => (
            <tr key={s.id}>
              <td>
                <div className="row" style={{ justifyContent: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: '1.1rem' }}>{serviceIcon(s.nom)}</span>
                  <strong>{s.nom}</strong>
                </div>
              </td>
              <td>{s.prefixe_ticket}</td>
              <td>{s.temps_moyen_min} min</td>
              <td><Badge variant="primary">{s.poids}</Badge></td>
              <td className="muted" style={{ fontSize: '0.8rem' }}>{(s.documents_requis || []).join(', ') || '—'}</td>
              <td className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                <Button sm variant="outline" onClick={() => setEditing(s)}>Modifier</Button>
                <Button sm variant="danger" onClick={() => remove(s.id)}>Désactiver</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && <ServiceForm service={editing} onCancel={() => setEditing(null)} onSave={save} />}
    </Card>
  )
}

function ServiceForm({ service, onCancel, onSave }) {
  const [form, setForm] = useState({
    id: service.id,
    nom: service.nom || '',
    prefixe_ticket: service.prefixe_ticket || '',
    temps_moyen_min: service.temps_moyen_min ?? 5,
    poids: service.poids ?? 1,
    documents_requis: (service.documents_requis || []).join(', '),
    motifs_predefinis: (service.motifs_predefinis || []).join(', '),
  })

  function submit(e) {
    e.preventDefault()
    onSave({
      ...form,
      temps_moyen_min: Number(form.temps_moyen_min),
      poids: Number(form.poids),
      documents_requis: form.documents_requis.split(',').map((s) => s.trim()).filter(Boolean),
      motifs_predefinis: form.motifs_predefinis.split(',').map((s) => s.trim()).filter(Boolean),
    })
  }

  return (
    <form onSubmit={submit} className="card" style={{ marginTop: 16, borderStyle: 'dashed', boxShadow: 'none' }}>
      <div className="grid grid-2">
        <Field label="Nom"><input className="input" required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></Field>
        <Field label="Préfixe ticket"><input className="input" required maxLength={3} value={form.prefixe_ticket} onChange={(e) => setForm({ ...form, prefixe_ticket: e.target.value.toUpperCase() })} /></Field>
        <Field label="Temps moyen (min)"><input className="input" type="number" min={1} value={form.temps_moyen_min} onChange={(e) => setForm({ ...form, temps_moyen_min: e.target.value })} /></Field>
        <Field label="Poids de priorité"><input className="input" type="number" min={1} value={form.poids} onChange={(e) => setForm({ ...form, poids: e.target.value })} /></Field>
      </div>
      <Field label="Documents requis (séparés par des virgules)">
        <input className="input" value={form.documents_requis} onChange={(e) => setForm({ ...form, documents_requis: e.target.value })} />
      </Field>
      <Field label="Motifs prédéfinis (séparés par des virgules)">
        <input className="input" value={form.motifs_predefinis} onChange={(e) => setForm({ ...form, motifs_predefinis: e.target.value })} />
      </Field>
      <div className="row" style={{ gap: 8, justifyContent: 'flex-start' }}>
        <Button type="submit">Enregistrer</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
      </div>
    </form>
  )
}

function PromotionsTab({ orgId, promotions, onChange }) {
  const [editing, setEditing] = useState(null) // promotion en édition, ou {} pour création

  async function save(promotion) {
    await api.upsertPromotion({ ...promotion, organisation_id: orgId })
    setEditing(null)
    onChange()
  }

  async function toggleActif(promo) {
    await api.upsertPromotion({ ...promo, actif: !promo.actif })
    onChange()
  }

  async function remove(id) {
    await api.supprimerPromotion(id)
    onChange()
  }

  return (
    <Card>
      <div className="row" style={{ marginBottom: 4 }}>
        <h3 style={{ margin: 0 }}>Storie — messages, offres, quiz</h3>
        <Button sm onClick={() => setEditing({})}>+ Nouveau</Button>
      </div>
      <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 16 }}>
        Diffusés en rotation façon storie (barre de progression, swipe) sur l’écran du client pendant son attente. Seuls les éléments actifs sont visibles.
      </p>
      {promotions.length === 0 && !editing && (
        <p className="muted" style={{ fontSize: '0.85rem' }}>Aucun message pour le moment.</p>
      )}
      <div className="stack">
        {promotions.map((p) => (
          <Card key={p.id} style={{ marginBottom: 0, opacity: p.actif ? 1 : 0.55 }}>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div>
                <div className="row" style={{ justifyContent: 'flex-start', gap: 8 }}>
                  <strong>{p.titre}</strong>
                  <Badge variant={p.type === 'quiz' ? 'primary' : 'muted'}>{p.type === 'quiz' ? '🎮 Quiz' : '💬 Message'}</Badge>
                  <Badge variant={p.actif ? 'success' : 'muted'}>{p.actif ? 'Actif' : 'Masqué'}</Badge>
                </div>
                <p className="muted" style={{ fontSize: '0.85rem', margin: '6px 0 0' }}>{p.texte}</p>
                {p.type === 'quiz' && (
                  <p className="muted" style={{ fontSize: '0.78rem', margin: '4px 0 0' }}>
                    Bonne réponse : {p.options?.find((o) => o.correcte)?.texte ?? '—'}
                  </p>
                )}
              </div>
              <div className="row" style={{ gap: 6, justifyContent: 'flex-end', flexShrink: 0 }}>
                <Button sm variant="outline" onClick={() => toggleActif(p)}>{p.actif ? 'Masquer' : 'Activer'}</Button>
                <Button sm variant="outline" onClick={() => setEditing(p)}>Modifier</Button>
                <Button sm variant="danger" onClick={() => remove(p.id)}>Supprimer</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {editing && <PromotionForm promotion={editing} onCancel={() => setEditing(null)} onSave={save} />}
    </Card>
  )
}

const EMPTY_OPTIONS = [{ texte: '', correcte: true }, { texte: '', correcte: false }]

function PromotionForm({ promotion, onCancel, onSave }) {
  const [form, setForm] = useState({
    id: promotion.id,
    type: promotion.type || 'message',
    titre: promotion.titre || '',
    texte: promotion.texte || '',
    ordre: promotion.ordre ?? 0,
    options: promotion.options?.length ? promotion.options : EMPTY_OPTIONS,
  })
  const isQuiz = form.type === 'quiz'

  function updateOption(i, texte) {
    setForm((f) => ({ ...f, options: f.options.map((o, idx) => (idx === i ? { ...o, texte } : o)) }))
  }
  function setCorrect(i) {
    setForm((f) => ({ ...f, options: f.options.map((o, idx) => ({ ...o, correcte: idx === i })) }))
  }
  function addOption() {
    setForm((f) => (f.options.length >= 4 ? f : { ...f, options: [...f.options, { texte: '', correcte: false }] }))
  }
  function removeOption(i) {
    setForm((f) => (f.options.length <= 2 ? f : { ...f, options: f.options.filter((_, idx) => idx !== i) }))
  }

  function submit(e) {
    e.preventDefault()
    onSave({ ...form, options: isQuiz ? form.options : [] })
  }

  return (
    <form onSubmit={submit} className="card" style={{ marginTop: 16, borderStyle: 'dashed', boxShadow: 'none' }}>
      <Field label="Type">
        <div className="row" style={{ justifyContent: 'flex-start', gap: 8 }}>
          <Button type="button" sm variant={!isQuiz ? 'primary' : 'outline'} onClick={() => setForm((f) => ({ ...f, type: 'message' }))}>💬 Message</Button>
          <Button type="button" sm variant={isQuiz ? 'primary' : 'outline'} onClick={() => setForm((f) => ({ ...f, type: 'quiz' }))}>🎮 Quiz</Button>
        </div>
      </Field>
      <Field label="Titre (avec emoji si souhaité)">
        <input className="input" required placeholder="🎁 Offre de la semaine" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} />
      </Field>
      <Field label={isQuiz ? 'Question' : 'Message'}>
        <textarea className="input" rows={isQuiz ? 2 : 3} required value={form.texte} onChange={(e) => setForm({ ...form, texte: e.target.value })} />
      </Field>
      {isQuiz && (
        <Field label="Réponses (cochez la bonne)">
          <div className="stack">
            {form.options.map((opt, i) => (
              <div className="row" key={i} style={{ gap: 8, justifyContent: 'flex-start' }}>
                <input type="radio" name={`correct-${form.id ?? 'new'}`} checked={opt.correcte} onChange={() => setCorrect(i)} title="Bonne réponse" />
                <input
                  className="input"
                  style={{ flex: 1 }}
                  placeholder={`Réponse ${i + 1}`}
                  value={opt.texte}
                  onChange={(e) => updateOption(i, e.target.value)}
                  required
                />
                {form.options.length > 2 && (
                  <Button type="button" sm variant="outline" onClick={() => removeOption(i)}>✕</Button>
                )}
              </div>
            ))}
          </div>
          {form.options.length < 4 && (
            <Button type="button" sm variant="outline" onClick={addOption} style={{ marginTop: 10 }}>+ Ajouter une réponse</Button>
          )}
        </Field>
      )}
      <Field label="Ordre d’affichage">
        <input className="input" type="number" min={0} value={form.ordre} onChange={(e) => setForm({ ...form, ordre: Number(e.target.value) })} style={{ maxWidth: 120 }} />
      </Field>
      <div className="row" style={{ gap: 8, justifyContent: 'flex-start' }}>
        <Button type="submit">Enregistrer</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
      </div>
    </form>
  )
}

function PostesAgentsTab({ postes, agents, services }) {
  function serviceName(id) { return services.find((s) => s.id === id)?.nom ?? id }
  function agentName(id) { return agents.find((a) => a.id === id)?.nom ?? '—' }

  return (
    <div className="grid grid-2">
      <Card>
        <h3 style={{ marginTop: 0 }}>Postes</h3>
        <table className="data-table">
          <thead><tr><th>Poste</th><th>Statut</th><th>Agent</th><th>Services servis</th></tr></thead>
          <tbody>
            {postes.map((p) => (
              <tr key={p.id}>
                <td><div className="row" style={{ justifyContent: 'flex-start', gap: 8 }}><span>🖥️</span>{p.nom}</div></td>
                <td>
                  {!p.connecte ? <Badge variant="muted">Libre</Badge> : p.en_pause ? <Badge variant="warning">Pause</Badge> : <Badge variant="success">Actif</Badge>}
                </td>
                <td>
                  {p.agent_id ? (
                    <div className="row" style={{ justifyContent: 'flex-start', gap: 8 }}>
                      <Avatar label={agentName(p.agent_id)} />
                      {agentName(p.agent_id)}
                    </div>
                  ) : '—'}
                </td>
                <td className="muted" style={{ fontSize: '0.8rem' }}>{p.service_ids.map(serviceName).join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card>
        <h3 style={{ marginTop: 0 }}>Agents</h3>
        <table className="data-table">
          <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th></tr></thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id}>
                <td><div className="row" style={{ justifyContent: 'flex-start', gap: 8 }}><Avatar label={a.nom} />{a.nom}</div></td>
                <td className="muted" style={{ fontSize: '0.8rem' }}>{a.email}</td>
                <td><Badge variant={a.role === 'admin' ? 'primary' : 'muted'}>{a.role}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: '0.8rem', marginTop: 12 }}>
          Création/désactivation d’agents et de postes : voir README § Priorité 4 (onboarding self-service), hors périmètre de ce MVP.
        </p>
      </Card>
    </div>
  )
}

const LOGO_MAX_BYTES = 2 * 1024 * 1024

function BrandingTab({ orgId, org, onChange }) {
  const [principale, setPrincipale] = useState(org.couleur_principale)
  const [secondaire, setSecondaire] = useState(org.couleur_secondaire)
  const [logo, setLogo] = useState(org.logo_url || '')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function onFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setSaved(false)
    if (!file.type.startsWith('image/')) {
      setError('Le fichier doit être une image (PNG, JPG, SVG…).')
      return
    }
    if (file.size > LOGO_MAX_BYTES) {
      setError('Image trop lourde (2 Mo maximum).')
      return
    }
    setUploading(true)
    try {
      setLogo(await api.uploadLogo(orgId, file))
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function save(e) {
    e.preventDefault()
    setError('')
    try {
      await api.majBranding(orgId, { couleur_principale: principale, couleur_secondaire: secondaire, logo_url: logo || null })
      setSaved(true)
      onChange()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Card>
      <h3 style={{ marginTop: 0 }}>Identité visuelle</h3>
      <p className="muted" style={{ fontSize: '0.85rem' }}>Couleurs et logo appliqués automatiquement aux 4 interfaces (citoyen, agent, back-office, écran de salle).</p>
      <form onSubmit={save}>
        <div className="grid grid-2">
          <Field label="Couleur principale">
            <input className="input" type="color" value={principale} onChange={(e) => { setPrincipale(e.target.value); setSaved(false) }} style={{ height: 44 }} />
          </Field>
          <Field label="Couleur secondaire">
            <input className="input" type="color" value={secondaire} onChange={(e) => { setSecondaire(e.target.value); setSaved(false) }} style={{ height: 44 }} />
          </Field>
        </div>
        <Field label="Logo du magasin">
          <div className="row" style={{ justifyContent: 'flex-start', gap: 14 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 14,
                background: '#f1f1f4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
                flexShrink: 0,
              }}
            >
              {logo ? (
                <img src={logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span className="muted" style={{ fontSize: '1.4rem', fontWeight: 700 }}>{org.nom.slice(0, 1)}</span>
              )}
            </div>
            <div>
              <input type="file" accept="image/*" onChange={onFileChange} disabled={uploading} />
              {logo && (
                <div>
                  <Button type="button" variant="outline" sm onClick={() => { setLogo(''); setSaved(false) }} style={{ marginTop: 6 }}>
                    Retirer le logo
                  </Button>
                </div>
              )}
              <p className="muted" style={{ fontSize: '0.75rem', margin: '6px 0 0' }}>PNG, JPG ou SVG — 2 Mo maximum.</p>
            </div>
          </div>
          {uploading && <p className="muted" style={{ fontSize: '0.8rem' }}>Envoi en cours…</p>}
        </Field>
        {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}
        {saved && !error && <p style={{ color: 'var(--success)', fontSize: '0.85rem' }}>Identité visuelle enregistrée.</p>}
        <Button type="submit" disabled={uploading}>Enregistrer</Button>
      </form>
    </Card>
  )
}
