import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Filter, Printer, FileDown, Package, User } from 'lucide-react'

function SiteReportPage() {
  const [sites, setSites] = useState([])
  const [partyNamesList, setPartyNamesList] = useState([])
  const [selectedSite, setSelectedSite] = useState('all')
  const [reportType, setReportType] = useState('all') 
  const [selectedParty, setSelectedParty] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [reports, setReports] = useState([])
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSites()
    loadAllMastersAndData()
  }, [])

  useEffect(() => {
    loadAllMastersAndData()
  }, [selectedSite, fromDate, toDate])

  const loadSites = async () => {
    const { data } = await supabase.from('sites').select('*')
    setSites(data || [])
  }

  const loadAllMastersAndData = async () => {
    setLoading(true)
    
    // 1. Fetch Vendors, Outward Parties & Contractors for the Dropdown
    let vQuery = supabase.from('site_vendors').select('site_name, name')
    let pQuery = supabase.from('site_outward_parties').select('site_name, name')
    let cQuery = supabase.from('contractors').select('site_name, name')

    if (selectedSite !== 'all') {
      vQuery = vQuery.eq('site_name', selectedSite)
      pQuery = pQuery.eq('site_name', selectedSite)
      cQuery = cQuery.eq('site_name', selectedSite)
    }

    const [vRes, pRes, cRes] = await Promise.all([vQuery, pQuery, cQuery])
    const allNames = [
      ...(vRes.data || []).map(x => x.name),
      ...(pRes.data || []).map(x => x.name),
      ...(cRes.data || []).map(x => x.name)
    ]
    setPartyNamesList([...new Set(allNames)].filter(Boolean))

    // 2. Fetch Daily Reports
    let repQuery = supabase.from('daily_reports').select('*').order('report_date', { ascending: false })
    if (selectedSite !== 'all') repQuery = repQuery.eq('site_name', selectedSite)
    if (fromDate) repQuery = repQuery.gte('report_date', fromDate)
    if (toDate) repQuery = repQuery.lte('report_date', toDate)
    const { data: repData } = await repQuery

    // 3. Fetch Material Movements
    let movQuery = supabase.from('material_movements').select('*').order('entry_date', { ascending: false })
    if (selectedSite !== 'all') movQuery = movQuery.eq('site_name', selectedSite)
    if (fromDate) movQuery = movQuery.gte('entry_date', fromDate)
    if (toDate) movQuery = movQuery.lte('entry_date', toDate)
    const { data: movData } = await movQuery

    setReports(repData || [])
    setMovements(movData || [])
    setLoading(false)
  }

  const handlePrintPDF = () => {
    window.print()
  }

  // Unified Processed Data based on all filters
  const filteredData = useMemo(() => {
    let processed = []

    // --- 1. MATERIAL INWARD ---
    if (reportType === 'all' || reportType === 'inward') {
      movements.filter(m => m.movement_type === 'inward').forEach(m => {
        const items = typeof m.items === 'string' ? JSON.parse(m.items) : (m.items || [])
        items.forEach(it => {
          const matName = it.materialName === 'Other' ? it.customMaterialName : (it.materialName || 'N/A')
          const srcName = m.source_destination || 'N/A'
          if (selectedParty === 'all' || srcName.trim().toLowerCase() === selectedParty.trim().toLowerCase()) {
            processed.push({
              category: '1. Material Inward',
              site: m.site_name,
              date: m.entry_date,
              userId: m.created_by || 'Supervisor',
              name: srcName,
              detail: `${matName} (DC: ${m.dc_number || 'N/A'}, Veh: ${m.vehicle_number || 'N/A'})`,
              materialKey: matName,
              qty: parseFloat(it.quantity || 0),
              unit: it.unit || 'Bags',
              remarks: m.description || ''
            })
          }
        })
      })
    }

    // --- 2. PALING WORK ---
    if (reportType === 'all' || reportType === 'paling') {
      reports.forEach(r => {
        (r.paling_work || []).forEach(p => {
          const cName = p.contractorName || 'N/A'
          if (selectedParty === 'all' || cName.trim().toLowerCase() === selectedParty.trim().toLowerCase()) {
            processed.push({
              category: '2. Paling Work',
              site: r.site_name,
              date: r.report_date,
              userId: r.user_id || 'Supervisor',
              name: cName,
              detail: 'Paling Work',
              materialKey: 'Paling Work',
              qty: parseFloat(p.qty || 0),
              unit: 'NOS',
              remarks: p.description || ''
            })
          }
        })
      })
    }

    // --- 3. MATERIAL USAGE ---
    if (reportType === 'all' || reportType === 'usage') {
      reports.forEach(r => {
        (r.contractor_details || []).forEach(c => {
          const cName = c.contractorName || 'N/A'
          if (selectedParty === 'all' || cName.trim().toLowerCase() === selectedParty.trim().toLowerCase()) {
            (c.materials || []).forEach(mat => {
              const matName = mat.material === 'Other' ? mat.customMaterialName : mat.material
              processed.push({
                category: '3. Material Usage',
                site: r.site_name,
                date: r.report_date,
                userId: r.user_id || 'Supervisor',
                name: cName,
                detail: matName || 'Material',
                materialKey: matName || 'Material',
                qty: parseFloat(mat.quantity || 0),
                unit: mat.unit || 'NOS',
                remarks: `Labour: ${c.labourCount || 0}`
              })
            })
          }
        })
      })
    }

    // --- 4. FINAL WORK ---
    if (reportType === 'all' || reportType === 'final') {
      reports.forEach(r => {
        (r.final_work || []).forEach(f => {
          const cName = f.contractorName || 'N/A'
          if (selectedParty === 'all' || cName.trim().toLowerCase() === selectedParty.trim().toLowerCase()) {
            const wName = f.workDesc === 'Other' ? f.customWorkDesc : f.workDesc
            processed.push({
              category: '4. Final Work',
              site: r.site_name,
              date: r.report_date,
              userId: r.user_id || 'Supervisor',
              name: cName,
              detail: wName || 'Final Work',
              materialKey: wName || 'Final Work',
              qty: parseFloat(f.runningFeet || 0),
              unit: 'Running Feet',
              remarks: `Height: ${f.height || 0}`
            })
          }
        })
      })
    }

    // --- 5. MATERIAL DAMAGE ---
    if (reportType === 'all' || reportType === 'damage') {
      reports.forEach(r => {
        (r.damage_items || []).forEach(d => {
          const dName = d.materialName === 'Other' ? d.customMaterialName : d.materialName
          processed.push({
            category: '5. Material Damage',
            site: r.site_name,
            date: r.report_date,
            userId: r.user_id || 'Supervisor',
            name: 'N/A',
            detail: dName || 'Damaged Item',
            materialKey: dName || 'Damaged Item',
            qty: parseFloat(d.quantity || 0),
            unit: d.unit || 'Bags',
            remarks: d.reason || ''
          })
        })
      })
    }

    // --- 6. MATERIAL OUTWARD ---
    if (reportType === 'all' || reportType === 'outward') {
      movements.filter(m => m.movement_type === 'outward').forEach(m => {
        const items = typeof m.items === 'string' ? JSON.parse(m.items) : (m.items || [])
        items.forEach(it => {
          const matName = it.materialName === 'Other' ? it.customMaterialName : (it.materialName || 'N/A')
          const destName = m.source_destination || 'N/A'
          if (selectedParty === 'all' || destName.trim().toLowerCase() === selectedParty.trim().toLowerCase()) {
            processed.push({
              category: '6. Material Outward',
              site: m.site_name,
              date: m.entry_date,
              userId: m.created_by || 'Supervisor',
              name: destName,
              detail: `${matName} (DC: ${m.dc_number || 'N/A'}, Veh: ${m.vehicle_number || 'N/A'})`,
              materialKey: matName,
              qty: parseFloat(it.quantity || 0),
              unit: it.unit || 'Bags',
              remarks: m.description || ''
            })
          }
        })
      })
    }

    return processed
  }, [reports, movements, reportType, selectedParty])

  // Material-wise Total Summary Calculation
  const materialSummary = useMemo(() => {
    const summary = {}
    filteredData.forEach(item => {
      const key = `${item.materialKey} [${item.unit}]`
      if (!summary[key]) {
        summary[key] = { name: item.materialKey, unit: item.unit, totalQty: 0 }
      }
      summary[key].totalQty += item.qty
    })
    return summary
  }, [filteredData])

  // Smart Excel Export
  const exportToExcel = () => {
    if (filteredData.length === 0) { alert("No data to export!"); return; }
    
    const siteTitle = selectedSite === 'all' ? 'All_Sites' : selectedSite
    const sectionTitle = reportType === 'all' ? 'All_Sections' : reportType
    const dateHeader = (fromDate || toDate) ? `From_${fromDate || 'Start'}_to_${toDate || 'End'}` : 'All_Dates'
    
    let csvContent = `data:text/csv;charset=utf-8,Report Type: ${sectionTitle} | Site: ${siteTitle} | Date Range: ${dateHeader}\n\nCategory,Site,Date,User ID,Name,Details,Quantity,Unit,Remarks\n`
    
    filteredData.forEach(item => {
      csvContent += `"${item.category}","${item.site}","${item.date}","${item.userId}","${item.name}","${item.detail}","${item.qty}","${item.unit}","${item.remarks}"\n`
    })
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${siteTitle}_${sectionTitle}_${dateHeader}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, sans-serif', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* Header & Buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>📋 Comprehensive Site & Material Reports</h1>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>Filter all 6 report sections, vendors/parties, and date range.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={exportToExcel} style={{ backgroundColor: '#16a34a', color: '#fff', padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileDown size={16} /> Export Excel
          </button>
          <button onClick={handlePrintPDF} style={{ backgroundColor: '#2563eb', color: '#fff', padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={16} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>
          <Filter size={16} /> Filters:
        </div>

        {/* Site Filter */}
        <select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)} style={{ flex: '1 1 150px', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', fontWeight: 'bold' }}>
          <option value="all">🌐 All Sites</option>
          {sites.map(s => <option key={s.id} value={s.site_name}>{s.site_name}</option>)}
        </select>

        {/* Section Type Filter */}
        <select value={reportType} onChange={(e) => setReportType(e.target.value)} style={{ flex: '1 1 170px', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}>
          <option value="all">📑 All 6 Sections</option>
          <option value="inward">1. Material Inward</option>
          <option value="paling">2. Paling Work</option>
          <option value="usage">3. Material Usage</option>
          <option value="final">4. Final Work</option>
          <option value="damage">5. Material Damage</option>
          <option value="outward">6. Material Outward</option>
        </select>

        {/* Vendor / Party / Contractor Filter */}
        <select value={selectedParty} onChange={(e) => setSelectedParty(e.target.value)} style={{ flex: '1 1 160px', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}>
          <option value="all">👥 All Vendors / Parties / Contractors</option>
          {partyNamesList.map((name, idx) => (
            <option key={idx} value={name}>{name}</option>
          ))}
        </select>

        {/* From Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: '1 1 130px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>From:</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
        </div>

        {/* To Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: '1 1 130px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>To:</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
        </div>

        {/* Reset */}
        {(selectedSite !== 'all' || reportType !== 'all' || selectedParty !== 'all' || fromDate || toDate) && (
          <button onClick={() => { setSelectedSite('all'); setReportType('all'); setSelectedParty('all'); setFromDate(''); setToDate(''); }} style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>
            Reset
          </button>
        )}
      </div>

      {/* MATERIAL-WISE TOTAL SUMMARY BOX */}
      {Object.keys(materialSummary).length > 0 && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '16px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
            <Package size={18} color="#2563eb" />
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>📊 Material / Item-wise Total Summary (મટીરિયલ વાઇઝ કુલ જથ્થો)</h4>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            {Object.entries(materialSummary).map(([key, data], idx) => (
              <div key={idx} style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b' }}>{data.name}</span>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#2563eb', backgroundColor: '#eff6ff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                  {data.totalQty} {data.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Container */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
            Report Records ({filteredData.length} Found)
          </h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>T&J Infra Management System</span>
        </div>

        {loading ? (
          <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '30px' }}>Loading report data...</p>
        ) : filteredData.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '30px' }}>No records found matching your filters.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredData.map((item, index) => (
              <div key={index} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>🏗️ {item.site}</span>
                    <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>{item.category}</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>📅 {item.date}</span>
                    <span style={{ fontSize: '11px', color: '#0f172a', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <User size={11} /> {item.userId}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>
                    {item.name !== 'N/A' && <span>👤 {item.name} — </span>}{item.detail}
                  </div>
                  {item.remarks && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Note: {item.remarks}</div>}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2563eb', backgroundColor: '#eff6ff', padding: '6px 12px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                  {item.qty} {item.unit}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

export default SiteReportPage;