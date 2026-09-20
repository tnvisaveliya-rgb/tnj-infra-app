import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Menu, ChevronRight, Bell, X, LogOut, Globe, FileText, LayoutDashboard, Building2, FileSpreadsheet, Receipt } from 'lucide-react';

function Layout({ children, notifications = [] }) {
  const location = useLocation()
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [allowedTabs, setAllowedTabs] = useState([])

  const userEmail = (user?.email || '').trim().toLowerCase()
const handlesignout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) console.log("signout error:", error.message);
};
  // ૧. ડેટાબેઝમાંથી પરમિશન ફેચ કરવાનું લોજિક
  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user) return;
      
      // એડમિન માટે બધા ટેબ્સ ફિક્સ
      if (userEmail === 'infra.tnj@gmail.com') {
        setAllowedTabs(['dashboard', 'crm', 'site_progress', 'plant_report', 'employee_dashboard']);
        return;
      }

      // બાકીના સ્ટાફ માટે user_permissions ટેબલમાંથી ડેટા લાવવો
      const { data, error } = await supabase
        .from('user_permissions')
        .select('allowed_tabs')
        .eq('user_id', user.id)
        .single();
      
      if (!error && data?.allowed_tabs) {
        setAllowedTabs(data.allowed_tabs);
      } else {
        setAllowedTabs([]);
      }
    };

    fetchPermissions();
  }, [user, userEmail]);

  // બધા ઉપલબ્ધ નેવિગેશન ઓપ્શન્સ
  const allNavItems = [
    { id: 'dashboard', path: '/Dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'crm', path: '/crm', label: 'CRM', icon: Building2 },
    { id: 'site_progress', path: '/siteemployee-dashboard', label: 'Site Daily Progress Report', icon: Receipt },
    { id: 'plant_report', path: '/plantemployee-dashboard', label: 'Plant Report', icon: FileText },
  ]

  const getFilteredNavItems = () => {
    if (userEmail === 'infra.tnj@gmail.com') {
      return allNavItems
    }
    return allNavItems.filter(item => allowedTabs.includes(item.id))
  }

  const navItems = getFilteredNavItems()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', position: 'relative' }}>
      
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 998,
          }}
        />
      )}

      {/* ================= PREMIUM MODERN ROUNDED SIDEBAR ================= */}
      <aside
        style={{
          position: 'fixed',
          top: '12px',
          left: '12px',
          bottom: '72px',
          width: '280px',
          background: 'linear-gradient(165deg, #0b1329 0%, #111e38 50%, #0d172b 100%)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          color: '#ffffff',
          zIndex: 99999,
          boxShadow: '0 20px 45px -10px rgba(2, 6, 23, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-120%)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '16px',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
        className="lg:translate-x-0"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          
          {/* COMPANY BRANDING HEADER */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '14px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '14px',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                overflow: 'hidden',
                padding: '4px'
              }}>
                <img 
                  src="/logo.png" 
                  alt="T&J Infra Logo" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentNode.innerText = 'T&J';
                    e.target.parentNode.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
                    e.target.parentNode.style.color = '#ffffff';
                    e.target.parentNode.style.fontWeight = '900';
                  }}
                />
              </div>

              <div>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '900', letterSpacing: '0.4px', color: '#ffffff' }}>
                  T&J INFRA
                </h2>
                <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: '700', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  Enterprise Suite
                </span>
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#94a3b8',
                cursor: 'pointer',
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              className="lg:hidden"
            >
              <X size={16} />
            </button>
          </div>

          {/* NAVIGATION LINKS */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '14px',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: isActive ? '800' : '600',
                    backgroundColor: isActive ? '#2563eb' : 'transparent',
                    color: isActive ? '#ffffff' : '#94a3b8',
                    boxShadow: isActive ? '0 6px 18px rgba(37, 99, 235, 0.45)' : 'none',
                    transition: 'all 0.2s ease',
                    border: isActive ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid transparent'
                  }}
                >
                  <Icon size={17} color={isActive ? '#ffffff' : '#64748b'} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* BOTTOM SECTION */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 10px',
            borderRadius: '14px',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '12px',
              flexShrink: 0
            }}>
              {userEmail?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '11px', fontWeight: '800', margin: 0, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userEmail || 'infra.tnj@gmail.com'}
              </p>
              <span style={{ fontSize: '9px', color: '#38bdf8', fontWeight: '700', textTransform: 'uppercase' }}>
                Administrator
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '9px',
              borderRadius: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflowY: 'auto', position: 'relative' }} className="lg:pl-[280px]">
        
        {/* Top Sticky Header */}
        <header style={{ height: '64px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              className="lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div style={{ display: 'none', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '600', color: '#64748b' }} className="lg:flex">
              <span>T&J Infra</span>
              <ChevronRight size={14} /> 
              <span style={{ color: '#0f172a' }}>
                {navItems?.find(item => item.path === location?.pathname)?.label || 'Dashboard'}
              </span>
            </div>
          </div>

          {/* Right Side Container for Welcome & Bell */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Welcome, <strong style={{ color: '#0f172a' }}>{userEmail?.split('@')[0] || 'User'}</strong>
            </div>
  {/* 🔔 Notification Bell Icon & Dropdown */}
<div style={{ position: 'relative' }}>
  <div 
    onClick={() => setIsNotifOpen(!isNotifOpen)}
    style={{ 
      width: '38px', 
      height: '38px', 
      borderRadius: '10px', 
      backgroundColor: isNotifOpen ? '#eff6ff' : '#f8fafc', 
      border: '1px solid #cbd5e1', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      cursor: 'pointer',
      position: 'relative'
    }}
  >
    <Bell size={18} color={notifications.length > 0 ? '#2563eb' : '#64748b'} />
    
    {/* નોટિફિકેશન કાઉન્ટ બેજ */}
    {notifications.length > 0 && (
      <span style={{
        position: 'absolute',
        top: '-4px',
        right: '-4px',
        backgroundColor: '#dc2626',
        color: '#ffffff',
        fontSize: '9px',
        fontWeight: '900',
        borderRadius: '50%',
        width: '18px',
        height: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid #ffffff'
      }}>
        {notifications.length}
      </span>
    )}
  </div>

  {/* 📋 Notification Dropdown List */}
  {isNotifOpen && (
    <div style={{
      position: 'absolute',
      right: 0,
      top: '46px',
      width: '280px',
      backgroundColor: '#ffffff',
      borderRadius: '14px',
      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
      border: '1px solid #e2e8f0',
      padding: '10px',
      zIndex: 1000
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingBottom: '8px', 
        borderBottom: '1px solid #f1f5f9',
        marginBottom: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Bell size={14} color="#2563eb" />
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a' }}>
            NOTIFICATIONS ({notifications.length})
          </span>
        </div>
        <button 
          onClick={() => setIsNotifOpen(false)}
          style={{ 
            background: '#f1f5f9', 
            border: 'none', 
            borderRadius: '50%', 
            width: '22px', 
            height: '22px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: 'pointer', 
            color: '#64748b' 
          }}
        >
          <X size={13} strokeWidth={2.5} />
        </button>
      </div>

      {/* List Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>
            કોઈ નવી રિક્વેસ્ટ કે નોટિફિકેશન નથી.
          </div>
        ) : (
notifications.map((notif) => (
  <div 
    key={notif.id}
    onClick={async () => {
      setIsNotifOpen(false);
      
      try {
        // 🌟 ૧. હાલના યુઝરની પરમિશન (allowed_tabs) ડેટાબેઝમાંથી ફેચ કરો
        let userTabs = allowedTabs;
        if (!userTabs || userTabs.length === 0) {
          const { data } = await supabase
            .from('user_permissions')
            .select('allowed_tabs')
            .eq('user_id', user.id)
            .single();
          userTabs = data?.allowed_tabs || [];
        }

        // 🌟 ૨. પરમિશનના આધારે પાથ અને ટૅબ નક્કી કરો
        let targetPath = '/plantemployee-dashboard';
        let targetTab = 'supervisiourfundrequest';

        if (userTabs.includes('site_progress') && !userTabs.includes('plant_report')) {
          targetPath = '/siteemployee-dashboard';
          targetTab = 'sitesupervisiorfundrequest'; // અથવા સાઇટ માટેનું ફંડ ટૅબ
        } else if (userTabs.includes('plant_report')) {
          targetPath = '/plantemployee-dashboard';
          targetTab = 'supervisiourfundrequest';
        }

        // જો નોટિફિકેશનમાં ખુદનો પાથ કે ટૅબ આપેલો હોય તો તેને પ્રાયોરિટી આપવી
        if (notif.path) {
          targetPath = notif.path;
        }
        if (notif.tab) {
          targetTab = notif.tab;
        }

        // 🌟 ૩. localStorage માં ટૅબ સેવ કરીને નેવિગેટ કરો
        localStorage.setItem('activeTab', targetTab);
        navigate(targetPath);

      } catch (err) {
        console.error("Notification redirection error:", err);
        navigate('/Dashboard');
      }
    }}
    style={{
      padding: '8px 10px',
      borderRadius: '8px',
      backgroundColor: '#f8fafc',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      border: '1px solid #f1f5f9',
      transition: 'background-color 0.2s'
    }}
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <p style={{ margin: 0, fontSize: '11px', fontWeight: '800', color: '#1e293b' }}>
        {notif.title}
      </p>
      {notif.subText && (
        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '500' }}>
          {notif.subText}
        </span>
      )}
      <span style={{ fontSize: '9px', color: notif.color || '#dc2626', fontWeight: '700', marginTop: '2px' }}>
        ● {notif.time}
      </span>
    </div>
    <ChevronRight size={14} color="#94a3b8" />
  </div>
))
        )}
      </div>
    </div>
  )}
</div>


          </div>
        </header>

        {/* Page Content */}
        <div style={{ flex: 1, padding: '12px 16px', maxWidth: '1200px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          {children}
        </div>
      
      </main>
    </div>
  );
}

export default Layout;