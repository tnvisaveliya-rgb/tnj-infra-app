import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Check, X, ShieldCheck, Clock, Send, CreditCard, Building2, User, FileText } from 'lucide-react';

export default function PlantTransaction({ adminUser }) {
  const [pendingList, setPendingList] = useState([]);
  const [actionData, setActionData] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    const { data } = await supabase
      .from('plant_fund_transfers')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });
    setPendingList(data || []);
  };

  const handleApprove = async (item) => {
    const config = actionData[item.id] || {};
    const finalAmount = config.amount ? Number(config.amount) : item.requested_amount;
    const finalMode = config.mode || 'Cash';
    const txnRef = config.txn || 'Direct Handover';

    setLoading(true);
    const { error } = await supabase
      .from('plant_fund_transfers')
      .update({
        status: 'SENT',
        approved_amount: finalAmount,
        payment_mode: finalMode,
        txn_reference: txnRef,
        transfer_date: new Date().toISOString().split('T')[0],
        approved_by: adminUser?.email || 'Admin'
      })
      .eq('id', item.id);

    setLoading(false);
    if (!error) {
      alert(`✅ ₹${finalAmount} મોકલી દીધાનું નોંધાઈ ગયું છે! સુપરવાઇઝર સ્વીકારશે એટલે જમા થઈ જશે.`);
      fetchPendingRequests();
    } else {
      alert("Error: " + error.message);
    }
  };

  const handleReject = async (id) => {
    const reason = prompt("નામંજૂર કરવાનું કારણ લખો:");
    if (!reason) return;

    await supabase
      .from('plant_fund_transfers')
      .update({
        status: 'REJECTED',
        admin_remarks: reason,
        approved_by: adminUser?.email || 'Admin'
      })
      .eq('id', id);

    fetchPendingRequests();
  };

  return (
    <div style={{ padding: '16px', maxWidth: '650px', margin: '0 auto', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* ૧. પ્રીમિયમ એડમિન બેનર */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        padding: '16px 20px',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 15px rgba(15, 23, 42, 0.15)',
        color: '#fff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            backgroundColor: '#3b82f6',
            padding: '10px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)'
          }}>
            <ShieldCheck size={22} color="#ffffff" />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '800', margin: 0, letterSpacing: '0.3px' }}>
              Fund Approval Panel
            </h3>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>
              Review and disburse funds to site supervisors
            </span>
          </div>
        </div>

        <div style={{
          backgroundColor: '#334155',
          padding: '6px 12px',
          borderRadius: '10px',
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#38bdf8',
          border: '1px solid #475569'
        }}>
          {pendingList.length} Pending
        </div>
      </div>

      {/* ૨. પેન્ડિંગ લિસ્ટ કન્ટેનર */}
      {pendingList.length === 0 ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
            <Clock size={24} color="#16a34a" />
          </div>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#0f172a', fontWeight: 'bold' }}>બધી જ રિક્વેસ્ટ ક્લીયર છે!</h4>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>હાલમાં કોઈ સુપરવાઇઝરની નવી ફંડ રિક્વેસ્ટ બાકી નથી.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {pendingList.map((item) => (
            <div key={item.id} style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)'
            }}>
              
              {/* કાર્ડ હેડર (પ્લાન્ટ અને રકમ) */}
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '14px 16px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={18} color="#2563eb" />
                  <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '14px' }}>{item.plant_name}</span>
                </div>
                <div style={{
                  backgroundColor: '#ecfdf5',
                  color: '#166534',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontWeight: '800',
                  fontSize: '15px',
                  border: '1px solid #bbf7d0'
                }}>
                  ₹{Number(item.requested_amount).toLocaleString('en-IN')}
                </div>
              </div>

              {/* કાર્ડ બોડી (વિગતો) */}
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#64748b' }}>ખર્ચનો હેતુ:</span>
                  <span style={{ fontWeight: '700', color: '#1d4ed8', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '6px' }}>
                    {item.purpose}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#64748b' }}>સુપરવાઇઝર:</span>
                  <span style={{ fontWeight: '600', color: '#334155' }}>{item.supervisor_name || 'Site User'}</span>
                </div>

                {item.admin_remarks && (
                  <div style={{ fontSize: '11.5px', color: '#475569', backgroundColor: '#f1f5f9', padding: '8px 10px', borderRadius: '8px', marginTop: '2px', borderLeft: '3px solid #cbd5e1' }}>
                    <strong>નોંધ:</strong> {item.admin_remarks}
                  </div>
                )}
              </div>

              {/* કાર્ડ ફૂટર (ઇનપુટ્સ અને એક્શન) */}
              <div style={{
                backgroundColor: '#fffbeb',
                padding: '12px 16px',
                borderTop: '1px solid #fef3c7',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {/* મોડ સિલેક્ટ */}
                  <select
                    onChange={(e) => setActionData({ ...actionData, [item.id]: { ...actionData[item.id], mode: e.target.value } })}
                    style={{
                      flex: '1',
                      minWidth: '130px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: '#fff',
                      color: '#0f172a'
                    }}
                  >
                    <option value="Cash">💵 Cash (રોકડા)</option>
                    <option value="UPI / GPay">📱 GPay / UPI</option>
                    <option value="Bank NEFT">🏦 Bank NEFT</option>
                  </select>

                  {/* રકમ સુધારો */}
                  <input
                    type="number"
                    placeholder={`₹ ${item.requested_amount}`}
                    defaultValue={item.requested_amount}
                    onChange={(e) => setActionData({ ...actionData, [item.id]: { ...actionData[item.id], amount: e.target.value } })}
                    style={{
                      width: '110px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor: '#fff',
                      color: '#15803d',
                      textAlign: 'center'
                    }}
                  />
                </div>

                {/* રેફરન્સ / UTR */}
                <input
                  type="text"
                  placeholder="UTR / Cheque / Ref Note (દા.ત. GPay Txn ID)"
                  onChange={(e) => setActionData({ ...actionData, [item.id]: { ...actionData[item.id], txn: e.target.value } })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    backgroundColor: '#fff',
                    boxSizing: 'border-box'
                  }}
                />

                {/* બટનો */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleApprove(item)}
                    style={{
                      flex: 1,
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
                    }}
                  >
                    <Check size={16} /> મોકલી દીધા (Send Fund)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReject(item.id)}
                    style={{
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <X size={16} /> Reject
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}