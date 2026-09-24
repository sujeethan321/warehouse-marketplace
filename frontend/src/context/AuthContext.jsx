import { Navigate, Outlet } from 'react-router-dom'
import { homePath, useAuth } from '../context/AuthContext'

// The server is the real security boundary; this only keeps people on the right screens.
export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="spinner" />
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to={homePath(user.role)} replace />
  return <Outlet />
}
