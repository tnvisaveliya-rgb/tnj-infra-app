import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, MapPin, Check, Clock, Building2, Globe, ArrowLeft, Users, UserCog, ChevronDown, ChevronUp, FileText, FileDown, X } from 'lucide-react';

export default function MasterTransactionHub({ adminUser }) {
  // --- 1. State Management (Global Filters) ---
  const [isAllDates, setIsAllDates] = useState(true);
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [selectedType, setSelectedType] = useState('All'); 
  const [selectedState, setSelectedState] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All'); 

  // --- 2. View Mode Toggle (Supervisor vs Labour) ---
  const [viewMode, setViewMode] = useState('SUPERVISOR'); 

  // --- 3. Data States ---
  const [pendingRequests, setPendingRequests] = useState([]);
  const [actionData, setActionData] = useState({});
  const [ledgerSummary, setLedgerSummary] = useState([]); 
  const [expandedId, setExpandedId] = useState(null); 
  
  const [allLocationsDb, setAllLocationsDb] = useState([]);
  const [stateList, setStateList] = useState([]);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSubTabs, setActiveSubTabs] = useState({});

  // 🎯 Print Report Pop-up State
  const [reportModal, setReportModal] = useState({ isOpen: false, person: null, mode: null });

  const setActiveSubTab = (personId, tabType) => {
    setActiveSubTabs(prev => ({ ...prev, [personId]: tabType }));
  };

  // ==========================================
  // 🛠️ Fetch Plants AND Sites Data
  // ==========================================
  useEffect(() => {
    const fetchLocationsData = async () => {
      try {
        const { data: plantsData } = await supabase.from('plants').select('*');
        const formattedPlants = (plantsData || []).map(p => ({
          name: p.plant_name,
          state: p.state || 'Unknown',
          type: 'Plant'
        }));

        const { data: sitesData } = await supabase.from('sites').select('*');
        const formattedSites = (sitesData || []).map(s => ({
          name: s.site_name,
          state: s.state || 'Unknown', 
          type: 'Site'
        }));

        const combinedData = [...formattedPlants, ...formattedSites];
        setAllLocationsDb(combinedData);

        const uniqueStates = [...new Set(combinedData.map(loc => loc.state).filter(s => s !== 'Unknown' && s))];
        setStateList(uniqueStates);

      } catch (error) {
        console.error("Error fetching locations:", error);
      }
    };
    
    fetchLocationsData();
  }, []);

  useEffect(() => {
    let filtered = allLocationsDb;
    
    if (selectedType !== 'All') {
      filtered = filtered.filter(loc => loc.type === selectedType);
    }
    
    if (selectedState !== 'All') {
      filtered = filtered.filter(loc => loc.state === selectedState);
    }
    
    setAvailableLocations([...new Set(filtered.map(loc => loc.name).filter(Boolean))]);
  }, [selectedState, selectedType, allLocationsDb]);

  // ==========================================
  // Fetch Pending Requests 
  // ==========================================
  const fetchPendingRequests = async () => {
    const { data } = await supabase
      .from('plant_fund_transfers') 
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });
    setPendingRequests(data || []);
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  // ==========================================
  // Fetch Ledger Data based on View Mode
  // ==========================================
  useEffect(() => {
    const fetchLedgerData = async () => {
      setLoading(true);
      try {
        if (viewMode === 'SUPERVISOR') {
          let fundQuery = supabase.from('plant_fund_transfers').select('*');
          let expQuery = supabase.from('plant_expenses').select('*');

          if (!isAllDates) {
            fundQuery = fundQuery.gte('request_date', fromDate).lte('request_date', toDate);
            expQuery = expQuery.gte('expense_date', fromDate).lte('expense_date', toDate);
          }

          const [fundRes, expRes] = await Promise.all([fundQuery, expQuery]);
          const summaryMap = {};

          if (fundRes.data) {
            fundRes.data.forEach(row => {
              if (row.status === 'REJECTED') return;
              const amount = Number(row.approved_amount || row.amount || row.requested_amount) || 0;
              const personId = (row.received_by || row.supervisor_name || 'unknown').trim().toLowerCase();
              const personName = personId;
              const locName = row.plant_name || row.location_name || 'Unknown';

              if (!summaryMap[personId]) {
                summaryMap[personId] = { 
                  id: personId, name: personName, totalReceived: 0, totalAdminFund: 0, totalOtherFund: 0, totalExpense: 0, receivedTransactions: [], expenseTransactions: [], locations: new Set() 
                };
              }

              const isBuyer = row.admin_remarks && row.admin_remarks.includes('ખરીદનાર');
              const paidByVal = isBuyer 
                ? row.admin_remarks.split('|')[0].trim() 
                : (row.approved_by || row.paid_by_user_name || 'Admin');

              summaryMap[personId].totalReceived += amount;
              if (isBuyer) {
                summaryMap[personId].totalOtherFund += amount;
              } else {
                summaryMap[personId].totalAdminFund += amount;
              }

              summaryMap[personId].locations.add(locName);
              summaryMap[personId].receivedTransactions.push({
                date: row.received_date || row.transfer_date || row.request_date || row.transaction_date,
                amount: amount,
                paidBy: paidByVal,
                location: locName,
                purpose: row.purpose || row.expense_type || '-',
                isAdminFund: !isBuyer 
              });
            });
          }

          if (expRes.data) {
            expRes.data.forEach(row => {
              const amount = Number(row.amount) || 0;
              const personId = (row.submitted_by || 'unknown').trim().toLowerCase();
              const personName = personId;
              const locName = row.plant_name || 'Unknown';

              if (!summaryMap[personId]) {
                summaryMap[personId] = { 
                  id: personId, name: personName, totalReceived: 0, totalAdminFund: 0, totalOtherFund: 0, totalExpense: 0, receivedTransactions: [], expenseTransactions: [], locations: new Set() 
                };
              }

              summaryMap[personId].totalExpense += amount;
              summaryMap[personId].locations.add(locName);
              
              summaryMap[personId].expenseTransactions.push({
                date: row.expense_date,
                amount: amount,
                paidTo: row.paid_to || row.expense_category || 'Unknown', 
                mode: row.payment_mode || 'Cash', 
                location: locName,
                purpose: (row.remarks && row.remarks !== 'EMPTY') ? row.remarks : (row.expense_category || '-')
              });
            });
          }

          let finalArray = Object.values(summaryMap);

          if (selectedLocation !== 'All') {
            finalArray = finalArray.filter(person => person.locations.has(selectedLocation));
          } else if (selectedState !== 'All' || selectedType !== 'All') {
            if (availableLocations.length > 0) {
              finalArray = finalArray.filter(person => 
                Array.from(person.locations).some(loc => availableLocations.includes(loc))
              );
            } else {
              finalArray = [];
            }
          }

          finalArray = finalArray.map(item => {
            item.locations = Array.from(item.locations);
            item.receivedTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            item.expenseTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            return item;
          });

          setLedgerSummary(finalArray);

        } else {
          // 🛠️ LABOUR MODE
          let query = supabase.from('plant_expenses').select('*');
          if (!isAllDates) {
            query = query.gte('expense_date', fromDate).lte('expense_date', toDate);
          }

          const { data: contractorsData } = await supabase.from('contractors').select('name, site_name, is_active');
          const activeContractorLocs = {};
          if (contractorsData) {
            contractorsData.forEach(c => {
              if (String(c.is_active).trim().toLowerCase() === 'true') {
                activeContractorLocs[(c.name || '').toLowerCase().trim()] = c.site_name;
              }
            });
          }

          const { data, error } = await query;
          if (error) throw error;

          const summaryMap = {};
          if (data) {
            data.forEach(row => {
              const category = String(row.expense_category || '').toLowerCase().trim();
              const remarks = String(row.remarks || '').toLowerCase().trim();
              
              const isLabour = category.includes('મજૂરી') || category.includes('labour') || category.includes('labor') || category.includes('wages') || remarks.includes('મજૂરી') || remarks.includes('labour');
              
              if (!isLabour) return;

              const amount = Number(row.amount) || 0;
              const personName = row.paid_to || 'Unknown Labour';
              const personId = personName.toLowerCase().trim();
              const txnLocation = row.plant_name || 'Unknown';
              
              const activeLocation = activeContractorLocs[personId] || txnLocation;
              
              const rawSubBy = row.submitted_by || 'Admin';
              const supervisorName = rawSubBy.includes('@') ? rawSubBy.split('@')[0] : rawSubBy;

              if (!summaryMap[personId]) {
                summaryMap[personId] = { 
                  id: personId, 
                  name: personName, 
                  totalAmount: 0, 
                  transactions: [], 
                  locations: new Set([activeLocation]) 
                };
              }

              summaryMap[personId].totalAmount += amount;
              summaryMap[personId].locations = new Set([activeLocation]); 

              summaryMap[personId].transactions.push({
                date: row.expense_date,
                amount: amount,
                paidBy: row.payment_mode || 'Cash',
                location: txnLocation,
                purpose: (row.remarks && row.remarks !== 'EMPTY') ? row.remarks : category,
                supervisor: supervisorName
              });
            });
          }

          let finalArray = Object.values(summaryMap);

          if (selectedLocation !== 'All') {
            finalArray = finalArray.filter(person => person.locations.has(selectedLocation));
          } else if (selectedState !== 'All' || selectedType !== 'All') {
            if (availableLocations.length > 0) {
              finalArray = finalArray.filter(person => 
                Array.from(person.locations).some(loc => availableLocations.includes(loc))
              );
            } else {
              finalArray = [];
            }
          }

          finalArray = finalArray.map(item => {
            item.locations = Array.from(item.locations);
            item.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            return item;
          });
          setLedgerSummary(finalArray);
        }
      } catch (err) {
        console.error("Fetch Ledger Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLedgerData();
  }, [viewMode, isAllDates, fromDate, toDate, selectedState, selectedLocation, selectedType, availableLocations]);

  const handleReject = async (item) => {
    const { error } = await supabase
      .from('plant_fund_transfers')
      .update({
        status: 'REJECTED',
        approved_by: adminUser?.email || 'Admin'
      })
      .eq('id', item.id);

    if (!error) {
      alert(`❌ Fund Request Rejected!`);
      fetchPendingRequests();
    } else {
      alert("Error: " + error.message);
    }
  };

  const handleApprove = async (item) => {
    const config = actionData[item.id] || {};
    const finalAmount = config.amount ? Number(config.amount) : item.requested_amount;
    const finalMode = config.mode || 'Cash';
    const txnRef = config.txn || 'Direct Handover';
    
    const { error } = await supabase
      .from('plant_fund_transfers')
      .update({
        status: 'SENT',
        approved_amount: finalAmount,
        payment_mode: finalMode,
        txn_reference: txnRef,
        approved_by: adminUser?.email || 'Admin'
      })
      .eq('id', item.id);

    if (!error) {
      alert(`✅ ₹${finalAmount} સફળતાપૂર્વક મોકલી દેવામાં આવ્યા છે (સાઇટ પરથી રીસીવ થવાનું બાકી છે)!`);
      fetchPendingRequests();
    } else {
      alert("Error: " + error.message);
    }
  };

  const formatDateToDDMMYYYY = (dateString) => {
    if (!dateString || dateString === '-') return '-';
    const datePart = dateString.split('T')[0]; 
    const [year, month, day] = datePart.split('-');
    if (day && month && year) return `${day}/${month}/${year}`;
    return dateString;
  };

  const toggleAccordion = (id) => setExpandedId(expandedId === id ? null : id);

  // ==========================================
  // 🖨️ PDF Report Generation Logic (With Dynamic Summary Layout)
  // ==========================================
  const handlePersonPDF = (person, mode, filterType) => {
    const printWindow = window.open('', '', 'width=1000,height=700');
    const dateText = isAllDates ? 'All Dates (આજ સુધી)' : `${formatDateToDDMMYYYY(fromDate)} થી ${formatDateToDDMMYYYY(toDate)}`;
    
    let summaryHtml = '';
    let tableHtml = '';
    let reportTitle = '';

    if (mode === 'SUPERVISOR') {
      const balance = (person.totalReceived || 0) - (person.totalExpense || 0);
      
      let combinedTxns = [];
      const received = person.receivedTransactions.map(t => ({ ...t, type: 'IN' }));
      const expenses = person.expenseTransactions.map(t => ({ ...t, type: 'OUT' }));
      
      // 🎯 Apply Selected Filter & Show Specific Summary Box
      if (filterType === 'ADMIN') {
        combinedTxns = received.filter(t => t.isAdminFund);
        reportTitle = 'Admin Income Report';
        summaryHtml = `
          <div style="display: flex; gap: 15px; margin-bottom: 20px;">
            <div style="flex: 1; padding: 15px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; text-align: center;">
              <div style="font-size: 12px; color: #166534; font-weight: bold;">TOTAL ADMIN FUND (એડમિન આવક)</div>
              <div style="font-size: 18px; color: #15803d; font-weight: bold; margin-top: 5px;">₹${(person.totalAdminFund || 0).toLocaleString('en-IN')}</div>
            </div>
          </div>
        `;
      } else if (filterType === 'PARTY') {
        combinedTxns = received.filter(t => !t.isAdminFund);
        reportTitle = 'Party (Other) Income Report';
        summaryHtml = `
          <div style="display: flex; gap: 15px; margin-bottom: 20px;">
            <div style="flex: 1; padding: 15px; background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 8px; text-align: center;">
              <div style="font-size: 12px; color: #155e75; font-weight: bold;">TOTAL PARTY INCOME (અન્ય આવક)</div>
              <div style="font-size: 18px; color: #0e7490; font-weight: bold; margin-top: 5px;">₹${(person.totalOtherFund || 0).toLocaleString('en-IN')}</div>
            </div>
          </div>
        `;
      } else if (filterType === 'EXPENSE') {
        combinedTxns = expenses;
        reportTitle = 'Expense Report';
        summaryHtml = `
          <div style="display: flex; gap: 15px; margin-bottom: 20px;">
            <div style="flex: 1; padding: 15px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; text-align: center;">
              <div style="font-size: 12px; color: #9a3412; font-weight: bold;">TOTAL EXPENSE (કુલ ખર્ચ)</div>
              <div style="font-size: 18px; color: #c2410c; font-weight: bold; margin-top: 5px;">₹${(person.totalExpense || 0).toLocaleString('en-IN')}</div>
            </div>
          </div>
        `;
      } else {
        combinedTxns = [...received, ...expenses];
        reportTitle = 'Complete Ledger Report';
        summaryHtml = `
          <div style="display: flex; gap: 15px; margin-bottom: 20px;">
            <div style="flex: 1; padding: 15px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; text-align: center;">
              <div style="font-size: 12px; color: #166534; font-weight: bold;">TOTAL RECEIVED (આવક)</div>
              <div style="font-size: 18px; color: #15803d; font-weight: bold; margin-top: 5px;">₹${(person.totalReceived || 0).toLocaleString('en-IN')}</div>
              <div style="font-size: 11px; color: #166534; margin-top: 6px;">(Admin: ₹${(person.totalAdminFund || 0).toLocaleString('en-IN')} | Other: ₹${(person.totalOtherFund || 0).toLocaleString('en-IN')})</div>
            </div>
            <div style="flex: 1; padding: 15px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; text-align: center;">
              <div style="font-size: 12px; color: #9a3412; font-weight: bold;">TOTAL EXPENSE (ખર્ચ)</div>
              <div style="font-size: 18px; color: #c2410c; font-weight: bold; margin-top: 5px;">₹${(person.totalExpense || 0).toLocaleString('en-IN')}</div>
            </div>
            <div style="flex: 1; padding: 15px; background: ${balance < 0 ? '#fef2f2' : '#eff6ff'}; border: 1px solid ${balance < 0 ? '#fca5a5' : '#bfdbfe'}; border-radius: 8px; text-align: center;">
              <div style="font-size: 12px; color: ${balance < 0 ? '#991b1b' : '#1e40af'}; font-weight: bold;">BALANCE (સિલક)</div>
              <div style="font-size: 18px; color: ${balance < 0 ? '#dc2626' : '#2563eb'}; font-weight: bold; margin-top: 5px;">₹${balance.toLocaleString('en-IN')}</div>
            </div>
          </div>
        `;
      }
      
      combinedTxns.sort((a, b) => new Date(b.date) - new Date(a.date));

      tableHtml = `
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th style="padding: 10px; border: 1px solid #cbd5e1;">Date</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1;">Type</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1;">Location</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1;">Details / Paid To</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${combinedTxns.length > 0 ? combinedTxns.map(txn => `
              <tr>
                <td style="padding: 10px; border: 1px solid #cbd5e1;">${formatDateToDDMMYYYY(txn.date)}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; color: ${txn.type === 'IN' ? '#16a34a' : '#dc2626'};">
                  ${txn.type === 'IN' ? '↓ RECEIVED' : '↑ EXPENSE'}
                </td>
                <td style="padding: 10px; border: 1px solid #cbd5e1;">${txn.location}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1;">
                  ${txn.type === 'IN' 
                    ? `From: <strong>${txn.paidBy}</strong> <br/><span style="font-size:11px;color:#64748b;">${txn.purpose}</span>` 
                    : `To: <strong>${txn.paidTo}</strong> <br/><span style="font-size:11px;color:#64748b;">${txn.purpose} (${txn.mode})</span>`}
                </td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">₹${txn.amount.toLocaleString('en-IN')}</td>
              </tr>
            `).join('') : `<tr><td colspan="5" style="padding: 15px; text-align: center; color: #64748b;">No transactions for selected filter.</td></tr>`}
          </tbody>
        </table>
      `;
    } else {
      // LABOUR MODE Report
      reportTitle = 'Labour Ledger Report';
      summaryHtml = `
        <div style="display: flex; gap: 15px; margin-bottom: 20px;">
          <div style="flex: 1; padding: 15px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #1e40af; font-weight: bold;">TOTAL WAGES PAID (કુલ મજૂરી ખર્ચ)</div>
            <div style="font-size: 18px; color: #2563eb; font-weight: bold; margin-top: 5px;">₹${(person.totalAmount || 0).toLocaleString('en-IN')}</div>
          </div>
        </div>
      `;

      tableHtml = `
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th style="padding: 10px; border: 1px solid #cbd5e1;">Date</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1;">Location</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1;">Paid By (Supervisor)</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1;">Remarks / Mode</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${person.transactions.length > 0 ? person.transactions.map(txn => `
              <tr>
                <td style="padding: 10px; border: 1px solid #cbd5e1;">${formatDateToDDMMYYYY(txn.date)}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1;">${txn.location}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-transform: capitalize;">${txn.supervisor}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1;">${txn.purpose} (${txn.paidBy})</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">₹${txn.amount.toLocaleString('en-IN')}</td>
              </tr>
            `).join('') : `<tr><td colspan="5" style="padding: 15px; text-align: center; color: #64748b;">No transactions.</td></tr>`}
          </tbody>
        </table>
      `;
    }

    const html = `
      <html>
        <head>
          <title>${person.name} - ${reportTitle}</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 20px; color: #0f172a; }
            h2 { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px; text-transform: uppercase; }
            .info-table { width: 100%; margin-bottom: 20px; font-size: 14px; }
            .info-table td { padding: 6px 0; border-bottom: 1px dashed #cbd5e1;}
          </style>
        </head>
        <body>
          <h2>T&J Infra - ${reportTitle}</h2>
          <table class="info-table">
            <tr>
              <td><strong>Name:</strong> <span style="text-transform: capitalize;">${person.name}</span></td>
              <td style="text-align: right;"><strong>Date Period:</strong> ${dateText}</td>
            </tr>
            <tr>
              <td><strong>Locations:</strong> ${(person.locations || []).join(', ')}</td>
              <td style="text-align: right;"><strong>Generated On:</strong> ${formatDateToDDMMYYYY(new Date().toISOString())}</td>
            </tr>
          </table>
          
          ${summaryHtml}
          
          <h3 style="margin-bottom: 10px; font-size: 16px;">Transaction Details (લેજર વિગતો)</h3>
          ${tableHtml}

          <script>window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 500); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', backgroundColor: 'transparent', minHeight: '100vh' }}>
      
      {/* --- Top Header Card --- */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', backgroundColor: '#fff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <button onClick={() => window.history.back()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ margin: 0, fontSize: '17px', color: '#0f172a', fontWeight: 'bold' }}>Master Transaction Hub</h2>
          <span style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Fund Approval & Ledger Management</span>
        </div>
      </div>

      {/* --- Global Filters --- */}
      <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        
        {/* Date Filter */}
        <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: isAllDates ? '0' : '10px' }}>
            <input type="checkbox" checked={isAllDates} onChange={(e) => setIsAllDates(e.target.checked)} style={{ width: '16px', height: '16px' }} />
            બધી તારીખનો ડેટા (All Dates)
          </label>
          {!isAllDates && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '130px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>From Date</span>
                <div style={inputWrapperStyle}>
                  <Calendar size={14} color="#64748b" />
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: '130px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>To Date</span>
                <div style={inputWrapperStyle}>
                  <Calendar size={14} color="#64748b" />
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
          
          <div style={inputWrapperStyle}>
            <Building2 size={14} color="#64748b" />
            <select value={selectedType} onChange={(e) => {setSelectedType(e.target.value); setSelectedLocation('All');}} style={inputStyle}>
              <option value="All">બધા (All)</option>
              <option value="Plant">Plant</option>
              <option value="Site">Site</option>
            </select>
          </div>

          <div style={inputWrapperStyle}>
            <Globe size={14} color="#64748b" />
            <select value={selectedState} onChange={(e) => {setSelectedState(e.target.value); setSelectedLocation('All');}} style={inputStyle}>
              <option value="All">રાજ્યો (All)</option>
              {stateList.map((st, i) => <option key={i} value={st}>{st}</option>)}
            </select>
          </div>
          
          <div style={inputWrapperStyle}>
            <MapPin size={14} color="#64748b" />
            <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} style={inputStyle}>
              <option value="All">લોકેશન (All)</option>
              {availableLocations.map((loc, i) => <option key={i} value={loc}>{loc}</option>)}
            </select>
          </div>

        </div>
      </div>

      {/* --- Pending Requests --- */}
      {pendingRequests.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={16} color="#eab308" /> Pending Fund Requests ({pendingRequests.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pendingRequests.map((item) => (
              <div key={item.id} style={{ backgroundColor: '#fefce8', borderLeft: '4px solid #facc15', borderRadius: '8px', borderRight: '1px solid #fef08a', borderTop: '1px solid #fef08a', borderBottom: '1px solid #fef08a', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #fef08a' }}>
                  <div>
                    <strong style={{ color: '#854d0e', fontSize: '14px', display: 'block' }}>{item.plant_name || item.location_name}</strong>
                    <span style={{ fontSize: '12px', color: '#a16207' }}>By: {item.supervisor_name || 'Supervisor'}</span>
                  </div>
                  <div style={{ backgroundColor: '#facc15', color: '#713f12', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px' }}>
                    ₹{item.requested_amount}
                  </div>
                </div>
                
                <div style={{ padding: '12px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <select 
                    onChange={(e) => setActionData(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), mode: e.target.value } }))} 
                    style={actionInputStyle}
                  >
                    <option value="Cash">💵 Cash</option>
                    <option value="UPI / GPay">📱 GPay / UPI</option>
                    <option value="Bank NEFT">🏦 Bank NEFT</option>
                  </select>
                  
                  <input 
                    type="number" 
                    defaultValue={item.requested_amount} 
                    placeholder="Amount"
                    onChange={(e) => setActionData(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), amount: e.target.value } }))} 
                    style={actionInputStyle} 
                  />

                  <input 
                    type="text" 
                    placeholder="Ref (Optional)"
                    onChange={(e) => setActionData(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), txn: e.target.value } }))} 
                    style={actionInputStyle} 
                  />
                  
                  <button onClick={() => handleApprove(item)} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                    Approve & Send
                  </button>

                  <button onClick={() => handleReject(item)} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- Switch/Toggle View --- */}
      <div style={{ display: 'flex', backgroundColor: '#e2e8f0', borderRadius: '10px', padding: '4px', marginBottom: '15px' }}>
        <button 
          onClick={() => setViewMode('SUPERVISOR')} 
          style={viewMode === 'SUPERVISOR' ? activeTabStyle : inactiveTabStyle}
        >
          <UserCog size={16} /> Supervisor Ledger
        </button>
        <button 
          onClick={() => setViewMode('LABOUR')} 
          style={viewMode === 'LABOUR' ? activeTabStyle : inactiveTabStyle}
        >
          <Users size={16} /> Labour Ledger
        </button>
      </div>

      {/* --- Drill-Down Data Accordion --- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '14px' }}>Loading Ledger...</div>
        ) : ledgerSummary.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <FileText size={32} color="#cbd5e1" style={{ margin: '0 auto 10px auto' }} />
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>કોઈ ડેટા મળ્યો નથી. ફિલ્ટર બદલીને ચેક કરો.</p>
          </div>
        ) : (
        ledgerSummary.map((person) => {
            const currentSubTab = activeSubTabs[person.id] || 'ADMIN_INCOME'; 
            const balance = (person.totalReceived || 0) - (person.totalExpense || 0);

            return (
              <div key={person.id} style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                
                <div onClick={() => toggleAccordion(person.id)} style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: expandedId === person.id ? '#f8fafc' : '#fff' }}>
                  
                  {/* 🌟 Left Side 🌟 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 'bold', textTransform: 'capitalize' }}>
                      {person.name}
                    </h4>
                    <span style={{ fontSize: '11.5px', color: '#2563eb', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} color="#2563eb" /> {(person.locations || []).join(', ')}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', marginTop: '2px' }}>
                      {viewMode === 'SUPERVISOR' ? `Total Received: ₹${(person.totalReceived || 0).toLocaleString('en-IN')}` : `${person.transactions?.length || 0} Txns`}
                    </span>
                  </div>

                  {/* 🌟 Right Side (Balance & Report) 🌟 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (viewMode === 'SUPERVISOR') {
                            setReportModal({ isOpen: true, person, mode: viewMode }); 
                          } else {
                            handlePersonPDF(person, viewMode, 'ALL');
                          }
                        }}
                        style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)' }}
                      >
                        <FileDown size={14} /> Print
                      </button>
                      <span style={{ fontSize: '18px', fontWeight: '800', color: viewMode === 'SUPERVISOR' ? (balance < 0 ? '#dc2626' : '#2563eb') : '#16a34a' }}>
                        ₹{viewMode === 'SUPERVISOR' ? balance.toLocaleString('en-IN') : (person.totalAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    {expandedId === person.id ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                  </div>
                </div>

                {expandedId === person.id && (
                  <div style={{ borderTop: '1px solid #e2e8f0', padding: '15px', backgroundColor: '#fff' }}>
                    
                    {/* 🌟 4 BOX LAYOUT 🌟 */}
                    {viewMode === 'SUPERVISOR' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px', marginBottom: '15px' }}>
                        <div onClick={() => setActiveSubTab(person.id, 'ADMIN_INCOME')} style={{ padding: '8px 4px', backgroundColor: currentSubTab === 'ADMIN_INCOME' ? '#dcfce7' : '#f0fdf4', border: `1px solid ${currentSubTab === 'ADMIN_INCOME' ? '#16a34a' : '#bbf7d0'}`, borderRadius: '6px', cursor: 'pointer', textAlign: 'center' }}>
                          <span style={{ fontSize: '9px', color: '#166534', fontWeight: 'bold', display: 'block' }}>ADMIN FUND</span>
                          <strong style={{ fontSize: '12px', color: '#15803d' }}>₹{(person.totalAdminFund || 0).toLocaleString('en-IN')}</strong>
                        </div>
                        <div onClick={() => setActiveSubTab(person.id, 'PARTY_INCOME')} style={{ padding: '8px 4px', backgroundColor: currentSubTab === 'PARTY_INCOME' ? '#cffafe' : '#ecfeff', border: `1px solid ${currentSubTab === 'PARTY_INCOME' ? '#0891b2' : '#a5f3fc'}`, borderRadius: '6px', cursor: 'pointer', textAlign: 'center' }}>
                          <span style={{ fontSize: '9px', color: '#155e75', fontWeight: 'bold', display: 'block' }}>OTHER INCOME</span>
                          <strong style={{ fontSize: '12px', color: '#0e7490' }}>₹{(person.totalOtherFund || 0).toLocaleString('en-IN')}</strong>
                        </div>
                        <div onClick={() => setActiveSubTab(person.id, 'EXPENSE')} style={{ padding: '8px 4px', backgroundColor: currentSubTab === 'EXPENSE' ? '#ffedd5' : '#fff7ed', border: `1px solid ${currentSubTab === 'EXPENSE' ? '#ea580c' : '#fed7aa'}`, borderRadius: '6px', cursor: 'pointer', textAlign: 'center' }}>
                          <span style={{ fontSize: '9px', color: '#9a3412', fontWeight: 'bold', display: 'block' }}>EXPENSES</span>
                          <strong style={{ fontSize: '12px', color: '#c2410c' }}>₹{(person.totalExpense || 0).toLocaleString('en-IN')}</strong>
                        </div>
                        <div style={{ padding: '8px 4px', backgroundColor: balance < 0 ? '#fef2f2' : '#eff6ff', border: `1px solid ${balance < 0 ? '#fca5a5' : '#bfdbfe'}`, borderRadius: '6px', textAlign: 'center' }}>
                          <span style={{ fontSize: '9px', color: balance < 0 ? '#991b1b' : '#1e40af', fontWeight: 'bold', display: 'block' }}>BALANCE</span>
                          <strong style={{ fontSize: '12px', color: balance < 0 ? '#dc2626' : '#2563eb' }}>₹{balance.toLocaleString('en-IN')}</strong>
                        </div>
                      </div>
                    )}

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                            <th style={thStyle}>Date</th>
                            <th style={thStyle}>Location</th>
                            <th style={thStyle}>
                              {viewMode === 'LABOUR' ? 'Paid By' : (currentSubTab === 'EXPENSE' ? 'Paid To' : 'Purpose / Remarks')}
                            </th>
                            <th style={thStyle}>
                              {viewMode === 'LABOUR' ? 'Remarks / Mode' : (currentSubTab === 'EXPENSE' ? 'Remarks / Mode' : 'Paid By / Mode')}
                            </th>
                            <th style={thStyle}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            let txns = [];
                            if (viewMode === 'LABOUR') {
                              txns = person.transactions;
                            } else {
                              if (currentSubTab === 'ADMIN_INCOME') txns = person.receivedTransactions.filter(t => t.isAdminFund);
                              else if (currentSubTab === 'PARTY_INCOME') txns = person.receivedTransactions.filter(t => !t.isAdminFund);
                              else txns = person.expenseTransactions;
                            }

                            if (!txns || txns.length === 0) {
                              return <tr><td colSpan="5" style={{ textAlign: 'center', padding: '15px', color: '#94a3b8' }}>No transactions found.</td></tr>;
                            }

                            return txns.map((txn, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={tdBorder}>{formatDateToDDMMYYYY(txn.date)}</td>
                                <td style={tdBorder}>{txn.location}</td>
                                <td style={{...tdBorder, textTransform: 'capitalize', fontWeight: currentSubTab === 'EXPENSE' ? '600' : 'normal', color: currentSubTab === 'EXPENSE' ? '#0f172a' : 'inherit'}}>
                                  {viewMode === 'LABOUR' ? txn.supervisor : (currentSubTab === 'EXPENSE' ? txn.paidTo : txn.purpose)}
                                </td>
                                <td style={tdBorder}>
                                  {viewMode === 'LABOUR' 
                                    ? `${txn.purpose} (${txn.paidBy})` 
                                    : (currentSubTab === 'EXPENSE' ? `${txn.purpose} (${txn.mode})` : txn.paidBy)}
                                </td>
                                <td style={{ ...tdBorder, fontWeight: 'bold', color: currentSubTab === 'EXPENSE' ? '#dc2626' : '#0f172a' }}>
                                  ₹{txn.amount.toLocaleString('en-IN')}
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 🎯 Custom Pop-up Modal for Print Selection */}
      {reportModal.isOpen && reportModal.person && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '320px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#0f172a', fontWeight: 'bold' }}>Print Report</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>For {reportModal.person.name}</p>
              </div>
              <button onClick={() => setReportModal({ isOpen: false, person: null, mode: null })} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => { handlePersonPDF(reportModal.person, reportModal.mode, 'ADMIN'); setReportModal({ isOpen: false, person: null, mode: null }); }} style={reportBtnStyle}>📥 Only Admin Income</button>
              <button onClick={() => { handlePersonPDF(reportModal.person, reportModal.mode, 'PARTY'); setReportModal({ isOpen: false, person: null, mode: null }); }} style={{...reportBtnStyle, color: '#0e7490', borderColor: '#a5f3fc', backgroundColor: '#ecfeff'}}>📥 Only Party Income</button>
              <button onClick={() => { handlePersonPDF(reportModal.person, reportModal.mode, 'EXPENSE'); setReportModal({ isOpen: false, person: null, mode: null }); }} style={{...reportBtnStyle, color: '#c2410c', borderColor: '#fed7aa', backgroundColor: '#fff7ed'}}>📤 Only Expense</button>
              <button onClick={() => { handlePersonPDF(reportModal.person, reportModal.mode, 'ALL'); setReportModal({ isOpen: false, person: null, mode: null }); }} style={{...reportBtnStyle, backgroundColor: '#2563eb', color: '#fff', border: 'none'}}>📑 All Report (સંપૂર્ણ લેજર)</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- Reusable Styles ---
const inputWrapperStyle = { display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', gap: '6px', boxSizing: 'border-box', width: '100%' };
const inputStyle = { width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: '#334155', fontWeight: 'bold', appearance: 'none', cursor: 'pointer', boxSizing: 'border-box' };
const actionInputStyle = { flex: 1, minWidth: '100px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #fde047', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#fff', color: '#854d0e', outline: 'none' };
const activeTabStyle = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 4px', backgroundColor: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', color: '#2563eb', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'all 0.2s', textAlign: 'center' };
const inactiveTabStyle = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 4px', backgroundColor: 'transparent', border: 'none', fontSize: '13px', fontWeight: 'bold', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' };
const thStyle = { padding: '10px 12px', border: '1px solid #e2e8f0', fontWeight: 'bold' };
const tdBorder = { padding: '10px 12px', border: '1px solid #e2e8f0' };

const reportBtnStyle = {
  width: '100%', padding: '12px', textAlign: 'left', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
};