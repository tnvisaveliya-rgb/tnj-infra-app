import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import EmployeeManagement from './pages/EmployeeManagement'
import CRM from './pages/CRM'
import SupervisorDashboard from './pages/SupervisorDashboard'
import DailyReports from './pages/DailyReports'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/employees" element={<EmployeeManagement />} />
                    <Route path="/crm" element={<CRM />} />
                    <Route path="/transactions" element={<SupervisorDashboard />} />
                    <Route path="/reports" element={<DailyReports />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
