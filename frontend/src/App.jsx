
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import { homePath, useAuth } from './context/AuthContext'

import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import BrowseSpaces from './pages/customer/BrowseSpaces'
import CustomerDashboard from './pages/customer/CustomerDashboard'
import MyRentals from './pages/customer/MyRentals'
import RequestRental from './pages/customer/RequestRental'
import SpaceDetails from './pages/customer/SpaceDetails'

function AppLayout() {
  return (
    <div className="shell">
      <Sidebar />

      <div className="main">
        <Navbar />

        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function Home() {
  const { user, loading } = useAuth()

  if (loading) return <div className="spinner" />

  return (
    <Navigate
      to={user ? homePath(user.role) : '/login'}
      replace
    />
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute role="customer" />}>
        <Route element={<AppLayout />}>
          <Route
            path="/customer"
            element={<CustomerDashboard />}
          />

          <Route
            path="/customer/browse"
            element={<BrowseSpaces />}
          />

          <Route
            path="/customer/spaces/:id"
            element={<SpaceDetails />}
          />

          <Route
            path="/customer/request/:id"
            element={<RequestRental />}
          />

          <Route
            path="/customer/rentals"
            element={<MyRentals />}
          />
        </Route>
      </Route>

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  )
}

