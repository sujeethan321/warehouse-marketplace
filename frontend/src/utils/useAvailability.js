import { useEffect, useState } from 'react'
import { getAvailability } from '../services/spaceService'
import { errMsg } from '../services/api'

// Asks the server how much of a space is free in [start, end). Debounced, ignores stale answers.
export default function useAvailability(spaceId, start, end) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!spaceId || !start || !end || end <= start) {
      setData(null)
      setError(start && end && end <= start ? 'Move-out date must be after the move-in date.' : '')
      return
    }
    let cancelled = false
    setLoading(true)
    const t = setTimeout(() => {
      getAvailability(spaceId, start, end)
        .then((d) => !cancelled && (setData(d), setError('')))
        .catch((e) => !cancelled && (setData(null), setError(errMsg(e))))
        .finally(() => !cancelled && setLoading(false))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [spaceId, start, end])

  return { data, error, loading }
}
