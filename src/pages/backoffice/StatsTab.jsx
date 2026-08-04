import { IconBadge } from '../../components/ui.jsx'

const STAT_META = [
  ['tickets_traites', 'Tickets traités aujourd’hui', '✅', '#16a34a'],
  ['tickets_total', 'Tickets créés aujourd’hui', '🎫', '#2563eb'],
  ['attente_moyenne_min', 'Attente moyenne (min)', '⏱️', '#d97706'],
  ['postes_connectes', 'Postes connectés', '🖥️', '#7c3aed'],
]

export default function StatsTab({ stats, tendance, heures }) {
  return (
    <div className="stack">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        {STAT_META.map(([key, label, icon, tint]) => (
          <div className="stat-tile" key={key}>
            <IconBadge icon={icon} tint={tint} />
            <div className="value" style={{ marginTop: 12 }}>{stats[key]}</div>
            <div className="label">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-2">
        <BarChart
          title="Tickets créés — 14 derniers jours"
          data={tendance}
          valueKey="tickets_crees"
          label={(d) => new Date(`${d.jour}T00:00:00Z`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })}
        />
        <BarChart
          title="Tickets traités — 14 derniers jours"
          data={tendance}
          valueKey="tickets_traites"
          label={(d) => new Date(`${d.jour}T00:00:00Z`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })}
        />
      </div>

      <BarChart
        title="Heures de pointe — 30 derniers jours"
        data={heures}
        valueKey="nb_tickets"
        label={(d) => d.heure}
      />
    </div>
  )
}

/** Petit graphique en barres, sans dépendance externe — voir .chart-* dans index.css
 * pour le style (arrondi façon Calendly, cohérent avec le reste du design system). */
function BarChart({ title, data, valueKey, label }) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]))
  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <div className="chart-bars">
        {data.map((d, i) => (
          <div className="chart-bar-col" key={i} title={`${label(d)} : ${d[valueKey]}`}>
            <div className="chart-bar-value">{d[valueKey] > 0 ? d[valueKey] : ''}</div>
            <div className="chart-bar" style={{ height: `${Math.max(2, (d[valueKey] / max) * 100)}%` }} />
            <div className="chart-bar-label">{label(d)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
