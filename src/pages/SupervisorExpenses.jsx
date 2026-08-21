import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, Receipt, Wallet, Filter, FileText, Printer, ChevronDown, ChevronUp, X } from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal'

function SupervisorExpenses() {
  const { user } = useAuth()
  const [sites, setSites] = useState([])
  const [vendors, setVendors] = useState([])
  const [contractors, setContractors] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selectedViewSite, setSelectedViewSite] = useState('all')
  const [modal, setModal] = useState({ isOpen: false, message: '', onConfirm: null, onCancel: null });

  // Toggles for Report Boxes
  const [showIncomeReportBox, setShowIncomeReportBox] = useState(false)
  const [showExpenseReportBox, setShowExpenseReportBox] = useState(false)

  // Income Report Filters
  const [incomeSourceFilter, setIncomeSourceFilter] = useState('all')
  const [incomeStartDate, setIncomeStartDate] = useState('')
  const [incomeEndDate, setIncomeEndDate] = useState('')

  // Expense Report Filters
  const [reportContractor, setReportContractor] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [txForm, setTxForm] = useState({
    siteName: '',
    transactionDate: new Date().toISOString().split('T')[0],
    incomeSources: [{ 
      sourceType: 'T&J Admin', 
      customSource: '', 
      paymentMode: 'Cash', 
      items: [{ amount: '', description: '' }], 
      files: [] 
    }],
    expenseRows: [{ contractorName: '', customContractorName: '', amount: '', category: 'Labour', description: '', files: [] }]
  })

  useEffect(() => {
    loadSites()
    loadVendors()
    loadContractors()
    loadTransactions()
  }, [user])

  // --- Photo Compression & Storage Helpers ---
  const compressImage = (file) => {
    return new Promise((resolve) => {
      if (!file || !(file instanceof Blob || file instanceof File) || file.type === 'application/pdf') {
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

  const uploadFilesToSupabase = async (fileArray, folderName) => {
    if (!fileArray || !Array.isArray(fileArray)) return [];
    let urls = [];
    for (let file of fileArray) {
      if (file instanceof File) {
        const compressedFile = await compressImage(file);
        const fileExt = compressedFile.name ? compressedFile.name.split('.').pop() : 'jpg';
        const fileName = `${folderName}/${user?.id || 'user'}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
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

  const deleteFileFromStorage = async (fileUrl) => {
    try {
      if (!fileUrl || typeof fileUrl !== 'string') return;
      const urlParts = fileUrl.split('/site-photos/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('site-photos').remove([filePath]);
      }
    } catch (err) {
      console.error("Error deleting file from storage:", err);
    }
  };

  // --- Auto-Save Draft ---
  useEffect(() => {
    if (!showForm || !txForm.siteName || !user?.id) return;
    const timer = setTimeout(async () => {
      try {
        const updatedIncome = await Promise.all(txForm.incomeSources.map(async (src) => ({
          ...src,
          files: await uploadFilesToSupabase(src.files, 'income_drafts')
        })));

        const updatedExpense = await Promise.all(txForm.expenseRows.map(async (exp) => ({
          ...exp,
          files: await uploadFilesToSupabase(exp.files, 'expense_drafts')
        })));

        await supabase.from('transaction_drafts').upsert({
          user_id: user.id,
          site_id: txForm.siteName,
          report_data: { 
            ...txForm, 
            incomeSources: updatedIncome, 
            expenseRows: updatedExpense 
          },
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, site_id' });

        setTxForm(prev => ({
          ...prev,
          incomeSources: updatedIncome,
          expenseRows: updatedExpense
        }));
      } catch (err) {
        console.error("Draft auto-save error:", err);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [txForm, showForm, user]);

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

  const loadVendors = async () => {
    const { data } = await supabase.from('site_vendors').select('*')
    setVendors(data || [])
  }

  const loadContractors = async () => {
    const { data } = await supabase.from('contractors').select('*')
    setContractors(data || [])
  }

  const loadTransactions = async () => {
    let query = supabase.from('site_transactions').select('*').order('transaction_date', { ascending: false }).order('created_at', { ascending: false })
    const { data, error } = await query
    if (error) {
      console.error('Error loading transactions:', error.message)
    } else {
      setTransactions(data || [])
    }
  }

  const currentSiteContractors = contractors.filter(c => c.site_name === txForm.siteName)

  const handleOpenForm = async () => {
    if (!selectedViewSite || selectedViewSite === 'all') {
      setModal({ isOpen: true, message: 'કૃપા કરીને એન્ટ્રી કરવા માટે ચોક્કસ સાઇટ સિલેક્ટ કરો!', onConfirm: () => setModal({ isOpen: false }) })
      return
    }

    const { data: draftData } = await supabase
      .from('transaction_drafts')
      .select('report_data')
      .eq('user_id', user.id)
      .eq('site_id', selectedViewSite)
      .maybeSingle();

    if (draftData && draftData.report_data) {
      setTxForm(draftData.report_data);
    } else {
      setTxForm({
        siteName: selectedViewSite,
        transactionDate: new Date().toISOString().split('T')[0],
        incomeSources: [{ sourceType: 'T&J Admin', customSource: '', paymentMode: 'Cash', items: [{ amount: '', description: '' }], files: [] }],
        expenseRows: [{ contractorName: '', customContractorName: '', amount: '', category: 'Labour', description: '', files: [] }]
      })
    }
    setShowForm(true)
  }

  const addIncomeSource = () => setTxForm({...txForm, incomeSources: [...txForm.incomeSources, { sourceType: 'T&J Admin', customSource: '', paymentMode: 'Cash', items: [{ amount: '', description: '' }], files: [] }]})
  const removeIncomeSource = (index) => setTxForm({...txForm, incomeSources: txForm.incomeSources.filter((_, i) => i !== index)})

  const addExpenseRow = () => setTxForm({...txForm, expenseRows: [...txForm.expenseRows, { contractorName: '', customContractorName: '', amount: '', category: 'Labour', description: '', files: [] }]})
  const removeExpenseRow = (index) => setTxForm({...txForm, expenseRows: txForm.expenseRows.filter((_, i) => i !== index)})

  const confirmRemoveFile = (type, index, fileIndex) => {
    setModal({
      isOpen: true,
      message: '⚠️ શું તમે ખરેખર આ બિલ અથવા ફોટો ડિલીટ કરવા માંગો છો?',
      onConfirm: async () => {
        const updated = { ...txForm };
        const arr = type === 'income' ? updated.incomeSources[index].files : updated.expenseRows[index].files;
        const fileToRemove = arr[fileIndex];
        
        if (typeof fileToRemove === 'string') {
          await deleteFileFromStorage(fileToRemove);
        }
        
        arr.splice(fileIndex, 1);
        setTxForm(updated);
        setModal({ isOpen: false });
      },
      onCancel: () => setModal({ isOpen: false })
    });
  };

  const sendWhatsAppNotification = (siteName, amount, contractor, createdBy) => {
    const adminPhone = "918238598234"; 
    const message = `🚨 *New Expense Alert - T&J Infra*\n\n📍 *Site:* ${siteName}\n👤 *Supervisor:* ${createdBy}\n🛠️ *Party/Contractor:* ${contractor}\n💰 *Amount:* ₹${amount}`;
    console.log("WhatsApp alert triggered:", message);
  }

  const handleSaveAll = async () => {
    if (!txForm.siteName || txForm.siteName === 'all') {
      setModal({ isOpen: true, message: 'કૃપા કરીને સાઇટ સિલેક્ટ કરો!', onConfirm: () => setModal({ isOpen: false }) })
      return
    }

    const hasIncome = txForm.incomeSources.some(src => src.items.some(it => it.amount && parseFloat(it.amount) > 0));
    const hasExpense = txForm.expenseRows.some(exp => exp.amount && parseFloat(exp.amount) > 0);
    
    if (!hasIncome && !hasExpense) {
      setModal({ isOpen: true, message: '⚠️ કૃપા કરીને આવક કે ખર્ચની વિગત ઉમેરો, ફોર્મ ખાલી છે!', onConfirm: () => setModal({ isOpen: false }) });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (txForm.transactionDate > today) {
      setModal({ isOpen: true, message: '⚠️ ભવિષ્યની તારીખની એન્ટ્રી કરી શકાતી નથી!', onConfirm: () => setModal({ isOpen: false }) });
      return;
    }

    for (const src of txForm.incomeSources) {
      for (const it of src.items) {
        if (it.amount && parseFloat(it.amount) <= 0) {
          setModal({ isOpen: true, message: '⚠️ આવક (Income) ની રકમ 0 કે માઇનસ હોઈ શકે નહીં!', onConfirm: () => setModal({ isOpen: false }) })
          return;
        }
      }
    }
    for (const exp of txForm.expenseRows) {
      if (exp.amount && parseFloat(exp.amount) <= 0) {
        setModal({ isOpen: true, message: '⚠️ ખર્ચ (Expense) ની રકમ 0 કે માઇનસ હોઈ શકે નહીં!', onConfirm: () => setModal({ isOpen: false }) })
        return;
      }
    }

    setLoading(true)
    try {
      const supervisorEmail = user?.email || 'Supervisor'

      for (const src of txForm.incomeSources) {
        if (src.items.length > 0 && src.items[0].amount) {
          let billUrls = []
          for (let file of src.files) {
            if (file instanceof File) {
              const compressed = await compressImage(file)
              const ext = compressed.name ? compressed.name.split('.').pop() : 'jpg'
              const fileName = `inc_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
              const { error: upErr } = await supabase.storage.from('site-photos').upload(fileName, compressed)
              if (upErr) throw upErr
              const { data: { publicUrl } } = supabase.storage.from('site-photos').getPublicUrl(fileName)
              billUrls.push(publicUrl)
            } else if (typeof file === 'string') {
              billUrls.push(file)
            }
          }

          const partyName = src.sourceType === 'Other' ? src.customSource : 'T&J Admin'
          for (const it of src.items) {
            if (!it.amount) continue;
            const { error: insErr } = await supabase.from('site_transactions').insert([{
              site_id: txForm.siteName,
              transaction_type: 'income',
              party_name: partyName,
              amount: parseFloat(it.amount),
              category: 'Admin Funding',
              description: it.description,
              receipt_urls: billUrls,
              transaction_date: txForm.transactionDate,
              created_by: supervisorEmail
            }])
            if (insErr) throw insErr
          }
        }
      }

      for (const exp of txForm.expenseRows) {
        if (exp.amount) {
          let billUrls = []
          for (let file of exp.files) {
            if (file instanceof File) {
              const compressed = await compressImage(file)
              const ext = compressed.name ? compressed.name.split('.').pop() : 'jpg'
              const fileName = `exp_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
              const { error: upErr } = await supabase.storage.from('site-photos').upload(fileName, compressed)
              if (upErr) throw upErr
              const { data: { publicUrl } } = supabase.storage.from('site-photos').getPublicUrl(fileName)
              billUrls.push(publicUrl)
            } else if (typeof file === 'string') {
              billUrls.push(file)
            }
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
            created_by: supervisorEmail
          }])
          if (insErr) throw insErr

          sendWhatsAppNotification(txForm.siteName, exp.amount, contractor, supervisorEmail);
        }
      }

      await supabase.from('transaction_drafts').delete().eq('user_id', user.id).eq('site_id', txForm.siteName);

      await loadTransactions()
      setShowForm(false)
      setModal({ isOpen: true, message: '✅ Transactions saved successfully & Admin alerted!', onConfirm: () => setModal({ isOpen: false }) })
    } catch (err) {
      setModal({ isOpen: true, message: '❌ Failed to save: ' + err.message, onConfirm: () => setModal({ isOpen: false }) })
    } finally {
      setLoading(false)
    }
  }

  // --- Calculations ---
  const isAdmin = user?.email === 'infra.tnj@gmail.com'

  const relevantTransactions = transactions.filter(tx => {
    return isAdmin ? true : (tx.created_by === user?.email)
  })

  const assignedSiteNames = sites.map(s => s.site_name)

  const siteTransactions = selectedViewSite === 'all'
    ? (isAdmin ? relevantTransactions : relevantTransactions.filter(tx => assignedSiteNames.includes(tx.site_id)))
    : relevantTransactions.filter(tx => tx.site_id === selectedViewSite)

  const globalTotalIncome = relevantTransactions
    .filter(tx => isAdmin ? true : assignedSiteNames.includes(tx.site_id))
    .filter(tx => tx.transaction_type === 'income')
    .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0)

  const globalTotalExpense = relevantTransactions
    .filter(tx => isAdmin ? true : assignedSiteNames.includes(tx.site_id))
    .filter(tx => tx.transaction_type === 'expense')
    .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0)

  // સિલક હંમેશા આઈડી મુજબ ગ્લોબલ જ રહેશે, સાઇટ બદલવાથી બદલાશે નહીં
  const netBalance = globalTotalIncome - globalTotalExpense

  const siteTotalIncome = siteTransactions
    .filter(tx => tx.transaction_type === 'income')
    .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0)

  const siteTotalExpense = siteTransactions
    .filter(tx => tx.transaction_type === 'expense')
    .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0)

  const filteredIncomeTransactions = siteTransactions.filter(tx => {
    if (tx.transaction_type !== 'income') return false;
    const matchSource = incomeSourceFilter === 'all' || tx.party_name === incomeSourceFilter;
    const matchStart = !incomeStartDate || tx.transaction_date >= incomeStartDate;
    const matchEnd = !incomeEndDate || tx.transaction_date <= incomeEndDate;
    return matchSource && matchStart && matchEnd;
  });

  const filteredIncomeTotal = filteredIncomeTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);

  const filteredReportTransactions = siteTransactions.filter(tx => {
    if (tx.transaction_type !== 'expense') return false;
    const matchContractor = reportContractor === 'all' || tx.party_name === reportContractor
    const matchStartDate = !startDate || tx.transaction_date >= startDate
    const matchEndDate = !endDate || tx.transaction_date <= endDate
    return matchContractor && matchStartDate && matchEndDate
  })

  const filteredExpenseTotal = filteredReportTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  }

  const generatePDFReport = (type) => {
    const printWindow = window.open('', '_blank');
    const title = type === 'expense' ? 'Expense Report' : 'Income Report';
    const items = type === 'expense' ? filteredReportTransactions : filteredIncomeTransactions;
    const total = type === 'expense' ? filteredExpenseTotal : filteredIncomeTotal;

    const htmlContent = `
      <html>
        <head>
          <title>T&J Infra - ${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h2 { color: #1e3a8a; border-bottom: 2px solid #2563eb; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 12px; text-align: left; }
            th { background-color: #f1f5f9; }
            .total { margin-top: 15px; font-size: 14px; font-weight: bold; text-align: right; }
          </style>
        </head>
        <body>
          <h2>T&J Infra Portal - ${title}</h2>
          <p><strong>Site:</strong> ${selectedViewSite === 'all' ? 'All Assigned Sites' : selectedViewSite}</p>
          <p><strong>Generated By:</strong> ${user?.email}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Site</th>
                <th>Party Name</th>
                <th>Description</th>
                <th>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(tx => `
                <tr>
                  <td>${formatDate(tx.transaction_date)}</td>
                  <td>${tx.site_id}</td>
                  <td>${tx.party_name || 'N/A'}</td>
                  <td>${tx.description || '-'}</td>
                  <td>₹${tx.amount.toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">Total Amount: ₹${total.toLocaleString('en-IN')}</div>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  }

  return (
    <div style={{ padding: '16px', fontFamily: 'Inter, system-ui, sans-serif', color: '#1e293b', maxWidth: '100%', boxSizing: 'border-box', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* Header & Site Selection */}
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', color: '#0f172a' }}>
            <Receipt size={18} color="#2563eb" /> Site Income & Expenses
          </h2>
          <button onClick={handleOpenForm} style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '25px', fontWeight: '600', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(37,99,235,0.3)' }}>
            <Plus size={15} /> Add Tx
          </button>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', color: '#64748b' }}>Select Site to View Expenses *</label>
          <select value={selectedViewSite} onChange={(e) => { setSelectedViewSite(e.target.value); setShowForm(false); }} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '12px', fontWeight: 'bold', boxSizing: 'border-box', outline: 'none' }}>
            <option value="all">🌐 All Sites (બધી સાઇટ)</option>
            {sites.map(s => <option key={s.id || s.site_name} value={s.site_name}>{s.site_name}</option>)}
          </select>
        </div>
      </div>

      {/* WORKING BALANCE & CARDS */}
      {!showForm && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '14px', boxSizing: 'border-box' }}>
          {/* સિલક હંમેશા ગ્લોબલ (કુલ) જ રહેશે */}
          <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', padding: '16px', borderRadius: '14px', textAlign: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(37,99,235,0.2)', boxSizing: 'border-box' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: 0.9, letterSpacing: '0.5px' }}>
              <Wallet size={16} /> My Working Balance (કુલ સિલક)
            </div>
            <div style={{ fontSize: '26px', fontWeight: '900', marginTop: '6px' }}>
              ₹{netBalance.toLocaleString('en-IN')}
            </div>
          </div>

          {isAdmin && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', boxSizing: 'border-box' }}>
              <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '12px', textAlign: 'center', boxSizing: 'border-box' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#065f46', textTransform: 'uppercase' }}>{selectedViewSite !== 'all' ? 'Site Funds Received' : 'Total Funds Received'}</div>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#059669', marginTop: '4px' }}>₹{(selectedViewSite !== 'all' ? siteTotalIncome : globalTotalIncome).toLocaleString('en-IN')}</div>
              </div>
              <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', padding: '12px', borderRadius: '12px', textAlign: 'center', boxSizing: 'border-box' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#9f1239', textTransform: 'uppercase' }}>{selectedViewSite !== 'all' ? 'Site Total Expenses' : 'Total Expenses (All)'}</div>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#dc2626', marginTop: '4px' }}>₹{(selectedViewSite !== 'all' ? siteTotalExpense : globalTotalExpense).toLocaleString('en-IN')}</div>
              </div>
            </div>
          )}

          {/* INCOME REPORT TOGGLE BOX */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #bbf7d0', borderRadius: '12px', overflow: 'hidden', boxSizing: 'border-box' }}>
            <div onClick={() => setShowIncomeReportBox(!showIncomeReportBox)} style={{ backgroundColor: '#f0fdf4', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxSizing: 'border-box' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Filter size={14} /> Check Funds Received from Admin (Create Income Report)
              </span>
              {showIncomeReportBox ? <ChevronUp size={16} color="#166534" /> : <ChevronDown size={16} color="#166534" />}
            </div>

            {showIncomeReportBox && (
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #bbf7d0', boxSizing: 'border-box' }}>
                <select value={incomeSourceFilter} onChange={(e) => setIncomeSourceFilter(e.target.value)} style={{ width: '100%', padding: '8px', fontSize: '11px', borderRadius: '6px', border: '1px solid #bbf7d0', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                  <option value="all">All Sources / Parties</option>
                  {Array.from(new Set(siteTransactions.filter(t => t.transaction_type === 'income').map(t => t.party_name))).map((name, i) => (
                    <option key={i} value={name}>{name}</option>
                  ))}
                </select>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', boxSizing: 'border-box' }}>
                  <input type="date" value={incomeStartDate} max={new Date().toISOString().split('T')[0]} onChange={(e) => setIncomeStartDate(e.target.value)} style={{ width: '100%', padding: '8px', fontSize: '11px', borderRadius: '6px', border: '1px solid #bbf7d0', boxSizing: 'border-box' }} />
                  <input type="date" value={incomeEndDate} max={new Date().toISOString().split('T')[0]} onChange={(e) => setIncomeEndDate(e.target.value)} style={{ width: '100%', padding: '8px', fontSize: '11px', borderRadius: '6px', border: '1px solid #bbf7d0', boxSizing: 'border-box' }} />
                </div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#059669', backgroundColor: '#f0fdf4', padding: '8px 10px', borderRadius: '6px', border: '1px solid #bbf7d0', textAlign: 'center', boxSizing: 'border-box' }}>
                  Filtered Total: ₹{filteredIncomeTotal.toLocaleString('en-IN')}
                </div>
                <button type="button" onClick={() => generatePDFReport('income')} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', marginTop: '4px' }}>
                  <Printer size={14} /> Print / Download Income Report
                </button>
              </div>
            )}
          </div>

          {/* EXPENSE REPORT TOGGLE BOX */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #e9d5ff', borderRadius: '12px', overflow: 'hidden', boxSizing: 'border-box' }}>
            <div onClick={() => setShowExpenseReportBox(!showExpenseReportBox)} style={{ backgroundColor: '#faf5ff', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxSizing: 'border-box' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b21a8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={14} /> Create Expense Report (Date to Date)
              </span>
              {showExpenseReportBox ? <ChevronUp size={16} color="#6b21a8" /> : <ChevronDown size={16} color="#6b21a8" />}
            </div>

            {showExpenseReportBox && (
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #e9d5ff', boxSizing: 'border-box' }}>
                <select value={reportContractor} onChange={(e) => setReportContractor(e.target.value)} style={{ width: '100%', padding: '8px', fontSize: '11px', borderRadius: '6px', border: '1px solid #d8b4fe', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                  <option value="all">All Contractors / Parties</option>
                  {Array.from(new Set(siteTransactions.filter(t => t.transaction_type === 'expense').map(t => t.party_name))).map((name, i) => (
                    <option key={i} value={name}>{name}</option>
                  ))}
                </select>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', boxSizing: 'border-box' }}>
                  <input type="date" value={startDate} max={new Date().toISOString().split('T')[0]} onChange={(e) => setStartDate(e.target.value)} style={{ width: '100%', padding: '8px', fontSize: '11px', borderRadius: '6px', border: '1px solid #d8b4fe', boxSizing: 'border-box' }} />
                  <input type="date" value={endDate} max={new Date().toISOString().split('T')[0]} onChange={(e) => setEndDate(e.target.value)} style={{ width: '100%', padding: '8px', fontSize: '11px', borderRadius: '6px', border: '1px solid #d8b4fe', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#7e22ce' }}>Filtered Total: ₹{filteredExpenseTotal.toLocaleString('en-IN')}</span>
                  <button type="button" onClick={() => generatePDFReport('expense')} style={{ backgroundColor: '#9333ea', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <Printer size={14} /> Print / Download Expense Report
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TRANSACTION FORM */}
      {showForm && selectedViewSite !== 'all' && (
        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '14px', border: '2px solid #2563eb', marginBottom: '16px', boxSizing: 'border-box', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#1d4ed8' }}>💰 New Entry for: {selectedViewSite}</h3>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', color: '#475569' }}>Date *</label>
            <input type="date" value={txForm.transactionDate} max={new Date().toISOString().split('T')[0]} onChange={(e) => setTxForm({...txForm, transactionDate: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
          </div>

          {/* 1. INCOME SECTION */}
          <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '10px', border: '1px solid #bbf7d0', marginBottom: '14px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#166534' }}>1. Income (Funds from T&J Admin / Office)</span>
              <button type="button" onClick={addIncomeSource} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>+ Add Source</button>
            </div>

            {txForm.incomeSources.map((src, sIndex) => (
              <div key={sIndex} style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '10px', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#166534' }}>Source #{sIndex + 1}</span>
                  {txForm.incomeSources.length > 1 && (
                    <button type="button" onClick={() => removeIncomeSource(sIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={14} /></button>
                  )}
                </div>

                <select value={src.sourceType} onChange={(e) => {
                  const updated = [...txForm.incomeSources]
                  updated[sIndex].sourceType = e.target.value
                  setTxForm({...txForm, incomeSources: updated})
                }} style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }}>
                  <option value="T&J Admin">T&J Admin / Office Funding</option>
                  <option value="Other">Other Income (Manual)</option>
                </select>

                {src.sourceType === 'Other' && (
                  <input type="text" placeholder="Enter custom source name..." value={src.customSource} onChange={(e) => {
                    const updated = [...txForm.incomeSources]
                    updated[sIndex].customSource = e.target.value
                    setTxForm({...txForm, incomeSources: updated})
                  }} style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #16a34a', fontSize: '11px', boxSizing: 'border-box' }} />
                )}

                {src.items.map((it, iIndex) => (
                  <div key={iIndex} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '6px', boxSizing: 'border-box' }}>
                    <input type="number" placeholder="Amount (₹)" value={it.amount} onChange={(e) => {
                      const updated = [...txForm.incomeSources]
                      updated[sIndex].items[iIndex].amount = e.target.value
                      setTxForm({...txForm, incomeSources: updated})
                    }} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
                    
                    <input type="text" placeholder="Description / Remarks" value={it.description} onChange={(e) => {
                      const updated = [...txForm.incomeSources]
                      updated[sIndex].items[iIndex].description = e.target.value
                      setTxForm({...txForm, incomeSources: updated})
                    }} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
                  </div>
                ))}

                <div style={{ marginTop: '8px', backgroundColor: '#f9fafb', padding: '8px', borderRadius: '6px', border: '1px dashed #16a34a', boxSizing: 'border-box' }}>
                  <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', color: '#166534' }}>📎 Upload Bill / Receipt</label>
                  <input type="file" multiple accept="image/*,application/pdf" onChange={(e) => {
                    if (e.target.files.length > 0) {
                      const updated = [...txForm.incomeSources]
                      updated[sIndex].files = [...updated[sIndex].files, ...Array.from(e.target.files)]
                      setTxForm({...txForm, incomeSources: updated})
                    }
                  }} style={{ fontSize: '10px', width: '100%', boxSizing: 'border-box' }} />
                  
                  {src.files.length > 0 && (
                    <div style={{ marginTop: '6px', fontSize: '10px', color: '#166534' }}>
                      {src.files.map((file, fIdx) => (
                        <div key={fIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '4px 6px', margin: '2px 0', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                          <span>{file.name || (typeof file === 'string' ? file.split('/').pop() : 'File')}</span>
                          <button type="button" onClick={() => confirmRemoveFile('income', sIndex, fIdx)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>x</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 2. EXPENSE SECTION */}
          <div style={{ backgroundColor: '#faf5ff', padding: '12px', borderRadius: '10px', border: '1px solid #e9d5ff', marginBottom: '14px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#6b21a8' }}>2. Expense (ખર્ચ - Contractor / Other)</span>
              <button type="button" onClick={addExpenseRow} style={{ backgroundColor: '#9333ea', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>+ Add Expense</button>
            </div>

            {txForm.expenseRows.map((exp, eIndex) => (
              <div key={eIndex} style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #e9d5ff', marginBottom: '10px', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#6b21a8' }}>Expense Entry #{eIndex + 1}</span>
                  {txForm.expenseRows.length > 1 && (
                    <button type="button" onClick={() => removeExpenseRow(eIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={14} /></button>
                  )}
                </div>

                <select value={exp.contractorName} onChange={(e) => {
                  const updated = [...txForm.expenseRows]
                  updated[eIndex].contractorName = e.target.value
                  setTxForm({...txForm, expenseRows: updated})
                }} style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }}>
                  <option value="">-- Select Contractor --</option>
                  {currentSiteContractors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  <option value="Other">Other (Manual)</option>
                </select>

                {exp.contractorName === 'Other' && (
                  <input type="text" placeholder="Enter custom name..." value={exp.customContractorName || ''} onChange={(e) => {
                    const updated = [...txForm.expenseRows]
                    updated[eIndex].customContractorName = e.target.value
                    setTxForm({...txForm, expenseRows: updated})
                  }} style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #9333ea', fontSize: '11px', boxSizing: 'border-box' }} />
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '6px', boxSizing: 'border-box' }}>
                  <input type="number" placeholder="Amount (₹)" value={exp.amount} onChange={(e) => {
                    const updated = [...txForm.expenseRows]
                    updated[eIndex].amount = e.target.value
                    setTxForm({...txForm, expenseRows: updated})
                  }} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
                  
                  <input type="text" placeholder="Description / Remarks" value={exp.description} onChange={(e) => {
                    const updated = [...txForm.expenseRows]
                    updated[eIndex].description = e.target.value
                    setTxForm({...txForm, expenseRows: updated})
                  }} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
                </div>

                <div style={{ marginTop: '8px', backgroundColor: '#f9fafb', padding: '8px', borderRadius: '6px', border: '1px dashed #9333ea', boxSizing: 'border-box' }}>
                  <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', color: '#6b21a8' }}>📎 Upload Bill / Receipt</label>
                  <input type="file" multiple accept="image/*,application/pdf" onChange={(e) => {
                    if (e.target.files.length > 0) {
                      const updated = [...txForm.expenseRows]
                      updated[eIndex].files = [...updated[eIndex].files, ...Array.from(e.target.files)]
                      setTxForm({...txForm, expenseRows: updated})
                    }
                  }} style={{ fontSize: '10px', width: '100%', boxSizing: 'border-box' }} />

                  {exp.files.length > 0 && (
                    <div style={{ marginTop: '6px', fontSize: '10px', color: '#6b21a8' }}>
                      {exp.files.map((file, fIdx) => (
                        <div key={fIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '4px 6px', margin: '2px 0', borderRadius: '4px', border: '1px solid #e9d5ff' }}>
                          <span>{file.name || (typeof file === 'string' ? file.split('/').pop() : 'File')}</span>
                          <button type="button" onClick={() => confirmRemoveFile('expense', eIndex, fIdx)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>x</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={handleSaveAll} disabled={loading} style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', flex: 1, fontSize: '12px' }}>
              {loading ? 'Saving...' : 'Save All Transactions'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ backgroundColor: '#e2e8f0', color: '#1e293b', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', flex: 1, fontSize: '12px' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* RECENT 10 TRANSACTIONS LIST */}
      {!showForm && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: '6px 0', color: '#0f172a' }}>📋 Recent 10 Transactions ({selectedViewSite === 'all' ? 'All Assigned Sites' : selectedViewSite})</h3>
          {siteTransactions.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#64748b', backgroundColor: '#fff', padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>No transactions found.</div>
          ) : (
            siteTransactions.slice(0, 10).map(tx => (
              <div key={tx.id} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', boxSizing: 'border-box' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#0f172a' }}>
                    <span style={{ color: tx.transaction_type === 'income' ? '#059669' : '#dc2626' }}>{tx.transaction_type.toUpperCase()}</span> {tx.party_name ? `(${tx.party_name})` : ''} <span style={{ fontSize: '10px', color: '#64748b' }}>[Site: {tx.site_id}]</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    📅 {formatDate(tx.transaction_date)} | 👤 <strong style={{ color: '#2563eb' }}>{tx.created_by || 'N/A'}</strong>
                  </div>
                  {tx.description && <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>📝 {tx.description}</div>}
                  {tx.receipt_urls && tx.receipt_urls.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                      {tx.receipt_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" style={{ fontSize: '10px', color: '#2563eb', textDecoration: 'underline', fontWeight: '600' }}>View Bill {i+1}</a>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '15px', color: tx.transaction_type === 'income' ? '#059669' : '#dc2626' }}>
                  {tx.transaction_type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <ConfirmModal isOpen={modal.isOpen} message={modal.message} onConfirm={modal.onConfirm} onCancel={modal.onCancel} />
    </div>
  )
}

export default SupervisorExpenses