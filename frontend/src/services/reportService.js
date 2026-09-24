import api from './api'

const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined))

export const utilisation = (params) => api.get('/reports/utilisation', { params: clean(params) }).then((r) => r.data)
export const revenue = (params) => api.get('/reports/revenue', { params: clean(params) }).then((r) => r.data)
export const occupancy = (params) => api.get('/reports/occupancy', { params: clean(params) }).then((r) => r.data)
