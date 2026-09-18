import React, { useState, useEffect } from 'react';
import { Home, ClipboardEdit, IndianRupee, UserCheck, Wallet, Clock, ChevronRight, FileText, Plus, X, Layers, Box, ArrowLeft,Bell  } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import SupervisorDashboard from './SupervisorDashboard';
import SiteAttendancePage from './SiteAttendancePage';


import SiteInwardPage from './SiteInwardPage';
import SiteOutwardPage from './SiteOutwardPage';
import SiteMaterialDamage from './SiteMaterialDamage';
import SiteIssueReturn from './SiteIssueReturn';
import SiteExpensePage from './siteexpensepage';
// ટોપ પરની ઇમ્પોર્ટ લાઇનને આ મુજબ કરો (તમારી ફાઇલના સાચા નામ મુજબ):
import SiteSupervisorFundRequest from './SiteSupervisorFundRequest'; 
// અથવા જો ફાઇલનું નામ સાચે જ 'SiteSupervisorFundRequest' હોય તો ઉપરનો કોડ બરાબર છે.

// આ રીતે onBack, siteList ની સાથે user પણ લેવડાવો
function ProductionReportView({ onBack, siteList = [], user }) {
  const [selectedSite, setSelectedSite] = useState(() => {
    return siteList && siteList.length > 0 ? siteList[0] : 'All';
  });
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

  const formatDateToDMY = (dateStr) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  // ૧. સાઇટ મુજબ કોન્ટ્રાક્ટર/લેબર લિસ્ટ લાવવું
  useEffect(() => {
    const fetchContractorsBySite = async () => {
      try {
        let query = supabase.from('contractors').select('*');
        if (selectedSite && selectedSite !== 'All') {
          query = query.or(`site_name.eq."${selectedSite}",company_name.eq."${selectedSite}"`);
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
        console.error('Error fetching contractors for site:', err);
      }
    };
    fetchContractorsBySite();
  }, [selectedSite]);

  // ૨. ડેટા ફેચ કરવો
  useEffect(() => {
    fetchReportData();
  }, [selectedSite, selectedLabour, fromDate, toDate]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const groupedByDate = {};
      const uniqueColSet = new Set();

      let reportQuery = supabase.from('daily_reports').select('*');
      if (selectedSite && selectedSite !== 'All') {
        reportQuery = reportQuery.eq('site_name', selectedSite);
      }
      if (fromDate) reportQuery = reportQuery.gte('report_date', fromDate);
      if (toDate) reportQuery = reportQuery.lte('report_date', toDate);

      const { data: reportData, error: rErr } = await reportQuery;

      if (!rErr && reportData && reportData.length > 0) {
        reportData.forEach(rep => {
          const dStr = rep.report_date;
          if (!dStr) return;

          // (૧) contractor_details માંથી materials અથવા workItems વાંચવા
          const contractorRows = rep.contractor_details || [];
          contractorRows.forEach(cRow => {
           // જૂનું: if (selectedLabour && cRow.contractorName !== selectedLabour) return;
// નવું આ કરો:
if (selectedLabour && selectedLabour !== 'All' && cRow.contractorName !== selectedLabour) return;

            // જો materials હોય તો
            const materialsUsed = cRow.materials || [];
            materialsUsed.forEach(mItem => {
              const matName = (mItem.material === 'Other' ? mItem.customMaterialName : mItem.material) || 'Material';
              const qty = Number(mItem.quantity || 0);
              if (matName && qty > 0) {
                uniqueColSet.add(matName);
                if (!groupedByDate[dStr]) groupedByDate[dStr] = { date: dStr };
                groupedByDate[dStr][matName] = (groupedByDate[dStr][matName] || 0) + qty;
              }
            });

            // જો workItems હોય તો
            const workItems = cRow.workItems || [];
            workItems.forEach(wItem => {
              const wName = wItem.workType || 'Work';
              const qty = Number(wItem.quantity || wItem.actualCementBags || wItem.runningFeet || 0);
              if (wName && qty > 0) {
                uniqueColSet.add(wName);
                if (!groupedByDate[dStr]) groupedByDate[dStr] = { date: dStr };
                groupedByDate[dStr][wName] = (groupedByDate[dStr][wName] || 0) + qty;
              }
            });
          });

          // (૨) paling_work માંથી ડેટા વાંચવો
          const palingRows = rep.paling_work || [];
          palingRows.forEach(pRow => {
         // જૂનું: if (selectedLabour && cRow.contractorName !== selectedLabour) return;
// નવું આ કરો:
if (selectedLabour && selectedLabour !== 'All' && cRow.contractorName !== selectedLabour) return;
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

      // ઉપાડ (Upad / Expenses) લાવવો
      const upadByDateMap = {};
      let totalUpadSum = 0;

      let upadQuery = supabase.from('plant_expenses').select('amount, expense_date');
if (selectedLabour && selectedLabour       !== 'All') {
        upadQuery = upadQuery.eq('paid_to', selectedLabour);
      }
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
      console.error('Error fetching daily reports billing:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '10px 8px', maxWidth: '750px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <button onClick={onBack} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}>
          ← Back
        </button>
        <button onClick={() => window.print()} style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: '800', fontSize: '12px' }}>
          🖨️ Export PDF / Print
        </button>
      </div>

      <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px' }}>
        <h2 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: '900', color: '#0f172a' }}>
          DAILY REPORT & LABOUR BILLING FORMAT
        </h2>

        {/* Filters */}
        <div className="no-print" style={{ display: 'flex', gap: '8px', marginBottom: '12px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
<select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)} style={{ flex: 1, padding: '6px', fontSize: '11px', fontWeight: '700', borderRadius: '6px' }}>
  {/* જો એડમિન હોય તો જ 'All Sites' ઓપ્શન દેખાશે */}
  {((user && user.email === 'infra.tnj@gmail.com') || localStorage.getItem('userEmail') === 'infra.tnj@gmail.com') && (
    <option value="All">All Sites</option>
  )}
  {siteList.map((s, i) => <option key={i} value={s}>{s}</option>)}
</select>
          <select value={selectedLabour} onChange={(e) => setSelectedLabour(e.target.value)} style={{ flex: 1, padding: '6px', fontSize: '11px', fontWeight: '700', borderRadius: '6px' }}>
            <option value="All">All Labours / Contractors</option>
            {labourList.map((l, i) => <option key={i} value={l}>{l}</option>)}
          </select>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ padding: '5px', fontSize: '11px', borderRadius: '6px' }} />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ padding: '5px', fontSize: '11px', borderRadius: '6px' }} />
        </div>

        {/* Table Format */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9' }}>
                <th style={{ padding: '8px 4px', border: '1px solid #cbd5e1', textAlign: 'left' }}>Date</th>
                {dynamicColumns.map((col, idx) => (
                  <th key={idx} style={{ padding: '8px 4px', border: '1px solid #cbd5e1', textTransform: 'capitalize' }}>{col}</th>
                ))}
                <th style={{ padding: '8px 4px', border: '1px solid #cbd5e1', color: '#dc2626', backgroundColor: '#fef2f2' }}>Upad</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={dynamicColumns.length + 2} style={{ padding: '15px' }}>Loading...</td></tr>
              ) : reportRows.length === 0 ? (
                <tr><td colSpan={dynamicColumns.length + 2} style={{ padding: '15px', color: '#94a3b8' }}>કોઈ ડેટા મળ્યો નથી.</td></tr>
              ) : (
                reportRows.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: '600' }}>{formatDateToDMY(row.date)}</td>
                    {dynamicColumns.map((col, cIdx) => (
                      <td key={cIdx} style={{ padding: '6px', border: '1px solid #cbd5e1' }}>{row[col] !== undefined ? row[col] : '-'}</td>
                    ))}
                    <td style={{ padding: '6px', border: '1px solid #cbd5e1', color: '#dc2626', fontWeight: '700' }}>{row.dayUpad ? `₹ ${row.dayUpad.toLocaleString('en-IN')}` : '-'}</td>
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
                  <td style={{ padding: '6px', border: '1px solid #cbd5e1', color: '#dc2626' }}>₹ {totalUpad.toLocaleString('en-IN')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
// ==========================================
// 🏢 MAIN DASHBOARD COMPONENT
// ==========================================
export default function SiteEmployeeDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [workingBalance, setWorkingBalance] = useState(0);
  const [todayExpense, setTodayExpense] = useState(0);
  const [rawMaterialsStock, setRawMaterialsStock] = useState([]);
  const [plantList, setPlantList] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState('All');
  const [notifications, setNotifications] = useState([]);
const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isExpensePopupOpen, setIsExpensePopupOpen] = useState(false);
  const [expenseInitialTab, setExpenseInitialTab] = useState('siteexpense');
  const [incomeInitialTab, setIncomeInitialTab] = useState('sitesupervisorfundrequest');

