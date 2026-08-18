import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CRM from './pages/CRM'
import SupervisorDashboard from './pages/SupervisorDashboard'
import PlantReports from './pages/PlantReports'
import AddSiteVendorPage from './pages/AddSiteVendorPage'
import AddPlantVendorPage from './pages/AddPlantVendorPage'
import SiteReportPage from './pages/SiteReportPage'
import PlantReportPage from './pages/PlantReportPage'
import CrmReportPage from './pages/CrmReportPage'
import EmployeeReportPage from './pages/EmployeeReportPage'
// જો Marketing પેજ અલગ બનાવ્યું હોય તો તેને પણ અહીં ઉપર import કરી લેવું

function AppRoutes() {
  const { user } = useAuth()
  const userEmail = (user?.email || '').trim().toLowerCase()

  return (
    <Routes>
      {/* 1. Admin (infra.tnj@gmail.com) માટે બધા રાઉટ્સ અને નવા 7 પેજ */}
      {userEmail === 'infra.tnj@gmail.com' && (
        <>
          <Route path="/" element={<Dashboard />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/supervisor-dashboard" element={<SupervisorDashboard />} />
          <Route path="/PlantReports" element={<PlantReports />} />
          
          {/* નવા 7 પેજના રાઉટ્સ અહીં એડમિન બ્લોક ની અંદર રહેશે */}
          <Route path="/add-site-vendor" element={<AddSiteVendorPage />} />
          <Route path="/add-plant-vendor" element={<AddPlantVendorPage />} />
          <Route path="/site-report" element={<SiteReportPage />} />
          <Route path="/plant-report" element={<PlantReportPage />} />
          <Route path="/crm-report" element={<CrmReportPage />} />
          <Route path="/employee-report" element={<EmployeeReportPage />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}

      {/* 2. વરુણ માટે /transactions (અથવા જ્યાં Attendance પેજ ખુલે છે) */}
      {userEmail === 'patelvarun61961@gmail.com' && (
        <>
          <Route path="/transactions" element={<SupervisorDashboard user={user} />} />
          <Route path="*" element={<Navigate to="/transactions" replace />} />
        </>
      )}
      {/* 3. મૌલિક માટે ફક્ત /crm */}
      {userEmail === 'patelvarun1961@gmail.com' && (
        <>
          <Route path="/crm" element={<CRM />} />
          <Route path="*" element={<Navigate to="/crm" replace />} />
        </>
      )}
    </Routes>
  )
}

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
                  <AppRoutes />
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