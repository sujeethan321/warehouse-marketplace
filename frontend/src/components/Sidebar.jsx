import { BarChart3, ClipboardList, FileUp, LayoutDashboard, Search, Warehouse, Boxes } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const CUSTOMER_NAV = [
  { to: '/customer', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/customer/browse', label: 'Find warehouses', icon: Search },
  { to: '/customer/rentals', label: 'My rentals', icon: ClipboardList },
]
const OWNER_NAV = [
  { to: '/owner', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/owner/spaces', label: 'Storage spaces', icon: Warehouse },
  { to: '/owner/requests', label: 'Rental requests', icon: ClipboardList },
  { to: '/owner/import', label: 'CSV import', icon: FileUp },
  { to: '/owner/reports', label: 'Reports & analytics', icon: BarChart3 },
]

export default function Sidebar() {
  const { user } = useAuth()
  const items = user.role === 'owner' ? OWNER_NAV : CUSTOMER_NAV
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><Boxes size={18} strokeWidth={2.4} /></div>
        <div>
          <b>StoreShare</b>
          <span>Capacity marketplace</span>
        </div>
      </div>
      <div className="hazard" />
      <div className="workspace-pill">{user.role === 'owner' ? 'Warehouse owner workspace' : 'Customer workspace'}</div>
      <nav className="nav">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon size={16} /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="help-box">
          <b>Need operational help?</b>
          {user.role === 'owner'
            ? 'Requests are re-checked against capacity when you approve them.'
            : 'Move-out day is not charged: a rental Oct 1 to Oct 15 is 14 days.'}
        </div>
      </div>
    </aside>
  )
}
