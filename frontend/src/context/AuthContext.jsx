import { createContext, useContext, useEffect, useState } from 'react'
import * as auth from '../services/authService'
import { TOKEN_KEY } from '../services/api'
const AuthContext = createContext(null)
export const homePath = role => role === 'owner' ? '/owner' : '/customer'
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    if (!localStorage.getItem(TOKEN_KEY)) { setLoading(false); return }
    auth.me().then(value => { if (active) setUser(value) }).catch(() => { if (active) setUser(null) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const save = session => { localStorage.setItem(TOKEN_KEY, session.access_token); setUser(session.user); return session.user }
  const login = async (email, password) => save(await auth.login(email, password))
  const register = async data => save(await auth.register(data))
  const logout = () => { localStorage.removeItem(TOKEN_KEY); setUser(null) }
  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
}
export const useAuth = () => useContext(AuthContext)
