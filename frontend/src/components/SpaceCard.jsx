import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { money, num } from '../utils/dateUtils'

// Line-art warehouse used in place of photos. The number of bays varies with the space id.
function WarehouseArt({ seed = 1 }) {
  const bays = 3 + (seed % 3)
  const w = 300 / bays
  return (
    <svg viewBox="0 0 300 150" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <g fill="none" stroke="#FFF200" strokeWidth="2" strokeLinejoin="round">
        <path d="M14 62 150 30l136 32v80H14z" opacity=".9" />
        <path d="M14 62h272" opacity=".5" />
        {Array.from({ length: bays }).map((_, i) => (
          <g key={i}>
            <rect x={14 + i * w + w * 0.18} y="84" width={w * 0.64} height="58" />
            {[0, 1, 2, 3, 4].map((k) => (
              <path key={k} d={`M${14 + i * w + w * 0.18} ${94 + k * 10}h${w * 0.64}`} opacity=".45" />
            ))}
          </g>
        ))}
      </g>
      <rect x="0" y="142" width="300" height="8" fill="url(#hz)" />
      <defs>
        <pattern id="hz" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
          <rect width="8" height="16" fill="#FFF200" />
        </pattern>
      </defs>
    </svg>
  )
}

export default function SpaceCard({ space, to }) {
  const used = space.total_capacity ? ((space.total_capacity - (space.available_capacity ?? space.total_capacity)) / space.total_capacity) * 100 : 0
  return (
    <Link to={to} className="space-card">
      <div className="space-art">
        <WarehouseArt seed={space.id} />
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
      </div>
    </Link>
  )
}
