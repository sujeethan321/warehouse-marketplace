import api from './api'

export const importCSV = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/spaces/import', form).then((r) => r.data)
}

export const TEMPLATE_ROWS = [
  ['unique_code', 'name', 'total_capacity', 'unit', 'unit_price', 'location', 'availability'],
]
