import { useState } from 'react'
import { api } from '../../lib/api.js'
import { Card, Field, Button, Badge } from '../../components/ui.jsx'

const EMPTY_OPTIONS = [{ texte: '', correcte: true }, { texte: '', correcte: false }]

export default function PromotionsTab({ orgId, promotions, onChange }) {
  const [editing, setEditing] = useState(null) // promotion en édition, ou {} pour création
  const [error, setError] = useState('')
  // Nombre de stories visées : purement indicatif (aide l'admin à savoir combien il
  // en a prévu), n'est jamais enregistré ni imposé — l'admin peut toujours activer
  // plus ou moins de stories que ce chiffre.
  const [objectif, setObjectif] = useState('')

  async function save(promotion) {
    setError('')
    try {
      await api.upsertPromotion({ ...promotion, organisation_id: orgId })
      setEditing(null)
      onChange()
    } catch (err) {
      setError(err.message)
    }
  }

  async function deplacer(promo, actif) {
    setError('')
    try {
      const payload = { ...promo, actif }
      if (actif) {
        // Réactivée en fin de rotation plutôt que de garder son ancien ordre —
        // comportement le plus prévisible quand on vient de la faire glisser ici.
        const ordreMax = Math.max(0, ...promotions.filter((p) => p.actif).map((p) => p.ordre))
        payload.ordre = ordreMax + 1
      }
      await api.upsertPromotion(payload)
      onChange()
    } catch (err) {
      setError(err.message)
    }
  }

  async function remove(id) {
    setError('')
    try {
      await api.supprimerPromotion(id)
      onChange()
    } catch (err) {
      setError(err.message)
    }
  }

  const disponibles = promotions.filter((p) => !p.actif)
  const affichees = promotions.filter((p) => p.actif).slice().sort((a, b) => a.ordre - b.ordre)
  const objectifNum = Number(objectif) || null

  return (
    <Card>
      <div className="row" style={{ marginBottom: 4 }}>
        <h3 style={{ margin: 0 }}>Storie — messages, offres, quiz</h3>
        <Button sm onClick={() => setEditing({})}>+ Nouveau</Button>
      </div>
      <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 16 }}>
        Diffusées en rotation façon storie (barre de progression, swipe) sur l’écran du client pendant son attente.
        Déplacez une storie vers « Affichées aux clients » pour l’activer.
      </p>

      <Field label="Nombre de stories visées (indicatif — n’empêche pas d’en activer plus ou moins)">
        <input
          className="input"
          type="number"
          min={0}
          placeholder="ex. 4"
          value={objectif}
          onChange={(e) => setObjectif(e.target.value)}
          style={{ maxWidth: 140 }}
        />
      </Field>

      {error && <p role="alert" style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}

      <div className="grid grid-2" style={{ alignItems: 'start', marginTop: 8 }}>
        <div>
          <h4 style={colHeadStyle}>Disponibles ({disponibles.length})</h4>
          <div className="stack" style={{ gap: 8 }}>
            {disponibles.length === 0 && (
              <p className="muted" style={{ fontSize: '0.85rem' }}>Aucune storie disponible.</p>
            )}
            {disponibles.map((p) => (
              <StoryRow key={p.id} promo={p} onEdit={() => setEditing(p)} onRemove={() => remove(p.id)}>
                <Button sm variant="outline" onClick={() => deplacer(p, true)} aria-label={`Afficher la storie « ${p.titre} » aux clients`}>
                  Afficher →
                </Button>
              </StoryRow>
            ))}
          </div>
        </div>

        <div>
          <h4 style={colHeadStyle}>Affichées aux clients ({affichees.length}{objectifNum ? ` / ${objectifNum}` : ''})</h4>
          <div className="stack" style={{ gap: 8 }}>
            {affichees.length === 0 && (
              <p className="muted" style={{ fontSize: '0.85rem' }}>Aucune storie affichée pour le moment — les clients ne verront aucune promo.</p>
            )}
            {affichees.map((p) => (
              <StoryRow key={p.id} promo={p} onEdit={() => setEditing(p)} onRemove={() => remove(p.id)}>
                <Button sm variant="outline" onClick={() => deplacer(p, false)} aria-label={`Masquer la storie « ${p.titre} »`}>
                  ← Masquer
                </Button>
              </StoryRow>
            ))}
          </div>
        </div>
      </div>

      {editing && <PromotionForm promotion={editing} onCancel={() => setEditing(null)} onSave={save} />}
    </Card>
  )
}

const colHeadStyle = { margin: '0 0 10px', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }

function StoryRow({ promo, onEdit, onRemove, children }) {
  return (
    <Card style={{ marginBottom: 0 }}>
      <div className="row" style={{ justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
        <strong style={{ overflowWrap: 'anywhere' }}>{promo.titre}</strong>
        <Badge variant={promo.type === 'quiz' ? 'primary' : 'muted'}>{promo.type === 'quiz' ? '🎮 Quiz' : '💬 Message'}</Badge>
      </div>
      <p className="muted" style={{ fontSize: '0.82rem', margin: '6px 0 0' }}>{promo.texte}</p>
      <div className="row" style={{ gap: 6, marginTop: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {children}
        <Button sm variant="outline" onClick={onEdit}>Modifier</Button>
        <Button sm variant="danger" onClick={onRemove}>Supprimer</Button>
      </div>
    </Card>
  )
}

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
                  <Button type="button" sm variant="outline" onClick={() => removeOption(i)} aria-label={`Supprimer la réponse ${i + 1}`}>✕</Button>
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
