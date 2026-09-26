import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, Loader2, UserPlus, Trash2, Shield, Edit3, Phone, Users, ArrowLeft, Search, MapPin } from 'lucide-react'


const AVAILABLE_TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'crm', label: 'CRM' },
  { id: 'site_progress', label: 'Site Daily Progress Report' },
  { id: 'plant_report', label: 'Plant Report' }
]

export default function StaffManagement() {
  const [staffList, setStaffList] = useState([])
  const [allSites, setAllSites] = useState([])
  const [plantsList, setPlantsList] = useState([]) // 👈 બધો પ્લાન્ટ ડેટા
  const [assignedPlants, setAssignedPlants] = useState([]) // 👈 સિલેક્ટ કરેલા પ્લાન્ટ

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Edit Modal States
  const [editingStaff, setEditingStaff] = useState(null)
  const [editForm, setEditForm] = useState({
    full_name: '',
    mobile: '',
    role: 'Staff',
    password: ''
  })
  const [editTabs, setEditTabs] = useState([])
  const [editSites, setEditSites] = useState([])
  const [editPlants, setEditPlants] = useState([])
  const [updating, setUpdating] = useState(false)
  const [editStateFilter, setEditStateFilter] = useState('All')
 const [editPlantStateFilter, setEditPlantStateFilter] = useState('All') // 👈 Plant Filter (Edit)

  // Add Staff Modal States
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    mobile: '',
    role: 'Staff',
    allowed_tabs: ['site_progress', 'plant_report'],
    assigned_sites: [],
    assigned_plants: []
  })
  const [addStateFilter, setAddStateFilter] = useState('All')
  const [addPlantStateFilter, setAddPlantStateFilter] = useState('All')   // 👈 Plant Filter (Add)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchStaff()
    fetchSites()
    loadPlants()
  }, [])

  const fetchStaff = async () => {
    const { data, error } = await supabase.from('user_permissions').select('*')
    if (!error && data) setStaffList(data)
  }

  const fetchSites = async () => {
    const { data, error } = await supabase.from('sites').select('*')
    if (!error && data) setAllSites(data)
  }


// આ ફંક્શનને તમારા useEffect માં કૉલ કરો
const loadPlants = async () => {
  const { data, error } = await supabase.from('plants').select('*');
  if (!error && data) {
    setPlantsList(data);
  }
};
const uniqueStates = ['All', ...new Set(allSites.map(s => s.state).filter(Boolean))]
  const uniquePlantStates = ['All', ...new Set(plantsList.map(p => p.state).filter(Boolean))] // 👈 Plant માટે રાજ્યોનું લિસ્ટ

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
    setEditForm({
      full_name: staff.full_name || '',
      mobile: staff.mobile || '',
      role: staff.role || 'Staff',
      password: ''
    })
    setEditTabs(staff.allowed_tabs || [])

    // 🧹 ૧. Sites માટે સફાઈ: જો સાઇટ ડીલીટ થઈ ગઈ હશે (જેમ કે ghv mh), તો તેને ઓટોમેટિક કાઢી નાખશે
    const cleanSites = (staff.assigned_sites || []).filter(siteName => 
      allSites.some(s => s.site_name === siteName)
    );
    setEditSites(cleanSites);

    // 🧹 ૨. Plants માટે સફાઈ: બધો જ કચરો ('[', '"' વગેરે) અને ડીલીટ થયેલા પ્લાન્ટ્સ સાફ કરી દેશે
    let cleanPlants = [];
    if (Array.isArray(staff.assigned_plants)) {
      cleanPlants = staff.assigned_plants.filter(plantName => 
        // માત્ર સાચા અને અસ્તિત્વ ધરાવતા પ્લાન્ટના નામ જ પાસ થવા દેશે
        plantName && plantName.length > 2 && plantsList.some(p => p.plant_name === plantName)
      );
    }
    setEditPlants(cleanPlants);

    setEditStateFilter('All')
    setEditPlantStateFilter('All')
  }

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value })
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
  // ૧. Edit Modal માટેનું ફંક્શન
  const handleEditPlantCheckboxChange = (plantName) => {
    let updatedPlants = [...editPlants]
    if (updatedPlants.includes(plantName)) {
      updatedPlants = updatedPlants.filter(p => p !== plantName)
    } else {
      updatedPlants.push(plantName)
    }
    setEditPlants(updatedPlants)
  }

  const handleUpdatePermissions = async (e) => {
    e.preventDefault()
    setUpdating(true)

    try {
      const { error: updateError } = await supabase
        .from('user_permissions')
        .update({ 
          full_name: editForm.full_name,
          mobile: editForm.mobile,
          role: editForm.role,
          allowed_tabs: editTabs,
          assigned_sites: editSites,
          assigned_plants: editPlants 
        })
        .eq('user_id', editingStaff.user_id)

      if (updateError) throw updateError;

      if (editForm.password && editForm.password.trim().length >= 6) {
        const { error: pwdError } = await supabase.auth.updateUser({
          password: editForm.password
        })
        if (pwdError) {
          console.warn("Password update warning:", pwdError.message);
        }
      }

      alert("સ્ટાફની વિગતો અને પરમિશન સફળતાપૂર્વક અપડેટ થઈ ગઈ!")
      setEditingStaff(null)
      fetchStaff()
    } catch (err) {
      alert("અપડેટ કરવામાં એરર આવી: " + err.message)
    } finally {
      setUpdating(false)
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

 // ૨. Add New Staff Modal માટેનું ફંક્શન
  const handlePlantCheckboxChange = (plantName) => {
    let updatedPlants = [...formData.assigned_plants]
    if (updatedPlants.includes(plantName)) {
      updatedPlants = updatedPlants.filter(p => p !== plantName)
    } else {
      updatedPlants.push(plantName)
    }
    setFormData({ ...formData, assigned_plants: updatedPlants })
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
            email: formData.email, 
            mobile: formData.mobile,
            role: formData.role,
            allowed_tabs: formData.allowed_tabs,
            assigned_sites: formData.assigned_sites,
            assigned_plants: formData.assigned_plants
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
        assigned_sites: [],
        assigned_plants: []
      });
      setAssignedPlants([]);
      fetchStaff();

    } catch (err) {
      console.error('Error adding staff:', err)
      setError(err.message || 'સ્ટાફ ઉમેરવામાં નિષ્ફળતા મળી.')
    } finally { 
      setLoading(false)
    }
  }

  const filteredEditSites = allSites.filter(site => editStateFilter === 'All' || site.state === editStateFilter)
  const filteredAddSites = allSites.filter(site => addStateFilter === 'All' || site.state === addStateFilter)
  const filteredEditPlants = plantsList.filter(plant => editPlantStateFilter === 'All' || plant.state === editPlantStateFilter) // 👈 Filter Logic
  const filteredAddPlants = plantsList.filter(plant => addPlantStateFilter === 'All' || plant.state === addPlantStateFilter)     // 👈 Filter Logic

// 👇 સર્ચ માટેનું ફિલ્ટર લોજિક
  const filteredStaff = staffList.filter(staff => 
    staff.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    staff.mobile?.includes(searchTerm)
  );

 return (
    <div style={{ maxWidth: '650px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* 1. Header & Back Button (Thodu motu karyu ane margin ghataadyu) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '12px' }}>
        <button 
          onClick={() => window.history.back()}
          style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', 
            background: '#f8fafc', color: '#334155', fontWeight: '500', 
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', 
            fontSize: '14px', whiteSpace: 'nowrap', marginTop: '2px'
          }}
        >
          ← Back
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 'bold' }}>
            <Users size={22} color="#2563eb" /> Staff Management
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b', lineHeight: '1.4' }}>
            સ્ટાફ મેમ્બર્સ, પેજ એક્સેસ અને સાઇટ્સ અહીંથી મેનેજ કરો.
          </p>
        </div>
      </div>

      {/* 2. Action Bar (Box paatalu karyu ane margin ochu karyu) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '8px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '14px', color: '#0f172a' }}>
          <Shield size={16} color="#0f172a" /> Staff List 
          <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '12px', marginLeft: '4px' }}>
            Total: {staffList.length}
          </span>
        </div>
        <button 
          onClick={() => { setIsModalOpen(true); setAddStateFilter('All'); }}
          style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}
        >
          + Add New Staff
        </button>
      </div>

      {/* 3. Search Bar (Margin ochu karyu) */}
      <div style={{ position: 'relative', marginBottom: '10px' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#64748b' }} />
        <input 
          type="text" 
          placeholder="Search staff name or mobile..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '8px 10px 8px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
        />
      </div>

      {/* 4. Staff Cards List (Box vacche gap 12px thi ghatadine 8px karyo) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredStaff.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' }}>
            કોઈ સ્ટાફ મળ્યો નથી.
          </div>
        ) : (
          filteredStaff.map((s) => {
            let sites = s.assigned_sites;
            if (typeof sites === 'string') { try { sites = JSON.parse(sites); } catch(e) { sites = []; } }
            
            let plants = s.assigned_plants;
            if (typeof plants === 'string') { try { plants = JSON.parse(plants); } catch(e) { plants = []; } }

            return (
              <div key={s.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', gap: '15px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#0f172a', marginBottom: '6px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    {s.full_name} 
                    <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                      {s.role}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '13px', color: '#475569', marginBottom: '8px' }}>
                    ✉️ {s.email || 'N/A'} &nbsp;|&nbsp; 
                    {s.mobile ? (
                      <a href={`tel:${s.mobile}`} style={{ textDecoration: 'none', color: '#0f172a', fontWeight: '600', cursor: 'pointer' }}>
                        📞 {s.mobile}
                      </a>
                    ) : (
                      <span>📞 N/A</span>
                    )}
                  </div>

                  <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ color: '#2563eb' }}>
                      <span style={{ fontWeight: '600' }}>Sites:</span> {Array.isArray(sites) && sites.length > 0 ? sites.join(', ') : 'None'}
                    </div>
                    <div style={{ color: '#ea580c' }}>
                      <span style={{ fontWeight: '600' }}>Plants:</span> {Array.isArray(plants) && plants.length > 0 ? plants.join(', ') : 'None'}
                    </div>
                    <div style={{ color: '#16a34a' }}>
                      <span style={{ fontWeight: '600' }}>Allowed Tabs:</span> {s.allowed_tabs && s.allowed_tabs.length > 0 ? s.allowed_tabs.join(', ') : 'None'}
                    </div>
                  </div>
                </div>

                <div>
                  <button onClick={() => openEditModal(s)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '6px 18px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#2563eb', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                    <Edit3 size={14} /> Edit
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

    

      {/* Edit Staff & Permissions Modal */}
      {editingStaff && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                Edit Staff: {editingStaff.full_name}
              </h2>
              <button onClick={() => setEditingStaff(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleUpdatePermissions} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Full Name *</label>
                <input type="text" name="full_name" value={editForm.full_name} onChange={handleEditChange} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} required />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Mobile Number *</label>
                <input type="tel" name="mobile" value={editForm.mobile} onChange={handleEditChange} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} required />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Role *</label>
                <select name="role" value={editForm.role} onChange={handleEditChange} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }} required>
                  <option value="Staff">Staff</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Plant Manager">Plant Manager</option>
                  <option value="BDM">BDM</option>
                  <option value="Manager">Manager</option>
                </select>
              </div>

            

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#0369a1', margin: 0 }}>Allowed Tabs</h3>
                {AVAILABLE_TABS.map((tab) => (
                  <label key={tab.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer', backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <input type="checkbox" checked={editTabs.includes(tab.id)} onChange={() => handleEditCheckboxChange(tab.id)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                    {tab.label}
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#fdf4ff', borderRadius: '8px', border: '1px solid #f5d0fe' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#a21caf', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={16} /> Assign Sites</h3>
                  
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
               {/* Plants (Add) 👈 ભૂલ સુધારી: આ બોક્સ Add માં મિસિંગ હતું */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#fff7ed', borderRadius: '8px', border: '1px solid #fed7aa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#ea580c', margin: 0 }}>🏭 Assign Plants</h3>
                  <select value={addPlantStateFilter} onChange={(e) => setAddPlantStateFilter(e.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #fb923c', fontSize: '11px', backgroundColor: '#fff', color: '#ea580c', fontWeight: 'bold', cursor: 'pointer' }}>
                    {uniquePlantStates.map(st => <option key={st} value={st}>{st === 'All' ? '🌐 All States' : st}</option>)}
                  </select>
                </div>
                {filteredAddPlants.length === 0 ? <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0' }}>આ રાજ્યમાં કોઈ પ્લાન્ટ ઉપલબ્ધ નથી.</p> : (
                  filteredAddPlants.map((plant) => (
                    <label key={plant.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer', backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #fdba74' }}>
                      <input type="checkbox" checked={editPlants.includes(plant.plant_name)} onChange={() => handleEditPlantCheckboxChange(plant.plant_name)} style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#ea580c' }} /> {plant.plant_name} {plant.state ? `(${plant.state})` : ''}
                    </label>  
                  ))
                )} 
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '10px' }}>
                
                {/* 👇 નવું ઉમેરેલું Delete બટન (Edit Modal ની અંદર) */}
                <button type="button" onClick={() => { deleteStaff(editingStaff.user_id); setEditingStaff(null); }} style={{ padding: '8px 14px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
                  <Trash2 size={16} /> Delete
                </button>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setEditingStaff(null)} style={{ padding: '10px 18px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', color: '#475569', fontSize: '13px' }}>Cancel</button>
                  <button type="submit" style={{ padding: '10px 18px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }} disabled={updating}>{updating ? 'Updating...' : 'Save Changes'}</button>
                </div>
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

            <form onSubmit={handleAddStaff} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* 🛑 ANTI-AUTOFILL HACK: બ્રાઉઝરને છેતરવા માટે નકલી છુપાયેલા ફિલ્ડ્સ. Chrome આમાં ડેટા ભરશે. */}
              <input type="email" name="fake_email" style={{ width: 0, height: 0, position: 'absolute', opacity: 0, overflow: 'hidden' }} tabIndex="-1" autoComplete="username" />
              <input type="password" name="fake_password" style={{ width: 0, height: 0, position: 'absolute', opacity: 0, overflow: 'hidden' }} tabIndex="-1" autoComplete="current-password" />
              {error && <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Full Name *</label>
                <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} placeholder="Enter full name" required />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Email (Login ID) *</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} autoComplete="off" style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} placeholder="Enter email address" required />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Phone size={14} /> Mobile Number *
                </label>
                <input type="tel" name="mobile" value={formData.mobile} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} placeholder="Enter mobile number" required />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Password *</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} autoComplete="off" spellCheck="false" style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} placeholder="Enter password (min 6 chars)" required />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Role *</label>
                <select name="role" value={formData.role} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }} required>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#fdf4ff', borderRadius: '8px', border: '1px solid #f5d0fe' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#a21caf', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={16} /> Assign Sites</h3>
                  
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
              {/* Plants (Add) 👈 ભૂલ સુધારી: આ બોક્સ Add માં મિસિંગ હતું */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#fff7ed', borderRadius: '8px', border: '1px solid #fed7aa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#ea580c', margin: 0 }}>🏭 Assign Plants</h3>
                  <select value={addPlantStateFilter} onChange={(e) => setAddPlantStateFilter(e.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #fb923c', fontSize: '11px', backgroundColor: '#fff', color: '#ea580c', fontWeight: 'bold', cursor: 'pointer' }}>
                    {uniquePlantStates.map(st => <option key={st} value={st}>{st === 'All' ? '🌐 All States' : st}</option>)}
                  </select>
                </div>
                {filteredAddPlants.length === 0 ? <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0' }}>આ રાજ્યમાં કોઈ પ્લાન્ટ ઉપલબ્ધ નથી.</p> : (
                  filteredAddPlants.map((plant) => (
                    <label key={plant.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer', backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #fdba74' }}>
                      <input type="checkbox" checked={formData.assigned_plants.includes(plant.plant_name)} onChange={() => handlePlantCheckboxChange(plant.plant_name)} style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#ea580c' }} /> {plant.plant_name} {plant.state ? `(${plant.state})` : ''}
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