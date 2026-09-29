import api from './api'

export const createRental = (data) => api.post('/rentals', data).then((r) => r.data)
export const myRentals = (status) => api.get('/rentals/my', { params: status ? { status } : {} }).then((r) => r.data)
export const ownerRentals = (status) => api.get('/owner/rentals', { params: status ? { status } : {} }).then((r) => r.data)
export const getRental = (id) => api.get(`/rentals/${id}`).then((r) => r.data)
export const setRentalStatus = (id, status) => api.patch(`/rentals/${id}/status`, { status }).then((r) => r.data)
