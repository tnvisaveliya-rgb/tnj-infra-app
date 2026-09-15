import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, ArrowLeftRight, ClipboardList, Factory, Receipt, FileText, Users, Briefcase,FolderKanban } from 'lucide-react'

function Dashboard() {
  const navigate = useNavigate()

  // સેક્શન પ્રમાણે ટેબ્સની યાદી
  const sections = [
        {
      title: "🎛️ Master Management",
      items: [
        { id: 'Core Master ', label: '1. Core Master', icon: FolderKanban, color: '#059669', path: '/add-plant-vendor' },
        { id: 'staff_management', label: '2. Staff Management', icon: Users, color: '#db2777', path: '/staff-management' },
      ]
    },
    {
      title: "🏗️ Site Operations",
      items: [
       
        { id: 'site_Transaction', label: '3. Site Transaction', icon: ArrowLeftRight, color: '#7c3aed', path: '/site-transaction' },
        { id: 'site_report', label: '4. Site Report', icon: ClipboardList, color: '#2563eb', path: '/site-report' },
      ]
    },
    {
      title: "🏭 Plant Operations",
      items: [
       
        { id: 'plant_Transaction', label: '5. Plant Transaction', icon: Receipt, color: '#0891b2', path: '/plant-transaction' },
        { id: 'Admin_plant_report', label: '6. Plant Report', icon: FileText, color: '#4f46e5', path: '/Admin-plant-report' },
      ]
    },
    {
      title: "📊 Reports & Analytics",
      items: [
       
        { id: 'employee_report', label: '7. Employee Report', icon: Users, color: '#db2777', path: '/employee-report' },
        { id: 'crm_report', label: '8. CRM Report', icon: Briefcase, color: '#d97706', path: '/crm-report' },
      ]
    }
  ]

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', }}>
      
     {/* Top Header with Back Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#fff', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: '16px' }}>
      <button 
          onClick={() => navigate('/')}
          style={{ 
            backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', 
            padding: '8px 12px', borderRadius: '8px', fontWeight: 'bold', 
            fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center' 
          }}
        >
          ← Back
        </button>
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>T&J Infra Management Panel</h1>
          <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 0 0' }}>Corporate Dashboard & Operations Center</p>
        </div>
      </div>

      {/* Sections Loop */}
      {sections.map((section, index) => (
        <div key={index} style={{ marginBottom: '20px', width: '100%', boxSizing: 'border-box' }}>
          
          {/* Section Heading */}
          <h3 style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', paddingLeft: '2px' }}>
            {section.title}
          </h3>

          {/* Cards Grid (2 Column Compact Layout) */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '8px',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {section.items.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.path)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    textAlign: 'left',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '8px', 
                      backgroundColor: '#f1f5f9', 
                      color: tab.color,
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Icon size={18} />
                    </div>
                    <div style={{ color: '#cbd5e1', fontSize: '14px', fontWeight: 'bold' }}>›</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a', display: 'block' }}>
                      {tab.label}
                    </span>
                    <span style={{ fontSize: '9px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                      ઓપન કરો
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

        </div>
      ))}

    </div>
  )
}

export default Dashboard;