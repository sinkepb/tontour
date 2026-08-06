import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext.jsx'
import { isDemo } from './lib/supabase.js'
import { LoadingScreen } from './components/ui.jsx'
import MarketingLandingPage from './pages/MarketingLandingPage.jsx'
import ClientPage from './pages/ClientPage.jsx'

// Chargées à la demande : pages réservées au personnel (agent/admin) ou peu visitées,
// pour garder le bundle initial léger sur le parcours citoyen (mobile, scan QR code —
// c'est là que le temps de chargement compte le plus).
const LandingPage = lazy(() => import('./pages/LandingPage.jsx'))
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'))
const StaffLoginPage = lazy(() => import('./pages/StaffLoginPage.jsx'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage.jsx'))
const AgentPage = lazy(() => import('./pages/AgentPage.jsx'))
const BackofficePage = lazy(() => import('./pages/BackofficePage.jsx'))
const SalleAffichage = lazy(() => import('./pages/SalleAffichage.jsx'))
const QrCodePage = lazy(() => import('./pages/QrCodePage.jsx'))
const EnseignePage = lazy(() => import('./pages/EnseignePage.jsx'))
const MentionsLegales = lazy(() => import('./pages/legal/MentionsLegales.jsx'))
const CGU = lazy(() => import('./pages/legal/CGU.jsx'))
const CGV = lazy(() => import('./pages/legal/CGV.jsx'))
const Confidentialite = lazy(() => import('./pages/legal/Confidentialite.jsx'))

function RequireRole({ role, children }) {
  const { agent, loading } = useAuth()
  const { orgId } = useParams()

  if (loading) return null
  if (!agent || agent.organisation_id !== orgId) return <Navigate to={`/o/${orgId}/connexion`} replace />
  if (role && agent.role !== role && agent.role !== 'admin') return <Navigate to={`/o/${orgId}/connexion`} replace />
  return children
}

// Pas d'orgId dans ce chemin (vue transverse à plusieurs organisations) : seule
// l'authentification est requise ici, EnseignePage gère elle-même le cas où l'agent
// connecté n'a pas d'enseigne_id (message explicite plutôt qu'une redirection muette).
function RequireAuth({ children }) {
  const { agent, loading } = useAuth()
  if (loading) return null
  if (!agent) return <Navigate to="/connexion" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {isDemo && (
          <div className="demo-banner">
            Mode démo — données locales à ce navigateur, aucun backend connecté. Voir README pour brancher Supabase.
          </div>
        )}
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<MarketingLandingPage />} />
            <Route path="/connexion" element={<StaffLoginPage />} />
            <Route path="/inscription" element={<OnboardingPage />} />
            <Route path="/mentions-legales" element={<MentionsLegales />} />
            <Route path="/cgu" element={<CGU />} />
            <Route path="/cgv" element={<CGV />} />
            <Route path="/confidentialite" element={<Confidentialite />} />
            <Route
              path="/enseigne"
              element={
                <RequireAuth>
                  <EnseignePage />
                </RequireAuth>
              }
            />
            {isDemo && <Route path="/demo" element={<LandingPage />} />}
            <Route path="/o/:orgId" element={<ClientPage />} />
            {/* Même composant que /o/:orgId : la seule différence est l'en-tête CSP
                frame-ancestors, ouvert pour ce chemin (voir vercel.json) afin que le
                client puisse l'intégrer en <iframe> sur son propre site. */}
            <Route path="/widget/:orgId" element={<ClientPage />} />
            <Route path="/o/:orgId/connexion" element={<LoginPage />} />
            <Route
              path="/o/:orgId/agent"
              element={
                <RequireRole>
                  <AgentPage />
                </RequireRole>
              }
            />
            <Route
              path="/o/:orgId/backoffice"
              element={
                <RequireRole role="admin">
                  <BackofficePage />
                </RequireRole>
              }
            />
            <Route path="/o/:orgId/salle" element={<SalleAffichage />} />
            <Route
              path="/o/:orgId/qrcode"
              element={
                <RequireRole>
                  <QrCodePage />
                </RequireRole>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
