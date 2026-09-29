import api from './api'
export const me = () => api.get('/auth/me').then(r => r.data)
export const login = (email, password) => api.post('/auth/login', { email, password }).then(r => r.data)
export const register = data => api.post('/auth/register', data).then(r => r.data)
