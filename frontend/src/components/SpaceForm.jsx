import { useState } from 'react'
import { Check, Circle } from 'lucide-react'
import { errMsg } from '../services/api'

const EMPTY = { unique_code: '', name: '', total_capacity: '', unit: 'sq.ft', unit_price: '', location: '', availability: 'available' }

// Shared by "Add space" and "Edit space"
export default function SpaceForm({ initial, onSubmit, submitLabel, onCancel }) {
  const [f, setF] = useState({ ...EMPTY, ...(initial || {}) })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const checks = [
    ['Unit code and name filled in', f.unique_code.trim() && f.name.trim()],
    ['Capacity is greater than 0', Number(f.total_capacity) > 0],
    ['Price is greater than 0', Number(f.unit_price) > 0],
    ['Location added', f.location.trim()],
  ]
  const ready = checks.every(([, ok]) => ok)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await onSubmit({
        ...f,
        unique_code: f.unique_code.trim(),
        name: f.name.trim(),
        unit: f.unit.trim(),
        location: f.location.trim(),
        total_capacity: Number(f.total_capacity),
        unit_price: Number(f.unit_price),
      })
    } catch (err) {
      setError(errMsg(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid side">
      <div className="stack">
        {error && <div className="alert error">{error}</div>}
        <div className="card">
          <div className="card-head"><h2>Unit identification</h2></div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="code">Unique code</label>
              <input id="code" value={f.unique_code} onChange={set('unique_code')} placeholder="WH-001" maxLength={50} required />
              <span className="hint">Must be unique across the marketplace.</span>
            </div>
            <div className="field">
              <label htmlFor="name">Space name</label>
              <input id="name" value={f.name} onChange={set('name')} placeholder="Main storage room" maxLength={150} required />
            </div>
            <div className="field span2">
              <label htmlFor="loc">Location</label>
              <input id="loc" value={f.location} onChange={set('location')} placeholder="Jaffna" maxLength={255} required />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h2>Capacity and pricing</h2></div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="cap">Total capacity</label>
              <input id="cap" type="number" min="0.01" step="0.01" value={f.total_capacity} onChange={set('total_capacity')} placeholder="300" required />
            </div>
            <div className="field">
              <label htmlFor="unit">Unit</label>
              <input id="unit" value={f.unit} onChange={set('unit')} placeholder="sq.ft, pallets, m3" maxLength={50} required />
            </div>
            <div className="field">
              <label htmlFor="price">Price per unit per day</label>
              <input id="price" type="number" min="0.01" step="0.01" value={f.unit_price} onChange={set('unit_price')} placeholder="150" required />
            </div>
            <div className="field">
              <label htmlFor="avail">Availability</label>
              <select id="avail" value={f.availability} onChange={set('availability')}>
                <option value="available">Available - accepting requests</option>
                <option value="unavailable">Unavailable - hidden from bookings</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="stack">
        <div className="card">
          <div className="card-head"><h2>Listing checklist</h2></div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} className="stack">
            {checks.map(([label, ok]) => (
              <li key={label} className="row" style={{ opacity: ok ? 1 : 0.6 }}>
                {ok ? <Check size={15} /> : <Circle size={15} />} {label}
              </li>
            ))}
          </ul>
          <div className="stack" style={{ marginTop: 18 }}>
            <button className="btn block" disabled={busy || !ready}>{busy ? 'Saving...' : submitLabel}</button>
            {onCancel && <button type="button" className="btn ghost block" onClick={onCancel}>Cancel</button>}
          </div>
        </div>
      </div>
    </form>
  )
}
