import { ownerRentals } from './rentalService'

// Register another role here; return { id, title, message, to } notifications.
export const notificationSources = {
  owner: async () => (await ownerRentals('pending')).map(r => ({
    id: 'rental-request:' + r.id,
    title: 'New rental request',
    message: (r.customer_name || 'A customer') + ' requested ' + r.space_name,
    to: '/owner/requests?request=' + r.id,
  })),
}
export async function getNotifications(user) {
  return notificationSources[user.role] ? notificationSources[user.role]() : []
}
export const notificationReadKey = user => 'notifications:read:' + user.role + ':' + user.id
export function readNotificationIds(key) {
  try { const ids = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : [] } catch { return [] }
}
