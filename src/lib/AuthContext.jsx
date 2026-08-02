import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [agent, setAgent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getSession().then((a) => {
      setAgent(a)
      setLoading(false)
    })
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
