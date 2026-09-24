import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthArt from '../../components/AuthArt'
import { homePath, useAuth } from '../../context/AuthContext'
import { errMsg } from '../../services/api'

export default function Register() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [f, setF] = useState({ first: '', last: '', email: '', password: '', role: 'customer' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  if (user) return <Navigate to={homePath(user.role)} replace />

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const u = await register({
        name: `${f.first.trim()} ${f.last.trim()}`.trim(),
        email: f.email.trim(),
        password: f.password,
        role: f.role,
      })
      navigate(homePath(u.role), { replace: true })
    } catch (err) {
      setError(errMsg(err, 'Could not create the account.'))
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <AuthArt />
      <section className="auth-form">
        <form className="auth-card stack" onSubmit={submit}>
          <div>
            <h2>Create your workspace</h2>
            <p className="muted">Tell us how you will use StoreShare.</p>
          </div>
          {error && <div className="alert error" role="alert">{error}</div>}
          <div className="role-pick">
            <label>
              <input type="radio" name="role" value="customer" checked={f.role === 'customer'} onChange={set('role')} />
              <b>Customer</b><span>Find and rent capacity</span>
            </label>
            <label>
              <input type="radio" name="role" value="owner" checked={f.role === 'owner'} onChange={set('role')} />
              <b>Warehouse owner</b><span>List and manage space</span>
            </label>
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="first">First name</label>
              <input id="first" value={f.first} onChange={set('first')} required />
            </div>
            <div className="field">
              <label htmlFor="last">Last name</label>
              <input id="last" value={f.last} onChange={set('last')} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="email">Work email</label>
            <input id="email" type="email" autoComplete="email" value={f.email} onChange={set('email')} required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={f.password} onChange={set('password')} required />
            <span className="hint">At least 8 characters.</span>
          </div>
          <button className="btn block" disabled={busy}>{busy ? 'Creating...' : f.role === 'owner' ? 'Create owner account' : 'Create customer account'}</button>
          <p className="muted small" style={{ textAlign: 'center' }}>
            Already registered? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </section>
    </div>
  )
}
