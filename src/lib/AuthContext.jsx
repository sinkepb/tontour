import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [agent, setAgent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // En cas d'échec (réseau, session invalide...), on traite comme "non connecté"
    // plutôt que de laisser `loading` bloqué à `true` pour toujours : sans le catch,
    // RequireAuth/RequireRole (App.jsx) rendent `null` indéfiniment tant que loading
    // est vrai — un écran vide permanent au lieu d'une redirection vers la connexion.
    api.getSession()
      .then(setAgent)
      .catch(() => setAgent(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const a = await api.login(email, password)
    setAgent(a)
    return a
  }, [])

  const logout = useCallback(async () => {
    await api.logout()
    setAgent(null)
  }, [])

  return <AuthContext.Provider value={{ agent, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
