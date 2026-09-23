import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

function App() {
  return (
    <Router>
      <div className="app-shell">
        <h1>Warehouse Marketplace</h1>
        <p>Frontend scaffold ready.</p>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<div>Login page placeholder</div>} />
          <Route path="/register" element={<div>Register page placeholder</div>} />
          <Route path="/owner" element={<div>Owner dashboard placeholder</div>} />
          <Route path="/customer" element={<div>Customer dashboard placeholder</div>} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
