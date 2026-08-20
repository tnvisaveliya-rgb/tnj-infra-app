import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, Loader2, UserPlus, Trash2, Shield, Edit3, Phone, Users, MapPin } from 'lucide-react'

const AVAILABLE_TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'crm', label: 'CRM' },
  { id: 'site_progress', label: 'Site Daily Progress Report' },
  { id: 'plant_report', label: 'Plant Report' }
]

export default function StaffManagement() {
  const [staffList, setStaffList] = useState([])
  const [allSites, setAllSites] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Edit Modal States
  const [editingStaff, setEditingStaff] = useState(null)
  const [editTabs, setEditTabs] = useState([])
  const [editSites, setEditSites] = useState([])
  const [updating, setUpdating] = useState(false)
  const [editStateFilter, setEditStateFilter] = useState('All') // એડિટ મોડ માટે સ્ટેટ ફિલ્ટર

  // Add Staff Modal States
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    mobile: '',
    role: 'Staff',
    allowed_tabs: ['site_progress', 'plant_report'],
    assigned_sites: []
  })
  const [addStateFilter, setAddStateFilter] = useState('All') // નવો સ્ટાફ એડ કરવા માટે સ્ટેટ ફિલ્ટર

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchStaff()
    fetchSites()
  }, [])

  const fetchStaff = async () => {
    const { data, error } = await supabase.from('user_permissions').select('*')
    if (!error && data) setStaffList(data)
  }

  const fetchSites = async () => {
    const { data, error } = await supabase.from('sites').select('*')
    if (!error && data) setAllSites(data)
  }

  // ઉપલબ્ધ બધા રાજ્યો (States) ની યુનિક યાદી કાઢવા માટે
  const uniqueStates = ['All', ...new Set(allSites.map(s => s.state).filter(Boolean))]

  const deleteStaff = async (id) => {
    if (confirm("શું તમે આ સ્ટાફને ડિલીટ કરવા માંગો છો?")) {
      const { error } = await supabase.from('user_permissions').delete().eq('user_id', id)
      if (!error) {
        fetchStaff()
      } else {
        alert("ડિલિટ કરવામાં એરર આવી: " + error.message)
      }
    }
  }

  const openEditModal = (staff) => {
    setEditingStaff(staff)
    setEditTabs(staff.allowed_tabs || [])
    setEditSites(staff.assigned_sites || [])
    setEditStateFilter('All')
  }

  const handleEditCheckboxChange = (tabId) => {
    let updated = [...editTabs]
    if (updated.includes(tabId)) {
      updated = updated.filter(t => t !== tabId)
    } else {
      updated.push(tabId)
    }
    setEditTabs(updated)
  }

  const handleEditSiteCheckboxChange = (siteName) => {
    let updatedSites = [...editSites]
    if (updatedSites.includes(siteName)) {
      updatedSites = updatedSites.filter(s => s !== siteName)
    } else {
      updatedSites.push(siteName)
    }
    setEditSites(updatedSites)
  }

  const handleUpdatePermissions = async (e) => {
    e.preventDefault()
    setUpdating(true)

    const { error } = await supabase
      .from('user_permissions')
      .update({ 
        allowed_tabs: editTabs,
        assigned_sites: editSites 
      })
      .eq('user_id', editingStaff.user_id)

    setUpdating(false)

    if (error) {
      alert("અપડેટ કરવામાં એરર આવી: " + error.message)
    } else {
      alert("પરમિશન અને સાઇટ્સ સફળતાપૂર્વક અપડેટ થઈ ગઈ!")
      setEditingStaff(null)
      fetchStaff()
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleTabCheckboxChange = (tabId) => {
    let updatedTabs = [...formData.allowed_tabs]
    if (updatedTabs.includes(tabId)) {
      updatedTabs = updatedTabs.filter(t => t !== tabId)
    } else {
      updatedTabs.push(tabId)
    }
    setFormData({ ...formData, allowed_tabs: updatedTabs })
  }

  const handleSiteCheckboxChange = (siteName) => {
    let updatedSites = [...formData.assigned_sites]
    if (updatedSites.includes(siteName)) {
      updatedSites = updatedSites.filter(s => s !== siteName)
    } else {
      updatedSites.push(siteName)
    }
    setFormData({ ...formData, assigned_sites: updatedSites })
  }

  const handleAddStaff = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.full_name || !formData.email || !formData.password || !formData.mobile || !formData.role) {
      setError('કૃપા કરીને બધી જરૂરી માહિતી ભરો.')
      return
    }

    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: formData.role
          }
        }
      })

      if (authError) throw authError;
      const userId = authData.user?.id;
      if (!userId) throw new Error("યુઝર આઈડી જનરેટ થવામાં ભૂલ થઈ છે.");

      const { error: permError } = await supabase
        .from('user_permissions')
        .insert([
          {
            user_id: userId,
            full_name: formData.full_name,
            mobile: formData.mobile,
            role: formData.role,
            allowed_tabs: formData.allowed_tabs,
            assigned_sites: formData.assigned_sites
          }
        ]);

      if (permError) throw permError;

      alert('નવો સ્ટાફ અને સાઇટ પરમિશન સફળતાપૂર્વક ઉમેરાઈ ગઈ!');
      setIsModalOpen(false);
      setFormData({
        full_name: '',
        email: '',
        password: '',
        mobile: '',
        role: 'Staff',
        allowed_tabs: ['site_progress', 'plant_report'],
        assigned_sites: []
      });
      fetchStaff();

    } catch (err) {
      console.error('Error adding staff:', err)
      setError(err.message || 'સ્ટાફ ઉમેરવામાં નિષ્ફળતા મળી.')
    } finally {
      setLoading(false)
    }
  }

  // ફિલ્ટર કર્યા પછીની સાઇટ્સ મેળવવા માટે
  const filteredEditSites = allSites.filter(site => editStateFilter === 'All' || site.state === editStateFilter)
  const filteredAddSites = allSites.filter(site => addStateFilter === 'All' || site.state === addStateFilter)

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Staff Management</h1>
            <span style={{ backgroundColor: '#e2e8f0', color: '#334155', padding: '2px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Users size={14} /> Total: {staffList.length}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Manage staff members, page access, and assigned sites.</p>
        </div>
        <button 
          onClick={() => { setIsModalOpen(true); setAddStateFilter('All'); }}
          style={{ backgroundColor: '#2563eb', padding: '10px 18px', borderRadius: '10px', border: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff' }}
        >
          <UserPlus size={18} /> Add New Staff
        </button>
      </div>

      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflowX: 'auto', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '750px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
              <th style={{ padding: '14px 16px', width: '22%' }}>Name & Mobile</th>
              <th style={{ padding: '14px 16px', width: '18%' }}>Role</th>
              <th style={{ padding: '14px 16px', width: '25%' }}>Allowed Tabs</th>
              <th style={{ padding: '14px 16px', width: '20%' }}>Assigned Sites</th>
              <th style={{ padding: '14px 16px', width: '15%', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staffList.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                  કોઈ સ્ટાફ ડેટા ઉપલબ્ધ નથી.
                </td>
              </tr>
            ) : (
              staffList.map((s) => (
                <tr key={s.user_id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{s.full_name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{s.mobile || 'No Mobile'}</div>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>
                    <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                      {s.role}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '12px' }}>
                    {s.allowed_tabs ? s.allowed_tabs.join(', ') : 'None'}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#0f172a', fontSize: '12px', fontWeight: '500' }}>
                    {s.assigned_sites && s.assigned_sites.length > 0 ? s.assigned_sites.join(', ') : <span style={{ color: '#94a3b8' }}>No Sites Assigned</span>}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button onClick={() => openEditModal(s)} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: '600', fontSize: '13px', padding: '4px' }}>
                        <Edit3 size={15} /> Edit
                      </button>
                      <button onClick={() => deleteStaff(s.user_id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: '600', fontSize: '13px', padding: '4px' }}>
                        <Trash2 size={15} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Permissions & Sites Modal */}
      {editingStaff && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                Edit Access: {editingStaff.full_name}
              </h2>
              <button onClick={() => setEditingStaff(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleUpdatePermissions} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#0369a1', margin: 0 }}>Allowed Tabs</h3>
                {AVAILABLE_TABS.map((tab) => (
                  <label key={tab.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer', backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <input type="checkbox" checked={editTabs.includes(tab.id)} onChange={() => handleEditCheckboxChange(tab.id)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                    {tab.label}
                  </label>
                ))}
              </div>

              {/* Assign Sites with State Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#fdf4ff', borderRadius: '8px', border: '1px solid #f5d0fe' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#a21caf', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={16} /> Assign Sites</h3>
                  
                  {/* State Filter Dropdown */}
                  <select 
                    value={editStateFilter} 
                    onChange={(e) => setEditStateFilter(e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #d946ef', fontSize: '11px', backgroundColor: '#fff', color: '#a21caf', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    {uniqueStates.map(st => <option key={st} value={st}>{st === 'All' ? '🌐 All States' : st}</option>)}
                  </select>
                </div>

                {filteredEditSites.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0' }}>આ રાજ્યમાં કોઈ સાઇટ ઉપલબ્ધ નથી.</p>
                ) : (
                  filteredEditSites.map((site) => (
                    <label key={site.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer', backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <input type="checkbox" checked={editSites.includes(site.site_name)} onChange={() => handleEditSiteCheckboxChange(site.site_name)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                      {site.site_name} {site.state ? `(${site.state})` : ''}
                    </label>
                  ))
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <button type="button" onClick={() => setEditingStaff(null)} style={{ padding: '8px 16px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', color: '#475569' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }} disabled={updating}>{updating ? 'Updating...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Staff Modal Popup */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Add New Staff & Sites</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={22} /></button>
            </div>

            <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {error && <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Full Name *</label>
                <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }} placeholder="Enter full name" required />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Email (Login ID) *</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }} placeholder="Enter email address" required />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Phone size={14} /> Mobile Number *
                </label>
                <input type="tel" name="mobile" value={formData.mobile} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }} placeholder="Enter mobile number" required />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Password *</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }} placeholder="Enter password (min 6 chars)" required />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Role *</label>
                <select name="role" value={formData.role} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff' }} required>
                  <option value="Staff">Staff</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Plant Manager">Plant Manager</option>
                  <option value="BDM">BDM</option>
                  <option value="Manager">Manager</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#0369a1', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}><Shield size={16} /> Assign Page Access</h3>
                {AVAILABLE_TABS.map((tab) => (
                  <label key={tab.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer', backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <input type="checkbox" checked={formData.allowed_tabs.includes(tab.id)} onChange={() => handleTabCheckboxChange(tab.id)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                    {tab.label}
                  </label>
                ))}
              </div>

              {/* Add New Staff - Assign Sites with State Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#fdf4ff', borderRadius: '8px', border: '1px solid #f5d0fe' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#a21caf', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={16} /> Assign Sites</h3>
                  
                  {/* State Filter Dropdown */}
                  <select 
                    value={addStateFilter} 
                    onChange={(e) => setAddStateFilter(e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #d946ef', fontSize: '11px', backgroundColor: '#fff', color: '#a21caf', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    {uniqueStates.map(st => <option key={st} value={st}>{st === 'All' ? '🌐 All States' : st}</option>)}
                  </select>
                </div>

                {filteredAddSites.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0' }}>આ રાજ્યમાં કોઈ સાઇટ ઉપલબ્ધ નથી.</p>
                ) : (
                  filteredAddSites.map((site) => (
                    <label key={site.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer', backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <input type="checkbox" checked={formData.assigned_sites.includes(site.site_name)} onChange={() => handleSiteCheckboxChange(site.site_name)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                      {site.site_name} {site.state ? `(${site.state})` : ''}
                    </label>
                  ))
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', color: '#475569' }} disabled={loading}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }} disabled={loading}>{loading ? 'Saving...' : 'Save Staff'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}