import WarehouseCover from './WarehouseCover'
import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { money, num } from '../utils/dateUtils'

export default function SpaceCard({ space, to }) {
  const used = space.total_capacity ? ((space.total_capacity - (space.available_capacity ?? space.total_capacity)) / space.total_capacity) * 100 : 0
  return (
    <Link to={to} className="space-card">
      <div className="space-art">
        <WarehouseCover space={space} />
        <StatusBadge status={space.availability} />
      </div>
      <div className="space-body">
        <h3>{space.name}</h3>
        <div className="muted small row" style={{ gap: 4 }}>
          <MapPin size={12} /> {space.location} <span style={{ opacity: 0.5 }}>|</span> <span className="num">{space.unique_code}</span>
        </div>
        <div className="meter" title={`${Math.round(used)}% booked`}><i style={{ width: `${Math.min(used, 100)}%` }} /></div>
        <div className="row spread small">
          <span>
            <b>{num(space.available_capacity)}</b> {space.unit} free of {num(space.total_capacity)}
          </span>
          <b>{money(space.unit_price)}/{space.unit}/day</b>
        </div>
        <span className="space-cta">View Details →</span>
      </div>
    </Link>
  )
}
