import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Wrench, Send, RotateCcw, Clock, Plus, Trash2 } from 'lucide-react';

export default function IssueReturnPage({ user }) {
  const [plants, setPlants] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState('');
  const [materials, setMaterials] = useState([]);
  const [labours, setLabours] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  
  // 🎯 મલ્ટી-સોર્સ અને મલ્ટી-આઇટમ સ્ટેટ
  const [returnSources, setReturnSources] = useState([
    {
      id: 1,
      issuedTo: '',
      customIssuedTo: '',
      items: [
        { id: 1, category: 'Tools and Hardware', selectedMaterial: '', customMaterial: '', quantity: 1, unit: 'Nos', remarks: '' }
      ]
    }
  ]);
  // 🎯 રીટર્નમાં Good, Scrap, Repair અલગ ગણવા માટેનું સ્ટેટ
  const [returnQtys, setReturnQtys] = useState({
    good: 0,
    repair: 0,
    scrap: 0,
    lost: 0
  });

  // Active Pending List & Return Modal State
  const [activeIssues, setActiveIssues] = useState([]);
  const [selectedReturnTx, setSelectedReturnTx] = useState(null);
  const [returnCondition, setReturnCondition] = useState('Good');
  const [returnRemarks, setReturnRemarks] = useState('');

  // History & Search State
  const [allHistory, setAllHistory] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState('ALL');
  const [pendingSearch, setPendingSearch] = useState('');
  const [historyLabourFilter, setHistoryLabourFilter] = useState('ALL');

  // 1. Fetch Plants
  useEffect(() => {
    const fetchPlants = async () => {
      try {
        const { data } = await supabase.from('plants').select('*');
        setPlants(data || []);
      } catch (err) {
        console.error("Plants Error:", err);
      }
    };
    fetchPlants();
  }, []);

  // 2. Fetch Materials Master + Inwarded Materials
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const { data: masterData } = await supabase
          .from('site_materials_master')
          .select('*');

        let query = supabase
          .from('plant_material_inward')
          .select('material_name, item_type, unit');
        
        if (selectedPlant) {
          query = query.eq('plant_name', selectedPlant);
        }

        const { data: inwardData } = await query;

        const combined = [];
        const namesSeen = new Set();

        (masterData || []).forEach(m => {
          if (m && m.name && !namesSeen.has(m.name.trim().toLowerCase())) {
            namesSeen.add(m.name.trim().toLowerCase());
            combined.push({
              id: m.id || m.name,
              name: m.name.trim(),
              item_type: m.item_type || 'Tools and Hardware'
            });
          }
        });

        (inwardData || []).forEach(m => {
          if (m && m.material_name && !namesSeen.has(m.material_name.trim().toLowerCase())) {
            namesSeen.add(m.material_name.trim().toLowerCase());
            combined.push({
              id: m.material_name,
              name: m.material_name.trim(),
              item_type: m.item_type || 'Tools and Hardware'
            });
          }
        });

        setMaterials(combined);
      } catch (err) {
        console.error("Materials Fetch Error:", err);
      }
    };

    fetchMaterials();
  }, [selectedPlant]);

  // 3. Fetch Contractors / Labours
  useEffect(() => {
    const fetchContractors = async () => {
      if (!selectedPlant) {
        setLabours([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('contractors')
          .select('*')
          .or(`site_name.eq.${selectedPlant},site_name.is.null`);

        if (error) {
          console.error("Contractors Fetch Error:", error.message);
        } else {
          setLabours(data || []);
        }
      } catch (err) {
        console.error("Contractors Error:", err);
      }
    };

    fetchContractors();
  }, [selectedPlant]);

  // 4. Fetch Active Pending Tools
  const fetchActiveIssues = async () => {
    if (!selectedPlant) return;
    try {
      const { data } = await supabase
        .from('plant_tool_transactions')
        .select('*')
        .eq('plant_name', selectedPlant)
        .eq('status', 'ISSUED')
        .order('created_at', { ascending: false });

      setActiveIssues(data || []);
    } catch (err) {
      console.error("Active issues error:", err);
    }
  };

  // 5. Fetch All History
  const fetchHistory = async () => {
    if (!selectedPlant) return;
    try {
      const { data, error } = await supabase
        .from('plant_tool_transactions')
        .select('*')
        .eq('plant_name', selectedPlant)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error) setAllHistory(data || []);
    } catch (err) {
      console.error("History error:", err);
    }
  };

  useEffect(() => {
    if (selectedPlant) {
      fetchActiveIssues();
      fetchHistory();
    } else {
      setActiveIssues([]);
      setAllHistory([]);
    }
  }, [selectedPlant]);

  const getFilteredMaterialsForCategory = (itemCategory) => {
    return materials.filter((m) => {
      if (!m || !m.name) return false;
      if (!m.item_type) return true;
      const cat = (itemCategory || '').toLowerCase().trim();
      const dbType = (m.item_type || '').toLowerCase().trim();

      if (cat.includes('tool') && dbType.includes('tool')) return true;
      if (cat.includes('consumable') && dbType.includes('consumable')) return true;
      if (cat.includes('raw') && dbType.includes('raw')) return true;
      return false;
    });
  };

  // 🎯 સોર્સ અને આઇટમ મેનેજમેન્ટ ફંક્શન્સ
  const addReturnSource = () => {
    setReturnSources([
      ...returnSources,
      {
        id: Date.now(),
        issuedTo: '',
        customIssuedTo: '',
        items: [
          { id: Date.now(), category: 'Tools and Hardware', selectedMaterial: '', customMaterial: '', quantity: 1, unit: 'Nos', remarks: '' }
        ]
      }
    ]);
  };

  const removeReturnSource = (sIdx) => {
    setReturnSources(returnSources.filter((_, i) => i !== sIdx));
  };

  const updateReturnSource = (sIdx, field, val) => {
    const updated = [...returnSources];
    updated[sIdx][field] = val;
    setReturnSources(updated);
  };

  const addItemRow = (sIdx) => {
    const updated = [...returnSources];
    updated[sIdx].items.push({
      id: Date.now(),
      category: 'Tools and Hardware',
      selectedMaterial: '',
      customMaterial: '',
      quantity: 1,
      unit: 'Nos',
      remarks: ''
    });
    setReturnSources(updated);
  };

  const removeItemRow = (sIdx, iIdx) => {
    const updated = [...returnSources];
    updated[sIdx].items = updated[sIdx].items.filter((_, i) => i !== iIdx);
    setReturnSources(updated);
  };

  const updateItemRow = (sIdx, iIdx, field, val) => {
    const updated = [...returnSources];
    updated[sIdx].items[iIdx][field] = val;
    if (field === 'category') {
      updated[sIdx].items[iIdx].selectedMaterial = '';
      updated[sIdx].items[iIdx].customMaterial = '';
    }
    setReturnSources(updated);
  };

 // Handle Submit Issue (Check Existing Pending & Merge/Add-on Qty)
  const handleSubmitIssue = async (e) => {
    e.preventDefault();
    if (!selectedPlant) {
      alert("⚠️ કૃપા કરીને પહેલા પ્લાન્ટ સિલેક્ટ કરો!");
      return;
    }

    // ૧. ડેટા વેલિડેશન
    for (let s = 0; s < returnSources.length; s++) {
      const src = returnSources[s];
      const person = src.issuedTo === 'OTHER_MANUAL' ? src.customIssuedTo?.trim() : src.issuedTo;
      
      if (!person) {
        alert(`⚠️ Source #${s + 1}: કૃપા કરીને વ્યક્તિ / લેબર સિલેક્ટ કરો!`);
        return;
      }

      for (let i = 0; i < src.items.length; i++) {
        const itm = src.items[i];
        const mat = itm.selectedMaterial === 'OTHER_MANUAL' ? itm.customMaterial?.trim() : itm.selectedMaterial;
        
        if (!mat) {
          alert(`⚠️ Source #${s + 1}, Item #${i + 1}: કૃપા કરીને મટીરિયલ / ટૂલ સિલેક્ટ કરો!`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      const allTxToInsert = [];
      const stockLedgerRows = [];

      // ૨. દરેક સોર્સ અને તેની આઇટમ્સ પ્રોસેસ કરો
      for (const src of returnSources) {
        const person = src.issuedTo === 'OTHER_MANUAL' ? src.customIssuedTo?.trim() : src.issuedTo;

        for (const itm of src.items) {
          const mat = itm.selectedMaterial === 'OTHER_MANUAL' ? itm.customMaterial?.trim() : itm.selectedMaterial;
          const isCons = itm.category === 'Consumable Item';
          const qtyNum = Number(itm.quantity || 1);

          // 🎯 માત્ર TOOLS માટે: ચેક કરો કે આ જ વ્યક્તિ પાસે આ જ પ્લાન્ટમાં આ આઇટમ પેન્ડિંગ છે?
          let existingToolTx = null;
          if (!isCons) {
            const { data: existingData } = await supabase
              .from('plant_tool_transactions')
              .select('id, quantity, remarks')
              .eq('plant_name', selectedPlant)
              .eq('issued_to', person)
              .eq('material_name', mat)
              .eq('status', 'ISSUED')
              .maybeSingle();

            existingToolTx = existingData;
          }

         if (existingToolTx) {
            // 👉 જો પહેલેથી હોય તો QTY ADD-ON કરો
            const updatedQty = Number(existingToolTx.quantity) + qtyNum;
            const appendRemark = itm.remarks ? ` | Add-on: +${qtyNum} (${itm.remarks})` : ` | Add-on: +${qtyNum}`;

            const { error: updateErr } = await supabase
              .from('plant_tool_transactions')
              .update({
                quantity: updatedQty,
                issue_date: issueDate,
                remarks: (existingToolTx.remarks || '') + appendRemark
              })
              .eq('id', existingToolTx.id);

            if (updateErr) throw updateErr;

            // 🎯 લેજરમાં reference_id અને description પાસ કરો
            stockLedgerRows.push({
              date: issueDate,
              plant_name: selectedPlant,
              material_name: mat,
              unit: itm.unit || 'Nos',
              transaction_type: 'OUTWARD',
              qty: qtyNum,
              reference_id: existingToolTx.id, // 👈 સાચી BigInt ID
              description: `Issued to ${person} (${itm.category || 'Tools'}) [Add-on]` // 👈 વિગત
            });

          } else {
            // નવી એન્ટ્રી માટે લિસ્ટમાં ઉમેરો
            allTxToInsert.push({
              plant_name: selectedPlant,
              material_name: mat,
              category: itm.category || 'Tools and Hardware',
              issued_to: person,
              quantity: qtyNum,
              unit: itm.unit || 'Nos',
              issue_date: issueDate,
              expected_return_date: isCons ? null : (itm.expectedReturnDate || null),
              status: isCons ? 'CONSUMED' : 'ISSUED',
              remarks: itm.remarks || ''
            });
          }
        }
      }

     // ૩. જે નવી આઇટમ્સ છે તેને INSERT કરો
      if (allTxToInsert.length > 0) {
        const { data: insertedTxs, error: txError } = await supabase
          .from('plant_tool_transactions')
          .insert(allTxToInsert)
          .select(); // 👈 .select() થી નવી બનેલી id મળશે

        if (txError) throw txError;

        insertedTxs.forEach((row) => {
          stockLedgerRows.push({
            date: issueDate,
            plant_name: selectedPlant,
            material_name: row.material_name,
            unit: row.unit,
            transaction_type: 'OUTWARD',
            qty: row.quantity,
            reference_id: row.id, // 👈 નવી BigInt ID
            description: `Issued to ${row.issued_to} (${row.category})` // 👈 વિગત
          });
        });
      }

      // ૪. 🎯 Live Stock લેજરમાંથી બાદ કરો
      if (stockLedgerRows.length > 0) {
        const { error: ledgerError } = await supabase
          .from('material_stock_ledger')
          .insert(stockLedgerRows);

        if (ledgerError) console.error("Stock Ledger Error:", ledgerError.message);
      }

      alert("✅ સામાન Issue થઈ ગયો! (પહેલેથી પેન્ડિંગ ટૂલ્સમાં નવો જથ્થો ઉમેરાઈ ગયો)");

      // ૫. રીસેટ ફોર્મ
      setReturnSources([
        {
          id: Date.now(),
          issuedTo: '',
          customIssuedTo: '',
          items: [
            { id: Date.now() + 1, category: 'Tools and Hardware', selectedMaterial: '', customMaterial: '', quantity: 1, unit: 'Nos', remarks: '' }
          ]
        }
      ]);

      fetchActiveIssues();
      fetchHistory();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Split Tool Return (Good સ્ટોકમાં જશે, Scrap/Repair અલગ નોંધાશે)
  const handleConfirmReturn = async (e) => {
    e.preventDefault();
    if (!selectedReturnTx) return;

    const totalEntered = 
      Number(returnQtys.good || 0) + 
      Number(returnQtys.repair || 0) + 
      Number(returnQtys.scrap || 0) + 
      Number(returnQtys.lost || 0);

    const totalIssued = Number(selectedReturnTx.quantity);

    if (totalEntered === 0) {
      alert("⚠️ કૃપા કરીને ઓછામાં ઓછી ૧ સંખ્યા (Qty) દાખલ કરો!");
      return;
    }

    if (totalEntered > totalIssued) {
      alert(`⚠️ દાખલ કરેલ કુલ જથ્થો (${totalEntered}) ઈશ્યૂ કરેલ જથ્થા (${totalIssued}) કરતાં વધી ગયો છે!`);
      return;
    }

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // કન્ડિશન સમરી બનાવો (દા.ત. "1 Good, 2 Scrap")
      const summaryParts = [];
      if (returnQtys.good > 0) summaryParts.push(`${returnQtys.good} Good`);
      if (returnQtys.repair > 0) summaryParts.push(`${returnQtys.repair} Needs Repair`);
      if (returnQtys.scrap > 0) summaryParts.push(`${returnQtys.scrap} Scrap`);
      if (returnQtys.lost > 0) summaryParts.push(`${returnQtys.lost} Lost`);
      const conditionSummary = summaryParts.join(', ');

      // ૧. Tool Transaction Update કરો
      const { error: updateError } = await supabase
        .from('plant_tool_transactions')
        .update({
          return_date: today,
          return_condition: conditionSummary,
          status: totalEntered === totalIssued ? 'RETURNED' : 'PARTIALLY_RETURNED',
          remarks: returnRemarks 
            ? `${selectedReturnTx.remarks || ''} | Return: ${conditionSummary} (${returnRemarks})`
            : `${selectedReturnTx.remarks || ''} | Return: ${conditionSummary}`
        })
        .eq('id', selectedReturnTx.id);

      if (updateError) throw updateError;

     // 🎯 ફક્ત જે 'Good' હોય તેટલો જ સ્ટોક INWARD (પ્લસ) થશે
      if (Number(returnQtys.good) > 0) {
        const { error: returnLedgerErr } = await supabase
          .from('material_stock_ledger')
          .insert([{
            date: today,
            plant_name: selectedReturnTx.plant_name,
            material_name: selectedReturnTx.material_name,
            unit: selectedReturnTx.unit || 'Nos',
            transaction_type: 'INWARD',
            qty: Number(returnQtys.good),
            reference_id: selectedReturnTx.id, // 👈 ટ્રાન્ઝેક્શનની ID
            description: `Tool Returned by ${selectedReturnTx.issued_to} (Condition: Good: ${returnQtys.good})` // 👈 વિગત
          }]);

        if (returnLedgerErr) {
          console.error("Return Stock Error:", returnLedgerErr.message);
        }
      }

      alert(`✅ રિટર્ન નોંધાઈ ગયું! (${returnQtys.good > 0 ? returnQtys.good + ' સ્ટોકમાં પાછા ઉમેરાયા' : 'સ્ટોકમાં કોઈ ઉમેરાયા નથી'})`);
      setSelectedReturnTx(null);
      setReturnRemarks('');
      setReturnQtys({ good: 0, repair: 0, scrap: 0, lost: 0 });

      fetchActiveIssues();
      fetchHistory();
    } catch (err) {
      alert("Return Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '650px', margin: '0 auto', paddingBottom: '20px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* 1. Header Card */}
      <div style={{ 
        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', 
        padding: '14px 18px', 
        borderRadius: '16px', 
        border: '1px solid #bfdbfe', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px',
        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.08)'
      }}>
        <div style={{ 
          backgroundColor: '#2563eb', 
          padding: '8px', 
          borderRadius: '10px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
        }}>
          <Wrench size={20} color="#ffffff" strokeWidth={2.5} />
        </div>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1e3a8a', margin: 0, letterSpacing: '0.2px' }}>
            3. ISSUE & RETURN
          </h3>
          <span style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: '600' }}>
            Manage tools, items issue and returns
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
            <option value="">-- Choose Plant --</option>
            {plants.map(p => <option key={p.id} value={p.plant_name}>{p.plant_name}</option>)}
          </select>
        </div>

        <div style={{ width: '140px' }}>
          <label style={{ fontSize: '11px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
            Issue Date *
          </label>
          <input 
            type="date" 
            max={new Date().toISOString().split('T')[0]}
            value={issueDate} 
            onChange={(e) => setIssueDate(e.target.value)} 
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

      {/* 3. ISSUE FORM CARD */}
      <form onSubmit={handleSubmitIssue} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
          
          <div style={{ borderBottom: '2px dashed #cbd5e1', paddingBottom: '10px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1d4ed8', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Send size={16} /> New Issue Form (સામાન આપવો)
            </h4>
            <button 
              type="button" 
              onClick={addReturnSource} 
              style={{ backgroundColor: '#f97316', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={14} /> Add Source
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {returnSources.map((source, sIndex) => (
              <div key={source.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderBottom: sIndex < returnSources.length - 1 ? '2px solid #cbd5e1' : 'none', paddingBottom: sIndex < returnSources.length - 1 ? '16px' : '0' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px' }}>
                    Source #{sIndex + 1}
                  </span>
                  {returnSources.length > 1 && (
                    <button type="button" onClick={() => removeReturnSource(sIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Remove Source</button>
                  )}
                </div>

                {/* Issued To (Labour) */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Issued To (Labour / Person) *
                  </label>
                  <select
                    value={source.issuedTo}
                    onChange={(e) => {
                      updateReturnSource(sIndex, 'issuedTo', e.target.value);
                      if (e.target.value !== 'OTHER_MANUAL') updateReturnSource(sIndex, 'customIssuedTo', '');
                    }}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}
                    required
                  >
                    <option value="">-- Select Labour --</option>
                    {labours.map((lab) => (
                      <option key={lab.id} value={lab.name || lab.labour_name}>
                        {lab.name || lab.labour_name} {lab.company_name ? `(${lab.company_name})` : (lab.designation ? `(${lab.designation})` : '')}
                      </option>
                    ))}
                    <option value="OTHER_MANUAL" style={{ fontWeight: 'bold', color: '#2563eb' }}>
                      ➕ Other (Type Manually...)
                    </option>
                  </select>

                  {source.issuedTo === 'OTHER_MANUAL' && (
                    <input
                      type="text"
                      placeholder="Type labour/person name..."
                      value={source.customIssuedTo}
                      onChange={(e) => updateReturnSource(sIndex, 'customIssuedTo', e.target.value)}
                      autoFocus
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #2563eb', fontSize: '11px', backgroundColor: '#eff6ff', boxSizing: 'border-box', marginTop: '4px' }}
                      required
                    />
                  )}
                </div>

                {/* Items List Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#334155' }}>
                      Items List *
                    </label>
                    <button 
                      type="button" 
                      onClick={() => addItemRow(sIndex)} 
                      style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <Plus size={12} /> Add Item
                    </button>
                  </div>

                  {source.items.map((item, iIndex) => {
                    const currentCat = item.category || 'Tools and Hardware';
                    const currentFilteredMaterials = getFilteredMaterialsForCategory(currentCat);

                    return (
                      <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                        
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <select
                            value={currentCat}
                            onChange={(e) => updateItemRow(sIndex, iIndex, 'category', e.target.value)}
                            style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#f3e8ff', fontWeight: 'bold', color: '#7e22ce' }}
                          >
                            <option value="Tools and Hardware">🛠️ Tools & Hardware</option>
                            <option value="Consumable Item">📦 Consumables</option>
                            <option value="Raw Material">🧱 Raw Material</option>
                          </select>

                          {source.items.length > 1 && (
                            <button type="button" onClick={() => removeItemRow(sIndex, iIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <select
                            value={item.selectedMaterial}
                            onChange={(e) => updateItemRow(sIndex, iIndex, 'selectedMaterial', e.target.value)}
                            style={{ flex: 1.5, padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff' }}
                            required
                          >
                            <option value="">-- Choose Item --</option>
                            {currentFilteredMaterials.map((m, idx) => (
                              <option key={idx} value={m.name}>{m.name}</option>
                            ))}
                            <option value="OTHER_MANUAL" style={{ fontWeight: 'bold', color: '#2563eb' }}>➕ Other...</option>
                          </select>

                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => updateItemRow(sIndex, iIndex, 'quantity', e.target.value)}
                            style={{ width: '55px', padding: '7px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', textAlign: 'center', boxSizing: 'border-box' }}
                            required
                          />

                          <select
                            value={item.unit}
                            onChange={(e) => updateItemRow(sIndex, iIndex, 'unit', e.target.value)}
                            style={{ width: '65px', padding: '7px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px' }}
                          >
                            <option value="Nos">Nos</option>
                            <option value="Ltr">Ltr</option>
                            <option value="Kg">Kg</option>
                            <option value="Bags">Bags</option>
                          </select>
                        </div>

                        {item.selectedMaterial === 'OTHER_MANUAL' && (
                          <input
                            type="text"
                            placeholder="Type custom material name..."
                            value={item.customMaterial}
                            onChange={(e) => updateItemRow(sIndex, iIndex, 'customMaterial', e.target.value)}
                            style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #2563eb', fontSize: '11px', backgroundColor: '#eff6ff', boxSizing: 'border-box' }}
                            required
                          />
                        )}

                        <input
                          type="text"
                          placeholder="Remarks / Note (Optional)"
                          value={item.remarks}
                          onChange={(e) => updateItemRow(sIndex, iIndex, 'remarks', e.target.value)}
                          style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}
                        />

                      </div>
                    );
                  })}
                </div>

              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '14px',
              backgroundColor: '#2563eb',
              color: '#fff',
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%'
            }}
          >
            <Send size={15} /> {loading ? 'Processing...' : 'Submit Issue'}
          </button>
        </div>
      </form>

      {/* 4. ACTIVE PENDING TOOLS */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e3a8a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RotateCcw size={15} /> Currently Issued Tools (Pending Return)
          </h4>
          <span style={{ fontSize: '11px', fontWeight: 'bold', backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '12px', border: '1px solid #fde68a' }}>
            Pending: {activeIssues.length}
          </span>
        </div>

        {activeIssues.length > 0 && (
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="Search pending tool or person name..."
              value={pendingSearch}
              onChange={(e) => setPendingSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '11px',
                backgroundColor: '#f8fafc',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '2px' }}>
          {activeIssues
            .filter((item) => {
              const q = pendingSearch.toLowerCase().trim();
              if (!q) return true;
              return (
                item.material_name?.toLowerCase().includes(q) ||
                item.issued_to?.toLowerCase().includes(q)
              );
            })
            .map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px'
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', color: '#0f172a' }}>
                    {item.material_name} <span style={{ color: '#2563eb' }}>({item.quantity} {item.unit})</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    Issued To: <strong style={{ color: '#334155' }}>{item.issued_to}</strong> | Date: <span style={{ color: '#ea580c', fontWeight: '600' }}>{item.issue_date || 'N/A'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
    setSelectedReturnTx(item);
    setReturnQtys({
      good: Number(item.quantity) || 1,
      repair: 0,
      scrap: 0,
      lost: 0
    });
    setReturnRemarks('');
  }}
                  style={{
                    backgroundColor: '#16a34a',
                    color: '#fff',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <RotateCcw size={13} /> Receive Return
                </button>
              </div>
            ))}

          {activeIssues.length === 0 && (
            <div style={{ textAlign: 'center', padding: '15px', color: '#94a3b8', fontSize: '12px' }}>
              હાલમાં કોઈ ટૂલ પેન્ડિંગ નથી.
            </div>
          )}
        </div>
      </div>

      {/* 5. TRANSACTION HISTORY & CONSUMPTION LOG */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e3a8a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={15} /> All Issues & Consumption History
          </h4>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            Total Records: {allHistory.length}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search item or notes..."
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            style={{
              flex: '1.4',
              minWidth: '140px',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '11px',
              outline: 'none',
              backgroundColor: '#f8fafc',
              boxSizing: 'border-box'
            }}
          />

          <select
            value={historyCategoryFilter}
            onChange={(e) => setHistoryCategoryFilter(e.target.value)}
            style={{
              flex: '1',
              minWidth: '110px',
              padding: '8px 6px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '11px',
              fontWeight: '600',
              backgroundColor: '#fff',
              color: '#334155'
            }}
          >
            <option value="ALL">All Categories</option>
            <option value="Consumable Item">📦 Consumables</option>
            <option value="Tools and Hardware">🛠️ Tools</option>
          </select>

          <select
            value={historyLabourFilter}
            onChange={(e) => setHistoryLabourFilter(e.target.value)}
            style={{
              flex: '1.2',
              minWidth: '120px',
              padding: '8px 6px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '11px',
              fontWeight: '600',
              backgroundColor: '#fff',
              color: '#1e3a8a'
            }}
          >
            <option value="ALL">All Labours</option>
            {labours.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '2px' }}>
          {allHistory
            .filter((row) => {
              if (historyCategoryFilter !== 'ALL' && row.category !== historyCategoryFilter) return false;
              if (historyLabourFilter !== 'ALL' && row.issued_to !== historyLabourFilter) return false;
              const q = historySearch.toLowerCase().trim();
              if (!q) return true;
              return (
                row.material_name?.toLowerCase().includes(q) ||
                row.issued_to?.toLowerCase().includes(q) ||
                row.remarks?.toLowerCase().includes(q)
              );
            })
            .map((row) => {
              const isCons = row.status === 'CONSUMED';
              const isRet = row.status === 'RETURNED';

              return (
                <div
                  key={row.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{row.material_name}</span>
                      <span style={{ fontWeight: '700', color: '#2563eb' }}>({row.quantity} {row.unit})</span>
                    </div>
                    
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      Taken by: <strong style={{ color: '#1e293b' }}>{row.issued_to}</strong> | Date: {row.issue_date}
                      {row.remarks && <span style={{ color: '#94a3b8' }}> ({row.remarks})</span>}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    {isCons && (
                      <span style={{ fontSize: '10px', fontWeight: 'bold', backgroundColor: '#ffedd5', color: '#c2410c', padding: '3px 8px', borderRadius: '6px', border: '1px solid #fed7aa' }}>
                        Consumed
                      </span>
                    )}
                    {row.status === 'ISSUED' && (
                      <span style={{ fontSize: '10px', fontWeight: 'bold', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                        Issued (Pending)
                      </span>
                    )}
                    {isRet && (
                      <span style={{ 
                        fontSize: '10px', 
                        fontWeight: 'bold', 
                        backgroundColor: row.return_condition === 'Good' ? '#dcfce7' : '#fee2e2', 
                        color: row.return_condition === 'Good' ? '#15803d' : '#b91c1c', 
                        padding: '3px 8px', 
                        borderRadius: '6px',
                        border: `1px solid ${row.return_condition === 'Good' ? '#bbf7d0' : '#fecaca'}`
                      }}>
                        Returned ({row.return_condition})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

          {allHistory.length === 0 && (
            <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '12px' }}>
              કોઈ હિસ્ટ્રી રેકોર્ડ મળ્યો નથી.
            </div>
          )}
        </div>
      </div>
{/* 6. RETURN MODAL WITH QUANTITY SPLIT */}
      {selectedReturnTx && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '18px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e3a8a', margin: '0 0 4px 0' }}>
              Process Tool Return
            </h4>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
              Item: <strong>{selectedReturnTx.material_name}</strong> | Total Issued: <strong style={{ color: '#2563eb' }}>{selectedReturnTx.quantity} {selectedReturnTx.unit}</strong>
            </div>

            <form onSubmit={handleConfirmReturn} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#334155' }}>
                જમા થતો જથ્થો (કન્ડિશન મુજબ સંખ્યા લખો):
              </label>

              {/* ૧. Good Condition (Live Stock માં જશે) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0fdf4', padding: '8px 10px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#15803d' }}>
                  ✅ Good / Working (સ્ટોકમાં જશે)
                </span>
                <input
                  type="number"
                  min="0"
                  max={selectedReturnTx.quantity}
                  value={returnQtys.good}
                  onChange={(e) => setReturnQtys({ ...returnQtys, good: Number(e.target.value) })}
                  style={{ width: '65px', padding: '5px', borderRadius: '6px', border: '1px solid #86efac', textAlign: 'center', fontWeight: 'bold' }}
                />
              </div>

              {/* ૨. Scrap Condition (સ્ટોકમાં નહીં જાય) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fef2f2', padding: '8px 10px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#b91c1c' }}>
                  🗑️ Scrap / Broken (ભંગાર)
                </span>
                <input
                  type="number"
                  min="0"
                  max={selectedReturnTx.quantity}
                  value={returnQtys.scrap}
                  onChange={(e) => setReturnQtys({ ...returnQtys, scrap: Number(e.target.value) })}
                  style={{ width: '65px', padding: '5px', borderRadius: '6px', border: '1px solid #fca5a5', textAlign: 'center', fontWeight: 'bold' }}
                />
              </div>

              {/* ૩. Repair Condition (રિપેરીંગ) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fffbeb', padding: '8px 10px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#b45309' }}>
                  🔧 Needs Repair (રિપેરિંગ)
                </span>
                <input
                  type="number"
                  min="0"
                  max={selectedReturnTx.quantity}
                  value={returnQtys.repair}
                  onChange={(e) => setReturnQtys({ ...returnQtys, repair: Number(e.target.value) })}
                  style={{ width: '65px', padding: '5px', borderRadius: '6px', border: '1px solid #fcd34d', textAlign: 'center', fontWeight: 'bold' }}
                />
              </div>

              {/* Remarks */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '3px' }}>
                  નોંધ / રિમાર્ક્સ (જો ભાંગી ગયેલ હોય તો વિગત):
                </label>
                <input
                  type="text"
                  placeholder="દા.ત. 2 પાવડાના હેન્ડલ ભાંગી ગયા છે..."
                  value={returnRemarks}
                  onChange={(e) => setReturnRemarks(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedReturnTx(null)}
                  style={{ flex: 1, backgroundColor: '#94a3b8', color: '#fff', border: 'none', padding: '9px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ flex: 1, backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '9px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {loading ? 'Processing...' : 'Confirm Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}