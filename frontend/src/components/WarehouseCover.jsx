import { useState } from 'react'
import { Warehouse } from 'lucide-react'

export function storedCover(code) {
  if (!code) return ''
  try { return localStorage.getItem(`warehouse-cover:${code}`) || '' } catch { return '' }
}

export default function WarehouseCover({ space = {}, className = '' }) {
  const [failed, setFailed] = useState('')
  const src = storedCover(space.unique_code) || space.cover_image_url || space.cover_image || space.image_url
  return src && failed !== src ? (
    <img className={`warehouse-cover ${className}`} src={src} alt={`${space.name || 'Warehouse'} cover`} onError={() => setFailed(src)} />
  ) : (
    <div className={`warehouse-cover cover-placeholder ${className}`}><Warehouse size={48} strokeWidth={1} /><span>Warehouse photo coming soon</span></div>
  )
}
