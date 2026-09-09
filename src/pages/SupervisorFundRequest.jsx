import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Send, Clock, CheckCircle2, XCircle, HandCoins, DollarSign } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

export default function SupervisorFundRequest({ user }) {
  const [plants, setPlants] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState('');
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);

  // 🎯 ૧. આવકનો પ્રકાર નક્કી કરવા માટે (HO Request vs Direct Income)
  const [incomeType, setIncomeType] = useState('HO_REQUEST'); // 'HO_REQUEST' અથવા 'DIRECT_INCOME'

  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [buyerName, setBuyerName] = useState(''); // સ્ક્રેપ લેનારનું નામ
  const [remarks, setRemarks] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });
  const triggerAlert = (msg) => setAlertModal({ isOpen: true, message: msg });
// 🌟 રિપોર્ટ માટેના સ્ટેટ્સ
const [showReportModal, setShowReportModal] = useState(false);
const [reportFromDate, setReportFromDate] = useState(() => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
});
const [reportToDate, setReportToDate] = useState(new Date().toISOString().split('T')[0]);
const [reportPurposeFilter, setReportPurposeFilter] = useState('All');
const [reportModeFilter, setReportModeFilter] = useState('All');

// 🌟 માત્ર જમા થયેલા (RECEIVED) ફંડનું ફિલ્ટરિંગ
const filteredInwardReport = requests.filter(item => {
  if (item.status !== 'RECEIVED') return false;

  const itemDate = item.request_date || (item.created_at ? item.created_at.split('T')[0] : '');
  const matchDate = (!reportFromDate || itemDate >= reportFromDate) && (!reportToDate || itemDate <= reportToDate);
  const matchPurpose = reportPurposeFilter === 'All' || item.purpose === reportPurposeFilter;
  const matchMode = reportModeFilter === 'All' || (item.payment_mode || 'Cash') === reportModeFilter;

  return matchDate && matchPurpose && matchMode;
});

const totalInwardAmount = filteredInwardReport.reduce(
  (sum, item) => sum + Number(item.approved_amount || item.requested_amount || 0), 
  0
);
  useEffect(() => {
    fetchPlants();
  }, []);

  useEffect(() => {
    if (selectedPlant) {
      fetchMyRequests();
    } else {
      setRequests([]);
    }
  }, [selectedPlant]);

  const fetchPlants = async () => {
    const { data } = await supabase.from('plants').select('*');
    setPlants(data || []);
  };

  const fetchMyRequests = async () => {
    const { data } = await supabase
      .from('plant_fund_transfers')
      .select('*')
      .eq('plant_name', selectedPlant)
      .order('created_at', { ascending: false })
      .limit(15);
    setRequests(data || []);
  };

  // 🟢 સુપરવાઇઝર જ્યારે એડમિને મોકલેલા પૈસા સ્વીકારે
  const handleAcceptFund = async (item) => {
    const confirmReceive = window.confirm(`શું તમને ₹${item.approved_amount} (${item.payment_mode || 'Cash'}) મળી ગયા છે?`);
    if (!confirmReceive) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentLoggedUser = session?.user?.email || session?.user?.id || user?.email || user?.id || '';

      const { error: updateErr } = await supabase
        .from('plant_fund_transfers')
        .update({
          status: 'RECEIVED',
          received_date: new Date().toISOString(),
          received_by: currentLoggedUser
        })
        .eq('id', item.id);

      if (updateErr) throw updateErr;

      triggerAlert(`✅ ₹${item.approved_amount} સફળતાપૂર્વક સ્વીકારી લીધા છે! સિલકમાં જમા થઈ ગયા.`);
      fetchMyRequests();

    } catch (err) {
      triggerAlert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 📤 સબમિટ હેન્ડલર (બંને પ્રકારની આવક માટે)
  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!selectedPlant) return triggerAlert("⚠️ કૃપા કરીને પહેલા પ્લાન્ટ સિલેક્ટ કરો!");
    if (!amount || Number(amount) <= 0) return triggerAlert("⚠️ માન્ય રકમ દાખલ કરો!");
    if (!purpose) return triggerAlert("⚠️ કેટેગરી/હેતુ પસંદ કરો!");

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentLoggedUser = session?.user?.email || session?.user?.id || user?.email || user?.id || '';

      const isDirect = incomeType === 'DIRECT_INCOME';
