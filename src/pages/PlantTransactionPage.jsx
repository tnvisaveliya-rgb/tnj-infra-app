import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, MapPin, Check, Clock, Building2, Globe, ArrowLeft, Users, UserCog, ChevronDown, ChevronUp, FileText } from 'lucide-react';

export default function MasterTransactionHub({ adminUser }) {
  // --- 1. State Management (Global Filters) ---
  const [isAllDates, setIsAllDates] = useState(true);
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [selectedState, setSelectedState] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All'); 

  // --- 2. View Mode Toggle (Supervisor vs Labour) ---
  const [viewMode, setViewMode] = useState('SUPERVISOR'); 

  // --- 3. Data States ---
  const [pendingRequests, setPendingRequests] = useState([]);
  const [actionData, setActionData] = useState({});
  const [ledgerSummary, setLedgerSummary] = useState([]); 
  const [expandedId, setExpandedId] = useState(null); 
  
  const [allPlantsDb, setAllPlantsDb] = useState([]);
  const [stateList, setStateList] = useState([]);
  const [availablePlants, setAvailablePlants] = useState([]);
  const [loading, setLoading] = useState(false);

  // ==========================================
  // Fetch Plants & Locations
  // ==========================================
  useEffect(() => {
    const fetchPlantsData = async () => {
      const { data } = await supabase.from('plants').select('*');
      if (data) {
        setAllPlantsDb(data);
        setStateList([...new Set(data.map(p => p.state).filter(Boolean))]);
      }
    };
    fetchPlantsData();
  }, []);

  useEffect(() => {
    if (selectedState === 'All') {
      setAvailablePlants([...new Set(allPlantsDb.map(p => p.plant_name).filter(Boolean))]);
    } else {
      const filtered = allPlantsDb.filter(p => p.state === selectedState);
      setAvailablePlants([...new Set(filtered.map(p => p.plant_name).filter(Boolean))]);
    }
  }, [selectedState, allPlantsDb]);

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
        // જો લેબર મોડ હોય તો plant_expenses ટેબલ લેશે
        let tableName = viewMode === 'SUPERVISOR' ? 'plant_fund_transfers' : 'plant_expenses'; 
        let query = supabase.from(tableName).select('*');
        
        // Date Filters
        if (!isAllDates) {
          if(viewMode === 'SUPERVISOR') {
            query = query.gte('request_date', fromDate).lte('request_date', toDate);
          } else {
            // LABOUR MODE માં expense_date નો ઉપયોગ
            query = query.gte('expense_date', fromDate).lte('expense_date', toDate);
          }
        }
        
        // Location-Aware Filtering
        if (selectedLocation !== 'All') {
          query = query.eq('plant_name', selectedLocation); 
        } else if (selectedState !== 'All' && availablePlants.length > 0) {
          query = query.in('plant_name', availablePlants);
        }

        const { data, error } = await query;
        if (error) throw error;

        const summaryMap = {};

        if (data) {
          data.forEach(row => {
            if (viewMode === 'SUPERVISOR') {
              if (row.status === 'REJECTED') return;

              const amount = Number(row.approved_amount || row.amount || row.requested_amount) || 0;
              const personName = row.supervisor_name || row.paid_to || 'Unknown User';
              const personId = row.supervisor_id || personName;
              
              if (!summaryMap[personId]) {
                summaryMap[personId] = { id: personId, name: personName, totalAmount: 0, transactions: [] };
              }

              summaryMap[personId].totalAmount += amount;
              summaryMap[personId].transactions.push({
                date: row.received_date || row.transfer_date || row.request_date || row.transaction_date,
                amount: amount,
                paidBy: row.approved_by || row.paid_by_user_name || 'Admin',
                location: row.plant_name || row.location_name || '-',
                purpose: row.purpose || row.expense_type || '-' 
              });
            } else {
              // LABOUR MODE (plant_expenses table)
              const category = row.expense_category || '';
              
              // ❌ માત્ર મજૂરી/Labour ના જ ખર્ચા બતાવો (Diesel / Fuel ઇગ્નોર કરો) ❌
              if (!category.includes('મજૂરી') && !category.toLowerCase().includes('labour')) {
                return;
              }

              const amount = Number(row.amount) || 0;
              const personName = row.paid_to || 'Unknown Labour';
              const personId = personName;

              if (!summaryMap[personId]) {
                summaryMap[personId] = { id: personId, name: personName, totalAmount: 0, transactions: [] };
              }

              summaryMap[personId].totalAmount += amount;
              summaryMap[personId].transactions.push({
                date: row.expense_date,
                amount: amount,
                paidBy: row.payment_mode || 'Cash', // અહીં પેમેન્ટ કેવી રીતે કર્યું તે બતાવશે (Cash/UPI)
                location: row.plant_name || '-',
                purpose: (row.remarks && row.remarks !== 'EMPTY') ? row.remarks : category
              });
            }
          });
        }

        const finalArray = Object.values(summaryMap).map(item => {
          item.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
          return item;
        });

        setLedgerSummary(finalArray);
      } catch (err) {
        console.error("Fetch Ledger Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLedgerData();
  }, [viewMode, isAllDates, fromDate, toDate, selectedState, selectedLocation, availablePlants]);
  // ==========================================
 // ==========================================


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
  // Action Handlers (Approve and Send Money)
  // ==========================================
  const handleApprove = async (item) => {
    const config = actionData[item.id] || {};
    const finalAmount = config.amount ? Number(config.amount) : item.requested_amount;
    const finalMode = config.mode || 'Cash';
    const txnRef = config.txn || 'Direct Handover';
    
    // 🎯 અહીં સ્ટેટસ 'APPROVED' ની જગ્યાએ 'SENT' કરવું, જેથી સુપરવાઇઝર સ્વીકારે નહીં ત્યાં સુધી જમા ન થાય
    const { error } = await supabase
      .from('plant_fund_transfers')
      .update({
        status: 'SENT', // 👈 'APPROVED' ને બદલે 'SENT' કરો
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
  // Date Formatter
  const formatDateToDDMMYYYY = (dateString) => {
    if (!dateString || dateString === '-') return '-';
    const datePart = dateString.split('T')[0]; 
    const [year, month, day] = datePart.split('-');
    if (day && month && year) return `${day}/${month}/${year}`;
    return dateString;
  };

  const toggleAccordion = (id) => setExpandedId(expandedId === id ? null : id);

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', padding: '15px', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', backgroundColor: 'transparent', minHeight: '100vh' }}>
      
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

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '130px' }}>
            <div style={inputWrapperStyle}>
              <Globe size={14} color="#64748b" />
              <select value={selectedState} onChange={(e) => {setSelectedState(e.target.value); setSelectedLocation('All');}} style={inputStyle}>
                <option value="All">બધા રાજ્યો (All)</option>
                {stateList.map((st, i) => <option key={i} value={st}>{st}</option>)}
              </select>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '130px' }}>
            <div style={inputWrapperStyle}>
              <MapPin size={14} color="#64748b" />
              <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} style={inputStyle}>
                <option value="All">બધા પ્લાન્ટ્સ (All)</option>
                {availablePlants.map((plant, i) => <option key={i} value={plant}>{plant}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* --- Pending Requests (Yellow Highlight) --- */}
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
  
  {/* 🟢 Approve Button (સ્ટેટસ SENT કરશે જેથી પેમેન્ટ મોકલ્યા પછી જ જમા થાય) */}
  <button onClick={() => handleApprove(item)} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
    Approve & Send
  </button>

  {/* 🔴 Reject Button (નવું ઉમેરેલું) */}
  <button onClick={() => handleReject(item)} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
    Reject
  </button>
</div>

                
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- Switch/Toggle View (Supervisor vs Labour) --- */}
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
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>No Data Found for selected filters.</p>
          </div>
        ) : (
          ledgerSummary.map((person) => (
            <div key={person.id} style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
              
              <div onClick={() => toggleAccordion(person.id)} style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: expandedId === person.id ? '#f8fafc' : '#fff' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 'bold' }}>{person.name}</h4>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{person.transactions.length} Transactions</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 'bold', color: viewMode === 'SUPERVISOR' ? '#2563eb' : '#16a34a' }}>
                    ₹{person.totalAmount.toLocaleString('en-IN')}
                  </span>
                  {expandedId === person.id ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                </div>
              </div>

              {expandedId === person.id && (
                <div style={{ borderTop: '1px solid #e2e8f0', padding: '15px', backgroundColor: '#fff' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                          <th style={thStyle}>Date</th>
                          <th style={thStyle}>Location</th>
                          <th style={thStyle}>Purpose</th>
                          <th style={thStyle}>Paid By</th>
                          <th style={thStyle}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {person.transactions.map((txn, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={tdBorder}>{formatDateToDDMMYYYY(txn.date)}</td>
                            <td style={tdBorder}>{txn.location}</td>
                            <td style={tdBorder}>{txn.purpose}</td>
                            <td style={tdBorder}>{txn.paidBy}</td>
                            <td style={{ ...tdBorder, fontWeight: 'bold', color: '#0f172a' }}>₹{txn.amount.toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
}

// --- Reusable Styles ---
const inputWrapperStyle = {
  display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', gap: '6px', boxSizing: 'border-box', width: '100%'
};
const inputStyle = {
  width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: '#334155', fontWeight: 'bold', appearance: 'none', cursor: 'pointer', boxSizing: 'border-box'
};
const actionInputStyle = {
  flex: 1, minWidth: '100px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #fde047', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#fff', color: '#854d0e', outline: 'none'
};
const activeTabStyle = {
  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 4px', backgroundColor: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', color: '#2563eb', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'all 0.2s', textAlign: 'center'
};
const inactiveTabStyle = {
  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 4px', backgroundColor: 'transparent', border: 'none', fontSize: '13px', fontWeight: 'bold', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center'
};
const thStyle = { padding: '10px 12px', border: '1px solid #e2e8f0', fontWeight: 'bold' };
const tdBorder = { padding: '10px 12px', border: '1px solid #e2e8f0' };