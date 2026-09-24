import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
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
    <>
      <div className="page-head">
        <div>
          <div className="sub">Bookings</div>
          <h1>Rental history</h1>
        </div>
        <Link to="/customer/browse" className="btn">Find warehouses</Link>
      </div>

      {flash && <div className="alert ok" style={{ marginBottom: 16 }} role="status">{flash}</div>}
      {error && <div className="alert error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="filters">
        <div className="tabs" role="tablist">
          {TABS.map(([v, label]) => (
            <button key={v} className={tab === v ? 'on' : ''} onClick={() => setTab(v)}>{label}</button>
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
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Booking</th><th>Space</th><th>Capacity</th><th>Dates</th><th>Total</th><th>Status</th><th /></tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.id}>
                      <td className="num">BK-{r.id}</td>
                      <td><b>{r.space_name}</b><div className="muted small">{r.space_location}</div></td>
                      <td>{num(r.requested_capacity)} {r.unit}</td>
                      <td>{formatRange(r.start_date, r.end_date)}<div className="muted small">{r.days} days</div></td>
                      <td className="num">{money(r.total_price)}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td className="actions">
                        <button className="btn ghost sm" onClick={() => setOpenId(r.id)}>View</button>{' '}
                        {(r.status === 'pending' || r.status === 'approved') && (
                          <button className="btn ghost sm" onClick={() => setCancelling(r)}>Cancel</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            <>
              <button className="btn ghost" onClick={() => setCancelling(null)}>Keep rental</button>
              <button className="btn" disabled={busy} onClick={confirmCancel}>{busy ? 'Cancelling...' : 'Cancel rental'}</button>
            </>
          }
        >
          <p>BK-{cancelling.id} at <b>{cancelling.space_name}</b> ({formatRange(cancelling.start_date, cancelling.end_date)}) will be cancelled and the capacity released. This cannot be undone.</p>
        </Modal>
      )}
    </>
  )
}
