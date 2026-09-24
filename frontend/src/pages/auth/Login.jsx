import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthArt from '../../components/AuthArt'
import { homePath, useAuth } from '../../context/AuthContext'
import { errMsg } from '../../services/api'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={homePath(user.role)} replace />

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const u = await login(email.trim(), password)
      navigate(homePath(u.role), { replace: true })
    } catch (err) {
      setError(errMsg(err, 'Could not sign in.'))
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <AuthArt />
      <section className="auth-form">
        <form className="auth-card stack" onSubmit={submit}>
          <div>
            <h2>Welcome back</h2>
            <p className="muted">Sign in to manage bookings, capacity and warehouse operations.</p>
          </div>
          {error && <div className="alert error" role="alert">{error}</div>}
          <div className="field">
            <label htmlFor="email">Work email</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn block" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
          <p className="muted small" style={{ textAlign: 'center' }}>
            New to StoreShare? <Link to="/register">Create an account</Link>
          </p>
        </form>
      </section>
    </div>
  )
}
