import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { isDemo } from '../lib/supabase.js'
import { listOrganisations } from '../lib/demoStore.js'
import { Card, Button, Badge } from '../components/ui.jsx'

export default function LandingPage() {
  const [orgs, setOrgs] = useState([])

  useEffect(() => {
    // En production, cette page n'existe pas : le client arrive directement sur
    // /o/:orgId via le QR code du point de vente. Elle sert ici de point d'entrée
    // de démo pour choisir une organisation à tester.
    if (isDemo) setOrgs(listOrganisations())
  }, [])

  return (
    <div className="shell">
      <div className="topbar">
        <div className="topbar-logo">🎫</div>
        <div>
          <div className="topbar-title">TonTour</div>
          <div className="topbar-sub">File d’attente dématérialisée — démo</div>
        </div>
      </div>
      <div className="main">
        <Card>
          <h2 style={{ marginTop: 0 }}>Organisations de démonstration</h2>
          <p className="muted" style={{ marginBottom: 0 }}>
            En production, chaque client accède directement à <code>/o/&lt;organisation&gt;</code> en scannant le QR code
            de son point de vente. Choisissez une organisation ci-dessous pour explorer les 4 interfaces.
          </p>
        </Card>

        {!isDemo && orgs.length === 0 && (
          <Card>
            <p className="muted" style={{ margin: 0 }}>
              Supabase est connecté : cette liste de démo est désactivée. Utilisez directement l’URL de votre point de
              vente, ex. <code>/o/&lt;organisation_id&gt;</code>.
            </p>
          </Card>
        )}
        {orgs.map((org) => (
          <Card key={org.id}>
            <div className="row" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
              <div className="row" style={{ justifyContent: 'flex-start', gap: 14 }}>
                <span
                  style={{
                    width: 46, height: 46, flexShrink: 0,
                    background: org.couleur_principale,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 800, fontSize: '1.2rem', boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {org.nom.slice(0, 1)}
                </span>
                <div>
                  <strong style={{ fontSize: '1.05rem' }}>{org.nom}</strong>
                  <div style={{ marginTop: 4 }}>
                    <Badge variant="muted">{org.type === 'boutique' ? 'Boutique télécom' : 'Mairie / service public'}</Badge>
                  </div>
                  <div className="muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>{org.adresse}</div>
                </div>
              </div>
            </div>
            <div className="grid grid-2">
              <Button as={Link} to={`/o/${org.id}`} variant="primary" block>
                🎫 Parcours client
              </Button>
              <Button as={Link} to={`/o/${org.id}/connexion`} variant="outline" block>
                🔐 Agent / back-office
              </Button>
              <Button as={Link} to={`/o/${org.id}/salle`} variant="outline" block>
                📺 Écran de salle
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
