import React, { useState, useEffect } from 'react'
import { Plus, Search, Building2, MapPin, Receipt, FileText, UserCheck, Package, Clock, Filter, User } from 'lucide-react'
import { supabase } from '../lib/supabase'

function Dashboard() {
  const [mainTab, setMainTab] = useState('site') 
  const [siteSubTab, setSiteSubTab] = useState('summary') 
  
  const [sites, setSites] = useState([])
  const [vendors, setVendors] = useState([]) // Inward Vendors/Parties
  const [outwardParties, setOutwardParties] = useState([]) // Outward Parties
  const [contractors, setContractors] = useState([]) // Contractors
  const [materialsMaster, setMaterialsMaster] = useState([]) // Materials Master (નવું)
  const [workDescriptions, setWorkDescriptions] = useState([]) // Work Descriptions Master (નવું)
  
  const [newSiteName, setNewSiteName] = useState('')
  const [targetSiteForVendor, setTargetSiteForVendor] = useState('')
  const [newVendorName, setNewVendorName] = useState('')
  
  // States for Outward Party
  const [targetSiteForOutward, setTargetSiteForOutward] = useState('')
  const [newOutwardPartyName, setNewOutwardPartyName] = useState('')

  const [targetSiteForCon, setTargetSiteForCon] = useState('')
  const [newContractorName, setNewContractorName] = useState('')

  // States for Material & Work Description (નવું)
  const [targetSiteForMaterial, setTargetSiteForMaterial] = useState('')
  const [newMaterialName, setNewMaterialName] = useState('')

  const [targetSiteForWork, setTargetSiteForWork] = useState('')
  const [newWorkDescName, setNewWorkDescName] = useState('')

  const [reports, setReports] = useState([])
  const [materials, setMaterials] = useState([])
  const [transactions, setTransactions] = useState([])
  const [attendance, setAttendance] = useState([])
  const [selectedSite, setSelectedSite] = useState('all')
  const [filterDate, setFilterDate] = useState('')

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    const [ {data: siteData}, {data: vendorData}, {data: outwardData}, {data: conData}, {data: matMasterData}, {data: workData}, {data: reportsData}, {data: matData}, {data: txData}, {data: attData} ] = await Promise.all([
      supabase.from('sites').select('*'),
      supabase.from('site_vendors').select('*'),
      supabase.from('site_outward_parties').select('*'),
      supabase.from('contractors').select('*'),
      supabase.from('site_materials_master').select('*'), // Load materials master table
      supabase.from('site_work_descriptions').select('*'), // Load work descriptions table
      supabase.from('daily_reports').select('*').order('created_at', { ascending: false }),
      supabase.from('material_movements').select('*').order('created_at', { ascending: false }),
      supabase.from('site_transactions').select('*').order('transaction_date', { ascending: false }),
      supabase.from('site_attendance').select('*').order('created_at', { ascending: false })
    ])
    setSites(siteData || [])
    setVendors(vendorData || [])
    setOutwardParties(outwardData || [])
    setContractors(conData || [])
    setMaterialsMaster(matMasterData || [])
    setWorkDescriptions(workData || [])
    setReports(reportsData || [])
    setMaterials(matData || [])
    setTransactions(txData || [])
    setAttendance(attData || [])
  }

  const addSite = async () => {
    if (!newSiteName) return
    const { error } = await supabase.from('sites').insert([{ site_name: newSiteName }])
    if (error) alert("Error saving: " + error.message)
    else { setNewSiteName(''); await loadAllData(); alert("Site Added Successfully!") }
  }

  // Site-wise Inward Vendor Add
  const addVendor = async () => {
    if (!targetSiteForVendor || !newVendorName) {
      alert("Please select site and enter vendor name!")
      return
    }
    const { error } = await supabase.from('site_vendors').insert([{ site_name: targetSiteForVendor, name: newVendorName }])
    if (error) alert("Error saving: " + error.message)
    else { setNewVendorName(''); await loadAllData(); alert("Vendor Added Successfully!") }
  }

  // Site-wise Outward Party Add
  const addOutwardParty = async () => {
    if (!targetSiteForOutward || !newOutwardPartyName) {
      alert("Please select site and enter outward party name!")
      return
    }
    const { error } = await supabase.from('site_outward_parties').insert([{ site_name: targetSiteForOutward, name: newOutwardPartyName }])
    if (error) alert("Error saving: " + error.message)
    else { setNewOutwardPartyName(''); await loadAllData(); alert("Outward Party Added Successfully!") }
  }

  // Site-wise Contractor Add
  const addContractor = async () => {
    if (!targetSiteForCon || !newContractorName) {
      alert("Please select site and enter contractor name!")
      return
    }
    const { error } = await supabase.from('contractors').insert([{ site_name: targetSiteForCon, name: newContractorName }])
    if (error) alert("Error saving: " + error.message)
    else { setNewContractorName(''); await loadAllData(); alert("Contractor Added Successfully!") }
  }

  // Site-wise Material Add (નવું)
  const addMaterialMaster = async () => {
    if (!targetSiteForMaterial || !newMaterialName) {
      alert("Please select site and enter material name!")
      return
    }
    const { error } = await supabase.from('site_materials_master').insert([{ site_name: targetSiteForMaterial, name: newMaterialName }])
    if (error) alert("Error saving: " + error.message)
    else { setNewMaterialName(''); await loadAllData(); alert("Material Added Successfully!") }
  }

  // Site-wise Work Description Add (નવું)
  const addWorkDescription = async () => {
    if (!targetSiteForWork || !newWorkDescName) {
      alert("Please select site and enter work description!")
      return
    }
    const { error } = await supabase.from('site_work_descriptions').insert([{ site_name: targetSiteForWork, name: newWorkDescName }])
    if (error) alert("Error saving: " + error.message)
    else { setNewWorkDescName(''); await loadAllData(); alert("Work Description Added Successfully!") }
  }

  const filteredReports = reports.filter(r => {
    const matchSite = selectedSite === 'all' || r.site_name === selectedSite
    const matchDate = !filterDate || r.report_date === filterDate
    return matchSite && matchDate
  })

  const filteredMaterials = materials.filter(m => {
    const matchSite = selectedSite === 'all' || m.site_name === selectedSite
    const matchDate = !filterDate || m.entry_date === filterDate
    return matchSite && matchDate
  })

  const filteredTransactions = transactions.filter(tx => {
    const matchSite = selectedSite === 'all' || tx.site_id === selectedSite
    const matchDate = !filterDate || tx.transaction_date === filterDate
    return matchSite && matchDate
  })

  const filteredAttendance = attendance.filter(a => {
    const matchSite = selectedSite === 'all' || a.site_name === selectedSite
    return matchSite
  })

  const getMaterialSummary = () => {
    const summary = {}
    filteredMaterials.forEach(m => {
      m.items?.forEach(it => {
        const matName = it.materialName || 'Other'
        if (!summary[matName]) summary[matName] = { inward: 0, used: 0, outward: 0 }
        if (m.movement_type === 'inward') summary[matName].inward += parseFloat(it.quantity || 0)
        else if (m.movement_type === 'outward') summary[matName].outward += parseFloat(it.quantity || 0)
      })
    })

    filteredReports.forEach(r => {
      r.contractor_details?.forEach(c => {
        c.materials?.forEach(u => {
          const matName = u.material || 'Other'
          if (!summary[matName]) summary[matName] = { inward: 0, used: 0, outward: 0 }
          summary[matName].used += parseFloat(u.quantity || 0)
        })
      })
    })
    return summary
  }

  const materialSummary = getMaterialSummary()

  return (
    <div style={{ padding: '16px', fontFamily: 'Inter', maxWidth: '1200px', margin: '0 auto' }}>
      
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px 0' }}>T&J Infra Admin Command Center</h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
          <button onClick={() => setMainTab('plant')} style={{ padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '12px', background: mainTab === 'plant' ? '#2563eb' : '#f1f5f9', color: mainTab === 'plant' ? '#fff' : '#475569' }}>🏭 Plant</button>
          <button onClick={() => setMainTab('site')} style={{ padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '12px', background: mainTab === 'site' ? '#2563eb' : '#f1f5f9', color: mainTab === 'site' ? '#fff' : '#475569' }}>🏗️ Site</button>
          <button onClick={() => setMainTab('office')} style={{ padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '12px', background: mainTab === 'office' ? '#2563eb' : '#f1f5f9', color: mainTab === 'office' ? '#fff' : '#475569' }}>🏢 Office</button>
        </div>

        {/* Site, Vendor, Outward Party, Contractor, Material & Work Description Management */}
        {mainTab === 'site' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
            
            {/* Add Site */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input placeholder="Enter New Site Name" value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
              <button onClick={addSite} style={{ backgroundColor: '#2563eb', color: '#fff', padding: '8px 16px', borderRadius: '6px', border: 'none', fontWeight: '600', fontSize: '13px' }}>Add Site</button>
            </div>
            
            {/* Add Inward Vendor / Party */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <select value={targetSiteForVendor} onChange={(e) => setTargetSiteForVendor(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}>
                <option value="">-- Select Site --</option>
                {sites.map(s => <option key={s.id} value={s.site_name}>{s.site_name}</option>)}
              </select>
              <input placeholder="Inward Vendor / Party Name" value={newVendorName} onChange={(e) => setNewVendorName(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
              <button onClick={addVendor} style={{ backgroundColor: '#059669', color: '#fff', padding: '8px 16px', borderRadius: '6px', border: 'none', fontWeight: '600', fontSize: '13px' }}>Add Vendor</button>
            </div>

            {/* Add Outward Party / Client */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <select value={targetSiteForOutward} onChange={(e) => setTargetSiteForOutward(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}>
                <option value="">-- Select Site --</option>
                {sites.map(s => <option key={s.id} value={s.site_name}>{s.site_name}</option>)}
              </select>
              <input placeholder="Outward Party / Client Name (જ્યાં મટીરિયલ જાય)" value={newOutwardPartyName} onChange={(e) => setNewOutwardPartyName(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
              <button onClick={addOutwardParty} style={{ backgroundColor: '#ea580c', color: '#fff', padding: '8px 16px', borderRadius: '6px', border: 'none', fontWeight: '600', fontSize: '13px' }}>Add Outward Party</button>
            </div>

            {/* Add Contractor */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <select value={targetSiteForCon} onChange={(e) => setTargetSiteForCon(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}>
                <option value="">-- Select Site --</option>
                {sites.map(s => <option key={s.id} value={s.site_name}>{s.site_name}</option>)}
              </select>
              <input placeholder="Contractor Name" value={newContractorName} onChange={(e) => setNewContractorName(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
              <button onClick={addContractor} style={{ backgroundColor: '#9333ea', color: '#fff', padding: '8px 16px', borderRadius: '6px', border: 'none', fontWeight: '600', fontSize: '13px' }}>Add Contractor</button>
            </div>

            {/* Add Material (નવું) */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <select value={targetSiteForMaterial} onChange={(e) => setTargetSiteForMaterial(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}>
                <option value="">-- Select Site --</option>
                {sites.map(s => <option key={s.id} value={s.site_name}>{s.site_name}</option>)}
              </select>
              <input placeholder="Material Name (મટીરિયલ નામ)" value={newMaterialName} onChange={(e) => setNewMaterialName(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
              <button onClick={addMaterialMaster} style={{ backgroundColor: '#0284c7', color: '#fff', padding: '8px 16px', borderRadius: '6px', border: 'none', fontWeight: '600', fontSize: '13px' }}>Add Material</button>
            </div>

            {/* Add Work Description (નવું) */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <select value={targetSiteForWork} onChange={(e) => setTargetSiteForWork(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}>
                <option value="">-- Select Site --</option>
                {sites.map(s => <option key={s.id} value={s.site_name}>{s.site_name}</option>)}
              </select>
              <input placeholder="Work Description (બિઝનેસ/કામનું વિવરણ)" value={newWorkDescName} onChange={(e) => setNewWorkDescName(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
              <button onClick={addWorkDescription} style={{ backgroundColor: '#d97706', color: '#fff', padding: '8px 16px', borderRadius: '6px', border: 'none', fontWeight: '600', fontSize: '13px' }}>Add Work Desc</button>
            </div>

          </div>
        )}
      </div>

      {mainTab === 'site' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '16px' }}>
            <button onClick={() => setSiteSubTab('summary')} style={{ padding: '10px 2px', fontSize: '10px', borderRadius: '8px', border: 'none', fontWeight: '600', backgroundColor: siteSubTab === 'summary' ? '#2563eb' : '#f1f5f9', color: siteSubTab === 'summary' ? '#fff' : '#475569' }}>📦 Stock</button>
            <button onClick={() => setSiteSubTab('reports')} style={{ padding: '10px 2px', fontSize: '10px', borderRadius: '8px', border: 'none', fontWeight: '600', backgroundColor: siteSubTab === 'reports' ? '#2563eb' : '#f1f5f9', color: siteSubTab === 'reports' ? '#fff' : '#475569' }}>📋 Reports</button>
            <button onClick={() => setSiteSubTab('materials')} style={{ padding: '10px 2px', fontSize: '10px', borderRadius: '8px', border: 'none', fontWeight: '600', backgroundColor: siteSubTab === 'materials' ? '#2563eb' : '#f1f5f9', color: siteSubTab === 'materials' ? '#fff' : '#475569' }}>🚚 In/Out</button>
            <button onClick={() => setSiteSubTab('transactions')} style={{ padding: '10px 2px', fontSize: '10px', borderRadius: '8px', border: 'none', fontWeight: '600', backgroundColor: siteSubTab === 'transactions' ? '#2563eb' : '#f1f5f9', color: siteSubTab === 'transactions' ? '#fff' : '#475569' }}>💰 Tx & Bills</button>
            <button onClick={() => setSiteSubTab('attendance')} style={{ padding: '10px 2px', fontSize: '10px', borderRadius: '8px', border: 'none', fontWeight: '600', backgroundColor: siteSubTab === 'attendance' ? '#2563eb' : '#f1f5f9', color: siteSubTab === 'attendance' ? '#fff' : '#475569' }}>🕒 Attendance</button>
          </div>

          {siteSubTab === 'summary' && (
            <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '12px' }}>📊 Material Stock & Usage Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                {Object.keys(materialSummary).length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#64748b' }}>No material movement recorded yet.</p>
                ) : (
                  Object.entries(materialSummary).map(([matName, data]) => {
                    const stock = data.inward - data.used - data.outward
                    return (
                      <div key={matName} style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#0f172a' }}>{matName}</h4>
                        <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', color: '#475569' }}>
                          <div>📥 Total Inward: <strong style={{ color: '#059669' }}>{data.inward}</strong></div>
                          <div>📤 Total Outward: <strong style={{ color: '#e11d48' }}>{data.outward}</strong></div>
                          <div>🛠️ Total Used: <strong style={{ color: '#2563eb' }}>{data.used}</strong></div>
                          <hr style={{ border: '0', borderTop: '1px solid #cbd5e1', margin: '4px 0' }} />
                          <div>📦 Current Stock: <strong style={{ color: stock >= 0 ? '#059669' : '#e11d48', fontSize: '13px' }}>{stock}</strong></div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Dashboard