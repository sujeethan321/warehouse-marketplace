import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthContext } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import CustomerDashboard from './pages/customer/CustomerDashboard'
import MyRentals from './pages/customer/MyRentals'
import Payment from './pages/customer/Payment'
import api from './services/api'
import { addDays, today } from './utils/dateUtils'
import './index.css'

// Isolated, development-only preview. All requests stay in memory.
const rentals = [
  { id: 7, space_name: 'Colombo Storage Hub', space_location: 'Colombo', status: 'approved', total_price: 43148, requested_capacity: 23, unit: 'sq.ft', start_date: addDays(today(), 7), end_date: addDays(today(), 21), days: 14 },
  { id: 6, space_name: 'City Warehouse', space_location: 'Kandy', status: 'rejected', total_price: 490917, requested_capacity: 120, unit: 'sq.ft', start_date: addDays(today(), 7), end_date: addDays(today(), 21), days: 14 },
  { id: 5, space_name: 'Northern Logistics Centre', space_location: 'Jaffna', status: 'pending', total_price: 18500, requested_capacity: 50, unit: 'sq.ft', start_date: addDays(today(), 10), end_date: addDays(today(), 20), days: 10 },
]
api.defaults.adapter = async (config) => {
  if (config.method !== 'get') throw new Error('Changes are disabled in this preview.')
  let data
  if (config.url === '/rentals/my') data = rentals
  else if (/^\/rentals\/\d+$/.test(config.url)) data = rentals.find(r => String(r.id) === config.url.split('/').pop())
  else throw new Error('This section is unavailable in the customer preview.')
  return { data, status: 200, statusText: 'OK', headers: {}, config }
}

createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['/customer']}>
    <AuthContext.Provider value={{ user: { name: 'Demo Customer', role: 'customer' }, loading: false, logout: () => {} }}>
      <div className="shell"><Sidebar /><div className="main"><Navbar /><main className="page">
        <p className="muted small" style={{ marginBottom: 16 }}>Customer preview · Sample data</p>
        <Routes>
          <Route path="/customer" element={<CustomerDashboard />} />
          <Route path="/customer/rentals" element={<MyRentals />} />
          <Route path="/customer/rentals/:id/payment" element={<Payment />} />
          <Route path="*" element={<div className="customer-ui"><h1>Customer preview</h1><p>Choose Overview or My rentals to explore this preview.</p></div>} />
        </Routes>
      </main></div></div>
    </AuthContext.Provider>
  </MemoryRouter>,
)
