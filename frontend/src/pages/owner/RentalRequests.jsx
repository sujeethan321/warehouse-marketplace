import { useCallback, useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import StatusBadge from '../../components/StatusBadge'
import { errMsg } from '../../services/api'
import { getRental, ownerRentals, setRentalStatus } from '../../services/rentalService'
import { formatDate, formatRange, money, num } from '../../utils/dateUtils'

const TABS = [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['cancelled', 'Cancelled'], ['', 'All']]

export default function RentalRequests() {
  const [tab, setTab] = useState('pending')
  const [list, setList] = useState(null)
  const [selId, setSelId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState('')

  const loadList = useCallback(() => {
    ownerRentals(tab).then((d) => {
      setList(d)
      setSelId((cur) => (d.some((r) => r.id === cur) ? cur : d[0]?.id ?? null))
    }).catch((e) => setError(errMsg(e)))
  }, [tab])
  useEffect(loadList, [loadList])

  useEffect(() => {
    setDetail(null)
    if (selId) getRental(selId).then(setDetail).catch((e) => setError(errMsg(e)))
  }, [selId])

  async function act(status) {
    setBusy(status)
    setError('')
    setNotice('')
    try {
      await setRentalStatus(detail.id, status)
      setNotice(`BK-${detail.id} ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'cancelled'}.`)
      loadList()
      getRental(detail.id).then(setDetail)
    } catch (e) {
      // 409 = the server re-checked capacity and refused (overbooking)
      setError(errMsg(e))
      getRental(detail.id).then(setDetail).catch(() => {})
    }
    setBusy('')
  }

  const cap = detail?.capacity
  const over = cap && !cap.ok

  return (
    <>
      <div className="page-head">
        <div>
          <div className="sub">Booking requests</div>
          <h1>Rental requests</h1>
        </div>
        <div className="tabs">
          {TABS.map(([v, label]) => (
            <button key={v} className={tab === v ? 'on' : ''} onClick={() => setTab(v)}>{label}</button>
          ))}
        </div>
      </div>

      {notice && <div className="alert ok" style={{ marginBottom: 16 }} role="status">{notice}</div>}
      {error && <div className="alert error" style={{ marginBottom: 16 }} role="alert">{error}</div>}
      {!list && !error && <div className="spinner" />}

      {list && list.length === 0 && (
        <div className="empty"><b>No {tab || ''} requests</b>New requests from customers will show up here.</div>
      )}

      {list && list.length > 0 && (
        <div className="grid side" style={{ gridTemplateColumns: 'minmax(0,1fr) 340px' }}>
          <div className="stack">
            <div className="card">
              <div className="card-head"><h2>Requests</h2><span className="muted small">{list.length} shown</span></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Customer</th><th>Space</th><th>Capacity</th><th>Dates</th><th>Value</th><th>Status</th></tr></thead>
                  <tbody>
                    {list.map((r) => (
                      <tr key={r.id} className={`clickable ${r.id === selId ? 'selected' : ''}`} onClick={() => { setSelId(r.id); setError(''); setNotice('') }}>
                        <td><b>{r.customer_name}</b><div className="muted small">RQ-{r.id}</div></td>
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
            </div>

            {detail && (
              <div className="card">
                <div className="card-head"><h2>Request detail RQ-{detail.id}</h2><StatusBadge status={detail.status} /></div>
                <dl className="kv">
                  <dt>Customer</dt><dd>{detail.customer_name} <span className="muted small">{detail.customer_email}</span></dd>
                  <dt>Space</dt><dd>{detail.space_name} ({detail.space_code})</dd>
                  <dt>Capacity</dt><dd>{num(detail.requested_capacity)} {detail.unit}</dd>
                  <dt>Move in</dt><dd>{formatDate(detail.start_date)}</dd>
                  <dt>Move out</dt><dd>{formatDate(detail.end_date)} <span className="muted small">(not charged)</span></dd>
                  <dt>Total price</dt><dd className="num">{money(detail.total_price)} <span className="muted small">({detail.days} days)</span></dd>
                </dl>
              </div>
            )}
          </div>

          {detail && (
            <div className="stack">
              <div className="card">
                <div className="card-head"><h2>Capacity check</h2></div>
                {cap ? (
                  <>
                    <dl className="kv" style={{ gridTemplateColumns: '1fr auto' }}>
                      <dt>Already booked (peak)</dt><dd className="num">{num(cap.used)}</dd>
                      <dt>This request</dt><dd className="num">+ {num(detail.requested_capacity)}</dd>
                      <dt>Projected</dt><dd className="num">{num(cap.projected)}</dd>
                      <dt>Space total</dt><dd className="num">{num(cap.total)} {detail.unit}</dd>
                    </dl>
                    <div className={`alert ${over ? 'error' : 'ok'}`} style={{ marginTop: 14 }}>
                      {over ? <X size={15} /> : <Check size={15} />}
                      {over
                        ? `Over capacity by ${num(cap.projected - cap.total)} ${detail.unit}. Approval will be refused.`
                        : `Fits with ${num(cap.total - cap.projected)} ${detail.unit} to spare.`}
                    </div>
                    <p className="muted small" style={{ marginTop: 8 }}>The server checks again at the moment you approve.</p>
                  </>
                ) : <div className="spinner" />}
              </div>

              <div className="card">
                <div className="card-head"><h2>Decision</h2></div>
                {detail.status === 'pending' && (
                  <div className="stack">
                    <button className="btn block" disabled={!!busy} onClick={() => act('approved')}>{busy === 'approved' ? 'Approving...' : 'Approve request'}</button>
                    <button className="btn ghost block" disabled={!!busy} onClick={() => act('rejected')}>{busy === 'rejected' ? 'Rejecting...' : 'Reject request'}</button>
                  </div>
                )}
                {detail.status === 'approved' && (
                  <div className="stack">
                    <p className="muted">This rental is approved and is using capacity.</p>
                    <button className="btn ghost block" disabled={!!busy} onClick={() => act('cancelled')}>{busy === 'cancelled' ? 'Cancelling...' : 'Cancel rental'}</button>
                  </div>
                )}
                {(detail.status === 'rejected' || detail.status === 'cancelled') && (
                  <p className="muted">This request is {detail.status}. No further changes are possible.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
