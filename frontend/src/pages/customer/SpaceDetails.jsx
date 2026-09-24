import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, MapPin } from 'lucide-react'
import ReportChart from '../../components/ReportChart'
import StatusBadge from '../../components/StatusBadge'
import { errMsg } from '../../services/api'
import { getSpace } from '../../services/spaceService'
import useAvailability from '../../utils/useAvailability'
import { addDays, daysBetween, formatDate, money, num, today } from '../../utils/dateUtils'

export default function SpaceDetails() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const [space, setSpace] = useState(null)
  const [error, setError] = useState('')
  const [start, setStart] = useState(params.get('start') || addDays(today(), 7))
  const [end, setEnd] = useState(params.get('end') || addDays(today(), 21))
  const [cap, setCap] = useState('')

  useEffect(() => {
    getSpace(id).then(setSpace).catch((e) => setError(errMsg(e)))
  }, [id])

  const { data: avail, error: availError, loading } = useAvailability(id, start, end)

  if (error) return <div className="alert error">{error}</div>
  if (!space) return <div className="spinner" />

  const days = daysBetween(start, end)
  const capNum = Number(cap)
  const quote = capNum > 0 && days > 0 ? capNum * space.unit_price * days : 0
  const fits = avail && capNum > 0 && capNum <= avail.available
  const chart = (avail?.timeline || []).map((p) => ({ day: p.date.slice(5), free: p.available }))
  const canBook = space.availability === 'available'

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/customer/browse" className="row small muted" style={{ marginBottom: 8, textDecoration: 'none' }}><ArrowLeft size={13} /> Back to results</Link>
          <h1>{space.name}</h1>
          <div className="muted row" style={{ marginTop: 6, gap: 5 }}><MapPin size={13} /> {space.location} | listed by {space.owner_name}</div>
        </div>
        <StatusBadge status={space.availability} />
      </div>

      <div className="grid side">
        <div className="stack">
          <div className="grid c3">
            <div className="stat"><div className="k">Total capacity</div><div className="v">{num(space.total_capacity)}</div><div className="n">{space.unit}</div></div>
            <div className="stat"><div className="k">Free today</div><div className="v">{num(space.available_capacity)}</div><div className="n">{space.unit}</div></div>
            <div className="stat"><div className="k">Price</div><div className="v">{money(space.unit_price)}</div><div className="n">per {space.unit} per day</div></div>
          </div>

          <div className="card">
            <div className="card-head"><h2>Check your dates</h2></div>
            <div className="form-grid" style={{ marginBottom: 14 }}>
              <div className="field">
                <label htmlFor="s">Move in (included)</label>
                <input id="s" type="date" min={today()} value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="e">Move out (not charged)</label>
                <input id="e" type="date" min={addDays(start, 1)} value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
            {availError && <div className="alert error">{availError}</div>}
            {avail && (
              <>
                <p style={{ marginBottom: 10 }}>
                  <b>{num(avail.available)} {avail.unit}</b> free for the whole stay
                  <span className="muted"> ({formatDate(start)} to {formatDate(end)}, {days} days)</span>
                </p>
                {chart.length > 0 && <ReportChart data={chart} xKey="day" yKey="free" highlight="all" height={190} format={num} />}
                <p className="muted small" style={{ marginTop: 8 }}>Bars show the free {avail.unit} on each day, after approved rentals.</p>
              </>
            )}
            {loading && !avail && <div className="spinner" />}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h2>Book available space</h2></div>
          <div className="stack">
            <div className="field">
              <label htmlFor="cap">Capacity needed ({space.unit})</label>
              <input id="cap" type="number" min="0.01" step="0.01" value={cap} onChange={(e) => setCap(e.target.value)} placeholder="e.g. 100" />
            </div>
            <dl className="kv" style={{ gridTemplateColumns: '110px 1fr' }}>
              <dt>Duration</dt><dd>{days > 0 ? `${days} days` : '-'}</dd>
              <dt>Estimate</dt><dd className="num">{quote ? money(quote) : '-'}</dd>
            </dl>
            {capNum > 0 && avail && !fits && <div className="alert error">Only {num(avail.available)} {avail.unit} is free on these dates.</div>}
            {canBook ? (
              <Link
                className="btn block"
                to={`/customer/request/${space.id}?start=${start}&end=${end}${capNum > 0 ? `&cap=${capNum}` : ''}`}
              >
                Request this space
              </Link>
            ) : (
              <div className="alert info">The owner is not accepting requests for this space right now.</div>
            )}
            <p className="muted small">The owner reviews every request. The final price is calculated by the server.</p>
          </div>
        </div>
      </div>
    </>
  )
}
