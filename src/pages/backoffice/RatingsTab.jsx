import { Card, Badge, Avatar } from '../../components/ui.jsx'

function Stars({ value }) {
  if (value == null) return <span className="muted" style={{ fontSize: '0.82rem' }}>Pas encore d’avis</span>
  const rounded = Math.round(value)
  return (
    <span title={`${value} / 5`}>
      {'⭐'.repeat(rounded)}
      {'☆'.repeat(5 - rounded)}
      <span className="muted" style={{ fontSize: '0.78rem', marginLeft: 6 }}>{value.toFixed(2)}/5</span>
    </span>
  )
}

export default function RatingsTab({ notesServices, notesVendeurs, avisRecents, services }) {
  function serviceName(id) { return services.find((s) => s.id === id)?.nom ?? '—' }

  return (
    <div className="stack">
    <div className="grid grid-2" style={{ marginBottom: 16 }}>
      <Card>
        <h3 style={{ marginTop: 0 }}>Note moyenne par service</h3>
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          Calculée sur les notes 1 à 5 laissées par les clients juste après leur passage.
        </p>
        <table className="data-table">
          <thead><tr><th>Service</th><th>Note moyenne</th><th>Avis</th></tr></thead>
          <tbody>
            {notesServices.map((n) => (
              <tr key={n.service_id}>
                <td>{n.service_nom}</td>
                <td><Stars value={n.note_moyenne} /></td>
                <td className="muted">{n.nb_avis}</td>
              </tr>
            ))}
            {notesServices.length === 0 && (
              <tr><td colSpan={3} className="muted" style={{ fontSize: '0.85rem' }}>Aucun service pour le moment.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
      <Card>
        <h3 style={{ marginTop: 0 }}>Note moyenne par vendeur</h3>
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          Attribuée au vendeur qui a effectivement appelé le ticket, même s’il s’est déconnecté depuis.
        </p>
        <table className="data-table">
          <thead><tr><th>Vendeur</th><th>Note moyenne</th><th>Avis</th></tr></thead>
          <tbody>
            {notesVendeurs.map((n) => (
              <tr key={n.agent_id}>
                <td>
                  <div className="row" style={{ justifyContent: 'flex-start', gap: 8 }}>
                    <Avatar label={n.agent_nom} />
                    {n.agent_nom}
                  </div>
                </td>
                <td><Stars value={n.note_moyenne} /></td>
                <td className="muted">{n.nb_avis}</td>
              </tr>
            ))}
            {notesVendeurs.length === 0 && (
              <tr><td colSpan={3} className="muted" style={{ fontSize: '0.85rem' }}>Aucun agent pour le moment.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>

    <Card>
      <h3 style={{ marginTop: 0 }}>Commentaires récents</h3>
      {avisRecents.length === 0 && <p className="muted" style={{ fontSize: '0.85rem' }}>Aucun commentaire pour le moment.</p>}
      <div className="stack">
        {avisRecents.map((a) => (
          <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div className="row" style={{ justifyContent: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: '0.95rem' }}>{'⭐'.repeat(a.note)}{'☆'.repeat(5 - a.note)}</span>
              <Badge variant="muted">{a.code}</Badge>
              <Badge variant="muted">{serviceName(a.service_id)}</Badge>
            </div>
            <p style={{ fontSize: '0.88rem', margin: '6px 0 0' }}>{a.commentaire}</p>
          </div>
        ))}
      </div>
    </Card>
    </div>
  )
}
