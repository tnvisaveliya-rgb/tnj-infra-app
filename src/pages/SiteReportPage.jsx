import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Filter, Printer, FileDown, Package, User, ExternalLink } from 'lucide-react'

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
    
    let vQuery = supabase.from('site_vendors').select('site_name, name')
    let pQuery = supabase.from('site_outward_parties').select('site_name, name')
    let cQuery = supabase.from('contractors').select('site_name, name')

    if (selectedSite !== 'all') {
      vQuery = vQuery.eq('site_name', selectedSite)
      pQuery = pQuery.eq('site_name', selectedSite)
      cQuery = cQuery.eq('site_name', selectedSite)
    }

    const [vRes, pRes, cRes] = await Promise.all([vQuery, pQuery, cQuery])
    
    const vendors = (vRes.data || []).map(x => x.name ? `${x.name} (Vendor)` : null).filter(Boolean)
    const parties = (pRes.data || []).map(x => x.name ? `${x.name} (Outward Party)` : null).filter(Boolean)
    const contractors = (cRes.data || []).map(x => x.name ? `${x.name} (Contractor)` : null).filter(Boolean)

    const allNames = [...vendors, ...parties, ...contractors]
    setPartyNamesList([...new Set(allNames)].filter(Boolean))

    let repQuery = supabase.from('daily_reports').select('*').order('report_date', { ascending: false })
    if (selectedSite !== 'all') repQuery = repQuery.eq('site_name', selectedSite)
    if (fromDate) repQuery = repQuery.gte('report_date', fromDate)
    if (toDate) repQuery = repQuery.lte('report_date', toDate)
    const { data: repData } = await repQuery

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

  const isMatchParty = (targetName) => {
    if (selectedParty === 'all') return true;
    if (!targetName) return false;
    const cleanSelected = selectedParty.split(' (')[0].trim().toLowerCase();
    const cleanTarget = targetName.trim().toLowerCase();
    return cleanTarget === cleanSelected;
  }

  const filteredData = useMemo(() => {
    let processed = []

    // Helper to extract attachment URL from array or string
    const getAttachmentUrl = (urls) => {
      if (!urls) return '';
      if (Array.isArray(urls) && urls.length > 0) return urls[0];
      if (typeof urls === 'string') {
        try {
          const parsed = JSON.parse(urls);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
        } catch {
          return urls;
        }
      }
      return '';
    };

    // 1. Material Inward
    if (reportType === 'all' || reportType === 'inward') {
      movements.filter(m => m.movement_type === 'inward').forEach(m => {
        const items = typeof m.items === 'string' ? JSON.parse(m.items) : (m.items || [])
        items.forEach(it => {
          const matName = it.materialName === 'Other' ? it.customMaterialName : (it.materialName || 'N/A')
          const srcName = m.source_destination || 'N/A'
          if (isMatchParty(srcName)) {
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
              remarks: m.description || '',
              attachment: getAttachmentUrl(m.bill_urls || m.attachment || m.image_url)
            })
          }
        })
      })
    }

    // 2. Paling Work
    if (reportType === 'all' || reportType === 'paling') {
      reports.forEach(r => {
        (r.paling_work || []).forEach(p => {
          const cName = p.contractorName || 'N/A'
          if (isMatchParty(cName)) {
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
              remarks: p.description || '',
              attachment: getAttachmentUrl(r.photo_urls || r.attachment || p.attachment)
            })
          }
        })
      })
    }

    // 3. Material Usage
    if (reportType === 'all' || reportType === 'usage') {
      reports.forEach(r => {
        (r.contractor_details || []).forEach(c => {
          const cName = c.contractorName || 'N/A'
          if (isMatchParty(cName)) {
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
                remarks: `Labour: ${c.labourCount || 0}`,
                attachment: getAttachmentUrl(r.photo_urls || r.attachment)
              })
            })
          }
        })
      })
    }

    // 4. Final Work
    if (reportType === 'all' || reportType === 'final') {
      reports.forEach(r => {
        (r.final_work || []).forEach(f => {
          const cName = f.contractorName || 'N/A'
          if (isMatchParty(cName)) {
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
              remarks: `Height: ${f.height || 0}`,
              attachment: getAttachmentUrl(r.photo_urls || r.attachment)
            })
          }
        })
      })
    }

    // 5. Material Damage
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
            remarks: d.reason || '',
            attachment: getAttachmentUrl(d.bill_urls || r.attachment)
          })
        })
      })
    }

    // 6. Material Outward
    if (reportType === 'all' || reportType === 'outward') {
      movements.filter(m => m.movement_type === 'outward').forEach(m => {
        const items = typeof m.items === 'string' ? JSON.parse(m.items) : (m.items || [])
        items.forEach(it => {
          const matName = it.materialName === 'Other' ? it.customMaterialName : (it.materialName || 'N/A')
          const destName = m.source_destination || 'N/A'
          if (isMatchParty(destName)) {
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
              remarks: m.description || '',
              attachment: getAttachmentUrl(m.bill_urls || m.attachment || m.image_url)
            })
          }
        })
      })
    }

    return processed
  }, [reports, movements, reportType, selectedParty])

  const totalQty = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + (item.qty || 0), 0)
  }, [filteredData])

  const materialSummary = useMemo(() => {
    const summary = {}
    const addToSummary = (key, name, unit, qty, type) => {
      if (!summary[key]) {
        summary[key] = { name, unit, inward: 0, usage: 0, outward: 0, damage: 0 }
      }
      if (type === 'inward') summary[key].inward += qty
      if (type === 'usage') summary[key].usage += qty
      if (type === 'outward') summary[key].outward += qty
      if (type === 'damage') summary[key].damage += qty
    }

    filteredData.forEach(item => {
      const key = `${item.materialKey} [${item.unit}]`
      if (item.category === '1. Material Inward') addToSummary(key, item.materialKey, item.unit, item.qty, 'inward')
      else if (item.category === '3. Material Usage') addToSummary(key, item.materialKey, item.unit, item.qty, 'usage')
      else if (item.category === '6. Material Outward') addToSummary(key, item.materialKey, item.unit, item.qty, 'outward')
      else if (item.category === '5. Material Damage') addToSummary(key, item.materialKey, item.unit, item.qty, 'damage')
    })
    return summary
  }, [filteredData])

  const contractorSummary = useMemo(() => {
    const summary = {}
    filteredData.forEach(item => {
      if (item.category === '2. Paling Work' || item.category === '4. Final Work') {
        const cName = item.name || 'Unknown'
        if (!summary[cName]) summary[cName] = { name: cName, totalQty: 0, unit: item.unit, category: item.category }
        summary[cName].totalQty += item.qty
      }
    })
    return summary
  }, [filteredData])

