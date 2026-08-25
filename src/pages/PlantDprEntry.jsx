import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ClipboardList, Send, ArrowDownRight, ArrowUpRight, Factory, History, Plus, Trash2 } from 'lucide-react';

function PlantDprEntry({ user }) {
  const [plants, setPlants] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState('');
  const [dprDate, setDprDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Master lists for dropdowns
  const [suppliers, setSuppliers] = useState([]);
  const [parties, setParties] = useState([]);
  const [labours, setLabours] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [products, setProducts] = useState([]);

  // 1. Production State (Source & Labour pattern like Inward/Outward)
  const [productionSources, setProductionSources] = useState([
    {
      id: 1,
      labour: '',
      shift: 'Day',
      items: [{ id: 1, product: '', qty: '' }],
      remarks: '' // 👈 Remarks હવે સોર્સ દીઠ ફક્ત છેલ્લે એક જ વાર રહેશે
    }
  ]);

  // 2. Inward State
  const [inwardSources, setInwardSources] = useState([
    {
      id: 1,
      supplier: '',
      dcNumber: '',
      vehicleNumber: '',
      items: [{ id: 1, material: '', qty: '', unit: 'Bags' }]
    }
  ]);

  // 3. Outward State
  const [outwardSources, setOutwardSources] = useState([
    {
      id: 1,
      party: '',
      dcNumber: '',
      vehicleNumber: '',
      items: [{ id: 1, material: '', qty: '', unit: 'Tons' }]
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [recentEntries, setRecentEntries] = useState([]);

  useEffect(() => {
    fetchPlants();
    fetchMasters();
    fetchRecentEntries();
  }, []);

  const fetchPlants = async () => {
    const { data } = await supabase.from('plants').select('*');
    setPlants(data || []);
  };

  const fetchMasters = async () => {
    const { data: supData } = await supabase.from('plant_suppliers').select('*');
    setSuppliers(supData || []);

    const { data: partData } = await supabase.from('plant_parties').select('*');
    setParties(partData || []);

    const { data: labData } = await supabase.from('plant_labours').select('*');
    setLabours(labData || []);

    const { data: matData } = await supabase.from('plant_materials_master').select('*');
    setMaterials(matData || []);

    const { data: prodData } = await supabase.from('plant_work_descriptions').select('*');
    setProducts(prodData || []);
  };

  const fetchRecentEntries = async () => {
    const { data } = await supabase
      .from('plant_dpr_entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    setRecentEntries(data || []);
  };

  // --- Production Handlers ---
  const addProductionSource = () => setProductionSources([...productionSources, { id: Date.now(), labour: '', shift: 'Day', items: [{ id: Date.now(), product: '', qty: '' }], remarks: '' }]);
  const removeProductionSource = (index) => setProductionSources(productionSources.filter((_, i) => i !== index));
  const updateProductionSource = (sIdx, field, val) => {
    const updated = [...productionSources];
    updated[sIdx][field] = val;
    setProductionSources(updated);
  };
  const addProductionItem = (sIdx) => {
    const updated = [...productionSources];
    updated[sIdx].items.push({ id: Date.now(), product: '', qty: '' });
    setProductionSources(updated);
  };
  const removeProductionItem = (sIdx, iIdx) => {
    const updated = [...productionSources];
    updated[sIdx].items = updated[sIdx].items.filter((_, i) => i !== iIdx);
    setProductionSources(updated);
  };
  const updateProductionItem = (sIdx, iIdx, field, val) => {
    const updated = [...productionSources];
    updated[sIdx].items[iIdx][field] = val;
    setProductionSources(updated);
  };

  // --- Inward Handlers ---
  const addInwardSource = () => setInwardSources([...inwardSources, { id: Date.now(), supplier: '', dcNumber: '', vehicleNumber: '', items: [{ id: Date.now(), material: '', qty: '', unit: 'Bags' }] }]);
  const removeInwardSource = (index) => setInwardSources(inwardSources.filter((_, i) => i !== index));
  const updateInwardSource = (sIdx, field, val) => {
    const updated = [...inwardSources];
    updated[sIdx][field] = val;
    setInwardSources(updated);
  };
  const addInwardItem = (sIdx) => {
    const updated = [...inwardSources];
    updated[sIdx].items.push({ id: Date.now(), material: '', qty: '', unit: 'Bags' });
    setInwardSources(updated);
  };
  const removeInwardItem = (sIdx, iIdx) => {
    const updated = [...inwardSources];
    updated[sIdx].items = updated[sIdx].items.filter((_, i) => i !== iIdx);
    setInwardSources(updated);
  };
  const updateInwardItem = (sIdx, iIdx, field, val) => {
    const updated = [...inwardSources];
    updated[sIdx].items[iIdx][field] = val;
    setInwardSources(updated);
  };

  // --- Outward Handlers ---
  const addOutwardSource = () => setOutwardSources([...outwardSources, { id: Date.now(), party: '', dcNumber: '', vehicleNumber: '', items: [{ id: Date.now(), material: '', qty: '', unit: 'Tons' }] }]);
  const removeOutwardSource = (index) => setOutwardSources(outwardSources.filter((_, i) => i !== index));
  const updateOutwardSource = (sIdx, field, val) => {
    const updated = [...outwardSources];
    updated[sIdx][field] = val;
    setOutwardSources(updated);
  };
  const addOutwardItem = (sIdx) => {
    const updated = [...outwardSources];
    updated[sIdx].items.push({ id: Date.now(), material: '', qty: '', unit: 'Tons' });
    setOutwardSources(updated);
  };
  const removeOutwardItem = (sIdx, iIdx) => {
    const updated = [...outwardSources];
    updated[sIdx].items = updated[sIdx].items.filter((_, i) => i !== iIdx);
    setOutwardSources(updated);
  };
  const updateOutwardItem = (sIdx, iIdx, field, val) => {
    const updated = [...outwardSources];
    updated[sIdx].items[iIdx][field] = val;
    setOutwardSources(updated);
  };

  // Master Submit Handler
  const handleSubmitAll = async (e) => {
    e.preventDefault();
    if (!selectedPlant) {
      alert("કૃપા કરીને પહેલા પ્લાન્ટ સિલેક્ટ કરો!");
      return;
    }

    setLoading(true);
    try {
      let allRowsToInsert = [];

      // 1. Production Rows
      for (const source of productionSources) {
        for (const item of source.items) {
          if (item.qty && item.product) {
            allRowsToInsert.push({
              plant_name: selectedPlant,
              dpr_date: dprDate,
              entry_type: 'production',
              material_name: item.product,
              quantity: Number(item.qty),
              party_name: source.labour,
              remarks: source.remarks,
              unit: 'Pcs',
              submitted_by: user?.email || 'Supervisor'
            });
          }
        }
      }

      // 2. Inward Rows
      for (const source of inwardSources) {
        for (const item of source.items) {
          if (item.qty && item.material) {
            allRowsToInsert.push({
              plant_name: selectedPlant,
              dpr_date: dprDate,
              entry_type: 'inward',
              material_name: item.material,
              quantity: Number(item.qty),
              party_name: source.supplier,
              dc_number: source.dcNumber,
              vehicle_no: source.vehicleNumber,
              unit: item.unit,
              submitted_by: user?.email || 'Supervisor'
            });
          }
        }
      }

      // 3. Outward Rows
      for (const source of outwardSources) {
        for (const item of source.items) {
          if (item.qty && item.material) {
            allRowsToInsert.push({
              plant_name: selectedPlant,
              dpr_date: dprDate,
              entry_type: 'outward',
              material_name: item.material,
              quantity: Number(item.qty),
              party_name: source.party,
              dc_number: source.dcNumber,
              vehicle_no: source.vehicleNumber,
              unit: item.unit,
              submitted_by: user?.email || 'Supervisor'
            });
          }
        }
      }

      if (allRowsToInsert.length === 0) {
        alert("કૃપા કરીને કોઈપણ એક ફોર્મમાં ડેટા ભરો!");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('plant_dpr_entries').insert(allRowsToInsert);
      if (error) throw error;

      alert("✅ બધી જ એન્ટ્રીઓ સફળતાપૂર્વક સબમિટ થઈ ગઈ છે!");
      
      // Reset
      setProductionSources([{ id: 1, labour: '', shift: 'Day', items: [{ id: 1, product: '', qty: '' }], remarks: '' }]);
      setInwardSources([{ id: 1, supplier: '', dcNumber: '', vehicleNumber: '', items: [{ id: 1, material: '', qty: '', unit: 'Bags' }] }]);
      setOutwardSources([{ id: 1, party: '', dcNumber: '', vehicleNumber: '', items: [{ id: 1, material: '', qty: '', unit: 'Tons' }] }]);
      
      fetchRecentEntries();
    } catch (err) {
      alert("એરર: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '16px', maxWidth: '700px', margin: '0 auto', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ClipboardList size={18} color="#2563eb" /> Plant Daily Progress Report (DPR)
      </h3>

      <form onSubmit={handleSubmitAll} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* COMMON FIELDS: PLANT & DATE */}
        <div style={{ display: 'flex', gap: '10px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Select Plant *</label>
            <select value={selectedPlant} onChange={(e) => setSelectedPlant(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box', fontSize: '12px' }} required>
              <option value="">-- Choose Plant --</option>
              {plants.map(p => <option key={p.id} value={p.plant_name}>{p.plant_name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Date *</label>
            <input type="date" value={dprDate} onChange={(e) => setDprDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '12px' }} required />
          </div>
        </div>


  {/* ================= 1. PRODUCTION ================= */}
        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#1d4ed8', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Factory size={15} /> 1. PRODUCTION (ઉત્પાદન)
            </h4>
            <button type="button" onClick={addProductionSource} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={13} /> Add Source
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {productionSources.map((source, sIndex) => (
              <div key={source.id} style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#0f172a' }}>Source #{sIndex + 1}</span>
                  {productionSources.length > 1 && (
                    <button type="button" onClick={() => removeProductionSource(sIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Remove</button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  
                  {/* Select Labour */}
                  <select value={source.labour} onChange={(e) => updateProductionSource(sIndex, 'labour', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    <option value="">-- Select Labour / Supervisor --</option>
                    {labours.map(lab => <option key={lab.id} value={lab.name}>{lab.name}</option>)}
                  </select>

                  {/* Items Loop */}
                  {source.items.map((item, iIndex) => (
                    <div key={item.id} style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      
                      {/* Row 1: select product | no.of line | total auto qty */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <select value={item.product} onChange={(e) => updateProductionItem(sIndex, iIndex, 'product', e.target.value)} style={{ flex: 2, minWidth: '130px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}>
                          <option value="">-- Select Product --</option>
                          {products.map(pr => <option key={pr.id} value={pr.name}>{pr.name}</option>)}
                        </select>

                        <input type="number" placeholder="No. of Line" value={item.lines || ''} onChange={(e) => updateProductionItem(sIndex, iIndex, 'lines', e.target.value)} style={{ flex: 1, minWidth: '85px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />

                        <div style={{ flex: 1, minWidth: '90px', backgroundColor: '#e2e8f0', padding: '8px', borderRadius: '6px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', color: '#1e293b' }} title="Total Auto Qty">
                          {Number(item.lines || 0) * (item.multiplier || 20)} Qty
                        </div>
                      </div>

                      {/* Steel Rows Container (મલ્ટીપલ સ્ટીલ માટે એક જ રો માં ૩ બોક્સ અને નીચે એડ રો) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Steel Consumption Details:</span>
                        
                        {(item.steels || [{ steelSize: '3mm', wireCount: '3', steelQty: '' }]).map((st, stIndex) => (
                          <div key={stIndex} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <select value={st.steelSize} onChange={(e) => {
                              const updated = [...productionSources];
                              updated[sIndex].items[iIndex].steels[stIndex].steelSize = e.target.value;
                              setProductionSources(updated);
                            }} style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff' }}>
                              <option value="3mm">3mm Steel</option>
                              <option value="4mm">4mm Steel</option>
                              <option value="8mm">8mm Steel</option>
                            </select>

                            <select value={st.wireCount} onChange={(e) => {
                              const updated = [...productionSources];
                              updated[sIndex].items[iIndex].steels[stIndex].wireCount = e.target.value;
                              setProductionSources(updated);
                            }} style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff' }}>
                              <option value="3">3 Wire</option>
                              <option value="4">4 Wire</option>
                            </select>

                            <input type="number" placeholder="Qty of line" value={st.steelQty} onChange={(e) => {
                              const updated = [...productionSources];
                              updated[sIndex].items[iIndex].steels[stIndex].steelQty = e.target.value;
                              setProductionSources(updated);
                            }} style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />

                            {stIndex > 0 && (
                              <button type="button" onClick={() => {
                                const updated = [...productionSources];
                                updated[sIndex].items[iIndex].steels = updated[sIndex].items[iIndex].steels.filter((_, idx) => idx !== stIndex);
                                setProductionSources(updated);
                              }} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={13} /></button>
                            )}
                          </div>
                        ))}

                        {/* Separate add row in steel */}
                        <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: '600', cursor: 'pointer', marginTop: '2px' }} onClick={() => {
                          const updated = [...productionSources];
                          if (!updated[sIndex].items[iIndex].steels) updated[sIndex].items[iIndex].steels = [];
                          updated[sIndex].items[iIndex].steels.push({ steelSize: '3mm', wireCount: '3', steelQty: '' });
                          setProductionSources(updated);
                        }}>
                          + Separate add row in steel
                        </div>
                      </div>

                      {/* Row 3: Cement | Qty | Damage | Qty */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ flex: 2, display: 'flex', gap: '6px' }}>
                          <input type="text" value="Cement" readOnly style={{ width: '70px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#f1f5f9', textAlign: 'center' }} />
                          <input type="number" placeholder="Bags Qty" value={item.cementBags || ''} onChange={(e) => updateProductionItem(sIndex, iIndex, 'cementBags', e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                        </div>

                        <div style={{ flex: 2, display: 'flex', gap: '6px' }}>
                          <input type="text" value="Damage" readOnly style={{ width: '70px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#f1f5f9', textAlign: 'center' }} />
                          <input type="number" placeholder="Dam Qty" value={item.damageQty || ''} onChange={(e) => updateProductionItem(sIndex, iIndex, 'damageQty', e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #dc2626', fontSize: '12px', boxSizing: 'border-box' }} />
                        </div>

                        {source.items.length > 1 && (
                          <button type="button" onClick={() => removeProductionItem(sIndex, iIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        )}
                      </div>

                      {/* Description */}
                      <input type="text" placeholder="Description / Remarks (Optional)" value={item.remarks || ''} onChange={(e) => updateProductionItem(sIndex, iIndex, 'remarks', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />

                    </div>
                  ))}

                  {/* Add Row Button */}
                  <button type="button" onClick={() => addProductionItem(sIndex)} style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Plus size={14} /> Add Row
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* ================= 2. MATERIAL INWARD ================= */}
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#166534', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowDownRight size={15} /> 2. MATERIAL INWARD (મટીરિયલ આવ્યું)
            </h4>
            <button type="button" onClick={addInwardSource} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={13} /> Add Source
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {inwardSources.map((source, sIndex) => (
              <div key={source.id} style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#0f172a' }}>Source #{sIndex + 1}</span>
                  {inwardSources.length > 1 && (
                    <button type="button" onClick={() => removeInwardSource(sIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Remove</button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <select value={source.supplier} onChange={(e) => updateInwardSource(sIndex, 'supplier', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    <option value="">-- Select Vendor / Supplier --</option>
                    {suppliers.map(sup => <option key={sup.id} value={sup.name}>{sup.name} ({sup.company_name || 'N/A'})</option>)}
                  </select>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <input type="text" placeholder="DC Number" value={source.dcNumber} onChange={(e) => updateInwardSource(sIndex, 'dcNumber', e.target.value)} style={{ flex: 1, minWidth: '120px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                    <input type="text" placeholder="Vehicle Number" value={source.vehicleNumber} onChange={(e) => updateInwardSource(sIndex, 'vehicleNumber', e.target.value)} style={{ flex: 1, minWidth: '120px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>

                  {source.items.map((item, iIndex) => (
                    <div key={item.id} style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <select value={item.material} onChange={(e) => updateInwardItem(sIndex, iIndex, 'material', e.target.value)} style={{ flex: 2, minWidth: '130px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}>
                        <option value="">-- Select Material --</option>
                        {materials.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                      </select>
                      <input type="number" placeholder="Qty" value={item.qty} onChange={(e) => updateInwardItem(sIndex, iIndex, 'qty', e.target.value)} style={{ flex: 1, minWidth: '70px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                      <select value={item.unit} onChange={(e) => updateInwardItem(sIndex, iIndex, 'unit', e.target.value)} style={{ flex: 1, minWidth: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}>
                        <option value="Bags">Bags</option>
                        <option value="Tons">Tons</option>
                        <option value="Brass">Brass</option>
                        <option value="Kg">Kg</option>
                      </select>
                      {source.items.length > 1 && (
                        <button type="button" onClick={() => removeInwardItem(sIndex, iIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={14} /></button>
                      )}
                    </div>
                  ))}

                  <button type="button" onClick={() => addInwardItem(sIndex)} style={{ backgroundColor: '#dcfce7', color: '#166534', border: 'none', padding: '5px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', alignSelf: 'flex-start' }}>
                    + Add Item
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>


        {/* ================= 3. MATERIAL OUTWARD ================= */}
        <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '12px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#c2410c', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowUpRight size={15} /> 3. MATERIAL OUTWARD (મટીરિયલ ગયું)
            </h4>
            <button type="button" onClick={addOutwardSource} style={{ backgroundColor: '#ea580c', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={13} /> Add Source
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {outwardSources.map((source, sIndex) => (
              <div key={source.id} style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#0f172a' }}>Source #{sIndex + 1}</span>
                  {outwardSources.length > 1 && (
                    <button type="button" onClick={() => removeOutwardSource(sIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Remove</button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <select value={source.party} onChange={(e) => updateOutwardSource(sIndex, 'party', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    <option value="">-- Select Party --</option>
                    {parties.map(p => <option key={p.id} value={p.name}>{p.name} ({p.company_name || 'N/A'})</option>)}
                  </select>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <input type="text" placeholder="DC Number" value={source.dcNumber} onChange={(e) => updateOutwardSource(sIndex, 'dcNumber', e.target.value)} style={{ flex: 1, minWidth: '120px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                    <input type="text" placeholder="Vehicle Number" value={source.vehicleNumber} onChange={(e) => updateOutwardSource(sIndex, 'vehicleNumber', e.target.value)} style={{ flex: 1, minWidth: '120px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>

                  {source.items.map((item, iIndex) => (
                    <div key={item.id} style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <select value={item.material} onChange={(e) => updateOutwardItem(sIndex, iIndex, 'material', e.target.value)} style={{ flex: 2, minWidth: '130px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}>
                        <option value="">-- Select Material --</option>
                        {materials.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                      </select>
                      <input type="number" placeholder="Qty" value={item.qty} onChange={(e) => updateOutwardItem(sIndex, iIndex, 'qty', e.target.value)} style={{ flex: 1, minWidth: '70px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                      <select value={item.unit} onChange={(e) => updateOutwardItem(sIndex, iIndex, 'unit', e.target.value)} style={{ flex: 1, minWidth: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}>
                        <option value="Tons">Tons</option>
                        <option value="Bags">Bags</option>
                        <option value="Brass">Brass</option>
                        <option value="Kg">Kg</option>
                      </select>
                      {source.items.length > 1 && (
                        <button type="button" onClick={() => removeOutwardItem(sIndex, iIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={14} /></button>
                      )}
                    </div>
                  ))}

                  <button type="button" onClick={() => addOutwardItem(sIndex)} style={{ backgroundColor: '#ffedd5', color: '#c2410c', border: 'none', padding: '5px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', alignSelf: 'flex-start' }}>
                    + Add Item
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MASTER SUBMIT BUTTON */}
        <button type="submit" disabled={loading} style={{ backgroundColor: '#0f172a', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', marginTop: '10px' }}>
          <Send size={15} /> {loading ? 'Submitting...' : 'Submit DPR Entry (બધું જ સબમિટ કરો)'}
        </button>

      </form>

      {/* RECENT ENTRIES */}
      <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
        <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <History size={13} color="#64748b" /> Recent Submissions (તાજેતરની એન્ટ્રીઓ)
        </h4>
        {recentEntries.length === 0 ? (
          <p style={{ fontSize: '11px', color: '#64748b' }}>કોઈ તાજેતરની એન્ટ્રી નથી.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {recentEntries.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px' }}>
                <div>
                  <span style={{ fontWeight: 'bold', color: item.entry_type === 'inward' ? '#166534' : item.entry_type === 'outward' ? '#c2410c' : '#1d4ed8', textTransform: 'uppercase' }}>
                    [{item.entry_type}]
                  </span>{' '}
                  <strong>{item.plant_name}</strong> - {item.material_name} ({item.quantity} {item.unit || 'Qty'})
                </div>
                <div style={{ color: '#64748b' }}>{item.dpr_date}</div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default PlantDprEntry;