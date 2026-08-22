import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { supabase } from './lib/supabase'
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
import SiteTransactionPage from './pages/SiteTransactionPage'
import PlantTransactionPage from './pages/PlantTransactionPage'
import ForgotPassword from './pages/ForgotPassword';
import UpdatePassword from './pages/UpdatePassword';
import EmployeeDashboard from './pages/EmployeeDashboard';

// Firebase messaging import karo (Tamari project ma firebase setup hovu joie)
import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

// Firebase Configuration (Tame tamari firebase config ahiya muki sako cho)
const firebaseConfig = {
   apiKey: "AIzaSyDvmvqC2ENI3Twx5JzVXS3VsiOAOthmIMI",
  authDomain: "tnj-infra-app.firebaseapp.com",
  projectId: "tnj-infra-app",
  storageBucket: "tnj-infra-app.firebasestorage.app",
  messagingSenderId: "294302478190",
  appId: "1:294302478190:web:10c73c2cbd4b2d66d0db7f",
  measurementId: "G-S9RV6WDD5C"
};

const firebaseApp = initializeApp(firebaseConfig);
const messaging = getMessaging(firebaseApp);

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
          <Route path="/employee-dashboard" element={<EmployeeDashboard />} />
          
          <Route path="/add-site-vendor" element={<AddSiteVendorPage />} />
          <Route path="/add-plant-vendor" element={<AddPlantVendorPage />} />
          <Route path="/site-report" element={<SiteReportPage />} />
          <Route path="/plant-report" element={<PlantReportPage />} />
          <Route path="/crm-report" element={<CrmReportPage />} />
          <Route path="/employee-report" element={<EmployeeReportPage />} />
          <Route path="/staff-management" element={<StaffManagement />} />
          <Route path="/site-transaction" element={<SiteTransactionPage />} />
          <Route path="/plant-transaction" element={<PlantTransactionPage />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      ) : (
        /* ૨. સ્ટાફ અને સુપરવાઈઝર માટે ડાયનેમિક રાઉટ્સ */
        <>
          <Route path="/" element={<EmployeeDashboard />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/supervisor-dashboard" element={<SupervisorDashboard />} />
          <Route path="/PlantReports" element={<PlantReports />} />
          <Route path="/site-transaction" element={<SiteTransactionPage />} />
          <Route path="/plant-transaction" element={<PlantTransactionPage />} />

          <Route path="*" element={<Navigate to="/employee-dashboard" replace />} />
        </>
      )}
    </Routes>
  )
}

// Auth event ane FCM Token generate karva mate wrapper (Updated)
function AuthListenerWrapper({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Password recovery event check
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/update-password', { replace: true });
      }
    });

    // 2. Direct session check jethi login user no token hamesha update rahe
    async function saveFcmToken() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const currentToken = await getToken(messaging, { 
              vapidKey: 'BBHNzqWuJgQt9iAaTqY9OEELHdBxDt4M4vwpKuowEn0n_oZ3l5zdHzXY92jBlCub_BlaZU37iLy7QpcEz2tN0WA' 
            });

            if (currentToken) {
              const { error } = await supabase
                .from('fcm_tokens')
                .upsert({ 
                   user_id: session.user.id, 
                   fcm_token: currentToken, 
                   created_at: new Date() 
                 }, { onConflict: 'user_id' });

              if (error) {
                console.error("Supabase Upsert Error:", error.message);
              } else {
                console.log("FCM Token successfully saved to Supabase!");
              }
            }
          }
        }
      } catch (err) {
        console.error("Error generating FCM token:", err);
      }
    }

    saveFcmToken();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AuthListenerWrapper>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
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
        </AuthListenerWrapper>
      </Router>
    </AuthProvider>
  )
}

export default App;