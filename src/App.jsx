import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext.jsx'
import { isDemo } from './lib/supabase.js'
import LandingPage from './pages/LandingPage.jsx'
import MarketingLandingPage from './pages/MarketingLandingPage.jsx'
import ClientPage from './pages/ClientPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import StaffLoginPage from './pages/StaffLoginPage.jsx'
import AgentPage from './pages/AgentPage.jsx'
import BackofficePage from './pages/BackofficePage.jsx'
import SalleAffichage from './pages/SalleAffichage.jsx'
import QrCodePage from './pages/QrCodePage.jsx'

function RequireRole({ role, children }) {
  const { agent, loading } = useAuth()
  const { orgId } = useParams()

  if (loading) return null
  if (!agent || agent.organisation_id !== orgId) return <Navigate to={`/o/${orgId}/connexion`} replace />
  if (role && agent.role !== role && agent.role !== 'admin') return <Navigate to={`/o/${orgId}/connexion`} replace />
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
        <Routes>
          <Route path="/" element={<MarketingLandingPage />} />
          <Route path="/connexion" element={<StaffLoginPage />} />
          {isDemo && <Route path="/demo" element={<LandingPage />} />}
          <Route path="/o/:orgId" element={<ClientPage />} />
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
      </AuthProvider>
    </BrowserRouter>
  )
}
