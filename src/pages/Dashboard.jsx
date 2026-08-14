import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, ArrowLeftRight, ClipboardList, Factory, Receipt, FileText, Users, Briefcase } from 'lucide-react'

function Dashboard() {
  const navigate = useNavigate()

  // સેક્શન પ્રમાણે ટેબ્સની યાદી
  const sections = [
    {
      title: "🏗️ Site Operations",
      items: [
        { id: 'add_site_vendor', label: '1. Add Site & Vendor', icon: Building2, color: '#059669', path: '/add-site-vendor' },
        { id: 'site_Transaction', label: '2. Site Transaction', icon: ArrowLeftRight, color: '#7c3aed', path: '/site-transaction' },
        { id: 'site_report', label: '3. Site Report', icon: ClipboardList, color: '#2563eb', path: '/site-report' },
      ]
    },
    {
      title: "🏭 Plant Operations",
      items: [
        { id: 'add_plant_vendor', label: '4. Add Plant Vendor', icon: Factory, color: '#ea580c', path: '/add-plant-vendor' },
        { id: 'plant_Transaction', label: '5. Plant Transaction', icon: Receipt, color: '#0891b2', path: '/plant-transaction' },
        { id: 'plant_report', label: '6. Plant Report', icon: FileText, color: '#4f46e5', path: '/plant-report' },
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
    <div style={{ padding: '24px', fontFamily: 'Inter, sans-serif', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* Top Header Title */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>T&J Infra Management Panel</h1>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Corporate Dashboard & Operations Center</p>
      </div>

      {/* Sections Loop */}
      {sections.map((section, index) => (
        <div key={index} style={{ marginBottom: '32px' }}>
          
          {/* Section Heading */}
          <h2 style={{ fontSize: '15px', fontWeight: 'bold', color: '#334155', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {section.title}
          </h2>

          {/* Cards Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
            gap: '16px' 
          }}>
            {section.items.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    textAlign: 'left',
                    width: '100%'
                  }}
                >
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '10px', 
                    backgroundColor: '#f1f5f9', 
                    color: tab.color,
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155', display: 'block' }}>
                      {tab.label}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                      Click to open page
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Divider Line between sections */}
          {index < sections.length - 1 && (
            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', marginTop: '32px' }} />
          )}
        </div>
      ))}

    </div>
  )
}

export default Dashboard;