import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, AlertCircle, Filter, FileText } from 'lucide-react'

import ConfirmModal from '../components/ConfirmModal';

function SupervisorDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('site_report')
  const [sites, setSites] = useState([])
  const [contractors, setContractors] = useState([])
  const [materialsMaster, setMaterialsMaster] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [siteBoms, setSiteBoms] = useState([]);
// ✏️ Edit & 24 Hours Lock States for Reports
  const [editingReportId, setEditingReportId] = useState(null);
  const [filterSite, setFilterSite] = useState('all')
  const [filterDate, setFilterDate] = useState('')
  const [previewData, setPreviewData] = useState(null)
  const [reports, setReports] = useState([])
  const [modal, setModal] = useState({ isOpen: false, message: '', onConfirm: null });

  const getTodayString = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };
  const UOM_OPTIONS = ["NOS", "Bags", "KG", "Ton", "Ltr"];

  const [reportForm, setReportForm] = useState({
    siteName: '',
    reportDate: getTodayString(),
 palingWorkRows: [],
    contractorRows: [{ 
      contractorName: '', 
      labourCount: '', 
      labourNotes: '', 
      workItems: [{ 
        workType: '', 
        columnSize: '', 
        concreteType: 'RMC', 
        singleCastingQty: '', 
        doubleCastingQty: '', 
        runningFeet: '', 
        height: '', 
        cementBags: '', 
        customWorkName: '', 
        quantity: '', 
        unit: 'NOS' 
      }] 
    }],
    description: ''
  })


