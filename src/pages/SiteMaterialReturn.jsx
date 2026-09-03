import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RotateCcw, Send, Plus, Trash2 } from 'lucide-react';
import { COMPANY_LOGO_BASE64 } from '../services/logoConfig';

export default function SiteMaterialReturnPage({ user }) {
  const [plants, setPlants] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [parties, setParties] = useState([]);
  const [sites, setSites] = useState([]);
  const [products, setProducts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [transporters, setTransporters] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [recentReturns, setRecentReturns] = useState([]);

  const [returnSources, setReturnSources] = useState([
    {
      id: 1,
      party: '',
      site: '',
      returnNo: '',
      transporter: '',
      vehicleNumber: '',
      items: [{ id: 1, material: '', size: '', qty: '', unit: 'Nos', category: 'Finished Product', condition: 'Good', steelSpec: '' }]
    }
  ]);

  useEffect(() => {
    fetchPlants();
  }, []);

  useEffect(() => {
    if (selectedPlantId) {
      fetchMasters(selectedPlantId);
    } else {
      setParties([]);
      setSites([]);
      setProducts([]);
      setMaterials([]);
      setTransporters([]);
    }
  }, [selectedPlantId]);

  useEffect(() => {
    if (selectedPlant && typeof selectedPlant === 'string') {
      fetchRecentReturns();
    }
  }, [selectedPlant]);

  const fetchPlants = async () => {
    const { data } = await supabase.from('plants').select('*');
    setPlants(data || []);
  };

  const fetchMasters = async (plantId) => {
    const { data: partData } = await supabase.from('site_outward_parties').select('*').or(`plant_id.eq.${plantId},plant_id.is.null`);
    setParties(partData || []);
    
    const { data: siteData } = await supabase.from('sites').select('*').or(`plant_id.eq.${plantId},plant_id.is.null`);
    setSites(siteData || []);

    const { data: prodData } = await supabase.from('plant_work_descriptions').select('*').or(`plant_id.eq.${plantId},plant_id.is.null`);
    setProducts(prodData || []);

    const { data: matData } = await supabase.from('site_materials_master').select('*').or(`plant_id.eq.${plantId},plant_id.is.null`);
    setMaterials(matData || []);

    const { data: transData } = await supabase.from('site_transporters').select('*').or(`plant_id.eq.${plantId},plant_id.is.null`);
    setTransporters(transData || []);
  };

  const fetchRecentReturns = async () => {
    if (!selectedPlant) return;
    const { data } = await supabase
      .from('site_material_returns')
      .select('*')
      .eq('plant_name', selectedPlant)
      .order('created_at', { ascending: false })
      .limit(20);
    setRecentReturns(data || []);
  };

  const fetchNextReturnNumber = async (plantName) => {
    if (!plantName) return '';
    try {
      const { data, error } = await supabase
        .from('site_material_returns')
        .select('return_no')
        .eq('plant_name', plantName)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1001;
      if (data && data.length > 0 && data[0].return_no) {
        const lastNo = data[0].return_no;
        const match = lastNo.match(/\d+$/);
        if (match) {
          nextNumber = parseInt(match[0], 10) + 1;
        }
      }

      const plantPrefix = plantName.substring(0, 3).toUpperCase();
      return `RET-${plantPrefix}-${nextNumber}`;
    } catch (err) {
      console.error("Error fetching next Return No:", err);
      return `RET-${plantName.substring(0, 3).toUpperCase()}-1001`;
    }
  };

  const handlePlantChange = async (e) => {
    const plantName = e.target.value;
    setSelectedPlant(plantName);
    const foundPlant = plants.find(p => p.plant_name === plantName);
    const plantId = foundPlant ? foundPlant.id : '';
    setSelectedPlantId(plantId);

    if (plantName) {
      const nextRetNo = await fetchNextReturnNumber(plantName);
      setReturnSources(prev => prev.map(src => ({ ...src, returnNo: nextRetNo })));
    } else {
      setReturnSources(prev => prev.map(src => ({ ...src, returnNo: '' })));
    }
  };

  const handleDropdownClick = () => {
    if (!selectedPlant) {
      alert("⚠️ કૃપા કરીને પહેલા ઉપરથી પ્લાન્ટ સિલેક્ટ કરો!");
      return false;
    }
    return true;
  };

  const addReturnSource = async () => {
    let nextRetNo = '';
    if (selectedPlant) {
      nextRetNo = await fetchNextReturnNumber(selectedPlant);
    }

    setReturnSources([
      ...returnSources,
      {
        id: Date.now(),
        party: '',
        site: '',
        returnNo: nextRetNo,
        transporter: '',
        vehicleNumber: '',
        items: [{ id: Date.now(), material: '', size: '', qty: '', unit: 'Nos', category: 'Finished Product', condition: 'Good', steelSpec: '' }]
      }
    ]);
  };

  const updateReturnSource = (sIdx, field, val) => {
    const updated = [...returnSources];
    updated[sIdx][field] = val;
    setReturnSources(updated);
  };

  const addReturnItem = (sIdx) => {
    const updated = [...returnSources];
    updated[sIdx].items.push({ id: Date.now(), material: '', size: '', qty: '', unit: 'Nos', category: 'Finished Product', condition: 'Good', steelSpec: '' });
    setReturnSources(updated);
  };

  const updateReturnItem = (sIdx, iIdx, field, val) => {
    const updated = [...returnSources];
    updated[sIdx].items[iIdx][field] = val;
    setReturnSources(updated);
  };

  const removeReturnSource = (index) => setReturnSources(returnSources.filter((_, i) => i !== index));
  const removeReturnItem = (sIdx, iIdx) => {
    const updated = [...returnSources];
    updated[sIdx].items = updated[sIdx].items.filter((_, i) => i !== iIdx);
    setReturnSources(updated);
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    if (!selectedPlant) {
      alert("કૃપા કરીને પહેલા પ્લાન્ટ સિલેક્ટ કરો!");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const currentLoggedUser = session?.user?.email || session?.user?.id || user?.email || user?.id || 'Supervisor';

    setLoading(true);
    try {
      let stockLedgerRows = [];

      for (const source of returnSources) {
        for (const item of source.items) {
          if (item.qty && item.material) {
            const qtyVal = Number(item.qty);
            let exactProductName = item.material.trim();
            let exactSize = item.size ? item.size.trim() : '';
            let finalSizeVariant = exactSize || 'Standard';

            let fullMatName = exactProductName;
            if (exactSize) fullMatName += ` ${exactSize}`;
            if (item.steelSpec) {
              fullMatName += ` (${item.steelSpec})`;
              finalSizeVariant = exactSize ? `${exactSize} (${item.steelSpec})` : item.steelSpec;
            }

            // ૧. Supabase ના 'site_material_returns' ટેબલમાં એન્ટ્રી સેવ કરો
            const { data: insertedReturn, error: insErr } = await supabase.from('site_material_returns').insert([
              {
                date: returnDate,
                plant_name: selectedPlant,
                return_no: source.returnNo || 'EMPTY',
                party_name: source.party,
                site_name: source.site,
                transporter_name: source.transporter || 'EMPTY',
                vehicle_no: source.vehicleNumber || 'EMPTY',
                material_name: fullMatName,
                item_type: item.category,
                condition: item.condition, // 'Good' અથવા 'Broken'
                quantity: qtyVal,
                unit: item.unit,
                submitted_by: currentLoggedUser
              }
            ]).select().single();

            if (insErr) throw insErr;

            // ૨. 🎯 સ્ટૉક લેજર માટે લોજિક (Good હોય તો INWARD, Broken હોય તો BROKEN)
            if (item.category === 'Finished Product' && insertedReturn) {
              const transType = item.condition === 'Broken' ? 'BROKEN' : 'INWARD';
              
              stockLedgerRows.push({
                date: returnDate,
                plant_name: selectedPlant,
                product_name: exactProductName,
                size_variant: finalSizeVariant,
                transaction_type: transType, 
                qty: qtyVal,
                reference_id: insertedReturn.id
              });
            }
          }
        }
      }

      // ૩. લેજરમાં ઇન્સર્ટ કરો
      if (stockLedgerRows.length > 0) {
        const { error: stockErr } = await supabase.from('stock_ledger').insert(stockLedgerRows);
        if (stockErr) throw stockErr;
      }

      alert("✅ સાઇટ મટીરિયલ રિટર્ન સફળતાપૂર્વક સેવ થઈ ગયું છે!");

      let nextRetNo = '';
      if (selectedPlant) {
        nextRetNo = await fetchNextReturnNumber(selectedPlant);
      }

      setReturnSources([
        {
          id: Date.now(),
          party: '',
          site: '',
          returnNo: nextRetNo,
          transporter: '',
          vehicleNumber: '',
          items: [{ id: Date.now(), material: '', size: '', qty: '', unit: 'Nos', category: 'Finished Product', condition: 'Good', steelSpec: '' }]
        }
      ]);

      fetchRecentReturns();

    } catch (err) {
      alert("એરર: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReturnSlip = async (returnNo, partyName, siteName, vehicleNo, transName, entryDate, submittedUser) => {
    try {
      const { data: allRows, error } = await supabase
        .from('site_material_returns')
        .select('*')
        .eq('plant_name', selectedPlant)
        .eq('return_no', returnNo);

      if (error) throw error;

      const itemsArray = allRows && allRows.length > 0 ? allRows : [];

      const itemsTableRows = itemsArray.length > 0 
        ? itemsArray.map((it, idx) => `
            <tr>
              <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 12px;">${idx + 1}</td>
              <td style="border: 1px solid #000; padding: 6px; font-size: 12px; font-weight: 600;">${it.material_name}</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: center; color: ${it.condition === 'Broken' ? 'red' : 'green'}; font-weight: bold; font-size: 12px;">${it.condition}</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 12px;">${it.unit}</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold; font-size: 12px;">${it.quantity}</td>
            </tr>
          `).join('')
        : `<tr><td colspan="5" style="text-align: center; padding: 10px;">No items found</td></tr>`;

      const printWindow = window.open('', '_blank', 'width=1000,height=750');
      if (!printWindow) {
        alert("કૃપા કરીને પૉપ-અપ બ્લોકર બંધ કરો.");
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Material Return Slip - ${returnNo}</title>
            <style>
              body { font-family: 'Arial', sans-serif; color: #000; margin: 0; padding: 10px; background: #fff; }
              .page-border { border: 2px solid #000; padding: 10px 10px 45px 10px; position: relative; min-height: 94vh; box-sizing: border-box; }
              .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 450px; opacity: 0.08; z-index: 0; pointer-events: none; }
              .content-wrapper { position: relative; z-index: 1; }
              .letterhead-table { width: 100%; border-collapse: collapse; border-bottom: 2px solid #000; margin-bottom: 5px; }
              .letterhead-table td { border: none; padding: 4px 5px; vertical-align: middle; }
              .address-box { border: 1px solid #000; border-top: none; padding: 5px 10px; font-size: 11px; font-weight: bold; background: #f8fafc; text-align: center; }
              .title-box { text-align: center; background: #fee2e2; border: 1px solid #000; padding: 6px; font-size: 14px; font-weight: bold; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 1px; color: #991b1b; }
              .details-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; table-layout: fixed; }
              .details-table td { border: 1px solid #000; padding: 10px 14px; vertical-align: top; line-height: 1.6; word-break: break-word; }
              table.main-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
              th { background-color: #f1f5f9; color: #000; border: 1px solid #000; padding: 6px; text-align: center; font-size: 12px; }
              .footer-table { width: 100%; border-collapse: collapse; margin-top: 50px; font-size: 12px; }
              .footer-table td { border: none; padding: 10px; font-weight: bold; }
              .generated-by { position: absolute; bottom: 10px; right: 15px; font-size: 9px; color: #64748b; font-style: italic; }
            </style>
          </head>
          <body>
            <div class="page-border">
              <img src="${COMPANY_LOGO_BASE64}" class="watermark" alt="Watermark" />
              <div class="content-wrapper">
                <table class="letterhead-table">
                  <tr>
                    <td style="width: 155px; text-align: left;"><img src="${COMPANY_LOGO_BASE64}" alt="Logo" style="height: 100px; width: auto; object-fit: contain;" /></td>
                    <td style="text-align: center;">
                      <h1 style="font-size: 36px; font-weight: 800; color: #a32a2a; margin: 0;">T&J INFRA</h1>
                      <p style="font-size: 9px; color: #a32a2a; font-weight: bold; margin: 2px 0 0 0;">(AN ISO 9001:2015, 14001:2015, 45001:2018 CERTIFIED COMPANY)</p>
                    </td>
                  </tr>
                </table>
                <div class="address-box">Corporate Address: 404, Gala Magnus, Safal Parisar Road, South Bopal, Ahmedabad, Gujarat - 380057</div>
                <div class="title-box">Site Material Return Slip</div>
                <table class="details-table">
                  <tr>
                    <td style="width: 50%;">
                      <div><b>Return No:</b> ${returnNo}</div>
                      <div><b>Party Name:</b> ${partyName || '-'}</div>
                      <div><b>Site Name:</b> ${siteName || '-'}</div>
                    </td>
                    <td style="width: 50%;">
                      <div><b>Date:</b> ${entryDate}</div>
                      <div><b>Transporter:</b> ${transName && transName !== 'EMPTY' ? transName : '-'}</div>
                      <div><b>Vehicle No:</b> ${vehicleNo && vehicleNo !== 'EMPTY' ? vehicleNo : '-'}</div>
                    </td>
                  </tr>
                </table>
                <table class="main-table">
                  <thead>
                    <tr>
                      <th>Sr No</th>
                      <th>Material Description</th>
                      <th>Condition</th>
                      <th>UOM</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsTableRows}
                  </tbody>
                </table>
                <table class="footer-table">
                  <tr>
                    <td>Receiver's Signature (Plant)</td>
                    <td style="text-align: right;">Authorized Signatory</td>
                  </tr>
                </table>
              </div>
              <div class="generated-by">Generated by: ${submittedUser || 'System User'}</div>
            </div>
            <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error("Print Error:", err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '650px', margin: '0 auto', paddingBottom: '20px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', 
        padding: '14px 18px', 
        borderRadius: '16px', 
        border: '1px solid #e9d5ff', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px',
        boxShadow: '0 4px 12px rgba(147, 51, 234, 0.08)'
      }}>
        <div style={{ backgroundColor: '#9333ea', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RotateCcw size={20} color="#ffffff" strokeWidth={2.5} />
        </div>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#6b21a8', margin: 0 }}>4. SITE RETURN</h3>
          <span style={{ fontSize: '11px', color: '#7e22ce', fontWeight: '600' }}>Receive damaged/extra goods from site</span>
        </div>
      </div>

      <form onSubmit={handleSubmitReturn} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Plant & Date Selection */}
        <div style={{ backgroundColor: '#ffffff', padding: '16px 18px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', gap: '14px', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Select Plant *</label>
            <select value={selectedPlant} onChange={handlePlantChange} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#f8fafc', fontWeight: '600' }} required>
              <option value="">-- Choose Plant --</option>
              {plants.map(p => <option key={p.id} value={p.plant_name}>{p.plant_name}</option>)}
            </select>
          </div>
          <div style={{ width: '140px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Date *</label>
            <input type="date" value={returnDate} max={new Date().toISOString().split('T')[0]} onChange={(e) => setReturnDate(e.target.value)} style={{ width: '100%', padding: '10px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#f8fafc', fontWeight: '600' }} required />
          </div>
        </div>

        {/* Material Return Section */}
        <div style={{ backgroundColor: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '16px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px dashed #d8b4fe', paddingBottom: '10px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#7e22ce', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RotateCcw size={18} /> MATERIAL RETURN (મટીરિયલ પાછું આવ્યું)
            </h4>
            <button type="button" onClick={addReturnSource} style={{ backgroundColor: '#9333ea', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={14} /> Add Source
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {returnSources.map((source, sIndex) => {
              const selectedPartyName = (source.party || '').trim();
              const partySites = sites.filter(s => (s.party_name || s.party || '').trim().toLowerCase() === selectedPartyName.toLowerCase());
              const isCustomParty = source.party === 'OTHER_PARTY_MANUAL' || (source.party && !parties.some(p => (typeof p === 'string' ? p : (p.party_name || p.name)) === source.party));

              const isCustomTransporter = source.transporter === 'OTHER_TRANSPORTER_MANUAL' || (source.transporter && !transporters.some(t => t.transporter_name === source.transporter));

              return (
                <div key={source.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: sIndex < returnSources.length - 1 ? '2px solid #e9d5ff' : 'none', paddingBottom: sIndex < returnSources.length - 1 ? '16px' : '0' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', backgroundColor: '#f3e8ff', color: '#7e22ce', padding: '4px 10px', borderRadius: '6px', border: '1px solid #d8b4fe' }}>
                      📄 Return No: {source.returnNo || 'Loading...'}
                    </span>
                    {returnSources.length > 1 && (
                      <button type="button" onClick={() => removeReturnSource(sIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Remove Source</button>
                    )}
                  </div>

                  {/* Party & Site */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                    <div style={{ flex: 1 }}>
                      <select 
                        value={isCustomParty ? 'OTHER_PARTY_MANUAL' : (source.party || '')} 
                        onClick={handleDropdownClick} 
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'OTHER_PARTY_MANUAL') {
                            updateReturnSource(sIndex, 'party', 'OTHER_PARTY_MANUAL');
                          } else {
                            updateReturnSource(sIndex, 'party', val);
                          }
                          updateReturnSource(sIndex, 'site', '');
                        }} 
                        style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}
                      >
                        <option value="">-- Select Party / Client --</option>
                        {parties.map((p, idx) => {
                          const pName = typeof p === 'string' ? p : (p.party_name || p.name);
                          return <option key={`party-${idx}`} value={pName}>{pName}</option>;
                        })}
                        <option value="OTHER_PARTY_MANUAL" style={{ fontWeight: 'bold', color: '#9333ea' }}>➕ Other (Type Manually...)</option>
                      </select>

                      {isCustomParty && (
                        <input 
                          type="text" 
                          placeholder="Type custom party name..." 
                          value={source.party === 'OTHER_PARTY_MANUAL' ? '' : source.party} 
                          onChange={(e) => updateReturnSource(sIndex, 'party', e.target.value)} 
                          autoFocus
                          style={{ width: '100%', marginTop: '5px', padding: '7px', borderRadius: '6px', border: '1px solid #9333ea', fontSize: '11px', backgroundColor: '#faf5ff', boxSizing: 'border-box' }} 
                        />
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      {isCustomParty ? (
                        <input 
                          type="text" 
                          placeholder="Type site name manually..." 
                          value={source.site} 
                          onChange={(e) => updateReturnSource(sIndex, 'site', e.target.value)} 
                          style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #9333ea', fontSize: '11px', backgroundColor: '#faf5ff', boxSizing: 'border-box' }} 
                        />
                      ) : (
                        <select value={source.site} onClick={handleDropdownClick} onChange={(e) => updateReturnSource(sIndex, 'site', e.target.value)} style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                          <option value="">-- Select Site --</option>
                          {partySites.map((s, idx) => {
                            const sName = typeof s === 'string' ? s : (s.name || s.site_name);
                            return <option key={`site-${idx}`} value={sName}>{sName}</option>;
                          })}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Items list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {source.items.map((item, iIndex) => {
                      const currentCategory = item.category || 'Finished Product';
                      const isFinishedProduct = currentCategory === 'Finished Product';
                      const uniqueProductNames = [...new Set(products.map(p => p.name))];
                      
                      const filteredMaterials = materials.filter(m => {
                        if (!m.item_type) return true;
                        return m.item_type.toLowerCase().trim() === currentCategory.toLowerCase().trim() ||
                               m.item_type.toLowerCase().includes(currentCategory.toLowerCase().split(' ')[0]);
                      });

                      const isCustomItem = item.material === 'OTHER_MANUAL' || (item.material && !isFinishedProduct && !filteredMaterials.some(m => m.name.trim().toLowerCase() === item.material.trim().toLowerCase())) || (item.material && isFinishedProduct && !uniqueProductNames.map(n => n.trim().toLowerCase()).includes(item.material.trim().toLowerCase()));

                      const isPanel = item.material && item.material.toLowerCase().includes('panel');
                      const isColumn = item.material && item.material.toLowerCase().includes('column');

                      return (
                        <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: '#fff', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                          
                          {/* Category Select */}
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'space-between' }}>
                            <select 
                              value={item.category || 'Finished Product'} 
                              onChange={(e) => {
                                updateReturnItem(sIndex, iIndex, 'category', e.target.value);
                                updateReturnItem(sIndex, iIndex, 'material', '');
                                updateReturnItem(sIndex, iIndex, 'size', '');
                              }} 
                              style={{ flex: 1, padding: '5px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#f3e8ff', fontWeight: 'bold', color: '#7e22ce' }}
                            >
                              <option value="Finished Product">1. Finished Product</option>
                              <option value="Raw Material">2. Raw Material</option>
                              <option value="Consumable Item">3. Consumable Item</option>
                              <option value="Tools and Hardware">4. Tools and Hardware</option>
                            </select>

                            {source.items.length > 1 && (
                              <button type="button" onClick={() => removeReturnItem(sIndex, iIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}>
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            
                            {/* Material Dropdown */}
                            <select 
                              value={isCustomItem ? 'OTHER_MANUAL' : (item.material || '')} 
                              onClick={handleDropdownClick} 
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'OTHER_MANUAL') {
                                  updateReturnItem(sIndex, iIndex, 'material', 'OTHER_MANUAL');
                                } else {
                                  updateReturnItem(sIndex, iIndex, 'material', val);
                                }
                                updateReturnItem(sIndex, iIndex, 'size', '');
                                updateReturnItem(sIndex, iIndex, 'steelSpec', '');
                              }} 
                              style={{ flex: '1.2', minWidth: '120px', padding: '7px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}
                            >
                              <option value="">-- Select Material --</option>
                              {isFinishedProduct ? (
                                Array.from(new Map(products.map(p => [p.name ? p.name.trim().toLowerCase() : '', p.name ? p.name.trim() : ''])).values()).map((prodName, idx) => (
                                  <option key={`prod-${idx}`} value={prodName}>{prodName}</option>
                                ))
                              ) : (
                                filteredMaterials.map(m => <option key={`m-${m.id}`} value={m.name}>{m.name}</option>)
                              )}
                              <option value="OTHER_MANUAL" style={{ fontWeight: 'bold', color: '#9333ea' }}>➕ Other...</option>
                            </select>

                            {/* Size Dropdown / Input */}
                            {isFinishedProduct && (
                              isCustomItem ? (
                                <input 
                                  type="text" 
                                  placeholder="Type size..." 
                                  value={item.size || ''} 
                                  onChange={(e) => updateReturnItem(sIndex, iIndex, 'size', e.target.value)} 
                                  style={{ flex: '0.8', minWidth: '80px', padding: '7px 4px', borderRadius: '6px', border: '1px solid #9333ea', fontSize: '11px', backgroundColor: '#faf5ff', boxSizing: 'border-box' }} 
                                />
                              ) : (
                                <select 
                                  value={item.size || ''} 
                                  onChange={(e) => updateReturnItem(sIndex, iIndex, 'size', e.target.value)} 
                                  style={{ flex: '0.9', minWidth: '90px', padding: '7px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#f8fafc', fontWeight: 'bold', boxSizing: 'border-box' }}
                                >
                                  <option value="">-- Size --</option>
                                  {products.filter(p => p.name && item.material && p.name.trim().toLowerCase() === item.material.trim().toLowerCase() && p.product_size).map((p, sIdx) => (
                                    <option key={`sz-${sIdx}`} value={p.product_size}>{p.product_size}</option>
                                  ))}
                                </select>
                              )
                            )}

                            {/* Condition */}
                            <select value={item.condition} onChange={(e) => updateReturnItem(sIndex, iIndex, 'condition', e.target.value)} style={{ flex: '0.9', minWidth: '90px', padding: '7px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 'bold', color: item.condition === 'Broken' ? '#dc2626' : '#16a34a', boxSizing: 'border-box' }}>
                              <option value="Good">🟢 Good</option>
                              <option value="Broken">🔴 Broken</option>
                            </select>

                            {/* Qty Input */}
                            <input 
                              type="number" 
                              placeholder="Qty" 
                              value={item.qty} 
                              onChange={(e) => updateReturnItem(sIndex, iIndex, 'qty', e.target.value)} 
                              style={{ width: '60px', minWidth: '60px', padding: '7px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', textAlign: 'center', boxSizing: 'border-box' }} 
                            />

                            {/* Unit Select */}
                            <select 
                              value={item.unit} 
                              onChange={(e) => updateReturnItem(sIndex, iIndex, 'unit', e.target.value)} 
                              style={{ width: '70px', minWidth: '70px', padding: '7px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }}
                            >
                              <option value="Nos">Nos</option>
                              <option value="Tons">Tons</option>
                              <option value="Bags">Bags</option>
                              <option value="Kg">Kg</option>
                            </select>

                          </div>

                          {/* Custom Material Input */}
                          {isCustomItem && (
                            <input 
                              type="text" 
                              placeholder="Type custom material name..." 
                              value={item.material === 'OTHER_MANUAL' ? '' : item.material} 
                              onChange={(e) => updateReturnItem(sIndex, iIndex, 'material', e.target.value)} 
                              autoFocus
                              style={{ width: '100%', marginTop: '4px', padding: '7px', borderRadius: '6px', border: '1px solid #9333ea', fontSize: '11px', backgroundColor: '#faf5ff', boxSizing: 'border-box' }} 
                            />
                          )}

                          {/* Column Spec */}
                          {isColumn && (
                            <div style={{ backgroundColor: '#f8fafc', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#334155' }}>🛠️ Column Spec:</span>
                              <select value={item.steelSpec || ''} onChange={(e) => updateReturnItem(sIndex, iIndex, 'steelSpec', e.target.value)} style={{ flex: 1, padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff' }}>
                                <option value="">-- Select Column Steel Spec --</option>
                                <optgroup label="Dia 3mm">
                                  <option value="3mm - 5 wires">3mm - 5 wires</option>
                                  <option value="3mm - 7 wires">3mm - 7 wires</option>
                                  <option value="3mm - 10 wires">3mm - 10 wires</option>
                                </optgroup>
                                <optgroup label="Dia 4mm">
                                  <option value="4mm - 5 wires">4mm - 5 wires</option>
                                  <option value="4mm - 7 wires">4mm - 7 wires</option>
                                  <option value="4mm - 10 wires">4mm - 10 wires</option>
                                </optgroup>
                              </select>
                            </div>
                          )}

                          {/* Panel Spec */}
                          {isPanel && (
                            <div style={{ backgroundColor: '#f8fafc', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#334155' }}>🛠️ Panel Spec:</span>
                              <select value={item.steelSpec || ''} onChange={(e) => updateReturnItem(sIndex, iIndex, 'steelSpec', e.target.value)} style={{ flex: 1, padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff' }}>
                                <option value="">-- Select Panel Steel Spec --</option>
                                <optgroup label="Dia 3mm">
                                  <option value="3mm - 3 wires">3mm - 3 wires</option>
                                  <option value="3mm - 4 wires">3mm - 4 wires</option>
                                </optgroup>
                                <optgroup label="Dia 4mm">
                                  <option value="4mm - 3 wires">4mm - 3 wires</option>
                                  <option value="4mm - 4 wires">4mm - 4 wires</option>
                                </optgroup>
                              </select>
                            </div>
                          )}

                        </div>
                      );
                    })}

                    <button type="button" onClick={() => addReturnItem(sIndex)} style={{ backgroundColor: 'transparent', color: '#9333ea', border: '1px dashed #9333ea', padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', width: 'fit-content' }}>
                      + Add Item
                    </button>
                  </div>

                  {/* Transporter & Vehicle No */}
                  <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', marginTop: '4px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <select 
                          value={isCustomTransporter ? 'OTHER_TRANSPORTER_MANUAL' : (source.transporter || '')} 
                          onClick={handleDropdownClick} 
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'OTHER_TRANSPORTER_MANUAL') {
                              updateReturnSource(sIndex, 'transporter', 'OTHER_TRANSPORTER_MANUAL');
                              updateReturnSource(sIndex, 'vehicleNumber', '');
                            } else {
                              updateReturnSource(sIndex, 'transporter', val);
                              updateReturnSource(sIndex, 'vehicleNumber', '');
                            }
                          }} 
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}
                        >
                          <option value="">-- Select Transporter --</option>
                          {transporters.map(t => (
                            <option key={`trans-${t.id}`} value={t.transporter_name}>{t.transporter_name}</option>
                          ))}
                          <option value="OTHER_TRANSPORTER_MANUAL" style={{ fontWeight: 'bold', color: '#9333ea' }}>➕ Other (Type Manually...)</option>
                        </select>
                      </div>

                      <div style={{ flex: 1 }}>
                        {isCustomTransporter ? (
                          <input 
                            type="text" 
                            placeholder="Type vehicle number..." 
                            value={source.vehicleNumber || ''} 
                            onChange={(e) => updateReturnSource(sIndex, 'vehicleNumber', e.target.value)} 
                            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #9333ea', fontSize: '12px', backgroundColor: '#faf5ff', boxSizing: 'border-box' }} 
                          />
                        ) : (
                          <select value={source.vehicleNumber || ''} onClick={handleDropdownClick} onChange={(e) => updateReturnSource(sIndex, 'vehicleNumber', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                            <option value="">-- Select Vehicle Number --</option>
                            {transporters.filter(t => t.transporter_name === source.transporter).flatMap(t => Array.isArray(t.vehicles_list) ? t.vehicles_list.map(v => v.vehicleNo).filter(Boolean) : []).map((vehNo, vIdx) => (
                              <option key={`veh-${vIdx}`} value={vehNo}>{vehNo}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    {isCustomTransporter && (
                      <input 
                        type="text" 
                        placeholder="Type custom transporter name..." 
                        value={source.transporter === 'OTHER_TRANSPORTER_MANUAL' ? '' : source.transporter} 
                        onChange={(e) => updateReturnSource(sIndex, 'transporter', e.target.value)} 
                        autoFocus
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #9333ea', fontSize: '12px', backgroundColor: '#faf5ff', boxSizing: 'border-box' }} 
                      />
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <button type="submit" disabled={loading} style={{ backgroundColor: '#9333ea', color: '#fff', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Send size={16} /> {loading ? 'Processing...' : 'Submit Material Return'}
        </button>
      </form>

      {/* Recent Return History */}
      {recentReturns.length > 0 && (() => {
        const groupedReturnMap = {};
        
        recentReturns.forEach((item) => {
          const retKey = (item.return_no && item.return_no !== 'EMPTY') ? item.return_no : `single-${item.id}`;
          
          if (!groupedReturnMap[retKey]) {
            groupedReturnMap[retKey] = {
              ...item,
              combinedMaterials: [`${item.material_name} (${item.quantity} ${item.unit} - ${item.condition})`]
            };
          } else {
            groupedReturnMap[retKey].combinedMaterials.push(`${item.material_name} (${item.quantity} ${item.unit} - ${item.condition})`);
          }
        });

        const groupedReturnList = Object.values(groupedReturnMap);

        return (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '8px', paddingLeft: '4px' }}>
              Recent Return History
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {groupedReturnList.map((item) => {
                let displayDate = item.date || '';
                if (displayDate) {
                  if (displayDate.includes('-') && displayDate.indexOf('-') === 4) {
                    const p = displayDate.split('-');
                    if (p.length === 3) displayDate = `${p[2]}/${p[1]}/${p[0]}`;
                  }
                }

                return (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div>
                      <span style={{ fontWeight: 'bold', color: '#9333ea' }}>
                        {item.combinedMaterials.join(', ')}
                      </span> 
                      - <span style={{ color: '#64748b' }}>{item.party_name} ({item.site_name})</span>
                      
                      <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                        Return No: {item.return_no || 'EMPTY'} | Date: {displayDate}
                      </div>
                    </div>

                    <button 
                      type="button"
                      onClick={() => handlePrintReturnSlip(
                        item.return_no, 
                        item.party_name, 
                        item.site_name, 
                        item.vehicle_no, 
                        item.transporter_name, 
                        displayDate, 
                        item.submitted_by
                      )}
                      style={{ fontSize: '11px', fontWeight: 'bold', color: '#9333ea', backgroundColor: '#faf5ff', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #e9d5ff', whiteSpace: 'nowrap', marginLeft: '10px' }}
                    >
                      🖨️ Print Slip
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

    </div>
  );
}