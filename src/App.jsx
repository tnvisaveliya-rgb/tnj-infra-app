import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { supabase } from "./lib/supabase"; 
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

import SupervisorDashboard from './pages/SupervisorDashboard'

import AddSiteVendorPage from './pages/AddSiteVendorPage'
import AddPlantVendorPage from './pages/AddPlantVendorPage'
import SiteReportPage from './pages/SiteReportPage'
import AdminPlantReportPage from './pages/AdminPlantReportPage'

import EmployeeReportPage from './pages/EmployeeReportPage'
import StaffManagement from './pages/StaffManagement'
import SiteTransactionPage from './pages/SiteTransactionPage'
import PlantTransactionPage from './pages/PlantTransactionPage'
import ForgotPassword from './pages/ForgotPassword';
import UpdatePassword from './pages/UpdatePassword';
import SiteEmployeeDashboard from './pages/SiteEmployeeDashboard';
import PlantEmployeeDashboard from './pages/PlantEmployeeDashboard';
import Admindashboardstats from './pages/AdminDashboardStats';

import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

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

function SupervisorRedirectHandler() {
  const { user, userPermissions, loading } = useAuth();
  const userEmail = (user?.email || '').trim().toLowerCase();

  if (loading || userPermissions === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b' }}>Loading dashboard permissions...</p>
      </div>
    );
  }

 const allowedTabs = userPermissions?.allowed_tabs || [];

  if (allowedTabs.includes('site_progress')) {
    return <Navigate to="/siteemployee-dashboard" replace />;
  }

  if (allowedTabs.includes('plant_report')) {
    return <Navigate to="/plantemployee-dashboard" replace />;
  }

  return <Navigate to="/plantemployee-dashboard" replace />;
}

function AppRoutes({ notifications, isNotifOpen, setIsNotifOpen }) {
  const { user } = useAuth()
  const userEmail = (user?.email || '').trim().toLowerCase()

  return (
 <Routes>
  {user?.email?.trim().toLowerCase() === 'infra.tnj@gmail.com' ? (
    <>
      <Route path="/admin-dashboard-stats" element={<Admindashboardstats />} />
      <Route path="*" element={<Navigate to="/admin-dashboard-stats" replace />} />
    </>
  ) : (
        <>
          <Route path="/supervisor-dashboard" element={<SupervisorRedirectHandler />} />
          <Route path="/plantemployee-dashboard" element={<PlantEmployeeDashboard />} />
          <Route path="/siteemployee-dashboard" element={<SiteEmployeeDashboard />} />
          <Route path="/Dashboard" element={<Dashboard />} />
      
          <Route path="/site-transaction" element={<SiteTransactionPage />} />
          <Route path="/plant-transaction" element={<PlantTransactionPage />} />
          <Route path="/add-site-vendor" element={<AddSiteVendorPage />} />
          <Route path="/add-plant-vendor" element={<AddPlantVendorPage />} />
          <Route path="/site-report" element={<SiteReportPage />} />
          <Route path="/Admin-plant-report" element={<AdminPlantReportPage />} />
     
          <Route path="/employee-report" element={<EmployeeReportPage />} />
          <Route path="/staff-management" element={<StaffManagement />} />
          <Route path="*" element={<Navigate to="/supervisor-dashboard" replace />} />
        </>
      )}
    </Routes>
  )
}