// 🌟 સાઇટ બદલાય એટલે તેનું BOM ફેચ કરવા માટે
useEffect(() => {
    loadSites()
    loadContractors()
    loadMaterialsMaster()
    loadReports()
    loadSiteBoms() // 🌟 આ નવું ફંક્શન ઉમેરવાનું છે
  }, [])

  const loadSiteBoms = async () => {
    const { data, error } = await supabase.from('site_bom').select('*');
    if (!error) {
      setSiteBoms(data || []);
    }
  }

  const loadSites = async () => {
    try {
      const userEmail = user?.email;
      const userId = user?.id;
      
      if (userEmail === 'infra.tnj@gmail.com') {
        const { data } = await supabase.from('sites').select('*');
        setSites(data || []);
        return;
      }

      const { data: permData, error: permError } = await supabase
        .from('user_permissions')
        .select('assigned_sites')
        .eq('user_id', userId)
        .single();

      if (permError || !permData || !permData.assigned_sites || permData.assigned_sites.length === 0) {
        setSites([]); 
        return;
      }

      const assignedSiteNames = permData.assigned_sites;
      const { data: siteData, error: siteError } = await supabase
        .from('sites')
        .select('*')
        .in('site_name', assignedSiteNames);

      if (!siteError && siteData) {
        setSites(siteData);
      } else {
        setSites([]);
      }
    } catch (err) {
      console.error('Error loading assigned sites:', err);
      setSites([]);
    }
  }

  const loadContractors = async () => {
    const { data, error } = await supabase.from('contractors').select('*');
    if (!error) setContractors(data || []);
  }

  // ⏰ ૨૪ કલાક પછી એડિટ માટે વ્હોટ્સએપ પર પરવાનગી માંગવાનું ફંક્શન
  const handleRequestEditAfter24Hours = async (report) => {
    try {
      await supabase
        .from('daily_reports')
        .update({ is_locked: true, edit_requested: true })
        .eq('id', report.id);

      const adminPhone = "918238598234"; // એડમિનનો વ્હોટ્સએપ નંબર
      const portalLink = `${window.location.origin}/Dashboard`; // એપની મેઈન લિંક
      
      const message = `🔔 *DPR Edit Approval Request*\n\nયુઝરે 24 કલાક જૂની નીચેની DPR એન્ટ્રી સુધારવા માટે પરવાનગી માંગી છે:\n• સાઇટ: ${report.site_name}\n• તારીખ: ${report.report_date}\n\n👉 એપ્લિકેશનમાં લોગ-ઈન કરી *Bell Icon (🔔)* માંથી રિક્વેસ્ટ Approve કે Reject કરો.\nLink: ${portalLink}`;

      window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`, '_blank');
      loadReports(); 
    } catch (err) {
      console.error("Error requesting edit:", err);
    }
  };
const loadMaterialsMaster = async () => {
    try {
      // 🌟 ૧. ટેબલનું નામ બદલીને 'site_material_stock_ledger' કર્યું
      const { data, error } = await supabase
        .from('site_material_inward')
        .select('material_name, site_name');

      if (!error && data) {
        // 🌟 ૨. લેજરમાંથી ડુપ્લિકેટ નામ દૂર કરીને યુનિક લિસ્ટ બનાવવું
        const uniqueMaterials = [];
        const seen = new Set();

        data.forEach(item => {
          if (item.material_name && item.site_name) {
            // સાઇટ અને મટીરિયલના નામનું ભેગું કોમ્બિનેશન બનાવી ચેક કરીએ છીએ
            const uniqueKey = `${item.site_name}_${item.material_name.trim()}`;
            
            if (!seen.has(uniqueKey)) {
              seen.add(uniqueKey);
              uniqueMaterials.push({
                id: uniqueKey, 
                name: item.material_name.trim(), // ફોર્મમાં 'name' વપરાય છે એટલે તેમાં મેપ કર્યું
                site_name: item.site_name
              });
            }
          }
        });

        setMaterialsMaster(uniqueMaterials);
      } else {
        setMaterialsMaster([]);
        console.error("Ledger Fetch Error:", error);
      }
    } catch (err) {
      console.error("Error loading materials from ledger:", err);
      setMaterialsMaster([]);
    }
  }
  const loadReports = async () => {
    const { data } = await supabase.from('daily_reports').select('*').order('created_at', { ascending: false })
    setReports(data || [])
  }

  const currentSiteContractors = contractors.filter(c => c.site_name === reportForm.siteName || c.site_name === 'All Sites (General)')
// 🌟 કેસ-ઇન્સિટિવ અને ટ્રીમ સરખામણી સાથે સાઇટના મટીરિયલ્સ ફિલ્ટર કરવા
  const currentSiteMaterials = materialsMaster.filter(m => {
    if (!m.site_name || !reportForm.siteName) return false;
    
    const dbSite = m.site_name.trim().toLowerCase();
    const selectedSite = reportForm.siteName.trim().toLowerCase();
    
    return dbSite === selectedSite || dbSite === 'all sites (general)' || dbSite === 'plant level (general)';
  });

  const triggerContractorChange = (type, index, newValue, selectedName) => {
    setModal({
      isOpen: true,
      message: `Please confirm, select your contractor: "${selectedName}"?`,
      onConfirm: () => {
        if (type === 'paling') {
          const updated = [...reportForm.palingWorkRows];
          updated[index].contractorName = newValue;
          setReportForm({...reportForm, palingWorkRows: updated});
        } else if (type === 'material') {
          const updated = [...reportForm.contractorRows];
          updated[index].contractorName = newValue;
          setReportForm({...reportForm, contractorRows: updated});
        }
        setModal({ isOpen: false, message: '', onConfirm: null });
      },
      onCancel: () => setModal({ isOpen: false })
    });
  };

  const addPalingWorkRow = () => {
    setReportForm({
      ...reportForm, 
      palingWorkRows: [...reportForm.palingWorkRows, { contractorName: '', qty: '', description: '' }]
    })
  }

  const removePalingWorkRow = (index) => {
    setReportForm({
      ...reportForm, 
      palingWorkRows: reportForm.palingWorkRows.filter((_, i) => i !== index)
    })
  }

  const updatePalingRow = (index, field, value) => {
    const updated = [...reportForm.palingWorkRows];
    updated[index][field] = value;
    setReportForm({...reportForm, palingWorkRows: updated});
  }

  const addContractorRow = () => {
    setReportForm({
      ...reportForm,
      contractorRows: [...reportForm.contractorRows, { 
        contractorName: '', 
        labourCount: '', 
        labourNotes: '', 
        workItems: [{ 
          workType: '', 
          columnSize: '', 
          concreteType: 'RMC', 
          singleCastingQty: '', 
          doubleCastingQty: '', 
          runningFeet: '', 
          height: '', 
          cementBags: '', 
          customWorkName: '', 
          quantity: '', 
          unit: 'NOS' 
        }] 
      }]
    })
  }

  const removeContractorRow = (index) => {
    setReportForm({
      ...reportForm,
      contractorRows: reportForm.contractorRows.filter((_, i) => i !== index)
    })
  }

  const addWorkItemToContractor = (cIndex) => {
    const updated = [...reportForm.contractorRows]
    updated[cIndex].workItems.push({ 
      workType: '', 
      columnSize: '', 
      concreteType: 'RMC', 
      singleCastingQty: '', 
      doubleCastingQty: '', 
      runningFeet: '', 
      height: '', 
      cementBags: '', 
      customWorkName: '', 
      quantity: '', 
      unit: 'NOS' 
    })
    setReportForm({...reportForm, contractorRows: updated})
  }

  const removeWorkItemFromContractor = (cIndex, wIndex) => {
    const updated = [...reportForm.contractorRows]
    updated[cIndex].workItems = updated[cIndex].workItems.filter((_, i) => i !== wIndex)
    setReportForm({...reportForm, contractorRows: updated})
  }

  const handleDropdownClick = () => {
    if (!reportForm.siteName) {
      setModal({ isOpen: true, message: 'કૃપા કરીને પહેલા સાઇટ સિલેક્ટ કરો!', onConfirm: () => setModal({ isOpen: false }) });
    }
  };

  const handleCombinedReportPreview = () => {
    if (!reportForm.siteName) {
      setModal({ isOpen: true, message: 'કૃપા કરીને સાઇટ સિલેક્ટ કરો!', onConfirm: () => setModal({ isOpen: false }) });
      return
    }

    setPreviewData({
      title: 'Site Daily Report Preview',
      site: reportForm.siteName,
      date: reportForm.reportDate,
      details: reportForm
    })
  }

const confirmAndSave = async () => {
    setLoading(true)
    setError('')
    try {
      const supervisorEmail = user?.email || 'Supervisor'

      // ૧. દૈનિક રિપોર્ટ ઇન્સર્ટ કરો અને તેની ID મેળવો
      const { data: insertedReport, error: repError } = await supabase
        .from('daily_reports')
        .insert([{
          site_name: reportForm.siteName,
          contractor_details: reportForm.contractorRows,
          paling_work: reportForm.palingWorkRows,
          damage_items: [],
          final_work: [],
          description: reportForm.description,
          photo_urls: [],
          report_date: reportForm.reportDate,
          user_id: supervisorEmail
        }])
        .select('id')
        .single();

      if (repError) throw new Error("Daily report insert failed: " + repError.message);
      
      const reportId = insertedReport ? insertedReport.id : null; // 🌟 સેફ રિપોર્ટ આઈડી

      // ૨. સાઇટ મટીરિયલ સ્ટોક લેજરમાં એન્ટ્રી કરવા માટે
      const ledgerRows = [];

      for (const cRow of reportForm.contractorRows) {
        if (Array.isArray(cRow.workItems)) {
          for (const wItem of cRow.workItems) {
            
            // Column Installation
            if (wItem.workType === '1. Column Installation' && wItem.columnSize && wItem.quantity) {
              ledgerRows.push({
                site_name: reportForm.siteName,
                date: reportForm.reportDate,
                material_name: `Column ${wItem.columnSize}`,
                qty: Math.abs(parseFloat(wItem.quantity) || 0),
                unit: 'Nos',
                transaction_type: 'Consumption',
                reference_id: reportId
              });
            }

            // Panel Erection
            if (wItem.workType === '3. Panel Erection' && wItem.columnSize && wItem.quantity) {
              ledgerRows.push({
                site_name: reportForm.siteName,
                date: reportForm.reportDate,
                material_name: `Panel ${wItem.columnSize}`,
                qty: Math.abs(parseFloat(wItem.quantity) || 0),
                unit: 'Nos',
                transaction_type: 'Consumption',
                reference_id: reportId
              });
            }

            // Column Concrete
            if (wItem.workType === '2. Column Concrete') {
              if (wItem.concreteType === 'RMC' && wItem.actualRmcQty) {
                ledgerRows.push({
                  site_name: reportForm.siteName,
                  date: reportForm.reportDate,
                  material_name: 'RMC Concrete',
                  qty: Math.abs(parseFloat(wItem.actualRmcQty) || 0),
                  unit: 'Cu.M',
                  transaction_type: 'Consumption',
                  reference_id: reportId
                });
              } else if (wItem.concreteType === 'Manual') {
                const actualBags = parseFloat(wItem.actualCementBags) || 0;
                if (actualBags > 0) {
                  ledgerRows.push({
                    site_name: reportForm.siteName,
                    date: reportForm.reportDate,
                    material_name: 'Cement',
                    qty: Math.abs(actualBags),
                    unit: 'Bags',
                    transaction_type: 'Consumption',
                    reference_id: reportId
                  });
                }

                const singleQ = parseFloat(wItem.singleCastingQty) || 0;
                const doubleQ = parseFloat(wItem.doubleCastingQty) || 0;

                const matchedSingleBom = siteBoms.find(b => b.site_name === reportForm.siteName && b.work_name && b.work_name.toLowerCase().includes('single'));
                const matchedDoubleBom = siteBoms.find(b => b.site_name === reportForm.siteName && b.work_name && b.work_name.toLowerCase().includes('double'));

                if (matchedSingleBom && Array.isArray(matchedSingleBom.bom_items)) {
                  matchedSingleBom.bom_items.forEach(item => {
                    if (item.material && item.consumption && !item.material.toLowerCase().includes('cement')) {
                      const totalConsump = singleQ * Number(item.consumption);
                      if (totalConsump > 0) {
                        ledgerRows.push({
                          site_name: reportForm.siteName,
                          date: reportForm.reportDate,
                          material_name: item.material,
                          qty: Math.abs(totalConsump),
                          unit: item.unit || 'Nos',
                          transaction_type: 'Consumption',
                          reference_id: reportId
                        });
                      }
                    }
                  });
                }

                if (matchedDoubleBom && Array.isArray(matchedDoubleBom.bom_items)) {
                  matchedDoubleBom.bom_items.forEach(item => {
                    if (item.material && item.consumption && !item.material.toLowerCase().includes('cement')) {
                      const totalConsump = doubleQ * Number(item.consumption);
                      if (totalConsump > 0) {
                        ledgerRows.push({
                          site_name: reportForm.siteName,
                          date: reportForm.reportDate,
                          material_name: item.material,
                          qty: Math.abs(totalConsump),
                          unit: item.unit || 'Nos',
                          transaction_type: 'Consumption',
                          reference_id: reportId
                        });
                      }
                    }
                  });
                }
              }
            }

            // Finishing Work
            if (wItem.workType === '4. Finishing Work' && wItem.cementBags) {
              ledgerRows.push({
                site_name: reportForm.siteName,
                date: reportForm.reportDate,
                material_name: 'Cement',
                qty: Math.abs(parseFloat(wItem.cementBags) || 0),
                unit: 'Bags',
                transaction_type: 'Consumption',
                reference_id: reportId
              });
            }

          }
        }
      }

      if (ledgerRows.length > 0) {
        const { error: ledgerErr } = await supabase.from('site_material_stock_ledger').insert(ledgerRows);
        if (ledgerErr) {
          console.error("Ledger Insert Error:", ledgerErr);
        }
      }

      await loadReports()
      setReportForm({
        siteName: '',
        reportDate: getTodayString(),
        palingWorkRows: [{ contractorName: '', qty: '', description: '' }],
        contractorRows: [{ contractorName: '', labourCount: '', labourNotes: '', workItems: [{ workType: '', columnSize: '', concreteType: 'RMC', singleCastingQty: '', doubleCastingQty: '', runningFeet: '', height: '', cementBags: '', customWorkName: '', quantity: '', unit: 'NOS' }] }],
        description: ''
      })
      setPreviewData(null)
      
      setModal({ 
        isOpen: true, 
        message: `Report for "${reportForm.siteName.toUpperCase()}" site has been submitted & stock ledger updated successfully.`, 
        onConfirm: () => setModal({ isOpen: false }) 
      });

    } catch (err) {
      setLoading(false)
      const errorMsg = err?.message || 'Unknown error occurred while saving.'
      setModal({ 
        isOpen: true, 
        message: 'Failed to save: ' + errorMsg + '.', 
        onConfirm: () => setModal({ isOpen: false }) 
      });
      setError(errorMsg)
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
    <div style={{ padding: '0px', fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif', color: '#1e293b', maxWidth: '650px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {error && (
        <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '10px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} color="#e11d48" />
          <span style={{ fontSize: '12px', color: '#9f1239', fontWeight: '500' }}>{error}</span>
        </div>
      )}
    
      {activeTab === 'site_report' && (
        <div>
          {/* TOP HEADER CARD WITH BLUE THEME */}
          <div style={{
            background: '#eff6ff',
            borderRadius: '16px', padding: '16px', color: '#1e40af',
            border: '1px solid #bfdbfe',
            marginBottom: '12px', boxSizing: 'border-box',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#2563eb', color: '#ffffff', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={24} />
              </div>
              <div>
                <h1 style={{ margin: '0 0 2px 0', fontSize: '16px', fontWeight: '700', color: '#1e3a8a' }}>
                  Site Daily Report
                </h1>
                <p style={{ margin: 0, fontSize: '11px', color: '#1d4ed8', fontWeight: '500' }}>
                  Manage site daily installation and work progress efficiently
                </p>
              </div>
            </div>
          </div>

          {/* SEPARATE SELECT SITE & DATE CARD */}
          <div style={{ backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '10px', marginBottom: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', boxSizing: 'border-box' }}>
            <div>
              <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '3px', color: '#475569' }}>Select Site *</label>
              <select 
                value={reportForm.siteName} 
                onChange={(e) => setReportForm({...reportForm, siteName: e.target.value})} 
                style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '11px', boxSizing: 'border-box', fontWeight: 'bold' }}
              >
                <option value="">-- Choose Site --</option>
                {sites.map(s => <option key={s.id || s.site_name} value={s.site_name}>{s.site_name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '3px', color: '#475569' }}>Date *</label>
              <div style={{ position: 'relative' }}>
                <input type="date" max={getTodayString()} value={reportForm.reportDate} onChange={(e) => setReportForm({...reportForm, reportDate: e.target.value})} style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box', backgroundColor: '#fff' }} />
              </div>
            </div>
          </div>

  {/* 1. PALING WORK SECTION */}
        <div style={{ backgroundColor: '#faf5ff', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '12px', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)', marginBottom: '12px', boxSizing: 'border-box', width: '100%' }}>
            
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: reportForm.palingWorkRows.length > 0 ? '10px' : '0', borderBottom: reportForm.palingWorkRows.length > 0 ? '2px dashed #cbd5e1' : 'none', paddingBottom: reportForm.palingWorkRows.length > 0 ? '8px' : '0' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#7e22ce', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
              1. PALING WORK (પેલિંગ વર્ક)
            </h4>
            <button type="button" onClick={addPalingWorkRow} style={{ backgroundColor: '#9333ea', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={13} /> Add Source
            </button>
          </div>

          {/* 🌟 જો Add Source બટન દબાવ્યું હશે અને રો હશે તો જ આ દેખાશે */}
          {reportForm.palingWorkRows.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {reportForm.palingWorkRows.map((pRow, pIndex) => (
                <div key={pIndex} style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: pIndex < reportForm.palingWorkRows.length - 1 ? '2px solid #cbd5e1' : 'none', paddingBottom: pIndex < reportForm.palingWorkRows.length - 1 ? '10px' : '0' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', backgroundColor: '#f3e8ff', color: '#6b21a8', padding: '2px 6px', borderRadius: '4px' }}>
                      Source #{pIndex + 1}
                    </span>
                    <button type="button" onClick={() => removePalingWorkRow(pIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                      Remove Source
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <select 
                      value={currentSiteContractors.some(con => con.name === pRow.contractorName) ? pRow.contractorName : (pRow.contractorName ? 'OTHER_CONTRACTOR_MANUAL' : '')} 
                      onClick={handleDropdownClick}
                      onChange={(e) => {
                        const val = e.target.value;
                        const selectedName = e.target.options[e.target.selectedIndex].text;
                        if (val === 'OTHER_CONTRACTOR_MANUAL') {
                          updatePalingRow(pIndex, 'contractorName', 'OTHER_CONTRACTOR_MANUAL');
                        } else if (val !== '') {
                          triggerContractorChange('paling', pIndex, val, selectedName);
                        } else {
                          updatePalingRow(pIndex, 'contractorName', '');
                        }
                      }} 
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box', fontWeight: 'bold' }}
                    >
                      <option value="">-- Select Contractor --</option>
                      {currentSiteContractors.map(con => <option key={con.id} value={con.name}>{con.name}</option>)}
                      <option value="OTHER_CONTRACTOR_MANUAL" style={{ fontWeight: 'bold', color: '#2563eb' }}>➕ Other (Type Manually...)</option>
                    </select>

                    {(pRow.contractorName === 'OTHER_CONTRACTOR_MANUAL' || (!currentSiteContractors.some(con => con.name === pRow.contractorName) && pRow.contractorName !== '')) && (
                      <input 
                        type="text" 
                        placeholder="Type custom contractor name here..." 
                        value={pRow.contractorName === 'OTHER_CONTRACTOR_MANUAL' ? '' : pRow.contractorName} 
                        onChange={(e) => updatePalingRow(pIndex, 'contractorName', e.target.value)} 
                        autoFocus
                        style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #9333ea', fontSize: '11px', backgroundColor: '#f3e8ff', boxSizing: 'border-box' }} 
                      />
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '6px', boxSizing: 'border-box' }}>
                    <input 
                      type="number" 
                      placeholder="Qty" 
                      value={pRow.qty} 
                      onChange={(e) => updatePalingRow(pIndex, 'qty', e.target.value)} 
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box', backgroundColor: '#fff' }} 
                    />
                    <div style={{ backgroundColor: '#f1f5f9', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', textAlign: 'center', fontWeight: 'bold', color: '#475569', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      NOS
                    </div>
                  </div>

                  <input 
                    type="text" 
                    placeholder="Description / Remarks" 
                    value={pRow.description} 
                    onChange={(e) => updatePalingRow(pIndex, 'description', e.target.value)} 
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box', backgroundColor: '#fff' }} 
                  />

                </div>
              ))}
            </div>
          )}

        </div>

          {/* 2. MATERIAL INSTALLATION & LABOUR-WISE DETAIL SECTION */}
          <div style={{ backgroundColor: '#faf5ff', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '12px', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)', marginBottom: '14px', boxSizing: 'border-box', width: '100%' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '2px dashed #cbd5e1', paddingBottom: '8px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#7e22ce', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
                2. Material Installation & Labour-wise Detail
              </h4>
              <button type="button" onClick={addContractorRow} style={{ backgroundColor: '#9333ea', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Plus size={13} /> Add Source
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reportForm.contractorRows.map((cRow, cIndex) => (
                <div key={cIndex} style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderBottom: cIndex < reportForm.contractorRows.length - 1 ? '2px solid #cbd5e1' : 'none', paddingBottom: cIndex < reportForm.contractorRows.length - 1 ? '12px' : '0' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', backgroundColor: '#f3e8ff', color: '#6b21a8', padding: '2px 6px', borderRadius: '4px' }}>
                      Source #{cIndex + 1}
                    </span>
                    {reportForm.contractorRows.length > 1 && (
                      <button type="button" onClick={() => removeContractorRow(cIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                        Remove Source
                      </button>
                    )}
                  </div>

                  {/* Contractor Selection */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <select 
                      value={currentSiteContractors.some(con => con.name === cRow.contractorName) ? cRow.contractorName : (cRow.contractorName ? 'OTHER_CONTRACTOR_MANUAL' : '')} 
                      onClick={handleDropdownClick}
                      onChange={(e) => {
                        const val = e.target.value;
                        const selectedName = e.target.options[e.target.selectedIndex].text;
                        if (val === 'OTHER_CONTRACTOR_MANUAL') {
                          const updated = [...reportForm.contractorRows];
                          updated[cIndex].contractorName = 'OTHER_CONTRACTOR_MANUAL';
                          setReportForm({...reportForm, contractorRows: updated});
                        } else if (val !== '') {
                          triggerContractorChange('material', cIndex, val, selectedName);
                        } else {
                          const updated = [...reportForm.contractorRows];
                          updated[cIndex].contractorName = '';
                          setReportForm({...reportForm, contractorRows: updated});
                        }
                      }} 
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box', fontWeight: 'bold' }}
                    >
                      <option value="">-- Select Contractor --</option>
                      {currentSiteContractors.map(con => <option key={con.id} value={con.name}>{con.name}</option>)}
                      <option value="OTHER_CONTRACTOR_MANUAL" style={{ fontWeight: 'bold', color: '#2563eb' }}>➕ Other (Type Manually...)</option>
                    </select>

                    {(cRow.contractorName === 'OTHER_CONTRACTOR_MANUAL' || (!currentSiteContractors.some(con => con.name === cRow.contractorName) && cRow.contractorName !== '')) && (
                      <input 
                        type="text" 
                        placeholder="Type custom contractor name here..." 
                        value={cRow.contractorName === 'OTHER_CONTRACTOR_MANUAL' ? '' : cRow.contractorName} 
                        onChange={(e) => {
                          const updated = [...reportForm.contractorRows];
                          updated[cIndex].contractorName = e.target.value;
                          setReportForm({...reportForm, contractorRows: updated});
                        }} 
                        autoFocus
                        style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #9333ea', fontSize: '11px', backgroundColor: '#f3e8ff', boxSizing: 'border-box' }} 
                      />
                    )}
                  </div>

                  {/* Labour Count & Notes */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', boxSizing: 'border-box' }}>
                    <input 
                      type="number" 
                      placeholder="Labour Count" 
                      value={cRow.labourCount} 
                      onChange={(e) => {
                        const updated = [...reportForm.contractorRows];
                        updated[cIndex].labourCount = e.target.value;
                        setReportForm({...reportForm, contractorRows: updated});
                      }} 
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box', backgroundColor: '#fff' }} 
                    />
                    <input 
                      type="text" 
                      placeholder="Labour Notes" 
                      value={cRow.labourNotes} 
                      onChange={(e) => {
                        const updated = [...reportForm.contractorRows];
                        updated[cIndex].labourNotes = e.target.value;
                        setReportForm({...reportForm, contractorRows: updated});
                      }} 
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box', backgroundColor: '#fff' }} 
                    />
                  </div>

                  {/* Types of Work Sub-section */}
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#6b21a8', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Types of Work</span>
                    {cRow.workItems.map((wItem, wIndex) => (
                      <div key={wIndex} style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px dashed #cbd5e1' }}>
                        
                        {/* Work Type Dropdown */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <select 
  value={wItem.workType} 
  onClick={handleDropdownClick}
  onChange={(e) => {
    const val = e.target.value;
    const updated = [...reportForm.contractorRows];
    updated[cIndex].workItems[wIndex].workType = val;
    setReportForm({...reportForm, contractorRows: updated});
if (val === '2. Column Concrete') {
  setModal({
    isOpen: true,
    message: 'કૃપા કરીને કોંક્રિટ માટે સોર્સ પસંદ કરો:',
    confirmText: 'RMC',           // આ હોવું જરૂરી છે
    cancelText: 'Manual Mix',      // આ હોવું જરૂરી છે
    confirmColor: '#16a34a',       // Green
    cancelColor: '#2563eb',        // Blue
    cancelTextColor: '#fff',
    onConfirm: () => {
      const updated = [...reportForm.contractorRows];
      updated[cIndex].workItems[wIndex].concreteType = 'RMC';
      setReportForm({...reportForm, contractorRows: updated});
      setModal({ isOpen: false });
    },
    onCancel: () => {
      const updated = [...reportForm.contractorRows];
      updated[cIndex].workItems[wIndex].concreteType = 'Manual';
      setReportForm({...reportForm, contractorRows: updated});
      setModal({ isOpen: false });
    }
  });
}
  }} 
  style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box', fontWeight: 'bold' }}
>
  <option value="">-- Select Type of Work --</option>
  <option value="1. Column Installation">1. Column Installation</option>
  <option value="2. Column Concrete">2. Column Concrete</option>
  <option value="3. Panel Erection">3. Panel Erection</option>
  <option value="4. Finishing Work">4. Finishing Work</option>
  <option value="Other">Other (Manual)</option>
</select>

                          {cRow.workItems.length > 1 && (
                            <button type="button" onClick={() => removeWorkItemFromContractor(cIndex, wIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px', marginLeft: '6px' }}><Trash2 size={13} /></button>
                          )}
                        </div>

                        {/* Condition 1 & 3: Column Installation / Panel Erection (ALL IN ONE ROW) */}
                        {(wItem.workType === '1. Column Installation' || wItem.workType === '3. Panel Erection') && (
                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '6px', boxSizing: 'border-box', alignItems: 'center' }}>
                            <select 
                              value={wItem.columnSize} 
                              onChange={(e) => {
                                const updated = [...reportForm.contractorRows];
                                updated[cIndex].workItems[wIndex].columnSize = e.target.value;
                                setReportForm({...reportForm, contractorRows: updated});
                              }} 
                              style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}
                            >
                              <option value="">-- Select Size --</option>
                            {currentSiteMaterials
  .filter(m => {
    const matName = m.name.toLowerCase();
    // 🌟 1. જો Column સિલેક્ટ કર્યું હોય તો માત્ર Column વાળા જ મટીરિયલ બતાવો
    if (wItem.workType === '1. Column Installation') {
      return matName.includes('column');
    }
    // 🌟 2. જો Panel સિલેક્ટ કર્યું હોય તો માત્ર Panel વાળા જ મટીરિયલ બતાવો
    if (wItem.workType === '3. Panel Erection') {
      return matName.includes('panel');
    }
    return false;
  })
  .map(m => {
    // 🌟 3. નામમાંથી 'Column' અથવા 'Panel' શબ્દ કાઢી નાખો 
    let sizeOnly = m.name.replace(/column/i, '').replace(/panel/i, '').trim();
    
    // 🌟 4. જો (3mm - 3 wires) જેવી બ્રેકેટવાળી કોઈ ડિટેલ હજુ આવતી હોય, તો એને પણ કાઢી નાખો
    sizeOnly = sizeOnly.replace(/\s*\(.*?\)\s*/g, '').trim();

    return (
      <option key={m.id} value={sizeOnly}>
        {sizeOnly}
      </option>
    );
  })
}
                              <option value="Other">Other Size</option>
                            </select>

                            <input 
                              type="number" 
                              placeholder="Qty" 
                              value={wItem.quantity} 
                              onChange={(e) => {
                                const updated = [...reportForm.contractorRows];
                                updated[cIndex].workItems[wIndex].quantity = e.target.value;
                                setReportForm({...reportForm, contractorRows: updated});
                              }} 
                              style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box', backgroundColor: '#fff' }} 
                            />

                            <div style={{ backgroundColor: '#f1f5f9', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', textAlign: 'center', fontWeight: 'bold', color: '#475569', boxSizing: 'border-box' }}>
                              NOS
                            </div>
                          </div>
                        )}

                        {/* Condition 2: Column Concrete */}
                        {wItem.workType === '2. Column Concrete' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                              <span>Concrete Source:</span>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                <input 
                                  type="radio" 
                                  name={`concrete_${cIndex}_${wIndex}`} 
                                  value="RMC" 
                                  checked={wItem.concreteType === 'RMC'} 
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setModal({
                                      isOpen: true,
                                      message: 'તમે RMC સિલેક્ટ કર્યું છે. BOM મુજબ અંદાજિત કેટલું કોંક્રિટ જોઈશે તેની ગણતરી લાગુ થશે.',
                                      onConfirm: () => setModal({ isOpen: false })
                                    });
                                    const updated = [...reportForm.contractorRows];
                                    updated[cIndex].workItems[wIndex].concreteType = val;
                                    setReportForm({...reportForm, contractorRows: updated});
                                  }} 
                                /> RMC
                             </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
        <input 
          type="radio" 
          name={`concrete_${cIndex}_${wIndex}`} 
          value="Manual" 
          checked={wItem.concreteType === 'Manual'} 
          onChange={(e) => {
            const updated = [...reportForm.contractorRows];
            updated[cIndex].workItems[wIndex].concreteType = e.target.value;
            setReportForm({...reportForm, contractorRows: updated});
          }} 
        /> Manual Mix
      </label>
    </div>

{/* Single Column Casting */}
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '6px', alignItems: 'center' }}>
      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b21a8' }}>Single Column Casting</span>
      <input 
        type="number" 
        placeholder="Qty" 
        value={wItem.singleCastingQty || ''} 
    onChange={(e) => {
          const updated = [...reportForm.contractorRows];
          const qty = parseFloat(e.target.value) || 0;
          updated[cIndex].workItems[wIndex].singleCastingQty = e.target.value; // (ડબલ કોલમમાં doubleCastingQty રાખવું)
          
          const singleQty = parseFloat(updated[cIndex].workItems[wIndex].singleCastingQty) || 0;
          const doubleQty = parseFloat(updated[cIndex].workItems[wIndex].doubleCastingQty) || 0;
          
          // ૧. સિંગલ કોલમ માટે BOM અને સિમેન્ટ શોધો
          const matchedSingleBom = siteBoms.find(b => 
            b.site_name === reportForm.siteName && 
            b.work_name && b.work_name.toLowerCase().includes('sing')
          );
          const singleM3 = matchedSingleBom && matchedSingleBom.expected_m3 ? Number(matchedSingleBom.expected_m3) : 0;
          
          let singleCement = 0;
          if (matchedSingleBom && Array.isArray(matchedSingleBom.bom_items)) {
            const cementItem = matchedSingleBom.bom_items.find(item => item.material && item.material.toLowerCase().includes('cement'));
            if (cementItem && cementItem.consumption) {
              singleCement = Number(cementItem.consumption);
            }
          }

          // ૨. ડબલ કોલમ માટે BOM અને સિમેન્ટ શોધો
          const matchedDoubleBom = siteBoms.find(b => 
            b.site_name === reportForm.siteName && 
            b.work_name && b.work_name.toLowerCase().includes('double')
          );
          const doubleM3 = matchedDoubleBom && matchedDoubleBom.expected_m3 ? Number(matchedDoubleBom.expected_m3) : 0;
          
          let doubleCement = 0;
          if (matchedDoubleBom && Array.isArray(matchedDoubleBom.bom_items)) {
            const cementItem = matchedDoubleBom.bom_items.find(item => item.material && item.material.toLowerCase().includes('cement'));
            if (cementItem && cementItem.consumption) {
              doubleCement = Number(cementItem.consumption);
            }
          }

          // ૩. RMC કે Manual મુજબ વેલ્યુ સેટ કરવી
          if (updated[cIndex].workItems[wIndex].concreteType === 'RMC') {
            updated[cIndex].workItems[wIndex].expectedBomQty = ((singleQty * singleM3) + (doubleQty * doubleM3)).toFixed(3);
          } else {
            updated[cIndex].workItems[wIndex].expectedCement = Math.ceil((singleQty * singleCement) + (doubleQty * doubleCement));
          }

          setReportForm({...reportForm, contractorRows: updated});
        }}
        style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }} 
      />
    </div>

   {/* Double Column Casting */}
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '6px', alignItems: 'center' }}>
      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b21a8' }}>Double Column Casting</span>
      <input 
        type="number" 
        placeholder="Qty" 
        value={wItem.doubleCastingQty || ''} 
        onChange={(e) => {
          const updated = [...reportForm.contractorRows];
          const qty = parseFloat(e.target.value) || 0;
          updated[cIndex].workItems[wIndex].doubleCastingQty = e.target.value; // 👈 હવે ડબલ કોલમ પરફેક્ટ અપડેટ થશે
          
          const singleQty = parseFloat(updated[cIndex].workItems[wIndex].singleCastingQty) || 0;
          const doubleQty = qty;
          
          const matchedSingleBom = siteBoms.find(b => 
            b.site_name === reportForm.siteName && 
            b.work_name && b.work_name.toLowerCase().includes('single')
          );
          const singleM3 = matchedSingleBom && matchedSingleBom.expected_m3 ? Number(matchedSingleBom.expected_m3) : 0;
          
          let singleCement = 0;
          if (matchedSingleBom && Array.isArray(matchedSingleBom.bom_items)) {
            const cementItem = matchedSingleBom.bom_items.find(item => item.material && item.material.toLowerCase().includes('cement'));
            if (cementItem && cementItem.consumption) {
              singleCement = Number(cementItem.consumption);
            }
          }

          const matchedDoubleBom = siteBoms.find(b => 
            b.site_name === reportForm.siteName && 
            b.work_name && b.work_name.toLowerCase().includes('double')
          );
          const doubleM3 = matchedDoubleBom && matchedDoubleBom.expected_m3 ? Number(matchedDoubleBom.expected_m3) : 0;
          
          let doubleCement = 0;
          if (matchedDoubleBom && Array.isArray(matchedDoubleBom.bom_items)) {
            const cementItem = matchedDoubleBom.bom_items.find(item => item.material && item.material.toLowerCase().includes('cement'));
            if (cementItem && cementItem.consumption) {
              doubleCement = Number(cementItem.consumption);
            }
          }

          if (updated[cIndex].workItems[wIndex].concreteType === 'RMC') {
            updated[cIndex].workItems[wIndex].expectedBomQty = ((singleQty * singleM3) + (doubleQty * doubleM3)).toFixed(3);
          } else {
            updated[cIndex].workItems[wIndex].expectedCement = Math.ceil((singleQty * singleCement) + (doubleQty * doubleCement));
          }

          setReportForm({...reportForm, contractorRows: updated});
        }} 
        style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }} 
      />
    </div>

    {/* Dynamic Display (RMC Expected vs Actual OR Manual Expected Cement vs Actual) */}
    {wItem.concreteType === 'RMC' ? (
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '4px', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#16a34a' }}>RMC (Expect vs Actual)</span>
        {/* Expected BOM Qty (Main Box - Readonly or Auto) */}
        <input 
          type="text" 
          placeholder="Expect Cu.M" 
          value={wItem.expectedBomQty || '0.000'} 
          readOnly 
          style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #16a34a', fontSize: '11px', backgroundColor: '#f0fdf4', boxSizing: 'border-box', fontWeight: 'bold', textAlign: 'center' }} 
        />
        {/* Actual Qty Input Box */}
        <input 
          type="number" 
          step="any"
          placeholder="Actual Qty" 
          value={wItem.actualRmcQty || ''} 
          onChange={(e) => {
            const updated = [...reportForm.contractorRows];
            updated[cIndex].workItems[wIndex].actualRmcQty = e.target.value;
            setReportForm({...reportForm, contractorRows: updated});
          }} 
          style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #2563eb', fontSize: '11px', backgroundColor: '#eff6ff', boxSizing: 'border-box', fontWeight: 'bold', textAlign: 'center' }} 
        />
      </div>
    ) : (
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '4px', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#2563eb' }}>Cement (Expect vs Actual)</span>
        {/* Expected BOM Cement Use (Main Box - Readonly or Auto) */}
        <input 
          type="text" 
          placeholder="Expect Bags" 
          value={wItem.expectedCement || '0'} 
          readOnly 
          style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #2563eb', fontSize: '11px', backgroundColor: '#eff6ff', boxSizing: 'border-box', fontWeight: 'bold', textAlign: 'center' }} 
        />
        {/* Actual Cement Qty Input Box */}
        <input 
          type="number" 
          placeholder="Actual Bags" 
          value={wItem.actualCementBags || ''} 
          onChange={(e) => {
            const updated = [...reportForm.contractorRows];
            updated[cIndex].workItems[wIndex].actualCementBags = e.target.value;
            setReportForm({...reportForm, contractorRows: updated});
          }} 
          style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #9333ea', fontSize: '11px', backgroundColor: '#f3e8ff', boxSizing: 'border-box', fontWeight: 'bold', textAlign: 'center' }} 
        />
      </div>
    )}

  </div>
)}
{/* Condition 4: Finishing Work (All in 1 Row) */}
{wItem.workType === '4. Finishing Work' && (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', boxSizing: 'border-box', alignItems: 'center' }}>
    <input 
      type="number" 
      placeholder="Run. Feet" 
      value={wItem.runningFeet} 
      onChange={(e) => {
        const updated = [...reportForm.contractorRows];
        updated[cIndex].workItems[wIndex].runningFeet = e.target.value;
        setReportForm({...reportForm, contractorRows: updated});
      }} 
      style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }} 
    />
    <input 
      type="number" 
      placeholder="Height" 
      value={wItem.height} 
      onChange={(e) => {
        const updated = [...reportForm.contractorRows];
        updated[cIndex].workItems[wIndex].height = e.target.value;
        setReportForm({...reportForm, contractorRows: updated});
      }} 
      style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }} 
    />
    <input 
      type="number" 
      placeholder="Used Cement Bags" 
      value={wItem.cementBags} 
      onChange={(e) => {
        const updated = [...reportForm.contractorRows];
        updated[cIndex].workItems[wIndex].cementBags = e.target.value;
        setReportForm({...reportForm, contractorRows: updated});
      }} 
      style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }} 
    />
  </div>
)}

                      {/* Condition Other / Manual (With UOM Dropdown) */}
{wItem.workType === 'Other' && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <input 
      type="text" 
      placeholder="Custom work name..." 
      value={wItem.customWorkName} 
      onChange={(e) => {
        const updated = [...reportForm.contractorRows];
        updated[cIndex].workItems[wIndex].customWorkName = e.target.value;
        setReportForm({...reportForm, contractorRows: updated});
      }} 
      style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #9333ea', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }} 
    />
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '6px', boxSizing: 'border-box' }}>
      <input 
        type="number" 
        placeholder="Qty" 
        value={wItem.quantity} 
        onChange={(e) => {
          const updated = [...reportForm.contractorRows];
          updated[cIndex].workItems[wIndex].quantity = e.target.value;
          setReportForm({...reportForm, contractorRows: updated});
        }} 
        style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box', backgroundColor: '#fff' }} 
      />
      <select 
        value={wItem.unit} 
        onChange={(e) => {
          const updated = [...reportForm.contractorRows];
          updated[cIndex].workItems[wIndex].unit = e.target.value;
          setReportForm({...reportForm, contractorRows: updated});
        }} 
        style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box', fontWeight: 'bold' }}
      >
        {UOM_OPTIONS.map(uom => <option key={uom} value={uom}>{uom}</option>)}
      </select>
    </div>
  </div>
)}

                      </div>
                    ))}
                    <button type="button" onClick={() => addWorkItemToContractor(cIndex)} style={{ backgroundColor: '#9333ea', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold', marginTop: '4px' }}>+ Add Work Type</button>
                  </div>

                </div>
              ))}
            </div>

          </div>

         {/* Extra Remarks */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '10px', marginBottom: '12px', boxSizing: 'border-box' }}>
            <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '3px', color: '#475569' }}>Additional Remarks</label>
            <textarea rows="2" value={reportForm.description} onChange={(e) => setReportForm({...reportForm, description: e.target.value})} placeholder="Enter any extra notes..." style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
          </div>

         {/* 🌟 Site Progress Photos (Direct Camera & Multiple Upload with Delete Option) */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '10px', marginBottom: '14px', boxSizing: 'border-box' }}>
            <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px', color: '#475569' }}>
              📷 Site Progress Photos (Direct Camera / Gallery)
            </label>
            
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              multiple 
              onChange={(e) => {
                const files = Array.from(e.target.files);
                setReportForm({ ...reportForm, sitePhotos: [...(reportForm.sitePhotos || []), ...files] });
              }}
              style={{ width: '100%', fontSize: '11px', padding: '8px', border: '1px dashed #2563eb', borderRadius: '6px', backgroundColor: '#eff6ff', cursor: 'pointer' }}
            />

            {/* સિલેક્ટ થયેલા ફોટાઓની યાદી અને ડિલીટ બટન */}
            {reportForm.sitePhotos && reportForm.sitePhotos.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#16a34a' }}>
                  ✅ {reportForm.sitePhotos.length} photo(s) selected:
                </span>
                
                {reportForm.sitePhotos.map((file, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%', color: '#334155' }}>
                      📄 {file.name}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => {
                        const updatedPhotos = reportForm.sitePhotos.filter((_, i) => i !== index);
                        setReportForm({ ...reportForm, sitePhotos: updatedPhotos });
                      }}
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', padding: '2px 6px' }}
                    >
                      ❌ Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
   <div style={{ display: 'flex', gap: '8px', boxSizing: 'border-box' }}>
                      <button type="button" disabled={loading} onClick={handleCombinedReportPreview} style={{ backgroundColor: loading ? '#94a3b8' : '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', flex: 1, fontSize: '12px' }}>
                        {loading ? 'Processing...' : 'Review & Submit Report'}
                      </button>
                     
                    </div>
               
          {/* Filter & Submitted DPR section below */}
          <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '10px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '10px', fontWeight: '700', color: '#475569' }}>
              <Filter size={12} color="#2563eb" /> SUBMITTED DPR (Recent-7 log)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '8px', fontWeight: '600', color: '#64748b', marginBottom: '2px' }}>SELECT SITE</label>
                <select value={filterSite} onChange={(e) => setFilterSite(e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '10px', backgroundColor: '#fff', fontWeight: '500', boxSizing: 'border-box' }}>
                  <option value="all">🌐 All Sites</option>
                  {sites.map(s => <option key={s.id || s.site_name} value={s.site_name}>{s.site_name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '8px', fontWeight: '600', color: '#64748b', marginBottom: '2px' }}>REPORT DATE</label>
                <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={{ width: '100%', padding: '5px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '10px', boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>

          {/* Historical Reports */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
           {filteredReports.slice(0, 7).map(r => (
              <div key={r.id} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '11px' }}>{r.site_name}</span>
                  <span style={{ fontSize: '9px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 5px', borderRadius: '4px' }}>
                    📅 {r.report_date ? r.report_date.split('-').reverse().join('/') : ''}
                  </span>
                </div>
                {r.description && <p style={{ fontSize: '10px', color: '#475569', margin: '2px 0' }}>📝 {r.description}</p>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px', paddingTop: '3px', borderTop: '1px solid #f1f5f9', fontSize: '8px', color: '#64748b' }}>
                  <span>👤 {r.user_id || 'N/A'}</span>
                  <span>🕒 {r.created_at ? new Date(r.created_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase() : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FULL PREVIEW / CONFIRMATION MODAL */}
      {previewData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', boxSizing: 'border-box', backdropFilter: 'blur(2px)' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '500px', maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 4px 0', color: '#0f172a' }}>
                🔍 Final Report Preview
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Please verify all details carefully before submitting.</p>
            </div>
            
            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                <div><span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Site Name</span><strong style={{ color: '#0f172a' }}>{previewData.site}</strong></div>
                <div><span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Report Date</span><strong style={{ color: '#0f172a' }}>{previewData.date}</strong></div>
              </div>
              {previewData.details?.description && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontSize: '12px', color: '#334155' }}>
                  <strong>Remarks:</strong> {previewData.details.description}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
              <button disabled={loading} onClick={() => { confirmAndSave(); }} style={{ flex: 1, padding: '12px', backgroundColor: loading ? '#94a3b8' : '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px' }}>
                {loading ? 'Saving Data...' : '✅ Confirm & Save'}
              </button>
              <button disabled={loading} onClick={() => setPreviewData(null)} style={{ flex: 1, padding: '12px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px' }}>
                Cancel & Edit
              </button>
            </div>
          </div>
        </div>
      )}

     <ConfirmModal 
        isOpen={modal.isOpen} 
        message={modal.message} 
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
        confirmColor={modal.confirmColor}
        cancelColor={modal.cancelColor}
        cancelTextColor={modal.cancelTextColor}
        onConfirm={modal.onConfirm || (() => setModal({ isOpen: false }))} 
        onCancel={modal.onCancel || (() => setModal({ isOpen: false }))} 
      />

    </div>
  )
}

export default SupervisorDashboard