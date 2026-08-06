import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.jsx'
import './index.css'

// Désactivé tant que VITE_SENTRY_DSN n'est pas renseigné (aucun compte Sentry
// configuré pour ce projet à ce stade) — aucun changement de comportement pour
// l'instant, prêt à activer en ajoutant la variable d'environnement.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    // Session Replay/Tracing non activés par défaut : un DSN suffit à capturer
    // les erreurs, le reste est un coût (quota Sentry) à activer volontairement.
    integrations: [],
  })
}

function ErrorFallback() {
  return (
    <div className="loading-screen">
      <div className="center" style={{ maxWidth: 320, padding: 24 }}>
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</div>
        <p style={{ fontWeight: 700, margin: '0 0 6px' }}>Une erreur est survenue</p>
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 16 }}>
          Rechargez la page pour continuer. L’équipe a été notifiée automatiquement.
        </p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Recharger</button>
      </div>
    </div>
  )
}

const Root = sentryDsn ? (
  <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
    <App />
  </Sentry.ErrorBoundary>
) : (
  <App />
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {Root}
  </React.StrictMode>
)
