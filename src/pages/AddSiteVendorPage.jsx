import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function AddSiteVendorPage() {
  const [sites, setSites] = useState([])
  const [newSiteName, setNewSiteName] = useState('')
  const [targetSiteForVendor, setTargetSiteForVendor] = useState('')
  const [newVendorName, setNewVendorName] = useState('')
  const [targetSiteForOutward, setTargetSiteForOutward] = useState('')
  const [newOutwardPartyName, setNewOutwardPartyName] = useState('')
  const [targetSiteForCon, setTargetSiteForCon] = useState('')
  const [newContractorName, setNewContractorName] = useState('')
  const [targetSiteForMaterial, setTargetSiteForMaterial] = useState('')
  const [newMaterialName, setNewMaterialName] = useState('')
  const [targetSiteForWork, setTargetSiteForWork] = useState('')
  const [newWorkDescName, setNewWorkDescName] = useState('')

  useEffect(() => {
    loadSites()
  }, [])

  const loadSites = async () => {
    const { data } = await supabase.from('sites').select('*')
    setSites(data || [])
  }

  const addSite = async () => {
    if (!newSiteName) return
    const { error } = await supabase.from('sites').insert([{ site_name: newSiteName }])
    if (error) alert("Error: " + error.message)
    else { setNewSiteName(''); await loadSites(); alert("Site Added Successfully!") }
  }

  const addVendor = async () => {
    if (!targetSiteForVendor || !newVendorName) {
      alert("Please select site and enter vendor name!")
      return
    }
    const { error } = await supabase.from('site_vendors').insert([{ site_name: targetSiteForVendor, name: newVendorName }])
    if (error) alert("Error: " + error.message)
    else { setNewVendorName(''); alert("Vendor Added Successfully!") }
  }

  const addOutwardParty = async () => {
    if (!targetSiteForOutward || !newOutwardPartyName) {
      alert("Please select site and enter outward party name!")
      return
    }
    const { error } = await supabase.from('site_outward_parties').insert([{ site_name: targetSiteForOutward, name: newOutwardPartyName }])
    if (error) alert("Error: " + error.message)
    else { setNewOutwardPartyName(''); alert("Outward Party Added Successfully!") }
  }

  const addContractor = async () => {
    if (!targetSiteForCon || !newContractorName) {
      alert("Please select site and enter contractor name!")
      return
    }
    const { error } = await supabase.from('contractors').insert([{ site_name: targetSiteForCon, name: newContractorName }])
    if (error) alert("Error: " + error.message)
    else { setNewContractorName(''); alert("Contractor Added Successfully!") }
  }

  const addMaterialMaster = async () => {
    if (!targetSiteForMaterial || !newMaterialName) {
      alert("Please select site and enter material name!")
      return
    }
    const { error } = await supabase.from('site_materials_master').insert([{ site_name: targetSiteForMaterial, name: newMaterialName }])
    if (error) alert("Error: " + error.message)
    else { setNewMaterialName(''); alert("Material Added Successfully!") }
  }

  const addWorkDescription = async () => {
    if (!targetSiteForWork || !newWorkDescName) {
      alert("Please select site and enter work description!")
      return
    }
    const { error } = await supabase.from('site_work_descriptions').insert([{ site_name: targetSiteForWork, name: newWorkDescName }])
    if (error) alert("Error: " + error.message)
    else { setNewWorkDescName(''); alert("Work Description Added Successfully!") }
  }

  return (
    <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#0f172a' }}>🏗️ Add Site, Vendor & Contractor</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: '#fff', padding: '16px sm:24px', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box' }}>
        
        {/* Add Site */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
          <input placeholder="New Site Name" value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)} style={{ flex: '1 1 200px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', minWidth: '150px' }} />
          <button onClick={addSite} style={{ backgroundColor: '#2563eb', color: '#fff', padding: '10px 18px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer', flexShrink: 0 }}>Add Site</button>
        </div>

        {/* Add Vendor */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
          <select value={targetSiteForVendor} onChange={(e) => setTargetSiteForVendor(e.target.value)} style={{ flex: '1 1 130px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', minWidth: '120px' }}>
            <option value="">Select Site</option>
            {sites.map(s => <option key={s.id} value={s.site_name}>{s.site_name}</option>)}
          </select>
          <input placeholder="Vendor Name" value={newVendorName} onChange={(e) => setNewVendorName(e.target.value)} style={{ flex: '2 1 180px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', minWidth: '140px' }} />
          <button onClick={addVendor} style={{ backgroundColor: '#059669', color: '#fff', padding: '10px 18px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer', flexShrink: 0 }}>Add Vendor</button>
        </div>

        {/* Add Outward Party */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
          <select value={targetSiteForOutward} onChange={(e) => setTargetSiteForOutward(e.target.value)} style={{ flex: '1 1 130px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', minWidth: '120px' }}>
            <option value="">Select Site</option>
            {sites.map(s => <option key={s.id} value={s.site_name}>{s.site_name}</option>)}
          </select>
          <input placeholder="Outward Party" value={newOutwardPartyName} onChange={(e) => setNewOutwardPartyName(e.target.value)} style={{ flex: '2 1 180px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', minWidth: '140px' }} />
          <button onClick={addOutwardParty} style={{ backgroundColor: '#ea580c', color: '#fff', padding: '10px 18px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer', flexShrink: 0 }}>Add Party</button>
        </div>

        {/* Add Contractor */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
          <select value={targetSiteForCon} onChange={(e) => setTargetSiteForCon(e.target.value)} style={{ flex: '1 1 130px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', minWidth: '120px' }}>
            <option value="">Select Site</option>
            {sites.map(s => <option key={s.id} value={s.site_name}>{s.site_name}</option>)}
          </select>
          <input placeholder="Contractor Name" value={newContractorName} onChange={(e) => setNewContractorName(e.target.value)} style={{ flex: '2 1 180px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', minWidth: '140px' }} />
          <button onClick={addContractor} style={{ backgroundColor: '#9333ea', color: '#fff', padding: '10px 18px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer', flexShrink: 0 }}>Add Contractor</button>
        </div>

        {/* Add Material */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
          <select value={targetSiteForMaterial} onChange={(e) => setTargetSiteForMaterial(e.target.value)} style={{ flex: '1 1 130px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', minWidth: '120px' }}>
            <option value="">Select Site</option>
            {sites.map(s => <option key={s.id} value={s.site_name}>{s.site_name}</option>)}
          </select>
          <input placeholder="Material Name" value={newMaterialName} onChange={(e) => setNewMaterialName(e.target.value)} style={{ flex: '2 1 180px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', minWidth: '140px' }} />
          <button onClick={addMaterialMaster} style={{ backgroundColor: '#0284c7', color: '#fff', padding: '10px 18px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer', flexShrink: 0 }}>Add Material</button>
        </div>

        {/* Add Work Description */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
          <select value={targetSiteForWork} onChange={(e) => setTargetSiteForWork(e.target.value)} style={{ flex: '1 1 130px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', minWidth: '120px' }}>
            <option value="">Select Site</option>
            {sites.map(s => <option key={s.id} value={s.site_name}>{s.site_name}</option>)}
          </select>
          <input placeholder="Work Description" value={newWorkDescName} onChange={(e) => setNewWorkDescName(e.target.value)} style={{ flex: '2 1 180px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', minWidth: '140px' }} />
          <button onClick={addWorkDescription} style={{ backgroundColor: '#d97706', color: '#fff', padding: '10px 18px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer', flexShrink: 0 }}>Add Work</button>
        </div>

      </div>
    </div>
  )
}

export default AddSiteVendorPage;