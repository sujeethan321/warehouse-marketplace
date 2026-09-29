import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import StatCard from '../../components/StatCard'
import StatusBadge from '../../components/StatusBadge'
import * as admin from '../../services/adminService'
import { errMsg } from '../../services/api'
import { money, num, formatRange } from '../../utils/dateUtils'

function useData(fetcher, key) {
  const [state, setState] = useState({ data: null, error: '', loading: true })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setState({ data: null, error: '', loading: true })
    fetcher().then(data => { if (active) setState({ data, error: '', loading: false }) })
      .catch(error => { if (active) setState({ data: null, error: errMsg(error), loading: false }) })
    return () => { active = false }
  }, [key, attempt])
  return { ...state, retry: () => setAttempt(n => n + 1) }
}

function Result({ state, children }) {
  if (state.loading) return <div role="status" className="empty">Loading…</div>
  if (state.error) return <div className="alert error" role="alert">{state.error} <button className="btn" onClick={state.retry}>Retry</button></div>
  return children(state.data)
}

function Pager({ data, setPage }) {
  const pages = Math.max(1, Math.ceil(data.total / data.page_size))
  return <div className="admin-pager row wrap spread" aria-label="Pagination">
    <span className="muted">{data.total} results · Page {data.page} of {pages}</span>
    <div className="row"><button className="btn" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}>Previous</button>
      <button className="btn" disabled={data.page >= pages} onClick={() => setPage(data.page + 1)}>Next</button></div>
  </div>
}

function Search({ value, setValue, label }) {
  return <label className="admin-search">{label}<input type="search" maxLength={150} value={value} onChange={e => setValue(e.target.value)} placeholder="Search by name or email" /></label>
}

export function AdminOverview() {
  const state = useData(admin.summary, 'summary')
  return <div className="stack"><div className="page-head"><div><h1>Marketplace overview</h1><p className="muted">Accounts, storage capacity, and rental activity.</p></div></div>
    <Result state={state}>{data => <>
      <div className="grid c4"><StatCard hot label="Customers" value={data.customers} /><StatCard label="Owners" value={data.owners} /><StatCard label="Storage spaces" value={data.storage_spaces} /><StatCard label="Rental requests" value={data.rental_requests} /></div>
      <div className="card"><div className="card-head"><h2>Explore the marketplace</h2></div><div className="admin-pager row wrap"><Link className="btn" to="/admin/customers">Customers</Link><Link className="btn" to="/admin/owners">Owners</Link><Link className="btn" to="/admin/rentals">Rental history</Link></div></div>
    </>}</Result>
  </div>
}

export function AdminUsers({ role }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const state = useData(() => admin.users({ role, search, page }), JSON.stringify([role, search, page]))
  return <div className="stack"><h1>{role === 'customer' ? 'Customers' : 'Owners'}</h1>
    <Search label="Search accounts" value={search} setValue={value => { setSearch(value); setPage(1) }} />
    <Result state={state}>{data => <div className="card">
      {!data.items.length ? <div className="empty">No matching accounts.</div> : <div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Profile</th></tr></thead><tbody>
        {data.items.map(u => <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.created_at?.slice(0, 10) || '—'}</td><td><Link to={`/admin/users/${u.id}`}>View {u.name}</Link></td></tr>)}
      </tbody></table></div>}<Pager data={data} setPage={setPage} />
    </div>}</Result>
  </div>
}

