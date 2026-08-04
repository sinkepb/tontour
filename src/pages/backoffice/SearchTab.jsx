import { useState } from 'react'
import { api } from '../../lib/api.js'
import { toCsv, downloadCsv } from '../../lib/csv.js'
import { Card, Field, Button, StatutBadge } from '../../components/ui.jsx'

const AVIS_COLONNES = [
  { label: 'Code', value: (t) => t.code },
  { label: 'Statut', value: (t) => t.statut },
  { label: 'Service', value: (t, ctx) => ctx.serviceName(t.service_id) },
  { label: 'Motif', value: (t) => t.motif ?? '' },
  { label: 'Téléphone', value: (t) => t.telephone ?? '' },
  { label: 'Prioritaire', value: (t) => (t.prioritaire ? 'oui' : 'non') },
  { label: 'Note', value: (t) => t.note ?? '' },
  { label: 'Commentaire', value: (t) => t.commentaire ?? '' },
  { label: 'Créé le', value: (t) => t.cree_le },
  { label: 'Appelé le', value: (t) => t.appele_le ?? '' },
  { label: 'Terminé le', value: (t) => t.termine_le ?? '' },
]

export default function SearchTab({ orgId, services, agents }) {
  const [code, setCode] = useState('')
  const [telephone, setTelephone] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [resultats, setResultats] = useState(null)
  const [busy, setBusy] = useState(false)

  function serviceName(id) { return services.find((s) => s.id === id)?.nom ?? '—' }
  function agentName(id) { return agents.find((a) => a.id === id)?.nom ?? '—' }

  async function rechercher(e) {
    e.preventDefault()
    setBusy(true)
    try {
      setResultats(await api.rechercherTickets(orgId, { code, telephone, dateDebut, dateFin }))
    } finally {
      setBusy(false)
    }
  }

  function exporter() {
    // ctx passé à chaque colonne pour résoudre service_id -> nom sans dupliquer la table de recherche dans le CSV.
    const columns = AVIS_COLONNES.map((c) => ({ label: c.label, value: (t) => c.value(t, { serviceName }) }))
    downloadCsv(`tickets-${orgId}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(resultats, columns))
  }

  return (
    <div className="stack">
      <Card>
        <h3 style={{ marginTop: 0 }}>Recherche de tickets</h3>
        <p className="muted" style={{ fontSize: '0.85rem' }}>Par code, téléphone ou plage de dates — tous les filtres sont optionnels et combinables.</p>
        <form onSubmit={rechercher}>
          <div className="grid grid-2">
            <Field label="Code du ticket"><input className="input" placeholder="V-01" value={code} onChange={(e) => setCode(e.target.value)} /></Field>
            <Field label="Téléphone"><input className="input" value={telephone} onChange={(e) => setTelephone(e.target.value)} /></Field>
            <Field label="Du"><input className="input" type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} /></Field>
            <Field label="Au"><input className="input" type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} /></Field>
          </div>
          <Button type="submit" disabled={busy}>{busy ? 'Recherche…' : '🔍 Rechercher'}</Button>
        </form>
      </Card>

      {resultats && (
        <Card>
          <div className="row" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{resultats.length} résultat{resultats.length > 1 ? 's' : ''}</h3>
            <Button sm variant="outline" disabled={resultats.length === 0} onClick={exporter}>⬇️ Exporter en CSV</Button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Code</th><th>Statut</th><th>Service</th><th>Vendeur</th><th>Téléphone</th><th>Note</th><th>Créé le</th></tr>
              </thead>
              <tbody>
                {resultats.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className="row" style={{ justifyContent: 'flex-start', gap: 6 }}>
                        {t.prioritaire && <span title="Prioritaire">🔴</span>}
                        <strong>{t.code}</strong>
                      </div>
                    </td>
                    <td><StatutBadge statut={t.statut} /></td>
                    <td>{serviceName(t.service_id)}</td>
                    <td className="muted">{t.agent_id ? agentName(t.agent_id) : '—'}</td>
                    <td className="muted">{t.telephone ?? '—'}</td>
                    <td>{t.note ? `${t.note} ⭐` : '—'}</td>
                    <td className="muted" style={{ fontSize: '0.8rem' }}>{new Date(t.cree_le).toLocaleString('fr-FR')}</td>
                  </tr>
                ))}
                {resultats.length === 0 && (
                  <tr><td colSpan={7} className="muted" style={{ fontSize: '0.85rem' }}>Aucun ticket ne correspond à ces critères.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
