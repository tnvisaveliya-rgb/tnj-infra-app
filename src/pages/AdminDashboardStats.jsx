import React, { useState } from 'react';
import { supabase } from '../lib/supabase'

const AdminDashboardStats= () => {
  const [formData, setFormData] = useState({ companyName: '', gstin: '', email: '', password: '' });
  const [logoFile, setLogoFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      let logo_url = null;
      if (logoFile) {
        const fileName = `${Date.now()}.${logoFile.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('company-logos').upload(fileName, logoFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('company-logos').getPublicUrl(fileName);
        logo_url = urlData.publicUrl;
      }
      
      const { error } = await supabase.functions.invoke('add-tenant', {
        body: {
          company_name: formData.companyName,
          gstin: formData.gstin,
          logo_url: logo_url,
          admin_email: formData.email,
          admin_password: formData.password,
        },
      });

      if (error) throw error;
      setMessage('New company ane admin account successfully create thai gayu che!');
      setFormData({ companyName: '', gstin: '', email: '', password: '' });
      setLogoFile(null);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: '100%', padding: '10px', marginTop: '4px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginTop: '16px' };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '24px', backgroundColor: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', borderRadius: '8px', fontFamily: 'sans-serif' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: '#111' }}>Master Super Admin - Add New Company</h2>
      
      {message && (
        <div style={{ padding: '12px', marginBottom: '16px', borderRadius: '4px', backgroundColor: message.startsWith('Error') ? '#fee2e2' : '#dcfce7', color: message.startsWith('Error') ? '#991b1b' : '#166534' }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <label style={labelStyle}>Company Name</label>
        <input type="text" name="companyName" value={formData.companyName} onChange={handleInputChange} required style={inputStyle} placeholder="e.g. ABC Infra" />

        <label style={labelStyle}>GSTIN</label>
        <input type="text" name="gstin" value={formData.gstin} onChange={handleInputChange} required style={inputStyle} placeholder="24XXXXX1234X1ZX" />

        <label style={labelStyle}>Company Logo</label>
        <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} style={inputStyle} />

        <hr style={{ margin: '32px 0', border: '0', borderTop: '1px solid #eee' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111' }}>Admin Owner Details</h3>

        <label style={labelStyle}>Admin Email</label>
        <input type="email" name="email" value={formData.email} onChange={handleInputChange} required style={inputStyle} placeholder="admin@abcinfra.com" />

        <label style={labelStyle}>Admin Password</label>
        <input type="password" name="password" value={formData.password} onChange={handleInputChange} required style={inputStyle} />

        <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', marginTop: '24px', backgroundColor: '#2563eb', color: '#fff', fontSize: '16px', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Processing...' : 'Create Company & Admin'}
        </button>
      </form>
    </div>
  );
};

export default AdminDashboardStats;