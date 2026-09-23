import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, MapPin, FileText, ChevronDown, ChevronUp, RefreshCcw, Globe, FileDown, ArrowLeft, Package, Truck, ArrowUpRight, Users } from 'lucide-react';

// --- Date Formatting Helper ---
const formatDateToDDMMYYYY = (dateString) => {
  if (!dateString || dateString === '-') return '-';
  const datePart = dateString.split('T')[0]; 
  const [year, month, day] = datePart.split('-');
  if (day && month && year) {
    return `${day}/${month}/${year}`;
  }
  return dateString;
};

const AdminSiteReportPage = () => {
  const [isAllDates, setIsAllDates] = useState(false);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  // 🎯 State Logic
  const [allSitesDb, setAllSitesDb] = useState([]);
  const [stateList, setStateList] = useState([]);
  const [selectedState, setSelectedState] = useState('All');
  
  const [siteList, setSiteList] = useState([]);
  const [selectedSite, setSelectedSite] = useState('All');
  
  const [contractorList, setContractorList] = useState([]);
  const [selectedContractor, setSelectedContractor] = useState('All');

  const [activeTab, setActiveTab] = useState('DailyReport'); // Tabs State

  // 🎯 Sub-Tab States for New Site Tabs
  const [inwardGroupBy, setInwardGroupBy] = useState('Vendor'); 

  // 🎯 Data States
  const [loading, setLoading] = useState(false);
  const [reportRows, setReportRows] = useState([]);
  const [totalUpad, setTotalUpad] = useState(0);
  const [dynamicColumns, setDynamicColumns] = useState([]);

  // New Data States for Stock & Inward/Outward
  const [siteStockData, setSiteStockData] = useState([]);
  const [siteInwardData, setSiteInwardData] = useState([]);
  const [siteVendorData, setSiteVendorData] = useState([]);
  const [siteOutwardData, setSiteOutwardData] = useState([]);

  const [expandedId, setExpandedId] = useState(null); 

  // ૧. સાઇટ્સની યાદી અને રાજ્યો (States) ફેચ કરવા
  useEffect(() => {
    const fetchSites = async () => {
      try {
        const { data, error } = await supabase.from('sites').select('site_name, state');
        if (!error && data) {
          setAllSitesDb(data);
          const uniqueStates = [...new Set(data.map(d => d.state).filter(Boolean))];
          setStateList(uniqueStates);
          
          const uniqueSites = [...new Set(data.map(d => d.site_name).filter(Boolean))];
          setSiteList(uniqueSites);
        }
      } catch (err) {
        console.error('Error fetching sites:', err);
      }
    };
    fetchSites();
  }, []);

  // ૨. રાજ્ય (State) બદલાય ત્યારે સાઇટનું લિસ્ટ ફિલ્ટર કરવું
  useEffect(() => {
    let filtered = allSitesDb;
    if (selectedState !== 'All') {
      filtered = filtered.filter(s => s.state === selectedState);
    }
    const unique = [...new Set(filtered.map(d => d.site_name).filter(Boolean))];
    setSiteList(unique);
  }, [selectedState, allSitesDb]);

  // ૩. સાઇટ મુજબ કોન્ટ્રાક્ટર/લેબર લિસ્ટ લાવવું
  useEffect(() => {
    const fetchContractors = async () => {
      try {
        let query = supabase.from('contractors').select('*');
        if (selectedSite && selectedSite !== 'All') {
          query = query.or(`site_name.eq."${selectedSite}",company_name.eq."${selectedSite}"`);
        }
        const { data, error } = await query;
        if (!error && data) {
          const filteredNames = [...new Set(data.map(d => d.name).filter(Boolean))];
          setContractorList(filteredNames);
        } else {
          setContractorList([]);
        }
      } catch (err) {
        console.error('Error fetching contractors:', err);
      }
    };
    fetchContractors();
  }, [selectedSite]);

  // ૪. ડેટા ફેચ કરવો (Daily Reports & New Inventory Data)
  useEffect(() => {
    fetchSiteReportData();
  }, [selectedSite, selectedContractor, fromDate, toDate, isAllDates]);

  const fetchSiteReportData = async () => {
    setLoading(true);
    try {
      // ==========================================
      // A. DAILY REPORT LOGIC (Existing)
      // ==========================================
      const groupedByDate = {};
      const uniqueColSet = new Set();

      let reportQuery = supabase.from('daily_reports').select('*');
      if (selectedSite && selectedSite !== 'All') reportQuery = reportQuery.eq('site_name', selectedSite);
      else if (selectedState !== 'All' && siteList.length > 0) reportQuery = reportQuery.in('site_name', siteList); 

      if (!isAllDates) {
        if (fromDate) reportQuery = reportQuery.gte('report_date', fromDate);
        if (toDate) reportQuery = reportQuery.lte('report_date', toDate);
      }

      const { data: reportData } = await reportQuery;

      if (reportData && reportData.length > 0) {
        reportData.forEach(rep => {
          const dStr = rep.report_date;
          if (!dStr) return;

          const contractorRows = rep.contractor_details || [];
          contractorRows.forEach(cRow => {
            if (selectedContractor && selectedContractor !== 'All' && cRow.contractorName !== selectedContractor) return;

            const workItems = cRow.workItems || [];
            workItems.forEach(wItem => {
              let wName = wItem.workType || 'Work';
              if (wName === '2. Column Concrete') {
                const singleQ = Number(wItem.singleCastingQty || 0);
                const doubleQ = Number(wItem.doubleCastingQty || 0);
                if (singleQ > 0) {
                  uniqueColSet.add('Single Column Casting');
                  if (!groupedByDate[dStr]) groupedByDate[dStr] = { date: dStr };
                  groupedByDate[dStr]['Single Column Casting'] = (groupedByDate[dStr]['Single Column Casting'] || 0) + singleQ;
                }
                if (doubleQ > 0) {
                  uniqueColSet.add('Double Column Casting');
                  if (!groupedByDate[dStr]) groupedByDate[dStr] = { date: dStr };
                  groupedByDate[dStr]['Double Column Casting'] = (groupedByDate[dStr]['Double Column Casting'] || 0) + doubleQ;
                }
              } else {
                const qty = Number(wItem.quantity || wItem.actualCementBags || wItem.runningFeet || 0);
                if (wName && qty > 0) {
                  uniqueColSet.add(wName);
                  if (!groupedByDate[dStr]) groupedByDate[dStr] = { date: dStr };
                  groupedByDate[dStr][wName] = (groupedByDate[dStr][wName] || 0) + qty;
                }
              }
            });
          });

          const palingRows = rep.paling_work || [];
          palingRows.forEach(pRow => {
            if (selectedContractor && selectedContractor !== 'All' && pRow.contractorName !== selectedContractor) return;
            const pQty = Number(pRow.qty || 0);
            if (pQty > 0) {
              uniqueColSet.add('Paling Work');
              if (!groupedByDate[dStr]) groupedByDate[dStr] = { date: dStr };
              groupedByDate[dStr]['Paling Work'] = (groupedByDate[dStr]['Paling Work'] || 0) + pQty;
            }
          });
        });

        setDynamicColumns(Array.from(uniqueColSet));
      } else {
        setDynamicColumns([]);
      }

      // Expenses / Upad
      const upadByDateMap = {};
      let totalUpadSum = 0;
      let upadQuery = supabase.from('plant_expenses').select('amount, expense_date, paid_to, expense_category, plant_name').ilike('expense_category', '%ઉપાડ%');

      if (selectedSite && selectedSite !== 'All') upadQuery = upadQuery.eq('plant_name', selectedSite);
      else if (siteList.length > 0) upadQuery = upadQuery.in('plant_name', siteList);

      if (selectedContractor && selectedContractor !== 'All') upadQuery = upadQuery.eq('paid_to', selectedContractor);
      
      if (!isAllDates) {
        if (fromDate) upadQuery = upadQuery.gte('expense_date', fromDate);
        if (toDate) upadQuery = upadQuery.lte('expense_date', toDate);
      }

      const { data: upadData } = await upadQuery;
      if (upadData && upadData.length > 0) {
        upadData.forEach(item => {
          const amt = Number(item.amount || 0);
          upadByDateMap[item.expense_date] = (upadByDateMap[item.expense_date] || 0) + amt;
          totalUpadSum += amt;
        });
      }

      setTotalUpad(totalUpadSum);

      Object.keys(groupedByDate).forEach(dStr => groupedByDate[dStr].dayUpad = upadByDateMap[dStr] || 0);
      Object.keys(upadByDateMap).forEach(expDate => {
        if (!groupedByDate[expDate]) groupedByDate[expDate] = { date: expDate, dayUpad: upadByDateMap[expDate] };
      });

      setReportRows(Object.values(groupedByDate).sort((a, b) => new Date(b.date) - new Date(a.date)));

      // ==========================================
      // B. SITE MATERIAL STOCK LEDGER LOGIC (NEW)
      // ==========================================
      let ledgerQuery = supabase.from('site_material_stock_ledger').select('*');
      if (selectedSite !== 'All') ledgerQuery = ledgerQuery.eq('site_name', selectedSite);
      else if (selectedState !== 'All' && siteList.length > 0) ledgerQuery = ledgerQuery.in('site_name', siteList);
      
      if (!isAllDates) ledgerQuery = ledgerQuery.lte('date', toDate); // Fetch up to 'toDate' to calculate stock

      const { data: stockData } = await ledgerQuery;

      const stockMap = {};
      const inwardVendorMap = {};
      const inwardMaterialMap = {};
      const outwardMap = {};

      if (stockData) {
        stockData.forEach(row => {
          const qty = Number(row.qty || row.quantity) || 0;
          const rowDate = new Date(row.date);
          const fromD = new Date(fromDate);
          
          const isBefore = !isAllDates && rowDate < fromD;
          const isCurrentPeriod = isAllDates || (rowDate >= fromD);

          const itemName = row.material_name || row.item_name || 'Unknown Material'; 
          const uom = row.unit || row.uom || '-';
          const tType = String(row.transaction_type || '').toUpperCase().trim();
          const supplier = row.supplier_name || row.vendor_name || 'સીધી ખરીદી (Direct / Plant)';
          const dateStr = row.date ? formatDateToDDMMYYYY(row.date) : '-';

          // 1. Stock Register Calculation
          if (!stockMap[itemName]) {
            stockMap[itemName] = { material: itemName, uom: uom, opening: 0, inward: 0, consumption: 0, outward: 0, closing: 0 };
          }
          
          if (['INWARD', 'RECEIPT', 'PURCHASE'].includes(tType)) {
            if (isBefore) stockMap[itemName].opening += qty;
            if (isCurrentPeriod) stockMap[itemName].inward += qty;
            stockMap[itemName].closing += qty;

            // Prepare Inward Report Data (Current Period Only)
            if (isCurrentPeriod) {
              // Vendor Wise
              if (!inwardVendorMap[supplier]) inwardVendorMap[supplier] = { id: supplier, vendorName: supplier, totalQty: 0, materialsMap: {} };
              inwardVendorMap[supplier].totalQty += qty;
              if (!inwardVendorMap[supplier].materialsMap[itemName]) inwardVendorMap[supplier].materialsMap[itemName] = { total: 0, uom: uom, transactions: [] };
              inwardVendorMap[supplier].materialsMap[itemName].total += qty;
              inwardVendorMap[supplier].materialsMap[itemName].transactions.push({ date: dateStr, qty: qty, uom: uom, vehicleNo: row.vehicle_no || '-', dcNumber: row.dc_number || '-' });

              // Material Wise
              if (!inwardMaterialMap[itemName]) inwardMaterialMap[itemName] = { id: itemName, name: itemName, totalInward: 0, uom: uom };
              inwardMaterialMap[itemName].totalInward += qty;
            }

          } else if (['CONSUMPTION', 'USED'].includes(tType)) {
            if (isBefore) stockMap[itemName].opening -= qty;
            if (isCurrentPeriod) stockMap[itemName].consumption += qty;
            stockMap[itemName].closing -= qty;

          } else if (['OUTWARD', 'RETURN', 'TRANSFER', 'DAMAGE'].includes(tType)) {
            if (isBefore) stockMap[itemName].opening -= qty;
            if (isCurrentPeriod) stockMap[itemName].outward += qty;
            stockMap[itemName].closing -= qty;

            // Prepare Outward Report Data
            if (isCurrentPeriod) {
              const destination = row.destination || row.transporter_name || 'Unknown Destination';
              if (!outwardMap[destination]) outwardMap[destination] = { id: destination, name: destination, totalQty: 0, transactions: [] };
              outwardMap[destination].totalQty += qty;
              outwardMap[destination].transactions.push({ date: dateStr, material: itemName, qty: qty, uom: uom, reason: tType, vehicleNo: row.vehicle_no || '-' });
            }
          }
        });
      }

      setSiteStockData(Object.values(stockMap));
      
      const finalVendors = Object.values(inwardVendorMap).map(v => {
        const matsList = Object.entries(v.materialsMap).map(([mName, mData]) => ({ name: mName, total: mData.total, uom: mData.uom, transactions: mData.transactions }));
        return { ...v, materials: matsList };
      });
      setSiteVendorData(finalVendors);
      setSiteInwardData(Object.values(inwardMaterialMap));
      setSiteOutwardData(Object.values(outwardMap));

    } catch (err) {
      console.error('Error fetching site report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAccordion = (id) => setExpandedId(expandedId === id ? null : id);

  return (
    <div style={{ width: '100%', maxWidth: '650px', margin: '0 auto', fontFamily: 'Inter, sans-serif', paddingBottom: '40px', boxSizing: 'border-box', minHeight: '100vh', backgroundColor: 'transparent' }}>
      
      {/* Top Header */}
      <div style={{ position: 'sticky', top: 0, backgroundColor: '#fcfcfc', zIndex: 10, margin: '-15px -15px 15px -15px', padding: '15px 15px 5px 15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', backgroundColor: '#fff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <button 
            onClick={() => window.history.back()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ margin: 0, fontSize: '16px', color: '#0f172a', fontWeight: 'bold' }}>
              Admin Site Daily Progress Report
            </h2>
            <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Labour Billing & Material Inventory
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {/* Filters Card */}
        <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          
          <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 'bold', color: '#1e293b', marginBottom: isAllDates ? '0' : '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={isAllDates} onChange={(e) => setIsAllDates(e.target.checked)} style={{ width: '15px', height: '15px' }} />
              બધી તારીખનો ડેટા (All Dates)
            </label>
            {!isAllDates && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '2px' }}>From</span>
                  <div style={inputWrapperStyle}>
                    <Calendar size={13} color="#64748b" />
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '2px' }}>To</span>
                  <div style={inputWrapperStyle}>
                    <Calendar size={13} color="#64748b" />
                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 🎯 State, Site & Contractor Dropdowns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
            <div style={inputWrapperStyle}>
              <Globe size={13} color="#64748b" />
              <select value={selectedState} onChange={(e) => {setSelectedState(e.target.value); setSelectedSite('All');}} style={inputStyle}>
                <option value="All">રાજ્યો (All)</option>
                {stateList.map((st, i) => <option key={i} value={st}>{st}</option>)}
              </select>
            </div>

            <div style={inputWrapperStyle}>
              <MapPin size={13} color="#64748b" />
              <select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)} style={inputStyle}>
                <option value="All">સાઇટ્સ (All)</option>
                {siteList.map((s, i) => <option key={i} value={s}>{s}</option>)}
              </select>
            </div>
            
            <div style={inputWrapperStyle}>
              <Users size={13} color="#64748b" />
              <select value={selectedContractor} onChange={(e) => setSelectedContractor(e.target.value)} style={inputStyle}>
                <option value="All">કોન્ટ્રાક્ટર્સ (All)</option>
                {contractorList.map((c, i) => <option key={i} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 🎯 TABS UI */}
        <div style={{ display: 'flex', backgroundColor: '#e2e8f0', borderRadius: '10px', padding: '4px', gap: '4px', overflowX: 'auto' }}>
          <button style={activeTab === 'DailyReport' ? activeTabStyle : inactiveTabStyle} onClick={() => setActiveTab('DailyReport')}>
            <FileText size={14} /> દૈનિક રિપોર્ટ
          </button>
          <button style={activeTab === 'FinishedGoods' ? activeTabStyle : inactiveTabStyle} onClick={() => setActiveTab('FinishedGoods')}>
            <Package size={14} /> સ્ટોક રજીસ્ટર
          </button>
          <button style={activeTab === 'Outward' ? activeTabStyle : inactiveTabStyle} onClick={() => setActiveTab('Outward')}>
            <ArrowUpRight size={14} /> જાવક રિપોર્ટ
          </button>
          <button style={activeTab === 'RawMaterials' ? activeTabStyle : inactiveTabStyle} onClick={() => setActiveTab('RawMaterials')}>
            <Truck size={14} /> ઈનવર્ડ રિપોર્ટ
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: DAILY REPORT CONTENT */}
        {/* ============================================================== */}
        {activeTab === 'DailyReport' && (
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '13px', margin: 0, color: '#1e293b', textTransform: 'uppercase' }}>
                📊 Site Billing & Production Format
              </h3>
              <button style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)' }}>
                <FileDown size={14} /> Print PDF
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                    <th style={{ padding: '8px 6px', border: '1px solid #cbd5e1', textAlign: 'left' }}>Date</th>
                    {dynamicColumns.map((col, idx) => (
                      <th key={idx} style={{ padding: '8px 6px', border: '1px solid #cbd5e1', textTransform: 'capitalize' }}>{col}</th>
                    ))}
                    <th style={{ padding: '8px 6px', border: '1px solid #cbd5e1', color: '#dc2626', backgroundColor: '#fef2f2' }}>Upad</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={dynamicColumns.length + 2} style={{ padding: '20px', color: '#64748b' }}>Loading site reports...</td></tr>
                  ) : reportRows.length === 0 ? (
                    <tr><td colSpan={dynamicColumns.length + 2} style={{ padding: '20px', color: '#94a3b8' }}>કોઈ ડેટા મળ્યો નથી.</td></tr>
                  ) : (
                    reportRows.map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: '600' }}>{formatDateToDDMMYYYY(row.date)}</td>
                        {dynamicColumns.map((col, cIdx) => (
                          <td key={cIdx} style={{ padding: '6px', border: '1px solid #cbd5e1' }}>{row[col] !== undefined ? row[col] : '-'}</td>
                        ))}
                        <td style={{ padding: '6px', border: '1px solid #cbd5e1', color: '#dc2626', fontWeight: '700', backgroundColor: '#fff5f5' }}>
                          {row.dayUpad ? `₹ ${row.dayUpad.toLocaleString('en-IN')}` : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                  {reportRows.length > 0 && (
                    <tr style={{ fontWeight: '800', backgroundColor: '#f8fafc' }}>
                      <td style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'left' }}>Total</td>
                      {dynamicColumns.map((col, idx) => {
                        const totalQty = reportRows.reduce((sum, row) => sum + (Number(row[col]) || 0), 0);
                        return <td key={idx} style={{ padding: '6px', border: '1px solid #cbd5e1' }}>{totalQty}</td>;
                      })}
                      <td style={{ padding: '6px', border: '1px solid #cbd5e1', color: '#dc2626', backgroundColor: '#fee2e2' }}>₹ {totalUpad.toLocaleString('en-IN')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: STOCK REGISTER (From site_material_stock_ledger) */}
        {/* ============================================================== */}
        {activeTab === 'FinishedGoods' && (
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <h3 style={{ fontSize: '14px', margin: 0, color: '#1e293b', textTransform: 'uppercase' }}>📦 SITE MATERIAL STOCK</h3>
              <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                <FileDown size={14} /> PDF
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#475569', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={thStyle}>MATERIAL NAME</th>
                    <th style={thStyle}>UOM</th>
                    <th style={thStyle}>OPENING</th>
                    <th style={thStyle}>INWARD</th>
                    <th style={thStyle}>CONSUMPTION</th>
                    <th style={thStyle}>OUTWARD</th>
                    <th style={thStyle}>CLOSING STOCK</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Loading Data...</td></tr>
                  ) : siteStockData.length === 0 ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No Stock Data Found</td></tr>
                  ) : (
                    siteStockData.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={tdBorder}>{row.material}</td>
                        <td style={tdBorder}>{row.uom}</td>
                        <td style={tdBorder}>{row.opening}</td>
                        <td style={tdBorder}>{row.inward || ''}</td>
                        <td style={tdBorder}>{row.consumption || ''}</td>
                        <td style={tdBorder}>{row.outward || ''}</td>
                        <td style={{ ...tdBorder, fontWeight: 'bold', color: '#0f172a', backgroundColor: '#f8fafc' }}>{row.closing}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: OUTWARD REPORT */}
        {/* ============================================================== */}
        {activeTab === 'Outward' && (
          <div>
            {loading ? (
              <p style={{ textAlign: 'center', color: '#94a3b8' }}>Loading Data...</p>
            ) : siteOutwardData.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8' }}>કોઈ જાવક ડેટા મળ્યો નથી.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {siteOutwardData.map(dest => (
                  <div key={dest.id} style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                    <div onClick={() => toggleAccordion(dest.id)} style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: expandedId === dest.id ? '#f8fafc' : '#fff' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '14px', color: '#1e293b' }}>📍 {dest.name}</h4>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Total Items Sent: {dest.totalQty}</span>
                      </div>
                      {expandedId === dest.id ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                    </div>
                    
                    {expandedId === dest.id && (
                      <div style={{ padding: '15px', borderTop: '1px solid #e2e8f0', backgroundColor: '#fff', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', whiteSpace: 'nowrap', border: '1px solid #cbd5e1' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', borderBottom: '1px solid #cbd5e1' }}>
                              <th style={tdBorder}>Date</th>
                              <th style={tdBorder}>Material</th>
                              <th style={tdBorder}>Qty</th>
                              <th style={tdBorder}>UOM</th>
                              <th style={tdBorder}>Reason / Type</th>
                              <th style={tdBorder}>Vehicle No</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dest.transactions.map((txn, tIdx) => (
                              <tr key={tIdx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={tdBorder}>{txn.date}</td>
                                <td style={tdBorder}>{txn.material}</td>
                                <td style={{ ...tdBorder, fontWeight: 'bold', color: '#dc2626' }}>{txn.qty}</td>
                                <td style={tdBorder}>{txn.uom}</td>
                                <td style={tdBorder}>{txn.reason}</td>
                                <td style={tdBorder}>{txn.vehicleNo}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: INWARD REPORT */}
        {/* ============================================================== */}
        {activeTab === 'RawMaterials' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
              <button onClick={() => setInwardGroupBy(inwardGroupBy === 'Vendor' ? 'Material' : 'Vendor')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', color: '#334155', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <RefreshCcw size={14} color="#2563eb" />
                {inwardGroupBy === 'Vendor' ? 'વસ્તુ મુજબ જોવું છે?' : 'પાર્ટી મુજબ જોવું છે?'}
              </button>
            </div>

            {inwardGroupBy === 'Vendor' && (
              loading ? <p style={{ textAlign: 'center', color: '#94a3b8' }}>Loading Data...</p> :
              siteVendorData.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94a3b8' }}>કોઈ ઇનવર્ડ ડેટા મળ્યો નથી.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {siteVendorData.map(vendor => (
                    <div key={vendor.id} style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                      <div onClick={() => toggleAccordion(vendor.id)} style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: expandedId === vendor.id ? '#f8fafc' : '#fff' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '14px', color: '#1e293b' }}>👤 {vendor.vendorName}</h4>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>કુલ આવક: {vendor.totalQty}</span>
                        </div>
                        {expandedId === vendor.id ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                      </div>
                      
                      {expandedId === vendor.id && (
                        <div style={{ padding: '15px', borderTop: '1px solid #e2e8f0', backgroundColor: '#fff', overflowX: 'auto' }}>
                          {vendor.materials.map((mat, idx) => (
                            <div key={idx} style={{ marginBottom: idx === vendor.materials.length - 1 ? '0' : '20px' }}>
                              <div style={{ fontSize: '13px', color: '#2563eb', fontWeight: 'bold', marginBottom: '8px' }}>📦 {mat.name}</div>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', whiteSpace: 'nowrap', border: '1px solid #cbd5e1' }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', borderBottom: '1px solid #cbd5e1' }}>
                                    <th style={tdBorder}>Date</th>
                                    <th style={tdBorder}>DC Number</th>
                                    <th style={tdBorder}>Qty</th>
                                    <th style={tdBorder}>UOM</th>
                                    <th style={tdBorder}>Vehicle No</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {mat.transactions.map((txn, tIdx) => (
                                    <tr key={tIdx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                      <td style={tdBorder}>{txn.date}</td>
                                      <td style={tdBorder}>{txn.dcNumber}</td>
                                      <td style={{ ...tdBorder, fontWeight: 'bold', color: '#16a34a' }}>{txn.qty}</td>
                                      <td style={tdBorder}>{txn.uom}</td>
                                      <td style={tdBorder}>{txn.vehicleNo}</td>
                                    </tr>
                                  ))}
                                  <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold', borderTop: '2px solid #94a3b8' }}>
                                    <td style={tdBorder} colSpan={2} align="right">TOTAL</td>
                                    <td style={{ ...tdBorder, color: '#16a34a' }}>{mat.total}</td>
                                    <td style={tdBorder} colSpan={2}>{mat.uom}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}

            {inwardGroupBy === 'Material' && (
              loading ? <p style={{ textAlign: 'center', color: '#94a3b8' }}>Loading Data...</p> :
              siteInwardData.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94a3b8' }}>કોઈ કાચા માલનો ડેટા મળ્યો નથી.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {siteInwardData.map(item => (
                    <div key={item.id} style={cardStyle}>
                      <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                        📦 {item.name}
                      </h3>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#16a34a', fontWeight: 'bold' }}>
                        <span>કુલ આવક (Inward):</span> 
                        <span>{item.totalInward} {item.uom}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

      </div>
    </div>
  );
};

// --- Styles ---
const inputWrapperStyle = {
  display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', gap: '6px'
};

const inputStyle = {
  width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '12px', color: '#334155', fontWeight: 'bold', appearance: 'none', cursor: 'pointer'
};

const activeTabStyle = {
  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 4px', backgroundColor: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', color: '#2563eb', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'all 0.2s', textAlign: 'center', whiteSpace: 'nowrap'
};

const inactiveTabStyle = {
  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 4px', backgroundColor: 'transparent', border: 'none', fontSize: '12px', fontWeight: 'bold', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center', whiteSpace: 'nowrap'
};

const cardStyle = {
  backgroundColor: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
};

const thStyle = {
  padding: '10px 12px', border: '1px solid #e2e8f0', textTransform: 'uppercase', fontWeight: 'bold'
};

const tdBorder = {
  padding: '10px 12px', border: '1px solid #e2e8f0'
};

export default AdminSiteReportPage;