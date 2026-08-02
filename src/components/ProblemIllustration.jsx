// Illustration "avant / après" en SVG pur (aucune image externe, aucune dépendance) :
// à gauche la file d'attente physique classique, à droite le parcours TonTour.
// La couleur de droite suit --seg-color (segment marketing actif).

function Person({ x, y, tone = '#94a3b8', arms = 'down' }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="0" r="11" fill={tone} />
      {arms === 'down' ? (
        <rect x="-13" y="14" width="26" height="34" rx="13" fill={tone} />
      ) : (
        <>
          <rect x="-13" y="14" width="26" height="34" rx="13" fill={tone} />
          <rect x="-22" y="16" width="10" height="24" rx="5" fill={tone} transform="rotate(-25 -22 16)" />
        </>
      )}
    </g>
  )
}

export default function ProblemIllustration() {
  return (
    <svg viewBox="0 0 640 300" role="img" aria-label="Comparaison entre une file d’attente physique et le parcours TonTour" style={{ width: '100%', height: 'auto', maxWidth: 640 }}>
      {/* Panneau gauche — avant */}
      <rect x="0" y="0" width="290" height="300" rx="24" fill="#eef0f4" />
      <text x="145" y="34" textAnchor="middle" fontSize="13" fontWeight="800" fill="#6b7280" style={{ fontFamily: 'Inter, sans-serif' }}>
        FILE D’ATTENTE CLASSIQUE
      </text>

      {/* horloge frustrée */}
      <circle cx="145" cy="72" r="18" fill="none" stroke="#94a3b8" strokeWidth="3" />
      <path d="M145 62 L145 72 L153 78" stroke="#94a3b8" strokeWidth="3" fill="none" strokeLinecap="round" />
      <text x="172" y="78" fontSize="20">😩</text>

      {/* file de personnes qui se chevauchent */}
      <Person x="90" y="200" tone="#cbd5e1" />
      <Person x="118" y="195" tone="#b6c0cf" />
      <Person x="146" y="190" tone="#9fadc0" />
      <Person x="174" y="185" tone="#8593a8" arms="crossed" />
      <rect x="60" y="230" width="230" height="6" rx="3" fill="#d8dce3" />
      <text x="145" y="266" textAnchor="middle" fontSize="12" fill="#6b7280" style={{ fontFamily: 'Inter, sans-serif' }}>
        Debout, sans visibilité sur l’attente
      </text>

      {/* Flèche centrale */}
      <g transform="translate(320, 150)">
        <circle r="26" fill="white" stroke="#e7e8ee" strokeWidth="1.5" />
        <path d="M-8 0 L8 0 M2 -7 L9 0 L2 7" stroke="#9aa0ab" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Panneau droit — après */}
      <rect x="350" y="0" width="290" height="300" rx="24" style={{ fill: 'color-mix(in srgb, var(--seg-color) 12%, white)' }} />
      <text x="495" y="34" textAnchor="middle" fontSize="13" fontWeight="800" style={{ fontFamily: 'Inter, sans-serif', fill: 'var(--seg-color)' }}>
        AVEC TONTOUR
      </text>

      {/* personne assise, détendue */}
      <g transform="translate(440, 210)">
        <circle cx="0" cy="-40" r="11" fill="#334155" />
        <rect x="-13" y="-26" width="26" height="30" rx="12" fill="#334155" />
        <rect x="-24" y="4" width="20" height="12" rx="6" fill="#334155" />
        <rect x="6" y="4" width="20" height="12" rx="6" fill="#334155" />
      </g>

      {/* téléphone + ticket */}
      <g transform="translate(500, 150)">
        <rect x="-22" y="-40" width="44" height="80" rx="10" fill="white" stroke="#cbd5e1" strokeWidth="2" />
        <rect x="-14" y="-30" width="28" height="6" rx="3" style={{ fill: 'var(--seg-color)' }} opacity="0.4" />
        <rect x="-14" y="-18" width="20" height="6" rx="3" fill="#e2e8f0" />
        <rect x="-14" y="-6" width="24" height="6" rx="3" fill="#e2e8f0" />
      </g>
      <g transform="translate(540, 96)">
        <rect x="-34" y="-22" width="68" height="44" rx="12" style={{ fill: 'var(--seg-color)' }} />
        <text x="0" y="6" textAnchor="middle" fontSize="16" fontWeight="800" fill="white" style={{ fontFamily: 'Inter, sans-serif' }}>A-04</text>
      </g>
      <text x="565" y="60" fontSize="20">🔔</text>

      <text x="495" y="266" textAnchor="middle" fontSize="12" style={{ fontFamily: 'Inter, sans-serif', fill: 'var(--seg-color)' }}>
        Assis, notifié au bon moment
      </text>
    </svg>
  )
}
