import { CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge'
import { formatRange, money, num } from '../utils/dateUtils'

export default function RentalCard({ rental, onClick }) {
  return (
    <article className="card rental-summary">
      <button type="button" className="rental-summary-details" onClick={onClick} aria-label={`View details for booking BK-${rental.id}`}>
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
      </button>
      {rental.status === 'approved' && <Link className="btn sm proceed-payment" to={`/customer/rentals/${rental.id}/payment`}>Proceed to Payment</Link>}
    </article>
  )
}