const [attendanceInfo, setAttendanceInfo] = useState({
    status: 'Not Punched',
    time: '',
    badgeText: 'Pending',
    badgeBg: '#fee2e2', 
    badgeColor: '#dc2626' 
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
    const fetchSiteList = async () => {
      try {
        const userEmail = (user?.email || '').trim().toLowerCase();
        const userId = user?.id;

        // ૧. જો એડમિન હોય તો બધી જ સાઇટ્સ દેખાશે
        if (userEmail === 'infra.tnj@gmail.com') {
          const { data, error } = await supabase.from('sites').select('site_name');
          if (!error && data) {
            const unique = [...new Set(data.map(d => d.site_name).filter(Boolean))];
            setPlantList(unique);
            if (unique.length > 0 && selectedPlant === 'All') {
              setSelectedPlant(unique[0]);
            }
          }
          return;
        }

        // ૨. બાકીના સુપરવાઇઝર માટે માત્ર અસાઇન કરેલી સાઇટ્સ જ આવશે
        const { data: permData, error: permError } = await supabase
          .from('user_permissions')
          .select('assigned_sites')
          .eq('user_id', userId)
          .single();

        if (permError || !permData || !permData.assigned_sites || permData.assigned_sites.length === 0) {
          setPlantList([]);
          return;
        }

        const assignedSiteNames = permData.assigned_sites;
        setPlantList(assignedSiteNames);
        if (assignedSiteNames.length > 0 && selectedPlant === 'All') {
          setSelectedPlant(assignedSiteNames[0]);
        }

      } catch (err) {
        console.error('Error fetching assigned site list:', err);
        setPlantList([]);
      }
    };

    if (user) {
      fetchSiteList();
    }
  }, [user]);

