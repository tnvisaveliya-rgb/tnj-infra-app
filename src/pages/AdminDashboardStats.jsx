import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Loader2, Trash2, Shield, Edit3, Search, MapPin, Building2, Globe, Copy, ExternalLink, Share2 } from 'lucide-react';

export default function AdminDashboardStats() {
  const [companiesList, setCompaniesList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add Company Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    gstin: '',
    address: '',
    email: '',
    password: '',
     recoveryEmail: '' ,
     max_plants: 100// 👈 Navu field
  });
  const [logoFile, setLogoFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Edit Company Modal States
  const [editingCompany, setEditingCompany] = useState(null);
  const [editForm, setEditForm] = useState({
    company_name: '',
    gstin: '',
    address: '',
    subdomain: '',
    logo_url: '',
    is_active: true,
    max_plants: 100
  });
  const [editLogoFile, setEditLogoFile] = useState(null); // 👈 નવો લોગો અપલોડ કરવા માટે
  const [updating, setUpdating] = useState(false);
  

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    const { data, error } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error("Error fetching companies:", error.message);
    } else {
      setCompaniesList(data || []);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm({ 
      ...editForm, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };

  // Add New Company Handler
  const handleAddCompany = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.companyName || !formData.gstin || !formData.address || !formData.email || !formData.password) {
      setError('Krupapa kri ne badhi jaruri mahiti bharo.');
      return;
    }

    setLoading(true);

    try {
      let logo_url = null;
      if (logoFile) {
        const fileName = `${Date.now()}.${logoFile.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('company-logos').upload(fileName, logoFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('company-logos').getPublicUrl(fileName);
        logo_url = urlData.publicUrl;
      }
      
      const { error: fnError } = await supabase.functions.invoke('add-tenant', {
        body: {
          company_name: formData.companyName,
          gstin: formData.gstin,
          address: formData.address,
          logo_url: logo_url,
          admin_email: formData.email,
          admin_password: formData.password,
          recovery_email: formData.recoveryEmail,
          max_plants: parseInt(formData.max_plants) || 100,
        },
      });

      if (fnError) throw fnError;

      alert('Navi company ane admin account safaltapurvak banigayu che!');
      setIsModalOpen(false);
      setFormData({ companyName: '', gstin: '', address: '', email: '', password: '' });
      setLogoFile(null);
      fetchCompanies();
    } catch (err) {
      console.error('Error adding company:', err);
      setError(err.message || 'Company banavvama nishfalta mali.');
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (comp) => {
    setEditingCompany(comp);
    setEditForm({
      company_name: comp.company_name || '',
      gstin: comp.gstin || '',
      address: comp.address || '',
      subdomain: comp.subdomain || '',
      logo_url: comp.logo_url || '',
      max_plants: comp.max_plants || 100,
      is_active: comp.is_active !== false
    });
    setEditLogoFile(null);
  };

// Update Company Handler (Updated with Logo Upload Logic)
  const handleUpdateCompany = async (e) => {
    e.preventDefault();
    setUpdating(true);

    try {
      let updatedLogoUrl = editForm.logo_url;

      // 🌟 જો નવો લોગો સિલેક્ટ કર્યો હોય, તો જ સ્ટોરેજમાં અપલોડ કરો અને નવી URL મેળવો
      if (editLogoFile) {
        const fileExt = editLogoFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('company-logos')
          .upload(fileName, editLogoFile);

        if (uploadError) throw uploadError;

        // નવી પબ્લિક URL મેળવો
        const { data: urlData } = supabase.storage
          .from('company-logos')
          .getPublicUrl(fileName);

        updatedLogoUrl = urlData.publicUrl;
      }

      // 🌟 હવે ડેટાબેઝ ટેબલમાં નવી URL સાથે ડેટા અપડેટ કરો
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          company_name: editForm.company_name,
          gstin: editForm.gstin,
          address: editForm.address,
          subdomain: editForm.subdomain,
          logo_url: updatedLogoUrl, // નવી કે જૂની URL અહીં સેવ થશે
         max_plants: parseInt(editForm.max_plants) || 100,
          is_active: editForm.is_active
        })
        .eq('id', editingCompany.id);

      if (updateError) throw updateError;

      alert('Company ni vigato ane logo safaltapurvak update thai gaya che!');
      setEditingCompany(null);
      setEditLogoFile(null);
      fetchCompanies();
    } catch (err) {
      alert("Update karvama error aavi: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  // Delete Company Handler
  const deleteCompany = async (id, name) => {
    if (confirm(`Shu tame "${name}" company permanent delete karva mango cho?`)) {
      const { error } = await supabase.from('companies').delete().eq('id', id);
      if (!error) {
        fetchCompanies();
        setEditingCompany(null);
        alert('Company delete thai gai che.');
      } else {
        alert("Delete karvama error aavi: " + error.message);
      }
    }
  };

  // Share / Copy Link Helper
  const handleCopyLink = (subdomain) => {
    const link = `https://${subdomain}.tnjinfra.in`;
    navigator.clipboard.writeText(link);
    alert('Link clipboard ma copy thai gai che: ' + link);
  };

  const handleShareLink = (companyName, subdomain) => {
    const link = `https://${subdomain}.tnjinfra.in`;
    if (navigator.share) {
      navigator.share({
        title: `${companyName} ERP Portal`,
        text: `Taru ${companyName} nu login portal ahiya thi open karo:`,
        url: link,
      }).catch(console.error);
    } else {
      handleCopyLink(subdomain);
    }
  };

  // Search Filter
  const filteredCompanies = companiesList.filter(comp => 
    comp.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comp.subdomain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comp.gstin?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* 1. Header & Back Button */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 'bold' }}>
            <Building2 size={22} color="#2563eb" /> Companies Management
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b', lineHeight: '1.4' }}>
            Badhi registered companies, subdomains ane status ahi thi manage karo.
          </p>
        </div>
      </div>

      {/* 2. Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '8px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '14px', color: '#0f172a' }}>
          <Shield size={16} color="#0f172a" /> Companies List 
          <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '12px', marginLeft: '4px' }}>
            Total: {companiesList.length}
          </span>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}
        >
          + Add New Company
        </button>
      </div>

      {/* 3. Search Bar */}
      <div style={{ position: 'relative', marginBottom: '10px' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#64748b' }} />
        <input 
          type="text" 
          placeholder="Search company name, subdomain or GSTIN..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '8px 10px 8px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
        />
      </div>

      {/* 4. Companies Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredCompanies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' }}>
            Koi company mali nathi.
          </div>
        ) : (
          filteredCompanies.map((comp) => {
            const isActive = comp.is_active !== false;
            return (
              <div key={comp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', gap: '15px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  {/* Company Logo in List */}
                  {comp.logo_url && (
                    <img src={comp.logo_url} alt="" style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '2px', backgroundColor: '#f8fafc' }} />
                  )}
                  
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#0f172a', marginBottom: '6px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      {comp.company_name} 
                      <span style={{ fontSize: '11px', background: isActive ? '#dcfce7' : '#fee2e2', color: isActive ? '#166534' : '#9f1239', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                        {isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    
                    {/* Link & Quick Action Buttons (Copy, Share, Open) */}
                    <div style={{ fontSize: '13px', color: '#2563eb', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <a href={`https://${comp.subdomain}.tnjinfra.in`} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>
                        🌐 {comp.subdomain}.tnjinfra.in
                      </a>
                      
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleCopyLink(comp.subdomain)} title="Copy Link" style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px', color: '#334155' }}>
                          <Copy size={12} /> Copy
                        </button>
                        <button onClick={() => handleShareLink(comp.company_name, comp.subdomain)} title="Share Link" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px', color: '#2563eb' }}>
                          <Share2 size={12} /> Share
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', color: '#475569' }}>
                      <div><span style={{ fontWeight: '600' }}>GSTIN:</span> {comp.gstin || 'N/A'}</div>
                      <div><span style={{ fontWeight: '600' }}>Address:</span> {comp.address || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <button onClick={() => openEditModal(comp)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '6px 18px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#2563eb', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                    <Edit3 size={14} /> Edit
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Edit Company Modal */}
      {editingCompany && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                Edit Company: {editingCompany.company_name}
              </h2>
              <button onClick={() => setEditingCompany(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleUpdateCompany} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Company Name *</label>
                <input type="text" name="company_name" value={editForm.company_name} onChange={handleEditChange} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} required />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Subdomain *</label>
                <input type="text" name="subdomain" value={editForm.subdomain} onChange={handleEditChange} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} required placeholder="e.g. shreeinfra" />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>GSTIN *</label>
                <input type="text" name="gstin" value={editForm.gstin} onChange={handleEditChange} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} required />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Company Address *</label>
                <textarea name="address" rows="3" value={editForm.address} onChange={handleEditChange} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }} required />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Max Plants Limit (Subscription)</label>
                <input 
                  type="number" 
                  name="max_plants" 
                  value={editForm.max_plants} 
                  onChange={handleEditChange} 
                  style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} 
                  min="1"
                  required 
                />
              </div>

              {/* 🌟 Current Logo Preview & Change Option */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Company Logo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  {editForm.logo_url && (
                    <img src={editForm.logo_url} alt="Current Logo" style={{ width: '50px', height: '50px', objectFit: 'contain', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px', backgroundColor: '#f8fafc' }} />
                  )}
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Current Logo (Select new file below to replace)</span>
                </div>
                <input type="file" accept="image/*" onChange={(e) => setEditLogoFile(e.target.files[0])} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>

              {/* Status Toggle (Enable/Disable) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <input 
                  type="checkbox" 
                  name="is_active" 
                  id="is_active" 
                  checked={editForm.is_active} 
                  onChange={handleEditChange} 
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
                />
                <label htmlFor="is_active" style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', cursor: 'pointer' }}>
                  Company Active (Uncheck to Disable Login)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => deleteCompany(editingCompany.id, editingCompany.company_name)} style={{ padding: '8px 14px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
                  <Trash2 size={16} /> Delete
                </button>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setEditingCompany(null)} style={{ padding: '10px 18px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', color: '#475569', fontSize: '13px' }}>Cancel</button>
                  <button type="submit" style={{ padding: '10px 18px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }} disabled={updating}>{updating ? 'Updating...' : 'Save Changes'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Add New Company Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Add New Company & Admin</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={22} /></button>
            </div>

            <form onSubmit={handleAddCompany} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {error && <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Company Name *</label>
                <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} placeholder="e.g. ABC Infra" required />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>GSTIN *</label>
                <input type="text" name="gstin" value={formData.gstin} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} placeholder="24XXXXX1234X1ZX" required />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Company Address *</label>
                <textarea name="address" rows="3" value={formData.address} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }} placeholder="Enter complete company address..." required />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Company Logo</label>
                <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Recovery Email (For Password Reset)</label>
                <input type="email" name="recoveryEmail" value={formData.recoveryEmail} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} placeholder="client-recovery@gmail.com" />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Max Plants Limit (Subscription)</label>
                <input 
                  type="number" 
                  name="max_plants" 
                  value={formData.max_plants} 
                  onChange={handleChange} 
                  style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} 
                  placeholder="100" 
                  min="1"
                  required 
                />
              </div>

              <hr style={{ margin: '10px 0', border: '0', borderTop: '1px solid #e2e8f0' }} />
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Admin Owner Details</h3>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Admin Email *</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} placeholder="admin@abcinfra.com" required />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Admin Password *</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} placeholder="Enter password (min 6 chars)" required />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', color: '#475569' }} disabled={loading}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }} disabled={loading}>{loading ? 'Saving...' : 'Create Company'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}