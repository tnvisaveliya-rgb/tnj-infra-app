import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function AdminLeaveRequests() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const fetchLeaveRequests = async () => {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) setRequests(data || []);
  };

  const handleLeaveAction = async (req, statusType) => {
    try {
      let finalFrom = req.tempFrom || req.from_date;
      let finalTo = req.tempTo || req.to_date;
      let finalRemark = req.tempRemark || '';

      // 💡 નવું લોજીક: જો Partial Approve હોય અને રિમાર્ક ખાલી હોય, તો સિસ્ટમ જાતે જ રિમાર્ક બનાવી દેશે
      if (statusType === 'Partially Approved' && finalRemark.trim() === '') {
        finalRemark = `Partially Approved: ${finalFrom} થી ${finalTo} સુધી મંજૂર.`;
      }

      // 💡 સ્ટેટસ મુજબ પેલોડ (જો Reset/Pending કરે તો બધો જૂનો ડેટા ક્લિયર કરી દેશે)
      const updatePayload = { 
        status: statusType,
        approved_from_date: statusType === 'Pending' ? null : finalFrom,
        approved_to_date: statusType === 'Pending' ? null : finalTo,
        admin_remark: statusType === 'Pending' ? null : finalRemark
      };

      const { error } = await supabase
        .from('leave_requests')
        .update(updatePayload)
        .eq('id', req.id);

      if (error) throw error;

      alert(`રજા સફળતાપૂર્વક ${statusType} કરી દેવામાં આવી છે!`);
      fetchLeaveRequests(); // ડેટા રિફ્રેશ કરવા માટે

    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const updateLocalField = (id, field, value) => {
    setRequests(requests.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '12px' }}>
      <h3 style={{ marginTop: 0, color: '#0f172a' }}>📋 Staff Leave Requests (રજાઓની અરજીઓ)</h3>
      
      {requests.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#64748b' }}>કોઈ પેન્ડિંગ રજાની અરજી નથી.</p>
      ) : (
        requests.map(req => (
          <div key={req.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px', marginBottom: '10px', backgroundColor: '#f8fafc' }}>
            <p style={{ margin: '0 0 6px 0' }}><strong>Staff Email:</strong> <span style={{ color: '#334155' }}>{req.employee_email}</span></p>
            <p style={{ margin: '0 0 6px 0' }}><strong>Requested Period:</strong> <span style={{ color: '#334155' }}>{req.from_date} to {req.to_date} ({req.leave_type})</span></p>
            <p style={{ margin: '0 0 6px 0' }}><strong>Reason:</strong> <span style={{ color: '#334155' }}>{req.reason}</span></p>
            <p style={{ margin: '0 0 6px 0' }}><strong>Status:</strong> <span style={{ color: req.status === 'Pending' ? '#d97706' : req.status === 'Rejected' ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>{req.status}</span></p>

            {/* Partially Approved ની વિગતો બતાવવા માટે (નામ સુધારીને approved_from_date કર્યું છે) */}
            {req.status === 'Partially Approved' && (
              <div style={{ marginTop: '10px', marginBottom: '10px', padding: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
                <div style={{ color: '#166534', fontSize: '13px', fontWeight: 'bold' }}>
                  ✓ Approved Dates: {req.approved_from_date || req.from_date} થી {req.approved_to_date || req.to_date}
                </div>
                {req.admin_remark && (
                  <div style={{ color: '#15803d', fontSize: '12px', marginTop: '4px' }}>
                    <strong>Admin Remark:</strong> {req.admin_remark}
                  </div>
                )}
              </div>
            )}

            {/* 🔒 સ્ટેટસ લોકિંગ: જો Pending હોય તો જ ફોર્મ અને બટનો બતાવશે */}
            {req.status === 'Pending' ? (
              <div style={{ marginTop: '12px', backgroundColor: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#1e293b' }}>Modify / Approve Days:</p>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>From:</span>
                    <input 
                      type="date" 
                      defaultValue={req.from_date} 
                      onChange={(e) => updateLocalField(req.id, 'tempFrom', e.target.value)} 
                      style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', marginTop: '4px' }} 
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>To:</span>
                    <input 
                      type="date" 
                      defaultValue={req.to_date} 
                      onChange={(e) => updateLocalField(req.id, 'tempTo', e.target.value)} 
                      style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', marginTop: '4px' }} 
                    />
                  </div>
                </div>
                <input 
                  type="text" 
                  placeholder="Admin Remark (દા.ત. ૩ દિવસ જ મંજૂર - Optional)" 
                  onChange={(e) => updateLocalField(req.id, 'tempRemark', e.target.value)}
                  style={{ width: '100%', padding: '8px', fontSize: '12px', marginBottom: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} 
                />

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => {
                      if(window.confirm('શું તમે આ રજા મંજૂર (Full Approve) કરવા માંગો છો?')) handleLeaveAction(req, 'Approved');
                    }}
                    style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Full Approve
                  </button>
                  <button 
                    onClick={() => {
                      if(window.confirm('શું તમે કસ્ટમ તારીખો સાથે રજા મંજૂર (Partial Approve) કરવા માંગો છો?')) handleLeaveAction(req, 'Partially Approved');
                    }}
                    style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Approve Custom Days (Partial)
                  </button>
                  <button 
                    onClick={() => {
                      if(window.confirm('શું તમે આ રજા ના-મંજૂર (Reject) કરવા માંગો છો?')) handleLeaveAction(req, 'Rejected');
                    }}
                    style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Reject
                  </button>
                </div>
              </div>
            ) : (
              /* 🔄 રિસેટ બટન (જો રજા અપ્રુવ કે રિજેક્ટ થઈ ગઈ હોય તો) */
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => {
                    if(window.confirm('શું તમે ખરેખર આ નિર્ણય બદલવા માંગો છો? આ અરજી ફરીથી "Pending" સ્ટેટસમાં જતી રહેશે.')) {
                      handleLeaveAction(req, 'Pending');
                    }
                  }}
                  style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', gap: '5px', alignItems: 'center' }}>
                  🔄 Change Decision (Reset)
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default AdminLeaveRequests;