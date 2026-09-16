import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldAlert, Send, Plus, Trash2 } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

export default function SiteMaterialDamage({ user }) {
  const [sitesList, setSitesList] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [dprDate, setDprDate] = useState(new Date().toISOString().split('T')[0]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);

  const [damageSources, setDamageSources] = useState([
    {
      id: 1,
      items: [
        { 
          id: 1, 
          material: '', 
          qty: '', 
          unit: 'Nos', 
          reason: '', 
          damageFile: null, 
          uploading: false 
        }
      ]
    }
  ]);

  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });
  const triggerAlert = (msg) => setAlertModal({ isOpen: true, message: msg });

  useEffect(() => {
    fetchSites();
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      fetchMaterialsMaster(selectedSiteId);
    } else {
      setMaterials([]);
    }
  }, [selectedSiteId]);

  const fetchSites = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = user?.email || session?.user?.email || localStorage.getItem('userEmail') || '';
      const userId = user?.id || session?.user?.id;
      
      if (userEmail === 'infra.tnj@gmail.com') {
        const { data } = await supabase.from('sites').select('*');
        setSitesList(data || []);
        return;
      }

      let permQuery = supabase.from('user_permissions').select('assigned_sites');
      if (userId) {
        permQuery = permQuery.eq('user_id', userId);
      } else {
        permQuery = permQuery.eq('user_id', userEmail);
      }

      const { data: permData, error: permError } = await permQuery.maybeSingle();

      if (permError || !permData || !permData.assigned_sites || permData.assigned_sites.length === 0) {
        const { data: allSites } = await supabase.from('sites').select('*');
        setSitesList(allSites || []);
        return;
      }

      const assignedSitesNames = permData.assigned_sites;
      const { data: allowedSitesData } = await supabase
        .from('sites')
        .select('*')
        .in('site_name', assignedSitesNames);

      setSitesList(allowedSitesData || []);
    } catch (err) {
      console.error('Error fetching sites:', err);
      const { data: fallbackSites } = await supabase.from('sites').select('*');
      setSitesList(fallbackSites || []);
    }
  };

  const fetchMaterialsMaster = async (siteId) => {
    try {
      const { data, error } = await supabase
        .from('site_materials_master')
        .select('*')
        .or(`plant_id.eq.${siteId},plant_id.is.null`);
      
      if (!error && data) {
        setMaterials(data);
      }
    } catch (err) {
      console.error("Master materials fetch error:", err);
    }
  };

  const handleSiteChange = (e) => {
    const siteName = e.target.value;
    setSelectedSite(siteName);
    const foundSite = sitesList.find(s => (s.site_name || s.name) === siteName);
    setSelectedSiteId(foundSite ? foundSite.id : '');
  };

  const handleDropdownClick = () => {
    if (!selectedSite) {
      triggerAlert("⚠️ કૃપા કરીને પહેલા ઉપરથી સાઇટ સિલેક્ટ કરો!");
      return false;
    }
    return true;
  };

  const removeDamageItem = (sIdx, iIdx) => {
    const updated = [...damageSources];
    updated[sIdx].items = updated[sIdx].items.filter((_, i) => i !== iIdx);
    setDamageSources(updated);
  };

  const handlePhotoUpload = async (sIdx, iIdx, file) => {
    if (!file) return;
    const updated = [...damageSources];
    updated[sIdx].items[iIdx].uploading = true;
    setDamageSources(updated);

    try {
      const fileExt = file.name.split('.').pop();
      const safeMat = (updated[sIdx].items[iIdx].material || 'Damage_Item').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `DAMAGE_${safeMat}_${Date.now()}.${fileExt}`;
      const filePath = `site_damage_material/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from('Plant')
        .upload(filePath, file);

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from('Plant')
        .getPublicUrl(filePath);

      updated[sIdx].items[iIdx].damageFile = urlData.publicUrl;
      triggerAlert("✅ ડેમેજ ફોટો સફળતાપૂર્વક અપલોડ થઈ ગયો છે!");
    } catch (err) {
      triggerAlert("Upload Error: " + err.message);
    } finally {
      updated[sIdx].items[iIdx].uploading = false;
      setDamageSources(updated);
    }
  };

  const handleSubmitDamage = async (e) => {
    e.preventDefault();
    if (!selectedSite) {
      triggerAlert("⚠️ કૃપા કરીને પહેલા સાઇટ સિલેક્ટ કરો!");
      return;
    }

    for (const source of damageSources) {
      for (const item of source.items) {
        if (!item.material || Number(item.qty) <= 0) {
          triggerAlert("⚠️ કૃપા કરીને મટીરિયલ અને સાચો જથ્થો (Qty) દાખલ કરો!");
          return;
        }
        if (!item.reason || item.reason.trim() === '') {
          triggerAlert("⚠️ ડેમેજ થવાનું કારણ (Reason) લખવું ફરજિયાત છે!");
          return;
        }
        if (!item.damageFile) {
          triggerAlert("⚠️ દરેક ડેમેજ આઇટમ માટે ફોટો અપલોડ કરવો ફરજિયાત છે!");
          return;
        }
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    const currentLoggedUser = session?.user?.email || session?.user?.id || user?.email || user?.id || 'Supervisor';

    setLoading(true);
    try {
      let materialLedgerRows = [];

      for (const source of damageSources) {
        for (const item of source.items) {
          const qtyVal = Number(item.qty);

          // 🌟 હવે ડેટા 'site_material_damage' ટેબલમાં સેવ થશે (આઉટવર્ડમાં નહીં)
          const { data: insertedData, error: insErr } = await supabase
            .from('site_material_damage')
            .insert([{
              date: dprDate,
              site_name: selectedSite,
              material_name: item.material,
              quantity: qtyVal,
              unit: item.unit,
              reason: item.reason,
              damage_file_url: item.damageFile,
              submitted_by: currentLoggedUser
            }])
            .select()
            .single();

          if (insErr) throw insErr;

          // 🌟 site_material_stock_ledger માં OUTWARD તરીકે એન્ટ્રી જેથી સ્ટોક માઇનસ થઈ જાય
          materialLedgerRows.push({
            date: dprDate,
            site_name: selectedSite,
            material_name: item.material,
            unit: item.unit || 'Nos',
            transaction_type: 'DAMAGE',
            qty: qtyVal,
            reference_id: insertedData.id
          });
        }
      }

      if (materialLedgerRows.length > 0) {
        const { error: ledgerErr } = await supabase
          .from('site_material_stock_ledger')
          .insert(materialLedgerRows);

        if (ledgerErr) throw ledgerErr;
      }

      triggerAlert("✅ મટીરિયલ ડેમેજ એન્ટ્રી સફળતાપૂર્વક સેવ થઈ ગઈ અને સ્ટોકમાંથી માઇનસ થઈ ગયું!");
      
      setDamageSources([
        {
          id: 1,
          items: [{ id: Date.now(), material: '', qty: '', unit: 'Nos', reason: '', damageFile: null, uploading: false }]
        }
      ]);

    } catch (err) {
      triggerAlert("એરર: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '650px', margin: '0 auto', paddingBottom: '20px', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', 
        padding: '14px 18px', 
        borderRadius: '16px', 
        border: '1px solid #fecaca', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)'
      }}>
        <div style={{ 
          backgroundColor: '#dc2626', 
          padding: '8px', 
          borderRadius: '10px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)'
        }}>
          <ShieldAlert size={20} color="#ffffff" strokeWidth={2.5} />
        </div>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#991b1b', margin: 0, letterSpacing: '0.2px' }}>
            SITE MATERIAL DAMAGE / LOSS
          </h3>
          <span style={{ fontSize: '11px', color: '#b91c1c', fontWeight: '600' }}>
            Report broken or damaged items and deduct from stock
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmitDamage} style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
        
        {/* Select Site Card */}
        <div style={{ 
          backgroundColor: '#ffffff', 
          padding: '16px 18px', 
          borderRadius: '16px', 
          border: '1px solid #e2e8f0', 
          display: 'flex', 
          gap: '14px', 
          alignItems: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)',
          boxSizing: 'border-box'
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
              Select Site *
            </label>
            <select 
              value={selectedSite} 
              onChange={handleSiteChange} 
              style={{ 
                width: '100%', 
                padding: '10px 12px', 
                borderRadius: '10px', 
                border: '1px solid #cbd5e1', 
                fontSize: '13px', 
                backgroundColor: '#f8fafc',
                fontWeight: '600',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box'
              }} 
              required
            >
              <option value="">-- Choose Site --</option>
              {sitesList.map(s => {
                const sName = s.site_name || s.name;
                return <option key={s.id} value={sName}>{sName}</option>;
              })}
            </select>
          </div>

          <div style={{ width: '140px', flexShrink: 0 }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
              Date *
            </label>
            <input 
              type="date" 
              value={dprDate} 
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDprDate(e.target.value)} 
              style={{ 
                width: '100%', 
                padding: '10px 10px', 
                borderRadius: '10px', 
                border: '1px solid #cbd5e1', 
                fontSize: '12px', 
                backgroundColor: '#f8fafc',
                fontWeight: '600',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box' 
              }} 
              required 
            />
          </div>
        </div>

        {/* MATERIAL DAMAGE SECTION */}
        <div style={{ backgroundColor: '#fff5f5', border: '1px solid #fecaca', borderRadius: '16px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px dashed #fca5a5', paddingBottom: '10px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#991b1b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              5. MATERIAL DAMAGE (મટીરિયલ ડેમેજ)
            </h4>
            <button 
              type="button" 
              onClick={() => {
                const updated = [...damageSources];
                updated[0].items.push({
                  id: Date.now(),
                  material: '',
                  qty: '',
                  unit: 'Nos',
                  reason: '',
                  damageFile: null,
                  uploading: false
                });
                setDamageSources(updated);
              }} 
              style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={14} /> Add Damage
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', boxSizing: 'border-box' }}>
            {damageSources.map((source, sIdx) => (
              <div key={source.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                {source.items.map((item, iIdx) => (
                  <div key={item.id} style={{ backgroundColor: '#fff', border: '1px solid #f87171', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 2px 4px rgba(220,38,38,0.04)', boxSizing: 'border-box', width: '100%' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#991b1b' }}>
                        Damage Item #{iIdx + 1}
                      </span>
                      {source.items.length > 1 && (
                        <button type="button" onClick={() => removeDamageItem(sIdx, iIdx)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Material, Qty, Unit Row */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
                      <select 
                        value={item.material || ''} 
                        onClick={handleDropdownClick}
                        onChange={(e) => {
                          const updated = [...damageSources];
                          updated[sIdx].items[iIdx].material = e.target.value;
                          setDamageSources(updated);
                        }} 
                        style={{ flex: 1.8, minWidth: 0, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}
                        required
                      >
                        <option value="">-- Select Material --</option>
                        {materials.map(m => (
                          <option key={`dmg-mat-${m.id}`} value={m.name}>{m.name}</option>
                        ))}
                      </select>

                      <input 
                        type="number" 
                        placeholder="Qty" 
                        value={item.qty} 
                        min="1"
                        onChange={(e) => {
                          const updated = [...damageSources];
                          updated[sIdx].items[iIdx].qty = e.target.value;
                          setDamageSources(updated);
                        }} 
                        style={{ flex: 0.8, minWidth: 0, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'center', boxSizing: 'border-box' }} 
                        required
                      />

                      <select 
                        value={item.unit} 
                        onChange={(e) => {
                          const updated = [...damageSources];
                          updated[sIdx].items[iIdx].unit = e.target.value;
                          setDamageSources(updated);
                        }} 
                        style={{ flex: 0.9, minWidth: 0, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                      >
                        <option value="Nos">Nos</option>
                        <option value="Bags">Bags</option>
                        <option value="Tons">Tons</option>
                        <option value="Kg">Kg</option>
                      </select>
                    </div>

                    {/* Reason Input */}
                    <div style={{ width: '100%', boxSizing: 'border-box' }}>
                      <input 
                        type="text" 
                        placeholder="Reason / Remarks (કારણ લખવું ફરજિયાત છે)" 
                        value={item.reason} 
                        onChange={(e) => {
                          const updated = [...damageSources];
                          updated[sIdx].items[iIdx].reason = e.target.value;
                          setDamageSources(updated);
                        }} 
                        style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #f87171', fontSize: '12px', backgroundColor: '#fff5f5', color: '#991b1b', boxSizing: 'border-box' }} 
                        required
                      />
                    </div>

                    {/* Upload Photo Box */}
                    <div style={{ border: '1px dashed #f87171', borderRadius: '10px', padding: '10px', backgroundColor: '#fff5f5', display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#991b1b' }}>
                        📷 UPLOAD DAMAGE PHOTO *
                      </span>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <input 
                          type="file" 
                          id={`damage-file-${sIdx}-${iIdx}`} 
                          accept="image/*" 
                          style={{ display: 'none' }}
                          onChange={(e) => handlePhotoUpload(sIdx, iIdx, e.target.files[0])} 
                        />
                        <label 
                          htmlFor={`damage-file-${sIdx}-${iIdx}`} 
                          style={{ backgroundColor: '#ffffff', color: '#334155', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          {item.uploading ? 'Uploading...' : 'Choose Files'}
                        </label>
                        <span style={{ fontSize: '11px', color: item.damageFile ? '#16a34a' : '#64748b', fontWeight: item.damageFile ? 'bold' : 'normal' }}>
                          {item.damageFile ? '✅ Photo Uploaded Successfully' : 'No file chosen'}
                        </span>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button 
          type="submit" 
          disabled={loading} 
          style={{ 
            backgroundColor: '#dc2626', 
            color: '#fff', 
            padding: '14px', 
            borderRadius: '12px', 
            border: 'none', 
            fontWeight: 'bold', 
            fontSize: '14px',
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            boxShadow: '0 4px 6px rgba(220,38,38,0.2)',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <Send size={16} /> 
          {loading ? 'Processing...' : 'Submit Damage & Deduct Stock'}
        </button>

      </form>

      <ConfirmModal
        isOpen={alertModal.isOpen}
        message={alertModal.message}
        singleButton={true}
        onConfirm={() => setAlertModal({ isOpen: false, message: '' })}
      />

    </div>
  );
}