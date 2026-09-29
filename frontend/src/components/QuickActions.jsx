import { Link } from 'react-router-dom'
import { List, Plus, FileText, ArrowUpRight } from 'lucide-react'

export default function QuickActions({ basePath = '/owner' }) {
  const actions = [
    [`${basePath}/spaces/new`, 'Add New Space', 'List a new warehouse', Plus],
    [`${basePath}/spaces`, 'Manage Spaces', 'View and edit spaces', List],
    [`${basePath}/requests`, 'View Requests', 'Check rental requests', FileText],
  ]
  return <section className="stack"><h2>Quick Actions</h2><div className="grid c3 quick-actions">{actions.map(([to, title, sub, Icon]) => <Link key={title} to={to} className="quick-action"><ArrowUpRight className="action-arrow" size={16} /><Icon size={28} /><b>{title}</b><span>{sub}</span></Link>)}</div></section>
}
