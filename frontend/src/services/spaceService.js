import api from './api'

const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined))

export const listSpaces = (params) => api.get('/spaces', { params: clean(params) }).then((r) => r.data)
export const mySpaces = () => api.get('/spaces/mine').then((r) => r.data)
export const getSpace = (id) => api.get(`/spaces/${id}`).then((r) => r.data)
export const createSpace = (data) => api.post('/spaces', data).then((r) => r.data)
export const updateSpace = (id, data) => api.put(`/spaces/${id}`, data).then((r) => r.data)
export const deleteSpace = (id) => api.delete(`/spaces/${id}`)
export const getAvailability = (id, start, end) =>
  api.get(`/spaces/${id}/availability`, { params: { start, end } }).then((r) => r.data)

