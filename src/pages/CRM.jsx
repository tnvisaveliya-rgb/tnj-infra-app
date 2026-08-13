import React, { useState, useEffect } from 'react'
import { getLeads, addLead, updateLead, deleteLead } from '../services/leadsService'
import { Plus, Edit2, Trash2, Search, Building2, Phone, Mail, TrendingUp, Users, CheckCircle, X } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'prospect', label: 'Prospect', bg: '#f1f5f9', color: '#334155' },
  { value: 'contacted', label: 'Contacted', bg: '#eff6ff', color: '#1d4ed8' },
  { value: 'qualified', label: 'Qualified', bg: '#ecfdf5', color: '#059669' },
  { value: 'proposal', label: 'Proposal', bg: '#fffbeb', color: '#d97706' },
  { value: 'negotiation', label: 'Negotiation', bg: '#fff7ed', color: '#c2410c' },
  { value: 'closed', label: 'Closed', bg: '#f5f3ff', color: '#7c3aed' },
  { value: 'lost', label: 'Lost', bg: '#fff1f2', color: '#e11d48' },
]

function CRM() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [formData, setFormData] = useState({
    clientName: '',
    phone: '',
    email: '',
    status: 'prospect',
    notes: ''
  })

  useEffect(() => {
    loadLeads()
  }, [])

  const loadLeads = async () => {
    try {
      setLoading(true)
      const data = await getLeads()
      setLeads(data || [])
      setError('')
    } catch (error) {
      setError('Failed to load leads: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingLead) {
        await updateLead(editingLead.id, formData)
      } else {
        await addLead(formData)
      }
      await loadLeads()
      resetForm()
      setShowForm(false)
      setError('')
    } catch (error) {
      setError('Failed to save lead: ' + error.message)
    }
  }

  const handleEdit = (lead) => {
    setEditingLead(lead)
    setFormData({
      clientName: lead.client_name,
      phone: lead.phone,
      email: lead.email || '',
      status: lead.status,
      notes: lead.notes
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      try {
        await deleteLead(id)
        await loadLeads()
        setError('')
      } catch (error) {
        setError('Failed to delete lead: ' + error.message)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      clientName: '',
      phone: '',
      email: '',
      status: 'prospect',
      notes: ''
    })
    setEditingLead(null)
  }

  const getStatusStyle = (status) => {
    const opt = STATUS_OPTIONS.find(o => o.value === status)
    return opt ? { backgroundColor: opt.bg, color: opt.color } : { backgroundColor: '#f1f5f9', color: '#334155' }
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lead.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lead.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div style={{ paddingBottom: '48px', fontFamily: 'Inter, system-ui, sans-serif', color: '#1e293b' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #dbeafe' }}>
              CRM Module
            </span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>T&J Infra Management System</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>Lead Management</h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Track prospective infrastructure clients, contracts, and sales pipelines.</p>
        </div>
        
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#2563eb', color: '#ffffff', padding: '10px 20px', borderRadius: '12px', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.2)' }}
        >
          {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Add New Lead</>}
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Trash2 size={20} color="#e11d48" />
          <p style={{ fontSize: '13px', fontWeight: '500', color: '#9f1239', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Stats Cards Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: '#eff6ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={24} color="#2563eb" />
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', margin: 0 }}>Total Leads</p>
            <p style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '4px 0 0 0' }}>{leads.length}</p>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: '#ecfdf5', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={24} color="#059669" />
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', margin: 0 }}>Active Pipeline</p>
            <p style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '4px 0 0 0' }}>
              {leads.filter(l => !['closed', 'lost'].includes(l.status)).length}
            </p>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: '#f5f3ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={24} color="#7c3aed" />
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', margin: 0 }}>Closed Contracts</p>
            <p style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '4px 0 0 0' }}>
              {leads.filter(l => l.status === 'closed').length}
            </p>
          </div>
        </div>
      </div>

      {/* Add/Edit Lead Form Card */}
      {showForm && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', marginBottom: '24px', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>
                {editingLead ? 'Edit Client Lead' : 'Add New Client Lead'}
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>Provide corporate account details</p>
            </div>
            <button onClick={() => { resetForm(); setShowForm(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569', marginBottom: '8px' }}>
                  Client / Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                  placeholder="e.g. Metro Builders Ltd."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569', marginBottom: '8px' }}>
                  Phone Number
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569', marginBottom: '8px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                  placeholder="client@company.com"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569', marginBottom: '8px' }}>
                  Pipeline Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', backgroundColor: '#f8fafc', boxSizing: 'border-box', fontWeight: '500' }}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569', marginBottom: '8px' }}>
                  Project Notes & Requirements
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', backgroundColor: '#f8fafc', boxSizing: 'border-box', resize: 'none' }}
                  placeholder="Detail project specifications..."
                />
              </div>

            </div>

            <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
              <button
                type="submit"
                style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
              >
                {editingLead ? 'Update Record' : 'Save Lead'}
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

      {/* Leads Management Panel Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>Client Accounts Directory</h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>Manage ongoing business interactions</p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '8px 12px 8px 36px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', backgroundColor: '#f8fafc', width: '200px' }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', backgroundColor: '#f8fafc', fontWeight: '500' }}
            >
              <option value="all">All Statuses</option>
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Synchronizing CRM database...</div>
        ) : filteredLeads.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <Users size={40} color="#cbd5e1" style={{ margin: '0 auto 12px auto' }} />
            <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155', margin: '0 0 4px 0' }}>No matching leads found</p>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0' }}>Try clearing filters or register a new company lead.</p>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
            >
              Add New Lead
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>
                  <th style={{ padding: '14px 20px' }}>Client Company</th>
                  <th style={{ padding: '14px 20px' }}>Contact Details</th>
                  <th style={{ padding: '14px 20px' }}>Pipeline Stage</th>
                  <th style={{ padding: '14px 20px' }}>Notes</th>
                  <th style={{ padding: '14px 20px' }}>Registered</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 'bold', color: '#0f172a' }}>{lead.client_name}</td>
                    <td style={{ padding: '14px 20px', color: '#475569' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={12} color="#64748b" />
                          <span>{lead.phone || '-'}</span>
                        </div>
                        {lead.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#2563eb' }}>
                            <Mail size={12} />
                            <span>{lead.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ 
                        padding: '3px 10px', 
                        borderRadius: '6px', 
                        fontSize: '11px', 
                        fontWeight: 'bold', 
                        textTransform: 'uppercase',
                        ...getStatusStyle(lead.status)
                      }}>
                        {lead.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', color: '#64748b', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {lead.notes || '-'}
                    </td>
                    <td style={{ padding: '14px 20px', color: '#64748b', fontSize: '12px' }}>
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <button onClick={() => handleEdit(lead)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', marginRight: '8px' }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(lead.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e11d48' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default CRM