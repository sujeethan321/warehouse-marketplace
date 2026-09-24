import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../../components/Modal'
import RentalCard from '../../components/RentalCard'
import RentalDetail from '../../components/RentalDetail'
import StatCard from '../../components/StatCard'
import StatusBadge from '../../components/StatusBadge'
import { useAuth } from '../../context/AuthContext'
import { errMsg } from '../../services/api'
import { myRentals } from '../../services/rentalService'
import { formatRange, greeting, money, moneyShort, num, today } from '../../utils/dateUtils'

export default function CustomerDashboard() {
  const { user } = useAuth()
  const [rentals, setRentals] = useState(null)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    myRentals().then(setRentals).catch((e) => setError(errMsg(e)))
  }, [])

  const t = today()
  const approved = (rentals || []).filter((r) => r.status === 'approved')
  const active = approved.filter((r) => r.start_date <= t && r.end_date > t)
  const upcoming = approved.filter((r) => r.end_date > t).sort((a, b) => a.start_date.localeCompare(b.start_date))
  const pending = (rentals || []).filter((r) => r.status === 'pending')

  return (
    <>
      <div className="page-head">
        <div>
          <div className="sub">Customer workspace</div>
          <h1>{greeting()}, {user.name.split(' ')[0]}</h1>
        </div>
        <Link to="/customer/browse" className="btn">Find warehouses</Link>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 16 }}>{error}</div>}
      {!rentals && !error && <div className="spinner" />}

      {rentals && (
        <div className="stack" style={{ gap: 20 }}>
          <div className="grid c4">
            <StatCard label="Active rentals" value={active.length} note={`${upcoming.length - active.length} starting soon`} hot />
            <StatCard label="Booked spend" value={moneyShort(approved.reduce((s, r) => s + r.total_price, 0))} note="Approved rentals" />
            <StatCard label="Capacity in use today" value={num(active.reduce((s, r) => s + r.requested_capacity, 0))} note="Across all spaces" />
            <StatCard label="Awaiting approval" value={pending.length} note="Pending owner review" />
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Your rentals</h2>
              <Link to="/customer/rentals" className="small">View all</Link>
            </div>
            {upcoming.length === 0 ? (
              <div className="empty">
                <b>No approved rentals yet</b>
                Browse warehouses and send your first request.
              </div>
            ) : (
              <div className="grid c3">
                {upcoming.slice(0, 3).map((r) => (
                  <RentalCard key={r.id} rental={r} onClick={() => setOpenId(r.id)} />
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head"><h2>Recent activity</h2></div>
            {rentals.length === 0 ? (
              <div className="empty">Nothing here yet.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Booking</th><th>Space</th><th>Dates</th><th>Total</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {rentals.slice(0, 5).map((r) => (
                      <tr key={r.id} className="clickable" onClick={() => setOpenId(r.id)}>
                        <td className="num">BK-{r.id}</td>
                        <td>{r.space_name}</td>
                        <td>{formatRange(r.start_date, r.end_date)}</td>
                        <td className="num">{money(r.total_price)}</td>
                        <td><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {openId && (
        <Modal title="Rental details" onClose={() => setOpenId(null)}>
          <RentalDetail id={openId} />
        </Modal>
      )}
    </>
  )
}
