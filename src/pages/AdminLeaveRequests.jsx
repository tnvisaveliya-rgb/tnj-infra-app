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
      const updatePayload = { 
        status: statusType,
        approved_from_date: req.tempFrom || req.from_date,
        approved_to_date: req.tempTo || req.to_date,
        admin_remark: req.tempRemark || ''
      };

      const { error } = await supabase
        .from('leave_requests')
        .update(updatePayload)
        .eq('id', req.id);

      if (error) throw error;

      alert(`રજા સફળતાપૂર્વક ${statusType} કરી દેવામાં આવી છે!`);
      fetchLeaveRequests(); 

    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const updateLocalField = (id, field, value) => {
    setRequests(requests.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '12px' }}>
      <h3>📋 Staff Leave Requests (રજાઓની અરજીઓ)</h3>
      
      {requests.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#64748b' }}>કોઈ પેન્ડિંગ રજાની અરજી નથી.</p>
      ) : (
        requests.map(req => (
          <div key={req.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px', marginBottom: '10px', backgroundColor: '#f8fafc' }}>
            <p><strong>Staff Email:</strong> {req.employee_email}</p>
            <p><strong>Requested Period:</strong> {req.from_date} to {req.to_date} ({req.leave_type})</p>
            <p><strong>Reason:</strong> {req.reason}</p>
            <p><strong>Status:</strong> <span style={{ color: req.status === 'Pending' ? 'orange' : 'green', fontWeight: 'bold' }}>{req.status}</span></p>

            <div style={{ marginTop: '10px', backgroundColor: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <p style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '5px', color: '#1e293b' }}>Modify / Approve Days:</p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>From:</span>
                  <input 
                    type="date" 
                    defaultValue={req.from_date} 
                    onChange={(e) => updateLocalField(req.id, 'tempFrom', e.target.value)} 
                    style={{ width: '100%', padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>To:</span>
                  <input 
                    type="date" 
                    defaultValue={req.to_date} 
                    onChange={(e) => updateLocalField(req.id, 'tempTo', e.target.value)} 
                    style={{ width: '100%', padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} 
                  />
                </div>
              </div>
              <input 
                type="text" 
                placeholder="Admin Remark (દા.ત. ૩ દિવસ જ મંજૂર)" 
                onChange={(e) => updateLocalField(req.id, 'tempRemark', e.target.value)}
                style={{ width: '100%', padding: '6px', fontSize: '11px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} 
              />

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => handleLeaveAction(req, 'Approved')}
                  style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Full Approve
                </button>
                <button 
                  onClick={() => handleLeaveAction(req, 'Partially Approved')}
                  style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Approve Custom Days (Partial)
                </button>
                <button 
                  onClick={() => handleLeaveAction(req, 'Rejected')}
                  style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default AdminLeaveRequests;