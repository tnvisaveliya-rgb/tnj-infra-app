  import React, { useState, useEffect } from 'react'
  import { useAuth } from '../context/AuthContext'
  import { 
    getDailyReports, 
    addDailyReport, 
    updateDailyReport, 
    deleteDailyReport, 
    uploadSitePhoto 
  } from '../services/dailyReportsService'
  import { 
    Plus, 
    Edit2, 
    Trash2, 
    Search, 
    Filter, 
    Upload, 
    Image as ImageIcon, 
    X, 
    Calendar, 
    MapPin, 
    FileText, 
    AlertCircle,
    Building2,
    Camera
  } from 'lucide-react'

  function DailyReports() {
    const { user } = useAuth()
    const [reports, setReports] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [editingReport, setEditingReport] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [siteFilter, setSiteFilter] = useState('all')
    
    const [formData, setFormData] = useState({
      siteName: '',
      workDescription: '',
      photoUrl: '',
      reportDate: new Date().toISOString().split('T')[0]
    })

    const [selectedFile, setSelectedFile] = useState(null)

    useEffect(() => {
      loadReports()
    }, [])

    const loadReports = async () => {
      try {
        setLoading(true)
        const data = await getDailyReports()
        setReports(data)
        setError('')
      } catch (error) {
        setError('Failed to load reports: ' + error.message)
      } finally {
        setLoading(false)
      }
    }

    const handleFileSelect = (e) => {
      const file = e.target.files[0]
      if (file) {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
        if (!allowedTypes.includes(file.type)) {
          setError('Only JPG, PNG, and PDF files are allowed')
          return
        }
        
        // Validate file size (max 10MB for photos)
        if (file.size > 10 * 1024 * 1024) {
          setError('File size must be less than 10MB')
          return
        }

        setSelectedFile(file)
        setError('')
      }
    }

    const handleFileUpload = async () => {
      if (!selectedFile) return formData.photoUrl

      try {
        setUploading(true)
        const publicUrl = await uploadSitePhoto(selectedFile)
        setSelectedFile(null)
        return publicUrl
      } catch (error) {
        setError('Failed to upload photo: ' + error.message)
        return formData.photoUrl
      } finally {
        setUploading(false)
      }
    }

    const handleSubmit = async (e) => {
      e.preventDefault()
      
      try {
        let photoUrl = formData.photoUrl
        
        // Upload file if selected
        if (selectedFile) {
          photoUrl = await handleFileUpload()
          if (!photoUrl) return
        }

        const reportData = {
          siteName: formData.siteName,
          workDescription: formData.workDescription,
          photoUrl: photoUrl,
          reportDate: formData.reportDate,
          userId: user?.id || 'unknown'
        }

        if (editingReport) {
          await updateDailyReport(editingReport.id, reportData)
        } else {
          await addDailyReport(reportData)
        }

        await loadReports()
        resetForm()
        setShowForm(false)
        setError('')
      } catch (error) {
        setError('Failed to save report: ' + error.message)
      }
    }

    const handleEdit = (report) => {
      setEditingReport(report)
      setFormData({
        siteName: report.site_name,
        workDescription: report.work_description,
        photoUrl: report.photo_url,
        reportDate: report.report_date.split('T')[0]
      })
      setShowForm(true)
    }

    const handleDelete = async (id, photoUrl) => {
      if (window.confirm('Are you sure you want to delete this report?')) {
        try {
          await deleteDailyReport(id, photoUrl)
          await loadReports()
          setError('')
        } catch (error) {
          setError('Failed to delete report: ' + error.message)
        }
      }
    }

    const resetForm = () => {
      setFormData({
        siteName: '',
        workDescription: '',
        photoUrl: '',
        reportDate: new Date().toISOString().split('T')[0]
      })
      setSelectedFile(null)
      setEditingReport(null)
    }

    // Get unique site names for filter
    const uniqueSites = [...new Set(reports.map(r => r.site_name))]

    const filteredReports = reports.filter(report => {
      const matchesSearch = 
        report.site_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.work_description?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesSite = siteFilter === 'all' || report.site_name === siteFilter
      return matchesSearch && matchesSite
    })

    return (
      <div style={{ paddingBottom: '48px', fontFamily: 'Inter, system-ui, sans-serif', color: '#1e293b' }}>
        
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #dbeafe' }}>
                Operations Module
              </span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>T&J Infra Management System</span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>Daily Site Reports</h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Track daily site progress with photos and work descriptions.</p>
          </div>
          
          <button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#2563eb', color: '#ffffff', padding: '10px 20px', borderRadius: '12px', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.2)' }}
          >
            {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> New Report</>}
          </button>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={20} color="#e11d48" />
            <p style={{ fontSize: '13px', fontWeight: '500', color: '#9f1239', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Add/Edit Report Form */}
        {showForm && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', marginBottom: '24px', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>
                  {editingReport ? 'Edit Site Report' : 'New Daily Site Report'}
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                  {editingReport ? 'Update existing site progress report' : 'Submit daily site progress with photo documentation'}
                </p>
              </div>
              <button onClick={() => { resetForm(); setShowForm(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569', marginBottom: '8px' }}>
                    Site Name *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Building2 size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      required
                      value={formData.siteName}
                      onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px 10px 40px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                      placeholder="e.g. Highway Expansion Site A"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569', marginBottom: '8px' }}>
                    Report Date *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="date"
                      required
                      value={formData.reportDate}
                      onChange={(e) => setFormData({ ...formData, reportDate: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px 10px 40px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569', marginBottom: '8px' }}>
                    Work Description *
                  </label>
                  <textarea
                    required
                    value={formData.workDescription}
                    onChange={(e) => setFormData({ ...formData, workDescription: e.target.value })}
                    rows="4"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', backgroundColor: '#f8fafc', boxSizing: 'border-box', resize: 'none' }}
                    placeholder="Describe the work completed today, progress made, materials used, challenges faced, etc."
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569', marginBottom: '8px' }}>
                    Site Photo / Documentation
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                        onChange={handleFileSelect}
                        style={{ width: '100%', fontSize: '12px', color: '#64748b' }}
                      />
                    </div>
                    
                    {formData.photoUrl && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px' }}>
                        <ImageIcon size={20} color="#059669" />
                        <span style={{ fontSize: '12px', color: '#059669', fontWeight: '500', flex: 1 }}>Photo uploaded successfully</span>
                        <a
                          href={formData.photoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#059669', textDecoration: 'none', fontWeight: '600', fontSize: '12px' }}
                        >
                          View
                        </a>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                <button
                  type="submit"
                  disabled={uploading}
                  style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                >
                  {uploading ? 'Uploading...' : editingReport ? 'Update Report' : 'Submit Report'}
                </button>
                <button
                  type="button"
                  onClick={() => { resetForm(); setShowForm(false); }}
                  style={{ backgroundColor: '#fff', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Reports List */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          
          {/* Toolbar */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>Report History</h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>View and manage all submitted daily site reports</p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search site or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ padding: '8px 12px 8px 36px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', backgroundColor: '#f8fafc', width: '200px' }}
                />
              </div>

              <select
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', backgroundColor: '#f8fafc', fontWeight: '500' }}
              >
                <option value="all">All Sites</option>
                {uniqueSites.map(site => (
                  <option key={site} value={site}>{site}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading reports...</div>
          ) : filteredReports.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <FileText size={40} color="#cbd5e1" style={{ margin: '0 auto 12px auto' }} />
              <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155', margin: '0 0 4px 0' }}>No reports found</p>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Start by submitting your first daily site report.</p>
            </div>
          ) : (
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {filteredReports.map((report) => (
                  <div 
                    key={report.id} 
                    style={{ 
                      backgroundColor: '#ffffff', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '14px', 
                      padding: '20px', 
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                          <MapPin size={14} color="#2563eb" />
                          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>{report.site_name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={12} color="#64748b" />
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {new Date(report.report_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button 
                          onClick={() => handleEdit(report)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(report.id, report.photo_url)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e11d48', padding: '4px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Photo */}
                    {report.photo_url && (
                      <div style={{ marginBottom: '12px' }}>
                        <a 
                          href={report.photo_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ display: 'block', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0' }}
                        >
                          <img 
                            src={report.photo_url} 
                            alt="Site photo" 
                            style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }}
                          />
                        </a>
                      </div>
                    )}

                    {/* Description */}
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5', margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {report.work_description}
                      </p>
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Camera size={12} color="#94a3b8" />
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                          {report.photo_url ? 'Photo attached' : 'No photo'}
                        </span>
                      </div>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                        {new Date(report.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  export default PlantReports
