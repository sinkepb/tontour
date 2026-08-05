import { useState } from 'react'
import { api } from '../../lib/api.js'
import { Card, Field, Button, Badge, Avatar, EmptyState } from '../../components/ui.jsx'

/** Gestion en self-service de l'appartenance à une enseigne (regroupement multi-
 * boutiques) : créer une enseigne, y rattacher sa PROPRE organisation, y donner
 * accès à ses PROPRES agents. RLS (organisations_admin_write / agents_admin_write)
 * empêche déjà côté serveur de rattacher une organisation ou un agent qui n'est pas
 * le sien — ce composant ne fait qu'exposer ce que le serveur autorise déjà. */
export default function EnseigneTab({ org, agents, enseignes, onChange }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [nomNouvelleEnseigne, setNomNouvelleEnseigne] = useState('')
  const [enseigneChoisie, setEnseigneChoisie] = useState('')

  const enseigneActuelle = enseignes.find((e) => e.id === org.enseigne_id) || null
  const autresEnseignes = enseignes.filter((e) => e.id !== org.enseigne_id)

  async function creerEtRejoindre(e) {
    e.preventDefault()
    if (!nomNouvelleEnseigne.trim()) return
    setError('')
    setBusy(true)
    try {
      const enseigne = await api.creerEnseigne(nomNouvelleEnseigne.trim())
      await api.majEnseigneOrganisation(org.id, enseigne.id)
      setNomNouvelleEnseigne('')
      onChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function rejoindre(e) {
    e.preventDefault()
    if (!enseigneChoisie) return
    setError('')
    setBusy(true)
    try {
      await api.majEnseigneOrganisation(org.id, enseigneChoisie)
      setEnseigneChoisie('')
      onChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function quitter() {
    const ok = window.confirm(
      `Quitter l’enseigne « ${enseigneActuelle?.nom} » ? Les agents ayant accès à la vue enseigne perdront cet accès.`
    )
    if (!ok) return
    setError('')
    setBusy(true)
    try {
      await api.majEnseigneOrganisation(org.id, null)
      onChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function basculerAccesAgent(agent, accorder) {
    setError('')
    try {
      await api.majAccesEnseigneAgent(agent.id, accorder ? org.enseigne_id : null)
      onChange()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Card>
      <h3 style={{ marginTop: 0 }}>Enseigne</h3>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        Regroupe plusieurs points de vente sous une même enseigne pour une vue consolidée en lecture seule
        (statistiques agrégées, accessible depuis « 🏬 Vue enseigne »).
      </p>
      {error && <p role="alert" style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}

      {enseigneActuelle ? (
        <>
          <div className="row" style={{ padding: '12px 14px', background: 'var(--bg)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
            <div>
              <div className="muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Enseigne actuelle</div>
              <strong style={{ fontSize: '1.05rem' }}>{enseigneActuelle.nom}</strong>
            </div>
            <Button sm variant="danger" onClick={quitter} disabled={busy}>Quitter l’enseigne</Button>
          </div>

          <h4 style={{ marginBottom: 8, fontSize: '0.9rem' }}>Accès à la vue enseigne</h4>
          <p className="muted" style={{ fontSize: '0.82rem', marginTop: 0, marginBottom: 12 }}>
            Les agents cochés voient les statistiques agrégées de toute l’enseigne, en plus de leur propre point de vente.
          </p>
          <div className="stack" style={{ gap: 6 }}>
            {agents.map((a) => {
              const aAcces = a.enseigne_id === org.enseigne_id
              return (
                <label
                  key={a.id}
                  className="row list-row"
                  style={{ padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                >
                  <div className="row" style={{ justifyContent: 'flex-start', gap: 10 }}>
                    <Avatar label={a.nom} />
                    <span>{a.nom}</span>
                    <Badge variant={a.role === 'admin' ? 'primary' : 'muted'}>{a.role}</Badge>
                  </div>
                  <input type="checkbox" checked={aAcces} onChange={(e) => basculerAccesAgent(a, e.target.checked)} />
                </label>
              )
            })}
            {agents.length === 0 && <p className="muted" style={{ fontSize: '0.85rem' }}>Aucun agent pour le moment.</p>}
          </div>
        </>
      ) : (
        <div className="grid grid-2">
          <form onSubmit={creerEtRejoindre} className="card" style={{ marginBottom: 0, boxShadow: 'none' }}>
            <h4 style={{ marginTop: 0 }}>Créer une enseigne</h4>
            <Field label="Nom de l’enseigne">
              <input
                className="input"
                placeholder="ex. Mobile Store — réseau national"
                value={nomNouvelleEnseigne}
                onChange={(e) => setNomNouvelleEnseigne(e.target.value)}
              />
            </Field>
            <Button type="submit" disabled={busy || !nomNouvelleEnseigne.trim()}>Créer et rejoindre</Button>
          </form>

          <form onSubmit={rejoindre} className="card" style={{ marginBottom: 0, boxShadow: 'none' }}>
            <h4 style={{ marginTop: 0 }}>Rejoindre une enseigne existante</h4>
            {enseignes.length === 0 ? (
              <EmptyState icon="🏬">Aucune enseigne créée pour le moment.</EmptyState>
            ) : (
              <>
                <Field label="Enseigne">
                  <select className="input" value={enseigneChoisie} onChange={(e) => setEnseigneChoisie(e.target.value)}>
                    <option value="">Choisir…</option>
                    {autresEnseignes.map((e) => (
                      <option key={e.id} value={e.id}>{e.nom}</option>
                    ))}
                  </select>
                </Field>
                <Button type="submit" disabled={busy || !enseigneChoisie}>Rejoindre</Button>
              </>
            )}
          </form>
        </div>
      )}
    </Card>
  )
}
