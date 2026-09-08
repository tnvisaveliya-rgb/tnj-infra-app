import React, { useState, useEffect } from 'react';
import { Home, ClipboardEdit, IndianRupee, UserCheck, Wallet, Clock, ChevronRight, FileText, Plus, X, Layers, Box, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import SupervisorDashboard from './SupervisorDashboard';
import AttendancePage from './AttendancePage';
import SupervisorExpenses from './SupervisorExpenses';
import PlantDprEntry from './PlantDprEntry';
import PlantInwardPage from './PlantInwardPage';
import PlantOutwardPage from './PlantOutwardPage';
import SiteMaterialReturn from './SiteMaterialReturn';
import IssueReturn from './IssueReturn';
import PlantExpensesPage from './PlantExpensesPage';



// ❌ પહેલા આવું હતું:
// export default function ProductionReportView({ onBack, plantList = [] }) {

//  આ રીતે બદલો (માત્ર function રાખો):
function ProductionReportView({ onBack, plantList = [] }) {
  const [selectedPlant, setSelectedPlant] = useState(plantList[0] || 'All');
  const [labourList, setLabourList] = useState([]);
  const [selectedLabour, setSelectedLabour] = useState('');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const [reportRows, setReportRows] = useState([]);
  const [totalUpad, setTotalUpad] = useState(0);
  const [dynamicColumns, setDynamicColumns] = useState([]);
  const [productRates, setProductRates] = useState({});
  // તારીખને YYYY-MM-DD માંથી DD/MM/YYYY માં ફેરવવા માટે
const formatDateToDMY = (dateStr) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return dateStr;
};

  // =========================================================================
  // ૧. સિલેક્ટ થયેલા પ્લાન્ટ મુજબ જ contractors ફેચ કરવા
  // =========================================================================
  useEffect(() => {
    const fetchContractorsByPlant = async () => {
      try {
        let query = supabase.from('contractors').select('*');

        if (selectedPlant && selectedPlant !== 'All') {
          query = query.or(`site_name.eq."${selectedPlant}",company_name.eq."${selectedPlant}"`);
        }

        const { data, error } = await query;

        if (!error && data) {
          const filteredNames = data.map(d => d.name).filter(Boolean);
          setLabourList(filteredNames);
          
          if (filteredNames.length > 0) {
            setSelectedLabour(filteredNames[0]);
          } else {
            setSelectedLabour('');
          }
        }
      } catch (err) {
        console.error('Error fetching contractors for plant:', err);
      }
    };

    fetchContractorsByPlant();
  }, [selectedPlant]);

  // =========================================================================
  // ૨. ફિલ્ટર બદલાય ત્યારે લાઈવ ડેટા લોડ કરવો
  // =========================================================================
  useEffect(() => {
    if (!selectedLabour) return;
    fetchReportData();
  }, [selectedPlant, selectedLabour, fromDate, toDate]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const groupedByDate = {};
      const uniqueColSet = new Set();
    // (A) labour_product_rates માંથી સાચા રેટ્સ લાવો
      let rateQuery = supabase
        .from('labour_product_rates')
        .select('*');

      if (selectedPlant && selectedPlant !== 'All') {
        rateQuery = rateQuery.eq('plant_name', selectedPlant);
      }
      if (selectedLabour) {
        rateQuery = rateQuery.eq('team_name', selectedLabour);
      }

      const { data: rateData, error: rateErr } = await rateQuery;

      const rateList = [];
      if (!rateErr && rateData && rateData.length > 0) {
        rateData.forEach(r => {
          rateList.push({
            pName: (r.product_name || '').toLowerCase().trim(),
            pSize: (r.product_size || '').toLowerCase().trim(),
            rate: Number(r.rate || 0)
          });
        });
      }
      setProductRates(rateList); // 👈 આખું array સેવ કરો

      // (B) લાઈવ હેડર્સ લાવવા
      let headerQuery = supabase
        .from('production_header')
        .select('id, production_date, team_name, plant_name');

      if (selectedPlant && selectedPlant !== 'All') {
        headerQuery = headerQuery.eq('plant_name', selectedPlant);
      }
      if (selectedLabour) {
        headerQuery = headerQuery.eq('team_name', selectedLabour);
      }
      if (fromDate) headerQuery = headerQuery.gte('production_date', fromDate);
      if (toDate) headerQuery = headerQuery.lte('production_date', toDate);

      const { data: headers, error: hErr } = await headerQuery;

      if (!hErr && headers && headers.length > 0) {
        const headerIds = headers.map(h => h.id);
        const headerDateMap = {};
        headers.forEach(h => {
          headerDateMap[h.id] = h.production_date;
        });

         // (C) આ હેડર્સની બધી જ production_items લાવવી
        const { data: items, error: iErr } = await supabase
          .from('production_items')
          .select('*')
          .in('header_id', headerIds);

        if (!iErr && items && items.length > 0) {
          const itemIds = items.map(it => it.id);

          // 🌟 stock_ledger ટેબલમાંથી reference_id મુજબ સાચી qty લાવવી
          const { data: stockEntries } = await supabase
            .from('stock_ledger')
            .select('reference_id, qty')
            .in('reference_id', itemIds);

          const stockMap = {};
          if (stockEntries) {
            stockEntries.forEach(s => {
              stockMap[s.reference_id] = (stockMap[s.reference_id] || 0) + Number(s.qty || 0);
            });
          }


          items.forEach(item => {
            const dStr = headerDateMap[item.header_id];
            if (!dStr) return;

          // ❌ પહેલા આવું હતું:
// const pVariant = item.size_variant ? ` (${item.size_variant})` : '';
// const colHeader = `${pName}${pVariant}`;

// ✅ આ રીતે અપડેટ કરો:
const pName = (item.product_name || 'Item').trim();
const pVariant = (item.size_variant || '').trim();

// જો વેરિઅન્ટ હોય તો સ્પેસ સાથે જોડાશે (વધારાનો કૌંસ નહીં લાગે)
const colHeader = pVariant ? `${pName} ${pVariant}` : pName;

            uniqueColSet.add(colHeader);

            if (!groupedByDate[dStr]) {
              groupedByDate[dStr] = { date: dStr };
            }

            // 🌟 લાઈન હોય તો લાઈન કાસ્ટિંગ, નહીંતર stock_ledger માંથી qty
            const lineQty = Number(item.nos_of_line_casting || 0);
            const ledgerQty = stockMap[item.id] || 0;
            const finalQty = lineQty > 0 ? lineQty : ledgerQty;

            groupedByDate[dStr][colHeader] = (groupedByDate[dStr][colHeader] || 0) + finalQty;
          });

          const colsArray = Array.from(uniqueColSet);
          setDynamicColumns(colsArray);

          const sortedRows = Object.values(groupedByDate).sort(
            (a, b) => new Date(b.date) - new Date(a.date)
          );
          setReportRows(sortedRows);
        } else {
          setDynamicColumns([]);
          setReportRows([]);
        }
      } else {
        setDynamicColumns([]);
        setReportRows([]);
      }

  // (D) plant_expenses માંથી ઉપાડ લાવવો
      const upadByDateMap = {};
      let totalUpadSum = 0;

      if (selectedLabour) {
        let upadQuery = supabase
          .from('plant_expenses')
          .select('amount, expense_date')
          .eq('paid_to', selectedLabour);

        if (fromDate) upadQuery = upadQuery.gte('expense_date', fromDate);
        if (toDate) upadQuery = upadQuery.lte('expense_date', toDate);

        const { data: upadData } = await upadQuery;
        if (upadData && upadData.length > 0) {
          upadData.forEach(item => {
            const expDate = item.expense_date;
            const amt = Number(item.amount || 0);
            upadByDateMap[expDate] = (upadByDateMap[expDate] || 0) + amt;
            totalUpadSum += amt;
          });
        }
      }

      setTotalUpad(totalUpadSum);

      // હવે groupedByDate ઉપર જ ડીકલેર હોવાથી ReferenceError ક્યારેય નહીં આવે
      Object.keys(groupedByDate).forEach(dStr => {
        groupedByDate[dStr].dayUpad = upadByDateMap[dStr] || 0;
      });

      Object.keys(upadByDateMap).forEach(expDate => {
        if (!groupedByDate[expDate]) {
          groupedByDate[expDate] = { date: expDate, dayUpad: upadByDateMap[expDate] };
        }
      });

      const sortedRows = Object.values(groupedByDate).sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      setReportRows(sortedRows);

    } catch (err) {
      console.error('Error fetching dynamic report:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRateForColumn = (colName) => {
    if (!Array.isArray(productRates) || productRates.length === 0) return 0;

    const cleanCol = colName.toLowerCase().replace(/×/g, 'x').replace(/[^a-z0-9]/g, '');

    // 🌟 ૧. 'Other Work' / 'Day Work' / 'Cleaning' માટે ચેક કરવું
    const isOtherWork = 
      cleanCol.includes('cleaning') || 
      cleanCol.includes('daywork') || 
      cleanCol.includes('other') || 
      cleanCol.includes('department');

    if (isOtherWork) {
      // ડેટાબેઝમાંથી Other Work અથવા Other Department Work નો રેટ શોધવો
      const otherRateItem = productRates.find(r => 
        r.pName.includes('other') || 
        r.pName.includes('department') || 
        r.pName.includes('cleaning')
      );
      if (otherRateItem) return otherRateItem.rate;
      return 0; // જો ડેટાબેઝમાં મેચ ન થાય તો ડિફોલ્ટ 0
    }

    // ૨. પ્રોડક્ટ વાઈઝ ડેટાબેઝ મેચ
    for (const item of productRates) {
      const cleanDBName = item.pName.replace(/×/g, 'x').replace(/[^a-z0-9]/g, '');
      const cleanDBSize = item.pSize.replace(/×/g, 'x').replace(/[^a-z0-9]/g, '');

      if (cleanDBName && cleanCol.includes(cleanDBName)) {
        if (cleanDBName === 'panel7' && cleanCol.includes('panel7')) return item.rate;
        if (cleanDBName === 'panel6' && cleanCol.includes('panel6')) return item.rate;
        if (cleanDBName.includes('drain')) return item.rate;
        if (cleanDBName.includes('column')) return item.rate;
      }

      if (cleanDBSize && cleanCol.includes(cleanDBSize)) {
        return item.rate;
      }
    }

    // ૩. સ્પેસિફિક ફોલબેક્સ
    const panel7 = productRates.find(r => r.pName.includes('panel') && r.pName.includes('7'));
    if (cleanCol.includes('panel') && cleanCol.includes('7') && panel7) return panel7.rate;

    const panel6 = productRates.find(r => r.pName.includes('panel') && r.pName.includes('6'));
    if (cleanCol.includes('panel') && cleanCol.includes('6') && panel6) return panel6.rate;

    const udrain = productRates.find(r => r.pName.includes('drain'));
    if (cleanCol.includes('drain') && udrain) return udrain.rate;

    const column8 = productRates.find(r => r.pName.includes('column') && r.pName.includes('8'));
    if (cleanCol.includes('column') && cleanCol.includes('8') && column8) return column8.rate;

    return 0;
  };
  // =========================================================================
  // ૪. કુલ ઉત્પાદન અને બાકી રકમની ગણતરી (Auto Calculations)
  // =========================================================================
  let grandTotalProduction = 0;
  dynamicColumns.forEach(col => {
    const totalColQty = reportRows.reduce((sum, row) => sum + (Number(row[col]) || 0), 0);
    const colRate = getRateForColumn(col);
    grandTotalProduction += (totalColQty * colRate);
  });
  const netOutstanding = grandTotalProduction - totalUpad;

  return (
    <div style={{ padding: '10px 8px', maxWidth: '650px', margin: '0 auto', fontFamily: 'sans-serif' }}>

      {/* 🖨️ Action Bar */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <button 
          onClick={onBack}
          style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}
        >
          ← Back
        </button>
        <button 
          onClick={() => window.print()}
          style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: '800', fontSize: '12px', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' }}
        >
          🖨️ Export PDF / Print
        </button>
      </div>

      {/* 📄 Printable Report Sheet */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        
        <h2 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: '900', color: '#0f172a' }}>
          PRODUCTION & LABOUR BILLING REPORT
        </h2>

        {/* Selected Info Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px', color: '#334155', marginBottom: '12px' }}>
          <div><strong>Plant:</strong> {selectedPlant}</div>
          <div><strong>Date Filter:</strong> {formatDateToDMY(fromDate)} to {formatDateToDMY(toDate)}</div>
          <div style={{ gridColumn: 'span 2' }}><strong>Labour / Contractor:</strong> {selectedLabour || 'All'}</div>
        </div>

        {/* Dynamic Controls (No Print) */}
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select 
              value={selectedPlant} 
              onChange={(e) => setSelectedPlant(e.target.value)}
              style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: '700' }}
            >
              <option value="All">All Plants</option>
              {plantList.map((p, i) => <option key={i} value={p}>{p}</option>)}
            </select>

            <select 
              value={selectedLabour} 
              onChange={(e) => setSelectedLabour(e.target.value)}
              style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: '700', color: '#1e293b' }}
            >
              {labourList.map((name, i) => (
                <option key={i} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Date Range:</span>
            <input 
              type="date" 
              value={fromDate} 
              onChange={(e) => setFromDate(e.target.value)} 
              style={{ flex: 1, padding: '5px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px' }} 
            />
            <input 
              type="date" 
              value={toDate} 
              onChange={(e) => setToDate(e.target.value)} 
              style={{ flex: 1, padding: '5px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px' }} 
            />
          </div>
        </div>

{/* 📊 DYNAMIC PRODUCTION TABLE */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              <th style={{ padding: '8px 4px', border: '1px solid #cbd5e1', textAlign: 'left' }}>Date</th>
              {dynamicColumns.map((col, idx) => (
                <th key={idx} style={{ padding: '8px 4px', border: '1px solid #cbd5e1' }}>
                  {col}
                </th>
              ))}
              <th style={{ padding: '8px 4px', border: '1px solid #cbd5e1', color: '#dc2626', backgroundColor: '#fef2f2' }}>
                Upad (ઉપાડ)
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={dynamicColumns.length + 2} style={{ padding: '12px', color: '#64748b' }}>
                  Loading live production...
                </td>
              </tr>
            ) : reportRows.length === 0 ? (
              <tr>
                <td colSpan={dynamicColumns.length + 2} style={{ padding: '12px', color: '#94a3b8' }}>
                  કોઈ ડેટા મળ્યો નથી.
                </td>
              </tr>
            ) : (
              reportRows.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: '600' }}>
                    {formatDateToDMY(row.date)}
                  </td>
                  {dynamicColumns.map((col, cIdx) => (
                    <td key={cIdx} style={{ padding: '6px', border: '1px solid #cbd5e1' }}>
                      {row[col] !== undefined ? row[col] : '-'}
                    </td>
                  ))}
                  <td style={{ padding: '6px', border: '1px solid #cbd5e1', color: '#dc2626', fontWeight: '700', backgroundColor: '#fff5f5' }}>
                    {row.dayUpad ? `₹ ${row.dayUpad.toLocaleString('en-IN')}` : '-'}
                  </td>
                </tr>
              ))
            )}

            {/* TOTAL ROW */}
            {reportRows.length > 0 && (
              <>
                <tr style={{ fontWeight: '800', backgroundColor: '#f8fafc' }}>
                  <td style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'left' }}>Total</td>
                  {dynamicColumns.map((col, idx) => {
                    const totalColQty = reportRows.reduce((sum, row) => sum + (Number(row[col]) || 0), 0);
                    return (
                      <td key={idx} style={{ padding: '6px', border: '1px solid #cbd5e1' }}>
                        {totalColQty}
                      </td>
                    );
                  })}
                  <td style={{ padding: '6px', border: '1px solid #cbd5e1', color: '#dc2626', backgroundColor: '#fee2e2' }}>
                    ₹ {totalUpad.toLocaleString('en-IN')}
                  </td>
                </tr>

                {/* REAL DB RATE ROW */}
                <tr style={{ color: '#475569', backgroundColor: '#ffffff' }}>
                  <td style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: '700' }}>Rate (₹)</td>
                  {dynamicColumns.map((col, idx) => (
                    <td key={idx} style={{ padding: '6px', border: '1px solid #cbd5e1', fontWeight: '700' }}>
                      {getRateForColumn(col)}
                    </td>
                  ))}
                  <td style={{ padding: '6px', border: '1px solid #cbd5e1', color: '#94a3b8' }}>-</td>
                </tr>

                {/* TOTAL AMOUNT ROW */}
                <tr style={{ fontWeight: '900', backgroundColor: '#f1f5f9', color: '#0f172a' }}>
                  <td style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'left' }}>Total Amount (₹)</td>
                  {dynamicColumns.map((col, idx) => {
                    const totalColQty = reportRows.reduce((sum, row) => sum + (Number(row[col]) || 0), 0);
                    const amt = totalColQty * getRateForColumn(col);
                    return (
                      <td key={idx} style={{ padding: '6px', border: '1px solid #cbd5e1' }}>
                        ₹ {amt.toLocaleString('en-IN')}
                      </td>
                    );
                  })}
                  <td style={{ padding: '6px', border: '1px solid #cbd5e1', color: '#dc2626', backgroundColor: '#fee2e2' }}>
                    - ₹ {totalUpad.toLocaleString('en-IN')}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>

        {/* 💰 SUMMARY & OUTSTANDING */}
        <div style={{ marginTop: '14px', borderTop: '2px solid #0f172a', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1e293b' }}>
            <span>Total Production Amount:</span>
            <strong>₹ {grandTotalProduction.toLocaleString('en-IN')}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
            <span>Till Date Upad (ઉપાડ):</span>
            <strong>- ₹ {totalUpad.toLocaleString('en-IN')}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '6px', fontSize: '13px', color: '#15803d' }}>
            <span><strong>Net Outstanding Payable:</strong></span>
            <strong style={{ fontSize: '15px' }}>₹ {netOutstanding.toLocaleString('en-IN')}</strong>
          </div>
        </div>

      </div>

      {/* 🖨️ Print Stylesheet */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .no-print { display: none !important; }
          div, table, tr, td, th { visibility: visible; }
          @page { size: portrait; margin: 10mm; }
        }
      `}</style>
    </div>
  );
}
// ==========================================
// 🏢 MAIN DASHBOARD COMPONENT
// ==========================================
export default function PlantEmployeeDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [workingBalance, setWorkingBalance] = useState(0);
  const [todayExpense, setTodayExpense] = useState(0);
  const [rawMaterialsStock, setRawMaterialsStock] = useState([]);
  const [plantList, setPlantList] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState('All');
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isExpensePopupOpen, setIsExpensePopupOpen] = useState(false);
  const [expenseInitialTab, setExpenseInitialTab] = useState('plantexpense');
  const [incomeInitialTab, setIncomeInitialTab] = useState('expense');

  const [attendanceInfo, setAttendanceInfo] = useState({
    status: 'Punched In',
    time: '09:30 AM',
    badgeText: 'On Time',
    badgeBg: '#f0fdf4',
    badgeColor: '#15803d'
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const approveId = params.get('approve_id');
    const type = params.get('type');
    
    if (approveId) {
      if (type === 'dpr') {
        localStorage.setItem('pending_dpr_approve_id', approveId);
        setActiveTab('dpr');
      } else {
        localStorage.setItem('pending_approve_id', approveId);
        setActiveTab('inward');
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [user, selectedPlant]);

  useEffect(() => {
    const fetchPlantList = async () => {
      try {
        const { data, error } = await supabase
          .from('material_stock_ledger')
          .select('plant_name');

        if (!error && data) {
          const unique = [...new Set(data.map(d => d.plant_name).filter(Boolean))];
          setPlantList(unique);
          if (unique.length > 0 && selectedPlant === 'All') {
            setSelectedPlant(unique[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching plant list:', err);
      }
    };

    fetchPlantList();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const userEmail = user?.email;

      if (!userEmail) return;

      let totalIncome = 0;
      let totalPlantExpense = 0;
      let totalSiteExpense = 0;
      let todayExpSum = 0;

      // ૧. SITE TRANSACTIONS
      const { data: siteTxData, error: siteTxErr } = await supabase
        .from('site_transactions')
        .select('*');

      if (!siteTxErr && siteTxData) {
        const userSiteTx = siteTxData.filter(item => 
          item.created_by === userEmail ||
          item.user_id === userEmail ||
          item.email === userEmail
        );

        userSiteTx.forEach(item => {
          const amt = parseFloat(item.amount || item.net_amount || item.total_amount || 0);
          const itemDate = item.date || item.transaction_date || (item.created_at ? item.created_at.split('T')[0] : '');
          const typeStr = (item.type || item.transaction_type || '').toLowerCase();

          if (
            typeStr.includes('income') || 
            typeStr.includes('credit') || 
            typeStr.includes('fund') || 
            typeStr.includes('receive') || 
            typeStr.includes('deposit')
          ) {
            totalIncome += amt;
          } else if (
            typeStr.includes('expense') || 
            typeStr.includes('debit') || 
            typeStr.includes('payment') || 
            typeStr.includes('cash')
          ) {
            totalSiteExpense += amt;
            if (itemDate === todayStr) {
              todayExpSum += amt;
            }
          }
        });
      }

      // ૨. PLANT EXPENSES
      const { data: plantExpData, error: plantExpErr } = await supabase
        .from('plant_expenses')
        .select('*');

      if (!plantExpErr && plantExpData) {
        const userPlantExp = plantExpData.filter(item => 
          item.submitted_by === userEmail ||
          item.created_by === userEmail
        );

        userPlantExp.forEach(item => {
          const amt = parseFloat(item.amount || 0);
          const itemDate = item.expense_date || (item.created_at ? item.created_at.split('T')[0] : '');

          totalPlantExpense += amt;
          if (itemDate === todayStr) {
            todayExpSum += amt;
          }
        });
      }

      const grandTotalExpense = totalPlantExpense + totalSiteExpense;
      setWorkingBalance(totalIncome - grandTotalExpense);
      setTodayExpense(todayExpSum);

      // ૪. RAW MATERIAL, STORE & ASSETS STOCK
      let matQuery = supabase.from('material_stock_ledger').select('*');
      if (selectedPlant && selectedPlant !== 'All') {
        matQuery = matQuery.eq('plant_name', selectedPlant);
      }
      const { data: matLedger, error: matErr } = await matQuery;

      if (!matErr && matLedger) {
        const stockMap = {};

        const checkIsRawMaterial = (name) => {
          const n = name.toLowerCase();
          return (
            n.includes('cement') ||
            n.includes('steel') ||
            n.includes('wire') ||
            n.includes('mm') ||
            n.includes('aggregate') ||
            n.includes('sand') ||
            n.includes('dust') ||
            n.includes('flyash') ||
            n.includes('rmc') ||
            n.includes('tmt')
          );
        };

        const checkIsAsset = (name) => {
          const n = name.toLowerCase();
          return (
            n.includes('mould') ||
            n.includes('mold') ||
            n.includes('machine') ||
            n.includes('vibrator') ||
            n.includes('panel') ||
            n.includes('crane') ||
            n.includes('batching') ||
            n.includes('silow') ||
            n.includes('asset')
          );
        };

        matLedger.forEach(item => {
          const rawName = (item.material_name || '').trim();
          if (!rawName) return;

          const key = rawName.toLowerCase();
          const qty = parseFloat(item.qty || item.quantity || 0);
          const type = (item.transaction_type || '').toUpperCase().trim();
          const unit = item.unit || 'Nos';

          if (!stockMap[key]) {
            let determinedCategory = 'store';
            if (checkIsAsset(rawName)) {
              determinedCategory = 'asset';
            } else if (checkIsRawMaterial(rawName)) {
              determinedCategory = 'raw';
            }

            stockMap[key] = { 
              name: rawName, 
              stock: 0, 
              unit,
              category: determinedCategory
            };
          }

          if (type === 'INWARD' || type === 'IN' || type.includes('INWARD')) {
            stockMap[key].stock += qty;
          } else if (
            type === 'OUTWARD' || 
            type === 'OUT' || 
            type.includes('CONSUM') || 
            type.includes('ISSUE') || 
            type.includes('OUTWARD')
          ) {
            stockMap[key].stock -= qty;
          }
        });

        setRawMaterialsStock(Object.values(stockMap));
      }

      // ૫. ATTENDANCE FETCH
      const { data: attData, error: attError } = await supabase
        .from('site_attendance')
        .select('*');

      if (!attError && attData && attData.length > 0) {
        const userAtt = attData.find(a => 
          (a.employee_name === userEmail || a.created_by === userEmail) && 
          (a.created_at && a.created_at.split('T')[0] === todayStr)
        );

        if (userAtt) {
          if (userAtt.punch_type === 'OUT') {
            setAttendanceInfo({
              status: 'Punched Out',
              time: new Date(userAtt.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
              badgeText: 'Day Ended',
              badgeBg: '#f1f5f9',
              badgeColor: '#475569'
            });
          } else {
            setAttendanceInfo({
              status: 'Punched In',
              time: new Date(userAtt.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
              badgeText: 'On Time',
              badgeBg: '#f0fdf4',
              badgeColor: '#15803d'
            });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching employee dashboard data:', err);
    }
  };

  const rawItems = rawMaterialsStock.filter(i => i.category === 'raw');
  const storeItems = rawMaterialsStock.filter(i => i.category === 'store');
  const assetItems = rawMaterialsStock.filter(i => i.category === 'asset');


  return (
    <div style={{ 
      width: '100%', 
      maxWidth: '650px', 
      minHeight: '100vh', 
      paddingBottom: '100px', 
      backgroundColor: '#f8fafc', 
      position: 'relative',
      boxSizing: 'border-box'
    }}>
      {/* ================= ૧. HOME TAB ================= */}
      {activeTab === 'home' && (
        <div style={{ 
          width: '100%', 
          maxWidth: '650px', 
          margin: '0 auto', 
          padding: '10px 0', 
          boxSizing: 'border-box',
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px' 
        }}>
          
          {/* Header Card */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', padding: '10px 14px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '15px' }}>
                {user?.email ? user.email.charAt(0).toUpperCase() : 'P'}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: '700' }}>Plant Portal</p>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                  {user?.email ? user.email.split('@')[0] : 'Plant Employee'}
                </h2>
              </div>
            </div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#16a34a', backgroundColor: '#f0fdf4', padding: '4px 8px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              ● Active
            </div>
          </div>

          {/* Wallet Balance Card */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: '16px', padding: '16px 18px', color: 'white',
            boxShadow: '0 8px 20px -6px rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.1)',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '90px', height: '90px', background: '#3b82f6', filter: 'blur(40px)', opacity: 0.4, borderRadius: '50%' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', opacity: 0.85, position: 'relative' }}>
              <Wallet size={16} color="#38bdf8" />
              <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.6px', textTransform: 'uppercase' }}>Live Cash in Hand (Working Balance)</span>
            </div>
            <h1 style={{ margin: '4px 0 10px 0', fontSize: '28px', fontWeight: '900', letterSpacing: '-0.5px', position: 'relative', color: workingBalance < 0 ? '#f87171' : '#ffffff' }}>
              ₹ {workingBalance.toLocaleString('en-IN')}
            </h1>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', position: 'relative', fontSize: '10px', color: '#94a3b8' }}>
              <span>Status: Verified & Active</span>
              <span>Live Data</span>
            </div>
          </div>



           {/* Quick Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div 
              onClick={() => setActiveTab('attendance')} 
              style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '6px', borderRadius: '8px' }}><Clock size={14} /></div>
                <span style={{ fontSize: '9px', backgroundColor: attendanceInfo.badgeBg, color: attendanceInfo.badgeColor, padding: '2px 6px', borderRadius: '6px', fontWeight: '800' }}>
                  {attendanceInfo.badgeText}
                </span>
              </div>
              <h4 style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Attendance</h4>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', fontWeight: '900', color: '#0f172a' }}>
                {attendanceInfo.status}
              </p>
            </div>

            <div 
              onClick={() => setIsExpensePopupOpen(true)} 
              style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ backgroundColor: '#fff7ed', color: '#ea580c', padding: '6px', borderRadius: '8px' }}><IndianRupee size={14} /></div>
                <span style={{ fontSize: '9px', backgroundColor: '#fff7ed', color: '#c2410c', padding: '2px 6px', borderRadius: '6px', fontWeight: '800' }}>Today</span>
              </div>
              <h4 style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Today Expense</h4>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', fontWeight: '900', color: '#0f172a' }}>
                ₹ {todayExpense.toLocaleString('en-IN')}
              </p>
            </div>
          </div>


          {/* Plant Selector Dropdown */}
          <div style={{
            backgroundColor: '#ffffff',
            padding: '8px 12px',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px' }}>🏭</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>Select Plant:</span>
            </div>
            <select 
              value={selectedPlant} 
              onChange={(e) => setSelectedPlant(e.target.value)}
              style={{
                border: '1px solid #94a3b8',
                borderRadius: '8px',
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: '700',
                color: '#0f172a',
                backgroundColor: '#f8fafc',
                outline: 'none',
                cursor: 'pointer',
                maxWidth: '220px'
              }}  
            >
              <option value="All">All Plants (બધા પ્લાન્ટ)</option>
              {plantList.map((plantName, idx) => (
                <option key={idx} value={plantName}>{plantName}</option>
              ))}
            </select>
          </div>

          {/* 📦 LIVE INVENTORY SECTION */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '10px 12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={16} color="#2563eb" />
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Live Plant Inventory
                </span>
              </div>
              <span style={{ fontSize: '10px', fontWeight: '800', color: '#16a34a', backgroundColor: '#f0fdf4', padding: '2px 6px', borderRadius: '6px' }}>
                ● Live Sync
              </span>
            </div>

            {/* RAW MATERIALS */}
            <div>
              <span style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                🧱 Raw Materials ({rawItems.length})
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                {rawItems.length === 0 ? (
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', gridColumn: 'span 2' }}>No raw material stock</span>
                ) : (
                  rawItems.map((item, idx) => (
                    <div key={idx} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%' }}>{item.name}</span>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{ fontSize: '12px', fontWeight: '900', color: item.stock <= 0 ? '#dc2626' : '#0f172a' }}>{item.stock.toLocaleString('en-IN')}</span>
                        <span style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', marginLeft: '3px' }}>{item.unit}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #e2e8f0', margin: '2px 0' }} />

            {/* STORE & TOOLS (Assets Filtered Out) */}
            <div>
              <span style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                🛠️ Store & Daily Tools ({storeItems.length})
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                {storeItems.length === 0 ? (
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', gridColumn: 'span 2' }}>No store items found</span>
                ) : (
                  storeItems.map((item, idx) => (
                    <div key={idx} style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '10px', padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#92400e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%' }}>{item.name}</span>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{ fontSize: '12px', fontWeight: '900', color: item.stock <= 0 ? '#dc2626' : '#78350f' }}>{item.stock.toLocaleString('en-IN')}</span>
                        <span style={{ fontSize: '9px', fontWeight: '700', color: '#b45309', marginLeft: '3px' }}>{item.unit}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #e2e8f0', margin: '2px 0' }} />

            {/* 🏗️ SEPARATE ASSETS CLICKABLE CARD */}
            <div 
              onClick={() => setActiveTab('assets_page')}
              style={{
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ backgroundColor: '#3b82f6', color: '#fff', borderRadius: '6px', padding: '4px' }}>
                  <Box size={14} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a' }}>Fixed Assets & Line Moulds ({assetItems.length})</div>
                  <div style={{ fontSize: '9px', color: '#64748b' }}>Moulds, Machinery & Equipment Stock</div>
                </div>
              </div>
              <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: '800', display: 'flex', alignItems: 'center' }}>
                View <ChevronRight size={14} />
              </span>
            </div>

          </div>
          

         {/* Production Report Entry Card */}
<div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '12px 14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <div style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '8px', borderRadius: '10px' }}>
        <FileText size={16} />
      </div>
      <div>
        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>Production & Labour Report</h4>
        <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}>Itemwise billing, line production & upad statement</p>
      </div>
    </div>
    <span style={{ fontSize: '10px', backgroundColor: '#eff6ff', color: '#2563eb', padding: '3px 8px', borderRadius: '6px', fontWeight: '800' }}>
      Billing Ready
    </span>
  </div>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
    <span>Export PDF / View Sheet</span>
    <button 
      onClick={() => setActiveTab('production_report')} 
      style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: '800', cursor: 'pointer', padding: 0, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}
    >
      Open Report <ChevronRight size={12} />
    </button>
  </div>
</div>
         
         
         

          </div>

       
      )}

      {/* ================= ૨. ASSET INDEPENDENT VIEW ================= */}
      {activeTab === 'assets_page' && (
        <div style={{ padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              onClick={() => setActiveTab('home')}
              style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <ArrowLeft size={16} color="#0f172a" />
            </button>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '900', color: '#0f172a' }}>🏗️ Fixed Assets & Line Moulds</h3>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '10px' }}>
              Plant: <strong>{selectedPlant}</strong> | Total Items: <strong>{assetItems.length}</strong>
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {assetItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px' }}>No fixed assets or moulds recorded yet.</div>
              ) : (
                assetItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Box size={16} color="#2563eb" />
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{item.name}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: '900', color: item.stock <= 0 ? '#dc2626' : '#15803d' }}>
                        {item.stock.toLocaleString('en-IN')}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', marginLeft: '4px' }}>
                        {item.unit}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'dpr' && <PlantDprEntry />}
      {activeTab === 'attendance' && <AttendancePage />}
      {activeTab === 'expense' && <SupervisorExpenses defaultType={incomeInitialTab} />}
      {activeTab === 'inward' && <PlantInwardPage />}
      {activeTab === 'outward' && <PlantOutwardPage />}
      {activeTab === 'site_return' && <SiteMaterialReturn />}
      {activeTab === 'issue_return' && <IssueReturn />}
      {activeTab === 'plantexpense' && <PlantExpensesPage user={user} defaultType={expenseInitialTab} />}
      {activeTab === 'production_report' && (
  <ProductionReportView 
    onBack={() => setActiveTab('home')} 
    plantList={plantList} 
  />
)}
      
      {/* OPERATIONS POPUP */}
      {isPopupOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)',
          zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          paddingBottom: '95px',
          animation: 'fadeIn 0.2s ease-out'
        }} onClick={() => setIsPopupOpen(false)}>
          
          <div style={{
            width: '92%', maxWidth: '400px', backgroundColor: '#ffffff',
            borderRadius: '26px', padding: '18px',
            boxShadow: '0 -10px 30px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0',
            display: 'flex', flexDirection: 'column', gap: '10px'
          }} onClick={(e) => e.stopPropagation()}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: '900', color: '#475569', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                SELECT OPERATION
              </span>
              <button 
                onClick={() => setIsPopupOpen(false)} 
                style={{ 
                  background: '#f1f5f9', border: 'none', borderRadius: '50%', 
                  width: '28px', height: '28px', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', cursor: 'pointer', color: '#475569'
                }}
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            <div onClick={() => { setActiveTab('inward'); setIsPopupOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', cursor: 'pointer' }}>
              <span style={{ fontSize: '18px', backgroundColor: '#dcfce7', padding: '6px', borderRadius: '10px' }}>📥</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#15803d' }}>1. PLANT INWARD</span>
                <span style={{ fontSize: '9px', color: '#166534', fontWeight: '600' }}>Receive raw materials or stock items</span>
              </div>
            </div>

            <div onClick={() => { setActiveTab('outward'); setIsPopupOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', cursor: 'pointer' }}>
              <span style={{ fontSize: '18px', backgroundColor: '#ffedd5', padding: '6px', borderRadius: '10px' }}>📤</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#c2410c' }}>2. PLANT OUTWARD</span>
                <span style={{ fontSize: '9px', color: '#9a3412', fontWeight: '600' }}>Dispatch finished goods to sites</span>
              </div>
            </div>

            <div onClick={() => { setActiveTab('issue_return'); setIsPopupOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', cursor: 'pointer' }}>
              <span style={{ fontSize: '18px', backgroundColor: '#dbeafe', padding: '6px', borderRadius: '10px' }}>🛠️</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#1d4ed8' }}>3. ISSUE & RETURN</span>
                <span style={{ fontSize: '9px', color: '#1e40af', fontWeight: '600' }}>Manage tools, items issue and returns</span>
              </div>
            </div>

            <div onClick={() => { setActiveTab('site_return'); setIsPopupOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', backgroundColor: '#f3e8ff', border: '1px solid #d8b4fe', cursor: 'pointer' }}>
              <span style={{ fontSize: '18px', backgroundColor: '#e9d5ff', padding: '6px', borderRadius: '10px' }}>🔄</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#7e22ce' }}>4. SITE MATERIAL RETURN</span>
                <span style={{ fontSize: '10px', color: '#6b21a8', fontWeight: '600' }}>Receive damaged/extra goods from site</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* EXPENSE & INCOME POPUP */}
      {isExpensePopupOpen && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)',
            zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingBottom: '95px',
            animation: 'fadeIn 0.2s ease-out'
          }} 
          onClick={() => setIsExpensePopupOpen(false)}
        >
          <div 
            style={{
              width: '92%', maxWidth: '400px', backgroundColor: '#ffffff',
              borderRadius: '26px', padding: '18px',
              boxShadow: '0 -10px 30px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0',
              display: 'flex', flexDirection: 'column', gap: '10px'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: '900', color: '#475569', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                SELECT TRANSACTION TYPE
              </span>
              <button 
                onClick={() => setIsExpensePopupOpen(false)} 
                style={{ 
                  background: '#f1f5f9', border: 'none', borderRadius: '50%', 
                  width: '28px', height: '28px', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', cursor: 'pointer', color: '#475569'
                }}
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            <div 
              onClick={() => {
                setIncomeInitialTab('income');
                setActiveTab('expense');
                setIsExpensePopupOpen(false);
              }} 
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', cursor: 'pointer' }}
            >
              <span style={{ fontSize: '18px', backgroundColor: '#dcfce7', padding: '6px', borderRadius: '10px' }}>💰</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#15803d' }}>1. INCOME / FUND RECEIVE</span>
                <span style={{ fontSize: '9px', color: '#166534', fontWeight: '600' }}>Add money received from office/owner</span>
              </div>
            </div>

            <div 
              onClick={() => {
                setExpenseInitialTab('expense');
                setActiveTab('plantexpense');
                setIsExpensePopupOpen(false);
              }} 
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', cursor: 'pointer' }}>
              <span style={{ fontSize: '18px', backgroundColor: '#ffedd5', padding: '6px', borderRadius: '10px' }}>💸</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#c2410c' }}>2. EXPENSE PAYMENT</span>
                <span style={{ fontSize: '9px', color: '#9a3412', fontWeight: '600' }}>Add plant purchases, diesel, tea, repairs</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* NAVIGATION BAR */}
      <div style={{ 
        position: 'fixed', bottom: '10px', left: '50%', transform: 'translateX(-50%)', 
        width: '92%', maxWidth: '420px', 
        height: '54px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)', 
        display: 'flex', justifyContent: 'space-around', alignItems: 'center', 
        borderRadius: '35px', 
        border: '1px solid #e2e8f0', 
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)', 
        zIndex: 9999,
        padding: '0 8px'
      }}>
        {/* Home */}
        <div 
          onClick={() => setActiveTab('home')} 
          style={{ 
            textAlign: 'center', 
            cursor: 'pointer', 
            color: activeTab === 'home' ? '#2563eb' : '#64748b', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            flex: 1 
          }}
        >
          <div 
            style={{
              backgroundColor: activeTab === 'home' ? '#dbeafe' : 'transparent',
              padding: '4px 16px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <Home size={19} />
          </div>
          <span style={{ fontSize: '9px', marginTop: '3px', fontWeight: activeTab === 'home' ? '800' : '600' }}>Home</span>
        </div>

        {/* DPR */}
        <div 
          onClick={() => setActiveTab('dpr')} 
          style={{ 
            textAlign: 'center', 
            cursor: 'pointer', 
            color: activeTab === 'dpr' ? '#2563eb' : '#64748b', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            flex: 1 
          }}
        >
          <div 
            style={{
              backgroundColor: activeTab === 'dpr' ? '#dbeafe' : 'transparent',
              padding: '4px 16px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <ClipboardEdit size={19} />
          </div>
          <span style={{ fontSize: '9px', marginTop: '3px', fontWeight: activeTab === 'dpr' ? '800' : '600' }}>DPR</span>
        </div>

        {/* Floating Center Button */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, position: 'relative' }}>
          <div 
            onClick={() => setIsPopupOpen(true)}
            style={{
              position: 'absolute',
              top: '-26px',
              width: '50px', height: '50px', borderRadius: '50%',
              backgroundColor: '#2563eb', color: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(37, 99, 235, 0.45)', cursor: 'pointer',
              border: '4px solid #f8fafc',
              transition: 'transform 0.2s ease'
            }}
          >
            <Plus size={26} strokeWidth={2.5} />
          </div>
        </div>

        {/* Expense Button */}
        <div 
          onClick={() => setIsExpensePopupOpen(true)} 
          style={{ 
            textAlign: 'center', 
            cursor: 'pointer', 
            color: (isExpensePopupOpen || activeTab === 'plantexpense' || activeTab === 'expense') ? '#2563eb' : '#64748b', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            flex: 1 
          }}
        >
          <div 
            style={{
              backgroundColor: (isExpensePopupOpen || activeTab === 'plantexpense' || activeTab === 'expense') ? '#dbeafe' : 'transparent',
              padding: '4px 16px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <IndianRupee size={19} />
          </div>
          <span style={{ fontSize: '9px', marginTop: '3px', fontWeight: (isExpensePopupOpen || activeTab === 'plantexpense' || activeTab === 'expense') ? '800' : '600' }}>Expense</span>
        </div>

        {/* Attendance */}
        <div 
          onClick={() => setActiveTab('attendance')} 
          style={{ textAlign: 'center', cursor: 'pointer', color: activeTab === 'attendance' ? '#2563eb' : '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}
        >
          <div style={{ backgroundColor: activeTab === 'attendance' ? '#dbeafe' : 'transparent', padding: '4px 16px', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease-in-out' }}>
            <UserCheck size={19} />
          </div>
          <span style={{ fontSize: '9px', marginTop: '3px', fontWeight: activeTab === 'attendance' ? '800' : '600' }}>Attendance</span>
        </div>
      </div>
    </div>
  );
}