import { useEffect, useState } from 'react'
import ReportChart from '../../components/ReportChart'
import StatCard from '../../components/StatCard'
import StatusBadge from '../../components/StatusBadge'
import { errMsg } from '../../services/api'
import { occupancy, revenue, utilisation } from '../../services/reportService'
import { mySpaces } from '../../services/spaceService'
import { addDays, downloadCSV, formatDate, money, moneyShort, num, today } from '../../utils/dateUtils'

export default function Reports() {
  const [f, setF] = useState({ start: addDays(today(), -30), end: addDays(today(), 60), space_id: '', bucket: 'week', status: '' })
  const [spaces, setSpaces] = useState([])
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  useEffect(() => { mySpaces().then(setSpaces).catch(() => {}) }, [])

  const rangeOk = f.start && f.end && f.end > f.start

  useEffect(() => {
    if (!rangeOk) return
    let stale = false
    const t = setTimeout(() => {
      const { start, end, space_id, bucket, status } = f
      Promise.all([
        utilisation({ start, end, space_id }),
        occupancy({ start, end, space_id, bucket }),
        revenue({ start, end, space_id, status }),
      ])
        .then(([util, occ, rev]) => !stale && (setData({ util, occ, rev }), setError('')))
        .catch((e) => !stale && setError(errMsg(e)))
    }, 250)
    return () => { stale = true; clearTimeout(t) }
  }, [f, rangeOk])

  function exportCSV() {
    const rows = [['Booking', 'Customer', 'Space', 'Capacity', 'Unit', 'Move in', 'Move out', 'Status', 'Total price']]
    data.rev.rows.forEach((r) => rows.push([`BK-${r.rental_id}`, r.customer_name, r.space_name, r.requested_capacity, r.unit, r.start_date, r.end_date, r.status, r.total_price]))
    downloadCSV(`revenue-${f.start}-to-${f.end}.csv`, rows)
  }

  const approvedCount = data?.rev.totals.by_status.approved || 0
  const avgPrice = approvedCount ? data.rev.totals.revenue / approvedCount : 0

  return (
    <>
      <div className="page-head">
        <div>
          <div className="sub">Portfolio performance</div>
          <h1>Reports and analytics</h1>
        </div>
        <button className="btn" disabled={!data} onClick={exportCSV}>Export CSV</button>
      </div>

      <div className="card filters">
        <div className="field"><label htmlFor="rs">From</label><input id="rs" type="date" value={f.start} onChange={set('start')} /></div>
        <div className="field"><label htmlFor="re">To (not included)</label><input id="re" type="date" value={f.end} onChange={set('end')} /></div>
        <div className="field">
          <label htmlFor="rsp">Space</label>
          <select id="rsp" value={f.space_id} onChange={set('space_id')}>
            <option value="">All spaces</option>
            {spaces.map((s) => <option key={s.id} value={s.id}>{s.unique_code} - {s.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="rb">Occupancy grouped by</label>
          <select id="rb" value={f.bucket} onChange={set('bucket')}>
            <option value="day">Day</option><option value="week">Week</option><option value="month">Month</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="rst">Rental status</label>
          <select id="rst" value={f.status} onChange={set('status')}>
            <option value="">All statuses</option><option value="approved">Approved</option><option value="pending">Pending</option>
            <option value="rejected">Rejected</option><option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {!rangeOk && <div className="alert info">The end date must be after the start date.</div>}
      {error && <div className="alert error" style={{ marginBottom: 16 }}>{error}</div>}
      {!data && !error && rangeOk && <div className="spinner" />}

      {data && (
        <div className="stack" style={{ gap: 20 }}>
          <div className="grid c4">
            <StatCard hot label="Approved revenue" value={moneyShort(data.rev.totals.revenue)} note="Approved rentals in range" />
            <StatCard label="Average utilisation" value={`${data.util.overall_utilisation_pct}%`} note="Used / total capacity" />
            <StatCard label="Pending value" value={moneyShort(data.rev.totals.pending_value)} note="Awaiting your decision" />
            <StatCard label="Average booking" value={moneyShort(avgPrice)} note={`${approvedCount} approved`} />
          </div>

          <div className="grid c2">
            <div className="card">
              <div className="card-head"><h2>Revenue by month</h2></div>
              <ReportChart data={data.rev.by_month} xKey="month" yKey="revenue" format={moneyShort} />
            </div>
            <div className="card">
              <div className="card-head"><h2>Occupancy front</h2><span className="muted small">% of capacity in use, by {f.bucket}</span></div>
              <ReportChart
                data={data.occ.points.map((p) => ({ ...p, label: p.date.slice(5) }))}
                xKey="label" yKey="occupancy_pct" type={data.occ.points.length > 20 ? 'line' : 'bar'} format={(v) => `${v}%`}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h2>Utilisation by space</h2></div>
            {data.util.spaces.length === 0 ? <div className="empty">No spaces yet.</div> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Space</th><th>Location</th><th>Total</th><th>Average used</th><th>Peak used</th><th>Utilisation</th></tr></thead>
                  <tbody>
                    {data.util.spaces.map((s) => (
                      <tr key={s.space_id}>
                        <td><b>{s.name}</b><div className="muted small">{s.unique_code}</div></td>
                        <td>{s.location}</td>
                        <td>{num(s.total_capacity)} {s.unit}</td>
                        <td>{num(s.avg_used)}</td>
                        <td>{num(s.peak_used)}</td>
                        <td style={{ minWidth: 150 }}>
                          <b className="num">{s.utilisation_pct}%</b>
                          <div className="meter"><i style={{ width: `${Math.min(s.utilisation_pct, 100)}%` }} /></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head"><h2>Rental history</h2><span className="muted small">{data.rev.rows.length} rentals starting in this range</span></div>
            {data.rev.rows.length === 0 ? <div className="empty">No rentals in this range.</div> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Booking</th><th>Customer</th><th>Space</th><th>Capacity</th><th>Move in</th><th>Move out</th><th>Total</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.rev.rows.map((r) => (
                      <tr key={r.rental_id}>
                        <td className="num">BK-{r.rental_id}</td>
                        <td>{r.customer_name}</td>
                        <td>{r.space_name}</td>
                        <td>{num(r.requested_capacity)} {r.unit}</td>
                        <td>{formatDate(r.start_date)}</td>
                        <td>{formatDate(r.end_date)}</td>
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
    </>
  )
}
