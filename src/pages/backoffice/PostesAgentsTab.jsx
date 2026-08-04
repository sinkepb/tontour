import { useState } from 'react'
import { api } from '../../lib/api.js'
import { Card, Button, Badge, Avatar } from '../../components/ui.jsx'

export default function PostesAgentsTab({ postes, agents, services, onChange }) {
  const [editingAgent, setEditingAgent] = useState(null)
  const [error, setError] = useState('')

  function serviceName(id) { return services.find((s) => s.id === id)?.nom ?? id }
  function agentName(id) { return agents.find((a) => a.id === id)?.nom ?? '—' }

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

  return (
    <div className="grid grid-2">
      <Card>
        <h3 style={{ marginTop: 0 }}>Postes</h3>
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          Le poste libre est assigné automatiquement au vendeur dès sa connexion — rien à configurer ici.
        </p>
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
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          Services que chaque agent est habilité à servir — c’est vous qui les attribuez, le vendeur ne les choisit plus lui-même.
        </p>
        {error && <p role="alert" style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}
        <table className="data-table">
          <thead><tr><th>Nom</th><th>Rôle</th><th>Services attribués</th><th></th></tr></thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id}>
                <td><div className="row" style={{ justifyContent: 'flex-start', gap: 8 }}><Avatar label={a.nom} />{a.nom}</div></td>
                <td><Badge variant={a.role === 'admin' ? 'primary' : 'muted'}>{a.role}</Badge></td>
                <td className="muted" style={{ fontSize: '0.8rem' }}>{a.service_ids?.map(serviceName).join(', ') || '—'}</td>
                <td>
                  <Button sm variant="outline" onClick={() => setEditingAgent(a)}>Modifier</Button>
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
          Création/désactivation d’agents et de postes : hors périmètre de ce MVP.
        </p>
      </Card>
    </div>
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
