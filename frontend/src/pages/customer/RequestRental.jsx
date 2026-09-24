import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { errMsg } from '../../services/api'
import { createRental } from '../../services/rentalService'
import { getSpace } from '../../services/spaceService'
import useAvailability from '../../utils/useAvailability'
import { addDays, daysBetween, formatRange, money, num, today } from '../../utils/dateUtils'

export default function RequestRental() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [space, setSpace] = useState(null)
  const [start, setStart] = useState(params.get('start') || addDays(today(), 7))
  const [end, setEnd] = useState(params.get('end') || addDays(today(), 21))
  const [cap, setCap] = useState(params.get('cap') || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getSpace(id).then(setSpace).catch((e) => setError(errMsg(e)))
  }, [id])

  const { data: avail, error: availError } = useAvailability(id, start, end)

  if (!space) return error ? <div className="alert error">{error}</div> : <div className="spinner" />

  const days = daysBetween(start, end)
  const capNum = Number(cap)
  const estimate = capNum > 0 && days > 0 ? capNum * space.unit_price * days : 0
  const overTotal = capNum > space.total_capacity
  const valid = capNum > 0 && days > 0 && !overTotal && start >= today()

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await createRental({ space_id: space.id, requested_capacity: capNum, start_date: start, end_date: end })
      navigate('/customer/rentals', { state: { flash: 'Request sent. The owner will review it.' } })
    } catch (err) {
      setError(errMsg(err))
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Link to={`/customer/spaces/${space.id}`} className="row small muted" style={{ marginBottom: 8, textDecoration: 'none' }}><ArrowLeft size={13} /> Back to space</Link>
          <h1>Book storage capacity</h1>
          <div className="muted" style={{ marginTop: 6 }}>{space.name} | {space.location}</div>
        </div>
      </div>

      <form onSubmit={submit} className="grid side">
        <div className="stack">
          {error && <div className="alert error" role="alert">{error}</div>}
          <div className="card">
            <div className="card-head"><h2>Rental details</h2></div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="s">Move in (included)</label>
                <input id="s" type="date" min={today()} value={start} onChange={(e) => setStart(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="e">Move out (not charged)</label>
                <input id="e" type="date" min={addDays(start, 1)} value={end} onChange={(e) => setEnd(e.target.value)} required />
              </div>
              <div className="field span2">
                <label htmlFor="c">Capacity needed ({space.unit})</label>
                <input id="c" type="number" min="0.01" step="0.01" value={cap} onChange={(e) => setCap(e.target.value)} placeholder={`Up to ${num(space.total_capacity)}`} required />
                {overTotal && <span className="hint">This space only has {num(space.total_capacity)} {space.unit} in total.</span>}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h2>Availability for these dates</h2></div>
            {availError && <div className="alert error">{availError}</div>}
            {avail ? (
              <div className="row wrap" style={{ gap: 24 }}>
                <div><div className="muted small">Free</div><div className="num" style={{ fontSize: 24 }}>{num(avail.available)} {avail.unit}</div></div>
                <div><div className="muted small">Booked (peak)</div><div className="num" style={{ fontSize: 24 }}>{num(avail.used)}</div></div>
                <div><div className="muted small">Total</div><div className="num" style={{ fontSize: 24 }}>{num(avail.total_capacity)}</div></div>
              </div>
            ) : !availError && <div className="muted">Choose valid dates to see availability.</div>}
            {avail && capNum > avail.available && (
              <div className="alert info" style={{ marginTop: 12 }}>
                You asked for more than is free right now. You can still send the request, but it will be declined if capacity is not available when the owner reviews it.
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h2>Order summary</h2></div>
          <dl className="kv" style={{ gridTemplateColumns: '110px 1fr' }}>
            <dt>Space</dt><dd>{space.unique_code}</dd>
            <dt>Dates</dt><dd>{days > 0 ? formatRange(start, end) : '-'}</dd>
            <dt>Duration</dt><dd>{days > 0 ? `${days} days` : '-'}</dd>
            <dt>Capacity</dt><dd>{capNum > 0 ? `${num(capNum)} ${space.unit}` : '-'}</dd>
            <dt>Rate</dt><dd>{money(space.unit_price)} / {space.unit} / day</dd>
          </dl>
          <hr style={{ border: 0, borderTop: '1.5px solid var(--line)', margin: '16px 0' }} />
          <div className="row spread" style={{ marginBottom: 16 }}>
            <span>Estimated total</span>
            <b className="num" style={{ fontSize: 22 }}>{estimate ? money(estimate) : '-'}</b>
          </div>
          <button className="btn block" disabled={!valid || busy}>{busy ? 'Sending...' : 'Confirm and request booking'}</button>
          <p className="muted small" style={{ marginTop: 10 }}>Nothing is charged online. The server recalculates the price and the owner approves the request.</p>
        </div>
      </form>
    </>
  )
}
