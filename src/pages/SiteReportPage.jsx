import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Filter, Search, Printer, FileText, ExternalLink } from 'lucide-react'

function SiteReportPage() {
  const [sites, setSites] = useState([])
  const [vendorsList, setVendorsList] = useState([])
  const [selectedSite, setSelectedSite] = useState('all')
  const [selectedVendor, setSelectedVendor] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSites()
    loadReports()
  }, [])

  useEffect(() => {
    loadVendorsAndParties()
    loadReports()
  }, [selectedSite])

  const loadSites = async () => {
    const { data } = await supabase.from('sites').select('*')
    setSites(data || [])
  }

  const loadVendorsAndParties = async () => {
    try {
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
      
      setVendorsList([...new Set(allNames)].filter(Boolean))
      setSelectedVendor('all')
    } catch (err) {
      console.error("Error loading master vendors:", err)
    }
  }

  const loadReports = async () => {
    setLoading(true)
    let query = supabase.from('daily_reports').select('*').order('created_at', { ascending: false })
    
    if (selectedSite !== 'all') {
      query = query.eq('site_name', selectedSite)
    }
    if (fromDate) {
      query = query.gte('report_date', fromDate)
    }
    if (toDate) {
      query = query.lte('report_date', toDate)
    }

    const { data, error } = await query
    if (error) {
      console.error("Error loading reports:", error.message)
    } else {
      let filtered = data || []
      
      // Smart Filtering across contractor_details, inward_sources, etc.
      if (selectedVendor !== 'all') {
        filtered = filtered.filter(r => {
          let sources = []
          try {
            const conDetails = typeof r.contractor_details === 'string' ? JSON.parse(r.contractor_details) : (r.contractor_details || [])
            const inSources = typeof r.inward_sources === 'string' ? JSON.parse(r.inward_sources) : (r.inward_sources || [])
            sources = [...conDetails, ...inSources]
          } catch (e) {
            sources = []
          }

          return sources.some(source => {
            const vName = source.vendor || source.party_name || source.contractorName || source.name || ''
            return vName.trim().toLowerCase() === selectedVendor.trim().toLowerCase()
          })
        })
      }
      setReports(filtered)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadReports()
  }, [fromDate, toDate, selectedVendor])

  const handlePrintPDF = () => {
    window.print()
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, sans-serif', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>📋 Site Vendor & Date Master Report</h1>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>Filter reports by site-specific contractors, vendors, and date range.</p>
        </div>
        <button 
          onClick={handlePrintPDF}
          style={{ backgroundColor: '#2563eb', color: '#fff', padding: '10px 18px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Printer size={16} /> Print / Save as PDF
        </button>
      </div>

      {/* FILTERS */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '12px', 
        backgroundColor: '#fff', 
        padding: '16px', 
        borderRadius: '12px', 
        border: '1px solid #e2e8f0',
        marginBottom: '24px',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>
          <Filter size={16} /> Filters:
        </div>

        <select 
          value={selectedSite} 
          onChange={(e) => setSelectedSite(e.target.value)}
          style={{ flex: '1 1 160px', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
        >
          <option value="all">🌐 All Sites</option>
          {sites.map(s => <option key={s.id} value={s.site_name}>{s.site_name}</option>)}
        </select>

        <select 
          value={selectedVendor} 
          onChange={(e) => setSelectedVendor(e.target.value)}
          style={{ flex: '1 1 180px', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
        >
          <option value="all">👥 {selectedSite === 'all' ? 'All Contractors / Vendors' : `Parties for ${selectedSite}`}</option>
          {vendorsList.map((vName, idx) => (
            <option key={idx} value={vName}>{vName}</option>
          ))}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 140px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>From:</span>
          <input 
            type="date" 
            value={fromDate} 
            onChange={(e) => setFromDate(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} 
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 140px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>To:</span>
          <input 
            type="date" 
            value={toDate} 
            onChange={(e) => setToDate(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} 
          />
        </div>

        {(selectedSite !== 'all' || selectedVendor !== 'all' || fromDate || toDate) && (
          <button 
            onClick={() => { setSelectedSite('all'); setSelectedVendor('all'); setFromDate(''); setToDate(''); }}
            style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}
          >
            Reset
          </button>
        )}
      </div>

      {/* REPORT RESULTS */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
            Report Results ({reports.length} Records Found)
          </h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>T&J Infra Management System</span>
        </div>

        {loading ? (
          <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '30px' }}>Loading report data...</p>
        ) : reports.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '30px' }}>No reports found matching your selected filters.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reports.map((r, index) => {
              let conList = []
              let matList = []
              try {
                conList = typeof r.contractor_details === 'string' ? JSON.parse(r.contractor_details) : (r.contractor_details || [])
                matList = typeof r.material_usages === 'string' ? JSON.parse(r.material_usages) : (r.material_usages || [])
              } catch (e) {
                conList = []
                matList = []
              }

              return (
                <div key={r.id || index} style={{ padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                  
                  {/* Meta Info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                        🏗️ {r.site_name}
                      </span>
                      <span style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>
                        📅 Date: {r.report_date}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#0284c7', backgroundColor: '#e0f2fe', padding: '3px 8px', borderRadius: '4px', fontWeight: '600' }}>
                      Report ID: #{r.id ? r.id.toString().slice(0, 8) : index + 1}
                    </span>
                  </div>

                  {/* Contractor & Material Details Table */}
                  <div style={{ marginTop: '10px', overflowX: 'auto' }}>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>📦 Contractor, Material & Damage / Bill Details:</p>
                    
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', backgroundColor: '#fff' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                          <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Contractor / Party</th>
                          <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Labour Count</th>
                          <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Material / Usage</th>
                          <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Attached Bill</th>
                        </tr>
                      </thead>
                      <tbody>
                        {conList.map((con, cIdx) => (
                          <tr key={cIdx}>
                            <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#0f172a' }}>
                              {con.contractorName || 'N/A'}
                            </td>
                            <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>
                              {con.labourCount || '0'}
                            </td>
                            <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>
                              {con.materials && con.materials.length > 0 ? con.materials.map(m => `${m.material || ''} (${m.quantity || 0} ${m.unit || ''})`).join(', ') : 'N/A'}
                            </td>
                            <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>
                              {matList.some(m => m.bill_urls && m.bill_urls.length > 0) ? (
                                matList.map((m, mIdx) => (
                                  m.bill_urls && m.bill_urls.map((url, uIdx) => (
                                    <a key={`${mIdx}-${uIdx}`} href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600', textDecoration: 'none' }}>
                                      <FileText size={14} /> View Bill <ExternalLink size={12} />
                                    </a>
                                  ))
                                ))
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '11px' }}>No Bill</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}

export default SiteReportPage;