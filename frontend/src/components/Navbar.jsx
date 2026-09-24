import { LogOut } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const LABELS = {
  customer: 'Customer', owner: 'Owner', browse: 'Find warehouse capacity', spaces: 'Storage spaces',
  rentals: 'My rentals', request: 'Book storage capacity', requests: 'Rental requests', import: 'Import storage spaces',
  reports: 'Reports & analytics', new: 'Add storage space', edit: 'Edit space',
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const parts = pathname.split('/').filter(Boolean)
  const trail = parts.filter((p) => isNaN(Number(p))).map((p) => LABELS[p] || p)
  const initials = user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <header className="topbar">
      <div className="crumbs">
        {trail.map((t, i) => (i === trail.length - 1 ? <b key={i}>{t}</b> : <span key={i}>{t} / </span>))}
      </div>
      <div className="user-chip right">
        <div className="who">
          <b>{user.name}</b>
          <span>{user.role === 'owner' ? 'Warehouse owner' : 'Customer'}</span>
        </div>
        <div className="avatar">{initials}</div>
        <button
          className="icon-btn"
          title="Sign out"
          aria-label="Sign out"
          onClick={() => { logout(); navigate('/login') }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}
