import React, { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ઉપલબ્ધ ટેબ્સની યાદી જે ચેકબોક્સમાં દેખાશે
const AVAILABLE_TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'crm', label: 'CRM' },
  { id: 'site_progress', label: 'Site Daily Progress Report' },
  { id: 'plant_report', label: 'Plant Report' },
  { id: 'site_transaction', label: 'Site Transactions' },
  { id: 'plant_transaction', label: 'Plant Transactions' }
]

export default function AddStaffModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'Staff',
    phone: '',
    pan_number: '',
    allowed_tabs: ['site_progress', 'plant_report'] // ડિફોલ્ટ સિલેક્ટેડ ટેબ્સ
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  // ચેકબોક્સ હેન્ડલ કરવા માટેનું લોજિક
  const handleTabCheckboxChange = (tabId) => {
    let updatedTabs = [...formData.allowed_tabs]
    if (updatedTabs.includes(tabId)) {
      updatedTabs = updatedTabs.filter(t => t !== tabId)
    } else {
      updatedTabs.push(tabId)
    }
    setFormData({ ...formData, allowed_tabs: updatedTabs })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.full_name || !formData.email || !formData.password || !formData.role) {
      setError('કૃપા કરીને બધી જરૂરી માહિતી ભરો.')
      return
    }

    setLoading(true)

    try {
      // ૧. Supabase Auth માં નવો યુઝર બનાવો
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: formData.role
          }
        }
      })

      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error("યુઝર આઈડી જનરેટ થવામાં ભૂલ થઈ છે.");

      // ૨. નવું ટેબલ `user_permissions` માં પરમિશન અને નામ સેવ કરો
      const { error: permError } = await supabase
        .from('user_permissions')
        .insert([
          {
            user_id: userId,
            full_name: formData.full_name,
            role: formData.role,
            allowed_tabs: formData.allowed_tabs // [ 'dashboard', 'crm' ] વગેરે લિસ્ટ સેવ થશે
          }
        ]);

      if (permError) throw permError;

      alert('નવો સ્ટાફ સફળતાપૂર્વક ઉમેરાઈ ગયો!');
      onSuccess?.(); // પેચ રિફ્રેશ કરવા માટે
      onClose();     // મોડલ બંધ કરવા માટે

    } catch (err) {
      console.error('Error adding staff:', err)
      setError(err.message || 'સ્ટાફ ઉમેરવામાં નિષ્ફળતા મળી. ફરી પ્રયાસ કરો.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 9999, padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
            Add New Staff & Permissions
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div style={{ backgroundColor: '#fee2e2', border: '1px solid #f87171', color: '#dc2626', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Full Name *</label>
            <input
              type="text" name="full_name" value={formData.full_name} onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
              placeholder="Enter full name" required
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Email (Login ID) *</label>
            <input
              type="email" name="email" value={formData.email} onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
              placeholder="Enter email address" required
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Password *</label>
            <input
              type="password" name="password" value={formData.password} onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
              placeholder="Enter password (min 6 chars)" required
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Role *</label>
            <select
              name="role" value={formData.role} onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
              required
            >
              <option value="Staff">Staff</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Plant Manager">Plant Manager</option>
              <option value="BDM">BDM</option>
              <option value="Manager">Manager</option>
            </select>
          </div>

          {/* Page Access Permissions Checkboxes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#0369a1', margin: 0 }}>Assign Page Access</h3>
            <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Select which sections this staff member can see:</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px', marginTop: '4px' }}>
              {AVAILABLE_TABS.map((tab) => (
                <label key={tab.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer', backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <input
                    type="checkbox"
                    checked={formData.allowed_tabs.includes(tab.id)}
                    onChange={() => handleTabCheckboxChange(tab.id)}
                    style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                  />
                  {tab.label}
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '4px' }}>
            <button
              type="button" onClick={onClose}
              style={{ padding: '8px 16px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', color: '#475569' }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
              disabled={loading}
            >
              {loading ? <><Loader2 className="animate-spin" size={16} /> Creating...</> : 'Save Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}