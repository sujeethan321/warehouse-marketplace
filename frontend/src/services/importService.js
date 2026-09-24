import api from './api'

export const importCSV = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/spaces/import', form).then((r) => r.data)
}

export const TEMPLATE_ROWS = [
  ['unique_code', 'name', 'total_capacity', 'unit', 'unit_price', 'location', 'availability'],
  ['WH-001', 'Main Storage Room', '300', 'sq.ft', '150', 'Jaffna', 'available'],
  ['WH-002', 'Cold Room A', '120', 'pallets', '45.50', 'Colombo', 'available'],
]
