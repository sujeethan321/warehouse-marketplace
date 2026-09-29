import api from './api'

// Admin screens always use the authenticated API. There is no mock fallback.
export const summary = () => api.get('/admin/summary').then(r => r.data)
export const users = params => api.get('/admin/users', { params }).then(r => r.data)
export const user = id => api.get(`/admin/users/${id}`).then(r => r.data)
export const spaces = (id, params) => api.get(`/admin/users/${id}/spaces`, { params }).then(r => r.data)
export const rentals = params => api.get('/admin/rentals', { params }).then(r => r.data)
export const rental = id => api.get(`/admin/rentals/${id}`).then(r => r.data)
