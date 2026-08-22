import React, { useState } from 'react'
import { supabase } from '../lib/supabase' // Tamari supabase file no sacho rasto
import { useNavigate } from 'react-router-dom'

function UpdatePassword() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  const handleUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Aa code navo password save karshe
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setSuccess('Tamaro password successfully badlai gayo che! Tame have login kari shako cho.')
      
      // 3 second pachi wapas login page par mokli deshe
      setTimeout(() => {
        navigate('/') 
      }, 3000)

    } catch (error) {
      setError(error.message || 'Password update karvama bhul aavi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{ maxWidth: '420px', width: '100%', backgroundColor: '#ffffff', borderRadius: '24px', padding: '36px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Set New Password</h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>Krupaya tamaro navo password ahi nakho.</p>
        </div>

        {error && <div style={{ marginBottom: '20px', padding: '14px', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', color: '#9f1239', fontSize: '13px', fontWeight: '500' }}>{error}</div>}
        {success && <div style={{ marginBottom: '20px', padding: '14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', color: '#166534', fontSize: '13px', fontWeight: '500' }}>{success}</div>}

        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569', marginBottom: '8px' }}>Navo Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Min 6 characters"
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '14px', outline: 'none', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', backgroundColor: '#2563eb', color: '#ffffff', padding: '13px', borderRadius: '12px', fontWeight: '700', fontSize: '14px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default UpdatePassword