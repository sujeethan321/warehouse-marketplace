import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
})

export function errMsg(
  err,
  fallback = 'Something went wrong. Please try again.'
) {
  const data = err?.response?.data

  if (!data) {
    return err?.message === 'Network Error'
      ? 'Cannot reach the server. Is the backend running?'
      : fallback
  }

  const detail = data.detail

  if (typeof detail === 'string') {
    return detail
  }

  if (Array.isArray(detail)) {
    return detail
      .map((error) => {
        const field = (error.loc || [])
          .filter((item) => item !== 'body')
          .join('.')

        return `${field ? field + ': ' : ''}${error.msg}`
      })
      .join('. ')
  }

  return fallback
}

export default api