const fetchNotifications = async () => {
  try {
    const list = [];

    // ટેબલમાંથી જરૂરી કોલમ્સ ફેચ કરવી
    let fundQuery = supabase
      .from('plant_fund_transfers')
      .select('id, plant_name, purpose, requested_amount, approved_amount, status, approved_by, received_by, admin_remarks');

    if (selectedPlant && selectedPlant !== 'All') {
      fundQuery = fundQuery.eq('plant_name', selectedPlant.trim());
    }

    // PENDING અને SENT બંને સ્ટેટસ લાવવા
    fundQuery = fundQuery
      .in('status', ['PENDING', 'SENT', 'pending', 'sent'])
      .order('id', { ascending: false })
      .limit(10);

    const { data: fundReq, error: fundErr } = await fundQuery;

    if (fundErr) {
      console.error('Supabase Query Error:', fundErr.message);
      return;
    }

    if (fundReq && fundReq.length > 0) {
      fundReq.forEach(item => {
        const st = (item.status || '').toUpperCase();
        const amt = Number(item.approved_amount || item.requested_amount || 0);

        // એડમિને મોકલી દીધા હોય (SENT) પણ સુપરવાઇઝરે હજુ સ્વીકારવાના બાકી હોય
        if (st === 'SENT') {
          list.push({
            id: `fund-${item.id}`,
            title: `🎉 Admin Approved: ₹${amt.toLocaleString('en-IN')}`,
            subText: `${item.purpose || 'ફંડ'} - સ્વીકારો (Receive)`,
            tab: 'sitesupervisiorfundrequest',
            time: 'Payment Sent',
            color: '#16a34a' // Green
          });
        } 
        // સુપરવાઇઝરે રિક્વેસ્ટ મોકલેલી હોય પણ Admin એ હજુ અપ્રૂવ ન કરી હોય
        else if (st === 'PENDING') {
          list.push({
            id: `fund-${item.id}`,
            title: `⏳ Pending Approval: ₹${amt.toLocaleString('en-IN')}`,
            subText: item.purpose || 'ફંડ રિક્વેસ્ટ',
            tab: 'sitesupervisiorfundrequest',
            time: 'Waiting Admin',
            color: '#ea580c' // Orange
          });
        }
      });
    }

    setNotifications(list);
  } catch (err) {
    console.error('Error fetching notifications:', err);
  }
};
useEffect(() => {
  fetchNotifications();
}, [user, selectedPlant]);
const fetchDashboardData = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const userEmail = (user?.email || '').toLowerCase().trim();

      if (!userEmail) return;

      let totalIncome = 0;
      let totalExpense = 0;
      let todayExpSum = 0;

      // =========================================================
      // ૧. યુઝરને મળેલી તમામ ફંડ આવક (USER ID SPECIFIC)
      // =========================================================
      const { data: fundData, error: fundErr } = await supabase
        .from('plant_fund_transfers')
        .select('*');

      if (!fundErr && fundData) {
        fundData.forEach(item => {
          const status = (item.status || '').toUpperCase();
          const recBy = (item.received_by || '').toLowerCase().trim();

          // માત્ર આ યુઝરને મળેલ અને સ્વીકારેલ (RECEIVED) ફંડ
          if (status === 'RECEIVED' && recBy === userEmail) {
            const amt = parseFloat(item.approved_amount || item.requested_amount || 0);
            totalIncome += amt;
          }
        });
      }

      // =========================================================
      // ૨. યુઝરે કરેલા પ્લાન્ટ ખર્ચા (PLANT EXPENSES BY USER)
      // =========================================================
      const { data: plantExpData, error: plantExpErr } = await supabase
        .from('plant_expenses')
        .select('*');

      if (!plantExpErr && plantExpData) {
        plantExpData.forEach(item => {
          const subBy = (item.submitted_by || item.created_by || '').toLowerCase().trim();
          
          if (subBy === userEmail) {
            const amt = parseFloat(item.amount || 0);
            const itemDate = item.expense_date || (item.created_at ? item.created_at.split('T')[0] : '');

            totalExpense += amt;
            if (itemDate === todayStr) {
              todayExpSum += amt;
            }
          }
        });
      }

      // =========================================================
      // ૩. સાઇટ ટ્રાન્ઝેક્શન્સ (SITE TRANSACTIONS BY USER)
      // =========================================================
      const { data: siteTxData, error: siteTxErr } = await supabase
        .from('site_transactions')
        .select('*');

      if (!siteTxErr && siteTxData) {
        siteTxData.forEach(item => {
          const creator = (item.created_by || item.user_id || item.email || '').toLowerCase().trim();

          if (creator === userEmail) {
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
              totalExpense += amt;
              if (itemDate === todayStr) {
                todayExpSum += amt;
              }
            }
          }
        });
      }

      // 🌟 લાઈવ શિલક (Live Cash in Hand with logged-in user)
      setWorkingBalance(totalIncome - totalExpense);
      setTodayExpense(todayExpSum);

      // (ઇન્વેન્ટરી અને એટેન્ડન્સનો આગળનો કોડ એમ જ રહેશે...)
      // ૪. RAW MATERIAL, STORE & ASSETS STOCK
