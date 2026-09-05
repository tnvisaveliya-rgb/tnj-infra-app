import React, { useState, useEffect } from 'react';
import { Home, ClipboardEdit, IndianRupee, UserCheck, Wallet, Clock, ChevronRight, FileText, Plus, X , Layers } from 'lucide-react';
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

export default function PlantEmployeeDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [workingBalance, setWorkingBalance] = useState(0);
  const [todayExpense, setTodayExpense] = useState(0);
  const [rawMaterialsStock, setRawMaterialsStock] = useState([]);
  // 🏭 Plant Filter States
const [plantList, setPlantList] = useState([]);
const [selectedPlant, setSelectedPlant] = useState('All'); // અથવા ડિફોલ્ટ પ્લાન્ટનું નામ
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isExpensePopupOpen, setIsExpensePopupOpen] = useState(false);
const [expenseInitialTab, setExpenseInitialTab] = useState('plantexpense'); // 'income' or 'expense'
  const [attendanceInfo, setAttendanceInfo] = useState({
    status: 'Punched In',
    time: '09:30 AM',
    badgeText: 'On Time',
    badgeBg: '#f0fdf4',
    badgeColor: '#15803d'
  });

  const [latestDpr] = useState({
    date: '22 Aug 2026',
    siteName: 'Plant - Main Unit',
    status: 'Submitted',
    workersCount: 14,
    notes: 'Production tracking completed.'
  });
