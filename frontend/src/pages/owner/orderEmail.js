import { formatDate } from '../../utils/dateUtils.js'
import { money } from './ownerUtils.js'

export function gmailComposeUrl(order, arrivalTime = '') {
  if (!order.customer_email?.trim()) return null
  const body = [
    `Hello ${order.customer_name || 'Customer'},`, '',
    `Here are the details for your storage booking BK-${order.id}:`,
    `Customer: ${order.customer_name || 'Not provided'}`,
    `Email: ${order.customer_email}`,
    `Storage space: ${order.space_name}`,
    `Storage address: ${order.space_location || 'Not provided'}`,
    `Arrival date: ${formatDate(order.start_date)}`,
    `Arrival time: ${arrivalTime || 'Not provided - please confirm your arrival time'}`,
    `Move-out date: ${formatDate(order.end_date)}`,
    `Booking total: ${money(order.total_price)}`,
    `Booking status: ${order.status}`, '',
    'Please contact us if you have any questions.',
  ].join('\n')
  const params = new URLSearchParams({
    view: 'cm', fs: '1', to: order.customer_email.trim(),
    su: `Storage booking BK-${order.id} - ${order.space_name}`, body,
  })
  return `https://mail.google.com/mail/?${params}`
}
