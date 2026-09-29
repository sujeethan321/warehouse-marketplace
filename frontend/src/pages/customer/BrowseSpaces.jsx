import { useEffect, useState } from 'react'
import SpaceCard from '../../components/SpaceCard'
import { errMsg } from '../../services/api'
import { listSpaces } from '../../services/spaceService'
import { addDays, today } from '../../utils/dateUtils'

const PAGE_SIZE = 6

export default function BrowseSpaces() {
  const [f, setF] = useState({ q: '', min_capacity: '', max_price: '', start: '', end: '' })
  const [spaces, setSpaces] = useState(null)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const datesOk = (f.start && f.end && f.end > f.start) || (!f.start && !f.end)

  useEffect(() => {
    if (!datesOk) return
    const t = setTimeout(() => {
      listSpaces({ ...f, availability: 'available' })
        .then((d) => { setSpaces(d); setError(''); setPage(1) })
        .catch((e) => setError(errMsg(e)))
    }, 300)
    return () => clearTimeout(t)
  }, [f, datesOk])

  const pages = Math.max(1, Math.ceil((spaces?.length || 0) / PAGE_SIZE))
  const shown = (spaces || []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const windowed = f.start && f.end && datesOk

  return (
    <>
      <div className="page-head">
        <div>
          <div className="sub">Marketplace</div>
          <h1>Find warehouse capacity</h1>
        </div>
      </div>

      <div className="card filters" style={{ alignItems: 'flex-end' }}>
        <div className="field search">
          <label htmlFor="q">Search name, code or city</label>
          <input id="q" value={f.q} onChange={set('q')} placeholder="Jaffna, cold storage, WH-001" />
        </div>
        <div className="field">
          <label htmlFor="start">Move in</label>
          <input id="start" type="date" min={today()} value={f.start} onChange={set('start')} />
        </div>
        <div className="field">
          <label htmlFor="end">Move out</label>
          <input id="end" type="date" min={f.start ? addDays(f.start, 1) : today()} value={f.end} onChange={set('end')} />
        </div>
        <div className="field">
          <label htmlFor="cap">Capacity needed</label>
          <input id="cap" type="number" min="0" placeholder="e.g. 100" value={f.min_capacity} onChange={set('min_capacity')} />
        </div>
        <div className="field">
          <label htmlFor="price">Max price / unit / day</label>
          <input id="price" type="number" min="0" step="0.01" placeholder="Any" value={f.max_price} onChange={set('max_price')} />
        </div>
      </div>

      {!datesOk && <div className="alert info" style={{ marginBottom: 16 }}>Pick both a move-in and a move-out date (move-out must be later) to filter by date.</div>}
      {error && <div className="alert error" style={{ marginBottom: 16 }}>{error}</div>}
      {!spaces && !error && <div className="spinner" />}

      {spaces && (
        <>
          <p className="muted" style={{ marginBottom: 14 }}>
            {spaces.length} {spaces.length === 1 ? 'space' : 'spaces'} found
            {windowed ? ' with the free capacity shown for your dates' : ' - free capacity shown for today'}
          </p>
          {spaces.length === 0 ? (
            <div className="empty">
              <b>No spaces match these filters</b>
              Try fewer filters, other dates, or a smaller capacity.
            </div>
          ) : (
            <div className="space-grid">
              {shown.map((s) => (
                <SpaceCard
                  key={s.id}
                  space={s}
                  to={`/customer/spaces/${s.id}${windowed ? `?start=${f.start}&end=${f.end}` : ''}`}
                />
              ))}
            </div>
          )}
          {pages > 1 && (
            <div className="pagination">
              <button className="btn ghost sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
              {Array.from({ length: pages }).map((_, i) => (
                <button key={i} className={`btn sm ${page === i + 1 ? '' : 'ghost'}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
              ))}
              <button className="btn ghost sm" disabled={page === pages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </>
  )
}
