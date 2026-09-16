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
  const [workDescriptions, setWorkDescriptions] = useState([]) 
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [filterSite, setFilterSite] = useState('all')
  const [filterDate, setFilterDate] = useState('')
  const [previewData, setPreviewData] = useState(null)
  const [reports, setReports] = useState([])
  const [showReportForm, setShowReportForm] = useState(false)
  const [modal, setModal] = useState({ isOpen: false, message: '', onConfirm: null });

  // આજની તારીખ કાઢવા માટેનું ફંક્શન (ભવિષ્યની તારીખ રોકવા)
  const getTodayString = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const [reportForm, setReportForm] = useState({
    siteName: '',
    reportDate: getTodayString(),
    palingWorkRows: [{ contractorName: '', qty: '', nos: '', description: '' }], 
    contractorRows: [{ contractorName: '', labourCount: '', labourNotes: '', materials: [{ material: '', customMaterialName: '', quantity: '', unit: 'NOS' }] }],
    finalWorkRows: [{ contractorName: '', runningFeet: '', height: '', workDesc: '', customWorkDesc: '' }],
    description: ''
  })

  const [siteProgressPhotos, setSiteProgressPhotos] = useState([])

  const UOM_OPTIONS = ["NOS", "Bags", "KG", "Ton", "Ltr"]

  useEffect(() => {
    loadSites()
    loadContractors()
    loadMaterialsMaster()
    loadWorkDescriptions()
    loadReports()
  }, [])

  // Image Compression Function
  const compressImage = (file) => {
    return new Promise((resolve) => {
      if (!file || !(file instanceof Blob || file instanceof File)) {
        resolve(file);
        return;
      }
      if (file.type === 'application/pdf') {
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (!blob) { resolve(file); return; }
            const compressedFile = new File([blob], file.name || 'image.jpg', {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          }, 'image/jpeg', 0.7);
        };
        img.onerror = () => resolve(file);
      };
    });
  };

  const deleteFileFromStorage = async (fileUrl) => {
    try {
      if (!fileUrl || typeof fileUrl !== 'string') return;
      
      let filePath = '';
      if (fileUrl.includes('/site-photos/')) {
        filePath = fileUrl.split('/site-photos/')[1];
      } else {
        filePath = fileUrl;
      }

      if (filePath.includes('?')) {
        filePath = filePath.split('?')[0];
      }

      if (filePath) {
        const { error } = await supabase.storage.from('site-photos').remove([filePath]);
        if (error) {
          console.error("Storage delete error:", error.message);
        }
      }
    } catch (err) {
      console.error("Error deleting file from storage:", err);
    }
  };

  const uploadFilesToSupabase = async (fileArray, folderName) => {
    if (!fileArray || !Array.isArray(fileArray)) return [];
    let urls = [];
    
    const sitePrefix = reportForm.siteName ? reportForm.siteName.replace(/\s+/g, '_').toLowerCase() : 'unknown';
    const datePrefix = reportForm.reportDate || 'date';

    for (let i = 0; i < fileArray.length; i++) {
      let file = fileArray[i];
      
      if (file instanceof File) {
        const compressedFile = await compressImage(file);
        const fileExt = compressedFile.name ? compressedFile.name.split('.').pop() : 'jpg';
        
        const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(7)}_${i}`;
        const fileName = `${folderName}/${sitePrefix}_${datePrefix}_${uniqueSuffix}.${fileExt}`;
        
        const { data, error } = await supabase.storage.from('site-photos').upload(fileName, compressedFile);
        if (!error && data) {
          const { data: { publicUrl } } = supabase.storage.from('site-photos').getPublicUrl(fileName);
          urls.push(publicUrl);
        }
      } else if (typeof file === 'string') {
        urls.push(file); 
      }
    }
    return urls;
  };

  // 1. Auto-Save Draft
  useEffect(() => {
    if (!showReportForm || !reportForm.siteName || !user?.id) return;

    const timer = setTimeout(async () => {
      try {
        let hasFileChanges = false; 

        const updatedProgressPhotos = await uploadFilesToSupabase(siteProgressPhotos, 'site_progress');
        if (JSON.stringify(updatedProgressPhotos) !== JSON.stringify(siteProgressPhotos)) hasFileChanges = true;

        await supabase.from('site_drafts').upsert({
          user_id: user.id,
          site_id: reportForm.siteName,
          report_data: { 
            ...reportForm, 
            draftPhotoUrls: updatedProgressPhotos 
          },
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, site_id' });

        if (hasFileChanges) {
          setSiteProgressPhotos(updatedProgressPhotos);
        }

      } catch (err) {
        console.error("Draft auto-save error:", err);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [reportForm, showReportForm, siteProgressPhotos, user]);

  const isFormEmpty = () => {
    const hasPaling = reportForm.palingWorkRows.some(p => p.qty && parseFloat(p.qty) > 0);
    const hasContractor = reportForm.contractorRows.some(c => (c.labourCount && parseFloat(c.labourCount) > 0) || c.materials.some(m => m.quantity && parseFloat(m.quantity) > 0));
    const hasFinalWork = reportForm.finalWorkRows.some(f => (f.runningFeet && parseFloat(f.runningFeet) > 0) || (f.height && parseFloat(f.height) > 0));
    const hasPhotos = siteProgressPhotos.length > 0;
    const hasDescription = reportForm.description.trim().length > 0;

    return !(hasPaling || hasContractor || hasFinalWork || hasPhotos || hasDescription);
  };

  // 2. ConfirmAndSave
  const confirmAndSave = async () => {
    setLoading(true)
    setError('')
    try {
      const supervisorEmail = user?.email || 'Supervisor'

      let sitePhotoUrls = []
      for (let file of siteProgressPhotos) {
        if (file instanceof File) {
          const compressedFile = await compressImage(file)
          const fileExt = compressedFile.name.split('.').pop()
          const fileName = `site_progress/site_prog_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
          const { error: uploadError } = await supabase.storage.from('site-photos').upload(fileName, compressedFile)
          if (uploadError) throw new Error("Progress photo upload failed: " + uploadError.message)
          const { data: { publicUrl } } = supabase.storage.from('site-photos').getPublicUrl(fileName)
          sitePhotoUrls.push(publicUrl)
        } else if (typeof file === 'string') {
          sitePhotoUrls.push(file)
        }
      }

      const { error: repError } = await supabase.from('daily_reports').insert([{
        site_name: reportForm.siteName,
        contractor_details: reportForm.contractorRows,
        paling_work: reportForm.palingWorkRows,
        damage_items: [],
        final_work: reportForm.finalWorkRows,
        description: reportForm.description,
        photo_urls: sitePhotoUrls,
        report_date: reportForm.reportDate,
        user_id: supervisorEmail
      }])
      if (repError) throw new Error("Daily report insert failed: " + repError.message)

      await supabase
        .from('site_drafts')
        .delete()
        .eq('user_id', user.id)
        .eq('site_id', reportForm.siteName);

      await loadReports()
      setShowReportForm(false)
      setReportForm({
        siteName: '',
        reportDate: getTodayString(),
        palingWorkRows: [{ contractorName: '', qty: '', nos: '', description: '' }],
        contractorRows: [{ contractorName: '', labourCount: '', labourNotes: '', materials: [{ material: '', customMaterialName: '', quantity: '', unit: 'NOS' }] }],
        finalWorkRows: [{ contractorName: '', runningFeet: '', height: '', workDesc: '', customWorkDesc: '' }],
        description: ''
      })
      setSiteProgressPhotos([])
      setPreviewData(null)
      
      setModal({ 
        isOpen: true, 
        message: `Report for "${reportForm.siteName.toUpperCase()}" site has been submitted successfully.`, 
        onConfirm: () => setModal({ isOpen: false }) 
      });

    } catch (err) {
      setLoading(false)
      const errorMsg = err?.message || 'Unknown error occurred while saving.'
      setModal({ 
        isOpen: true, 
        message: 'Failed to save: ' + errorMsg + '. Your data is NOT lost, please try submitting again.', 
        onConfirm: () => setModal({ isOpen: false }) 
      });
      setError(errorMsg)
    } finally {
      setLoading(false)
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

  const loadMaterialsMaster = async () => {
    const { data, error } = await supabase.from('site_materials_master').select('*');
    if (!error) setMaterialsMaster(data || []);
  }

  const loadWorkDescriptions = async () => {
    try {
      const { data, error } = await supabase.from('site_work_descriptions').select('*');
      if (!error) setWorkDescriptions(data || []);
    } catch (err) {
      setWorkDescriptions([]);
    }
  }

  const loadReports = async () => {
    const { data } = await supabase.from('daily_reports').select('*').order('created_at', { ascending: false })
    setReports(data || [])
  }

  const currentSiteContractors = contractors.filter(c => c.site_name === reportForm.siteName || c.site_name === 'All Sites (General)')
  const currentSiteMaterials = materialsMaster.filter(m => m.site_name === reportForm.siteName || m.site_name === 'All Sites (General)')
  const currentSiteWorkDescriptions = workDescriptions.filter(w => w.site_name === reportForm.siteName || w.site_name === 'All Sites (General)')

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
        } else if (type === 'final') {
          const updated = [...reportForm.finalWorkRows];
          updated[index].contractorName = newValue;
          setReportForm({...reportForm, finalWorkRows: updated});
        }
        setModal({ isOpen: false, message: '', onConfirm: null });
      },
      onCancel: () => setModal({ isOpen: false })
    });
  };

  const addPalingWorkRow = () => setReportForm({...reportForm, palingWorkRows: [...reportForm.palingWorkRows, { contractorName: '', qty: '', nos: '', description: '' }]})
  const removePalingWorkRow = (index) => setReportForm({...reportForm, palingWorkRows: reportForm.palingWorkRows.filter((_, i) => i !== index)})

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

  const addFinalWorkRow = () => setReportForm({...reportForm, finalWorkRows: [...reportForm.finalWorkRows, { contractorName: '', runningFeet: '', height: '', workDesc: '', customWorkDesc: '' }]})
  const removeFinalWorkRow = (index) => setReportForm({...reportForm, finalWorkRows: reportForm.finalWorkRows.filter((_, i) => i !== index)})

  const handleCombinedReportPreview = () => {
    if (!reportForm.siteName) {
      setModal({ isOpen: true, message: 'કૃપા કરીને સાઇટ સિલેક્ટ કરો!', onConfirm: () => setModal({ isOpen: false }) });
      return
    }

    if (isFormEmpty()) {
      setModal({ isOpen: true, message: '⚠️ ફોર્મ ખાલી છે! સબમિટ કરવા માટે કૃપા કરીને કોઈ વિગત ભરો.', onConfirm: () => setModal({ isOpen: false }) });
      return;
    }

    setPreviewData({
      title: 'Complete Site Daily Report Preview',
      site: reportForm.siteName,
      date: reportForm.reportDate,
      details: reportForm,
      sitePhotosCount: siteProgressPhotos.length
    })
  }

  const filteredReports = reports.filter(r => {
    const matchSite = filterSite === 'all' || r.site_name === filterSite
    const matchDate = !filterDate || r.report_date === filterDate
    return matchSite && matchDate
  })

  return (
    <div style={{ padding: '0px 8px 8px 8px', fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif', color: '#1e293b', maxWidth: '100%', boxSizing: 'border-box' }}>
      
      {/* STICKY UNIQUE HEADER BOX */}
      <div style={{ position: 'sticky', top: '64px', zIndex: 20, backgroundColor: '#f8fafc', paddingBottom: '6px', paddingTop: '8px', marginTop: '-8px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '16px', padding: '14px 18px', color: 'white',
          boxShadow: '0 8px 20px -6px rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.1)',
          position: 'relative', overflow: 'hidden', flexShrink: 0, boxSizing: 'border-box'
        }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '90px', height: '90px', background: '#3b82f6', filter: 'blur(40px)', opacity: 0.4, borderRadius: '50%' }}></div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', opacity: 0.9, position: 'relative' }}>
            <span style={{ fontSize: '14px' }}>⚡</span>
            <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.6px', textTransform: 'uppercase', color: '#ffffff' }}>T&J Infra Portal</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
            <FileText size={20} color="#ffffff" />
            <h1 style={{ margin: '2px 0 8px 0', fontSize: '20px', fontWeight: '700', letterSpacing: '0.8px', color: '#ffffff' }}>
              Site Daily Progress Report
            </h1>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', position: 'relative', fontSize: '10px', color: '#94a3b8' }}>
            <span>Status: Active & Live</span>
            <span>DPR Terminal</span>
          </div>
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
          {!showReportForm && (
            <>
              <div style={{ 
                position: 'sticky', 
                top: '180px', 
                zIndex: 20, 
                display: 'flex', 
                justifyContent: 'center', 
                marginBottom: '12px', 
                boxSizing: 'border-box',
                backgroundColor: '#f8f9fa', 
                padding: '8px 0',         
                width: '100%'
              }}>
                <button 
                  onClick={() => {
                    setReportForm({
                      siteName: '',
                      reportDate: getTodayString(),
                      palingWorkRows: [{ contractorName: '', qty: '', nos: '', description: '' }],
                      contractorRows: [{ contractorName: '', labourCount: '', labourNotes: '', materials: [{ material: '', customMaterialName: '', quantity: '', unit: 'NOS' }] }],
                      finalWorkRows: [{ contractorName: '', runningFeet: '', height: '', workDesc: '', customWorkDesc: '' }],
                      description: ''
                    });
                    setSiteProgressPhotos([]);
                    setShowReportForm(true);
                  }} 
                  style={{ 
                    background: 'linear-gradient(135deg, #0c9151 0%, #036f29 100%)', 
                    color: '#fff', 
                    border: 'none', 
                    padding: '10px 22px', 
                    borderRadius: '50px', 
                    fontWeight: '700', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '6px', 
                    fontSize: '12px', 
                    cursor: 'pointer', 
                    boxShadow: '0 4px 15px rgba(58, 85, 237, 0.35)',
                    letterSpacing: '0.3px'
                  }}
                >
                  <Plus size={15} /> New Site Report
                </button>
              </div>

              {/* Filter Section */}
              <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '12px', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '11px', fontWeight: '700', color: '#475569', }}>
                  <Filter size={13} color="#2563eb" /> SUMBITED DPR (Recent-7 log)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '9px', fontWeight: '600', color: '#64748b', marginBottom: '3px' }}>SELECT SITE</label>
                    <select value={filterSite} onChange={(e) => setFilterSite(e.target.value)} style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', fontWeight: '500', boxSizing: 'border-box' }}>
                      <option value="all">🌐 All Sites</option>
                      {sites.map(s => <option key={s.id || s.site_name} value={s.site_name}>{s.site_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '9px', fontWeight: '600', color: '#64748b', marginBottom: '3px' }}>REPORT DATE</label>
                    <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>

              {/* Historical Reports */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
               {filteredReports.slice(0, 7).map(r => (
                  <div key={r.id} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '12px' }}>{r.site_name}</span>
                      <span style={{ fontSize: '10px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>
                        📅 {r.report_date ? r.report_date.split('-').reverse().join('/') : ''}
                      </span>
                    </div>
                    {r.description && <p style={{ fontSize: '12px', color: '#475569', margin: '2px 0' }}>📝 {r.description}</p>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #f1f5f9', fontSize: '10px', color: '#64748b' }}>
                      <span>👤 {r.user_id || 'N/A'}</span>
                      <span>
                        🕒 {r.created_at ? new Date(r.created_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase() : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Form Section */}
          {showReportForm && (
            <div style={{ backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', boxSizing: 'border-box', width: '100%' }}>
              
              <div style={{ position: 'sticky', top: '180px', zIndex: 20, backgroundColor: '#ffffff', padding: '14px 16px', borderBottom: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(255,255,255,0.08)', boxSizing: 'border-box', borderRadius: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0, color: '#0f172a' }}>📋 Complete Site Report</h3>
                  <button onClick={() => setShowReportForm(false)} style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    ← Back
                  </button>
                </div>
                
                <div style={{ 
                  backgroundColor: reportForm.siteName ? '#eff6ff' : '#fffbeb', 
                  padding: '12px', 
                  borderRadius: '12px', 
                  border: reportForm.siteName ? '1px solid #2563eb' : '2px dashed #f59e0b', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '8px', 
                  boxSizing: 'border-box',
                  boxShadow: reportForm.siteName ? '0 4px 12px rgba(37, 99, 235, 0.15)' : '0 2px 6px rgba(245, 158, 11, 0.1)'
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', color: reportForm.siteName ? '#1e40af' : '#b45309' }}>
                      {reportForm.siteName ? '🔵 Active Site Selected' : '⚠️ Please Select Site First *'}
                    </label>
                    <select 
                      value={reportForm.siteName} 
                      onChange={async (e) => {
                        const newSite = e.target.value;
                        const selectedName = e.target.options[e.target.selectedIndex].text;
                        if (!newSite) return;

                        if (reportForm.siteName !== '' && reportForm.siteName !== newSite) {
                          setModal({
                            isOpen: true,
                            message: `સાઇટ બદલતા પહેલા ડેટા સેવ થશે. શું તમે "${selectedName}" પર જવા માંગો છો?`,
                            onConfirm: async () => {
                              await supabase.from('site_drafts').upsert({
                                user_id: user.id,
                                site_id: reportForm.siteName,
                                report_data: { ...reportForm, draftPhotoUrls: siteProgressPhotos }
                              }, { onConflict: 'user_id, site_id' });

                              const { data } = await supabase
                                .from('site_drafts')
                                .select('report_data')
                                .eq('user_id', user.id)
                                .eq('site_id', newSite)
                                .maybeSingle();

                              if (data) {
                                setReportForm(data.report_data);
                                setSiteProgressPhotos(data.report_data.draftPhotoUrls || []);
                              } else {
                                setReportForm({
                                  siteName: newSite,
                                  reportDate: getTodayString(),
                                  palingWorkRows: [{ contractorName: '', qty: '', nos: '', description: '' }],
                                  contractorRows: [{ contractorName: '', labourCount: '', labourNotes: '', materials: [{ material: '', customMaterialName: '', quantity: '', unit: 'NOS' }] }],
                                  finalWorkRows: [{ contractorName: '', runningFeet: '', height: '', workDesc: '', customWorkDesc: '' }],
                                  description: ''
                                });
                                setSiteProgressPhotos([]);
                              }
                              setModal({ isOpen: false });
                            },
                            onCancel: () => setModal({ isOpen: false })
                          });
                        } else if (reportForm.siteName === '') {
                          setModal({
                            isOpen: true,
                            message: `Please confirm, select your site: "${selectedName}"?`,
                            onConfirm: async () => {
                              const { data } = await supabase
                                .from('site_drafts')
                                .select('report_data')
                                .eq('user_id', user.id)
                                .eq('site_id', newSite)
                                .maybeSingle();

                              if (data) {
                                setReportForm(data.report_data);
                                setSiteProgressPhotos(data.report_data.draftPhotoUrls || []);
                              } else {
                                setReportForm(prev => ({ ...prev, siteName: newSite }));
                              }
                              setModal({ isOpen: false });
                            },
                            onCancel: () => {
                              setReportForm(prev => ({ ...prev, siteName: '' }));
                              setModal({ isOpen: false });
                            }
                          });
                        }
                      }} 
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '12px', boxSizing: 'border-box', fontWeight: 'bold' }}
                    >
                      <option value="">-- Please Select Site First --</option>
                      {sites.map(s => <option key={s.id || s.site_name} value={s.site_name}>{s.site_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Report Date *</label>
                    <input type="date" max={getTodayString()} value={reportForm.reportDate} onChange={(e) => setReportForm({...reportForm, reportDate: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px', boxSizing: 'border-box' }}>
                {!reportForm.siteName ? (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📋 Your Recent Submitted Reports (Last 7)</span>
                    </div>

                    {reports.filter(r => r.user_id === user?.email || r.user_id === user?.id || r.user_id === 'Supervisor').slice(0, 7).map(r => (
                      <div key={r.id} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', marginBottom: '8px', boxSizing: 'border-box', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '12px' }}>{r.site_name}</span>
                          <span style={{ fontSize: '9px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                            📅 {r.report_date ? r.report_date.split('-').reverse().join('/') : ''}
                          </span>
                        </div>
                        {r.description && <p style={{ fontSize: '10px', color: '#475569', margin: '3px 0' }}>📝 {r.description}</p>}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #f1f5f9', fontSize: '9px', color: '#64748b' }}>
                          <span>👤 {r.user_id || 'N/A'}</span>
                          <span>
                            🕒 {r.created_at ? new Date(r.created_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase() : ''}
                          </span>
                        </div>
                      </div>
                    ))}

                    {reports.filter(r => r.user_id === user?.email || r.user_id === user?.id || r.user_id === 'Supervisor').length === 0 && (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                        No reports submitted yet. Select a site above to start a new report.
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* 2. PALING WORK */}
                    <div style={{ backgroundColor: '#fdf4ff', padding: '10px', borderRadius: '8px', border: '1px solid #f5d0fe', marginBottom: '12px', boxSizing: 'border-box' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#86198f' }}>1. Paling Work (પેલિંગ વર્ક)</span>
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
                            const selectedName = e.target.options[e.target.selectedIndex].text;
                            if (e.target.value === "") {
                              const updated = [...reportForm.palingWorkRows]
                              updated[pIndex].contractorName = e.target.value
                              setReportForm({...reportForm, palingWorkRows: updated})
                            } else {
                              triggerContractorChange('paling', pIndex, e.target.value, selectedName);
                            }
                          }} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', width: '100%', fontWeight: 'bold', marginBottom: '6px', boxSizing: 'border-box' }}>
                            <option value="">-- Select Contractor for this Site --</option>
                            {currentSiteContractors.map(con => <option key={con.id} value={con.name}>{con.name}</option>)}
                          </select>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px', boxSizing: 'border-box' }}>
                            <input type="number" placeholder="Qty" value={pRow.qty} onChange={(e) => {
                              const updated = [...reportForm.palingWorkRows]
                              updated[pIndex].qty = e.target.value
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

                    {/* 3. MATERIAL USAGE */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px', boxSizing: 'border-box' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#1e40af' }}>2. Material Usage (કોન્ટ્રાક્ટર વાઇઝ વપરાશ)</span>
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
                            const selectedName = e.target.options[e.target.selectedIndex].text;
                            if (e.target.value === "") {
                              const updated = [...reportForm.contractorRows]
                              updated[cIndex].contractorName = e.target.value
                              setReportForm({...reportForm, contractorRows: updated})
                            } else {
                              triggerContractorChange('material', cIndex, e.target.value, selectedName);
                            }
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

                    {/* 4. FINAL WORK */}
                    <div style={{ backgroundColor: '#eff6ff', padding: '10px', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: '12px', boxSizing: 'border-box' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#1e40af' }}>3. Final Work (ફાઇનલ વર્ક)</span>
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
                            const selectedName = e.target.options[e.target.selectedIndex].text;
                            if (e.target.value === "") {
                              const updated = [...reportForm.finalWorkRows]
                              updated[fIndex].contractorName = e.target.value
                              setReportForm({...reportForm, finalWorkRows: updated})
                            } else {
                              triggerContractorChange('final', fIndex, e.target.value, selectedName);
                            }
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

                    {/* Extra Description Box */}
                    <div style={{ marginBottom: '12px', boxSizing: 'border-box' }}>
                      <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Additional Description / Remarks</label>
                      <textarea rows="2" value={reportForm.description} onChange={(e) => setReportForm({...reportForm, description: e.target.value})} placeholder="Any extra notes..." style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                    </div>

                    {/* Site Progress Photos */}
                    <div style={{ marginBottom: '12px', backgroundColor: '#f1f5f9', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                      <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', color: '#0f172a' }}>📸 Site Progress Photos (Multiple)</label>
                      <input type="file" multiple accept="image/*" capture="environment" onChange={(e) => {
                        if (e.target.files.length > 0) setSiteProgressPhotos([...siteProgressPhotos, ...Array.from(e.target.files)])
                        e.target.value = null;
                      }} style={{ fontSize: '11px', marginBottom: '6px', width: '100%', boxSizing: 'border-box' }} />
                      {siteProgressPhotos.length > 0 && (
                        <div style={{ marginTop: '6px', fontSize: '11px', color: '#0f172a' }}>
                          Selected Progress Photos:
                          {siteProgressPhotos.map((file, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-end', background: '#fff', padding: '4px 8px', margin: '4px 0', borderRadius: '4px', border: '1px solid #cbd5e1', alignItems: 'center' }}>
                              <span>{file.name || (typeof file === 'string' ? file.split('/').pop() : 'Photo')}</span>
                              <button type="button" onClick={() => {
                                setModal({
                                  isOpen: true,
                                  message: 'શું તમે ખરેખર આ પ્રોગ્રેસ ફોટો ડીલીટ કરવા માંગો છો?',
                                  onConfirm: () => {
                                    if (typeof file === 'string') deleteFileFromStorage(file);
                                    setSiteProgressPhotos(siteProgressPhotos.filter((_, i) => i !== idx))
                                    setModal({ isOpen: false });
                                  },
                                  onCancel: () => setModal({ isOpen: false })
                                });
                              }} style={{ color: 'red', border: 'none', background: 'none', fontWeight: 'bold', cursor: 'pointer', marginLeft: '4px' }}>Remove</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', boxSizing: 'border-box' }}>
                      <button type="button" disabled={loading} onClick={handleCombinedReportPreview} style={{ backgroundColor: loading ? '#94a3b8' : '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', flex: 1, fontSize: '12px' }}>
                        {loading ? 'Processing...' : 'Review & Submit Report'}
                      </button>
                      <button type="button" disabled={loading} onClick={() => setShowReportForm(false)} style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', flex: 1, fontSize: '12px', color: '#334155' }}>Cancel</button>
                    </div>
                  </>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {/* FULL PREVIEW / CONFIRMATION MODAL */}
      {previewData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', boxSizing: 'border-box', backdropFilter: 'blur(2px)' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '500px', maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 4px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔍 Final Report Preview
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Please verify all details carefully before submitting.</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              
              {/* Site Info Box */}
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                  <div><span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Site Name</span><strong style={{ color: '#0f172a' }}>{previewData.site}</strong></div>
                  <div><span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Report Date</span><strong style={{ color: '#0f172a' }}>{previewData.date}</strong></div>
                </div>
                {previewData.details?.description && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontSize: '12px', color: '#334155' }}>
                    <strong>Remarks:</strong> {previewData.details.description}
                  </div>
                )}
                {previewData.sitePhotosCount > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#2563eb', fontWeight: '600' }}>
                    📸 {previewData.sitePhotosCount} Site Progress Photos Attached
                  </div>
                )}
              </div>
              
              {/* Paling Work Preview */}
              {previewData.details?.palingWorkRows?.some(p => p.contractorName) && (
                <div style={{ backgroundColor: '#fdf4ff', padding: '12px', borderRadius: '8px', border: '1px solid #f5d0fe' }}>
                  <strong style={{ color: '#86198f', fontSize: '13px', display: 'block', marginBottom: '8px', borderBottom: '1px solid #f5d0fe', paddingBottom: '4px' }}>🪵 1. Paling Work</strong>
                  {previewData.details.palingWorkRows.filter(p => p.contractorName).map((p, pi) => (
                    <div key={pi} style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', backgroundColor: '#fff', padding: '6px', borderRadius: '4px', border: '1px solid #fae8ff', marginBottom: '4px' }}>
                      <div>
                        <strong style={{ color: '#701a75' }}>{p.contractorName}</strong>
                        {p.description && <span style={{ display: 'block', fontSize: '10px', color: '#a21caf' }}>{p.description}</span>}
                      </div>
                      <strong style={{ color: '#0f172a' }}>{p.qty || 0} NOS</strong>
                    </div>
                  ))}
                </div>
              )}

              {/* Contractor Work Preview (Material Usage) */}
              {previewData.details?.contractorRows?.some(c => c.contractorName) && (
                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <strong style={{ color: '#1e40af', fontSize: '13px', display: 'block', marginBottom: '8px', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px' }}>👷 2. Material Usage</strong>
                  {previewData.details.contractorRows.filter(c => c.contractorName).map((c, ci) => (
                    <div key={ci} style={{ marginBottom: '8px', fontSize: '12px' }}>
                      <div style={{ fontWeight: '600', color: '#1e3a8a', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{ci + 1}. {c.contractorName}</span>
                        <span style={{ fontSize: '10px', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>Labour: {c.labourCount || 0}</span>
                      </div>
                      <div style={{ backgroundColor: '#fff', padding: '6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                        {c.materials?.filter(m => m.quantity).map((m, mi) => (
                          <div key={mi} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: mi !== c.materials.length - 1 ? '1px dashed #cbd5e1' : 'none', paddingBottom: mi !== c.materials.length - 1 ? '4px' : '0', marginBottom: mi !== c.materials.length - 1 ? '4px' : '0' }}>
                            <span style={{ color: '#334155' }}>{m.material === 'Other' ? m.customMaterialName : m.material}</span>
                            <strong style={{ color: '#0f172a' }}>{m.quantity} {m.unit}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Final Work Preview */}
              {previewData.details?.finalWorkRows?.some(f => f.contractorName) && (
                <div style={{ backgroundColor: '#eff6ff', padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  <strong style={{ color: '#0369a1', fontSize: '13px', display: 'block', marginBottom: '8px', borderBottom: '1px solid #bfdbfe', paddingBottom: '4px' }}>🏗️ 3. Final Work</strong>
                  {previewData.details.finalWorkRows.filter(f => f.contractorName).map((f, fi) => (
                    <div key={fi} style={{ fontSize: '12px', backgroundColor: '#fff', padding: '8px', borderRadius: '4px', border: '1px solid #dbeafe', marginBottom: '4px' }}>
                      <div style={{ fontWeight: '600', color: '#075985', marginBottom: '2px' }}>{f.contractorName}</div>
                      <div style={{ color: '#334155', marginBottom: '4px' }}>{f.workDesc === 'Other' ? f.customWorkDesc : f.workDesc}</div>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#64748b' }}>
                        <span>Run. Feet: <strong style={{ color: '#0f172a' }}>{f.runningFeet || 0}</strong></span>
                        <span>Height: <strong style={{ color: '#0f172a' }}>{f.height || 0}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>

            <div style={{ display: 'flex', gap: '10px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
              <button disabled={loading} onClick={() => { confirmAndSave(); }} style={{ flex: 1, padding: '12px', backgroundColor: loading ? '#94a3b8' : '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', boxShadow: '0 4px 6px -1px rgba(5, 150, 105, 0.2)' }}>
                {loading ? 'Saving Data...' : '✅ Confirm & Save'}
              </button>
              <button disabled={loading} onClick={() => setPreviewData(null)} style={{ flex: 1, padding: '12px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px' }}>
                Cancel & Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL */}
      <ConfirmModal 
        isOpen={modal.isOpen} 
        message={modal.message} 
        onConfirm={modal.onConfirm || (() => setModal({ isOpen: false }))} 
        onCancel={modal.onCancel || (() => setModal({ isOpen: false }))} 
      />

    </div>
  )
}

export default SupervisorDashboard