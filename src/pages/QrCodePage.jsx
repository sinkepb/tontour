import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import QrCode from '../components/QrCode.jsx'
import { Button, LoadingScreen } from '../components/ui.jsx'

/**
 * Page autonome (pas de topbar de navigation) pensée pour l'impression :
 * une affiche A4 avec le QR code du point de vente, à coller en boutique.
 * Le style d'impression (@media print) masque tout ce qui n'est pas l'affiche.
 */
export default function QrCodePage() {
  const { orgId } = useParams()
  const [org, setOrg] = useState(null)

  useEffect(() => {
    api.getOrganisation(orgId).then(setOrg)
  }, [orgId])

  if (!org) return <LoadingScreen />

  const url = `${window.location.origin}/o/${org.id}`

  return (
    <div className="qr-print-page" style={{ '--org-primary': org.couleur_principale, '--org-secondary': org.couleur_secondaire }}>
      <style>{`
        .qr-print-page { min-height: 100vh; background: var(--bg); display: flex; flex-direction: column; align-items: center; padding: 32px 16px; }
        .qr-poster { background: white; width: 100%; max-width: 480px; box-shadow: 0 20px 48px rgba(20,22,28,0.14), 0 4px 12px rgba(20,22,28,0.06); padding: 48px 40px; text-align: center; animation: fadeInUp 0.3s ease both; }
        .qr-poster .logo { width: 68px; height: 68px; background: var(--org-primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.7rem; margin: 0 auto 16px; overflow: hidden; }
        .qr-poster .logo img { width: 100%; height: 100%; object-fit: cover; }
        .qr-poster h1 { font-size: 1.4rem; margin: 0 0 4px; }
        .qr-poster .tagline { color: var(--text-muted); font-size: 0.95rem; margin-bottom: 28px; }
        .qr-poster .qr-frame { display: inline-block; padding: 16px; border: 3px solid var(--org-primary); margin-bottom: 20px; }
        .qr-poster .instructions { font-size: 1.05rem; font-weight: 700; margin-bottom: 6px; }
        .qr-poster .steps { text-align: left; font-size: 0.85rem; color: var(--text-muted); margin: 20px auto 0; max-width: 320px; line-height: 1.7; }
        .qr-poster .org-id { margin-top: 24px; font-size: 0.7rem; color: var(--text-muted); word-break: break-all; }
        .no-print { margin-top: 20px; display: flex; gap: 10px; }
        @media print {
          .qr-print-page { background: white; padding: 0; }
          .qr-poster { box-shadow: none; max-width: 100%; }
          .no-print { display: none; }
          @page { margin: 12mm; }
        }
      `}</style>

      <div className="qr-poster">
        <div className="logo">{org.logo_url ? <img src={org.logo_url} alt="" /> : org.nom.slice(0, 1)}</div>
        <h1>{org.nom}</h1>
        <div className="tagline">File d’attente sans contact</div>

        <div className="qr-frame">
          <QrCode url={url} size={240} color={org.couleur_principale} />
        </div>

        <div className="instructions">📱 Scannez pour prendre un ticket</div>
        <div className="steps">
          1. Scannez ce code avec l’appareil photo de votre téléphone
          <br />2. Choisissez le service souhaité
          <br />3. Recevez votre code de passage et suivez votre position en direct — vous pouvez ranger votre téléphone, une notification vous préviendra
        </div>

        <div className="org-id">Identifiant point de vente : {org.id}</div>
      </div>

      <div className="no-print">
        <Button onClick={() => window.print()}>🖨️ Imprimer cette affiche</Button>
        <Button as={Link} to={`/o/${orgId}/backoffice`} variant="outline">
          ← Retour au back-office
        </Button>
      </div>
    </div>
  )
}
