import React, { useState } from 'react'
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  Briefcase, 
  Award, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  Navigation,
  Fingerprint,
  Radio,
  Building
} from 'lucide-react'
import { supabase } from '../lib/supabase'

function EmployeeManagement() {
  const [punchStatus, setPunchStatus] = useState(false)
  const [punchTime, setPunchTime] = useState(null)
  const [loading, setLoading] = useState(false)
  const [locationInfo] = useState({
    site: 'T&J Central Headquarters - Sector 4',
    coords: '28.6139° N, 77.2090° E',
    status: 'Within Geofence Range'
  })

  const handlePunchToggle = async () => {
    setLoading(true)
    try {
      const nextStatus = !punchStatus
      const now = new Date()
      
      // Supabase માં ડેટા ઇન્સર્ટ કરવાની ક્વેરી
      const { error } = await supabase
        .from('attendances')
        .insert([
          { 
            punch_type: nextStatus ? 'IN' : 'OUT', 
            punch_time: now.toISOString(),
            site_location: locationInfo.site,
            coordinates: locationInfo.coords
          }
        ])

      if (error) throw error

      setPunchTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setPunchStatus(nextStatus)
    } catch (error) {
      console.error('Error saving punch data:', error.message)
      alert('Failed to save attendance: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const features = [
    {
      icon: Users,
      title: 'Employee Directory',
      description: 'View and manage all corporate and site employee profiles with detailed metrics',
      color: '#2563eb',
      bg: '#eff6ff'
    },
    {
      icon: UserPlus,
      title: 'Add / Edit Personnel',
      description: 'Onboard new site engineers or update existing structural management details',
      color: '#059669',
      bg: '#ecfdf5'
    },
    {
      icon: Navigation,
      title: 'Live Geofence Attendance',
      description: 'Track real-time GPS check-ins, active shifts, and automated site boundary alerts',
      color: '#7c3aed',
      bg: '#f5f3ff'
    },
    {
      icon: Award,
      title: 'Performance & Audits',
      description: 'Monitor structural safety reviews, target completions, and appraisal schedules',
      color: '#d97706',
      bg: '#fffbeb'
    },
    {
      icon: Briefcase,
      title: 'Payroll & Allowances',
      description: 'Manage monthly compensation, overtime logs, and hazard site allowances',
      color: '#db2777',
      bg: '#fdf2f8'
    },
    {
      icon: CheckCircle,
      title: 'Task Assignment',
      description: 'Delegate engineering milestones, blueprint reviews, and task responsibilities',
      color: '#0d9488',
      bg: '#f0fdf4'
    }
  ]

  return (
    <div style={{ paddingBottom: '48px', fontFamily: 'Inter, system-ui, sans-serif', color: '#1e293b' }}>
      
      {/* Top Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #dbeafe' }}>
              Workforce Module
            </span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>T&J Infra Management System</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>Employee Management</h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Streamline personnel records, live tracking, and shift operations.</p>
        </div>
        
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#2563eb', color: '#ffffff', padding: '10px 20px', borderRadius: '12px', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.2)' }}>
          <UserPlus size={16} /> 
          <span>Add Employee</span>
        </button>
      </div>

      {/* Live GPS Attendance Punch Terminal */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #312e81 100%)', borderRadius: '16px', padding: '24px', color: '#ffffff', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', marginBottom: '24px', position: 'relative', overflow: 'hidden', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', position: 'relative', zIndex: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <Radio size={12} /> Live Geofenced Terminal
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Secure Biometric Simulation</span>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0' }}>Daily Shift Attendance & GPS Check-In</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12px', color: '#cbd5e1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building size={14} color="#60a5fa" />
                <span>{locationInfo.site}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={14} color="#34d399" />
                <span>{locationInfo.coords}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>Current Status</p>
              <p style={{ fontSize: '13px', fontWeight: 'bold', margin: '2px 0 0 0', color: punchStatus ? '#34d399' : '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: punchStatus ? '#34d399' : '#fbbf24', display: 'inline-block' }}></span>
                {punchStatus ? `Clocked In (${punchTime})` : 'Clocked Out'}
              </p>
            </div>
            
            <button
              onClick={handlePunchToggle}
              disabled={loading}
              style={{
                backgroundColor: punchStatus ? '#dc2626' : '#059669',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '10px',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              <Fingerprint size={16} />
              <span>{loading ? 'Processing...' : punchStatus ? 'Punch Out' : 'Punch In Now'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: '#eff6ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={24} color="#2563eb" />
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', margin: 0 }}>Total Employees</p>
            <p style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '4px 0 0 0' }}>248</p>
          </div>
        </div>
        
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: '#ecfdf5', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={24} color="#059669" />
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', margin: 0 }}>Active Today</p>
            <p style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '4px 0 0 0' }}>232</p>
          </div>
        </div>
        
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: '#fffbeb', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={24} color="#d97706" />
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', margin: 0 }}>On Leave</p>
            <p style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '4px 0 0 0' }}>16</p>
          </div>
        </div>
        
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: '#f5f3ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={24} color="#7c3aed" />
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', margin: 0 }}>New This Month</p>
            <p style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '4px 0 0 0' }}>12</p>
          </div>
        </div>

      </div>

      {/* Features Grid */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '24px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>Management Modules</h2>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>Tools and operational subsystems for comprehensive workforce governance</p>
        </div>
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  style={{
                    padding: '20px',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ width: '42px', height: '42px', backgroundColor: feature.bg, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                    <Icon size={20} color={feature.color} />
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 6px 0' }}>{feature.title}</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>Quick Actions</h2>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>Frequently used shortcuts and navigation triggers</p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', cursor: 'pointer', fontWeight: '600', fontSize: '12px', color: '#334155' }}>
            <UserPlus size={20} color="#2563eb" />
            <span>Add Employee</span>
          </button>
          <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', cursor: 'pointer', fontWeight: '600', fontSize: '12px', color: '#334155' }}>
            <Search size={20} color="#059669" />
            <span>Search Directory</span>
          </button>
          <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', cursor: 'pointer', fontWeight: '600', fontSize: '12px', color: '#334155' }}>
            <Filter size={20} color="#7c3aed" />
            <span>Filter Status</span>
          </button>
          <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', cursor: 'pointer', fontWeight: '600', fontSize: '12px', color: '#334155' }}>
            <Calendar size={20} color="#d97706" />
            <span>Shift Schedule</span>
          </button>
        </div>
      </div>

    </div>
  )
}

export default EmployeeManagement