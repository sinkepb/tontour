import { useState } from 'react'
import { api } from '../../lib/api.js'
import { Card, Field, Button, Badge } from '../../components/ui.jsx'

const EMPTY_OPTIONS = [{ texte: '', correcte: true }, { texte: '', correcte: false }]

export default function PromotionsTab({ orgId, promotions, onChange }) {
  const [editing, setEditing] = useState(null) // promotion en édition, ou {} pour création
  const [error, setError] = useState('')

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

  async function toggleActif(promo) {
    setError('')
    try {
      await api.upsertPromotion({ ...promo, actif: !promo.actif })
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

  return (
    <Card>
      <div className="row" style={{ marginBottom: 4 }}>
        <h3 style={{ margin: 0 }}>Storie — messages, offres, quiz</h3>
        <Button sm onClick={() => setEditing({})}>+ Nouveau</Button>
      </div>
      <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 16 }}>
        Diffusés en rotation façon storie (barre de progression, swipe) sur l’écran du client pendant son attente. Seuls les éléments actifs sont visibles.
      </p>
      {error && <p role="alert" style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}
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
