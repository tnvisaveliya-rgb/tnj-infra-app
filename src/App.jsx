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
import StaffManagement from './pages/StaffManagement'

function AppRoutes() {
  const { user } = useAuth()
  const userEmail = (user?.email || '').trim().toLowerCase()

  return (
    <Routes>
      {/* ૧. એડમિન માટે બધા જ પેજ ખુલ્લા રહેશે */}
      {userEmail === 'infra.tnj@gmail.com' ? (
        <>
          <Route path="/" element={<Dashboard />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/supervisor-dashboard" element={<SupervisorDashboard />} />
          <Route path="/PlantReports" element={<PlantReports />} />
          
          <Route path="/add-site-vendor" element={<AddSiteVendorPage />} />
          <Route path="/add-plant-vendor" element={<AddPlantVendorPage />} />
          <Route path="/site-report" element={<SiteReportPage />} />
          <Route path="/plant-report" element={<PlantReportPage />} />
          <Route path="/crm-report" element={<CrmReportPage />} />
          <Route path="/employee-report" element={<EmployeeReportPage />} />
          <Route path="/staff-management" element={<StaffManagement />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      ) : (
        /* ૨. સ્ટાફ અને સુપરવાઈઝર માટે ડાયનેમિક રાઉટ્સ */
        <>
          <Route path="/" element={<Dashboard />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/supervisor-dashboard" element={<SupervisorDashboard />} />
          <Route path="/PlantReports" element={<PlantReports />} />

          <Route path="*" element={<Navigate to="/supervisor-dashboard" replace />} />
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