import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import WarehouseCover from '../../components/WarehouseCover'
import Modal from '../../components/Modal'
import RentalDetail from '../../components/RentalDetail'
import StatusBadge from '../../components/StatusBadge'
import { errMsg } from '../../services/api'
import { myRentals, setRentalStatus } from '../../services/rentalService'
import { formatRange, money, num } from '../../utils/dateUtils'

const TABS = [['', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['cancelled', 'Cancelled']]

export default function MyRentals() {
  const location = useLocation()
  const [rentals, setRentals] = useState(null)
  const [tab, setTab] = useState('')
  const [q, setQ] = useState('')
  const [error, setError] = useState('')
  const [flash, setFlash] = useState(location.state?.flash || '')
  const [openId, setOpenId] = useState(null)
  const [cancelling, setCancelling] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    myRentals().then(setRentals).catch((e) => setError(errMsg(e)))
  }, [])
  useEffect(load, [load])

  async function confirmCancel() {
    setBusy(true)
    try {
      await setRentalStatus(cancelling.id, 'cancelled')
      setFlash(`BK-${cancelling.id} was cancelled.`)
      setCancelling(null)
      load()
    } catch (e) {
      setError(errMsg(e))
      setCancelling(null)
    }
    setBusy(false)
  }

  const shown = (rentals || []).filter(
    (r) => (!tab || r.status === tab) && (!q || `${r.space_name} ${r.space_location} BK-${r.id}`.toLowerCase().includes(q.toLowerCase())),
  )

  return (
    <div className="customer-ui">
      <div className="page-head">
        <div>
          <div className="sub">Bookings</div>
          <h1>My Rentals</h1><p className="muted" style={{ marginTop: 8 }}>View and manage your rental requests.</p>
        </div>
        <Link to="/customer/browse" className="btn">Find warehouses</Link>
      </div>

      {flash && <div className="alert ok" style={{ marginBottom: 16 }} role="status">{flash}</div>}
      {error && <div className="alert error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="filters">
        <div className="tabs" role="tablist">
          {TABS.map(([v, label]) => (
            <button key={v} className={tab === v ? 'on' : ''} onClick={() => setTab(v)} role="tab" aria-selected={tab === v}>{label}<span className="tab-count">{rentals ? rentals.filter((r) => !v || r.status === v).length : '–'}</span></button>
          ))}
        </div>
        <div className="field search right">
          <input aria-label="Search rentals" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by space, city or booking number" />
        </div>
      </div>

      {!rentals && !error && <div className="spinner" />}
      {rentals && (
        <div className="card">
          {shown.length === 0 ? (
            <div className="empty">
              <b>{rentals.length ? 'No rentals match' : 'No rentals yet'}</b>
              {rentals.length ? 'Try another status or search.' : 'Find a warehouse and send your first request.'}
            </div>
          ) : (
            <div className="rental-list">
              {shown.map((r) => (
                <article className="rental-row" key={r.id}>
                  <WarehouseCover space={{ name: r.space_name, unique_code: r.space_unique_code, cover_image_url: r.space_cover_image_url }} />
                  <div className="rental-info"><h3>{r.space_name}</h3><p className="muted small">{r.space_location} · BK-{r.id}</p><p className="small">{formatRange(r.start_date, r.end_date)}</p><p className="muted small">{num(r.requested_capacity)} {r.unit} · {r.days} days</p></div>
                  <div className="rental-actions"><StatusBadge status={r.status} /><b>{money(r.total_price)}</b><div className="rental-buttons"><button className="btn ghost sm" onClick={() => setOpenId(r.id)}>View Details</button>{(r.status === 'pending' || r.status === 'approved') && <button className="btn ghost sm" onClick={() => setCancelling(r)}>Cancel</button>}</div></div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {openId && (
        <Modal title="Rental details" onClose={() => setOpenId(null)}>
          <RentalDetail id={openId} />
        </Modal>
      )}
      {cancelling && (
        <Modal
          title="Cancel this rental?"
          onClose={() => setCancelling(null)}
          footer={
            <div className="customer-cancel-actions">
              <button className="btn ghost" onClick={() => setCancelling(null)}>Keep rental</button>
              <button className="btn" disabled={busy} onClick={confirmCancel}>{busy ? 'Cancelling...' : 'Cancel rental'}</button>
            </div>
          }
        >
          <p>BK-{cancelling.id} at <b>{cancelling.space_name}</b> ({formatRange(cancelling.start_date, cancelling.end_date)}) will be cancelled and the capacity released. This cannot be undone.</p>
        </Modal>
      )}
    </div>
  )
}