function AuthListenerWrapper({ children, setNotifications }) {
  const navigate = useNavigate();
  const { user } = useAuth();

const fetchNotifications = async () => {
    try {
      const list = [];
      const currentUser = user;
      if (!currentUser) return;

      // ૧. ડેટાબેઝમાંથી કરન્ટ યૂઝરનો રોલ અને કંપની ID મેળવો
      const { data: permData, error: permErr } = await supabase
        .from('user_permissions')
        .select('role, assigned_sites, company_id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (permErr || !permData) return;

      // 🎯 ૨. ડાયનેમિક એડમિન ચેક (કોઈપણ કંપનીનો એડમિન, મેનેજર કે BDM હોય તે એડમિન ગણાશે)
      const isAdmin = ['Manager', 'Admin', 'BDM', 'Company Admin'].includes(permData.role);
      const currentCompanyId = permData?.company_id;

      let allowedPlants = [];
      if (!isAdmin && permData?.assigned_sites) {
        allowedPlants = permData.assigned_sites.map(s => s.trim().toLowerCase());
      }

      // ૩. Plants ના નામ ફેચ કરો જેથી ખબર પડે કયું પ્લાન્ટ છે અને કઈ સાઇટ
      const { data: plantsData } = await supabase.from('plants').select('*');
      const plantNamesSet = new Set(
        plantsData?.map(p => (p.name || p.plant_name || '').trim().toLowerCase()) || []
      );

      let fundQuery = supabase
        .from('plant_fund_transfers')
        .select('id, plant_name, purpose, requested_amount, approved_amount, status, supervisor_name, received_by, company_id');

      // 🎯 ૪. SaaS મલ્ટી-ટેનન્ટ ફિલ્ટર: માત્ર એ જ કંપનીની રિક્વેસ્ટ લાવો જેની આ એડમિન કે યૂઝર છે
      if (currentCompanyId) {
        fundQuery = fundQuery.eq('company_id', currentCompanyId);
      }

      fundQuery = fundQuery
        .in('status', ['PENDING', 'SENT', 'pending', 'sent'])
        .order('id', { ascending: false })
        .limit(15);

      const { data: fundReq, error: fundErr } = await fundQuery;

      if (fundErr) {
        console.error('Supabase Query Error:', fundErr.message);
        return;
      }

      if (fundReq && fundReq.length > 0) {
        fundReq.forEach(item => {
          const st = (item.status || '').toUpperCase();
          const amt = Number(item.approved_amount || item.requested_amount || 0);
          const itemPlant = (item.plant_name || '').trim().toLowerCase();

          const isPlant = plantNamesSet.has(itemPlant);

          // જો એડમિન ન હોય, તો માત્ર તેના અસાઇન કરેલા પ્લાન્ટ કે પોતાની રિક્વેસ્ટ જ દેખાડો
          if (!isAdmin) {
            const isMyPlant = allowedPlants.includes(itemPlant);
            const userEmail = (currentUser.email || '').trim().toLowerCase();
            const isMyRequest = (item.supervisor_name || '').toLowerCase().includes(userEmail.split('@')[0]);
            if (!isMyPlant && !isMyRequest) return;
          }

          // પાથ અને ટેબ નક્કી કરો
          let targetPath = isPlant ? '/plantemployee-dashboard' : '/siteemployee-dashboard';
          let targetTab = isPlant ? 'supervisiorfundrequest' : 'sitesupervisorfundrequest';
          
          if (isAdmin) {
            targetPath = '/plant-transaction';
            targetTab = 'planttransaction'; 
          }

          if (st === 'SENT') {
            list.push({
              id: `fund-${item.id}`,
              title: `🎉 Admin Approved: ₹${amt.toLocaleString('en-IN')}`,
              subText: `${item.purpose || 'ફંડ'} (${item.plant_name}) - સ્વીકારો (Receive)`,
              tab: targetTab,
              path: targetPath,
              time: 'Payment Sent',
              color: '#16a34a'
            });
          } 
          else if (st === 'PENDING') {
            list.push({
              id: `fund-${item.id}`,
              title: `⏳ Pending Approval: ₹${amt.toLocaleString('en-IN')}`,
              subText: `${item.purpose || 'ફંડ રિક્વેસ્ટ'} - [સ્થળ: ${item.plant_name}]`,
              tab: targetTab,
              path: targetPath,
              time: `By: ${item.supervisor_name || 'Supervisor'}`,
              color: '#ea580c'
            });
          }
        });
      }

      setNotifications(list);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };
  useEffect(() => {
    if (!user) return;
    
    fetchNotifications();

    const channel = supabase
      .channel('public:plant_fund_transfers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plant_fund_transfers' },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/update-password', { replace: true });
      }
    });

    async function saveFcmToken() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            const currentToken = await getToken(messaging, { 
              vapidKey: 'BBHNzqWuJgQt9iAaTqY9OEELHdBxDt4M4vwpKuowEn0n_oZ3l5zdHzXY92jBlCub_BlaZU37iLy7QpcEz2tN0WA',
              serviceWorkerRegistration: registration 
            });

            if (currentToken) {
              await supabase
                .from('fcm_tokens')
                .upsert({ 
                   user_id: session.user.id, 
                   fcm_token: currentToken, 
                   created_at: new Date() 
                 }, { onConflict: 'user_id' });
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
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [tenantData, setTenantData] = useState(null);
  // 🌟 ૨. સબડોમેઇન પકડીને લોગો અને નામ લાવવા માટેનો નવો કોડ
  useEffect(() => {
const getTenantData = async () => {
      const host = window.location.hostname; 
      const parts = host.split('.');
      
      let currentSubdomain = 'app'; 
      if (parts.length >= 3 && parts[0] !== 'www') {
        currentSubdomain = parts[0]; 
      }

      // 🌟 .maybeSingle() ની જગ્યાએ .limit(1) વાપરો જેથી ક્યારેય 406 એરર ન આવે
      const { data: companiesData, error } = await supabase
        .from('companies') 
        .select('*')
        .eq('subdomain', currentSubdomain)
        .limit(1);

      const data = companiesData && companiesData.length > 0 ? companiesData[0] : null;

      if (data) {
        setTenantData(data);
        document.title = `${data.company_name || 'T&J Infra'} - ERP Portal`;
        
        const favicon = document.getElementById('dynamic-favicon');
        if (favicon && data.logo_url) {
          favicon.href = data.logo_url;
        }
      } else {
        console.warn("Subdomain database ma malyo nathi, default view chaluse.");
      }
    };

    getTenantData();
  }, []);

  return (
    <AuthProvider>
      <Router>
        <AuthListenerWrapper setNotifications={setNotifications}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout 
                    notifications={notifications} 
                    isNotifOpen={isNotifOpen} 
                    setIsNotifOpen={setIsNotifOpen}
                    tenantData={tenantData}
                  >
                    <AppRoutes 
                      notifications={notifications} 
                      isNotifOpen={isNotifOpen} 
                      setIsNotifOpen={setIsNotifOpen} 
                    />
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