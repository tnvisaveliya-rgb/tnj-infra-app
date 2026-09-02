import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowDownRight, Send, Plus, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
export default function PlantInwardPage({ user }) {
    const [searchParams] = useSearchParams();
  const approveIdFromRouter = searchParams.get('approve_id');
  const [plants, setPlants] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [dprDate, setDprDate] = useState(new Date().toISOString().split('T')[0]);
  const [suppliers, setSuppliers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
// ✏️ Edit Mode State
const [editingId, setEditingId] = useState(null);
  const [existingBills, setExistingBills] = useState([]); // જૂની બિલ લિંક્સ સાચવવા
const fetchPlants = async () => {
    const { data } = await supabase.from('plants').select('*');
    setPlants(data || []);
  };
 const handleEditClick = (entry) => {
    setEditingId(entry.id);
    setDprDate(entry.date || dprDate);
    setSelectedPlant(entry.plant_name || selectedPlant);
    
    let billsArray = [];
    if (entry.bill_url && entry.bill_url.trim() !== '' && entry.bill_url !== 'EMPTY') {
      billsArray = entry.bill_url.split(',').map(b => b.trim()).filter(b => b !== '');
    }
    setExistingBills(billsArray);

    // 🎯 મટીરિયલના નામમાંથી Product Name, Size અને Steel Spec અલગ કરવાનું સ્માર્ટ લોજિક
    let fullMatName = entry.material_name || '';
    let extractedMaterial = fullMatName;
    let extractedSize = '';
    let extractedSteelSpec = '';

    // 🎯 અહી નવી લાઈન ઉમેરો: પહેલા કેટેગરી નક્કી કરો
    const itemCategory = entry.item_type || 'Raw Material';

    // 🎯 અહીં IF કન્ડીશન લગાવો કે આ લોજિક ફક્ત Finished Product હોય તો જ ચાલે
    if (itemCategory === 'Finished Product') {
      // ઉદાહરણ તરીકે જો નામ "Panel 6 (3mm - 4 wires)" હોય તો:
      if (fullMatName.includes('(') && fullMatName.includes(')')) {
        const firstOpen = fullMatName.indexOf('(');
        const lastClose = fullMatName.lastIndexOf(')');
        
        extractedSteelSpec = fullMatName.substring(firstOpen + 1, lastClose).trim();
        const nameAndSize = fullMatName.substring(0, firstOpen).trim();
        
        const lastSpaceIndex = nameAndSize.lastIndexOf(' ');
        if (lastSpaceIndex !== -1) {
          extractedMaterial = nameAndSize.substring(0, lastSpaceIndex).trim(); 
          extractedSize = nameAndSize.substring(lastSpaceIndex + 1).trim();     
        } else {
          extractedMaterial = nameAndSize;
        }
      } else {
        // જો કૌંસ ન હોય પણ ફક્ત સાઈઝ હોય (દા.ત. "Panel 6")
        const lastSpaceIndex = fullMatName.lastIndexOf(' ');
        if (lastSpaceIndex !== -1) {
          const potentialSize = fullMatName.substring(lastSpaceIndex + 1).trim();
          if (!isNaN(potentialSize) || potentialSize.includes('*') || potentialSize.length <= 5) {
            extractedMaterial = fullMatName.substring(0, lastSpaceIndex).trim();
            extractedSize = potentialSize;
          }
        }
      }
    } // 👈 અહીં IF કન્ડીશન પૂરી થાય છે

    setInwardSources([
      {
        id: Date.now(),
        supplier: entry.supplier_name || '',
        dcNumber: entry.dc_number === 'EMPTY' ? '' : (entry.dc_number || ''),
        vehicleNumber: entry.vehicle_no === 'EMPTY' ? '' : (entry.vehicle_no || ''),
        description: entry.description || '',
        items: [
          {
            id: Date.now(),
            material: extractedMaterial,
            size: extractedSize,
            qty: entry.quantity || '',
            unit: entry.unit || 'Nos',
            category: itemCategory, // 👈 સીધી કેટેગરી અહી વાપરી લો
            steelSpec: extractedSteelSpec 
          }
        ],
        billFiles: []
      }
    ]);
  };
// 🕒 ૨૪ કલાક પછી એડિટ માટે પરવાનગી ચેક કરવાનું ફંક્શન
  const handleEditClickWithTimeCheck = (entry) => {
    const entryTime = new Date(entry.date).getTime();
    const currentTime = new Date().getTime();
    const hoursDifference = (currentTime - entryTime) / (1000 * 60 * 60);

    // 🎯 અહીં 0.01 ની જગ્યાએ 24 કલાક કરી દીધા છે
    if (hoursDifference > 24) {
      handleRequestEditAfter24Hours(entry); // 24 કલાકથી જૂની હોય તો વોટ્સએપ લિંક ખોલશે
    } else {
      handleEditClick(entry); // 24 કલાકની અંદર હોય તો સીધું એડિટ ચાલુ થશે
    }
  };
 const [inwardSources, setInwardSources] = useState([
    {
      id: 1,
      supplier: '',
      dcNumber: '',
      vehicleNumber: '',
      items: [{ id: 1, material: '', size: '', qty: '', unit: 'Bags', category: 'Raw Material', steelSpec: '' }],
      billFiles: []
    }
  ]);

  useEffect(() => {
    fetchPlants();
  }, []);

  useEffect(() => {
    if (selectedPlantId) {
      fetchMasters(selectedPlantId);
    } else {
      setSuppliers([]);
      setMaterials([]);
      setProducts([]);
    }
  }, [selectedPlantId]);

useEffect(() => {
    fetchPlants();

    // 🔗 1. સૌથી પહેલાં ડાયરેક્ટ URL માંથી approve_id શોધો
    const searchParams = new URLSearchParams(window.location.search);
    let approveId = searchParams.get('approve_id');

    // 🔗 2. જો URL માં ન મળે, તો બ્રાઉઝરના localStorage માંથી ચેક કરો
    if (!approveId) {
      approveId = localStorage.getItem('pending_approve_id');
    } else {
      // જો URL માં મળી જાય, તો ભવિષ્ય માટે localStorage માં પણ સેવ કરી દો
      localStorage.setItem('pending_approve_id', approveId);
    }

    

    if (approveId) {
      handleAutoUnlockEntry(approveId);
      localStorage.removeItem('pending_approve_id'); // કામ પૂરું થયા પછી ડિલીટ કરી દો
      
      // URL માંથી approve_id હટાવી દો જેથી રિફ્રેશ વખતે ફરી ન ચાલે
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      fetchRecentHistory();
    }
  }, []);
  
// 🔍 Recent History State & Logic
  const [recentHistory, setRecentHistory] = useState([]);

  useEffect(() => {
    if (selectedPlant) {
      fetchRecentHistory();
    }
  }, [selectedPlant]);

  const fetchRecentHistory = async () => {
    const { data } = await supabase
      .from('plant_material_inward')
      .select('*')
      .eq('plant_name', selectedPlant)
      .order('created_at', { ascending: false })
      .limit(10);
    setRecentHistory(data || []);
  };
  const fetchMasters = async (plantId) => {
    const { data: supData } = await supabase.from('site_vendors').select('*').or(`plant_id.eq.${plantId},plant_id.is.null`);
    setSuppliers(supData || []);
    const { data: matData } = await supabase.from('site_materials_master').select('*').or(`plant_id.eq.${plantId},plant_id.is.null`);
    setMaterials(matData || []);
    const { data: prodData } = await supabase.from('plant_work_descriptions').select('*').or(`plant_id.eq.${plantId},plant_id.is.null`);
    setProducts(prodData || []);
  };

  const handlePlantChange = (e) => {
    const plantName = e.target.value;
    setSelectedPlant(plantName);
    const foundPlant = plants.find(p => p.plant_name === plantName);
    setSelectedPlantId(foundPlant ? foundPlant.id : '');
  };

  const handleDropdownClick = () => {
    if (!selectedPlant) {
      alert("⚠️ કૃપા કરીને પહેલા ઉપરથી પ્લાન્ટ સિલેક્ટ કરો!");
      return false;
    }
    return true;
  };

  const addInwardSource = () => setInwardSources([...inwardSources, { id: Date.now(), supplier: '', dcNumber: '', vehicleNumber: '', items: [{ id: Date.now(), material: '', qty: '', unit: 'Bags', category: 'Raw Material', steelSpec: '' }], billFiles: [] }]);
  const updateInwardSource = (sIdx, field, val) => { const updated = [...inwardSources]; updated[sIdx][field] = val; setInwardSources(updated); };
  const addInwardItem = (sIdx) => { const updated = [...inwardSources]; updated[sIdx].items.push({ id: Date.now(), material: '', qty: '', unit: 'Bags', category: 'Raw Material', steelSpec: '' }); setInwardSources(updated); };
  const updateInwardItem = (sIdx, iIdx, field, val) => { const updated = [...inwardSources]; updated[sIdx].items[iIdx][field] = val; setInwardSources(updated); };
  const removeInwardSource = (index) => setInwardSources(inwardSources.filter((_, i) => i !== index));
  const removeInwardItem = (sIdx, iIdx) => {
    const updated = [...inwardSources];
    updated[sIdx].items = updated[sIdx].items.filter((_, i) => i !== iIdx);
    setInwardSources(updated);
  };

 const handleSubmitInward = async (e) => {
    e.preventDefault();
    if (!selectedPlant) {
      alert("કૃપા કરીને પહેલા પ્લાન્ટ સિલેક્ટ કરો!");
      return;
    }

    for (let sIdx = 0; sIdx < inwardSources.length; sIdx++) {
      const src = inwardSources[sIdx];
      const hasAnyData = src.supplier || src.dcNumber || src.vehicleNumber || src.items.some(i => i.material || i.qty);
      if (hasAnyData) {
        if (!src.supplier) {
          alert(`⚠️ Inward Source #${sIdx + 1}: કૃપા કરીને સપ્લાયર સિલેક્ટ કરો!`);
          return;
        }
        for (let iIdx = 0; iIdx < src.items.length; iIdx++) {
          const item = src.items[iIdx];
          if (!item.material || !item.qty) {
            alert(`⚠️ Inward Source #${sIdx + 1} (Item #${iIdx + 1}): મટીરિયલ અને Qty બંને ભરવા ફરજિયાત છે!`);
            return;
          }

          const cleanDc = src.dcNumber ? src.dcNumber.trim() : '';
          if (cleanDc !== '' && cleanDc.toLowerCase() !== 'empty') {
            const { data: existingDc } = await supabase
              .from('plant_material_inward')
              .select('id')
              .eq('plant_name', selectedPlant)
              .eq('dc_number', cleanDc)
              .neq('id', editingId || 0)
              .maybeSingle();

            if (existingDc) {
              alert(`❌ ડુપ્લિકેટ એન્ટ્રી અટકાવાઈ: Inward DC Number "${cleanDc}" આ પ્લાન્ટમાં પહેલેથી જ મોજૂદ છે!`);
              return;
            }
          } else {
            const { data: existingMat } = await supabase
              .from('plant_material_inward')
              .select('id')
              .eq('plant_name', selectedPlant)
              .eq('date', dprDate)
              .eq('material_name', item.material)
              .neq('id', editingId || 0)
              .maybeSingle();

            if (existingMat) {
              alert(`❌ ડુપ્લિકેટ એન્ટ્રી અટકાવાઈ: તારીખ ${dprDate} પર આ પ્લાન્ટમાં "${item.material}" ની એન્ટ્રી પહેલેથી જ થયેલ છે!`);
              return;
            }
          }
        }
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    const currentLoggedUser = session?.user?.email || session?.user?.id || user?.email || user?.id || 'Supervisor';

    setLoading(true);
    try {
      let stockLedgerRows = [];
      let materialLedgerRows = [];

      for (const source of inwardSources) {
        let billUrls = [];

        if (existingBills && existingBills.length > 0) {
          billUrls = [...existingBills];
        }

        if (source.billFiles && source.billFiles.length > 0) {
          for (const file of source.billFiles) {
            if (typeof file === 'string') {
              billUrls.push(file);
              continue;
            }

            const fileExt = file.name.split('.').pop();
            const safeSupplier = (source.supplier || 'Unknown_Supplier').replace(/[^a-zA-Z0-9]/g, '_');
            
            let formattedDate = dprDate;
            if (dprDate && dprDate.includes('-')) {
              const parts = dprDate.split('-');
              if (parts.length === 3) {
                formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
              }
            }
            const safeDate = formattedDate.replace(/[^a-zA-Z0-9]/g, '_');
            const firstMaterial = source.items[0]?.material || 'Material';
            const safeMaterial = firstMaterial.replace(/[^a-zA-Z0-9]/g, '_');
            
            const uniqueSuffix = Math.random().toString(36).substring(2, 7);
            const fileName = `${safeSupplier}_${safeDate}_${safeMaterial}_${uniqueSuffix}.${fileExt}`;
            const filePath = `Inward_Material/${fileName}`;
     
            const { error: uploadErr } = await supabase.storage
              .from('Plant')
              .upload(filePath, file);
     
            if (uploadErr) {
              console.error("Upload Error Details:", uploadErr);
              alert("Bill Upload Error: " + uploadErr.message);
              setLoading(false);
              return;
            }
     
            const { data: urlData } = supabase.storage
              .from('Plant')
              .getPublicUrl(filePath);
     
            billUrls.push(urlData.publicUrl);
          }
        }

        const finalBillUrlString = billUrls.length > 0 ? billUrls.join(', ') : 'EMPTY';

        for (const item of source.items) {
          if (item.qty && item.material) {
            const qtyVal = Number(item.qty);
            const categoryStr = (item.category || 'Raw Material').trim();

            // 🎯 1. ફિનિશ્ડ પ્રોડક્ટ હોય તો સાઈઝ અને સ્ટીલ સ્પેસિફિકેશન સાથે પૂરું નામ બનાવો
            let exactProductName = item.material.trim();
            let exactSize = item.size ? item.size.trim() : '';
            let finalSizeVariant = exactSize;
            const isProdPanelOrColumn = exactProductName.toLowerCase().includes('panel') || 
                                       exactProductName.toLowerCase().includes('column');

            let fullMaterialNameToSave = exactProductName;
            if (exactSize) {
              fullMaterialNameToSave += ` ${exactSize}`;
            }

            if (item.steelSpec && isProdPanelOrColumn) {
              fullMaterialNameToSave += ` (${item.steelSpec})`;
              finalSizeVariant = exactSize ? `${exactSize} (${item.steelSpec})` : item.steelSpec;
            } else if (!finalSizeVariant) {
              finalSizeVariant = 'Standard';
            }

            // જો ફિનિશ્ડ પ્રોડક્ટ હોય તો સાઈઝવાળું નામ, બાકી નોર્મલ મટીરિયલ નામ
            const materialNameToSave = categoryStr.toLowerCase() === 'finished product' ? fullMaterialNameToSave : item.material;

            let inData;

            if (editingId) {
              const { data: updatedData, error: updateErr } = await supabase
                .from('plant_material_inward')
                .update({
                  date: dprDate,
                  plant_name: selectedPlant,
                  supplier_name: source.supplier,
                  dc_number: source.dcNumber && source.dcNumber.trim() !== '' ? source.dcNumber.trim() : 'EMPTY',
                  vehicle_no: source.vehicleNumber && source.vehicleNumber.trim() !== '' ? source.vehicleNumber.trim() : 'EMPTY',
                  material_name: materialNameToSave, // 👈 હવે અહીં સાઈઝ સાથેનું પ્રોફેશનલ નામ સેવ થશે
                  quantity: qtyVal,
                  unit: item.unit,
                  item_type: categoryStr,
                  description: source.description || '',
                  bill_url: finalBillUrlString,
                  submitted_by: currentLoggedUser
                })
                .eq('id', editingId)
                .select()
                .single();

              if (updateErr) throw updateErr;
              inData = updatedData;
            } else {
              const { data: insertedData, error: inErr } = await supabase
                .from('plant_material_inward')
                .insert([{
                  date: dprDate,
                  plant_name: selectedPlant,
                  supplier_name: source.supplier,
                  dc_number: source.dcNumber && source.dcNumber.trim() !== '' ? source.dcNumber.trim() : 'EMPTY',
                  vehicle_no: source.vehicleNumber && source.vehicleNumber.trim() !== '' ? source.vehicleNumber.trim() : 'EMPTY',
                  material_name: materialNameToSave, // 👈 અહીં પણ સાઈઝ સાથેનું પૂરેપૂરું નામ સેવ થશે
                  quantity: qtyVal,
                  unit: item.unit,
                  description: source.description || '',
                  item_type: categoryStr,
                  bill_url: finalBillUrlString,
                  submitted_by: currentLoggedUser
                }])
                .select()
                .single();

              if (inErr) throw inErr;
              inData = insertedData;
            }

            if (categoryStr.toLowerCase() === 'finished product') {
              stockLedgerRows.push({
                date: dprDate,
                plant_name: selectedPlant,
                product_name: exactProductName,
                size_variant: finalSizeVariant,
                transaction_type: 'INWARD',
                qty: qtyVal,
                reference_id: inData.id
              });
            } else {
              materialLedgerRows.push({
                date: dprDate,
                plant_name: selectedPlant,
                material_name: item.material,
                unit: item.unit || 'Nos',
                transaction_type: 'INWARD',
                qty: qtyVal,
                reference_id: inData.id
              });
            }
          }
        }
      }

      if (editingId) {
        await supabase.from('material_stock_ledger').delete().eq('reference_id', editingId);
        await supabase.from('stock_ledger').delete().eq('reference_id', editingId);
      }

      if (materialLedgerRows.length > 0) {
        const { error: matErr } = await supabase.from('material_stock_ledger').insert(materialLedgerRows);
        if (matErr) throw matErr;
      }
      
      if (stockLedgerRows.length > 0) {
        const { error: stockErr } = await supabase.from('stock_ledger').insert(stockLedgerRows);
        if (stockErr) throw stockErr;
      }

      const wasEditing = editingId !== null;
      setEditingId(null);
      setExistingBills([]); 
      
      setInwardSources([
        {
          id: Date.now(),
          supplier: '',
          dcNumber: '',
          vehicleNumber: '',
          description: '',
          items: [{ id: Date.now(), material: '', size: '', qty: '', unit: 'Nos', category: 'Raw Material', steelSpec: '' }],
          billFiles: []
        }
      ]);

      fetchRecentHistory();

      if (wasEditing) {
        alert("✅ મટીરિયલ ઇનવર્ડ સફળતાપૂર્વક અપડેટ થઈ ગયું છે!");
      } else {
        alert("✅ મટીરિયલ ઇનવર્ડ સફળતાપૂર્વક સેવ થઈ ગયું છે!");
      }
    } catch (err) {
      alert("એરર: " + err.message);
    } finally {
      setLoading(false);
    }
  };
const handleCancelEdit = () => {
    setEditingId(null);
    setExistingBills([]);
    // ફોર્મને કોરું (Blank) કરવા માટે
    setInwardSources([
      {
        id: Date.now(),
        supplier: '',
        dcNumber: '',
        vehicleNumber: '',
        description: '',
        items: [{ id: Date.now(), material: '', qty: '', unit: 'Nos', category: 'Raw Material', steelSpec: '' }],
        billFiles: []
      }
    ]);
  };
const handleDeleteExistingBill = async (billUrlToRemove) => {
    try {
      // 1. URL માંથી ફાઇલનું નામ (Path) કાઢો (ઉદાહરણ તરીકે: Plant બકેટ પછીનું નામ)
      const urlObj = new URL(billUrlToRemove);
      const pathMatch = urlObj.pathname.split('/public/Plant/')[1] || urlObj.pathname.split('/Plant/')[1];

      if (pathMatch) {
        // 2. Supabase Storage માંથી ફાઇલ ડીલીટ કરો
        const { error } = await supabase.storage
          .from('Plant') // અહી તમારી બકેટનું સાચું નામ લખવું (જેમ કે 'Plant')
          .remove([decodeURIComponent(pathMatch)]);
          
        if (error) {
          console.error("Storage delete error:", error.message);
        }
      }

      // 3. સ્ટેટમાંથી લિંક હટાવો
      const updatedBills = existingBills.filter(url => url !== billUrlToRemove);
      setExistingBills(updatedBills);

    } catch (err) {
      console.error("Error deleting file from bucket:", err);
    }
  };
  const handleAutoUnlockEntry = async (entryId) => {
    console.log("Attempting to unlock entry ID:", entryId);

    const { data, error } = await supabase
      .from('plant_material_inward')
      .update({ 
        is_locked: false, 
        edit_requested: false 
      })
      .eq('id', entryId)
      .select();

    console.log("Supabase Response - Data:", data, "Error:", error);

    if (error) {
      alert("Database Error: " + error.message);
    } else if (!data || data.length === 0) {
      alert("⚠️ એન્ટ્રી મળી નહીં અથવા RLS પોલીસીના લીધે અપડેટ થઈ શકી નથી!");
    } else {
      alert("✅ એન્ટ્રી સફળતાપૂર્વક અનલોક થઈ ગઈ!");
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchRecentHistory();
    }
  };

  // ⏰ ૨૪ કલાક પછી એડિટ માટે પરવાનગી માંગવાનું ફંક્શન
  const handleRequestEditAfter24Hours = (entry) => {
    const adminPhone = "918238598234"; // અહીં એડમિનનો વોટ્સએપ નંબર નાખવો
    const approvalLink = `${window.location.origin}${window.location.pathname}?approve_id=${entry.id}`;
    
    const message = `🔔 *Edit Approval Request*\n\nયુઝરે 24 કલાક જૂની નીચેની એન્ટ્રી સુધારવા માટે પરવાનગી માંગી છે:\n• પ્લાન: ${entry.plant_name}\n• સપ્લાયર: ${entry.supplier_name}\n• મટીરિયલ: ${entry.material_name}\n\n👉 એડિટ મંજૂર કરવા માટે આ લિંક પર ક્લિક કરો:\n${approvalLink}`;

    window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '650px', margin: '0 auto', paddingBottom: '20px', fontFamily: 'Inter, sans-serif' }}>
      
     {/* 1. Modern Green Header */}
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
          backgroundColor: '#22c55e', 
          padding: '8px', 
          borderRadius: '10px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(34, 197, 94, 0.2)'
        }}>
          <ArrowDownRight size={20} color="#ffffff" strokeWidth={2.5} />
        </div>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#14532d', margin: 0, letterSpacing: '0.2px' }}>
            Plant Material Inward Entry
          </h3>
          <span style={{ fontSize: '11px', color: '#15803d', fontWeight: '600' }}>
            Manage raw materials and incoming stock efficiently
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmitInward} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 2. Modern Plant & Date Selection Card */}
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
            onChange={handlePlantChange} 
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
            Date *
          </label>
          <input 
            type="date" 
            value={dprDate} 
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
        {/* ================= 2. MATERIAL INWARD ================= */}
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px dashed #cbd5e1', paddingBottom: '10px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#166534', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowDownRight size={18} /> 2. MATERIAL INWARD (મટીરિયલ આવ્યું)
            </h4>
            <button type="button" onClick={addInwardSource} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={14} /> Add Source
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {inwardSources.map((source, sIndex) => {
              const selectedSupplierData = suppliers.find(sup => sup.name === source.supplier);
              const supplierMaterials = selectedSupplierData?.materials_supplied || [];

              return (
                <div key={source.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: sIndex < inwardSources.length - 1 ? '2px solid #cbd5e1' : 'none', paddingBottom: sIndex < inwardSources.length - 1 ? '16px' : '0' }}>
                  
                  {/* 🏷️ Source Tag & Remove */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', backgroundColor: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '6px' }}>
                      Source #{sIndex + 1}
                    </span>
                    {inwardSources.length > 1 && (
                      <button type="button" onClick={() => removeInwardSource(sIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                        Remove Source
                      </button>
                    )}
                  </div>

                  {/* 🏢 Select Vendor / Supplier + Manual Input Option */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <select 
                      value={suppliers.some(sup => sup.name === source.supplier) ? source.supplier : (source.supplier ? 'OTHER_SUPPLIER_MANUAL' : '')} 
                      onClick={handleDropdownClick} 
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'OTHER_SUPPLIER_MANUAL') {
                          updateInwardSource(sIndex, 'supplier', 'OTHER_SUPPLIER_MANUAL');
                        } else {
                          updateInwardSource(sIndex, 'supplier', val);
                        }
                      }} 
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}
                    >
                      <option value="">-- Select Vendor / Supplier --</option>
                      {suppliers
                        .filter(sup => sup.site_name === selectedPlant || sup.site_name === 'All Sites (General)' || !sup.site_name) 
                        .map(sup => <option key={sup.id} value={sup.name}>{sup.name}</option>)
                      }
                      <option value="OTHER_SUPPLIER_MANUAL" style={{ fontWeight: 'bold', color: '#2563eb' }}>➕ Other (Type Manually...)</option>
                    </select>

                    {/* Custom Supplier Manual Input */}
                    {(source.supplier === 'OTHER_SUPPLIER_MANUAL' || (!suppliers.some(sup => sup.name === source.supplier) && source.supplier !== '')) && (
                      <input 
                        type="text" 
                        placeholder="Type custom supplier/vendor name here..." 
                        value={source.supplier === 'OTHER_SUPPLIER_MANUAL' ? '' : source.supplier} 
                        onChange={(e) => updateInwardSource(sIndex, 'supplier', e.target.value)} 
                        autoFocus
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #2563eb', fontSize: '12px', backgroundColor: '#eff6ff', boxSizing: 'border-box' }} 
                      />
                    )}
                  </div>

                  {/* 📦 Material Items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {source.items.map((item, iIndex) => {
                      const isFinishedProduct = item.category === 'Finished Product';
                      const isPanel = item.material && item.material.toLowerCase().includes('panel');
                      const isColumn = item.material && item.material.toLowerCase().includes('column');
                      
                      const filteredMaterials = materials.filter(m => {
                        if (item.category && m.item_type) {
                          const dbType = m.item_type.toLowerCase().trim();
                          const selCat = item.category.toLowerCase().trim();
                          if (!dbType.includes(selCat.split(' ')[0])) return false;
                        }
                        if (supplierMaterials && supplierMaterials.length > 0) {
                          if (!supplierMaterials.includes(m.name)) return false;
                        }
                        return true;
                      });

                      const isMaterialInList = isFinishedProduct 
                        ? products.some(p => (p.product_size ? `${p.name} (${p.product_size})` : p.name) === item.material)
                        : (filteredMaterials.some(m => m.name === item.material) || materials.some(m => m.name === item.material));

                      const dropdownValue = isMaterialInList ? item.material : (item.material ? 'OTHER_MANUAL' : '');
                      const showManualBox = !isFinishedProduct && (item.material === 'OTHER_MANUAL' || (!isMaterialInList && item.material));

                      return (
                        <div key={item.id} style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          
                          {/* Category Select */}
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'space-between' }}>
                            <select 
                              value={item.category || 'Raw Material'} 
                              onChange={(e) => {
                                updateInwardItem(sIndex, iIndex, 'category', e.target.value);
                                updateInwardItem(sIndex, iIndex, 'material', ''); 
                              }} 
                              style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#f8fafc', fontWeight: 'bold', color: '#166534' }}
                            >
                              <option value="Raw Material">1. Raw Material</option>
                              <option value="Consumable Item">2. Consumable Item</option>
                              <option value="Tools and Hardware">3. Tools and Hardware</option>
                              <option value="Finished Product">4. Finished Product</option>
                              <option value="Asset">5. Asset</option>
                            </select>
                            
                            {source.items.length > 1 && (
                              <button type="button" onClick={() => removeInwardItem(sIndex, iIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px 4px' }}>
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
{/* Material, Size, Qty & Unit Row */}
{(() => {
  // 🎯 ચેક કરો કે સિલેક્ટ કરેલું મટીરિયલ પ્રોડક્ટ લિસ્ટ કે ફિલ્ટર મટીરિયલ લિસ્ટમાં છે કે નહીં
  const isMaterialInList = isFinishedProduct 
    ? Array.from(new Map(products.map(p => [p.name ? p.name.trim().toLowerCase() : '', p.name ? p.name.trim() : ''])).values())
        .map(n => n.trim().toLowerCase())
        .includes((item.material || '').trim().toLowerCase())
    : filteredMaterials.some(m => m.name && m.name.trim().toLowerCase() === (item.material || '').trim().toLowerCase());

  const isCustomMaterial = item.material === 'OTHER_MANUAL' || (!isMaterialInList && item.material !== '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
      
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        
        {/* 1. Material Dropdown */}
        <div style={{ flex: isFinishedProduct ? '1.1' : '1.8', minWidth: '0' }}>
          <select 
            value={isCustomMaterial ? 'OTHER_MANUAL' : (item.material || '')} 
            onClick={handleDropdownClick} 
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'OTHER_MANUAL') {
                updateInwardItem(sIndex, iIndex, 'material', 'OTHER_MANUAL');
              } else {
                updateInwardItem(sIndex, iIndex, 'material', val);
              }
              updateInwardItem(sIndex, iIndex, 'size', ''); // મટીરિયલ બદલાય એટલે સાઈઝ ખાલી થઈ જાય
            }} 
            style={{ width: '100%', padding: '7px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}
          >
            <option value="">-- Select Material --</option>
            {isFinishedProduct ? (
              Array.from(
                new Map(
                  products.map(p => [p.name ? p.name.trim().toLowerCase() : '', p.name ? p.name.trim() : ''])
                ).values()
              ).map((prodName, idx) => (
                <option key={`inward-prod-${idx}`} value={prodName}>{prodName}</option>
              ))
            ) : (
              filteredMaterials.map(m => <option key={`inward-m-${m.id}`} value={m.name}>{m.name}</option>)
            )}
            <option value="OTHER_MANUAL" style={{ fontWeight: 'bold', color: '#2563eb' }}>➕ Other (Type Manually...)</option>
          </select>
        </div>

        {/* 2. Size Dropdown (જો Custom કે Other ન હોય તો જ દેખાશે) */}
        {isFinishedProduct && !isCustomMaterial && (
          <div style={{ flex: '1', minWidth: '0' }}>
            <select 
              value={item.size || ''} 
              onChange={(e) => updateInwardItem(sIndex, iIndex, 'size', e.target.value)} 
              style={{ width: '100%', padding: '7px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#f8fafc', fontWeight: 'bold', color: '#0f172a', boxSizing: 'border-box' }}
            >
              <option value="">-- Select Size --</option>
              {products
                .filter(p => p.name && item.material && p.name.trim().toLowerCase() === item.material.trim().toLowerCase() && p.product_size)
                .map((p, sIdx) => (
                  <option key={`inward-sz-${sIdx}`} value={p.product_size}>{p.product_size}</option>
                ))
              }
            </select>
          </div>
        )}

        {/* જો મટીરિયલ Custom કે Other હોય તો સાઈઝ માટે ટેક્સ્ટ બોક્સ */}
        {isFinishedProduct && isCustomMaterial && (
          <div style={{ flex: '1', minWidth: '0' }}>
            <input 
              type="text" 
              placeholder="Type size..." 
              value={item.size || ''} 
              onChange={(e) => updateInwardItem(sIndex, iIndex, 'size', e.target.value)} 
              style={{ width: '100%', padding: '7px 4px', borderRadius: '6px', border: '1px solid #2563eb', fontSize: '11px', backgroundColor: '#eff6ff', boxSizing: 'border-box' }} 
            />
          </div>
        )}

        {/* Qty Input */}
        <div style={{ flex: '0.7', minWidth: '0' }}>
          <input 
            type="number" 
            placeholder="Qty" 
            value={item.qty} 
            onChange={(e) => updateInwardItem(sIndex, iIndex, 'qty', e.target.value)} 
            style={{ width: '100%', padding: '7px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', textAlign: 'center', boxSizing: 'border-box' }} 
          />
        </div>

        {/* Unit Select */}
        <div style={{ flex: '0.8', minWidth: '0' }}>
          <select 
            value={item.unit} 
            onChange={(e) => updateInwardItem(sIndex, iIndex, 'unit', e.target.value)} 
            style={{ width: '100%', padding: '7px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}
          >
            <option value="Nos">Nos</option>
            <option value="Tons">Tons</option>
            <option value="Bags">Bags</option>
            <option value="Kg">Kg</option>
          </select>
        </div>

      </div>

      {/* 3. Material Manual Input Box (ટાઈપ કરતી વખતે બોક્સ બંધ નહીં થાય અને સ્મૂધલી ટાઈપ થશે) */}
      {isCustomMaterial && (
        <input 
          type="text" 
          placeholder="Type custom material name here..." 
          value={item.material === 'OTHER_MANUAL' ? '' : item.material} 
          onChange={(e) => {
            const val = e.target.value;
            updateInwardItem(sIndex, iIndex, 'material', val);
          }} 
          autoFocus
          style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #ea580c', fontSize: '12px', backgroundColor: '#fff7ed', boxSizing: 'border-box' }} 
        />
      )}

    </div>
  );
})()}

                          {/* Column Spec */}
                          {isColumn && (
                            <div style={{ backgroundColor: '#f8fafc', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#334155' }}>🛠️ Column Spec:</span>
                              <select 
                                value={item.steelSpec || ''} 
                                onChange={(e) => updateInwardItem(sIndex, iIndex, 'steelSpec', e.target.value)} 
                                style={{ flex: 1, padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff' }}
                              >
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
                              <select 
                                value={item.steelSpec || ''} 
                                onChange={(e) => updateInwardItem(sIndex, iIndex, 'steelSpec', e.target.value)} 
                                style={{ flex: 1, padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff' }}
                              >
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

                    {/* 🎯 Add Item અને Bill Upload બટન એક જ લાઈનમાં */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', marginBottom: '8px' }}>
                      <button 
                        type="button" 
                        onClick={() => addInwardItem(sIndex)} 
                        style={{ backgroundColor: 'transparent', color: '#166534', border: '1px dashed #16a34a', padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Plus size={13} /> Add Item
                      </button>

                      <div>
                        <input 
                          type="file" 
                          id={`bill-upload-${sIndex}`} 
                          style={{ display: 'none' }} 
                          multiple 
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            const files = Array.from(e.target.files);
                            if (files.length > 0) {
                              const existingFiles = source.billFiles || [];
                              updateInwardSource(sIndex, 'billFiles', [...existingFiles, ...files]);
                            }
                            e.target.value = null;
                          }} 
                        />
                        
                        {/* 📎 Upload Button */}
                        <label 
                          htmlFor={`bill-upload-${sIndex}`} 
                          style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px dashed #3b82f6', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          📎 {source.billFiles && source.billFiles.length > 0 ? `${source.billFiles.length} Files Selected` : 'Upload Bills'}
                        </label>
{/* 📁 Existing/Old Bills preview during Edit */}
                        {existingBills && existingBills.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#0369a1' }}>Already Uploaded Bills:</span>
                            {existingBills.map((url, bIndex) => {
                              const fileName = url.split('/').pop().split('?')[0];
                              return (
                                <div key={bIndex} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e0f2fe', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', border: '1px solid #bae6fd' }}>
                                  <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#0369a1', textDecoration: 'underline', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fileName}>
                                    📄 {fileName}
                                  </a>
                                  <button 
                                    type="button" 
                                    onClick={() => handleDeleteExistingBill(url)}
                                    style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', padding: '0 4px' }}
                                    title="Delete file from bucket"
                                  >
                                    ✕
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* 📂 સિલેક્ટ થયેલી નવી ફાઇલોની યાદી અને Remove (✕) બટન */}
                        {source.billFiles && source.billFiles.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                            {source.billFiles.map((file, fIndex) => (
                              <div key={fIndex} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', border: '1px solid #cbd5e1' }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }} title={file.name}>
                                  📄 {file.name}
                                </span>
                                
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    const updatedFiles = source.billFiles.filter((_, idx) => idx !== fIndex);
                                    updateInwardSource(sIndex, 'billFiles', updatedFiles);
                                  }} 
                                  style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', padding: '0 4px' }}
                                  title="Remove file"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* DC Number & Vehicle Number */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" placeholder="DC Number" value={source.dcNumber} onChange={(e) => updateInwardSource(sIndex, 'dcNumber', e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                    <input type="text" placeholder="Vehicle Number" value={source.vehicleNumber} onChange={(e) => updateInwardSource(sIndex, 'vehicleNumber', e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                  </div>


{/* Description Box (નવું ઉમેરેલું) */}
<div style={{ marginTop: '2px' }}>
  <input 
    type="text" 
    placeholder="Description / Remarks (e.g. Unloading damage notes)" 
    value={source.description || ''} 
    onChange={(e) => updateInwardSource(sIndex, 'description', e.target.value)} 
    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} 
  />
</div>
                </div>
              );
            })}
          </div>
        </div>

<div style={{ display: 'flex', gap: '10px' }}>
        {/* મુખ્ય Update / Submit બટન */}
        <button 
          type="submit" 
          disabled={loading} 
          style={{ 
            flex: 1,
            backgroundColor: editingId ? '#2563eb' : '#16a34a', 
            color: '#fff', 
            padding: '14px', 
            borderRadius: '12px', 
            border: 'none', 
            fontWeight: 'bold', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px' 
          }}
        >
          <Send size={16} /> 
          {loading ? 'Processing...' : (editingId ? 'Update Inward Entry' : 'Submit Inward Entry')}
        </button>

        {/* ❌ Cancel & Delete Buttons (એડિટ મોડ ચાલુ હોય તો જ દેખાશે) */}
        {editingId && (
          <>
            <button 
              type="button" 
              onClick={handleCancelEdit}
              style={{ 
                backgroundColor: '#64748b', 
                color: '#fff', 
                padding: '14px 20px', 
                borderRadius: '12px', 
                border: 'none', 
                fontWeight: 'bold', 
                cursor: 'pointer' 
              }}
            >
              Cancel
            </button>

            {/* 🗑️ Delete Button */}
            <button 
              type="button" 
              title="Delete this entry"
              onClick={async () => {
                const confirmDelete = window.confirm("શું તમે ખરેખર આ આખી ઇનવર્ડ એન્ટ્રી ડિલીટ કરવા માંગો છો? આની સાથે લેજરનો ડેટા પણ ડિલીટ થઈ જશે.");
                
                if (confirmDelete) {
                  try {
                    // 1. લેજરમાંથી ડેટા કાઢો
                    await supabase.from('material_stock_ledger').delete().eq('reference_id', editingId);
                    await supabase.from('stock_ledger').delete().eq('reference_id', editingId);

                    // 2. મેઈન ઇનવર્ડ એન્ટ્રી કાઢો
                    const { error: delErr } = await supabase
                      .from('plant_material_inward')
                      .delete()
                      .eq('id', editingId);

                    if (delErr) throw delErr;

                    alert("✅ ઇનવર્ડ એન્ટ્રી સફળતાપૂર્વક ડિલીટ થઈ ગઈ છે!");
                    
                    handleCancelEdit();
                    fetchRecentHistory();

                  } catch (err) {
                    alert("એરર: એન્ટ્રી ડિલીટ કરવામાં સમસ્યા આવી રહી છે - " + err.message);
                  }
                }
              }}
              style={{ 
                backgroundColor: '#fef2f2', 
                color: '#dc2626', 
                padding: '14px 20px', 
                borderRadius: '12px', 
                border: '1px solid #fca5a5', 
                fontWeight: 'bold', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
               <Trash2 size={18} /> Delete
            </button>
          </>
        )}
      </div>
      
{/* 📜 Recent Inward History (Clean Look & 24h Edit) */}
{recentHistory.length > 0 && (
  <div style={{ marginTop: '15px' }}>
    <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '8px', paddingLeft: '4px' }}>
      Recent Inward History (Last 24 Hours Editable)
    </h4>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {recentHistory.map((item) => {
        // ⏰ ૨૪ કલાક (24 Hours) ચેક કરવાનું લોજિક (ટેસ્ટિંગ માટે 0.01 રાખ્યું છે, પછી 24 કરી દેજો)
        const entryTime = new Date(item.created_at || item.date).getTime();
        const currentTime = new Date().getTime();
        const hoursDifference = (currentTime - entryTime) / (1000 * 60 * 60);
        
        // જો સમય વીતી ગયો હોય અથવા is_locked True હોય
        // 🛠️ સુધારેલું લોજિક: જો ડેટાબેઝમાં is_locked explicitly false હોય, તો સમય ગમે તે હોય તો પણ અનલોક ગણવું!
const isLocked = item.is_locked === true;

        return (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <span style={{ fontWeight: 'bold', color: '#166534' }}>{item.material_name}</span> ({item.quantity} {item.unit}) - <span style={{ color: '#64748b' }}>{item.supplier_name}</span>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>DC: {item.dc_number || 'EMPTY'} | Date: {item.date}</div>
            </div>

            {isLocked ? (
              <button 
                type="button"
                onClick={() => handleEditClickWithTimeCheck(item)}
                style={{ fontSize: '11px', fontWeight: 'bold', color: '#b91c1c', backgroundColor: '#fef2f2', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #fecaca' }}
              >
                🔒 Request Edit
              </button>
            ) : (
              <button 
                type="button"
                onClick={() => handleEditClickWithTimeCheck(item)}
                style={{ fontSize: '11px', fontWeight: 'bold', color: '#1d4ed8', backgroundColor: '#eff6ff', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #bfdbfe' }}
              >
                {editingId === item.id ? 'Editing...' : 'Edit'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  </div>
)}


      </form>
    </div>
  );
}