let matQuery = supabase.from('site_material_stock_ledger').select('*'); // 👈 ટેબલનું નામ બદલ્યું
    if (selectedPlant && selectedPlant !== 'All') {
      matQuery = matQuery.eq('site_name', selectedPlant); // 👈 plant_name ના બદલે site_name
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
            n.includes('crane') ||
            n.includes('batching') ||
            n.includes('silow') ||
            n.includes('asset')
          );
        };
        const checkIsFinished = (name) => {
          const n = name.toLowerCase();
          return (
            n.includes('panel') ||
            n.includes('column') ||
            n.includes('drain') ||
            n.includes('beam') ||
            n.includes('wall')
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
              
           } else if (checkIsFinished(rawName)) {
              determinedCategory = 'finished'; // 👈 Finished goods mate
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
        .select('*')
        .order('created_at', { ascending: false }); // 👈 માત્ર આ એક નવી લાઈન ઉમેરો!

      if (!attError && attData && attData.length > 0) {
        // હવે નવો ડેટા (OUT) પહેલા આવશે, એટલે find() સાચો જ પંચ પકડશે
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
const finishedItems = rawMaterialsStock.filter(i => i.category === 'finished'); // 👈 Add this
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
                {user?.email ? user.email.charAt(0).toUpperCase() : 'S'}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: '700' }}>Site Portal</p>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                  {user?.email ? user.email.split('@')[0] : 'Site Employee'}
                </h2>
              </div>
            </div>
           {/* 🔔 Notification Bell Icon & Dropdown */}
<div style={{ position: 'relative' }}>
  <div 
    onClick={() => setIsNotifOpen(!isNotifOpen)}
    style={{ 
      width: '38px', 
      height: '38px', 
      borderRadius: '10px', 
      backgroundColor: isNotifOpen ? '#eff6ff' : '#f8fafc', 
      border: '1px solid #cbd5e1', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      cursor: 'pointer',
      position: 'relative'
    }}
  >
    <Bell size={18} color={notifications.length > 0 ? '#2563eb' : '#64748b'} />
    
    {/* નોટિફિકેશન કાઉન્ટ બેજ */}
    {notifications.length > 0 && (
      <span style={{
        position: 'absolute',
        top: '-4px',
        right: '-4px',
        backgroundColor: '#dc2626',
        color: '#ffffff',
        fontSize: '9px',
        fontWeight: '900',
        borderRadius: '50%',
        width: '18px',
        height: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid #ffffff'
      }}>
        {notifications.length}
      </span>
    )}
  </div>

  {/* 📋 Notification Dropdown List */}
  {isNotifOpen && (
    <div style={{
      position: 'absolute',
      right: 0,
      top: '46px',
      width: '280px',
      backgroundColor: '#ffffff',
      borderRadius: '14px',
      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
      border: '1px solid #e2e8f0',
      padding: '10px',
      zIndex: 1000
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingBottom: '8px', 
        borderBottom: '1px solid #f1f5f9',
        marginBottom: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Bell size={14} color="#2563eb" />
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a' }}>
            NOTIFICATIONS ({notifications.length})
          </span>
        </div>
        <button 
          onClick={() => setIsNotifOpen(false)}
          style={{ 
            background: '#f1f5f9', 
            border: 'none', 
            borderRadius: '50%', 
            width: '22px', 
            height: '22px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: 'pointer', 
            color: '#64748b' 
          }}
        >
          <X size={13} strokeWidth={2.5} />
        </button>
      </div>

      {/* List Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>
            કોઈ નવી રિક્વેસ્ટ કે નોટિફિકેશન નથી.
          </div>
        ) : (
          notifications.map((notif) => (
            <div 
              key={notif.id}
              onClick={() => {
                setActiveTab(notif.tab);
                setIsNotifOpen(false);
              }}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid #f1f5f9',
                transition: 'background-color 0.2s'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: '800', color: '#1e293b' }}>
                  {notif.title}
                </p>
                {notif.subText && (
                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '500' }}>
                    {notif.subText}
                  </span>
                )}
                <span style={{ fontSize: '9px', color: notif.color || '#dc2626', fontWeight: '700', marginTop: '2px' }}>
                  ● {notif.time}
                </span>
              </div>
              <ChevronRight size={14} color="#94a3b8" />
            </div>
          ))
        )}
      </div>
    </div>
  )}
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
              style={{ backgroundColor: '#ffffff', padding: '10px 10px', borderRadius: '14px', border: `1px solid ${attendanceInfo.status === 'Not Punched' ? '#fecaca' : '#bbf7d0'}`, boxShadow: '0 2px 6px rgba(0,0,0,0.02)', cursor: 'pointer', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              {/* 🌟 બેકગ્રાઉન્ડમાં વોટરમાર્ક આઇકોન (સાઈઝ નાની કરી) */}
              <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.04 }}>
                <Clock size={70} /> 
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px', position: 'relative', zIndex: 1 }}>
                <div style={{ backgroundColor: attendanceInfo.status === 'Not Punched' ? '#fef2f2' : '#f0fdf4', color: attendanceInfo.status === 'Not Punched' ? '#dc2626' : '#16a34a', padding: '5px', borderRadius: '8px' }}>
                  <Clock size={14} />
                </div>
                <span style={{ fontSize: '9px', backgroundColor: attendanceInfo.badgeBg, color: attendanceInfo.badgeColor, padding: '2px 6px', borderRadius: '6px', fontWeight: '800', letterSpacing: '0.2px', border: `1px solid ${attendanceInfo.badgeColor}30` }}>
                  {attendanceInfo.badgeText}
                </span>
              </div>

              <div style={{ position: 'relative', zIndex: 1 }}>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Attendance</h4>
                
                <p style={{ margin: '0', fontSize: '13px', fontWeight: '900', color: attendanceInfo.status === 'Not Punched' ? '#dc2626' : '#0f172a' }}>
                  {attendanceInfo.status}
                </p>

                {/* 🌟 અહીં સમય દેખાશે (પેડિંગ અને માર્જિન ઓછું કર્યું) */}
                {attendanceInfo.time ? (
                  <div style={{ marginTop: '4px', fontSize: '10px', fontWeight: '800', color: attendanceInfo.status === 'Punched Out' ? '#475569' : '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: attendanceInfo.status === 'Punched Out' ? '#f1f5f9' : '#dcfce7', padding: '3px 6px', borderRadius: '6px' }}>
                    🕒 {attendanceInfo.time}
                  </div>
                ) : (
                  <div style={{ marginTop: '4px', fontSize: '10px', fontWeight: '700', color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#fef2f2', padding: '3px 6px', borderRadius: '6px' }}>
                    ⚠️ પંચિંગ બાકી છે
                  </div>
                )}
              </div>
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
      <span style={{ fontSize: '14px' }}>🏗️</span>
      <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>Select Site:</span> {/* 👈 Plant ના બદલે Site */}
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
             <option value="All">All Sites (બધા સાઇટ)</option>
      {plantList.map((siteName, idx) => (
        <option key={idx} value={siteName}>{siteName}</option>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', minWidth: '0' }}>
  {finishedItems.map((item, idx) => (
    <div key={idx} style={{ 
      backgroundColor: '#f0fdf4', 
      border: '1px solid #bbf7d0', 
      borderRadius: '10px', 
      padding: '6px 8px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      minWidth: '0', // 👈 આ લાઈન ઉમેરવી ખૂબ જ જરૂરી છે
      overflow: 'hidden' // 👈 આનાથી બહાર નહીં જાય
    }}>
      <span style={{ fontSize: '11px', fontWeight: '700', color: '#166534', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, marginRight: '4px' }}>
        {item.name}
      </span>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <span style={{ fontSize: '12px', fontWeight: '900', color: item.stock <= 0 ? '#dc2626' : '#15803d' }}>
          {item.stock.toLocaleString('en-IN')}
        </span>
        <span style={{ fontSize: '9px', fontWeight: '700', color: '#16a34a', marginLeft: '3px' }}>
          {item.unit}
        </span>
      </div>
    </div>
  ))}
</div>

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

      {activeTab === 'dpr' && <SupervisorDashboard />}
      {activeTab === 'attendance' && <SiteAttendancePage />}
     {/* આ લાઈનને બદલો */}
{activeTab === 'sitesupervisorfundrequest' && <SiteSupervisorFundRequest defaultType={incomeInitialTab} />}
      {activeTab === 'inward' && <SiteInwardPage />}
      {activeTab === 'outward' && <SiteOutwardPage />}
      {activeTab === 'site_return' && <SiteMaterialDamage />}
      {activeTab === 'issue_return' && <SiteIssueReturn />}
     {activeTab === 'siteexpense' && <SiteExpensePage user={user} defaultType={expenseInitialTab} />}
      {activeTab === 'production_report' && (
  <ProductionReportView
    onBack={() => setActiveTab('home')}
    siteList={plantList}
    user={user}
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
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#15803d' }}>1. SITE INWARD</span>
                <span style={{ fontSize: '9px', color: '#166534', fontWeight: '600' }}>Receive raw materials or stock items</span>
              </div>
            </div>

            <div onClick={() => { setActiveTab('outward'); setIsPopupOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', cursor: 'pointer' }}>
              <span style={{ fontSize: '18px', backgroundColor: '#ffedd5', padding: '6px', borderRadius: '10px' }}>📤</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#c2410c' }}>2. SITE OUTWARD</span>
                <span style={{ fontSize: '9px', color: '#9a3412', fontWeight: '600' }}>Dispatch finished goods to sites</span>
              </div>
            </div>

            <div onClick={() => { setActiveTab('issue_return'); setIsPopupOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', cursor: 'pointer' }}>
              <span style={{ fontSize: '18px', backgroundColor: '#dbeafe', padding: '6px', borderRadius: '10px' }}>🛠️</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#1d4ed8' }}>3. SITE ISSUE & RETURN</span>
                <span style={{ fontSize: '9px', color: '#1e40af', fontWeight: '600' }}>Manage tools, items issue and returns</span>
              </div>
            </div>
<div onClick={() => { setActiveTab('site_return'); setIsPopupOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', cursor: 'pointer' }}>
              <span style={{ fontSize: '18px', backgroundColor: '#fee2e2', padding: '6px', borderRadius: '10px' }}>🛡️</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#dc2626' }}>4. SITE MATERIAL DAMAGE</span>
                <span style={{ fontSize: '10px', color: '#991b1b', fontWeight: '600' }}>Report broken or damaged items</span>
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
                setActiveTab('sitesupervisorfundrequest');
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
                setActiveTab('siteexpense');
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
            color: (isExpensePopupOpen || activeTab === 'siteexpense' || activeTab === 'expense') ? '#2563eb' : '#64748b', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            flex: 1 
          }}
        >
          <div 
            style={{
              backgroundColor: (isExpensePopupOpen || activeTab === 'siteexpense' || activeTab === 'expense') ? '#dbeafe' : 'transparent',
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
          <span style={{ fontSize: '9px', marginTop: '3px', fontWeight: (isExpensePopupOpen || activeTab === 'siteexpense' || activeTab === 'expense') ? '800' : '600' }}>Expense</span>
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