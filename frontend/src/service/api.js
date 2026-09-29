import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
})

export const TOKEN_KEY = 'storeshare_token'

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (res) => res,

  (err) => {
    const url = err.config?.url || ''

    if (
      err.response?.status === 401 &&
      !url.includes('/auth/login') &&
      !url.includes('/auth/register')
    ) {
      localStorage.removeItem(TOKEN_KEY)

      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }

    return Promise.reject(err)
  },
)

export function errMsg(
  err,
  fallback = 'Something went wrong. Please try again.',
) {
  const data = err?.response?.data

  if (!data) {
    return err?.message === 'Network Error'
      ? 'Cannot reach the server. Is the backend running?'
      : fallback
  }

  const d = data.detail

  if (typeof d === 'string') {
    return d
  }

  if (Array.isArray(d)) {
    return d
      .map((e) => {
        const field = (e.loc || [])
          .filter((x) => x !== 'body')
          .join('.')

        return `${field ? field + ': ' : ''}${e.msg}`
      })
      .join('. ')
  }

  return fallback
}

export default api