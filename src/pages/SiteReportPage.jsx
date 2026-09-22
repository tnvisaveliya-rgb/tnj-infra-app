import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, MapPin, FileText, ChevronDown, ChevronUp, RefreshCcw, Globe, FileDown, ArrowLeft } from 'lucide-react';

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

  const [siteList, setSiteList] = useState([]);
  const [selectedSite, setSelectedSite] = useState('All');
  const [contractorList, setContractorList] = useState([]);
  const [selectedContractor, setSelectedContractor] = useState('All');

  const [loading, setLoading] = useState(false);
  const [reportRows, setReportRows] = useState([]);
  const [totalUpad, setTotalUpad] = useState(0);
  const [dynamicColumns, setDynamicColumns] = useState([]);

  // ૧. સાઇટ્સની યાદી ફેચ કરવી
  useEffect(() => {
    const fetchSites = async () => {
      try {
        const { data, error } = await supabase.from('sites').select('site_name');
        if (!error && data) {
          const unique = [...new Set(data.map(d => d.site_name).filter(Boolean))];
          setSiteList(unique);
        }
      } catch (err) {
        console.error('Error fetching sites:', err);
      }
    };
    fetchSites();
  }, []);

  // ૨. સાઇટ મુજબ કોન્ટ્રાક્ટર/લેબર લિસ્ટ લાવવું
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

  // ૩. ડેટા ફેચ કરવો (Daily Reports & Expenses / Upad)
  useEffect(() => {
    fetchSiteReportData();
  }, [selectedSite, selectedContractor, fromDate, toDate, isAllDates]);

  const fetchSiteReportData = async () => {
    setLoading(true);
    try {
      const groupedByDate = {};
      const uniqueColSet = new Set();

      let reportQuery = supabase.from('daily_reports').select('*');
      if (selectedSite && selectedSite !== 'All') {
        reportQuery = reportQuery.eq('site_name', selectedSite);
      }
      if (!isAllDates) {
        if (fromDate) reportQuery = reportQuery.gte('report_date', fromDate);
        if (toDate) reportQuery = reportQuery.lte('report_date', toDate);
      }

      const { data: reportData, error: rErr } = await reportQuery;

      if (!rErr && reportData && reportData.length > 0) {
        reportData.forEach(rep => {
          const dStr = rep.report_date;
          if (!dStr) return;

          // Contractor / Labor Details
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
                  const colSingle = 'Single Column Casting';
                  uniqueColSet.add(colSingle);
                  if (!groupedByDate[dStr]) groupedByDate[dStr] = { date: dStr };
                  groupedByDate[dStr][colSingle] = (groupedByDate[dStr][colSingle] || 0) + singleQ;
                }
                if (doubleQ > 0) {
                  const colDouble = 'Double Column Casting';
                  uniqueColSet.add(colDouble);
                  if (!groupedByDate[dStr]) groupedByDate[dStr] = { date: dStr };
                  groupedByDate[dStr][colDouble] = (groupedByDate[dStr][colDouble] || 0) + doubleQ;
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

          // Paling Work
          const palingRows = rep.paling_work || [];
          palingRows.forEach(pRow => {
            if (selectedContractor && selectedContractor !== 'All' && pRow.contractorName !== selectedContractor) return;
            const pQty = Number(pRow.qty || 0);
            if (pQty > 0) {
              const pCol = 'Paling Work';
              uniqueColSet.add(pCol);
              if (!groupedByDate[dStr]) groupedByDate[dStr] = { date: dStr };
              groupedByDate[dStr][pCol] = (groupedByDate[dStr][pCol] || 0) + pQty;
            }
          });
        });

        setDynamicColumns(Array.from(uniqueColSet));
      } else {
        setDynamicColumns([]);
      }

      // ઉપાડ (Upad / Expenses) labour wise
      const upadByDateMap = {};
      let totalUpadSum = 0;

      let upadQuery = supabase.from('plant_expenses').select('amount, expense_date, paid_to, expense_category, plant_name');
      upadQuery = upadQuery.ilike('expense_category', '%ઉપાડ%');

      if (selectedSite && selectedSite !== 'All') {
        upadQuery = upadQuery.eq('plant_name', selectedSite);
      } else if (siteList.length > 0) {
        upadQuery = upadQuery.in('plant_name', siteList);
      }

      if (selectedContractor && selectedContractor !== 'All') {
        upadQuery = upadQuery.eq('paid_to', selectedContractor);
      }
      if (!isAllDates) {
        if (fromDate) upadQuery = upadQuery.gte('expense_date', fromDate);
        if (toDate) upadQuery = upadQuery.lte('expense_date', toDate);
      }

      const { data: upadData } = await upadQuery;
      if (upadData && upadData.length > 0) {
        upadData.forEach(item => {
          const expDate = item.expense_date;
          const amt = Number(item.amount || 0);
          upadByDateMap[expDate] = (upadByDateMap[expDate] || 0) + amt;
          totalUpadSum += amt;
        });
      }

      setTotalUpad(totalUpadSum);

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
      console.error('Error fetching site report data:', err);
    } finally {
      setLoading(false);
    }
  };

  // PDF Print Function
  const handlePrintPDF = () => {
    const printWindow = window.open('', '', 'width=1000,height=700');
    const dateText = isAllDates ? 'All Dates (બધી તારીખ)' : `${formatDateToDDMMYYYY(fromDate)} થી ${formatDateToDDMMYYYY(toDate)}`;
    const siteText = selectedSite === 'All' ? 'બધી સાઇટ્સ (All Sites)' : selectedSite;
    const contractorText = selectedContractor === 'All' ? 'બધા કોન્ટ્રાક્ટર્સ' : selectedContractor;

    const tableHeaders = `
      <th>Date</th>
      ${dynamicColumns.map(col => `<th>${col}</th>`).join('')}
      <th style="color:red;">Upad</th>
    `;

    const tableRows = reportRows.length === 0 ? `
      <tr><td colspan="${dynamicColumns.length + 2}" style="text-align:center; padding:15px;">કોઈ ડેટા મળ્યો નથી.</td></tr>
    ` : reportRows.map(row => `
      <tr>
        <td>${formatDateToDDMMYYYY(row.date)}</td>
        ${dynamicColumns.map(col => `<td>${row[col] !== undefined ? row[col] : '-'}</td>`).join('')}
        <td style="color:red; font-weight:bold;">${row.dayUpad ? `₹ ${row.dayUpad.toLocaleString('en-IN')}` : '-'}</td>
      </tr>
    `).join('');

    const html = `
      <html>
        <head>
          <title>Site Daily Progress & Labour Billing Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #1e293b; }
            h2 { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 8px; margin-bottom: 15px; font-size: 16px; }
            .info-table { margin-bottom: 15px; border-collapse: collapse; width: 60%; font-size: 13px; }
            .info-table td { padding: 5px 8px; border: 1px solid #cbd5e1; }
            .info-table td:first-child { background-color: #f1f5f9; font-weight: bold; width: 140px; }
            .data-table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: center; }
            .data-table th, .data-table td { border: 1px solid #334155; padding: 6px; }
            .data-table th { background-color: #f8fafc; font-weight: bold; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <h2>T&J Infra - SITE DAILY REPORT & LABOUR BILLING</h2>
          <table class="info-table">
            <tr><td>Site Name</td><td>${siteText}</td></tr>
            <tr><td>Contractor / Labour</td><td>${contractorText}</td></tr>
            <tr><td>Date Period</td><td>${dateText}</td></tr>
          </table>
          <table class="data-table">
            <thead><tr>${tableHeaders}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
          <script>window.onload = function() { window.print(); setTimeout(() => window.close(), 500); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', fontFamily: 'Inter, sans-serif', paddingBottom: '40px', boxSizing: 'border-box' }}>
      
      {/* Top Header */}
      <div style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 10, maxWidth: '650px', margin: '0 auto', paddingTop: '5px' }}>
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
              Labour Billing & Upad Statement
            </span>
          </div>
        </div>

        {/* Date Filter Checkbox */}
        <div style={{ backgroundColor: '#fff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
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

        {/* Site & Contractor Dropdowns */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
          <div style={{ flex: 1 }}>
            <div style={inputWrapperStyle}>
              <MapPin size={13} color="#64748b" />
              <select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)} style={inputStyle}>
                <option value="All">બધી સાઇટ્સ (All Sites)</option>
                {siteList.map((s, i) => <option key={i} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={inputWrapperStyle}>
              <Globe size={13} color="#64748b" />
              <select value={selectedContractor} onChange={(e) => setSelectedContractor(e.target.value)} style={inputStyle}>
                <option value="All">બધા કોન્ટ્રાક્ટર્સ (All)</option>
                {contractorList.map((c, i) => <option key={i} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Report Table Card */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '13px', margin: 0, color: '#1e293b', textTransform: 'uppercase' }}>
            📊 Site Billing & Production Format
          </h3>
          <button onClick={handlePrintPDF} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
            <FileDown size={12} /> Export PDF / Print
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

              {/* Total Row */}
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

export default AdminSiteReportPage;