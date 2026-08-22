import React, { useState } from 'react';
import { Home, ClipboardEdit, IndianRupee, UserCheck, Wallet, Clock, CheckCircle2, FileText, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');

  const [latestDpr] = useState({
    date: '22 Aug 2026',
    siteName: 'Site - Block A Foundation',
    status: 'Submitted',
    workersCount: 14,
    notes: 'Concrete casting completed.'
  });

  return (
    <div style={{ 
      maxWidth: '480px', margin: '0 auto', backgroundColor: '#f1f5f9', height: '100vh', 
      maxHeight: '100vh', display: 'flex', flexDirection: 'column', 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
      position: 'relative', overflow: 'hidden', boxSizing: 'border-box', padding: '12px 14px 75px 14px' 
    }}>
      
      {/* ================= TOP APP HEADER (Clean & Professional) ================= */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', backgroundColor: '#ffffff', padding: '10px 14px', borderRadius: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '15px' }}>
            {user?.email ? user.email.charAt(0).toUpperCase() : 'E'}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: '700' }}>Welcome back</p>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
              {user?.email ? user.email.split('@')[0] : 'Employee'}
            </h2>
          </div>
        </div>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#16a34a', backgroundColor: '#f0fdf4', padding: '4px 8px', borderRadius: '8px' }}>
          ● Active
        </div>
      </div>

      {/* ================= SCROLLABLE CONTENT AREA ================= */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '2px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* 1. HOME TAB CONTENT */}
        {activeTab === 'home' && (
          <>
            {/* Modern Premium Gradient Balance Card */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              borderRadius: '18px', padding: '16px 18px', color: 'white',
              boxShadow: '0 8px 20px -6px rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.1)',
              position: 'relative', overflow: 'hidden', flexShrink: 0
            }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '90px', height: '90px', background: '#3b82f6', filter: 'blur(40px)', opacity: 0.4, borderRadius: '50%' }}></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', opacity: 0.85, position: 'relative' }}>
                <Wallet size={16} color="#38bdf8" />
                <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.6px', textTransform: 'uppercase' }}>Live Cash in Hand (Silak)</span>
              </div>
              <h1 style={{ margin: '2px 0 10px 0', fontSize: '28px', fontWeight: '900', letterSpacing: '-0.5px', position: 'relative' }}>₹ 12,500.00</h1>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', position: 'relative', fontSize: '10px', color: '#94a3b8' }}>
                <span>Status: Verified & Active</span>
                <span>Just now</span>
              </div>
            </div>

            {/* Recent DPR Overview Card */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '12px 14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '8px', borderRadius: '10px' }}>
                    <FileText size={16} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0', fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{latestDpr.siteName}</h4>
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
                  View DPR <ChevronRight size={12} />
                </button>
              </div>
            </div>

            {/* Activity Matrix (2 Columns) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', flexShrink: 0 }}>
              <div style={{ backgroundColor: '#ffffff', padding: '12px 14px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '6px', borderRadius: '8px' }}><Clock size={14} /></div>
                  <span style={{ fontSize: '9px', backgroundColor: '#f0fdf4', color: '#15803d', padding: '2px 6px', borderRadius: '6px', fontWeight: '800' }}>On Time</span>
                </div>
                <h4 style={{ margin: '0', fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Attendance</h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '13px', fontWeight: '900', color: '#0f172a' }}>Punched In</p>
              </div>

              <div style={{ backgroundColor: '#ffffff', padding: '12px 14px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ backgroundColor: '#fff7ed', color: '#ea580c', padding: '6px', borderRadius: '8px' }}><IndianRupee size={14} /></div>
                  <span style={{ fontSize: '9px', backgroundColor: '#fff7ed', color: '#c2410c', padding: '2px 6px', borderRadius: '6px', fontWeight: '800' }}>Pending</span>
                </div>
                <h4 style={{ margin: '0', fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Today Expense</h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '13px', fontWeight: '900', color: '#0f172a' }}>₹ 450.00</p>
              </div>
            </div>

            {/* Quick Actions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0, paddingBottom: '10px' }}>
              <div onClick={() => setActiveTab('dpr')} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '8px', borderRadius: '10px' }}><ClipboardEdit size={16} /></div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>Add / Edit DPR</h4>
                    <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}>Submit daily site work progress report</p>
                  </div>
                </div>
                <ChevronRight size={16} color="#94a3b8" />
              </div>

              <div onClick={() => setActiveTab('expense')} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ backgroundColor: '#fff7ed', color: '#ea580c', padding: '8px', borderRadius: '10px' }}><IndianRupee size={16} /></div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>Expense / Transaction</h4>
                    <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}>Manage site expenses and cash flow</p>
                  </div>
                </div>
                <ChevronRight size={16} color="#94a3b8" />
              </div>
            </div>
          </>
        )}

        {/* 2. DPR TAB */}
        {activeTab === 'dpr' && (
          <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>DPR Form & History</h3>
            <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '12px' }}>Submit and review daily work progress reports.</p>
            <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', textAlign: 'center', color: '#64748b', border: '2px dashed #cbd5e1', fontSize: '12px' }}>
              DPR Form Component Goes Here
            </div>
          </div>
        )}

        {/* 3. EXPENSE TAB */}
        {activeTab === 'expense' && (
          <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Expense & Transactions</h3>
            <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '12px' }}>Track daily site cash flows and expenditures.</p>
            <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', textAlign: 'center', color: '#64748b', border: '2px dashed #cbd5e1', fontSize: '12px' }}>
              Expense Component Goes Here
            </div>
          </div>
        )}

        {/* 4. ATTENDANCE TAB */}
        {activeTab === 'attendance' && (
          <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Staff Attendance</h3>
            <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '12px' }}>Check and verify site staff attendance records.</p>
            <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', textAlign: 'center', color: '#64748b', border: '2px dashed #cbd5e1', fontSize: '12px' }}>
              Attendance Component Goes Here
            </div>
          </div>
        )}

      </div>

      {/* ================= FIXED BOTTOM NAVIGATION BAR ================= */}
      <div style={{ 
        position: 'absolute', bottom: 0, left: 0, right: 0, maxWidth: '480px', margin: '0 auto', 
        backgroundColor: '#ffffff', display: 'flex', justifyContent: 'space-around', padding: '10px 0', 
        borderTop: '1px solid #e2e8f0', boxShadow: '0 -4px 15px rgba(0,0,0,0.04)', zIndex: 1000 
      }}>
        <div onClick={() => setActiveTab('home')} style={{ textAlign: 'center', cursor: 'pointer', color: activeTab === 'home' ? '#2563eb' : '#94a3b8' }}>
          <Home size={20} style={{ margin: '0 auto' }} />
          <p style={{ fontSize: '10px', margin: '2px 0 0 0', fontWeight: activeTab === 'home' ? '800' : '600' }}>Home</p>
        </div>
        <div onClick={() => setActiveTab('dpr')} style={{ textAlign: 'center', cursor: 'pointer', color: activeTab === 'dpr' ? '#2563eb' : '#94a3b8' }}>
          <ClipboardEdit size={20} style={{ margin: '0 auto' }} />
          <p style={{ fontSize: '10px', margin: '2px 0 0 0', fontWeight: activeTab === 'dpr' ? '800' : '600' }}>DPR</p>
        </div>
        <div onClick={() => setActiveTab('expense')} style={{ textAlign: 'center', cursor: 'pointer', color: activeTab === 'expense' ? '#2563eb' : '#94a3b8' }}>
          <IndianRupee size={20} style={{ margin: '0 auto' }} />
          <p style={{ fontSize: '10px', margin: '2px 0 0 0', fontWeight: activeTab === 'expense' ? '800' : '600' }}>Expense</p>
        </div>
        <div onClick={() => setActiveTab('attendance')} style={{ textAlign: 'center', cursor: 'pointer', color: activeTab === 'attendance' ? '#2563eb' : '#94a3b8' }}>
          <UserCheck size={20} style={{ margin: '0 auto' }} />
          <p style={{ fontSize: '10px', margin: '2px 0 0 0', fontWeight: activeTab === 'attendance' ? '800' : '600' }}>Attendance</p>
        </div>
      </div>

    </div>
  );
}