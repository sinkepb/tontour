import { useState } from 'react'
import { api } from '../../lib/api.js'
import { Card, Button, Badge, Avatar } from '../../components/ui.jsx'

export default function AgentsTab({ agents, services, onChange }) {
  const [editingAgent, setEditingAgent] = useState(null)
  const [error, setError] = useState('')

  function serviceName(id) { return services.find((s) => s.id === id)?.nom ?? id }

  async function enregistrerServices(agentId, serviceIds) {
    setError('')
    try {
      await api.majServicesAgent(agentId, serviceIds)
      setEditingAgent(null)
      onChange()
    } catch (err) {
      setError(err.message)
    }
  }

  async function deconnecter(agent) {
    if (agent.ticket_en_cours_id) {
      const ok = window.confirm(
        `${agent.nom} est en train de servir un client. Le déconnecter remettra ce ticket en file d’attente pour un autre vendeur. Continuer ?`
      )
      if (!ok) return
    }
    setError('')
    try {
      await api.deconnecterAgentAdmin(agent.id)
      onChange()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Card>
      <h3 style={{ marginTop: 0 }}>Agents</h3>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        Services que chaque agent est habilité à servir — c’est vous qui les attribuez, le vendeur ne les choisit
        plus lui-même. Un agent devient « Disponible » dès qu’il ouvre son tableau de bord ; un agent resté actif à
        tort (parti sans se déconnecter…) peut être libéré manuellement ci-dessous.
      </p>
      {error && <p role="alert" style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}
      <table className="data-table">
        <thead><tr><th>Nom</th><th>Rôle</th><th>Statut</th><th>Services attribués</th><th></th></tr></thead>
        <tbody>
          {agents.map((a) => (
            <tr key={a.id}>
              <td><div className="row" style={{ justifyContent: 'flex-start', gap: 8 }}><Avatar label={a.nom} />{a.nom}</div></td>
              <td><Badge variant={a.role === 'admin' ? 'primary' : 'muted'}>{a.role}</Badge></td>
              <td>
                {!a.connecte ? <Badge variant="muted">Déconnecté</Badge> : a.en_pause ? <Badge variant="warning">Pause</Badge> : <Badge variant="success">Disponible</Badge>}
              </td>
              <td className="muted" style={{ fontSize: '0.8rem' }}>{a.service_ids?.map(serviceName).join(', ') || '—'}</td>
              <td>
                <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                  <Button sm variant="outline" onClick={() => setEditingAgent(a)}>Modifier</Button>
                  {a.connecte && <Button sm variant="danger" onClick={() => deconnecter(a)}>Déconnecter</Button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editingAgent && (
        <AgentServicesForm
          agent={editingAgent}
          services={services}
          onCancel={() => setEditingAgent(null)}
          onSave={(serviceIds) => enregistrerServices(editingAgent.id, serviceIds)}
        />
      )}

      <p className="muted" style={{ fontSize: '0.8rem', marginTop: 12 }}>
        Création/désactivation d’agents : hors périmètre de ce MVP.
      </p>
    </Card>
  )
}

function AgentServicesForm({ agent, services, onCancel, onSave }) {
  const [selected, setSelected] = useState(agent.service_ids ?? [])

  function toggle(id) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }

  return (
    <div className="card" style={{ marginTop: 16, borderStyle: 'dashed', boxShadow: 'none' }}>
      <h4 style={{ marginTop: 0 }}>Services de {agent.nom}</h4>
      <div className="stack">
        {services.map((s) => {
          const checked = selected.includes(s.id)
          return (
            <Card
              key={s.id}
              className="card-clickable"
              style={{ marginBottom: 0, borderColor: checked ? 'var(--org-primary)' : 'var(--border)', background: checked ? 'color-mix(in srgb, var(--org-primary) 6%, white)' : 'var(--surface)' }}
              onClick={() => toggle(s.id)}
            >
              <label className="checklist-item" style={{ padding: 0, cursor: 'pointer' }} onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={checked} onChange={() => toggle(s.id)} />
                <span style={{ flex: 1, fontWeight: 600 }}>{s.nom}</span>
                <Badge variant="primary">poids {s.poids}</Badge>
              </label>
            </Card>
          )
        })}
        {services.length === 0 && <p className="muted" style={{ fontSize: '0.85rem' }}>Aucun service actif pour le moment.</p>}
      </div>
      <div className="row" style={{ gap: 8, justifyContent: 'flex-start', marginTop: 14 }}>
        <Button onClick={() => onSave(selected)}>Enregistrer</Button>
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
      </div>
    </div>
  )
}
