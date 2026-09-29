import { Link } from 'react-router-dom'
import { Search, ClipboardPlus, List, ArrowUpRight } from 'lucide-react'

export default function QuickActions() {
  const actions = [
    ['/customer/browse', 'Browse Spaces', 'Find available warehouses', Search],
    ['/customer/browse', 'Request Rental', 'Choose a space to rent', ClipboardPlus],
    ['/customer/rentals', 'My Rentals', 'View your rentals', List],
  ]
  return <section className="stack"><h2>Quick Actions</h2><div className="grid c3 quick-actions">{actions.map(([to, title, sub, Icon]) => <Link key={title} to={to} className="quick-action"><ArrowUpRight className="action-arrow" size={16} /><Icon size={28} /><b>{title}</b><span>{sub}</span></Link>)}</div></section>
}
