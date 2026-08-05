import { useState } from 'react'
import { api } from '../../lib/api.js'
import { Card, Field, Button, Badge } from '../../components/ui.jsx'
import { serviceIcon } from '../../lib/serviceIcon.js'

export default function ServicesTab({ orgId, services, onChange }) {
  const [editing, setEditing] = useState(null) // service en édition, ou {} pour création
  const [error, setError] = useState('')

  async function save(service) {
    setError('')
    try {
      await api.upsertService({ ...service, organisation_id: orgId })
      setEditing(null)
      onChange()
    } catch (err) {
      setError(err.message)
    }
  }

  async function remove(service) {
    const ok = window.confirm(
      `Désactiver le service « ${service.nom} » ? Il n’apparaîtra plus dans les listes et les nouveaux clients ne pourront plus le choisir.`
    )
    if (!ok) return
    setError('')
    try {
      await api.supprimerService(service.id)
      onChange()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Card>
      <div className="row" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Services</h3>
        <Button sm onClick={() => setEditing({})}>+ Nouveau service</Button>
      </div>
      {error && <p role="alert" style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}
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
                <Button sm variant="danger" onClick={() => remove(s)}>Désactiver</Button>
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