const exportToExcel = () => {
    if (filteredData.length === 0) { alert("No data to export!"); return; }

    // 1. બધી જ યુનિક પ્રોડક્ટ્સ
    const allMaterials = [...new Set(filteredData.map(item => item.materialKey || 'Material'))];
    
    let csvContent = `data:text/csv;charset=utf-8,"Report: ${selectedSite} | Type: ${reportType}",,,,,\n`;
    csvContent += `"Party: ${selectedParty}",,,,,,,\n`;
    csvContent += `date,dc no,${allMaterials.join(',')},uom,vehichale number,user id,remarks,attachment\n`;

    let lastDate = ""; // તારીખ રિપીટ ન થાય તે માટેનું વેરિએબલ

    // 2. ડેટા લૂપ
    filteredData.forEach(item => {
      const dcMatch = item.detail.match(/DC: ([^,)]+)/);
      const vehMatch = item.detail.match(/Veh: ([^,)]+)/);
      const dc = dcMatch ? dcMatch[1].trim() : 'N/A';
      const veh = vehMatch ? vehMatch[1].trim() : 'N/A';
      
      // પ્રોડક્ટ પ્રમાણે ક્વોન્ટિટી સેટ કરવી
      let rowValues = allMaterials.map(mat => (item.materialKey === mat ? item.qty : ""));
      
      // જો સમાન તારીખ હોય તો ખાલી રાખવી, અલગ હોય તો પ્રિન્ટ કરવી
      const dateToPrint = (item.date === lastDate) ? "" : item.date;
      lastDate = item.date;

      const cleanRemark = (item.remarks || "").replace(/,/g, " ");
      
      let rowString = `"${dateToPrint}","${dc}",${rowValues.map(v => `"${v}"`).join(',')},"${item.unit}","${veh}","${item.userId}","${cleanRemark}","${item.attachment || ''}"\n`;
      csvContent += rowString;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Report_Perfect_${selectedSite}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, sans-serif', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; color: #000 !important; }
          .print-table-container { display: block !important; width: 100%; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #000 !important; padding: 8px; font-size: 11px; text-align: left; }
          th { background-color: #f1f5f9 !important; }
        }
        .print-table-container { display: none; }
      `}</style>

      {/* Header & Buttons */}
      <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px' }}>
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
      <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>
          <Filter size={16} /> Filters:
        </div>

        <select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)} style={{ flex: '1 1 150px', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', fontWeight: 'bold' }}>
          <option value="all">🌐 All Sites</option>
          {sites.map(s => <option key={s.id} value={s.site_name}>{s.site_name}</option>)}
        </select>

        <select value={reportType} onChange={(e) => setReportType(e.target.value)} style={{ flex: '1 1 170px', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}>
          <option value="all">📑 All 6 Sections</option>
          <option value="inward">1. Material Inward</option>
          <option value="paling">2. Paling Work</option>
          <option value="usage">3. Material Usage</option>
          <option value="final">4. Final Work</option>
          <option value="damage">5. Material Damage</option>
          <option value="outward">6. Material Outward</option>
        </select>

        <select value={selectedParty} onChange={(e) => setSelectedParty(e.target.value)} style={{ flex: '1 1 180px', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}>
          <option value="all">👥 All Vendors / Parties / Contractors</option>
          {partyNamesList.map((name, idx) => (
            <option key={idx} value={name}>{name}</option>
          ))}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: '1 1 130px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>From:</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: '1 1 130px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>To:</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
        </div>

        {(selectedSite !== 'all' || reportType !== 'all' || selectedParty !== 'all' || fromDate || toDate) && (
          <button onClick={() => { setSelectedSite('all'); setReportType('all'); setSelectedParty('all'); setFromDate(''); setToDate(''); }} style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>
            Reset
          </button>
        )}
      </div>

 
  <div className="print-table-container">
        <h2 style={{ textAlign: 'center', fontSize: '16px' }}>Comprehensive Site & Material Report</h2>
        <div style={{ fontSize: '12px', marginBottom: '10px' }}>
          <strong>Report:</strong> {reportType} | <strong>Site:</strong> {selectedSite} | <strong>Party:</strong> {selectedParty}
        </div>
        
        {(() => {
          // 1. પ્રોસેસિંગ: ડેટાને ગ્રુપ કરવા માટે
          const groupedData = {};
          filteredData.forEach(item => {
            if (!groupedData[item.date]) groupedData[item.date] = [];
            groupedData[item.date].push(item);
          });

          return (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>DC No</th>
                  <th>Material</th> {/* અહીં હવે ડાયનેમિક નામ આવશે */}
                  <th>Qty</th>
                  <th>UOM</th> {/* UOM કોલમ ઉમેરી */}
                  <th>Vehicle</th>
                  <th>Remarks</th>
                  <th>Attachment</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedData).map(([date, entries], dIdx) => (
                  entries.map((item, eIdx) => {
                    const dcMatch = item.detail.match(/DC: ([^,)]+)/);
                    const vehMatch = item.detail.match(/Veh: ([^,)]+)/);

                    return (
                      <tr key={`${dIdx}-${eIdx}`}>
                        {eIdx === 0 && (
                          <td rowSpan={entries.length} style={{ verticalAlign: 'middle', textAlign: 'center', fontWeight: 'bold' }}>
                            {date}
                          </td>
                        )}
                        <td>{dcMatch ? dcMatch[1].trim() : 'N/A'}</td>
                        {/* અહીં Material Name ડાયનેમિકલી આવશે */}
                        <td style={{ fontWeight: 'bold' }}>{item.materialKey}</td>
                        <td>{item.qty}</td>
                        <td>{item.unit}</td> {/* અહીં UOM આવશે */}
                        <td>{vehMatch ? vehMatch[1].trim() : 'N/A'}</td>
                        <td>{item.remarks}</td>
                        <td>{item.attachment ? <a href={item.attachment} target="_blank" rel="noopener noreferrer">View</a> : '-'}</td>
                      </tr>
                    );
                  })
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                  <td colSpan="3" style={{ textAlign: 'right' }}>Grand Total:</td>
                  <td>{filteredData.reduce((sum, item) => sum + (item.qty || 0), 0)}</td>
                  <td colSpan="4"></td>
                </tr>
              </tfoot>
            </table>
          );
        })()}
      </div>


      
      {/* 1. MATERIAL-WISE STOCK SUMMARY BOX */}
      <div className="no-print">
        {Object.keys(materialSummary).length > 0 && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '16px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              <Package size={18} color="#2563eb" />
              <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>📊 Material Stock Summary (Inward - Usage - Outward - Damage = Stock)</h4>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                    <th style={{ padding: '8px', border: '1px solid #e2e8f0' }}>Item Name</th>
                    <th style={{ padding: '8px', border: '1px solid #e2e8f0' }}>Inward (+)</th>
                    <th style={{ padding: '8px', border: '1px solid #e2e8f0' }}>Usage (-)</th>
                    <th style={{ padding: '8px', border: '1px solid #e2e8f0' }}>Outward (-)</th>
                    <th style={{ padding: '8px', border: '1px solid #e2e8f0' }}>Damage (-)</th>
                    <th style={{ padding: '8px', border: '1px solid #e2e8f0', backgroundColor: '#eff6ff', color: '#1e40af' }}>Current Stock (=)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(materialSummary).map(([key, data], idx) => {
                    const stock = data.inward - data.usage - data.outward - data.damage;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{data.name} <span style={{ color: '#94a3b8' }}>({data.unit})</span></td>
                        <td style={{ padding: '8px', color: '#16a34a' }}>{data.inward}</td>
                        <td style={{ padding: '8px', color: '#dc2626' }}>{data.usage}</td>
                        <td style={{ padding: '8px', color: '#ea580c' }}>{data.outward}</td>
                        <td style={{ padding: '8px', color: '#991b1b' }}>{data.damage}</td>
                        <td style={{ padding: '8px', fontWeight: 'bold', color: stock < 0 ? '#dc2626' : '#2563eb' }}>{stock}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. CONTRACTOR-WISE WORK SUMMARY */}
        {Object.keys(contractorSummary).length > 0 && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '16px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              <User size={18} color="#86198f" />
              <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>👷 Contractor-wise Work Summary (કોન્ટ્રાક્ટર વાઇઝ કુલ કામ)</h4>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              {Object.entries(contractorSummary).map(([cName, cData], idx) => (
                <div key={idx} style={{ backgroundColor: '#fdf4ff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #f5d0fe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#86198f' }}>{cData.name}</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>{cData.category}</div>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#86198f', backgroundColor: '#fae8ff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #f0abfc' }}>
                    {cData.totalQty} {cData.unit}
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
                    
                    {/* UI કાર્ડમાં અટેચમેન્ટ લિંક */}
                    {item.attachment && (
                      <div style={{ marginTop: '6px' }}>
                        <a href={item.attachment} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <ExternalLink size={12} /> View Attached File / Photo
                        </a>
                      </div>
                    )}
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

    </div>
  )
}

export default SiteReportPage;