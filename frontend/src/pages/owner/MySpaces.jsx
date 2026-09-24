import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import Modal from '../../components/Modal'
import StatCard from '../../components/StatCard'
import StatusBadge from '../../components/StatusBadge'
import { errMsg } from '../../services/api'
import { deleteSpace, mySpaces, updateSpace } from '../../services/spaceService'
import { money, num } from '../../utils/dateUtils'

export default function MySpaces() {
  const [spaces, setSpaces] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [avail, setAvail] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    mySpaces().then(setSpaces).catch((e) => setError(errMsg(e)))
  }, [])
  useEffect(load, [load])

  async function toggle(s) {
    setError('')
    try {
      await updateSpace(s.id, {
        unique_code: s.unique_code, name: s.name, total_capacity: s.total_capacity, unit: s.unit,
        unit_price: s.unit_price, location: s.location,
        availability: s.availability === 'available' ? 'unavailable' : 'available',
      })
      load()
    } catch (e) {
      setError(errMsg(e))
    }
  }

  async function confirmDelete() {
    setBusy(true)
    try {
      await deleteSpace(deleting.id)
      setDeleting(null)
      load()
    } catch (e) {
      setError(errMsg(e))
      setDeleting(null)
    }
    setBusy(false)
  }

  const shown = (spaces || []).filter(
    (s) => (!avail || s.availability === avail) && (!q || `${s.name} ${s.location} ${s.unique_code}`.toLowerCase().includes(q.toLowerCase())),
  )
  const total = (spaces || []).reduce((n, s) => n + s.total_capacity, 0)
  const free = (spaces || []).reduce((n, s) => n + (s.available_capacity ?? 0), 0)

  return (
    <>
      <div className="page-head">
        <div>
          <div className="sub">Inventory management</div>
          <h1>Storage spaces</h1>
        </div>
        <div className="row">
          <Link to="/owner/import" className="btn ghost">Import CSV</Link>
          <Link to="/owner/spaces/new" className="btn">Add space</Link>
        </div>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 16 }}>{error}</div>}
      {!spaces && !error && <div className="spinner" />}

      {spaces && (
        <div className="stack" style={{ gap: 20 }}>
          <div className="grid c4">
            <StatCard label="Spaces listed" value={spaces.length} />
            <StatCard label="Total capacity" value={num(total)} note="Mixed units are added together" />
            <StatCard label="Booked today" value={num(total - free)} />
            <StatCard label="Free today" value={num(free)} hot />
          </div>

          <div className="filters" style={{ marginBottom: 0 }}>
            <div className="field search"><input aria-label="Search spaces" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, code or location" /></div>
            <div className="field" style={{ maxWidth: 200 }}>
              <select aria-label="Availability" value={avail} onChange={(e) => setAvail(e.target.value)}>
                <option value="">All availability</option>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
          </div>

          <div className="card">
            {shown.length === 0 ? (
              <div className="empty">
                <b>{spaces.length ? 'No spaces match' : 'No spaces yet'}</b>
                {spaces.length ? 'Clear the filters to see everything.' : 'Add your first space or import a CSV.'}
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Code</th><th>Space</th><th>Location</th><th>Capacity</th><th>Free today</th><th>Price</th><th>Status</th><th /></tr>
                  </thead>
                  <tbody>
                    {shown.map((s) => (
                      <tr key={s.id}>
                        <td className="num">{s.unique_code}</td>
                        <td><b>{s.name}</b></td>
                        <td>{s.location}</td>
                        <td>{num(s.total_capacity)} {s.unit}</td>
                        <td>{num(s.available_capacity)} {s.unit}</td>
                        <td className="num">{money(s.unit_price)}<span className="muted small">/day</span></td>
                        <td><StatusBadge status={s.availability} /></td>
                        <td className="actions">
                          <button className="btn ghost sm" onClick={() => toggle(s)}>{s.availability === 'available' ? 'Take offline' : 'Go live'}</button>{' '}
                          <Link className="icon-btn" to={`/owner/spaces/${s.id}/edit`} aria-label={`Edit ${s.name}`}><Pencil size={14} /></Link>{' '}
                          <button className="icon-btn" onClick={() => setDeleting(s)} aria-label={`Delete ${s.name}`}><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {deleting && (
        <Modal
          title="Delete this space?"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button className="btn ghost" onClick={() => setDeleting(null)}>Keep space</button>
              <button className="btn" disabled={busy} onClick={confirmDelete}>{busy ? 'Deleting...' : 'Delete space'}</button>
            </>
          }
        >
          <p><b>{deleting.name}</b> ({deleting.unique_code}) will be removed. Spaces that already have rental history cannot be deleted - take them offline instead.</p>
        </Modal>
      )}
    </>
  )
}
