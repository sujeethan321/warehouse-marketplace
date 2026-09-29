import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getNotifications, notificationReadKey, readNotificationIds } from '../services/notificationService'

export default function NotificationBell({ user }) {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const key = notificationReadKey(user)
  const [read, setRead] = useState(() => readNotificationIds(key))
  const root = useRef(null)
  const button = useRef(null)
  const refresh = useRef(() => {})
  const navigate = useNavigate()
  useEffect(() => {
    let active = true, busy = false
    async function load() {
      if (busy || document.hidden) return
      busy = true
      try {
        const result = await getNotifications(user)
        if (active) { setItems(result); setError('') }
      } catch { if (active) setError('Could not refresh notifications. Please try again.') }
      finally { busy = false; if (active) setLoading(false) }
    }
    refresh.current = load
    load()
    const timer = setInterval(load, 15000)
    const syncRead = e => { if (e.key === key || e.key === null) setRead(readNotificationIds(key)) }
    window.addEventListener('focus', load)
    document.addEventListener('visibilitychange', load)
    window.addEventListener('storage', syncRead)
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', load); document.removeEventListener('visibilitychange', load); window.removeEventListener('storage', syncRead) }
  }, [user.id, user.role, key])
  useEffect(() => {
    if (!open) return
    const outside = e => { if (!root.current?.contains(e.target)) setOpen(false) }
    const escape = e => { if (e.key === 'Escape') { setOpen(false); button.current?.focus() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])
  function markRead(ids) {
    setRead(previous => {
      const next = [...new Set([...readNotificationIds(key), ...previous, ...ids])]
      try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* Keep in-memory read state when storage is unavailable. */ }
      return next
    })
  }
  const unread = items.filter(item => !read.includes(item.id)).length
  return <div className="notifications" ref={root}>
    <button ref={button} type="button" className="icon-btn notification-toggle" aria-label={'Notifications, ' + unread + ' unread'} aria-expanded={open} aria-controls="notification-panel" onClick={() => { setOpen(!open); if (!open) refresh.current() }}>
      <Bell size={19} />{unread > 0 && <span className="notification-count" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
    </button>
    <span className="notification-sr" role="status">{unread ? unread + ' unread notifications' : ''}</span>
    {open && <section id="notification-panel" className="notification-panel" aria-label="Notifications">
      <div className="notification-heading"><b>Notifications</b>{unread > 0 && <button type="button" onClick={() => markRead(items.map(item => item.id))}>Mark all read</button>}</div>
      {error && <div className="notification-message" role="alert">{error} <button type="button" onClick={() => refresh.current()}>Retry</button></div>}
      {loading && <p className="notification-message">Loading notifications?</p>}
      {!loading && !error && items.length === 0 && <p className="notification-message">No notifications yet.</p>}
      <ul>{items.map(item => <li key={item.id}><button type="button" className={'notification-item ' + (read.includes(item.id) ? '' : 'unread')} onClick={() => { markRead([item.id]); setOpen(false); navigate(item.to) }}><strong>{item.title}</strong><span>{item.message}</span>{!read.includes(item.id) && <small>Unread</small>}</button></li>)}</ul>
    </section>}
  </div>
}
