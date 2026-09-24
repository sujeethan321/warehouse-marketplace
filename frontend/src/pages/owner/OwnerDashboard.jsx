import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ReportChart from '../../components/ReportChart'
import StatCard from '../../components/StatCard'
import StatusBadge from '../../components/StatusBadge'
import { useAuth } from '../../context/AuthContext'
import { errMsg } from '../../services/api'
import { ownerRentals } from '../../services/rentalService'
import { revenue, utilisation } from '../../services/reportService'
import { mySpaces } from '../../services/spaceService'
import { addDays, formatRange, money, moneyShort, num, today } from '../../utils/dateUtils'

export default function OwnerDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = today()
    Promise.all([mySpaces(), utilisation({ start: t, end: addDays(t, 1) }), revenue(), ownerRentals()])
      .then(([spaces, util, rev, rentals]) => setData({ spaces, util, rev, rentals }))
      .catch((e) => setError(errMsg(e)))
  }, [])

  if (error) return <div className="alert error">{error}</div>
  if (!data) return <div className="spinner" />

  const { spaces, util, rev, rentals } = data
  const pending = rentals.filter((r) => r.status === 'pending')
  const nearlyFull = util.spaces.filter((s) => s.utilisation_pct >= 90)
  const offline = spaces.filter((s) => s.availability === 'unavailable')
  const alerts = [
    ...(pending.length ? [{ level: 'Action', text: `${pending.length} rental ${pending.length === 1 ? 'request needs' : 'requests need'} your review`, to: '/owner/requests' }] : []),
    ...nearlyFull.map((s) => ({ level: 'Watch', text: `${s.name} is ${s.utilisation_pct}% booked today`, to: '/owner/spaces' })),
    ...offline.map((s) => ({ level: 'Info', text: `${s.name} is marked unavailable`, to: `/owner/spaces/${s.id}/edit` })),
  ]

  return (
    <>
      <div className="page-head">
        <div>
          <div className="sub">Welcome back, {user.name.split(' ')[0]}</div>
          <h1>Operations overview</h1>
        </div>
        <Link to="/owner/spaces/new" className="btn">Add storage space</Link>
      </div>

      <div className="stack" style={{ gap: 20 }}>
        <div className="grid c4">
          <StatCard hot label="Occupancy today" value={`${util.overall_utilisation_pct}%`} note="Across all your spaces" />
          <StatCard label="Storage spaces" value={spaces.length} note={`${spaces.length - offline.length} accepting requests`} />
          <StatCard label="Approved revenue" value={moneyShort(rev.totals.revenue)} note={`${money(rev.totals.pending_value)} pending`} />
          <StatCard label="Requests to review" value={pending.length} note="Pending your decision" />
        </div>

        <div className="grid c2">
          <div className="card">
            <div className="card-head"><h2>Capacity utilisation today</h2></div>
            <ReportChart data={util.spaces} xKey="unique_code" yKey="utilisation_pct" highlight="all" format={(v) => `${v}%`} />
          </div>
          <div className="card">
            <div className="card-head"><h2>Monthly revenue</h2></div>
            <ReportChart data={rev.by_month} xKey="month" yKey="revenue" format={moneyShort} />
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h2>Alerts and actions</h2></div>
          {alerts.length === 0 ? (
            <div className="empty">All clear. Nothing needs your attention.</div>
          ) : (
            <table>
              <tbody>
                {alerts.map((a, i) => (
                  <tr key={i}>
                    <td style={{ width: 90 }}><span className={`badge ${a.level === 'Action' ? 'solid' : 'dashed'}`}>{a.level}</span></td>
                    <td>{a.text}</td>
                    <td className="actions"><Link to={a.to}>Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-head"><h2>Recent activity</h2><Link to="/owner/requests" className="small">All requests</Link></div>
          {rentals.length === 0 ? (
            <div className="empty">No customer requests yet.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Customer</th><th>Space</th><th>Capacity</th><th>Dates</th><th>Value</th><th>Status</th></tr></thead>
                <tbody>
                  {rentals.slice(0, 5).map((r) => (
                    <tr key={r.id}>
                      <td>{r.customer_name}</td>
                      <td>{r.space_name}</td>
                      <td>{num(r.requested_capacity)} {r.unit}</td>
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
    </>
  )
}