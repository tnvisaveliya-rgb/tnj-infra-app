import React, { useState, useEffect } from 'react'
import { Calendar, Filter, Download, Search, Building2, Truck, FileText, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function SiteTransactionPage() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(true)
  
  // Filter states
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    contractor: '',
    siteName: '',
    state: '',
    transactionType: 'all', // all, material, payment, labor
    minAmount: '',
    maxAmount: ''
  })

  // Unique values for filter dropdowns
  const [contractors, setContractors] = useState([])
  const [sites, setSites] = useState([])
  const [states, setStates] = useState([])

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('site_transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
        .limit(100)

      if (error) throw error
      setTransactions(data || [])

      // Extract unique values for filters
      const uniqueContractors = [...new Set(data?.map(t => t.contractor_name).filter(Boolean))]
      const uniqueSites = [...new Set(data?.map(t => t.site_name).filter(Boolean))]
      const uniqueStates = [...new Set(data?.map(t => t.state).filter(Boolean))]

      setContractors(uniqueContractors)
      setSites(uniqueSites)
      setStates(uniqueStates)
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    })
  }

  const applyFilters = () => {
    let filtered = [...transactions]

    if (filters.startDate) {
      filtered = filtered.filter(t => t.transaction_date >= filters.startDate)
    }
    if (filters.endDate) {
      filtered = filtered.filter(t => t.transaction_date <= filters.endDate)
    }
    if (filters.contractor) {
      filtered = filtered.filter(t => t.contractor_name === filters.contractor)
    }
    if (filters.siteName) {
      filtered = filtered.filter(t => t.site_name === filters.siteName)
    }
    if (filters.state) {
      filtered = filtered.filter(t => t.state === filters.state)
    }
    if (filters.transactionType !== 'all') {
      filtered = filtered.filter(t => t.transaction_type === filters.transactionType)
    }
    if (filters.minAmount) {
      filtered = filtered.filter(t => t.amount >= parseFloat(filters.minAmount))
    }
    if (filters.maxAmount) {
      filtered = filtered.filter(t => t.amount <= parseFloat(filters.maxAmount))
    }

    return filtered
  }

  const filteredTransactions = applyFilters()

  const calculateTotals = () => {
    const totals = filteredTransactions.reduce((acc, t) => {
      acc.totalAmount += t.amount || 0
      acc.count += 1
      return acc
    }, { totalAmount: 0, count: 0 })

    return totals
  }

  const exportToCSV = () => {
    const headers = ['Date', 'Contractor', 'Site', 'State', 'Type', 'Amount', 'Description', 'DDA Reference']
    const rows = filteredTransactions.map(t => [
      t.transaction_date,
      t.contractor_name,
      t.site_name,
      t.state,
      t.transaction_type,
      t.amount,
      t.description,
      t.dda_reference || 'N/A'
    ])

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `site_transactions_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const totals = calculateTotals()

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Site Transactions</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Track all site-related transactions and contractor payments</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            color: '#475569'
          }}
        >
          <Filter size={18} />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', backgroundColor: '#dbeafe', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} color="#2563eb" />
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Total Transactions</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>{totals.count}</p>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', backgroundColor: '#dcfce7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={20} color="#16a34a" />
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Total Amount</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>₹{totals.totalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', backgroundColor: '#fef3c7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={20} color="#d97706" />
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Active Sites</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>{sites.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={18} />
            Filter Transactions
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Start Date</label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>End Date</label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Contractor</label>
              <select
                name="contractor"
                value={filters.contractor}
                onChange={handleFilterChange}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff' }}
              >
                <option value="">All Contractors</option>
                {contractors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Site</label>
              <select
                name="siteName"
                value={filters.siteName}
                onChange={handleFilterChange}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff' }}
              >
                <option value="">All Sites</option>
                {sites.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>State</label>
              <select
                name="state"
                value={filters.state}
                onChange={handleFilterChange}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff' }}
              >
                <option value="">All States</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Transaction Type</label>
              <select
                name="transactionType"
                value={filters.transactionType}
                onChange={handleFilterChange}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff' }}
              >
                <option value="all">All Types</option>
                <option value="material">Material</option>
                <option value="payment">Payment</option>
                <option value="labor">Labor</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Min Amount</label>
              <input
                type="number"
                name="minAmount"
                value={filters.minAmount}
                onChange={handleFilterChange}
                placeholder="₹0"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Max Amount</label>
              <input
                type="number"
                name="maxAmount"
                value={filters.maxAmount}
                onChange={handleFilterChange}
                placeholder="₹Max"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
              />
            </div>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setFilters({
                startDate: '',
                endDate: '',
                contractor: '',
                siteName: '',
                state: '',
                transactionType: 'all',
                minAmount: '',
                maxAmount: ''
              })}
              style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#475569' }}
            >
              Clear Filters
            </button>
            <button
              onClick={exportToCSV}
              style={{ padding: '8px 16px', backgroundColor: '#2563eb', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
            Transactions ({filteredTransactions.length})
          </h3>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading transactions...</div>
        ) : filteredTransactions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No transactions found</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Contractor</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Site</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#475569' }}>State</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Type</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Amount</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#475569' }}>DDA Ref</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#334155' }}>{t.transaction_date}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '500', color: '#1e293b' }}>{t.contractor_name}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#334155' }}>{t.site_name}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#334155' }}>{t.state}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        backgroundColor: t.transaction_type === 'material' ? '#dbeafe' : t.transaction_type === 'payment' ? '#dcfce7' : '#fef3c7',
                        color: t.transaction_type === 'material' ? '#1e40af' : t.transaction_type === 'payment' ? '#166534' : '#92400e'
                      }}>
                        {t.transaction_type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#1e293b', textAlign: 'right' }}>₹{t.amount?.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b' }}>{t.dda_reference || '-'}</td>
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
