import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Mail, LockKeyhole, Eye, EyeOff } from 'lucide-react'
import warehouseImage from '../../assets/login-warehouse.png'
import { homePath, useAuth } from '../../context/AuthContext'
import { errMsg } from '../../services/api'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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
    <div className="login-page">
      <div className="login-photo"><img src={warehouseImage} alt="Warehouse aisle with storage racks and warm yellow lighting" /></div>
      <section className="login-panel" aria-labelledby="login-title">
        <form className="login-form" onSubmit={submit}>
          <header className="login-heading">
            <h1 id="login-title">Welcome <span>Back</span></h1>
            <p>Login to your account</p>
          </header>
          {error && <div className="alert error" role="alert">{error}</div>}
          <div className="login-field">
            <label htmlFor="email">Email address</label>
            <div className="login-input">
              <Mail size={23} aria-hidden="true" />
              <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
          </div>
          <div className="login-field">
            <label htmlFor="password">Password</label>
            <div className="login-input">
              <LockKeyhole size={23} aria-hidden="true" />
              <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
              <button type="button" className="login-password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((shown) => !shown)}>
                {showPassword ? <EyeOff size={23} /> : <Eye size={23} />}
              </button>
            </div>
          </div>
          <button className="login-submit" disabled={busy}>{busy ? 'Signing in...' : 'Login'}</button>
          <p className="login-register">Don't have an account? <Link to="/register">Register</Link></p>
        </form>
      </section>
    </div>
  )
}
// vanakkam