// 2. બીજો useEffect (URL માંથી approve_id પકડવા માટે)
 // 2. બીજો useEffect (URL માંથી approve_id અને type પકડવા માટે)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const approveId = params.get('approve_id');
    const type = params.get('type'); // 👈 URL માંથી type પકડશે (dpr કે inward)
    
    if (approveId) {
      if (type === 'dpr') {
        localStorage.setItem('pending_dpr_approve_id', approveId);
        setActiveTab('dpr'); // 👈 જો type=dpr હોય તો DPR ટેબ જ ખોલશે
      } else {
        localStorage.setItem('pending_approve_id', approveId);
        setActiveTab('inward'); // 👈 બાકી ઇનવર્ડ ટેબ ખોલશે
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
useEffect(() => {
  fetchDashboardData();
}, [user, selectedPlant]);
// 🏭 ડેટાબેઝમાંથી લાઈવ પ્લાન્ટના સાચા નામ ફેચ કરવા માટે
useEffect(() => {
  const fetchPlantList = async () => {
    try {
      const { data, error } = await supabase
        .from('material_stock_ledger')
        .select('plant_name');

      if (!error && data) {
        const unique = [...new Set(data.map(d => d.plant_name).filter(Boolean))];
        setPlantList(unique);
        // જો લિસ્ટમાં પ્લાન્ટ મળે તો પહેલો પ્લાન્ટ ઓટોમેટિક સિલેક્ટ કરી લેશે
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

    // ==========================================
    // ૧. 🏢 SITE TRANSACTIONS (created_by ચેક કરશે)
    // ==========================================
    const { data: siteTxData, error: siteTxErr } = await supabase
      .from('site_transactions')
      .select('*');

    if (!siteTxErr && siteTxData) {
      // લૉગિન યુઝરની એન્ટ્રી ફિલ્ટર (created_by)
      const userSiteTx = siteTxData.filter(item => 
        item.created_by === userEmail ||
        item.user_id === userEmail ||
        item.email === userEmail
      );

      userSiteTx.forEach(item => {
        const amt = parseFloat(item.amount || item.net_amount || item.total_amount || 0);
        const itemDate = item.date || item.transaction_date || (item.created_at ? item.created_at.split('T')[0] : '');
        const typeStr = (item.type || item.transaction_type || '').toLowerCase();

        // 💰 સાઈટ કે પ્લાન્ટ માટે ઓફિસથી મળેલી રકમ (Income)
        if (
          typeStr.includes('income') || 
          typeStr.includes('credit') || 
          typeStr.includes('fund') || 
          typeStr.includes('receive') || 
          typeStr.includes('deposit')
        ) {
          totalIncome += amt;
        } 
        // 💸 સાઈટ પર કરેલો ખર્ચ (Site Expense)
        else if (
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

    // ==========================================
    // ૨. 🏭 PLANT EXPENSES (submitted_by ચેક કરશે)
    // ==========================================
    const { data: plantExpData, error: plantExpErr } = await supabase
      .from('plant_expenses')
      .select('*');

    if (!plantExpErr && plantExpData) {
      // લૉગિન યુઝરની એન્ટ્રી ફિલ્ટર (submitted_by)
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

    // ==========================================
    // ૩. 📊 WORKING BALANCE ગણતરી
    // ==========================================
    // Balance = Total Income - (Plant Expense + Site Expense)
    const grandTotalExpense = totalPlantExpense + totalSiteExpense;
    setWorkingBalance(totalIncome - grandTotalExpense);
    setTodayExpense(todayExpSum);

    // ==========================================
    // ૪. 📦 RAW MATERIAL STOCK (પ્લાન્ટ સિલેક્શન મુજબ)
    // ==========================================
    let matQuery = supabase.from('material_stock_ledger').select('*');
    if (selectedPlant && selectedPlant !== 'All') {
      matQuery = matQuery.eq('plant_name', selectedPlant);
    }
    const { data: matLedger, error: matErr } = await matQuery;

    if (!matErr && matLedger) {
      const stockMap = {};

      matLedger.forEach(item => {
        const rawName = (item.material_name || '').trim();
        if (!rawName) return;

        const key = rawName.toLowerCase();
        const qty = parseFloat(item.qty || item.quantity || 0);
        const type = (item.transaction_type || '').toUpperCase().trim();
        const unit = item.unit || 'Nos';

        if (!stockMap[key]) {
          stockMap[key] = { name: rawName, stock: 0, unit };
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

    // ==========================================
    // ૫. 🕒 ATTENDANCE FETCH
    // ==========================================
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
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '100px', backgroundColor: '#f8fafc', position: 'relative' }}>
      
      {/* ================= ૧. HOME TAB ================= */}
      {activeTab === 'home' && (
        <div style={{ maxWidth: '480px', margin: '0 auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
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

          {/* 🏭 PLANT SELECTOR DROPDOWN BAR */}
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
      <option key={idx} value={plantName}>
        {plantName}
      </option>
    ))}
  </select>
</div>
{/* 📦 PREMIUM LIVE RAW MATERIAL STOCK CARD */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '16px 18px',
            border: '1.5px solid #dbeafe',
            boxShadow: '0 4px 16px rgba(37, 99, 235, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px dashed #bfdbfe', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ 
                  backgroundColor: '#dbeafe', 
                  color: '#1d4ed8', 
                  width: '38px', 
                  height: '38px', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <Layers size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '900', color: '#1e3a8a', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                    LIVE RAW MATERIAL STOCK
                  </h4>
                  <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: '600' }}>Real-time inventory level</span>
                </div>
              </div>
              <span style={{ 
                fontSize: '11px', 
                fontWeight: '800', 
                backgroundColor: '#dcfce7', 
                color: '#15803d', 
                padding: '4px 10px', 
                borderRadius: '20px', 
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a' }}></span>
                Live
              </span>
            </div>
    

            {/* List / Modern Row View */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rawMaterialsStock.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>
                  No Raw Material Stock Available
                </div>
              ) : (
                rawMaterialsStock.map((item, index) => {
                  const isLow = item.stock <= 0;
                  const nameLower = (item.name || '').toLowerCase();

                  // સ્માર્ટ કલરિંગ: મટીરિયલ મુજબ સોફ્ટ કલર્સ
                  let badgeBg = '#eff6ff';
                  let badgeColor = '#1d4ed8';
                  let iconEmoji = '🧱';

                  if (nameLower.includes('cement')) {
                    badgeBg = '#f1f5f9';
                    badgeColor = '#334155';
                    iconEmoji = '🏢';
                  } else if (nameLower.includes('steel') || nameLower.includes('tmt') || nameLower.includes('wire')) {
                    badgeBg = '#eff6ff';
                    badgeColor = '#2563eb';
                    iconEmoji = '🔩';
                  } else if (nameLower.includes('sand') || nameLower.includes('dust')) {
                    badgeBg = '#fffbeb';
                    badgeColor = '#b45309';
                    iconEmoji = '⏳';
                  } else if (nameLower.includes('mm') || nameLower.includes('aggregate')) {
                    badgeBg = '#f5f3ff';
                    badgeColor = '#7c3aed';
                    iconEmoji = '🪨';
                  }

                  return (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '14px',
                        border: '1px solid #e2e8f0',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* Left: Material Name + Emoji Icon */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '10px',
                          backgroundColor: badgeBg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '15px'
                        }}>
                          {iconEmoji}
                        </div>
                        <div>
                          <h5 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                            {item.name}
                          </h5>
                          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>
                            Item Code: #{index + 101}
                          </span>
                        </div>
                      </div>

                      {/* Right: Quantity + UOM Pill */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{
                            fontSize: '15px',
                            fontWeight: '900',
                            color: isLow ? '#dc2626' : '#0f172a',
                            letterSpacing: '-0.3px',
                            display: 'block'
                          }}>
                            {item.stock.toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* UOM Badge */}
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          backgroundColor: isLow ? '#fee2e2' : '#dbeafe',
                          color: isLow ? '#b91c1c' : '#1d4ed8',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          minWidth: '38px',
                          textAlign: 'center',
                          textTransform: 'uppercase'
                        }}>
                          {item.unit}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '12px 14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '8px', borderRadius: '10px' }}>
                  <FileText size={16} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{latestDpr.siteName}</h4>
                  <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}>{latestDpr.date}</p>
                </div>
              </div>
              <span style={{ fontSize: '10px', backgroundColor: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '6px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Clock size={10} /> {latestDpr.status}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
              <span>Workers: <strong style={{ color: '#0f172a' }}>{latestDpr.workersCount}</strong></span>
              <button onClick={() => setActiveTab('dpr')} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: '800', cursor: 'pointer', padding: 0, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                View Report <ChevronRight size={12} />
              </button>
            </div>
          </div>

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
{/* 💰 Today Expense Card -> Opens Expense/Income Popup */}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div onClick={() => setActiveTab('dpr')} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '8px', borderRadius: '10px' }}><ClipboardEdit size={16} /></div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>Add / Edit DPR</h4>
                  <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}>Submit daily plant work progress report</p>
                </div>
              </div>
              <ChevronRight size={16} color="#94a3b8" />
            </div>

          {/* 💰 Expense / Transaction Row -> Opens Expense/Income Popup */}
            <div onClick={() => setIsExpensePopupOpen(true)} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ backgroundColor: '#fff7ed', color: '#ea580c', padding: '8px', borderRadius: '10px' }}><IndianRupee size={16} /></div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>Expense / Transaction</h4>
                  <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}>Manage plant expenses and cash flow</p>
                </div>
              </div>
              <ChevronRight size={16} color="#94a3b8" />
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
      
 {/* ================= BOTTOM-UP SLIDE POPUP WITH VISIBLE BOTTOM BAR ================= */}
      {isPopupOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)',
          zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          paddingBottom: '95px', // 👈 જેથી નીચેનું નેવિગેશન બાર દેખાતું રહે
          animation: 'fadeIn 0.2s ease-out'
        }} onClick={() => setIsPopupOpen(false)}>
          
          <div style={{
            width: '92%', maxWidth: '400px', backgroundColor: '#ffffff',
            borderRadius: '26px', padding: '18px',
            boxShadow: '0 -10px 30px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0',
            display: 'flex', flexDirection: 'column', gap: '10px',
            transformOrigin: 'bottom center',
            animation: 'slideUpFromBottom 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }} onClick={(e) => e.stopPropagation()}>
           
            
            {/* Header with "SELECT OPERATION" and Close Button */}
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

            {/* Option 1: Plant Inward */}
            <div onClick={() => { setActiveTab('inward'); setIsPopupOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', cursor: 'pointer' }}>
              <span style={{ fontSize: '18px', backgroundColor: '#dcfce7', padding: '6px', borderRadius: '10px' }}>📥</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#15803d' }}>1. PLANT INWARD</span>
                <span style={{ fontSize: '9px', color: '#166534', fontWeight: '600' }}>Receive raw materials or stock items</span>
              </div>
            </div>

            {/* Option 2: Plant Outward */}
            <div onClick={() => { setActiveTab('outward'); setIsPopupOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', cursor: 'pointer' }}>
              <span style={{ fontSize: '18px', backgroundColor: '#ffedd5', padding: '6px', borderRadius: '10px' }}>📤</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#c2410c' }}>2. PLANT OUTWARD</span>
                <span style={{ fontSize: '9px', color: '#9a3412', fontWeight: '600' }}>Dispatch finished goods to sites</span>
              </div>
            </div>

            {/* Option 3: Issue & Return */}
            <div onClick={() => { setActiveTab('issue_return'); setIsPopupOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', cursor: 'pointer' }}>
              <span style={{ fontSize: '18px', backgroundColor: '#dbeafe', padding: '6px', borderRadius: '10px' }}>🛠️</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#1d4ed8' }}>3. ISSUE & RETURN</span>
                <span style={{ fontSize: '9px', color: '#1e40af', fontWeight: '600' }}>Manage tools, items issue and returns</span>
              </div>
            </div>
            {/* Option 4: Site Return (Inward) */}
            <div onClick={() => { setActiveTab('site_return'); setIsPopupOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', backgroundColor: '#f3e8ff', border: '1px solid #d8b4fe', cursor: 'pointer', }}>
              <span style={{ fontSize: '18px', backgroundColor: '#e9d5ff', padding: '6px', borderRadius: '10px' }}>🔄</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#7e22ce' }}>4. SITE MATERIAL RETURN</span>
                <span style={{ fontSize: '10px', color: '#6b21a8', fontWeight: '600' }}>Receive damaged/extra goods from site</span>
              </div>
            </div>



          </div>
        </div>
      )}
       {/* ================= EXPENSE & INCOME POPUP ================= */}
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
              display: 'flex', flexDirection: 'column', gap: '10px',
              animation: 'slideUpFromBottom 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
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

            {/* Option 1: INCOME / FUND RECEIVE */}
            <div 
              onClick={() => {
                setExpenseInitialTab('income');
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

            {/* Option 2: EXPENSE ENTRY */}
            <div 
              onClick={() => {
                setExpenseInitialTab('plantexpenseexpense');
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
      {/* ================= UNIQUE CENTER-NOTCHED BLUE NAVIGATION BAR ================= */}
      <div style={{ 
        position: 'fixed', bottom: '10px', left: '50%', transform: 'translateX(-50%)', 
        width: '92%', maxWidth: '420px', 
        height: '64px',
        backgroundColor: '#ffffff', 
        display: 'flex', justifyContent: 'space-around', alignItems: 'center', 
        borderRadius: '35px', 
        border: '1px solid #e2e8f0', 
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)', 
        zIndex: 9999,
        padding: '0 8px'
      }}>
        <div onClick={() => setActiveTab('home')} style={{ textAlign: 'center', cursor: 'pointer', color: activeTab === 'home' ? '#2563eb' : '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <Home size={19} />
          <span style={{ fontSize: '9px', marginTop: '3px', fontWeight: activeTab === 'home' ? '800' : '600' }}>Home</span>
        </div>
        
        <div onClick={() => setActiveTab('dpr')} style={{ textAlign: 'center', cursor: 'pointer', color: activeTab === 'dpr' ? '#2563eb' : '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <ClipboardEdit size={19} />
          <span style={{ fontSize: '9px', marginTop: '3px', fontWeight: activeTab === 'dpr' ? '800' : '600' }}>DPR</span>
        </div>

        {/* 🌟 UNIQUE FLOATING BLUE CENTER BUTTON */}
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
{/* 💰 Expense Tab Button In Navigation Bar (Opens Expense/Income Popup) */}
        <div onClick={() => setIsExpensePopupOpen(true)} style={{ textAlign: 'center', cursor: 'pointer', color: activeTab === 'expense' ? '#2563eb' : '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <IndianRupee size={19} />
          <span style={{ fontSize: '9px', marginTop: '3px', fontWeight: activeTab === 'expense' ? '800' : '600' }}>Expense</span>
        </div>
        
        <div onClick={() => setActiveTab('attendance')} style={{ textAlign: 'center', cursor: 'pointer', color: activeTab === 'attendance' ? '#2563eb' : '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <UserCheck size={19} />
          <span style={{ fontSize: '9px', marginTop: '3px', fontWeight: activeTab === 'attendance' ? '800' : '600' }}>Attendance</span>
        </div>
      </div>

    </div>
  );
}