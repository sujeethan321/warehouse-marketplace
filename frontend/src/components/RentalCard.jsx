import { CalendarDays } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { formatRange, money, num } from '../utils/dateUtils'

export default function RentalCard({ rental, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ all: 'unset', cursor: onClick ? 'pointer' : 'default', display: 'block' }}
    >
      <div className="card" style={{ height: '100%' }}>
        <div className="row spread" style={{ marginBottom: 8 }}>
          <h3>{rental.space_name}</h3>
          <StatusBadge status={rental.status} />
        </div>
        <div className="muted small">{rental.space_location} | BK-{rental.id}</div>
        <div className="row small" style={{ margin: '10px 0 4px', gap: 6 }}>
          <CalendarDays size={13} /> {formatRange(rental.start_date, rental.end_date)}
        </div>
        <div className="row spread">
          <span className="small">{num(rental.requested_capacity)} {rental.unit}</span>
          <b className="num">{money(rental.total_price)}</b>
        </div>
      </div>
    </button>
  )
}
