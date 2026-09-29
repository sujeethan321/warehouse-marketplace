import { createContext, useContext, useEffect, useState } from 'react'
import * as authService from '../services/authService'
import { TOKEN_KEY } from '../services/api'

const AuthContext = createContext(null)

export const homePath = (role) => role === 'owner' ? '/owner' : '/customer'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    if (!localStorage.getItem(TOKEN_KEY)) {
      setLoading(false)
      return
    }
    authService.me()
      .then((currentUser) => { if (active) setUser(currentUser) })
      .catch(() => { if (active) setUser(null) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  function saveSession(session) {
    localStorage.setItem(TOKEN_KEY, session.access_token)
    setUser(session.user)
    return session.user
  }

  async function login(email, password) {
    return saveSession(await authService.login(email, password))
  }

  async function register(payload) {
    return saveSession(await authService.register(payload))
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
