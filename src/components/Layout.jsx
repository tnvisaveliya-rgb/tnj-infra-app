import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, Building2, LogOut, Menu, X, ChevronRight, Receipt, FileText } from 'lucide-react'

function Layout({ children }) {
  const location = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const userEmail = (user?.email || '').trim().toLowerCase()

  // બધા ઉપલબ્ધ નેવિગેશન ઓપ્શન્સ (અહીં transactions ની જગ્યાએ /supervisor-dashboard અથવા સાચો પાથ સેટ કરો)
  const allNavItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/crm', label: 'CRM', icon: Building2 },
    { path: '/supervisor-dashboard', label: 'Site Daily Progress Report', icon: Receipt },
    { path: '/PlantReports', label: 'Plant Report', icon: FileText },
  ]

  // ઈમેલ મુજબ મેનુ ફિલ્ટર કરવાનું લોજિક
  const getFilteredNavItems = () => {
    if (userEmail === 'infra.tnj@gmail.com') {
      return allNavItems
    } else if (userEmail === 'patelvarun61961@gmail.com') {
      // વરુણ માટે ફક્ત 'Site Daily Progress Report'
      return allNavItems.filter(item => item.path === '/supervisor-dashboard')
    } else if (userEmail === 'patelvarun61961@gmail.com') {
      // મૌલિક માટે ફક્ત 'CRM'
      return allNavItems.filter(item => item.path === '/crm')
    }
    return []
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
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            zIndex: 998,
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          width: '280px',
          backgroundColor: '#0f172a',
          color: '#fff',
          zIndex: 999,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease-in-out',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
        className="lg:translate-x-0"
      >
        <div>
          {/* Logo Header */}
          <div style={{ height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', backgroundColor: '#2563eb', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                T&J
              </div>
              <div>
                <h1 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0 }}>T&J Infra</h1>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>Management System</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              className="lg:hidden"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: '600',
                    backgroundColor: isActive ? '#2563eb' : 'transparent',
                    color: isActive ? '#fff' : '#cbd5e1',
                  }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* User & Logout Footer */}
        <div style={{ padding: '16px', borderTop: '1px solid #1e293b', backgroundColor: 'rgba(15, 23, 42, 0.8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', backgroundColor: '#1e293b', borderRadius: '10px', marginBottom: '12px' }}>
            <div style={{ width: '32px', height: '32px', backgroundColor: '#3b82f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
              {userEmail?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userEmail || 'User'}
              </p>
              <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0 }}>
                {userEmail === 'infra.tnj@gmail.com' ? 'Administrator' : 'User'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '10px',
              fontWeight: '600',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }} className="lg:pl-[280px]">
        {/* Header */}
        <header style={{ height: '64px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'sticky', top: 0, zIndex: 30 }}>
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
                {navItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
              </span>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Welcome, <strong style={{ color: '#0f172a' }}>{userEmail?.split('@')[0] || 'User'}</strong>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ flex: 1, padding: '24px', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout