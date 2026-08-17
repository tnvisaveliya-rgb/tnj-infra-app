import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Trash2, Edit2, Check, X, Eye, Plus, Filter, Phone, FileDown, Building } from 'lucide-react'

const statesList = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", 
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", 
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

function AddSiteVendorPage() {
  const [sites, setSites] = useState([])
  
  // Site Form Input States
  const [siteName, setSiteName] = useState('')
  const [siteAddress, setSiteAddress] = useState('')
  const [siteState, setSiteState] = useState('')
  const [sitePhone, setSitePhone] = useState('')

  // Lists
  const [vendors, setVendors] = useState([])
  const [outwardParties, setOutwardParties] = useState([])
  const [contractors, setContractors] = useState([])
  const [materials, setMaterials] = useState([])
  const [workDescriptions, setWorkDescriptions] = useState([])

  // Modal / Popup States ('site', 'vendor', 'party', 'contractor', 'material', 'WorkDescriptions')
  const [activeModal, setActiveModal] = useState(null)
  const [showViewSection, setShowViewSection] = useState(false)
  const [showSiteListSection, setShowSiteListSection] = useState(false)

  // Active Tab inside View & Modify Section ('sites', 'vendors', 'parties', 'contractors', 'materials', 'WorkDescriptions')
  const [viewTab, setViewTab] = useState('vendors')

  // View Filter States
  const [filterViewSite, setFilterViewSite] = useState('all')
  const [filterSiteState, setFilterSiteState] = useState('all')

  // Item Form Input States
  const [formSite, setFormSite] = useState('')
  const [formName, setFormName] = useState('')
  const [formCompanyName, setFormCompanyName] = useState('')
  const [formMobile, setFormMobile] = useState('')

  // Full Edit States for Items
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editMobile, setEditMobile] = useState('')

  // Site Edit States
  const [editingSiteId, setEditingSiteId] = useState(null)
  const [editSiteName, setEditSiteName] = useState('')
  const [editSiteAddress, setEditSiteAddress] = useState('')
  const [editSiteState, setEditSiteState] = useState('')
  const [editSitePhone, setEditSitePhone] = useState('')

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    const { data: sitesData } = await supabase.from('sites').select('*')
    setSites(sitesData || [])

    const { data: vData } = await supabase.from('site_vendors').select('*')
    setVendors(vData || [])

    const { data: oData } = await supabase.from('site_outward_parties').select('*')
    setOutwardParties(oData || [])

    const { data: cData } = await supabase.from('contractors').select('*')
    setContractors(cData || [])

    const { data: mData } = await supabase.from('site_materials_master').select('*')
    setMaterials(mData || [])

    const { data: wData } = await supabase.from('site_work_descriptions').select('*')
    setWorkDescriptions(wData || [])
  }

  // Save New Site with Mandatory State Dropdown
  const handleSaveSite = async () => {
    if (!siteName.trim()) { alert("Please enter site name!"); return; }
    if (!siteState) { alert("Please select state!"); return; }
    
    const exists = sites.some(s => s.site_name.trim().toLowerCase() === siteName.trim().toLowerCase())
    if (exists) { alert("This site is already existing!"); return; }

    const payload = {
      site_name: siteName.trim(),
      address: siteAddress.trim() || '',
      state: siteState.trim(),
      phone: sitePhone.trim() || ''
    }

    const { error } = await supabase.from('sites').insert([payload])
    if (error) alert("Error: " + error.message)
    else { 
      alert("Site Added Successfully!");
      setSiteName('');
      setSiteAddress('');
      setSiteState('');
      setSitePhone('');
      setActiveModal(null);
      await loadAllData(); 
    }
  }

  const handleSaveModalData = async () => {
    if (!formSite || !formName.trim()) { alert("Please select site and enter name!"); return }

    let tableName = ''
    let currentList = []
    if (activeModal === 'vendor') { tableName = 'site_vendors'; currentList = vendors; }
    else if (activeModal === 'party') { tableName = 'site_outward_parties'; currentList = outwardParties; }
    else if (activeModal === 'contractor') { tableName = 'contractors'; currentList = contractors; }
    else if (activeModal === 'material') { tableName = 'site_materials_master'; currentList = materials; }
    else if (activeModal === 'WorkDescriptions') { tableName = 'site_work_descriptions'; currentList = workDescriptions; }

    const exists = currentList.some(item => item.site_name === formSite && item.name.trim().toLowerCase() === formName.trim().toLowerCase())
    if (exists) { alert("This is already existing!"); return }

    const payload = {
      site_name: formSite,
      name: formName.trim(),
      company_name: formCompanyName.trim() || '',
      mobile: formMobile.trim() || ''
    }

    const { error } = await supabase.from(tableName).insert([payload])
    if (error) alert("Error: " + error.message)
    else {
      alert("Successfully Added!")
      setActiveModal(null); setFormSite(''); setFormName(''); setFormCompanyName(''); setFormMobile(''); loadAllData()
    }
  }

  const handleDelete = async (table, id) => {
    if (!window.confirm("Are you sure you want to delete this?")) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) alert("Error deleting: " + error.message)
    else { loadAllData(); alert("Deleted successfully!") }
  }

  const handleDeleteSite = async (id) => {
    if (!window.confirm("Are you sure you want to delete this site?")) return
    const { error } = await supabase.from('sites').delete().eq('id', id)
    if (error) alert("Error deleting site: " + error.message)
    else { loadAllData(); alert("Site deleted successfully!") }
  }

  const handleUpdate = async (table, id) => {
    if (!editName.trim()) return alert("Name cannot be empty!")
    const payload = {
      name: editName.trim(),
      company_name: editCompany.trim() || '',
      mobile: editMobile.trim() || ''
    }
    const { error } = await supabase.from(table).update(payload).eq('id', id)
    if (error) alert("Error updating: " + error.message)
    else {
      setEditingId(null)
      setEditName('')
      setEditCompany('')
      setEditMobile('')
      loadAllData()
      alert("Updated successfully!")
    }
  }

  const handleUpdateSite = async (id) => {
    if (!editSiteName.trim()) return alert("Site name cannot be empty!")
    if (!editSiteState) return alert("State cannot be empty!")
    const payload = {
      site_name: editSiteName.trim(),
      address: editSiteAddress.trim() || '',
      state: editSiteState.trim(),
      phone: editSitePhone.trim() || ''
    }
    const { error } = await supabase.from('sites').update(payload).eq('id', id)
    if (error) alert("Error updating site: " + error.message)
    else {
      setEditingSiteId(null)
      setEditSiteName('')
      setEditSiteAddress('')
      setEditSiteState('')
      setEditSitePhone('')
      loadAllData()
      alert("Site updated successfully!")
    }
  }

  const exportToExcel = (dataList, siteTitle, tabName) => {
    if (dataList.length === 0) { alert("No data to export!"); return; }
    
    let tabTitleHeading = "List";
    if (tabName === 'vendors') tabTitleHeading = "Vendor List";
    else if (tabName === 'parties') tabTitleHeading = "Outward Party List";
    else if (tabName === 'contractors') tabTitleHeading = "Contractor List";

    const fullTitle = siteTitle === 'all' ? `All Sites ${tabTitleHeading}` : `${siteTitle} ${tabTitleHeading}`;

    let csvContent = `data:text/csv;charset=utf-8,${fullTitle}\n\nName,Company Name,Mobile Number\n`;
    dataList.forEach(item => {
      csvContent += `"${item.name || ''}","${item.company_name || ''}","${item.mobile || ''}"\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${fullTitle.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Export Sites to Excel with all details
  const exportSitesToExcel = (dataList, title) => {
    if (dataList.length === 0) { alert("No sites to export!"); return; }
    
    const fullTitle = title === 'all' ? "All States Sites List" : `${title} Sites List`;

    let csvContent = `data:text/csv;charset=utf-8,${fullTitle}\n\nSite Name,Address,State,Phone Number\n`;
    dataList.forEach(item => {
      csvContent += `"${item.site_name || ''}","${item.address || ''}","${item.state || ''}","${item.phone || ''}"\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${fullTitle.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Filtered Sites based on State
  const filteredSites = filterSiteState === 'all' ? sites : sites.filter(s => s.state === filterSiteState)

  const filteredVendors = filterViewSite === 'all' ? vendors : vendors.filter(v => v.site_name === filterViewSite)
  const filteredParties = filterViewSite === 'all' ? outwardParties : outwardParties.filter(p => p.site_name === filterViewSite)
  const filteredContractors = filterViewSite === 'all' ? contractors : contractors.filter(c => c.site_name === filterViewSite)
  const filteredMaterials = filterViewSite === 'all' ? materials : materials.filter(m => m.site_name === filterViewSite)
  const filteredWorkDescriptions = filterViewSite === 'all' ? workDescriptions : workDescriptions.filter(w => w.site_name === filterViewSite)

  return (
    <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}>
      
      {/* Top Header & Toggles */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>🏗️ Site Masters Management</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowSiteListSection(!showSiteListSection)} style={{ backgroundColor: showSiteListSection ? '#475569' : '#0284c7', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building size={14} /> {showSiteListSection ? 'Hide Sites' : 'View & Modify Sites'}
          </button>
          <button onClick={() => setShowViewSection(!showViewSection)} style={{ backgroundColor: showViewSection ? '#475569' : '#0f172a', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Eye size={14} /> {showViewSection ? 'Hide Lists' : 'View & Modify Items'}
          </button>
        </div>
      </div>

      {/* ACTION BUTTONS CARD */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={() => setActiveModal('site')} style={{ backgroundColor: '#2563eb', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}><Plus size={16} /> Add Site</button>
          <button onClick={() => setActiveModal('vendor')} style={{ backgroundColor: '#059669', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}><Plus size={16} /> Add Vendor</button>
          <button onClick={() => setActiveModal('party')} style={{ backgroundColor: '#ea580c', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}><Plus size={16} /> Add Party</button>
          <button onClick={() => setActiveModal('contractor')} style={{ backgroundColor: '#9333ea', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}><Plus size={16} /> Add Contractor</button>
          <button onClick={() => setActiveModal('material')} style={{ backgroundColor: '#4f46e5', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}><Plus size={16} /> Add Material</button>
          <button onClick={() => setActiveModal('WorkDescriptions')} style={{ backgroundColor: '#d97706', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}><Plus size={16} /> Add Work Description</button>
        </div>
      </div>

      {/* POPUP MODAL FORMS */}
      {activeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                {activeModal === 'site' ? '🏗️ Add New Site' : activeModal === 'vendor' ? '🏢 Add New Vendor' : activeModal === 'party' ? '🚚 Add Outward Party' : activeModal === 'contractor' ? '👷 Add New Contractor' : activeModal === 'material' ? '📦 Add Site Material' : '📝 Add Work Description'}
              </h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
            </div>

            {/* SITE POPUP FORM WITH STATE DROPDOWN */}
            {activeModal === 'site' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Site Name *</label>
                  <input placeholder="Enter site name..." value={siteName} onChange={(e) => setSiteName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Address (Optional)</label>
                  <input placeholder="Enter address..." value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>State *</label>
                  <select value={siteState} onChange={(e) => setSiteState(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    <option value="">-- Choose State --</option>
                    {statesList.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Phone Number (Optional)</label>
                  <input type="tel" placeholder="Enter phone number..." value={sitePhone} onChange={(e) => setSitePhone(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button onClick={handleSaveSite} style={{ flex: 1, backgroundColor: '#2563eb', color: '#fff', padding: '10px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Save Site</button>
                  <button onClick={() => setActiveModal(null)} style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#475569', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                </div>
              </div>
            ) : (
              /* VENDOR / PARTY / CONTRACTOR / MATERIAL / WORK FORM */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Select Site *</label>
                  <select value={formSite} onChange={(e) => setFormSite(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    <option value="">-- Choose Site --</option>
                    {sites.map(s => <option key={s.id} value={s.site_name}>{s.site_name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>
                    {activeModal === 'material' ? 'Material Name *' : activeModal === 'WorkDescriptions' ? 'Work Description *' : 'Name *'}
                  </label>
                  <input placeholder="Enter name..." value={formName} onChange={(e) => setFormName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                {activeModal !== 'material' && activeModal !== 'WorkDescriptions' && (
                  <>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Company Name (Optional)</label>
                      <input placeholder="Enter company name..." value={formCompanyName} onChange={(e) => setFormCompanyName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Mobile Number (Optional)</label>
                      <input type="tel" placeholder="Enter mobile number..." value={formMobile} onChange={(e) => setFormMobile(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button onClick={handleSaveModalData} style={{ flex: 1, backgroundColor: '#2563eb', color: '#fff', padding: '10px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Save</button>
                  <button onClick={() => setActiveModal(null)} style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#475569', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* VIEW & MODIFY SITES SECTION WITH STATE FILTER & EXPORT */}
      {showSiteListSection && (
        <div style={{ marginTop: '24px', backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>🏗️ View & Modify Sites</h3>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* State Filter for Sites */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Filter size={14} color="#64748b" />
                <select value={filterSiteState} onChange={(e) => setFilterSiteState(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', fontWeight: '600' }}>
                  <option value="all">🌐 All States</option>
                  {statesList.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>

              {/* Export Sites to Excel Button */}
              <button 
                onClick={() => exportSitesToExcel(filteredSites, filterSiteState === 'all' ? 'All States' : filterSiteState)}
                style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <FileDown size={14} /> Export Excel
              </button>
            </div>
          </div>

          {filteredSites.length === 0 ? <p style={{ fontSize: '12px', color: '#64748b' }}>No sites found for this state.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredSites.map(s => (
                <div key={s.id} style={{ padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  {editingSiteId === s.id ? (
                    <div style={{ display: 'flex', gap: '6px', flex: 1, flexWrap: 'wrap' }}>
                      <input value={editSiteName} onChange={(e) => setEditSiteName(e.target.value)} placeholder="Site Name" style={{ padding: '4px', fontSize: '11px', flex: 1 }} />
                      <input value={editSiteAddress} onChange={(e) => setEditSiteAddress(e.target.value)} placeholder="Address" style={{ padding: '4px', fontSize: '11px', flex: 1 }} />
                      <select value={editSiteState} onChange={(e) => setEditSiteState(e.target.value)} style={{ padding: '4px', fontSize: '11px', flex: 1 }}>
                        {statesList.map(st => <option key={st} value={st}>{st}</option>)}
                      </select>
                      <input value={editSitePhone} onChange={(e) => setEditSitePhone(e.target.value)} placeholder="Phone" style={{ padding: '4px', fontSize: '11px', flex: 1 }} />
                      <button onClick={() => handleUpdateSite(s.id)} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}><Check size={12} /></button>
                      <button onClick={() => setEditingSiteId(null)} style={{ background: '#cbd5e1', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}><X size={12} /></button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '13px' }}>{s.site_name}</span>
                        {s.address && <span style={{ color: '#64748b', marginLeft: '8px' }}>📍 {s.address}</span>}
                        {s.state && <span style={{ color: '#0284c7', marginLeft: '8px', fontWeight: '600' }}>🗺️ {s.state}</span>}
                        {s.phone && (
                          <a href={`tel:${s.phone}`} style={{ color: '#16a34a', marginLeft: '10px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Phone size={12} /> {s.phone}
                          </a>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button onClick={() => { setEditingSiteId(s.id); setEditSiteName(s.site_name); setEditSiteAddress(s.address || ''); setEditSiteState(s.state || statesList[0]); setEditSitePhone(s.phone || ''); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}><Edit2 size={14} /></button>
                        <button onClick={() => handleDeleteSite(s.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={14} /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW & MODIFY ITEMS SECTION */}
      {showViewSection && (
        <div style={{ marginTop: '24px', backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>📋 View & Modify Items</h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} color="#64748b" />
              <select value={filterViewSite} onChange={(e) => setFilterViewSite(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', fontWeight: '600' }}>
                <option value="all">🌐 All Sites</option>
                {sites.map(s => <option key={s.id} value={s.site_name}>{s.site_name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button onClick={() => setViewTab('vendors')} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: viewTab === 'vendors' ? '#059669' : '#f1f5f9', color: viewTab === 'vendors' ? '#fff' : '#475569', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>Vendors ({filteredVendors.length})</button>
              <button onClick={() => setViewTab('parties')} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: viewTab === 'parties' ? '#ea580c' : '#f1f5f9', color: viewTab === 'parties' ? '#fff' : '#475569', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>Parties ({filteredParties.length})</button>
              <button onClick={() => setViewTab('contractors')} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: viewTab === 'contractors' ? '#9333ea' : '#f1f5f9', color: viewTab === 'contractors' ? '#fff' : '#475569', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>Contractors ({filteredContractors.length})</button>
              <button onClick={() => setViewTab('materials')} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: viewTab === 'materials' ? '#4f46e5' : '#f1f5f9', color: viewTab === 'materials' ? '#fff' : '#475569', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>Materials ({filteredMaterials.length})</button>
              <button onClick={() => setViewTab('WorkDescriptions')} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: viewTab === 'WorkDescriptions' ? '#d97706' : '#f1f5f9', color: viewTab === 'WorkDescriptions' ? '#fff' : '#475569', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>Work Desc ({filteredWorkDescriptions.length})</button>
            </div>
            
            {(viewTab === 'vendors' || viewTab === 'parties' || viewTab === 'contractors') && (
              <button 
                onClick={() => {
                  let list = viewTab === 'vendors' ? filteredVendors : viewTab === 'parties' ? filteredParties : filteredContractors;
                  exportToExcel(list, filterViewSite === 'all' ? 'All Sites' : filterViewSite, viewTab);
                }}
                style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <FileDown size={14} /> Export Excel
              </button>
            )}
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid #0284c7', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
              {filterViewSite === 'all' ? '🌐 All Sites' : `🏗️ Site: ${filterViewSite}`} — <span style={{ color: '#059669' }}>{viewTab.toUpperCase()} LIST</span>
            </h4>
          </div>

          {/* VENDORS LIST */}
          {viewTab === 'vendors' && (
            <div>
              {filteredVendors.length === 0 ? <p style={{ fontSize: '12px', color: '#64748b' }}>No vendors found.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {filteredVendors.map(v => (
                    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', flexWrap: 'wrap', gap: '6px' }}>
                      {editingId === v.id ? (
                        <div style={{ display: 'flex', gap: '6px', flex: 1, flexWrap: 'wrap' }}>
                          <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" style={{ padding: '4px', fontSize: '11px', flex: 1 }} />
                          <input value={editCompany} onChange={(e) => setEditCompany(e.target.value)} placeholder="Company" style={{ padding: '4px', fontSize: '11px', flex: 1 }} />
                          <input value={editMobile} onChange={(e) => setEditMobile(e.target.value)} placeholder="Mobile" style={{ padding: '4px', fontSize: '11px', flex: 1 }} />
                          <button onClick={() => handleUpdate('site_vendors', v.id)} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}><Check size={12} /></button>
                          <button onClick={() => setEditingId(null)} style={{ background: '#cbd5e1', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}><X size={12} /></button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{v.name}</span>
                            {v.company_name && <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>({v.company_name})</span>}
                            {filterViewSite === 'all' && <span style={{ fontSize: '10px', color: '#0284c7', marginLeft: '6px' }}>[{v.site_name}]</span>}
                            {v.mobile && (
                              <a href={`tel:${v.mobile}`} style={{ fontSize: '11px', color: '#16a34a', marginLeft: '10px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 'bold' }}>
                                <Phone size={12} /> {v.mobile}
                              </a>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button onClick={() => { setEditingId(v.id); setEditName(v.name); setEditCompany(v.company_name || ''); setEditMobile(v.mobile || ''); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}><Edit2 size={14} /></button>
                            <button onClick={() => handleDelete('site_vendors', v.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={14} /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* OUTWARD PARTIES LIST */}
          {viewTab === 'parties' && (
            <div>
              {filteredParties.length === 0 ? <p style={{ fontSize: '12px', color: '#64748b' }}>No outward parties found.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {filteredParties.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', flexWrap: 'wrap', gap: '6px' }}>
                      {editingId === p.id ? (
                        <div style={{ display: 'flex', gap: '6px', flex: 1, flexWrap: 'wrap' }}>
                          <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" style={{ padding: '4px', fontSize: '11px', flex: 1 }} />
                          <input value={editCompany} onChange={(e) => setEditCompany(e.target.value)} placeholder="Company" style={{ padding: '4px', fontSize: '11px', flex: 1 }} />
                          <input value={editMobile} onChange={(e) => setEditMobile(e.target.value)} placeholder="Mobile" style={{ padding: '4px', fontSize: '11px', flex: 1 }} />
                          <button onClick={() => handleUpdate('site_outward_parties', p.id)} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}><Check size={12} /></button>
                          <button onClick={() => setEditingId(null)} style={{ background: '#cbd5e1', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}><X size={12} /></button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{p.name}</span>
                            {p.company_name && <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>({p.company_name})</span>}
                            {filterViewSite === 'all' && <span style={{ fontSize: '10px', color: '#0284c7', marginLeft: '6px' }}>[{p.site_name}]</span>}
                            {p.mobile && (
                              <a href={`tel:${p.mobile}`} style={{ fontSize: '11px', color: '#16a34a', marginLeft: '10px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 'bold' }}>
                                <Phone size={12} /> {p.mobile}
                              </a>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button onClick={() => { setEditingId(p.id); setEditName(p.name); setEditCompany(p.company_name || ''); setEditMobile(p.mobile || ''); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}><Edit2 size={14} /></button>
                            <button onClick={() => handleDelete('site_outward_parties', p.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={14} /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CONTRACTORS LIST */}
          {viewTab === 'contractors' && (
            <div>
              {filteredContractors.length === 0 ? <p style={{ fontSize: '12px', color: '#64748b' }}>No contractors found.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {filteredContractors.map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', flexWrap: 'wrap', gap: '6px' }}>
                      {editingId === c.id ? (
                        <div style={{ display: 'flex', gap: '6px', flex: 1, flexWrap: 'wrap' }}>
                          <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" style={{ padding: '4px', fontSize: '11px', flex: 1 }} />
                          <input value={editCompany} onChange={(e) => setEditCompany(e.target.value)} placeholder="Company" style={{ padding: '4px', fontSize: '11px', flex: 1 }} />
                          <input value={editMobile} onChange={(e) => setEditMobile(e.target.value)} placeholder="Mobile" style={{ padding: '4px', fontSize: '11px', flex: 1 }} />
                          <button onClick={() => handleUpdate('contractors', c.id)} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}><Check size={12} /></button>
                          <button onClick={() => setEditingId(null)} style={{ background: '#cbd5e1', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}><X size={12} /></button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{c.name}</span>
                            {c.company_name && <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>({c.company_name})</span>}
                            {filterViewSite === 'all' && <span style={{ fontSize: '10px', color: '#0284c7', marginLeft: '6px' }}>[{c.site_name}]</span>}
                            {c.mobile && (
                              <a href={`tel:${c.mobile}`} style={{ fontSize: '11px', color: '#16a34a', marginLeft: '10px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 'bold' }}>
                                <Phone size={12} /> {c.mobile}
                              </a>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button onClick={() => { setEditingId(c.id); setEditName(c.name); setEditCompany(c.company_name || ''); setEditMobile(c.mobile || ''); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}><Edit2 size={14} /></button>
                            <button onClick={() => handleDelete('contractors', c.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={14} /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MATERIALS LIST */}
          {viewTab === 'materials' && (
            <div>
              {filteredMaterials.length === 0 ? <p style={{ fontSize: '12px', color: '#64748b' }}>No materials found.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {filteredMaterials.map(m => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                      <div>
                        <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{m.name}</span>
                        {filterViewSite === 'all' && <span style={{ fontSize: '10px', color: '#0284c7', marginLeft: '6px' }}>[{m.site_name}]</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {editingId === m.id ? (
                          <>
                            <input value={editText} onChange={(e) => setEditText(e.target.value)} style={{ padding: '4px', fontSize: '11px' }} />
                            <button onClick={() => handleUpdate('site_materials_master', m.id)} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}><Check size={12} /></button>
                            <button onClick={() => setEditingId(null)} style={{ background: '#cbd5e1', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}><X size={12} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditingId(m.id); setEditText(m.name); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}><Edit2 size={14} /></button>
                            <button onClick={() => handleDelete('site_materials_master', m.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={14} /></button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* WORK DESCRIPTIONS LIST */}
          {viewTab === 'WorkDescriptions' && (
            <div>
              {filteredWorkDescriptions.length === 0 ? <p style={{ fontSize: '12px', color: '#64748b' }}>No work descriptions found.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {filteredWorkDescriptions.map(w => (
                    <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                      <div>
                        <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{w.name}</span>
                        {filterViewSite === 'all' && <span style={{ fontSize: '10px', color: '#0284c7', marginLeft: '6px' }}>[{w.site_name}]</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {editingId === w.id ? (
                          <>
                            <input value={editText} onChange={(e) => setEditText(e.target.value)} style={{ padding: '4px', fontSize: '11px' }} />
                            <button onClick={() => handleUpdate('site_work_descriptions', w.id)} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}><Check size={12} /></button>
                            <button onClick={() => setEditingId(null)} style={{ background: '#cbd5e1', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}><X size={12} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditingId(w.id); setEditText(w.name); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}><Edit2 size={14} /></button>
                            <button onClick={() => handleDelete('site_work_descriptions', w.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={14} /></button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  )
}

export default AddSiteVendorPage;