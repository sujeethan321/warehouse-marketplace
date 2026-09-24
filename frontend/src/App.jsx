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


import AddSpace from './pages/owner/AddSpace'
import CSVImport from './pages/owner/CSVImport'
import EditSpace from './pages/owner/EditSpace'
import MySpaces from './pages/owner/MySpaces'
import OwnerDashboard from './pages/owner/OwnerDashboard'
import RentalRequests from './pages/owner/RentalRequests'
import Reports from './pages/owner/Reports'

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
      <Route element={<ProtectedRoute role="owner" />}>
        <Route element={<AppLayout />}>
          <Route path="/owner" element={<OwnerDashboard />} />
          <Route path="/owner/spaces" element={<MySpaces />} />
          <Route path="/owner/spaces/new" element={<AddSpace />} />
          <Route path="/owner/spaces/:id/edit" element={<EditSpace />} />
          <Route path="/owner/requests" element={<RentalRequests />} />
          <Route path="/owner/import" element={<CSVImport />} />
          <Route path="/owner/reports" element={<Reports />} />
        </Route>
      </Route>
    </Routes>
  )
}