function RentalList({ customerId, ownerId }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const params = { search, status: status || undefined, customer_id: customerId, owner_id: ownerId, page }
  const state = useData(() => admin.rentals(params), JSON.stringify(params))
  return <div className="stack">
    <div className="row wrap admin-filters"><Search label="Search rentals, people, spaces, or locations" value={search} setValue={v => { setSearch(v); setPage(1) }} />
      <label>Status<select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}><option value="">All statuses</option>{['pending', 'approved', 'rejected', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}</select></label></div>
    <Result state={state}>{data => <div className="card">
      {!data.items.length ? <div className="empty">No matching rental requests.</div> : <div className="table-wrap"><table><thead><tr><th>Request</th><th>Customer</th><th>Owner</th><th>Space</th><th>Dates</th><th>Capacity</th><th>Total price</th><th>Status</th></tr></thead><tbody>
        {data.items.map(r => <tr key={r.id}><td><Link to={`/admin/rentals/${r.id}`}>View #{r.id}</Link></td><td>{r.customer_name}</td><td>{r.owner_name}</td><td>{r.space_name}<div className="muted small">{r.space_code}</div></td><td>{formatRange(r.start_date, r.end_date)}</td><td>{num(r.requested_capacity)} {r.unit}</td><td>{money(r.total_price)}</td><td><StatusBadge status={r.status} /></td></tr>)}
      </tbody></table></div>}<Pager data={data} setPage={setPage} />
    </div>}</Result>
  </div>
}

export function AdminRentals() {
  return <div className="stack"><h1>Rental history</h1><p className="muted">All marketplace requests, including pending, approved, rejected, and cancelled rentals.</p><RentalList /></div>
}

function OwnerSpaces({ id }) {
  const [page, setPage] = useState(1)
  const state = useData(() => admin.spaces(id, { page }), JSON.stringify([id, page]))
  return <Result state={state}>{data => <div className="card">{!data.items.length ? <div className="empty">No storage spaces yet.</div> : <div className="table-wrap"><table><thead><tr><th>Space</th><th>Location</th><th>Capacity</th><th>Price / unit / day</th><th>Availability</th></tr></thead><tbody>{data.items.map(s => <tr key={s.id}><td>{s.name}<div className="muted small">{s.unique_code}</div></td><td>{s.location}</td><td>{num(s.total_capacity)} {s.unit}</td><td>{money(s.unit_price)}</td><td>{s.availability}</td></tr>)}</tbody></table></div>}<Pager data={data} setPage={setPage} /></div>}</Result>
}

export function AdminUserDetail() {
  const { id } = useParams()
  const state = useData(() => admin.user(id), id)
  return <Result state={state}>{u => <div className="stack">
    <Link to={u.role === 'owner' ? '/admin/owners' : '/admin/customers'}>← Back to {u.role === 'owner' ? 'owners' : 'customers'}</Link>
    <h1>{u.name}</h1><div className="card admin-profile"><dl><dt>Email</dt><dd>{u.email}</dd><dt>Role</dt><dd>{u.role}</dd><dt>Account ID</dt><dd>{u.id}</dd><dt>Joined</dt><dd>{u.created_at?.slice(0, 10) || '—'}</dd></dl></div>
    {u.role === 'owner' && <><h2>Storage spaces</h2><OwnerSpaces key={id} id={id} /></>}
    <h2>{u.role === 'owner' ? 'Related rental requests' : 'Rental history'}</h2><RentalList key={id} customerId={u.role === 'customer' ? u.id : undefined} ownerId={u.role === 'owner' ? u.id : undefined} />
  </div>}</Result>
}

export function AdminRentalDetail() {
  const { id } = useParams()
  const state = useData(() => admin.rental(id), id)
  return <Result state={state}>{r => <div className="stack">
    <Link to="/admin/rentals">← Rental history</Link><div className="row wrap spread"><h1>Rental request #{r.id}</h1><StatusBadge status={r.status} /></div>
    <div className="card admin-profile"><dl>
      <dt>Customer</dt><dd><Link to={`/admin/users/${r.customer_id}`}>{r.customer_name}</Link><div>{r.customer_email}</div></dd>
      <dt>Owner</dt><dd><Link to={`/admin/users/${r.space_owner_id}`}>{r.owner_name}</Link><div>{r.owner_email}</div></dd>
      <dt>Space</dt><dd>{r.space_name} ({r.space_code})</dd><dt>Location</dt><dd>{r.space_location}</dd>
      <dt>Dates</dt><dd>{formatRange(r.start_date, r.end_date)} · {r.days} days (move-out day excluded)</dd>
      <dt>Capacity</dt><dd>{num(r.requested_capacity)} {r.unit}</dd><dt>Current space rate</dt><dd>{money(r.unit_price)} / {r.unit} / day</dd>
      <dt>Booked total</dt><dd>{money(r.total_price)}</dd><dt>Requested on</dt><dd>{r.created_at?.replace('T', ' ') || '—'}</dd>
    </dl></div>
    <h2>Status history</h2><div className="card">{!r.history?.length ? <div className="empty">No recorded status changes.</div> : <div className="table-wrap"><table><thead><tr><th>When</th><th>From</th><th>To</th><th>Changed by</th></tr></thead><tbody>{r.history.map((h, i) => <tr key={i}><td>{h.changed_at?.replace('T', ' ') || '—'}</td><td>{h.old_status || 'Created'}</td><td><StatusBadge status={h.new_status} /></td><td>{h.changed_by_name || `User #${h.changed_by}`}</td></tr>)}</tbody></table></div>}</div>
  </div>}</Result>
}
