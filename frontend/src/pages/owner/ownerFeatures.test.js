import test from 'node:test'
import assert from 'node:assert/strict'
import { generateSpaceCode, money, moneyShort } from './ownerUtils.js'
import { money as customerMoney } from '../../utils/dateUtils.js'
import { gmailComposeUrl } from './orderEmail.js'
import { prepareOwnerCSV } from './ownerCSV.js'

test('owner currency does not change shared customer/admin currency', () => {
  assert.equal(money(1234.5), 'Rs 1,234.50')
  assert.equal(moneyShort(1234), 'Rs 1,234')
  assert.equal(money(0), 'Rs 0.00')
  assert.equal(customerMoney(1234.5), '$1,234.50')
})

test('new space codes fit the API constraint and do not repeat', () => {
  const codes = Array.from({ length: 1000 }, generateSpaceCode)
  assert.equal(new Set(codes).size, codes.length)
  for (const code of codes) assert.match(code, /^WH-[A-F0-9]{32}$/)
})

const order = {
  id: 12, customer_name: 'A & B + \u0ba4\u0bae\u0bbf\u0bb4\u0bcd', customer_email: 'person+storage@example.com',
  space_name: 'Storage #1 & 2', space_location: '12 Main Road, Jaffna',
  start_date: '2026-10-02', end_date: '2026-10-05', total_price: 1234.5, status: 'approved',
}

test('Gmail draft safely prefills customer, address, dates, time and booking amount', () => {
  const url = new URL(gmailComposeUrl(order, '09:30'))
  assert.equal(url.origin, 'https://mail.google.com')
  assert.equal(url.searchParams.get('view'), 'cm')
  assert.equal(url.searchParams.get('to'), order.customer_email)
  assert.equal(url.searchParams.get('su'), 'Storage booking BK-12 - Storage #1 & 2')
  const body = url.searchParams.get('body')
  for (const value of [order.customer_name, order.customer_email, order.space_location, '09:30', '2 Oct 2026', 'Rs 1,234.50']) assert.ok(body.includes(value))
  assert.ok(body.includes('\n'))
})

test('missing arrival time stays unknown and missing recipient prevents compose', () => {
  assert.match(new URL(gmailComposeUrl(order)).searchParams.get('body'), /Arrival time: Not provided/)
  assert.equal(gmailComposeUrl({ ...order, customer_email: '' }), null)
  assert.equal(gmailComposeUrl({ ...order, customer_email: null }), null)
})

test('CSV import generates codes and preserves quoted fields, BOM and CRLF', () => {
  const csv = '\uFEFFname,total_capacity,unit,unit_price,location,availability\r\n"Room, A",100,sq.ft,10,"12 ""Main"" Road\nJaffna",available\r\n'
  const result = prepareOwnerCSV(csv)
  assert.match(result, /"WH-[A-F0-9]{32}"/)
  assert.ok(result.includes('"Room, A"'))
  assert.ok(result.includes('12 ""Main"" Road\nJaffna'))
})

test('CSV keeps supplied codes and fills blank codes independently', () => {
  const result = prepareOwnerCSV('unique_code,name,total_capacity,unit,unit_price,location,availability\nCUSTOM-1,A,1,m3,2,Jaffna,available\n,B,1,m3,2,Jaffna,available\n,C,1,m3,2,Jaffna,available')
  assert.ok(result.includes('"CUSTOM-1"'))
  const generated = result.match(/WH-[A-F0-9]{32}/g)
  assert.equal(generated.length, 2)
  assert.notEqual(generated[0], generated[1])
})

test('CSV rejects invalid headers, unclosed quotes and malformed rows', () => {
  assert.throws(() => prepareOwnerCSV(''), /empty/)
  assert.throws(() => prepareOwnerCSV('wrong,headers\n1,2'), /columns/)
  assert.throws(() => prepareOwnerCSV('name,total_capacity,unit,unit_price,location,availability\n"oops'), /unclosed/)
  assert.throws(() => prepareOwnerCSV('name,total_capacity,unit,unit_price,location,availability\nA,2'), /columns/)
})
