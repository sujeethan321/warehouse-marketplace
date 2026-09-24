// // Date convention used everywhere in the app (same as the API and the database):
// //   start date = inclusive (move-in day)      end date = EXCLUSIVE (move-out day, not charged)
// export const CURRENCY = '$' // change this one line to switch currency symbol (e.g. 'Rs.')

// const pad = (n) => String(n).padStart(2, '0')

// export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
// export const today = () => toISO(new Date())

// export function addDays(iso, days) {
//   const [y, m, d] = iso.split('-').map(Number)
//   return toISO(new Date(y, m - 1, d + days))
// }

// export function daysBetween(startISO, endISO) {
//   if (!startISO || !endISO) return 0
//   const [y1, m1, d1] = startISO.split('-').map(Number)
//   const [y2, m2, d2] = endISO.split('-').map(Number)
//   return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000)
// }

// export function formatDate(iso) {
//   if (!iso) return '-'
//   const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
//   return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
// }

// export const formatRange = (s, e) => `${formatDate(s)} to ${formatDate(e)}`

// export function formatDateTime(iso) {
//   if (!iso) return '-'
//   return new Date(iso).toLocaleString('en-GB', {
//     day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
//   })
// }

// export const money = (n) =>
//   `${CURRENCY}${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// export const moneyShort = (n) =>
//   `${CURRENCY}${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

// export const num = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })

// export function greeting() {
//   const h = new Date().getHours()
//   return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
// }

// export function downloadCSV(filename, rows) {
//   const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
//   const text = rows.map((r) => r.map(esc).join(',')).join('\n')
//   const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8;' }))
//   const a = document.createElement('a')
//   a.href = url
//   a.download = filename
//   a.click()
//   URL.revokeObjectURL(url)
// }
// // Date convention used everywhere in the app (same as the API and the database):
// //   start date = inclusive (move-in day)      end date = EXCLUSIVE (move-out day, not charged)
// export const CURRENCY = '$' // change this one line to switch currency symbol (e.g. 'Rs.')

// const pad = (n) => String(n).padStart(2, '0')

// export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
// export const today = () => toISO(new Date())

// export function addDays(iso, days) {
//   const [y, m, d] = iso.split('-').map(Number)
//   return toISO(new Date(y, m - 1, d + days))
// }

// export function daysBetween(startISO, endISO) {
//   if (!startISO || !endISO) return 0
//   const [y1, m1, d1] = startISO.split('-').map(Number)
//   const [y2, m2, d2] = endISO.split('-').map(Number)
//   return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000)
// }

// export function formatDate(iso) {
//   if (!iso) return '-'
//   const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
//   return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
// }

// export const formatRange = (s, e) => `${formatDate(s)} to ${formatDate(e)}`

// export function formatDateTime(iso) {
//   if (!iso) return '-'
//   return new Date(iso).toLocaleString('en-GB', {
//     day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
//   })
// }

// export const money = (n) =>
//   `${CURRENCY}${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// export const moneyShort = (n) =>
//   `${CURRENCY}${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

// export const num = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })

//  export function greeting() {
//   const h = new Date().getHours()
//   return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
// }

// export function downloadCSV(filename, rows) {
//   const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
//   const text = rows.map((r) => r.map(esc).join(',')).join('\n')
//   const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8;' }))
//   const a = document.createElement('a')
//   a.href = url
//   a.download = filename
//   a.click()
//   URL.revokeObjectURL(url)
// }
