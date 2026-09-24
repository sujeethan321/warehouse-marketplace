import { useEffect, useState } from 'react'
import StatusBadge from './StatusBadge'
import { getRental } from '../services/rentalService'
import { errMsg } from '../services/api'
import { formatDate, formatDateTime, money, num } from '../utils/dateUtils'

const VERB = { pending: 'Request submitted', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled' }

// Booking detail + status timeline (audit trail from rental_status_history)
export default function RentalDetail({ id }) {
  const [r, setR] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getRental(id).then(setR).catch((e) => setError(errMsg(e)))
  }, [id])

  if (error) return <div className="alert error">{error}</div>
  if (!r) return <div className="spinner" />

  return (
    <div className="stack">
      <div className="row spread">
        <h3 style={{ fontSize: 18 }}>{r.space_name}</h3>
        <StatusBadge status={r.status} />
      </div>
      <dl className="kv">
        <dt>Booking</dt><dd className="num">BK-{r.id}</dd>
        <dt>Location</dt><dd>{r.space_location} ({r.space_code})</dd>
        <dt>Capacity</dt><dd>{num(r.requested_capacity)} {r.unit}</dd>
        <dt>Move in</dt><dd>{formatDate(r.start_date)}</dd>
        <dt>Move out</dt><dd>{formatDate(r.end_date)} <span className="muted small">(not charged)</span></dd>
        <dt>Duration</dt><dd>{r.days} days</dd>
        <dt>Rate</dt><dd>{money(r.unit_price)} per {r.unit} per day</dd>
        <dt>Total price</dt><dd className="num">{money(r.total_price)}</dd>
      </dl>
      <div>
        <h3 style={{ marginBottom: 12 }}>Booking timeline</h3>
        <ul className="timeline">
          {(r.history || []).map((h, i) => (
            <li key={i}>
              <b>{VERB[h.new_status] || h.new_status}</b>
              <div className="muted small">{h.changed_by_name || 'System'} | {formatDateTime(h.changed_at)}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
