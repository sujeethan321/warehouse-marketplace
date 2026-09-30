import { useEffect, useState } from 'react'
import { Mail } from 'lucide-react'
import StatusBadge from '../../components/StatusBadge'
import { ownerRentals } from '../../services/rentalService'
import { errMsg } from '../../services/api'
import { formatRange, num } from '../../utils/dateUtils'
import { money } from './ownerUtils'
import { gmailComposeUrl } from './orderEmail'

export default function Orders() {
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState('')
  const [arrivalTimes, setArrivalTimes] = useState({})

  useEffect(() => {
    let active = true
    setError('')
    setOrders(null)
    ownerRentals().then((data) => { if (active) setOrders(data) })
      .catch((e) => { if (active) setError(errMsg(e)) })
    return () => { active = false }
  }, [attempt])

  const visible = orders?.filter((order) => !status || order.status === status)

  return (
    <>
      <div className="page-head">
        <div><div className="sub">Customer bookings</div><h1>Orders</h1></div>
        <div className="field">
          <label htmlFor="order-status">Booking status</label>
          <select id="order-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All bookings</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      {error && <div className="alert error" role="alert">{error} <button className="btn ghost sm" onClick={() => setAttempt((n) => n + 1)}>Retry</button></div>}
      {!orders && !error && <div className="spinner" aria-label="Loading orders" />}
      {visible?.length === 0 && <div className="empty">No {status} orders found.</div>}
      <div className="stack" style={{ gap: 20 }}>
        {visible?.map((order) => {
          const arrivalTime = arrivalTimes[order.id] || ''
          const composeUrl = gmailComposeUrl(order, arrivalTime)
          return (
            <section className="card" key={order.id} aria-labelledby={`order-${order.id}`}>
              <div className="card-head"><h2 id={`order-${order.id}`}>BK-{order.id} - {order.space_name}</h2><StatusBadge status={order.status} /></div>
              <div className="grid c2">
                <div className="stack">
                  <h3>Customer and arrival</h3>
                  <dl className="kv">
                    <dt>Customer</dt><dd>{order.customer_name || 'Not provided'}</dd>
                    <dt>Email</dt><dd style={{ overflowWrap: 'anywhere' }}>{order.customer_email || 'Not provided'}</dd>
                    <dt>Storage address</dt><dd>{order.space_location || 'Not provided'}</dd>
                    <dt>Rental dates</dt><dd>{formatRange(order.start_date, order.end_date)}</dd>
                    <dt>Capacity</dt><dd>{num(order.requested_capacity)} {order.unit}</dd>
                  </dl>
                  <div className="field">
                    <label htmlFor={`arrival-${order.id}`}>Arrival time for email (storage local time)</label>
                    <input id={`arrival-${order.id}`} type="time" value={arrivalTime} onChange={(e) => setArrivalTimes((times) => ({ ...times, [order.id]: e.target.value }))} aria-describedby={`arrival-hint-${order.id}`} />
                    <span className="hint" id={`arrival-hint-${order.id}`}>No arrival time was provided. Add an agreed time for this email; it is not saved to the booking.</span>
                  </div>
                </div>
                <div className="stack">
                  <h3>Payment information</h3>
                  <dl className="kv">
                    <dt>Booking total</dt><dd className="num">{money(order.total_price)}</dd>
                    <dt>Rate per unit / day</dt><dd className="num">{money(order.unit_price)}</dd>
                    <dt>Payment status</dt><dd>Not provided</dd>
                    <dt>Amount paid</dt><dd>Not provided</dd>
                    <dt>Payment method</dt><dd>Not provided</dd>
                    <dt>Transaction reference</dt><dd>Not provided</dd>
                  </dl>
                  <p className="muted small">Payment records are not available. The booking total does not confirm that a payment was received.</p>
                  <div>
                    {composeUrl ? <a className="btn" href={composeUrl} target="_blank" rel="noopener noreferrer"><Mail size={16} /> Send Gmail</a>
                      : <button className="btn" disabled><Mail size={16} /> Send Gmail</button>}
                  </div>
                  <p className="muted small">{composeUrl ? 'Opens a Gmail draft in a new tab for you to review and send.' : 'A customer email address is required to open a Gmail draft.'}</p>
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}
