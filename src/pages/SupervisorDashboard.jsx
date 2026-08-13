import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, AlertCircle, X, Filter } from 'lucide-react'

function SupervisorDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('site_report')
  const [sites, setSites] = useState([])
  const [vendors, setVendors] = useState([]) // All site vendors
  const [outwardParties, setOutwardParties] = useState([]) // All outward parties
  const [contractors, setContractors] = useState([]) // All contractors
  const [materialsMaster, setMaterialsMaster] = useState([]) // Site-wise Materials Master
  const [workDescriptions, setWorkDescriptions] = useState([]) // Site-wise Work Descriptions Master
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [filterSite, setFilterSite] = useState('all')
  const [filterDate, setFilterDate] = useState('')

  const [previewData, setPreviewData] = useState(null)
  const [reports, setReports] = useState([])
  const [showReportForm, setShowReportForm] = useState(false)

  const [reportForm, setReportForm] = useState({
    siteName: '',
    reportDate: new Date().toISOString().split('T')[0],
    inwardSources: [{ sourceName: '', customSourceName: '', items: [{ materialName: '', customMaterialName: '', quantity: '', unit: 'Bags' }], files: [] }],
    palingWorkRows: [{ contractorName: '', runningFeet: '', height: '', description: '' }], // Paling Work
    contractorRows: [{ contractorName: '', labourCount: '', labourNotes: '', materials: [{ material: '', customMaterialName: '', quantity: '', unit: 'NOS' }] }],
    finalWorkRows: [{ contractorName: '', runningFeet: '', height: '', workDesc: '', customWorkDesc: '' }],
    damageItems: [], // Initial empty so rows are hidden until "+ Add Damage" is clicked
    outwardDestinations: [], // Initial empty so rows are hidden until "+ Add Destination" is clicked
    description: ''
  })

  const [siteProgressPhotos, setSiteProgressPhotos] = useState([])

  const UOM_OPTIONS = ["NOS", "Bags", "KG", "Ton", "Ltr"]

  const [punchStatus, setPunchStatus] = useState(false)
  const [attendanceSite, setAttendanceSite] = useState('')
  const [transactions, setTransactions] = useState([])
  const [showTxForm, setShowTxForm] = useState(false)
  const [txForm, setTxForm] = useState({ siteId: '', type: 'expense', amount: '', category: 'Materials', description: '', transactionDate: new Date().toISOString().split('T')[0] })

  useEffect(() => {
    loadSites()
    loadVendors()
    loadOutwardParties()
    loadContractors()
    loadMaterialsMaster()
    loadWorkDescriptions()
    loadReports()
    loadTransactions()
  }, [])

  const loadSites = async () => {
    const { data } = await supabase.from('sites').select('*')
    setSites(data || [])
  }

  const loadVendors = async () => {
    const { data } = await supabase.from('site_vendors').select('*')
    setVendors(data || [])
  }

  const loadOutwardParties = async () => {
    const { data } = await supabase.from('site_outward_parties').select('*')
    setOutwardParties(data || [])
  }

  const loadContractors = async () => {
    const { data } = await supabase.from('contractors').select('*')
    setContractors(data || [])
  }

  const loadMaterialsMaster = async () => {
    const { data } = await supabase.from('site_materials_master').select('*')
    setMaterialsMaster(data || [])
  }

  const loadWorkDescriptions = async () => {
    try {
      const { data } = await supabase.from('site_work_descriptions').select('*')
      setWorkDescriptions(data || [])
    } catch (err) {
      setWorkDescriptions([])
    }
  }

  const loadReports = async () => {
    const { data } = await supabase.from('daily_reports').select('*').order('created_at', { ascending: false })
    setReports(data || [])
  }

  const loadTransactions = async () => {
    const { data } = await supabase.from('site_transactions').select('*').order('transaction_date', { ascending: false })
    setTransactions(data || [])
  }

  // સાઇટ વાઇઝ ફિલ્ટર કરેલા ડેટા
  const currentSiteVendors = vendors.filter(v => v.site_name === reportForm.siteName)
  const currentSiteOutwardParties = outwardParties.filter(op => op.site_name === reportForm.siteName)
  const currentSiteContractors = contractors.filter(c => c.site_name === reportForm.siteName)
  const currentSiteMaterials = materialsMaster.filter(m => m.site_name === reportForm.siteName)
  const currentSiteWorkDescriptions = workDescriptions.filter(w => w.site_name === reportForm.siteName)

  // --- ADD / REMOVE ROW HANDLERS ---
  const addInwardSource = () => setReportForm({...reportForm, inwardSources: [...reportForm.inwardSources, { sourceName: '', customSourceName: '', items: [{ materialName: '', customMaterialName: '', quantity: '', unit: 'Bags' }], files: [] }]})
  const removeInwardSource = (index) => setReportForm({...reportForm, inwardSources: reportForm.inwardSources.filter((_, i) => i !== index)})
  const addMaterialToInward = (sIndex) => {
    const updated = [...reportForm.inwardSources]
    updated[sIndex].items.push({ materialName: '', customMaterialName: '', quantity: '', unit: 'Bags' })
    setReportForm({...reportForm, inwardSources: updated})
  }
  const removeMaterialFromInward = (sIndex, mIndex) => {
    const updated = [...reportForm.inwardSources]
    updated[sIndex].items = updated[sIndex].items.filter((_, i) => i !== mIndex)
    setReportForm({...reportForm, inwardSources: updated})
  }

  // Paling Work Handlers
  const addPalingWorkRow = () => setReportForm({...reportForm, palingWorkRows: [...reportForm.palingWorkRows, { contractorName: '', runningFeet: '', height: '', description: '' }]})
  const removePalingWorkRow = (index) => setReportForm({...reportForm, palingWorkRows: reportForm.palingWorkRows.filter((_, i) => i !== index)})

  const addOutwardDest = () => setReportForm({...reportForm, outwardDestinations: [...reportForm.outwardDestinations, { destName: '', customDestName: '', items: [{ materialName: '', customMaterialName: '', quantity: '', unit: 'Bags' }], files: [] }]})
  const removeOutwardDest = (index) => setReportForm({...reportForm, outwardDestinations: reportForm.outwardDestinations.filter((_, i) => i !== index)})
  const addMaterialToOutward = (dIndex) => {
    const updated = [...reportForm.outwardDestinations]
    updated[dIndex].items.push({ materialName: '', customMaterialName: '', quantity: '', unit: 'Bags' })
    setReportForm({...reportForm, outwardDestinations: updated})
  }
  const removeMaterialFromOutward = (dIndex, mIndex) => {
    const updated = [...reportForm.outwardDestinations]
    updated[dIndex].items = updated[dIndex].items.filter((_, i) => i !== mIndex)
    setReportForm({...reportForm, outwardDestinations: updated})
  }

  const addContractorRow = () => setReportForm({...reportForm, contractorRows: [...reportForm.contractorRows, { contractorName: '', labourCount: '', labourNotes: '', materials: [{ material: '', customMaterialName: '', quantity: '', unit: 'NOS' }] }]})
  const removeContractorRow = (index) => setReportForm({...reportForm, contractorRows: reportForm.contractorRows.filter((_, i) => i !== index)})
  const addMaterialToContractor = (cIndex) => {
    const updated = [...reportForm.contractorRows]
    updated[cIndex].materials.push({ material: '', customMaterialName: '', quantity: '', unit: 'NOS' })
    setReportForm({...reportForm, contractorRows: updated})
  }
  const removeMaterialFromContractor = (cIndex, mIndex) => {
    const updated = [...reportForm.contractorRows]
    updated[cIndex].materials = updated[cIndex].materials.filter((_, i) => i !== mIndex)
    setReportForm({...reportForm, contractorRows: updated})
  }

  const addDamageItem = () => setReportForm({...reportForm, damageItems: [...reportForm.damageItems, { materialName: '', customMaterialName: '', quantity: '', unit: 'Bags', reason: '', files: [] }]})
  const removeDamageItem = (index) => setReportForm({...reportForm, damageItems: reportForm.damageItems.filter((_, i) => i !== index)})

  const addFinalWorkRow = () => setReportForm({...reportForm, finalWorkRows: [...reportForm.finalWorkRows, { contractorName: '', runningFeet: '', height: '', workDesc: '', customWorkDesc: '' }]})
  const removeFinalWorkRow = (index) => setReportForm({...reportForm, finalWorkRows: reportForm.finalWorkRows.filter((_, i) => i !== index)})

  const handleCombinedReportPreview = () => {
    if (!reportForm.siteName) {
      alert('કૃપા કરીને સાઇટ સિલેક્ટ કરો!')
      return
    }

    // Check Inward bills requirement
    for (let i = 0; i < reportForm.inwardSources.length; i++) {
      const src = reportForm.inwardSources[i]
      const hasData = src.items.some(it => it.quantity && parseFloat(it.quantity) > 0)
      if (hasData && src.files.length === 0) {
        alert(`કૃપા કરીને Inward Source #${i + 1} માટે બિલ અથવા ફોટો અટેચ કરો!`)
        return
      }
    }

    // Check Outward slips requirement
    for (let i = 0; i < reportForm.outwardDestinations.length; i++) {
      const dest = reportForm.outwardDestinations[i]
      const hasData = dest.items.some(it => it.quantity && parseFloat(it.quantity) > 0)
      if (hasData && dest.files.length === 0) {
        alert(`કૃપા કરીને Outward Destination #${i + 1} માટે સ્લિપ અથવા ફોટો અટેચ કરો!`)
        return
      }
    }

    // Check Damage photos requirement
    for (let i = 0; i < reportForm.damageItems.length; i++) {
      const dItem = reportForm.damageItems[i]
      const hasData = dItem.quantity && parseFloat(dItem.quantity) > 0
      if (hasData && dItem.files.length === 0) {
        alert(`કૃપા કરીને Material Damage Item #${i + 1} માટે ડેમેજ ફોટો અટેચ કરો!`)
        return
      }
    }

    setPreviewData({
      title: 'Complete Site Daily Report Preview',
      site: reportForm.siteName,
      date: reportForm.reportDate,
      details: reportForm,
      sitePhotosCount: siteProgressPhotos.length
    })
  }

  const confirmAndSave = async () => {
    setLoading(true)
    try {
      const supervisorEmail = user?.email || 'Supervisor'

      let sitePhotoUrls = []
      for (let file of siteProgressPhotos) {
        const fileExt = file.name.split('.').pop()
        const fileName = `site_prog_${Math.random()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('site-photos').upload(fileName, file)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('site-photos').getPublicUrl(fileName)
        sitePhotoUrls.push(publicUrl)
      }

      // Damage photos upload
      for (let i = 0; i < reportForm.damageItems.length; i++) {
        let dItem = reportForm.damageItems[i]
        let damageUrls = []
        for (let file of dItem.files) {
          const fileExt = file.name.split('.').pop()
          const fileName = `damage_${Math.random()}.${fileExt}`
          const { error: uploadError } = await supabase.storage.from('site-photos').upload(fileName, file)
          if (uploadError) throw uploadError
          const { data: { publicUrl } } = supabase.storage.from('site-photos').getPublicUrl(fileName)
          damageUrls.push(publicUrl)
        }
        reportForm.damageItems[i].bill_urls = damageUrls
      }

      const { error: repError } = await supabase.from('daily_reports').insert([{
        site_name: reportForm.siteName,
        contractor_details: reportForm.contractorRows,
        paling_work: reportForm.palingWorkRows,
        damage_items: reportForm.damageItems,
        final_work: reportForm.finalWorkRows,
        description: reportForm.description,
        photo_urls: sitePhotoUrls,
        report_date: reportForm.reportDate,
        user_id: supervisorEmail
      }])
      if (repError) throw repError

      // Inward Save
      for (const src of reportForm.inwardSources) {
        if (src.items.length > 0 && src.items[0].quantity) {
          let srcBillUrls = []
          for (let file of src.files) {
            const fileExt = file.name.split('.').pop()
            const fileName = `inward_${Math.random()}.${fileExt}`
            const { error: uploadError } = await supabase.storage.from('site-photos').upload(fileName, file)
            if (uploadError) throw uploadError
            const { data: { publicUrl } } = supabase.storage.from('site-photos').getPublicUrl(fileName)
            srcBillUrls.push(publicUrl)
          }

          const actualSourceName = src.sourceName === 'Other' ? src.customSourceName : src.sourceName
          const formattedItems = src.items.map(it => ({
            ...it,
            materialName: it.materialName === 'Other' ? it.customMaterialName : it.materialName
          }))

          await supabase.from('material_movements').insert([{
            site_name: reportForm.siteName,
            movement_type: 'inward',
            items: formattedItems,
            source_destination: actualSourceName,
            description: reportForm.description,
            bill_urls: srcBillUrls,
            entry_date: reportForm.reportDate,
            created_by: supervisorEmail
          }])
        }
      }

      // Outward Save
      for (const dest of reportForm.outwardDestinations) {
        if (dest.items.length > 0 && dest.items[0].quantity) {
          let destBillUrls = []
          for (let file of dest.files) {
            const fileExt = file.name.split('.').pop()
            const fileName = `outward_${Math.random()}.${fileExt}`
            const { error: uploadError } = await supabase.storage.from('site-photos').upload(fileName, file)
            if (uploadError) throw uploadError
            const { data: { publicUrl } } = supabase.storage.from('site-photos').getPublicUrl(fileName)
            destBillUrls.push(publicUrl)
          }

          const actualDestName = dest.destName === 'Other' ? dest.customDestName : dest.destName
          const formattedOutItems = dest.items.map(it => ({
            ...it,
            materialName: it.materialName === 'Other' ? it.customMaterialName : it.materialName
          }))

          await supabase.from('material_movements').insert([{
            site_name: reportForm.siteName,
            movement_type: 'outward',
            items: formattedOutItems,
            source_destination: actualDestName,
            description: reportForm.description,
            bill_urls: destBillUrls,
            entry_date: reportForm.reportDate,
            created_by: supervisorEmail
          }])
        }
      }

      await loadReports()
      setShowReportForm(false)
      setReportForm({
        siteName: '',
        reportDate: new Date().toISOString().split('T')[0],
        inwardSources: [{ sourceName: '', customSourceName: '', items: [{ materialName: '', customMaterialName: '', quantity: '', unit: 'Bags' }], files: [] }],
        palingWorkRows: [{ contractorName: '', runningFeet: '', height: '', description: '' }],
        contractorRows: [{ contractorName: '', labourCount: '', labourNotes: '', materials: [{ material: '', customMaterialName: '', quantity: '', unit: 'NOS' }] }],
        finalWorkRows: [{ contractorName: '', runningFeet: '', height: '', workDesc: '', customWorkDesc: '' }],
        damageItems: [],
        outwardDestinations: [],
        description: ''
      })
      setSiteProgressPhotos([])
      setPreviewData(null)
      alert('Complete Site Report saved successfully!')
    } catch (err) {
      alert('Failed to save: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredReports = reports.filter(r => {
    const matchSite = filterSite === 'all' || r.site_name === filterSite
    const matchDate = !filterDate || r.report_date === filterDate
    return matchSite && matchDate
  })

  return (
    <div style={{ padding: '8px', fontFamily: 'Inter, system-ui, sans-serif', color: '#1e293b', maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
      
      {/* Header & Navigation */}
      <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '12px', boxSizing: 'border-box' }}>
        <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '10px', fontWeight: '700', backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '20px' }}>T&J Infra Portal</span>
            <h1 style={{ fontSize: '15px', fontWeight: 'bold', margin: '4px 0 0 0', color: '#0f172a' }}>Site Operations & Field Terminal</h1>
          </div>
          <span style={{ fontSize: '11px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>👤 {user?.email || 'Supervisor'}</span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          <button onClick={() => setActiveTab('site_report')} style={{ padding: '8px 4px', borderRadius: '6px', border: 'none', background: activeTab === 'site_report' ? '#2563eb' : '#f1f5f9', color: activeTab === 'site_report' ? '#fff' : '#475569', fontWeight: '600', fontSize: '10px', textAlign: 'center' }}>📋 Reports</button>
          <button onClick={() => setActiveTab('attendance')} style={{ padding: '8px 4px', borderRadius: '6px', border: 'none', background: activeTab === 'attendance' ? '#2563eb' : '#f1f5f9', color: activeTab === 'attendance' ? '#fff' : '#475569', fontWeight: '600', fontSize: '10px', textAlign: 'center' }}>🕒 Attendance</button>
          <button onClick={() => setActiveTab('transactions')} style={{ padding: '8px 4px', borderRadius: '6px', border: '1px solid #e2e8f0', background: activeTab === 'transactions' ? '#2563eb' : '#f1f5f9', color: activeTab === 'transactions' ? '#fff' : '#475569', fontWeight: '600', fontSize: '10px', textAlign: 'center' }}>💰 Expenses</button>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '10px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} color="#e11d48" />
          <span style={{ fontSize: '12px', color: '#9f1239', fontWeight: '500' }}>{error}</span>
        </div>
      )}

      {/* REPORTS TAB */}
      {activeTab === 'site_report' && (
        <div>
          <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Filter size={14} color="#64748b" />
            <select value={filterSite} onChange={(e) => setFilterSite(e.target.value)} style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff' }}>
              <option value="all">🌐 All Sites</option>
              {sites.map(s => <option key={s.id || s.site_name} value={s.site_name}>{s.site_name}</option>)}
            </select>
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px' }} />
            {filterDate && <button onClick={() => setFilterDate('')} style={{ fontSize: '10px', background: '#fee2e2', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}>Clear</button>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0 }}>Site Daily Reports</h2>
            <button onClick={() => setShowReportForm(!showReportForm)} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
              <Plus size={14} /> New Site Report
            </button>
          </div>

          {showReportForm && (
            <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px', boxSizing: 'border-box', width: '100%', overflowX: 'hidden' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', color: '#1d4ed8' }}>📋 Complete Site Daily Report Form</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Select Site *</label>
                  <select value={reportForm.siteName} onChange={(e) => setReportForm({...reportForm, siteName: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '12px', boxSizing: 'border-box', fontWeight: 'bold' }}>
                    <option value="">-- Please Select Site First --</option>
                    {sites.map(s => <option key={s.id || s.site_name} value={s.site_name}>{s.site_name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Report Date *</label>
                  <input type="date" value={reportForm.reportDate} onChange={(e) => setReportForm({...reportForm, reportDate: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                </div>
              </div>

              {!reportForm.siteName ? (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', textAlign: 'center', color: '#991b1b', fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>
                  ⚠️ Please select a site first to add report details and materials.
                </div>
              ) : (
                <>
                  {/* 1. MATERIAL INWARD */}
                  <div style={{ backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '12px', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#166534' }}>1. Material Inward (મટીરિયલ આવ્યું)</span>
                      <button type="button" onClick={addInwardSource} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>+ Add Source</button>
                    </div>

                    {reportForm.inwardSources.map((src, sIndex) => (
                      <div key={sIndex} style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '10px', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#166534' }}>Source #{sIndex + 1}</span>
                          {reportForm.inwardSources.length > 1 && (
                            <button type="button" onClick={() => removeInwardSource(sIndex)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '2px 6px', borderRadius: '4px', fontSize: '9px' }}><Trash2 size={10} /></button>
                          )}
                        </div>

                        <select value={src.sourceName} onChange={(e) => {
                          const updated = [...reportForm.inwardSources]
                          updated[sIndex].sourceName = e.target.value
                          setReportForm({...reportForm, inwardSources: updated})
                        }} style={{ width: '100%', padding: '6px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                          <option value="">-- Select Vendor / Party for this Site --</option>
                          {currentSiteVendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                          <option value="Other">Other (Manual)</option>
                        </select>

                        {src.sourceName === 'Other' && (
                          <input type="text" placeholder="Enter custom vendor/party name..." value={src.customSourceName} onChange={(e) => {
                            const updated = [...reportForm.inwardSources]
                            updated[sIndex].customSourceName = e.target.value
                            setReportForm({...reportForm, inwardSources: updated})
                          }} style={{ width: '100%', padding: '6px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #16a34a', fontSize: '11px', boxSizing: 'border-box' }} />
                        )}

                        {src.items.map((itRow, mIndex) => (
                          <div key={mIndex} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '6px', backgroundColor: '#f8fafc', padding: '6px', borderRadius: '6px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: itRow.materialName === 'Other' ? '1fr 1fr 1fr auto' : '2fr 1fr 1fr auto', gap: '4px', alignItems: 'center', boxSizing: 'border-box' }}>
                              <select value={itRow.materialName} onChange={(e) => {
                                const updated = [...reportForm.inwardSources]
                                updated[sIndex].items[mIndex].materialName = e.target.value
                                setReportForm({...reportForm, inwardSources: updated})
                              }} style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '10px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                                <option value="">-- Select Material --</option>
                                {currentSiteMaterials.map(mat => <option key={mat.id} value={mat.name}>{mat.name}</option>)}
                                <option value="Other">Other (Manual)</option>
                              </select>

                              {itRow.materialName === 'Other' && (
                                <input type="text" placeholder="Enter custom product name..." value={itRow.customMaterialName} onChange={(e) => {
                                  const updated = [...reportForm.inwardSources]
                                  updated[sIndex].items[mIndex].customMaterialName = e.target.value
                                  setReportForm({...reportForm, inwardSources: updated})
                                }} style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #16a34a', fontSize: '10px', boxSizing: 'border-box' }} />
                              )}

                              <input type="number" placeholder="Qty" value={itRow.quantity} onChange={(e) => {
                                const updated = [...reportForm.inwardSources]
                                updated[sIndex].items[mIndex].quantity = e.target.value
                                setReportForm({...reportForm, inwardSources: updated})
                              }} style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '10px', boxSizing: 'border-box' }} />

                              <select value={itRow.unit} onChange={(e) => {
                                const updated = [...reportForm.inwardSources]
                                updated[sIndex].items[mIndex].unit = e.target.value
                                setReportForm({...reportForm, inwardSources: updated})
                              }} style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '10px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                                {UOM_OPTIONS.map(uom => <option key={uom} value={uom}>{uom}</option>)}
                              </select>

                              {src.items.length > 1 && (
                                <button type="button" onClick={() => removeMaterialFromInward(sIndex, mIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}><Trash2 size={12} /></button>
                              )}
                            </div>
                          </div>
                        ))}
                        <button type="button" onClick={() => addMaterialToInward(sIndex)} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '2px 6px', borderRadius: '3px', fontSize: '9px', cursor: 'pointer', marginTop: '4px' }}>+ Add Item</button>

                        <div style={{ marginTop: '8px', backgroundColor: '#f9fafb', padding: '6px', borderRadius: '6px', border: '1px dashed #16a34a', boxSizing: 'border-box' }}>
                          <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', color: '#166534' }}>📎 Upload Bill / PDF</label>
                          <input type="file" multiple accept="image/*,application/pdf" onChange={(e) => {
                            if (e.target.files.length > 0) {
                              const updated = [...reportForm.inwardSources]
                              updated[sIndex].files = [...updated[sIndex].files, ...Array.from(e.target.files)]
                              setReportForm({...reportForm, inwardSources: updated})
                            }
                          }} style={{ fontSize: '10px', width: '100%', boxSizing: 'border-box' }} />
                          {src.files.length > 0 && (
                            <div style={{ marginTop: '4px', fontSize: '10px', color: '#166534' }}>
                              Selected Files: {src.files.map((f, fi) => (
                                <span key={fi} style={{ display: 'inline-block', background: '#e6f4ea', padding: '2px 4px', margin: '2px', borderRadius: '4px' }}>
                                  {f.name} <button type="button" onClick={() => {
                                    const updated = [...reportForm.inwardSources]
                                    updated[sIndex].files = updated[sIndex].files.filter((_, idx) => idx !== fi)
                                    setReportForm({...reportForm, inwardSources: updated})
                                  }} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>x</button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 2. PALING WORK (પેલિંગ વર્ક) */}
                  <div style={{ backgroundColor: '#fdf4ff', padding: '10px', borderRadius: '8px', border: '1px solid #f5d0fe', marginBottom: '12px', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#86198f' }}>2. Paling Work (પેલિંગ વર્ક)</span>
                      <button type="button" onClick={addPalingWorkRow} style={{ backgroundColor: '#a855f7', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>+ Add Paling Work</button>
                    </div>

                    {reportForm.palingWorkRows.map((pRow, pIndex) => (
                      <div key={pIndex} style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #f5d0fe', marginBottom: '8px', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#86198f' }}>Paling Entry #{pIndex + 1}</span>
                          {reportForm.palingWorkRows.length > 1 && (
                            <button type="button" onClick={() => removePalingWorkRow(pIndex)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '2px 6px', borderRadius: '4px', fontSize: '9px' }}><Trash2 size={10} /></button>
                          )}
                        </div>

                        <select value={pRow.contractorName} onChange={(e) => {
                          const updated = [...reportForm.palingWorkRows]
                          updated[pIndex].contractorName = e.target.value
                          setReportForm({...reportForm, palingWorkRows: updated})
                        }} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', width: '100%', fontWeight: 'bold', marginBottom: '6px', boxSizing: 'border-box' }}>
                          <option value="">-- Select Contractor for this Site --</option>
                          {currentSiteContractors.map(con => <option key={con.id} value={con.name}>{con.name}</option>)}
                        </select>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px', boxSizing: 'border-box' }}>
                          <input type="number" placeholder="Qty" value={pRow.Qty} onChange={(e) => {
                            const updated = [...reportForm.palingWorkRows]
                            updated[pIndex].Qty = e.target.value
                            setReportForm({...reportForm, palingWorkRows: updated})
                          }} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
                          <div style={{ backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', textAlign: 'center', fontWeight: 'bold', color: '#475569' }}>
                            NOS
                          </div>
                        </div>

                        <input type="text" placeholder="Description / Remarks" value={pRow.description} onChange={(e) => {
                          const updated = [...reportForm.palingWorkRows]
                          updated[pIndex].description = e.target.value
                          setReportForm({...reportForm, palingWorkRows: updated})
                        }} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
                      </div>
                    ))}
                  </div>

                  {/* 3. MATERIAL USAGE (Contractor Wise Labour & Material Usage) */}
                  <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#1e40af' }}>3. Material Usage (કોન્ટ્રાક્ટર વાઇઝ વપરાશ)</span>
                      <button type="button" onClick={addContractorRow} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>+ Add Contractor</button>
                    </div>

                    {reportForm.contractorRows.map((cRow, cIndex) => (
                      <div key={cIndex} style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '10px', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569' }}>Contractor #{cIndex + 1}</span>
                          {reportForm.contractorRows.length > 1 && (
                            <button type="button" onClick={() => removeContractorRow(cIndex)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '2px 6px', borderRadius: '4px', fontSize: '9px' }}><Trash2 size={10} /></button>
                          )}
                        </div>

                        <select value={cRow.contractorName} onChange={(e) => {
                          const updated = [...reportForm.contractorRows]
                          updated[cIndex].contractorName = e.target.value
                          setReportForm({...reportForm, contractorRows: updated})
                        }} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', width: '100%', fontWeight: 'bold', marginBottom: '6px', boxSizing: 'border-box' }}>
                          <option value="">-- Select Contractor for this Site --</option>
                          {currentSiteContractors.map(con => <option key={con.id} value={con.name}>{con.name}</option>)}
                        </select>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px', boxSizing: 'border-box' }}>
                          <input type="number" placeholder="Labour Count" value={cRow.labourCount} onChange={(e) => {
                            const updated = [...reportForm.contractorRows]
                            updated[cIndex].labourCount = e.target.value
                            setReportForm({...reportForm, contractorRows: updated})
                          }} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
                          <input type="text" placeholder="Labour Notes" value={cRow.labourNotes} onChange={(e) => {
                            const updated = [...reportForm.contractorRows]
                            updated[cIndex].labourNotes = e.target.value
                            setReportForm({...reportForm, contractorRows: updated})
                          }} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
                        </div>

                        <div style={{ backgroundColor: '#f1f5f9', padding: '8px', borderRadius: '6px', boxSizing: 'border-box' }}>
                          <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Materials Used</span>
                          {cRow.materials.map((mRow, mIndex) => (
                            <div key={mIndex} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '6px', backgroundColor: '#fff', padding: '6px', borderRadius: '6px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: mRow.material === 'Other' ? '1fr 1fr 1fr auto' : '2fr 1fr 1fr auto', gap: '4px', alignItems: 'center', boxSizing: 'border-box' }}>
                                <select value={mRow.material} onChange={(e) => {
                                  const updated = [...reportForm.contractorRows]
                                  updated[cIndex].materials[mIndex].material = e.target.value
                                  setReportForm({...reportForm, contractorRows: updated})
                                }} style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '10px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                                  <option value="">-- Select Material --</option>
                                  {currentSiteMaterials.map(mat => <option key={mat.id} value={mat.name}>{mat.name}</option>)}
                                  <option value="Other">Other (Manual)</option>
                                </select>

                                {mRow.material === 'Other' && (
                                  <input type="text" placeholder="Enter custom product name..." value={mRow.customMaterialName} onChange={(e) => {
                                    const updated = [...reportForm.contractorRows]
                                    updated[cIndex].materials[mIndex].customMaterialName = e.target.value
                                    setReportForm({...reportForm, contractorRows: updated})
                                  }} style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #059669', fontSize: '10px', boxSizing: 'border-box' }} />
                                )}

                                <input type="number" placeholder="Qty" value={mRow.quantity} onChange={(e) => {
                                  const updated = [...reportForm.contractorRows]
                                  updated[cIndex].materials[mIndex].quantity = e.target.value
                                  setReportForm({...reportForm, contractorRows: updated})
                                }} style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '10px', boxSizing: 'border-box' }} />

                                <select value={mRow.unit} onChange={(e) => {
                                  const updated = [...reportForm.contractorRows]
                                  updated[cIndex].materials[mIndex].unit = e.target.value
                                  setReportForm({...reportForm, contractorRows: updated})
                                }} style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '10px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                                  {UOM_OPTIONS.map(uom => <option key={uom} value={uom}>{uom}</option>)}
                                </select>

                                {cRow.materials.length > 1 && (
                                  <button type="button" onClick={() => removeMaterialFromContractor(cIndex, mIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}><Trash2 size={12} /></button>
                                )}
                              </div>
                            </div>
                          ))}
                          <button type="button" onClick={() => addMaterialToContractor(cIndex)} style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '2px 6px', borderRadius: '3px', fontSize: '9px', cursor: 'pointer', marginTop: '4px' }}>+ Add Material</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 4. FINAL WORK (ફાઇનલ વર્ક) */}
                  <div style={{ backgroundColor: '#eff6ff', padding: '10px', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: '12px', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#1e40af' }}>4. Final Work (ફાઇનલ વર્ક)</span>
                      <button type="button" onClick={addFinalWorkRow} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>+ Add Work</button>
                    </div>

                    {reportForm.finalWorkRows.map((fRow, fIndex) => (
                      <div key={fIndex} style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: '8px', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#1e40af' }}>Work Entry #{fIndex + 1}</span>
                          {reportForm.finalWorkRows.length > 1 && (
                            <button type="button" onClick={() => removeFinalWorkRow(fIndex)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '2px 6px', borderRadius: '4px', fontSize: '9px' }}><Trash2 size={10} /></button>
                          )}
                        </div>

                        <select value={fRow.contractorName} onChange={(e) => {
                          const updated = [...reportForm.finalWorkRows]
                          updated[fIndex].contractorName = e.target.value
                          setReportForm({...reportForm, finalWorkRows: updated})
                        }} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', width: '100%', fontWeight: 'bold', marginBottom: '6px', boxSizing: 'border-box' }}>
                          <option value="">-- Select Contractor for this Site --</option>
                          {currentSiteContractors.map(con => <option key={con.id} value={con.name}>{con.name}</option>)}
                        </select>

                        <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px', color: '#475569' }}>Work Description</label>
                        <select value={fRow.workDesc} onChange={(e) => {
                          const updated = [...reportForm.finalWorkRows]
                          updated[fIndex].workDesc = e.target.value
                          setReportForm({...reportForm, finalWorkRows: updated})
                        }} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', width: '100%', marginBottom: '6px', boxSizing: 'border-box' }}>
                          <option value="">-- Select Work Description --</option>
                          {currentSiteWorkDescriptions.map(desc => <option key={desc.id} value={desc.name}>{desc.name}</option>)}
                          <option value="Other">Other (Manual)</option>
                        </select>

                        {fRow.workDesc === 'Other' && (
                          <input type="text" placeholder="Enter custom work description..." value={fRow.customWorkDesc} onChange={(e) => {
                            const updated = [...reportForm.finalWorkRows]
                            updated[fIndex].customWorkDesc = e.target.value
                            setReportForm({...reportForm, finalWorkRows: updated})
                          }} style={{ width: '100%', padding: '6px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #2563eb', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }} />
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', boxSizing: 'border-box' }}>
                          <input type="number" placeholder="Running Feet" value={fRow.runningFeet} onChange={(e) => {
                            const updated = [...reportForm.finalWorkRows]
                            updated[fIndex].runningFeet = e.target.value
                            setReportForm({...reportForm, finalWorkRows: updated})
                          }} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
                          <input type="number" placeholder="Height" value={fRow.height} onChange={(e) => {
                            const updated = [...reportForm.finalWorkRows]
                            updated[fIndex].height = e.target.value
                            setReportForm({...reportForm, finalWorkRows: updated})
                          }} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 5. MATERIAL DAMAGE (ડેમેજ મટીરિયલ - Hidden initially until clicked) */}
                  <div style={{ backgroundColor: '#fef2f2', padding: '10px', borderRadius: '8px', border: '1px solid #fecaca', marginBottom: '12px', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: reportForm.damageItems.length > 0 ? '8px' : '0' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#991b1b' }}>5. Material Damage (મટીરિયલ ડેમેજ)</span>
                      <button type="button" onClick={addDamageItem} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>+ Add Damage</button>
                    </div>

                    {reportForm.damageItems.map((dItem, dIndex) => (
                      <div key={dIndex} style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #fecaca', marginBottom: '8px', boxSizing: 'border-box', marginTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#991b1b' }}>Damage Item #{dIndex + 1}</span>
                          <button type="button" onClick={() => removeDamageItem(dIndex)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '2px 6px', borderRadius: '4px', fontSize: '9px' }}><Trash2 size={10} /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '6px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: dItem.materialName === 'Other' ? '1fr 1fr 1fr' : '2fr 1fr 1fr', gap: '4px', boxSizing: 'border-box' }}>
                            <select value={dItem.materialName} onChange={(e) => {
                              const updated = [...reportForm.damageItems]
                              updated[dIndex].materialName = e.target.value
                              setReportForm({...reportForm, damageItems: updated})
                            }} style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '10px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                              <option value="">-- Select Material --</option>
                              {currentSiteMaterials.map(mat => <option key={mat.id} value={mat.name}>{mat.name}</option>)}
                              <option value="Other">Other (Manual)</option>
                            </select>

                            {dItem.materialName === 'Other' && (
                              <input type="text" placeholder="Enter custom product name..." value={dItem.customMaterialName} onChange={(e) => {
                                const updated = [...reportForm.damageItems]
                                updated[dIndex].customMaterialName = e.target.value
                                setReportForm({...reportForm, damageItems: updated})
                              }} style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #dc2626', fontSize: '10px', boxSizing: 'border-box' }} />
                            )}

                            <input type="number" placeholder="Qty" value={dItem.quantity} onChange={(e) => {
                              const updated = [...reportForm.damageItems]
                              updated[dIndex].quantity = e.target.value
                              setReportForm({...reportForm, damageItems: updated})
                            }} style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '10px', boxSizing: 'border-box' }} />

                            <select value={dItem.unit} onChange={(e) => {
                              const updated = [...reportForm.damageItems]
                              updated[dIndex].unit = e.target.value
                              setReportForm({...reportForm, damageItems: updated})
                            }} style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '10px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                              {UOM_OPTIONS.map(uom => <option key={uom} value={uom}>{uom}</option>)}
                            </select>
                          </div>
                        </div>

                        <input type="text" placeholder="Reason / Remarks (કેમ ડેમેજ થયું?)" value={dItem.reason} onChange={(e) => {
                          const updated = [...reportForm.damageItems]
                          updated[dIndex].reason = e.target.value
                          setReportForm({...reportForm, damageItems: updated})
                        }} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box', marginBottom: '6px' }} />

                        {/* Damage Photo Upload */}
                        <div style={{ backgroundColor: '#fff', padding: '6px', borderRadius: '6px', border: '1px dashed #dc2626', boxSizing: 'border-box' }}>
                          <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', color: '#991b1b' }}>📎 Upload Damage Photo</label>
                          <input type="file" multiple accept="image/*" onChange={(e) => {
                            if (e.target.files.length > 0) {
                              const updated = [...reportForm.damageItems]
                              updated[dIndex].files = [...updated[dIndex].files, ...Array.from(e.target.files)]
                              setReportForm({...reportForm, damageItems: updated})
                            }
                          }} style={{ fontSize: '10px', width: '100%', boxSizing: 'border-box' }} />
                          {dItem.files.length > 0 && (
                            <div style={{ marginTop: '4px', fontSize: '10px', color: '#991b1b' }}>
                              Selected Files: {dItem.files.map((f, fi) => (
                                <span key={fi} style={{ display: 'inline-block', background: '#fde8e8', padding: '2px 4px', margin: '2px', borderRadius: '4px' }}>
                                  {f.name} <button type="button" onClick={() => {
                                    const updated = [...reportForm.damageItems]
                                    updated[dIndex].files = updated[dIndex].files.filter((_, idx) => idx !== fi)
                                    setReportForm({...reportForm, damageItems: updated})
                                  }} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>x</button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 6. MATERIAL OUTWARD (મટીરિયલ આઉટવર્ડ - Hidden initially until clicked) */}
                  <div style={{ backgroundColor: '#fff7ed', padding: '10px', borderRadius: '8px', border: '1px solid #fed7aa', marginBottom: '12px', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: reportForm.outwardDestinations.length > 0 ? '8px' : '0' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#9a3412' }}>6. Material Outward (મટીરિયલ ગયું)</span>
                      <button type="button" onClick={addOutwardDest} style={{ backgroundColor: '#ea580c', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>+ Add Destination</button>
                    </div>

                    {reportForm.outwardDestinations.map((dest, dIndex) => (
                      <div key={dIndex} style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #fed7aa', marginBottom: '10px', boxSizing: 'border-box', marginTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#9a3412' }}>Destination #{dIndex + 1}</span>
                          <button type="button" onClick={() => removeOutwardDest(dIndex)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '2px 6px', borderRadius: '4px', fontSize: '9px' }}><Trash2 size={10} /></button>
                        </div>

                        <select value={dest.destName} onChange={(e) => {
                          const updated = [...reportForm.outwardDestinations]
                          updated[dIndex].destName = e.target.value
                          setReportForm({...reportForm, outwardDestinations: updated})
                        }} style={{ width: '100%', padding: '6px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                          <option value="">-- Select Outward Party / Client for this Site --</option>
                          {currentSiteOutwardParties.map(op => <option key={op.id} value={op.name}>{op.name}</option>)}
                          <option value="Other">Other (Manual)</option>
                        </select>

                        {dest.destName === 'Other' && (
                          <input type="text" placeholder="Enter custom destination/party name..." value={dest.customDestName} onChange={(e) => {
                            const updated = [...reportForm.outwardDestinations]
                            updated[dIndex].customDestName = e.target.value
                            setReportForm({...reportForm, outwardDestinations: updated})
                          }} style={{ width: '100%', padding: '6px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #ea580c', fontSize: '11px', boxSizing: 'border-box' }} />
                        )}

                        {dest.items.map((itRow, mIndex) => (
                          <div key={mIndex} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '6px', backgroundColor: '#f8fafc', padding: '6px', borderRadius: '6px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: itRow.materialName === 'Other' ? '1fr 1fr 1fr auto' : '2fr 1fr 1fr auto', gap: '4px', alignItems: 'center', boxSizing: 'border-box' }}>
                              <select value={itRow.materialName} onChange={(e) => {
                                const updated = [...reportForm.outwardDestinations]
                                updated[dIndex].items[mIndex].materialName = e.target.value
                                setReportForm({...reportForm, outwardDestinations: updated})
                              }} style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '10px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                                <option value="">-- Select Material --</option>
                                {currentSiteMaterials.map(mat => <option key={mat.id} value={mat.name}>{mat.name}</option>)}
                                <option value="Other">Other (Manual)</option>
                              </select>

                              {itRow.materialName === 'Other' && (
                                <input type="text" placeholder="Enter custom product name..." value={itRow.customMaterialName} onChange={(e) => {
                                  const updated = [...reportForm.outwardDestinations]
                                  updated[dIndex].items[mIndex].customMaterialName = e.target.value
                                  setReportForm({...reportForm, outwardDestinations: updated})
                                }} style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #ea580c', fontSize: '10px', boxSizing: 'border-box' }} />
                              )}

                              <input type="number" placeholder="Qty" value={itRow.quantity} onChange={(e) => {
                                const updated = [...reportForm.outwardDestinations]
                                updated[dIndex].items[mIndex].quantity = e.target.value
                                setReportForm({...reportForm, outwardDestinations: updated})
                              }} style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '10px', boxSizing: 'border-box' }} />

                              <select value={itRow.unit} onChange={(e) => {
                                const updated = [...reportForm.outwardDestinations]
                                updated[dIndex].items[mIndex].unit = e.target.value
                                setReportForm({...reportForm, outwardDestinations: updated})
                              }} style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '10px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                                {UOM_OPTIONS.map(uom => <option key={uom} value={uom}>{uom}</option>)}
                              </select>

                              {dest.items.length > 1 && (
                                <button type="button" onClick={() => removeMaterialFromOutward(dIndex, mIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}><Trash2 size={12} /></button>
                              )}
                            </div>
                          </div>
                        ))}
                        <button type="button" onClick={() => addMaterialToOutward(dIndex)} style={{ backgroundColor: '#ea580c', color: '#fff', border: 'none', padding: '2px 6px', borderRadius: '3px', fontSize: '9px', cursor: 'pointer', marginTop: '4px' }}>+ Add Item</button>

                        <div style={{ marginTop: '8px', backgroundColor: '#f9fafb', padding: '6px', borderRadius: '6px', border: '1px dashed #ea580c', boxSizing: 'border-box' }}>
                          <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', color: '#9a3412' }}>📎 Upload Slip / PDF</label>
                          <input type="file" multiple accept="image/*,application/pdf" onChange={(e) => {
                            if (e.target.files.length > 0) {
                              const updated = [...reportForm.outwardDestinations]
                              updated[dIndex].files = [...updated[dIndex].files, ...Array.from(e.target.files)]
                              setReportForm({...reportForm, outwardDestinations: updated})
                            }
                          }} style={{ fontSize: '10px', width: '100%', boxSizing: 'border-box' }} />
                          {dest.files.length > 0 && (
                            <div style={{ marginTop: '4px', fontSize: '10px', color: '#9a3412' }}>
                              Selected Files: {dest.files.map((f, fi) => (
                                <span key={fi} style={{ display: 'inline-block', background: '#fae1db', padding: '2px 4px', margin: '2px', borderRadius: '4px' }}>
                                  {f.name} <button type="button" onClick={() => {
                                    const updated = [...reportForm.outwardDestinations]
                                    updated[dIndex].files = updated[dIndex].files.filter((_, idx) => idx !== fi)
                                    setReportForm({...reportForm, outwardDestinations: updated})
                                  }} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>x</button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Extra Description Box */}
                  <div style={{ marginBottom: '12px', boxSizing: 'border-box' }}>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Additional Description / Remarks</label>
                    <textarea rows="2" value={reportForm.description} onChange={(e) => setReportForm({...reportForm, description: e.target.value})} placeholder="Any extra notes..." style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>

                  {/* Site Progress Photos (Multiple with Remove Option) */}
                  <div style={{ marginBottom: '12px', backgroundColor: '#f1f5f9', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', color: '#0f172a' }}>📸 Site Progress Photos (Multiple)</label>
                    <input type="file" multiple accept="image/*" capture="environment" onChange={(e) => {
                      if (e.target.files.length > 0) setSiteProgressPhotos([...siteProgressPhotos, ...Array.from(e.target.files)])
                    }} style={{ fontSize: '11px', marginBottom: '6px', width: '100%', boxSizing: 'border-box' }} />
                    {siteProgressPhotos.length > 0 && (
                      <div style={{ marginTop: '6px', fontSize: '11px', color: '#0f172a' }}>
                        Selected Progress Photos:
                        {siteProgressPhotos.map((file, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', background: '#fff', padding: '4px 8px', margin: '4px 0', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                            <span>{file.name}</span>
                            <button type="button" onClick={() => setSiteProgressPhotos(siteProgressPhotos.filter((_, i) => i !== idx))} style={{ color: 'red', border: 'none', background: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Remove</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', boxSizing: 'border-box' }}>
                    <button type="button" onClick={handleCombinedReportPreview} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', flex: 1, fontSize: '12px' }}>Review & Submit Report</button>
                    <button type="button" onClick={() => setShowReportForm(false)} style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', flex: 1, fontSize: '12px' }}>Cancel</button>
                  </div>
                </>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
            {filteredReports.map(r => (
              <div key={r.id} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '13px' }}>{r.site_name}</span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>{r.report_date}</span>
                </div>
                {r.description && <p style={{ fontSize: '11px', color: '#475569', margin: '4px 0' }}>📝 {r.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <div style={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px', padding: '14px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '12px' }}>GPS Attendance</h2>
          <select value={attendanceSite} onChange={(e) => setAttendanceSite(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', fontSize: '12px', marginBottom: '10px' }}>
            <option value="">-- Select Site --</option>
            {sites.map(s => <option key={s.id || s.site_name} value={s.site_name}>{s.site_name}</option>)}
          </select>
          <button onClick={() => alert('Attendance Punch Preview')} style={{ backgroundColor: punchStatus ? '#dc2626' : '#059669', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: '600', fontSize: '12px', width: '100%', cursor: 'pointer' }}>
            {punchStatus ? 'Punch Out' : 'Punch In with GPS'}
          </button>
        </div>
      )}

      {/* EXPENSES / TRANSACTIONS TAB */}
      {activeTab === 'transactions' && (
        <div>
          <button onClick={() => setShowTxForm(!showTxForm)} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: '600', fontSize: '12px', marginBottom: '12px' }}>+ Add Tx</button>
        </div>
      )}

      {/* FULL PREVIEW / CONFIRMATION MODAL */}
      {previewData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: '0', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', boxSizing: 'border-box' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', width: '100%', maxWidth: '400px', maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 10px 0', color: '#0f172a' }}>🔍 Full Review Before Save</h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px 0' }}>કૃપા કરીને બધી વિગતો ચકાસી લો:</p>
            
            <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', fontSize: '12px', marginBottom: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box' }}>
              <div><strong>Site:</strong> {previewData.site}</div>
              <div><strong>Date:</strong> {previewData.date}</div>
              {previewData.details?.description && <div><strong>Description:</strong> {previewData.details.description}</div>}
              
              {/* Inward Sources Preview */}
              {previewData.details?.inwardSources && previewData.details.inwardSources.length > 0 && previewData.details.inwardSources[0].items[0].quantity && (
                <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '6px', marginTop: '4px' }}>
                  <strong style={{ color: '#166534', display: 'block', marginBottom: '2px' }}>📥 Material Inward:</strong>
                  {previewData.details.inwardSources.map((src, si) => (
                    <div key={si} style={{ marginLeft: '6px', marginBottom: '4px' }}>
                      • <strong>{src.sourceName === 'Other' ? src.customSourceName : src.sourceName}</strong>:
                      {src.items.map((it, ii) => {
                        const matDisplay = it.materialName === 'Other' ? it.customMaterialName : it.materialName;
                        return (
                          <div key={ii} style={{ marginLeft: '12px', color: '#334155' }}>
                            - {matDisplay || 'N/A'}: {it.quantity || 0} {it.unit}
                          </div>
                        );
                      })}
                      {src.files.length > 0 && (
                        <div style={{ marginLeft: '12px', fontSize: '11px', color: '#166534' }}>
                          📎 Files: {src.files.map(f => f.name).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Paling Work Preview */}
              {previewData.details?.palingWorkRows && previewData.details.palingWorkRows.length > 0 && previewData.details.palingWorkRows[0].contractorName && (
                <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '6px', marginTop: '4px' }}>
                  <strong style={{ color: '#86198f', display: 'block', marginBottom: '2px' }}>🪵 Paling Work:</strong>
                  {previewData.details.palingWorkRows.map((p, pi) => (
                    <div key={pi} style={{ marginLeft: '6px', marginBottom: '4px', color: '#334155' }}>
                      • <strong>{p.contractorName}</strong> (Running Feet: {p.runningFeet || 0}, Height: {p.height || 0}) - {p.description || ''}
                    </div>
                  ))}
                </div>
              )}

              {/* Contractor Work Preview (Material Usage) */}
              {previewData.details?.contractorRows && previewData.details.contractorRows.length > 0 && previewData.details.contractorRows[0].contractorName && (
                <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '6px', marginTop: '4px' }}>
                  <strong style={{ color: '#1e40af', display: 'block', marginBottom: '2px' }}>👷 Material Usage (Contractor):</strong>
                  {previewData.details.contractorRows.map((c, ci) => (
                    <div key={ci} style={{ marginLeft: '6px', marginBottom: '4px' }}>
                      • <strong>{c.contractorName || 'Contractor'}</strong> (Labour: {c.labourCount || 0}):
                      {c.materials?.map((m, mi) => {
                        const matDisplay = m.material === 'Other' ? m.customMaterialName : m.material;
                        return (
                          <div key={mi} style={{ marginLeft: '12px', color: '#334155' }}>
                            - {matDisplay || 'N/A'}: {m.quantity || 0} {m.unit}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

              {/* Final Work Preview */}
              {previewData.details?.finalWorkRows && previewData.details.finalWorkRows.length > 0 && previewData.details.finalWorkRows[0].contractorName && (
                <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '6px', marginTop: '4px' }}>
                  <strong style={{ color: '#0284c7', display: 'block', marginBottom: '2px' }}>🏗️ Final Work:</strong>
                  {previewData.details.finalWorkRows.map((f, fi) => {
                    const workDisplay = f.workDesc === 'Other' ? f.customWorkDesc : f.workDesc;
                    return (
                      <div key={fi} style={{ marginLeft: '6px', marginBottom: '4px', color: '#334155' }}>
                        • <strong>{f.contractorName}</strong> - {workDisplay || 'N/A'} (Running Feet: {f.runningFeet || 0}, Height: {f.height || 0})
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Material Damage Preview */}
              {previewData.details?.damageItems && previewData.details.damageItems.length > 0 && (
                <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '6px', marginTop: '4px' }}>
                  <strong style={{ color: '#991b1b', display: 'block', marginBottom: '2px' }}>⚠️ Material Damage:</strong>
                  {previewData.details.damageItems.map((d, di) => {
                    const matDisplay = d.materialName === 'Other' ? d.customMaterialName : d.materialName;
                    return (
                      <div key={di} style={{ marginLeft: '6px', marginBottom: '4px', color: '#334155' }}>
                        • {matDisplay || 'N/A'}: {d.quantity || 0} {d.unit} ({d.reason || 'No reason'})
                        {d.files.length > 0 && (
                          <div style={{ marginLeft: '6px', fontSize: '11px', color: '#991b1b' }}>
                            📎 Photos: {d.files.map(f => f.name).join(', ')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Outward Destinations Preview */}
              {previewData.details?.outwardDestinations && previewData.details.outwardDestinations.length > 0 && (
                <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '6px', marginTop: '4px' }}>
                  <strong style={{ color: '#9a3412', display: 'block', marginBottom: '2px' }}>📤 Material Outward:</strong>
                  {previewData.details.outwardDestinations.map((dest, di) => (
                    <div key={di} style={{ marginLeft: '6px', marginBottom: '4px' }}>
                      • <strong>{dest.destName === 'Other' ? dest.customDestName : dest.destName}</strong>:
                      {dest.items.map((it, ii) => {
                        const matDisplay = it.materialName === 'Other' ? it.customMaterialName : it.materialName;
                        return (
                          <div key={ii} style={{ marginLeft: '12px', color: '#334155' }}>
                            - {matDisplay || 'N/A'}: {it.quantity || 0} {it.unit}
                          </div>
                        );
                      })}
                      {dest.files.length > 0 && (
                        <div style={{ marginLeft: '12px', fontSize: '11px', color: '#9a3412' }}>
                          📎 Files: {dest.files.map(f => f.name).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Site Progress Photos Preview */}
              {siteProgressPhotos.length > 0 && (
                <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '6px', marginTop: '4px' }}>
                  <strong style={{ color: '#0f172a', display: 'block', marginBottom: '2px' }}>📸 Site Progress Photos:</strong>
                  <div style={{ marginLeft: '6px', fontSize: '11px', color: '#334155' }}>
                    {siteProgressPhotos.map(f => f.name).join(', ')}
                  </div>
                </div>
              )}

            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={confirmAndSave} disabled={loading} style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', flex: 1, fontSize: '12px' }}>
                {loading ? 'Saving...' : 'Confirm & Save'}
              </button>
              <button onClick={() => setPreviewData(null)} style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '6px', cursor: 'pointer', flex: 1, fontSize: '12px' }}>
                Edit / Back
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default SupervisorDashboard