// ઉદાહરણ તરીકે: user?.email = "infra.tnj@gmail.com" હોય તો માત્ર "infra.tnj" મળશે
const supervisorShortName = (user?.email || currentLoggedUser || '')
  .split('@')[0]
  .trim();

// ઇન્સર્ટ / અપડેટ કરતી વખતે:
const payload = {
  // ... બાકીના ફિલ્ડ્સ

};
      const { error } = await supabase.from('plant_fund_transfers').insert([{
        plant_name: selectedPlant,
        request_date: requestDate,
        requested_amount: Number(amount),
        approved_amount: isDirect ? Number(amount) : null, // ડાયરેક્ટ હોય તો સીધા અપ્રૂવ્ડ
        purpose: purpose,
        admin_remarks: isDirect ? `ખરીદનાર: ${buyerName || 'Local Cash'} | ${remarks}` : remarks,
       supervisor_name: supervisorShortName,
        payment_mode: isDirect ? 'Cash (Direct)' : null,
        status: isDirect ? 'RECEIVED' : 'PENDING', // 🎯 ડાયરેક્ટ સેલ હોય તો સીધું જમા (RECEIVED)
        received_by: isDirect ? currentLoggedUser : null,
        received_date: isDirect ? new Date().toISOString() : null
      }]);

      if (error) throw error;

      if (isDirect) {
        triggerAlert(`✅ ₹${amount} ની સાઇટ આવક સિલકમાં જમા થઈ ગઈ!`);
      } else {
        triggerAlert("✅ ફંડ રિક્વેસ્ટ એડમિનને મોકલાઈ ગઈ છે. એડમિન મોકલશે એટલે નીચે સ્વીકારી શકાશે.");
      }

      setAmount('');
      setPurpose('');
      setBuyerName('');
      setRemarks('');
      fetchMyRequests();
    } catch (err) {
      triggerAlert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '650px', margin: '0 auto', paddingBottom: '30px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* 1. Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        padding: '14px 18px',
        borderRadius: '16px',
        border: '1px solid #bbf7d0',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 4px 12px rgba(22, 163, 74, 0.08)'
      }}>
        <div style={{
          backgroundColor: '#16a34a',
          padding: '8px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
        }}>
          <HandCoins size={20} color="#ffffff" strokeWidth={2.5} />
        </div>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#14532d', margin: 0, textTransform: 'uppercase' }}>
            PLANT CASH & FUND INWARD
          </h3>
          <span style={{ fontSize: '11px', color: '#15803d', fontWeight: '600' }}>
            Manage head office funds and direct plant cash income
          </span>
        </div>
      </div>

      {/* 2. Plant & Date Selection Card */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '16px 18px',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        gap: '14px',
        alignItems: 'center',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '11px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
            Select Plant *
          </label>
          <select 
            value={selectedPlant} 
            onChange={(e) => setSelectedPlant(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#f8fafc', fontWeight: '600', outline: 'none', color: '#0f172a' }}
            required
          >
            <option value="">-- Choose Plant --</option>
            {plants.map(p => <option key={p.id} value={p.plant_name}>{p.plant_name}</option>)}
          </select>
        </div>

        <div style={{ width: '140px' }}>
          <label style={{ fontSize: '11px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
            Date *
          </label>
          <input 
            type="date" 
            value={requestDate} 
            max={new Date().toISOString().split('T')[0]} 
            onChange={(e) => setRequestDate(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#f8fafc', fontWeight: '600', boxSizing: 'border-box', color: '#0f172a' }}
          />
        </div>
      </div>

      {/* 3. Smart Switcher (HO Fund vs Direct Plant Income) */}
      <div style={{ display: 'flex', gap: '8px', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '12px' }}>
        <button
          type="button"
          onClick={() => { setIncomeType('HO_REQUEST'); setPurpose(''); }}
          style={{
            flex: 1,
            padding: '9px',
            borderRadius: '9px',
            border: 'none',
            fontWeight: 'bold',
            fontSize: '11.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            backgroundColor: incomeType === 'HO_REQUEST' ? '#16a34a' : 'transparent',
            color: incomeType === 'HO_REQUEST' ? '#fff' : '#475569'
          }}
        >
          <HandCoins size={14} /> ૧. ઓફિસથી ફંડ મંગાવો (HO Advance)
        </button>

        <button
          type="button"
          onClick={() => { setIncomeType('DIRECT_INCOME'); setPurpose(''); }}
          style={{
            flex: 1,
            padding: '9px',
            borderRadius: '9px',
            border: 'none',
            fontWeight: 'bold',
            fontSize: '11.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            backgroundColor: incomeType === 'DIRECT_INCOME' ? '#0f766e' : 'transparent',
            color: incomeType === 'DIRECT_INCOME' ? '#fff' : '#475569'
          }}
        >
          <DollarSign size={14} /> ૨. પ્લાન્ટ રોકડ આવક (Scrap/Sale)
        </button>
      </div>

      {/* 4. Form Card */}
      <form onSubmit={handleSendRequest} style={{ backgroundColor: '#f0fdf4', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px dashed #bbf7d0', paddingBottom: '10px' }}>
          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#166534' }}>
            {incomeType === 'HO_REQUEST' ? '💵 Request Money from Head Office' : '📦 Direct Site Cash Inflow (સ્ક્રેપ/રોકડ આવક)'}
          </h4>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                રકમ (Amount ₹) *
              </label>
              <input
                type="number"
                placeholder="દા.ત. 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 'bold', boxSizing: 'border-box', color: '#0f172a' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                {incomeType === 'HO_REQUEST' ? 'શેના માટે જોઈએ છે? (Purpose) *' : 'આવકનો પ્રકાર (Item Sold) *'}
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box', color: '#0f172a' }}
                required
              >
                <option value="">-- પસંદ કરો --</option>
                {incomeType === 'HO_REQUEST' ? (
                  <>
                    <option value="Diesel / Fuel">ડીઝલ / ફ્યુઅલ (Diesel)</option>
                    <option value="Labour Advance">મજૂરોને એડવાન્સ / ઉપાડ (Labour)</option>
                    <option value="Machine Maintenance">મશીનરી રિપેરિંગ / પાર્ટ્સ</option>
                    <option value="Hardware / Local Purchase">સ્થાનિક ખરીદી (Hardware)</option>
                    <option value="Food / Tea / Plant Misc">પરચૂરણ પ્લાન્ટ ખર્ચ (Misc)</option>
                  </>
                ) : (
                  <>
                    <option value="Iron / Steel Scrap">લોખંડ / સ્ટીલ સ્ક્રેપ વેચાણ</option>
                    <option value="Empty Cement Bags">ખાલી સિમેન્ટ ગુણીનું વેચાણ</option>
                    <option value="Waste Concrete / Block Sale">વેસ્ટ મટીરિયલ / બ્લોક વેચાણ</option>
                    <option value="Local Testing / Misc Income">લોકલ ટેસ્ટિંગ કે પરચૂરણ આવક</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* જો Direct Income હોય તો ખરીદનારનું નામ પૂછો */}
          {incomeType === 'DIRECT_INCOME' && (
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                કોને વેચ્યું? (Buyer Name / Trader)
              </label>
              <input
                type="text"
                placeholder="દા.ત. Patel Scrap Traders"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
              વિગત / નોંધ (Remarks / Note)
            </label>
            <input
              type="text"
              placeholder="વધારાની નોંધ દાખલ કરો..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
            />
          </div>

        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: incomeType === 'HO_REQUEST' ? '#16a34a' : '#0f766e',
            color: '#fff',
            padding: '14px',
            border: 'none',
            borderRadius: '12px',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.2)'
          }}
        >
          <Send size={16} /> {loading ? 'નોંધાય છે...' : (incomeType === 'HO_REQUEST' ? 'Send Request to Head Office' : 'Add Cash to Plant Balance')}
        </button>

      </form>
      {/* 📊 Expense જેવું જ Report Button Card */}
<div style={{
  backgroundColor: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: '16px',
  padding: '14px 18px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)'
}}>
  <div>
    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
      📑 Cash Inward Transaction Report
    </h4>
    <span style={{ fontSize: '11px', color: '#64748b' }}>
      પ્લાન્ટ પર આવેલ રકમનો તારીખ મુજબ રિપોર્ટ કાઢો / પ્રિન્ટ કરો
    </span>
  </div>
  <button
    type="button"
    onClick={() => {
      if (!selectedPlant) {
        triggerAlert("⚠️ કૃપા કરીને પહેલા ઉપરથી પ્લાન્ટ સિલેક્ટ કરો!");
        return;
      }
      setShowReportModal(true);
    }}
    style={{
      backgroundColor: '#1e293b',
      color: '#fff',
      border: 'none',
      padding: '8px 16px',
      borderRadius: '10px',
      fontSize: '12px',
      fontWeight: 'bold',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}
  >
    📄 View / Print Report
  </button>
</div>
{/* ================= 🌟 INWARD REPORT MODAL ================= */}
{showReportModal && (
  <div className="report-modal-wrapper" style={{
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
    zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px'
  }}>

    {/* પ્રિન્ટ મીડિયા ક્વેરીઝ */}
    <style>{`
      @media print {
        body * {
          visibility: hidden !important;
        }
        .printable-inward-area, .printable-inward-area * {
          visibility: visible !important;
        }
        .printable-inward-area {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
          box-shadow: none !important;
          border: none !important;
          background: #fff !important;
        }
        .no-print {
          display: none !important;
        }
        .print-only-header {
          display: block !important;
        }
        table {
          width: 100% !important;
          border-collapse: collapse !important;
        }
        th, td {
          border: 1px solid #94a3b8 !important;
          padding: 6px 8px !important;
        }
        thead {
          display: table-header-group !important;
        }
        tr {
          page-break-inside: avoid !important;
        }
      }
      .print-only-header {
        display: none;
      }
    `}</style>

    <div className="printable-inward-area" style={{
      width: '100%', maxWidth: '750px', maxHeight: '90vh', backgroundColor: '#ffffff',
      borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', overflow: 'hidden'
    }}>
      
      {/* ૧. સ્ક્રીન હેડર */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
            Plant Cash Inward Statement
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>તારીખ પસંદ કરી આવક/ફંડનો રિપોર્ટ પ્રિન્ટ / PDF કાઢો</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            🖨️ Print / Save PDF
          </button>
          <button
            type="button"
            onClick={() => setShowReportModal(false)}
            style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* ૨. માત્ર પ્રિન્ટ વખતે દેખાતું કંપની હેડર */}
      <div className="print-only-header" style={{ marginBottom: '15px', borderBottom: '2px solid #16a34a', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: '0 0 2px 0', fontSize: '20px', fontWeight: '900', color: '#14532d', letterSpacing: '0.5px' }}>
              CASH INWARD & FUND RECEIPT STATEMENT
            </h2>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>
              Plant: <span style={{ color: '#0f172a' }}>{selectedPlant}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '11px', color: '#334155' }}>
            <div><strong>Period:</strong> {reportFromDate.split('-').reverse().join('/')} to {reportToDate.split('-').reverse().join('/')}</div>
            <div><strong>Generated By:</strong> {user?.email || 'Supervisor'}</div>
            <div><strong>Printed On:</strong> {new Date().toLocaleDateString('en-GB')}</div>
          </div>
        </div>
      </div>

      {/* ૩. ફિલ્ટર્સ બાર (સ્ક્રીન પર દેખાશે, પ્રિન્ટમાં નહિ આવે) */}
      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
        <div>
          <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#166534', display: 'block', marginBottom: '2px' }}>From Date</label>
          <input
            type="date"
            value={reportFromDate}
            onChange={(e) => setReportFromDate(e.target.value)}
            style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#166534', display: 'block', marginBottom: '2px' }}>To Date</label>
          <input
            type="date"
            value={reportToDate}
            onChange={(e) => setReportToDate(e.target.value)}
            style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#166534', display: 'block', marginBottom: '2px' }}>Filter Purpose</label>
          <select
            value={reportPurposeFilter}
            onChange={(e) => setReportPurposeFilter(e.target.value)}
            style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}
          >
            <option value="All">All Purposes (બધા હેતુ)</option>
            {Array.from(new Set(requests.map(r => r.purpose).filter(Boolean))).map((p, idx) => (
              <option key={idx} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#166534', display: 'block', marginBottom: '2px' }}>Payment Mode</label>
          <select
            value={reportModeFilter}
            onChange={(e) => setReportModeFilter(e.target.value)}
            style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}
          >
            <option value="All">All Modes (બધા મોડ)</option>
            <option value="Cash">Cash (રોકડા)</option>
            <option value="Cash (Direct)">Cash (Direct Sale)</option>
            <option value="UPI / GPay">UPI / GPay</option>
            <option value="Bank NEFT">Bank NEFT</option>
          </select>
        </div>
      </div>

      {/* ૪. એકાઉન્ટિંગ ટેબલ */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #166534' }}>
              <th style={{ padding: '8px', border: '1px solid #cbd5e1', width: '85px' }}>Date</th>
              <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Purpose / Head</th>
              <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Mode & Reference</th>
              <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Received By</th>
              <th style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'right', width: '95px' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {filteredInwardReport.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                  પસંદ કરેલા સમયગાળામાં કોઈ જમા થયેલ આવક મળી નથી.
                </td>
              </tr>
            ) : (
              filteredInwardReport.map((item, idx) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfcfc' }}>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>
                    {item.request_date ? item.request_date.split('-').reverse().join('/') : '-'}
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#0f172a' }}>
                    {item.purpose}
                    {item.admin_remarks && <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'normal' }}>{item.admin_remarks}</div>}
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1' }}>
                    {item.payment_mode || 'Cash'}
                    {item.txn_reference && item.txn_reference !== 'EMPTY' && item.txn_reference !== 'Direct Handover' && (
                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Ref: {item.txn_reference}</span>
                    )}
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', color: '#334155' }}>
                    {item.received_by || item.supervisor_name || '-'}
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>
                    ₹ {Number(item.approved_amount || item.requested_amount).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filteredInwardReport.length > 0 && (
            <tfoot>
              <tr style={{ backgroundColor: '#f0fdf4', fontWeight: '900', borderTop: '2px solid #166534' }}>
                <td colSpan={4} style={{ padding: '10px 8px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#0f172a', fontSize: '12px' }}>
                  Grand Total (કુલ જમા આવક):
                </td>
                <td style={{ padding: '10px 8px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#16a34a', fontSize: '13px' }}>
                  ₹ {totalInwardAmount.toLocaleString('en-IN')}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

    </div>
  </div>
)}

      {/* 5. Recent History */}
      <div style={{ backgroundColor: '#ffffff', padding: '16px 18px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '13px', color: '#334155', fontWeight: 'bold' }}>
            📋 આવક અને રિક્વેસ્ટ હિસ્ટ્રી (Recent Inflows)
          </h4>
          <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: 'bold', backgroundColor: '#dcfce7', padding: '3px 8px', borderRadius: '10px' }}>
            Total: {requests.length}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {requests.map((r) => {
            const isPartial = r.approved_amount && Number(r.approved_amount) < Number(r.requested_amount);

            return (
              <div key={r.id} style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#0f172a' }}>
                    {r.status === 'RECEIVED' ? `₹${Number(r.approved_amount).toLocaleString('en-IN')}` : `₹${Number(r.requested_amount).toLocaleString('en-IN')}`}
                    {' '}— <span style={{ color: '#16a34a' }}>{r.purpose}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                    તારીખ: {r.request_date} {r.payment_mode ? `| Mode: ${r.payment_mode}` : ''}
                    {r.admin_remarks ? ` | ${r.admin_remarks}` : ''}
                  </div>
                </div>

                <div>
                  {r.status === 'PENDING' && (
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#b45309', backgroundColor: '#fef3c7', padding: '4px 10px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                      <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} /> પેન્ડિંગ
                    </span>
                  )}
                  {r.status === 'SENT' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '10px', color: '#1e40af', fontWeight: 'bold' }}>
                        🚀 મોકલ્યા: ₹{r.approved_amount} {isPartial && `(રિક્વેસ્ટ: ₹${r.requested_amount})`}
                      </span>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleAcceptFund(r)}
                        style={{
                          backgroundColor: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <CheckCircle2 size={13} /> મળ્યા (Accept)
                      </button>
                    </div>
                  )}
                  {r.status === 'RECEIVED' && (
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#15803d', backgroundColor: '#dcfce7', padding: '4px 10px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                      <CheckCircle2 size={12} style={{ display: 'inline', marginRight: '4px' }} /> જમા (₹{Number(r.approved_amount || r.requested_amount).toLocaleString('en-IN')})
                    </span>
                  )}
                  {r.status === 'REJECTED' && (
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#b91c1c', backgroundColor: '#fee2e2', padding: '4px 10px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                      <XCircle size={12} style={{ display: 'inline', marginRight: '4px' }} /> નામંજૂર
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmModal
        isOpen={alertModal.isOpen}
        message={alertModal.message}
        singleButton={true}
        onConfirm={() => setAlertModal({ isOpen: false, message: '' })}
      />

    </div>
  );
}