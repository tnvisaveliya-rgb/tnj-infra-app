import React, { useState, useEffect } from 'react' // useEffect add karyu
import { supabase } from '../lib/supabase'
import { useNavigate, Link } from 'react-router-dom'

function Login() {
  const [email, setEmail] = useState('') // અહીંથી ડિફોલ્ટ ઈમેલ કાઢી નાખ્યો છે
  const [password, setPassword] = useState('') // અહીંથી ડિફોલ્ટ પાસવર્ડ કાઢી નાખ્યો છે
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()


  

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })

      if (error) throw error
      navigate('/')
    } catch (error) {
      setError(error.message || 'An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{ maxWidth: '420px', width: '100%' }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          padding: '36px',
          border: '1px solid #e2e8f0'
        }}>
          
          {/* Logo/Brand */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>T&J Infra</h1>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', fontWeight: '500' }}>Sign in to your management account</p>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{ marginBottom: '20px', padding: '14px', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px' }}>
              <p style={{ color: '#9f1239', fontSize: '13px', margin: 0, fontWeight: '500' }}>{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Email Field */}
            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569', marginBottom: '8px', letterSpacing: '0.5px' }}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: '#f8fafc',
                  color: '#0f172a',
                  boxSizing: 'border-box'
                }}
                placeholder="Enter your email"
              />
            </div>

          {/* Password Field */}
            <div>
              <label htmlFor="password" style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569', marginBottom: '8px', letterSpacing: '0.5px' }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: '#f8fafc',
                  color: '#0f172a',
                  boxSizing: 'border-box'
                }}
                placeholder="••••••••"
              />
            </div>

            {/* AHI NAVO FORGOT PASSWORD LINK MUKELO CHE */}
            <div style={{ textAlign: 'right', marginTop: '-10px' }}>
              <Link 
                to="/forgot-password" 
                style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}
              >
                Forgot password?
              </Link>
            </div>
            {/* NAVO LINK AHI PURO THAY CHE */}

          

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                padding: '13px',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '14px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                transition: 'background-color 0.2s'
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Footer */}
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Don't have an account?{' '}
              <span style={{ color: '#2563eb', fontWeight: '600', cursor: 'pointer' }}>
                Contact your administrator
              </span>
            </p>
          </div>
        </div>

        {/* Help Text */}
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
            Secure login powered by Supabase Authentication
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login