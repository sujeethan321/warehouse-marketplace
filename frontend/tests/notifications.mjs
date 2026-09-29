import assert from 'node:assert/strict'
import { build } from 'esbuild'

const calls = []
globalThis.notificationTestRentals = async status => {
  calls.push(status)
  return [{ id: 42, customer_name: 'Customer A', space_name: 'Warehouse A' }]
}
const result = await build({
  entryPoints: ['src/services/notificationService.js'], bundle: true, write: false, format: 'esm',
  plugins: [{ name: 'mock-rental-api', setup(plugin) {
    plugin.onResolve({ filter: /rentalService$/ }, () => ({ path: 'rentals', namespace: 'test' }))
    plugin.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export const ownerRentals = status => globalThis.notificationTestRentals(status)' }))
  } }],
})
const service = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'))
assert.deepEqual(await service.getNotifications({ role: 'customer', id: 2 }), [])
assert.equal(calls.length, 0, 'Other roles must not call owner APIs')
const items = await service.getNotifications({ role: 'owner', id: 1 })
assert.deepEqual(calls, ['pending'])
assert.equal(items[0].to, '/owner/requests?request=42')
assert.equal(items[0].id, 'rental-request:42')
assert.match(items[0].message, /Customer A.*Warehouse A/)
assert.notEqual(service.notificationReadKey({ role: 'owner', id: 1 }), service.notificationReadKey({ role: 'owner', id: 2 }))
globalThis.localStorage = { getItem: () => 'not-json' }
assert.deepEqual(service.readNotificationIds('key'), [])
localStorage.getItem = () => '["rental-request:42",123]'
assert.deepEqual(service.readNotificationIds('key'), ['rental-request:42'])
localStorage.getItem = () => { throw new Error('Storage blocked') }
assert.deepEqual(service.readNotificationIds('key'), [])
globalThis.notificationTestRentals = async () => { throw new Error('Offline') }
await assert.rejects(service.getNotifications({ role: 'owner', id: 1 }), /Offline/)
console.log('Notification checks passed: owner requests, role isolation, links, read storage, API errors.')
