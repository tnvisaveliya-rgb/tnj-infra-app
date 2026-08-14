import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, X, Receipt } from 'lucide-react'

function SupervisorExpenses() {
  const { user } = useAuth()
  const [sites, setSites] = useState([])
  const [vendors, setVendors] = useState([])
  const [contractors, setContractors] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [selectedViewSite, setSelectedViewSite] = useState('')

  const [txForm, setTxForm] = useState({
    siteName: '',
    transactionDate: new Date().toISOString().split('T')[0],
    incomeSources: [{ sourceName: '', customSourceName: '', items: [{ category: 'Materials', amount: '', description: '' }], files: [] }],
    expenseRows: [{ contractorName: '', customContractorName: '', amount: '', category: 'Labour', description: '', files: [] }]
  })

  useEffect(() => {
    loadSites()
    loadVendors()
    loadContractors()
    loadTransactions()
  }, [user]) // user બદલાય એટલે ડેટા ફરી લોડ થાય

  const loadSites = async () => {
    const { data } = await supabase.from('sites').select('*')
    setSites(data || [])
  }

  const loadVendors = async () => {
    const { data } = await supabase.from('site_vendors').select('*')
    setVendors(data || [])
  }

  const loadContractors = async () => {
    const { data } = await supabase.from('contractors').select('*')
    setContractors(data || [])
  }

  const loadTransactions = async () => {
    // અહી માત્ર લોગિન યુઝરના જ ટ્રાન્ઝેક્શન્સ લાવવા માટે query કરી શકાય, 
    // અથવા બધા લાવીને નીચે યુઝર મુજબ ફિલ્ટર કરી શકાય.
    let query = supabase.from('site_transactions').select('*').order('transaction_date', { ascending: false })
    
    // જો તમે ઇચ્છતા હોવ કે ફક્ત પોતાના જ એન્ટ્રી કરેલા દેખાય તો આ લાઇન અનકોમેન્ટ કરી શકો:
    // if (user?.email) {
    //   query = query.eq('created_by', user.email)
    // }

    const { data, error } = await query
    if (error) {
      console.error('Error loading transactions:', error.message)
    } else {
      setTransactions(data || [])
    }
  }

  const currentSiteVendors = vendors.filter(v => v.site_name === txForm.siteName)
  const currentSiteContractors = contractors.filter(c => c.site_name === txForm.siteName)

  const handleOpenForm = () => {
    if (!selectedViewSite) {
      alert('કૃપા કરીને પહેલા ઉપરથી સાઇટ સિલેક્ટ કરો!')
      return
    }
    setTxForm({
      ...txForm,
      siteName: selectedViewSite,
      incomeSources: [{ sourceName: '', customSourceName: '', items: [{ category: 'Materials', amount: '', description: '' }], files: [] }],
      expenseRows: [{ contractorName: '', customContractorName: '', amount: '', category: 'Labour', description: '', files: [] }]
    })
    setShowForm(true)
  }

  const addIncomeSource = () => setTxForm({...txForm, incomeSources: [...txForm.incomeSources, { sourceName: '', customSourceName: '', items: [{ category: 'Materials', amount: '', description: '' }], files: [] }]})
  const removeIncomeSource = (index) => setTxForm({...txForm, incomeSources: txForm.incomeSources.filter((_, i) => i !== index)})

  const addExpenseRow = () => setTxForm({...txForm, expenseRows: [...txForm.expenseRows, { contractorName: '', customContractorName: '', amount: '', category: 'Labour', description: '', files: [] }]})
  const removeExpenseRow = (index) => setTxForm({...txForm, expenseRows: txForm.expenseRows.filter((_, i) => i !== index)})

  const handleSaveAll = async () => {
    if (!txForm.siteName) {
      alert('કૃપા કરીને સાઇટ સિલેક્ટ કરો!')
      return
    }
    setLoading(true)
    try {
      const supervisorEmail = user?.email || 'Supervisor'

      // Save Income Entries
      for (const src of txForm.incomeSources) {
        if (src.items.length > 0 && src.items[0].amount) {
          let billUrls = []
          for (let file of src.files) {
            const ext = file.name.split('.').pop()
            const fileName = `inc_${Math.random()}.${ext}`
            const { error: upErr } = await supabase.storage.from('site-photos').upload(fileName, file)
            if (upErr) throw upErr
            const { data: { publicUrl } } = supabase.storage.from('site-photos').getPublicUrl(fileName)
            billUrls.push(publicUrl)
          }

          const party = src.sourceName === 'Other' ? src.customSourceName : src.sourceName
          for (const it of src.items) {
            if (!it.amount) continue;
            const { error: insErr } = await supabase.from('site_transactions').insert([{
              site_id: txForm.siteName,
              transaction_type: 'income',
              party_name: party,
              amount: parseFloat(it.amount),
              category: it.category,
              description: it.description,
              receipt_urls: billUrls,
              transaction_date: txForm.transactionDate,
              created_by: supervisorEmail // કોણે એન્ટ્રી કરી તેની નોંધ
            }])
            if (insErr) throw insErr
          }
        }
      }

      // Save Expense Entries
      for (const exp of txForm.expenseRows) {
        if (exp.amount) {
          let billUrls = []
          for (let file of exp.files) {
            const ext = file.name.split('.').pop()
            const fileName = `exp_${Math.random()}.${ext}`
            const { error: upErr } = await supabase.storage.from('site-photos').upload(fileName, file)
            if (upErr) throw upErr
            const { data: { publicUrl } } = supabase.storage.from('site-photos').getPublicUrl(fileName)
            billUrls.push(publicUrl)
          }

          const contractor = exp.contractorName === 'Other' ? exp.customContractorName : exp.contractorName
          const { error: insErr } = await supabase.from('site_transactions').insert([{
            site_id: txForm.siteName,
            transaction_type: 'expense',
            party_name: contractor,
            amount: parseFloat(exp.amount),
            category: exp.category,
            description: exp.description,
            receipt_urls: billUrls,
            transaction_date: txForm.transactionDate,
            created_by: supervisorEmail // કોણે એન્ટ્રી કરી તેની નોંધ
          }])
          if (insErr) throw insErr
        }
      }

      await loadTransactions()
      setShowForm(false)
      alert('Transactions saved successfully!')
    } catch (err) {
      alert('Failed to save: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 1. સાઇટ મુજબ ફિલ્ટર
  // 2. લોગિન યુઝર (user.email) મુજબ ફિલ્ટર જેથી જે આઈડીથી લોગિન હોય તેના જ હિસાબ પ્લસ-માઈનસ થઈને દેખાય
  const filteredTransactions = transactions.filter(tx => {
    const matchSite = selectedViewSite ? tx.site_id === selectedViewSite : true
    const matchUser = user?.email ? tx.created_by === user.email : true
    return matchSite && matchUser
  })

  const totalIncome = filteredTransactions
    .filter(tx => tx.transaction_type === 'income')
    .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0)

  const totalExpense = filteredTransactions
    .filter(tx => tx.transaction_type === 'expense')
    .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0)

  const netBalance = totalIncome - totalExpense

  return (
    <div style={{ padding: '12px', fontFamily: 'Inter, system-ui, sans-serif', color: '#1e293b', maxWidth: '100%', boxSizing: 'border-box' }}>
      
      <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Receipt size={18} color="#2563eb" /> Site Income & Expenses ({user?.email || 'User'})
          </h2>
          <button onClick={handleOpenForm} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: '600', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <Plus size={14} /> Add Transaction
          </button>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', color: '#64748b' }}>Select Site to View & Add *</label>
          <select value={selectedViewSite} onChange={(e) => { setSelectedViewSite(e.target.value); setShowForm(false); }} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #2563eb', backgroundColor: '#fff', fontSize: '12px', fontWeight: 'bold' }}>
            <option value="">-- Select Site First --</option>
            {sites.map(s => <option key={s.id || s.site_name} value={s.site_name}>{s.site_name}</option>)}
          </select>
        </div>
      </div>

      {selectedViewSite ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
          <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #bbf7d0', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#065f46', textTransform: 'uppercase' }}>My Total Income</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#059669', marginTop: '4px' }}>₹{totalIncome}</div>
          </div>
          <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#9f1239', textTransform: 'uppercase' }}>My Total Expense</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#dc2626', marginTop: '4px' }}>₹{totalExpense}</div>
          </div>
          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#1e40af', textTransform: 'uppercase' }}>My Net Balance (સિલક)</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: netBalance >= 0 ? '#2563eb' : '#dc2626', marginTop: '4px' }}>₹{netBalance}</div>
          </div>
        </div>
      ) : (
        <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '10px', textAlign: 'center', border: '1px dashed #cbd5e1', marginBottom: '14px', color: '#64748b', fontSize: '12px' }}>
          👆 કૃપા કરીને ઉપરથી સાઇટ સિલેક્ટ કરો જેથી તમારા દ્વારા કરવામાં આવેલ હિસાબ અને સિલક જોઈ શકાય.
        </div>
      )}

      {showForm && selectedViewSite && (
        <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '10px', border: '1px solid #2563eb', marginBottom: '16px', boxSizing: 'border-box' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', color: '#1d4ed8' }}>💰 New Entry for: {selectedViewSite}</h3>
          
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Date *</label>
            <input type="date" value={txForm.transactionDate} onChange={(e) => setTxForm({...txForm, transactionDate: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
          </div>

          {/* 1. INCOME SECTION */}
          <div style={{ backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#166534' }}>1. Income (આવક - Vendor / Party)</span>
              <button type="button" onClick={addIncomeSource} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>+ Add Source</button>
            </div>

            {txForm.incomeSources.map((src, sIndex) => (
              <div key={sIndex} style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#166534' }}>Source #{sIndex + 1}</span>
                  {txForm.incomeSources.length > 1 && (
                    <button type="button" onClick={() => removeIncomeSource(sIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={12} /></button>
                  )}
                </div>

                <select value={src.sourceName} onChange={(e) => {
                  const updated = [...txForm.incomeSources]
                  updated[sIndex].sourceName = e.target.value
                  setTxForm({...txForm, incomeSources: updated})
                }} style={{ width: '100%', padding: '6px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px' }}>
                  <option value="">-- Select Vendor / Party --</option>
                  {currentSiteVendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                  <option value="Other">Other (Manual)</option>
                </select>

                {src.sourceName === 'Other' && (
                  <input type="text" placeholder="Enter custom vendor name..." value={src.customSourceName} onChange={(e) => {
                    const updated = [...txForm.incomeSources]
                    updated[sIndex].customSourceName = e.target.value
                    setTxForm({...txForm, incomeSources: updated})
                  }} style={{ width: '100%', padding: '6px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #16a34a', fontSize: '11px' }} />
                )}

                {src.items.map((it, iIndex) => (
                  <div key={iIndex} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                    <input type="number" placeholder="Amount (₹)" value={it.amount} onChange={(e) => {
                      const updated = [...txForm.incomeSources]
                      updated[sIndex].items[iIndex].amount = e.target.value
                      setTxForm({...txForm, incomeSources: updated})
                    }} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px' }} />
                    
                    <input type="text" placeholder="Description / Remarks" value={it.description} onChange={(e) => {
                      const updated = [...txForm.incomeSources]
                      updated[sIndex].items[iIndex].description = e.target.value
                      setTxForm({...txForm, incomeSources: updated})
                    }} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px' }} />
                  </div>
                ))}

                <div style={{ marginTop: '8px', backgroundColor: '#f9fafb', padding: '6px', borderRadius: '6px', border: '1px dashed #16a34a' }}>
                  <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', color: '#166534' }}>📎 Upload Bill / Receipt</label>
                  <input type="file" multiple accept="image/*,application/pdf" onChange={(e) => {
                    if (e.target.files.length > 0) {
                      const updated = [...txForm.incomeSources]
                      updated[sIndex].files = [...updated[sIndex].files, ...Array.from(e.target.files)]
                      setTxForm({...txForm, incomeSources: updated})
                    }
                  }} style={{ fontSize: '10px', width: '100%' }} />
                </div>
              </div>
            ))}
          </div>

          {/* 2. EXPENSE SECTION */}
          <div style={{ backgroundColor: '#faf5ff', padding: '10px', borderRadius: '8px', border: '1px solid #e9d5ff', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#6b21a8' }}>2. Expense (ખર્ચ - Contractor / Other)</span>
              <button type="button" onClick={addExpenseRow} style={{ backgroundColor: '#9333ea', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>+ Add Expense</button>
            </div>

            {txForm.expenseRows.map((exp, eIndex) => (
              <div key={eIndex} style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #e9d5ff', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#6b21a8' }}>Expense Entry #{eIndex + 1}</span>
                  {txForm.expenseRows.length > 1 && (
                    <button type="button" onClick={() => removeExpenseRow(eIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={12} /></button>
                  )}
                </div>

                <select value={exp.contractorName} onChange={(e) => {
                  const updated = [...txForm.expenseRows]
                  updated[eIndex].contractorName = e.target.value
                  setTxForm({...txForm, expenseRows: updated})
                }} style={{ width: '100%', padding: '6px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px' }}>
                  <option value="">-- Select Contractor --</option>
                  {currentSiteContractors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  <option value="Other">Other (Manual)</option>
                </select>

                {exp.contractorName === 'Other' && (
                  <input type="text" placeholder="Enter custom name..." value={exp.customContractorName || ''} onChange={(e) => {
                    const updated = [...txForm.expenseRows]
                    updated[eIndex].customContractorName = e.target.value
                    setTxForm({...txForm, expenseRows: updated})
                  }} style={{ width: '100%', padding: '6px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #9333ea', fontSize: '11px' }} />
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                  <input type="number" placeholder="Amount (₹)" value={exp.amount} onChange={(e) => {
                    const updated = [...txForm.expenseRows]
                    updated[eIndex].amount = e.target.value
                    setTxForm({...txForm, expenseRows: updated})
                  }} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px' }} />
                  
                  <input type="text" placeholder="Description / Remarks" value={exp.description} onChange={(e) => {
                    const updated = [...txForm.expenseRows]
                    updated[eIndex].description = e.target.value
                    setTxForm({...txForm, expenseRows: updated})
                  }} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px' }} />
                </div>

                <div style={{ marginTop: '8px', backgroundColor: '#f9fafb', padding: '6px', borderRadius: '6px', border: '1px dashed #9333ea' }}>
                  <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', color: '#6b21a8' }}>📎 Upload Bill / Receipt</label>
                  <input type="file" multiple accept="image/*,application/pdf" onChange={(e) => {
                    if (e.target.files.length > 0) {
                      const updated = [...txForm.expenseRows]
                      updated[eIndex].files = [...updated[eIndex].files, ...Array.from(e.target.files)]
                      setTxForm({...txForm, expenseRows: updated})
                    }
                  }} style={{ fontSize: '10px', width: '100%' }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={handleSaveAll} disabled={loading} style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', flex: 1, fontSize: '12px' }}>
              {loading ? 'Saving...' : 'Save All Transactions'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', flex: 1, fontSize: '12px' }}>Cancel</button>
          </div>
        </div>
      )}

      {selectedViewSite && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: '4px 0', color: '#0f172a' }}>📋 My Transactions for {selectedViewSite}</h3>
          {filteredTransactions.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#64748b', backgroundColor: '#fff', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>No transactions recorded by you for this site yet.</div>
          ) : (
            filteredTransactions.map(tx => (
              <div key={tx.id} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#0f172a' }}>
                    <span style={{ color: tx.transaction_type === 'income' ? '#059669' : '#dc2626' }}>{tx.transaction_type.toUpperCase()}</span> {tx.party_name ? `(${tx.party_name})` : ''}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{tx.category} | {tx.transaction_date}</div>
                  {tx.description && <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>📝 {tx.description}</div>}
                  {tx.receipt_urls && tx.receipt_urls.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                      {tx.receipt_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" style={{ fontSize: '10px', color: '#2563eb', textDecoration: 'underline' }}>View Bill {i+1}</a>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: tx.transaction_type === 'income' ? '#059669' : '#dc2626' }}>
                  {tx.transaction_type === 'income' ? '+' : '-'}₹{tx.amount}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default SupervisorExpenses