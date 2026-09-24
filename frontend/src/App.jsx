import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'

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

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/owner" element={<OwnerDashboard />} />
        <Route path="/owner/spaces" element={<MySpaces />} />
        <Route path="/owner/spaces/new" element={<AddSpace />} />
        <Route path="/owner/spaces/:id/edit" element={<EditSpace />} />
        <Route path="/owner/requests" element={<RentalRequests />} />
        <Route path="/owner/import" element={<CSVImport />} />
        <Route path="/owner/reports" element={<Reports />} />
      </Route>

      <Route path="/" element={<Navigate to="/owner" replace />} />
      <Route path="*" element={<Navigate to="/owner" replace />} />
    </Routes>
  )
}