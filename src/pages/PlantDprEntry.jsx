import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ClipboardList, Send, ArrowDownRight, Factory, Plus, Trash2, Clock } from 'lucide-react';

function PlantDprEntry({ user }) {
  const [plants, setPlants] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [dprDate, setDprDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [labours, setLabours] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [sites, setSites] = useState([]);
  const [recentHistory, setRecentHistory] = useState([]); // 📜 Recent History State
const [editingId, setEditingId] = useState(null);
  const [productionSources, setProductionSources] = useState([
    {
      id: 1,
      labour: '', 
      concreteSource: 'Site Mix', 
      actualCementUsed: '',
      bomSuggestedCement: 0,
      bomSuggestedM3: 0,
      items: [
        {
          id: 1,
          product: '',
          sizeVariant: '',
          lineOfCasting: '', 
          steelRows: [{ productSize: '', wireSize: '3mm', wireCount: '4', totalLines: '', qty: '' }], 
          brokenQty: 0,
          qty: '' 
        }
      ],
      remarks: ''
    }
  ]);

  const [loading, setLoading] = useState(false);
  
// 🔗 DPR પેજમાં URL અથવા LocalStorage માંથી approve_id પકડીને અનલોક કરવાનું પરફેક્ટ લોજિક
  useEffect(() => {
    // 1. URL માંથી approve_id શોધો
    const searchParams = new URLSearchParams(window.location.search);
    let approveId = searchParams.get('approve_id');

    // 2. જો URL માં ન મળે, તો localStorage માંથી ચેક કરો
    if (!approveId) {
      approveId = localStorage.getItem('pending_dpr_approve_id');
    } else {
      localStorage.setItem('pending_dpr_approve_id', approveId);
    }

    // 3. જો ID મળી જાય, તો ડાયરેક્ટ અનલોક ફંક્શન ચલાવો
    if (approveId) {
      handleAutoUnlockEntry(approveId);
      localStorage.removeItem('pending_dpr_approve_id');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (selectedPlant) {
      fetchRecentHistory();
    }
  }, [selectedPlant]);

  useEffect(() => {
    fetchPlants();
  }, []);

  useEffect(() => {
    if (selectedPlantId) {
      fetchMasters(selectedPlantId);
    } else {
      setLabours([]);
      setMaterials([]);
      setProducts([]);
      setSites([]);
    }
  }, [selectedPlantId]);

  // 📜 પ્લાન્ટ સિલેક્ટ થાય એટલે હિસ્ટ્રી ફેચ કરવા માટે અને URL માંથી approve_id ચેક કરવા માટે
  useEffect(() => {
    if (selectedPlant) {
      fetchRecentHistory();
    }

    // 🔗 1. સૌથી પહેલાં ડાયરેક્ટ URL માંથી approve_id શોધો (DPR માટે)
    const searchParams = new URLSearchParams(window.location.search);
    let approveId = searchParams.get('approve_id');

    if (!approveId) {
      approveId = localStorage.getItem('pending_dpr_approve_id');
    } else {
      localStorage.setItem('pending_dpr_approve_id', approveId);
    }

    if (approveId) {
      handleAutoUnlockEntry(approveId);
      localStorage.removeItem('pending_dpr_approve_id');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [selectedPlant]);

  const fetchPlants = async () => {
    const { data } = await supabase.from('plants').select('*');
    setPlants(data || []);
  };

  const fetchRecentHistory = async () => {
    const { data } = await supabase
      .from('production_header')
      .select('*')
      .eq('plant_name', selectedPlant)
      .order('created_at', { ascending: false })
      .limit(10);
    setRecentHistory(data || []);
  };

  const fetchMasters = async (plantId) => {
    const { data: siteData } = await supabase.from('sites').select('*').or(`plant_id.eq.${plantId},plant_id.is.null`);
    setSites(siteData || []);

    const { data: labData } = await supabase.from('contractors').select('*').or(`plant_id.eq.${plantId},plant_id.is.null`);
    setLabours(labData || []);

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

  const handleLabourCheck = (sourceLabour) => {
    if (!sourceLabour) {
      alert("⚠️ Please select labour first!");
      return false;
    }
    return true;
  };
// ✏️ એડિટ મોડ ચાલુ કરીને પ્રોડક્ટ અને સ્ટીલની વિગતો સાચી શરત મુજબ લોડ કરવાનું ફંક્શન
  const handleEditClick = async (entry) => {
    setEditingId(entry.id);
    setDprDate(entry.production_date || dprDate);
    setSelectedPlant(entry.plant_name || selectedPlant);
    
    try {
      const { data: itemsData, error } = await supabase
        .from('production_items')
        .select('*')
        .eq('header_id', entry.id);

      if (error) throw error;

      if (itemsData && itemsData.length > 0) {
        let formattedItems = [];

        for (const item of itemsData) {
          const { data: steelData } = await supabase
            .from('production_steel_details')
            .select('*')
            .eq('item_id', item.id);

          const isColumn = item.product_name ? item.product_name.toLowerCase().includes('column') : false;
          const isPanel = item.product_name ? item.product_name.toLowerCase().includes('panel') : false;

          let steelRowsFormatted = [];
          if (steelData && steelData.length > 0) {
            steelRowsFormatted = steelData.map(st => {
              // 🎯 કન્ડિશન મુજબ સાચી વેલ્યુ સેટ કરવી:
              // - Panel માટે totalLines માં વેલ્યુ જવી જોઈએ
              // - Column અને General માટે qty માં વેલ્યુ જવી જોઈએ
              return {
                productSize: item.size_variant || '',
                wireSize: st.steel_size || '3mm',
                wireCount: st.wires_or_bars ? st.wires_or_bars.replace(/[^0-9]/g, '') : '4',
                totalLines: isPanel ? (st.total_qty / 30) : '', // પેનલ માટે લાઈન્સ (Total Qty / 30)
                qty: !isPanel ? (st.total_qty || '') : ''     // કૉલમ કે જનરલ માટે Qty
              };
            });
          } else {
            steelRowsFormatted = [{ productSize: '', wireSize: '3mm', wireCount: '4', totalLines: '', qty: '' }];
          }

          formattedItems.push({
            id: item.id,
            product: item.product_name || '',
            sizeVariant: item.size_variant || '',
            lineOfCasting: item.nos_of_line_casting || '',
            steelRows: steelRowsFormatted,
            brokenQty: item.broken_qty || 0,
            qty: item.nos_of_line_casting ? item.nos_of_line_casting * 30 : (steelRowsFormatted[0]?.qty || '')
          });
        }

        setProductionSources([
          {
            id: Date.now(),
            labour: entry.team_name || '',
            concreteSource: itemsData[0]?.concrete_source || 'Site Mix',
            actualCementUsed: entry.actual_cement_used || entry.total_rmc_used || '',
            bomSuggestedCement: 0,
            bomSuggestedM3: 0,
            items: formattedItems,
            remarks: ''
          }
        ]);
      } else {
        setProductionSources([
          {
            id: Date.now(),
            labour: entry.team_name || '',
            concreteSource: 'Site Mix',
            actualCementUsed: entry.actual_cement_used || entry.total_rmc_used || '',
            bomSuggestedCement: 0,
            bomSuggestedM3: 0,
            items: [{ id: Date.now(), product: '', sizeVariant: '', lineOfCasting: '', steelRows: [{ productSize: '', wireSize: '3mm', wireCount: '4', totalLines: '', qty: '' }], brokenQty: 0, qty: '' }],
            remarks: ''
          }
        ]);
      }

      alert("✏️ એડિટ મોડ ચાલુ થઈ ગયો છે!");
    } catch (err) {
      console.error("Error fetching items for edit:", err.message);
      alert("એરર: ડેટા લોડ કરવામાં સમસ્યા થઈ છે.");
    }
  };
 const handleEditClickWithTimeCheck = (entry) => {
    // 🎯 1. સૌથી પહેલાં ડેટાબેઝનું is_locked ચેક કરો (જો મેન્યુઅલી કે ટ્રિગરથી TRUE કર્યું હોય તો તરત પકડાઈ જાય)
    if (entry.is_locked === true) {
      handleRequestEditAfter24Hours(entry);
      return;
    }

    // 2. જો ડેટાબેઝમાં false હોય, તો 24 કલાકનો ટાઈમ ડિફરન્સ ચેક કરો
    const entryTime = new Date(entry.created_at || entry.production_date).getTime();
    const currentTime = new Date().getTime();
    const hoursDifference = (currentTime - entryTime) / (1000 * 60 * 60);

    if (hoursDifference > 24) {
      handleRequestEditAfter24Hours(entry); // 24 કલાકથી જૂની હોય તો વોટ્સએપ લિંક મોકલશે
    } else {
      handleEditClick(entry); // 24 કલાકની અંદર હોય તો સીધું એડિટ ચાલુ થશે
    }
  };

  // 🔔 ૨૪ કલાક પછી એડિટ માટે વોટ્સએપ રિક્વેસ્ટ મોકલવાનું ફંક્શન
  const handleRequestEditAfter24Hours = (entry) => {
    const adminPhone = "918238598234"; 
    // 🎯 અહીં લિંકમાં '&type=dpr' અચૂક ઉમેરવું જેથી ડેશબોર્ડને ખબર પડે કે આ DPR ની લિંક છે
    const approvalLink = `${window.location.origin}${window.location.pathname}?approve_id=${entry.id}&type=dpr`;
    
    const message = `🔔 *DPR Edit Approval Request*\n\nયુઝરે 24 કલાક જૂની નીચેની DPR એન્ટ્રી સુધારવા માટે પરવાનગી માંગી છે:\n• પ્લાન્ટ: ${entry.plant_name}\n• ટીમ: ${entry.team_name}\n• તારીખ: ${entry.production_date}\n\n👉 એડિટ મંજૂર કરવા માટે આ લિંક પર ક્લિક કરો:\n${approvalLink}`;

    window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };
// 🔓 DPR એડમિન લિંક પર ક્લિક કરે એટલે એન્ટ્રી અનલોક કરવાનું ફંક્શન
 const handleAutoUnlockEntry = async (entryId) => {
    console.log("Attempting to unlock DPR entry ID:", entryId);

    const { data, error } = await supabase
      .from('production_header') // 👈 DPR નું મુખ્ય ટેબલ
      .update({ 
        is_locked: false, 
        edit_requested: false 
      })
      .eq('id', entryId)
      .select();

    console.log("DPR Supabase Response - Data:", data, "Error:", error);

    if (error) {
      alert("Database Error: " + error.message);
    } else if (!data || data.length === 0) {
      alert("⚠️ DPR એન્ટ્રી મળી નહીં!");
    } else {
      alert("✅ DPR એન્ટ્રી સફળતાપૂર્વક અનલોક થઈ ગઈ!");
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchRecentHistory();
    }
  };

  const updateBomCementForSource = async (sIdx, updatedSources) => {
    const source = updatedSources[sIdx];
    if (source.concreteSource !== 'Site Mix') return;

    let totalCalculatedCement = 0;

    for (const item of source.items) {
      if (!item.product) continue;
      const isColumn = item.product.toLowerCase().includes('column');
      const isPanel = item.product.toLowerCase().includes('panel');
      
      // 🎯 સુધારો: જો કૉલમ હોય તો સ્ટીલ રો ની Qty, પેનલ કે યુ-ડ્રેઈન હોય તો લાઈન કે ડાયરેક્ટ Qty લેવી
      let totalProducedQty = 0;
      if (isColumn) {
        totalProducedQty = item.steelRows ? item.steelRows.reduce((acc, s) => acc + (Number(s.qty) || 0), 0) : 0;
      } else if (isPanel) {
        totalProducedQty = (Number(item.lineOfCasting) || 0) * 30;
      } else {
        totalProducedQty = Number(item.qty) || 0; // 👈 આ યુ-ડ્રેઈન કે અન્ય પ્રોડક્ટ માટે ડાયરેક્ટ Qty પકડશે!
      }

      if (totalProducedQty <= 0) continue;

      let productVariant = item.sizeVariant || 'Standard';
      if (isColumn && item.steelRows && item.steelRows.length > 0) {
        productVariant = item.steelRows[0].productSize || 'Standard';
      }

      try {
        const { data: bomData } = await supabase
          .from('plant_work_descriptions')
          .select('bom_items, expected_m3')
          .ilike('name', (item.product || '').trim())
          .ilike('product_size', (productVariant || '').trim())
          .maybeSingle();

        if (bomData && bomData.bom_items) {
          const bomList = Array.isArray(bomData.bom_items) ? bomData.bom_items : [bomData.bom_items];
          for (const bom of bomList) {
            if (bom.material && bom.material.toLowerCase().includes('cement')) {
              totalCalculatedCement += (Number(bom.consumption) || 0) * totalProducedQty;
            }
          }
        }
      } catch (err) {
        console.error("BOM Auto Calc Error:", err);
      }
    }

    updatedSources[sIdx].bomSuggestedCement = totalCalculatedCement > 0 ? Math.round(totalCalculatedCement) : 0;
    setProductionSources([...updatedSources]);
  };

  const updateBomM3ForSource = async (sIdx, updatedSources) => {
    const source = updatedSources[sIdx];
    if (source.concreteSource !== 'RMC') return;

    let totalCalculatedM3 = 0;

    for (const item of source.items) {
      if (!item.product) continue;
      const isColumn = item.product.toLowerCase().includes('column');
      const isPanel = item.product.toLowerCase().includes('panel');
      
      let totalProducedQty = 0;
      if (isColumn) {
        totalProducedQty = item.steelRows ? item.steelRows.reduce((acc, s) => acc + (Number(s.qty) || 0), 0) : 0;
      } else if (isPanel) {
        totalProducedQty = (Number(item.lineOfCasting) || 0) * 30;
      } else {
        totalProducedQty = Number(item.qty) || 0;
      }

      if (totalProducedQty <= 0) continue;

      let productVariant = item.sizeVariant || 'Standard';
      if (isColumn && item.steelRows && item.steelRows.length > 0) {
        productVariant = item.steelRows[0].productSize || 'Standard';
      }

      try {
        // 🎯 .eq ની જગ્યાએ .ilike વાપરી લીધું જેથી સાઇઝની મિસ્ટેક ના થાય
        const { data: prodData } = await supabase
          .from('plant_work_descriptions')
          .select('expected_m3')
          .ilike('name', (item.product || '').trim())
          .ilike('product_size', (productVariant || '').trim())
          .maybeSingle();

        if (prodData && prodData.expected_m3) {
          totalCalculatedM3 += Number(prodData.expected_m3) * totalProducedQty;
        }
      } catch (err) {
        console.error("RMC BOM Calc Error:", err);
      }
    }

    updatedSources[sIdx].bomSuggestedM3 = totalCalculatedM3 > 0 ? Number(totalCalculatedM3.toFixed(3)) : 0;
    setProductionSources([...updatedSources]);
  };

  const addProductionSource = () => setProductionSources([...productionSources, {
    id: Date.now(),
    labour: '',
    concreteSource: 'Site Mix',
    actualCementUsed: '',
    bomSuggestedCement: 0,
    bomSuggestedM3: 0,
    items: [{ id: Date.now(), product: '', sizeVariant: '', lineOfCasting: '', steelRows: [{ productSize: '', wireSize: '3mm', wireCount: '4', totalLines: '', qty: '' }], brokenQty: 0, qty: '' }],
    remarks: ''
  }]);

  const removeProductionSource = (index) => setProductionSources(productionSources.filter((_, i) => i !== index));
  const updateProductionSource = (sIdx, field, val) => { 
    const updated = [...productionSources]; 
    updated[sIdx][field] = val; 
    setProductionSources(updated); 
  };

  const addProductionItem = (sIdx) => {
    const updated = [...productionSources];
    updated[sIdx].items.push({ id: Date.now(), product: '', sizeVariant: '', lineOfCasting: '', steelRows: [{ productSize: '', wireSize: '3mm', wireCount: '4', totalLines: '', qty: '' }], brokenQty: 0, qty: '' });
    setProductionSources(updated);
  };

  const removeProductionItem = (sIdx, iIdx) => {
    const updated = [...productionSources];
    updated[sIdx].items = updated[sIdx].items.filter((_, i) => i !== iIdx);
    updateBomCementForSource(sIdx, updated);
    updateBomM3ForSource(sIdx, updated);
    setProductionSources(updated);
  };

  const updateProductionItem = async (sIdx, iIdx, field, val) => {
    const updated = [...productionSources];
    updated[sIdx].items[iIdx][field] = val;
    if (field === 'lineOfCasting') {
      const lineVal = Number(val) || 0;
      updated[sIdx].items[iIdx].qty = lineVal ? lineVal * 30 : '';
    }
    await updateBomCementForSource(sIdx, updated);
    await updateBomM3ForSource(sIdx, updated);
  };

  const addSteelRow = (sIdx, iIdx) => {
    const updated = [...productionSources];
    updated[sIdx].items[iIdx].steelRows.push({ productSize: '', wireSize: '3mm', wireCount: '4', totalLines: '', qty: '' });
    setProductionSources(updated);
  };

  const removeSteelRow = (sIdx, iIdx, stIdx) => {
    const updated = [...productionSources];
    updated[sIdx].items[iIdx].steelRows = updated[sIdx].items[iIdx].steelRows.filter((_, i) => i !== stIdx);
    updateBomM3ForSource(sIdx, updated);
    setProductionSources(updated);
  };

  const updateSteelRow = async (sIdx, iIdx, stIdx, field, val) => {
    const updated = [...productionSources];
    updated[sIdx].items[iIdx].steelRows[stIdx][field] = val;
    await updateBomCementForSource(sIdx, updated);
    await updateBomM3ForSource(sIdx, updated);
  };

  const handleSubmitAll = async (e) => {
    e.preventDefault();
    if (!selectedPlant) {
      alert("કૃપા કરીને પહેલા પ્લાન્ટ સિલેક્ટ કરો!");
      return;
    }

    for (let sIdx = 0; sIdx < productionSources.length; sIdx++) {
      const src = productionSources[sIdx];
      const hasProductionData = src.items.some(i => i.product || i.qty || i.lineOfCasting);
      if (hasProductionData && !src.labour) {
        alert(`⚠️ Production Source #${sIdx + 1}: Please select labour first!`);
        return;
      }
    }

    for (const source of productionSources) {
      for (const item of source.items) {
        const isColumn = item.product ? item.product.toLowerCase().includes('column') : false;
        const isPanel = item.product ? item.product.toLowerCase().includes('panel') : false;
        if (!isColumn && !isPanel && item.product) {
          // General products
        } else if (!isColumn && item.product) {
          const mainTotalLines = Number(item.lineOfCasting) || 0;
          const sumOfSteelLines = item.steelRows.reduce((acc, steel) => acc + (Number(steel.totalLines) || 0), 0);
          if (mainTotalLines !== sumOfSteelLines) {
            alert(`⚠️ Error in ${item.product}: Number of Line (${mainTotalLines}) અને Steel Details ની કુલ લાઈનો (${sumOfSteelLines}) સરખી હોવી જોઈએ!`);
            return;
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

      for (const source of productionSources) {
        if (!source.items || source.items.length === 0) continue;

        const totalCement = source.concreteSource === 'Site Mix' ? (Number(source.actualCementUsed) || 0) : 0;
        const totalRmc = source.concreteSource === 'RMC' ? (Number(source.actualCementUsed) || 0) : 0;

       let headerData, headerErr;

       if (editingId) {
          // 🛠️ Edit Mode: Update Header
          const res = await supabase
            .from('production_header')
            .update({
              production_date: dprDate,
              plant_name: selectedPlant,
              team_name: source.labour || selectedPlant,
              actual_cement_used: totalCement,
              total_rmc_used: totalRmc,
              submitted_by: currentLoggedUser
            })
            .eq('id', editingId)
            .select()
            .single();
          headerData = res.data;
          headerErr = res.error;
        } else {
          // 📥 New Entry: Insert Header
          const res = await supabase
            .from('production_header')
            .insert([{
              production_date: dprDate,
              plant_name: selectedPlant,
              team_name: source.labour || selectedPlant,
              actual_cement_used: totalCement,
              total_rmc_used: totalRmc,
              submitted_by: currentLoggedUser
            }])
            .select()
            .single();
          headerData = res.data;
          headerErr = res.error;
        }

        if (headerErr) throw headerErr;
        const headerId = headerData.id;

        // 🎯 જો એડિટ મોડ હોય, તો જૂની આઈટમ્સ, સ્ટીલ ડિટેલ્સ અને લેજર રેકોર્ડ્સ સાફ કરી દો
       // 🎯 એડિટ મોડ હોય, તો જૂની આઈટમ્સ, સ્ટીલ અને લેજર રેકોર્ડ્સ પરફેક્ટ સાફ કરો
        if (editingId) {
          const { data: oldItems } = await supabase.from('production_items').select('id').eq('header_id', editingId);
          if (oldItems && oldItems.length > 0) {
            const oldItemIds = oldItems.map(i => i.id);
            
            // 1. સ્ટીલ ડિટેલ્સ ડીલીટ કરો
            await supabase.from('production_steel_details').delete().in('item_id', oldItemIds);
            
            // 2. 🔑 મહત્ત્વનું: આ item_id (reference_id) વાળા મટીરિયલ અને સ્ટોક લેજર સાફ કરો
            await supabase.from('material_stock_ledger').delete().in('reference_id', oldItemIds);
            await supabase.from('stock_ledger').delete().in('reference_id', oldItemIds);
            
            // 3. જૂની આઈટમ્સ ડીલીટ કરો
            await supabase.from('production_items').delete().eq('header_id', editingId);
          }
          
          // જો હેડર આઈડીથી પણ કોઈ લેજર સેવ થયું હોય તો તેને પણ સાફ કરી દો
          await supabase.from('material_stock_ledger').delete().eq('reference_id', editingId);
          await supabase.from('stock_ledger').delete().eq('reference_id', editingId);
        }

        if (source.concreteSource === 'Site Mix' && totalCement > 0) {
          materialLedgerRows.push({
            date: dprDate,
            plant_name: selectedPlant,
            material_name: 'Cement',
            unit: 'Bags',
            transaction_type: 'CONSUMPTION',
            qty: totalCement,
            reference_id: headerId
          });
        }
        if (source.concreteSource === 'RMC' && totalRmc > 0) {
          materialLedgerRows.push({
            date: dprDate,
            plant_name: selectedPlant,
            material_name: 'RMC',
            unit: 'M3',
            transaction_type: 'CONSUMPTION',
            qty: totalRmc,
            reference_id: headerId
          });
        }

        try {
          for (const item of source.items) {
            if (item.product) {
              const isColumn = item.product.toLowerCase().includes('column');
              const isPanel = item.product.toLowerCase().includes('panel');
              const mainLines = Number(item.lineOfCasting) || 0;
              const brokenCount = Number(item.brokenQty) || 0;
              
              let baseSize = item.sizeVariant || 'Standard';
              // 🧹 નવો ફેરફાર: કૌંસ ( ) વાળી જૂની વિગત દૂર કરવા
              if (typeof baseSize === 'string' && baseSize.includes(' (')) {
                baseSize = baseSize.split(' (')[0].trim();
              }

              if (isColumn && item.steelRows && item.steelRows.length > 0) {
                let colSize = item.steelRows[0].productSize || baseSize;
                if (typeof colSize === 'string' && colSize.includes(' (')) {
                  colSize = colSize.split(' (')[0].trim();
                }
                baseSize = colSize;
              }

              let steelDesc = '';
              if (isPanel || isColumn) {
                if (item.steelRows && item.steelRows.length > 0) {
                  const firstSteel = item.steelRows[0];
                  steelDesc = `${firstSteel.wireSize || '3mm'} - ${firstSteel.wireCount || '4'} wires`;
                }
              }

              let productVariant = steelDesc ? `${baseSize} (${steelDesc})` : baseSize;

              const { data: itemData, error: itemErr } = await supabase
                .from('production_items')
                .insert([{
                  header_id: headerId,
                  product_name: item.product,
                  size_variant: productVariant,
                  concrete_source: source.concreteSource,
                  nos_of_line_casting: mainLines,
                  broken_qty: brokenCount
                }])
                .select()
                .single();

              if (itemErr) throw itemErr;
              const itemId = itemData.id;
let totalProducedQty = 0;
              if (isColumn) {
                // 🎯 કૉલમ માટે: સીધી જ સ્ટીલ રો ની Qty નો સરવાળો (કોઈ ગુણાકાર નહીં)
                totalProducedQty = item.steelRows ? item.steelRows.reduce((acc, s) => acc + (Number(s.qty) || 0), 0) : 0;
              } else if (isPanel) {
                // 🎯 પેનલ માટે: કુલ સરવાળો (જે માત્ર કાચો માલ/BOM કાપવા માટે વપરાશે)
                const totalPanelLines = item.steelRows ? item.steelRows.reduce((acc, s) => acc + (Number(s.totalLines) || 0), 0) : 0;
                totalProducedQty = totalPanelLines > 0 ? totalPanelLines * 30 : mainLines * 30;
              } else {
                totalProducedQty = Number(item.qty) || 0;
              }

              // 🎯 માત્ર Product Stock Ledger માં અલગ-અલગ એન્ટ્રી પાડવા માટેનું નવું લોજિક
              if (isPanel || isColumn) {
                if (item.steelRows && item.steelRows.length > 0) {
                  for (const steelRow of item.steelRows) {
                    let rowQty = 0;
                    if (isPanel) {
                      rowQty = (Number(steelRow.totalLines) || 0) * 30; // દરેક લાઈન ગુણ્યા ૩૦ (દા.ત. 1 * 30, 2 * 30)
                    } else if (isColumn) {
                      rowQty = Number(steelRow.qty) || 0;
                    }

                    if (rowQty > 0) {
                    const rowSteelDesc = `${steelRow.wireSize || '3mm'} - ${steelRow.wireCount || '4'} wires`;
                      let rowBaseSize = steelRow.productSize || baseSize;
                      
                      // 🧹 ડબલ વાર કૌંસ ( ) ના જોડાય તે માટે જૂની વિગત હટાવો
                      if (typeof rowBaseSize === 'string' && rowBaseSize.includes(' (')) {
                        rowBaseSize = rowBaseSize.split(' (')[0].trim();
                      }
                      
                      const rowVariant = `${rowBaseSize} (${rowSteelDesc})`;
                      stockLedgerRows.push({
                        date: dprDate,
                        plant_name: selectedPlant,
                        product_name: item.product,
                        size_variant: rowVariant,
                        transaction_type: 'PRODUCTION',
                        qty: rowQty,
                        reference_id: itemId
                      });
                    }
                  }
                } else {
                  if (totalProducedQty > 0) {
                    stockLedgerRows.push({
                      date: dprDate,
                      plant_name: selectedPlant,
                      product_name: item.product,
                      size_variant: productVariant,
                      transaction_type: 'PRODUCTION',
                      qty: totalProducedQty,
                      reference_id: itemId
                    });
                  }
                }
              } else {
                // પેનલ કે કૉલમ સિવાયની આઇટમ માટે
                if (totalProducedQty > 0) {
                  stockLedgerRows.push({
                    date: dprDate,
                    plant_name: selectedPlant,
                    product_name: item.product,
                    size_variant: productVariant,
                    transaction_type: 'PRODUCTION',
                    qty: totalProducedQty,
                    reference_id: itemId
                  });
                }
              }

              if (brokenCount > 0) {
                stockLedgerRows.push({
                  date: dprDate,
                  plant_name: selectedPlant,
                  product_name: item.product,
                  size_variant: productVariant,
                  transaction_type: 'BROKEN',
                  qty: brokenCount,
                  reference_id: itemId
                });
              }

              let bomList = [];
              try {
               const { data: bomData } = await supabase
          .from('plant_work_descriptions')
          .select('bom_items')
          .ilike('name', (item.product || '').trim())
          .ilike('product_size', (productVariant || '').trim())
          .maybeSingle();

                if (bomData && bomData.bom_items) {
                  bomList = Array.isArray(bomData.bom_items) ? bomData.bom_items : [bomData.bom_items];
                }
              } catch (bomCatchErr) {
                console.error("BOM Fetch Error:", bomCatchErr.message);
              }

              for (const bom of bomList) {
                const matNameLower = bom.material ? bom.material.toLowerCase() : '';
                if (matNameLower.includes('cement') || matNameLower.includes('steel') || matNameLower.includes('wire') || matNameLower.includes('3mm') || matNameLower.includes('4mm')) {
                  continue;
                }

                if (source.concreteSource === 'RMC') {
                  continue; 
                }

                const unitConsumption = Number(bom.consumption) || 0;
                const totalMaterialConsumed = unitConsumption * totalProducedQty;

                if (totalMaterialConsumed > 0 && bom.material) {
                  materialLedgerRows.push({
                    date: dprDate,
                    plant_name: selectedPlant,
                    material_name: bom.material,
                    unit: bom.unit || 'Kg',
                    transaction_type: 'CONSUMPTION',
                    qty: Number(totalMaterialConsumed.toFixed(2)),
                    reference_id: itemId
                  });
                }
              }

              // 🛠️ સ્ટીલની રો (Steel Rows) સેવ કરવા માટેનું પરફેક્ટ લોજિક
              if (item.steelRows && item.steelRows.length > 0) {
                for (const steel of item.steelRows) {
                  let producedCount = 0;
                  if (isColumn) {
                    producedCount = Number(steel.qty) || 0;
                  } else if (isPanel) {
                    producedCount = (Number(steel.totalLines) || 0) * 30;
                  } else {
                    producedCount = Number(steel.qty) || 0;
                  }

                  const wireCountNum = Number(steel.wireCount) || 4;
                  const steelSizeStr = steel.wireSize || '3mm';
                  const wireBarText = (isPanel || isColumn) ? `${wireCountNum} Wires` : 'Kg Fix';

                  const { error: steelErr } = await supabase
                    .from('production_steel_details')
                    .insert([{
                      item_id: itemId,
                      steel_size: steelSizeStr,
                      wires_or_bars: wireBarText,
                      total_qty: producedCount
                    }]);

                  if (steelErr) throw steelErr;

                  let totalSteelWeight = 0;
                  if (isPanel || isColumn) {
                    let weightPerWire = 0;
                    const cleanSteelSize = steelSizeStr.toLowerCase().replace(/\s/g, '');
                    const matchedSteelBom = bomList.find(b => (b.material || '').toLowerCase().replace(/\s/g, '').includes(cleanSteelSize));
                    if (matchedSteelBom) {
                      weightPerWire = Number(matchedSteelBom.consumption) || 0;
                    }
                    if (producedCount > 0 && weightPerWire > 0) {
                      totalSteelWeight = producedCount * wireCountNum * weightPerWire;
                    }
                 } else {
  // 🎯 અહીં Per Piece સ્ટીલને Products Qty (totalProducedQty) સાથે ગુણાકાર કરવામાં આવ્યો છે
  const steelPerPiece = Number(steel.qty) || 0;
  totalSteelWeight = steelPerPiece * totalProducedQty; 
}
                  if (totalSteelWeight > 0) {
                    const cleanSteelSize = steelSizeStr.toLowerCase().replace(/\s/g, '');
                    const matchedSteelBom = bomList.find(b => (b.material || '').toLowerCase().replace(/\s/g, '').includes(cleanSteelSize));

                    materialLedgerRows.push({
                      date: dprDate,
                      plant_name: selectedPlant,
                      material_name: matchedSteelBom ? matchedSteelBom.material : `${steelSizeStr} Steel`,
                      unit: matchedSteelBom ? (matchedSteelBom.unit || 'Kg') : 'Kg',
                      transaction_type: 'CONSUMPTION',
                      qty: Number(totalSteelWeight.toFixed(2)),
                      reference_id: itemId
                    });
                  }
                }
              }

            }
          }
        } catch (innerErr) {
          throw innerErr;
        }
      }

      if (materialLedgerRows.length > 0) {
        const { error: matLedgerErr } = await supabase.from('material_stock_ledger').insert(materialLedgerRows);
        if (matLedgerErr) throw matLedgerErr;
      }

      if (stockLedgerRows.length > 0) {
        const { error: stockErr } = await supabase.from('stock_ledger').insert(stockLedgerRows);
        if (stockErr) throw stockErr;
      }

     // 🔄 સેવ કે અપડેટ થયા પછી એડિટિંગ આઈડી અને ફોર્મ રીસેટ કરો
      const wasEditing = editingId !== null;
      setEditingId(null); 
      
      // 🎯 ફોર્મને સંપૂર્ણપણે ખાલી (Blank) કરવા માટે
      setProductionSources([
        {
          id: Date.now(),
          labour: '',
          concreteSource: 'Site Mix',
          actualCementUsed: '',
          bomSuggestedCement: 0,
          bomSuggestedM3: 0,
          items: [{ id: Date.now(), product: '', sizeVariant: '', lineOfCasting: '', steelRows: [{ productSize: '', wireSize: '3mm', wireCount: '4', totalLines: '', qty: '' }], brokenQty: 0, qty: '' }],
          remarks: ''
        }
      ]);
      
      fetchRecentHistory(); // 📜 હિસ્ટ્રી રિફ્રેશ કરો
      
      if (wasEditing) {
        alert("✅ DPR એન્ટ્રી સફળતાપૂર્વક અપડેટ થઈ ગઈ છે!");
      } else {
        alert("✅ બધી જ એન્ટ્રીઓ અને સ્પેસિફિકેશન સાથે સફળતાપૂર્વક સબમિટ થઈ ગયું છે!");
      }
    } catch (err) {
      alert("એરર: " + err.message);
    } finally {
      setLoading(false);
    }
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
          <ClipboardList size={20} color="#ffffff" strokeWidth={2.5} />
        </div>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#14532d', margin: 0, letterSpacing: '0.2px' }}>
            Plant Daily Progress Report (DPR)
          </h3>
          <span style={{ fontSize: '11px', color: '#15803d', fontWeight: '600' }}>
            Manage daily plant production and work progress efficiently
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmitAll} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
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
              max={new Date().toISOString().split('T')[0]}
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

        {/* ================= 1. PRODUCTION ================= */}
        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px dashed #cbd5e1', paddingBottom: '10px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1d4ed8', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Factory size={18} /> 1. PRODUCTION (ઉત્પાદન)
            </h4>
            <button type="button" onClick={addProductionSource} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={14} /> Add Source
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {productionSources.map((source, sIndex) => (
              <div key={source.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: sIndex < productionSources.length - 1 ? '2px solid #cbd5e1' : 'none', paddingBottom: sIndex < productionSources.length - 1 ? '20px' : '0' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', backgroundColor: '#dbeafe', padding: '3px 8px', borderRadius: '6px', color: '#1d4ed8' }}>Source #{sIndex + 1}</span>
                  {productionSources.length > 1 && (
                    <button type="button" onClick={() => removeProductionSource(sIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Remove Source</button>
                  )}
                </div>

                <select value={source.labour} onClick={handleDropdownClick} onChange={(e) => updateProductionSource(sIndex, 'labour', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                  <option value="">-- Select Labour / Team --</option>
                  {labours.map(lab => <option key={lab.id} value={lab.name}>{lab.name}</option>)}
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', border: '1px solid #e2e8f0' }}>
                  <span>Concrete Source:</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input type="radio" name={`concrete-${source.id}`} checked={source.concreteSource === 'Site Mix'} onChange={() => updateProductionSource(sIndex, 'concreteSource', 'Site Mix')} /> Site Mix (Manual)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input type="radio" name={`concrete-${source.id}`} checked={source.concreteSource === 'RMC'} onChange={() => updateProductionSource(sIndex, 'concreteSource', 'RMC')} /> RMC
                  </label>
                </div>

                {source.items.map((item, iIndex) => {
                  const isColumn = item.product ? item.product.toLowerCase().includes('column') : false;
                  const isPanel = item.product ? item.product.toLowerCase().includes('panel') : false;
               const uniqueProductNames = [...new Map(products.map(p => [(p.name || '').trim().toLowerCase(), p.name])).values()];

                  return (
                    <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>Product #{iIndex + 1}</span>
                        {source.items.length > 1 && (
                          <button type="button" onClick={() => removeProductionItem(sIndex, iIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '10px' }}><Trash2 size={12} /></button>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Product Name</label>
                         <select 
  value={item.product} 
  onClick={() => {
    if (!handleDropdownClick()) return;
    handleLabourCheck(source.labour);
  }} 
  onChange={async (e) => {
    if (!source.labour) {
      alert("⚠️ Please select labour first!");
      return;
    }
    const val = e.target.value;
    
    // 1. પ્રોડક્ટ અપડેટ કરો
    await updateProductionItem(sIndex, iIndex, 'product', val);
    
    // 2. 🎯 BOM કેલ્ક્યુલેશન ફંક્શન્સ અહીં ફરજિયાત કૉલ કરો જેથી Qty અને Volume તરત દેખાય
    const updated = [...productionSources];
    updated[sIndex].items[iIndex].product = val;
    await updateBomCementForSource(sIndex, updated);
    await updateBomM3ForSource(sIndex, updated);
  }} 
  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}
>
  <option value="">-- Select Product --</option>
  {uniqueProductNames.map((prodName, idx) => (
    <option key={idx} value={prodName}>{prodName}</option>
  ))}
</select>
                        </div>

                       <div>
  <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>
    {isColumn ? "Number of Lines" : "Size / Variant"}
  </label>
  
  {isColumn ? (
    // જો પ્રોડક્ટ કૉલમ હોય તો No. of Lines નું ઇનપુટ બોક્સ બતાવો
    <input 
      type="number" 
      placeholder="Enter lines" 
      value={item.lineOfCasting} 
      onChange={(e) => updateProductionItem(sIndex, iIndex, 'lineOfCasting', e.target.value)} 
      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} 
    />
  ) : (
    // કૉલમ ન હોય તો જૂનું Size / Variant નું ડ્રોપડાઉન બતાવો
   <select 
  // 🎯 નવો ફેરફાર: ડેટાબેઝમાંથી આવતા નામમાંથી કૌંસ હટાવીને માત્ર સાઇઝ જ સેટ કરવી 
  value={item.sizeVariant ? String(item.sizeVariant).split(' (')[0].trim() : ''} 
  onChange={(e) => updateProductionItem(sIndex, iIndex, 'sizeVariant', e.target.value)} 
  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}
>
      <option value="">-- Select Size --</option>
      {products
        .filter(prod => prod.name.toLowerCase() === (item.product || '').toLowerCase())
        .map(prod => prod.product_size ? <option key={prod.id} value={prod.product_size}>{prod.product_size}</option> : null)
      }
    </select>
  )}
</div>
                      </div>

                      {!isColumn && !isPanel ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Products Qty *</label>
                           <input 
  type="number" 
  placeholder="Enter Qty" 
  value={item.qty} 
  onChange={(e) => {
    // ફક્ત સ્ટેટ અપડેટ કરો જેથી ટાઈપ કરતી વખતે લેગ કે હેંગ ના થાય
    updateProductionItem(sIndex, iIndex, 'qty', e.target.value);
  }}
  onBlur={async (e) => {
    // જ્યારે યુઝર ટાઈપ કરીને બોક્સની બહાર જાય ત્યારે જ BOM કેલ્ક્યુલેશન રન થશે
    const updated = [...productionSources];
    await updateBomCementForSource(sIndex, updated);
    await updateBomM3ForSource(sIndex, updated);
  }}
  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#fff', fontWeight: 'bold', color: '#1d4ed8' }} 
/>
                          </div>

                          <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid #e2e8f0' }}>
                            <span style={{ fontWeight: 'bold', color: '#334155' }}>🛠️ Steel Details (Kg):</span>
                            
                            {item.steelRows.map((steel, stIdx) => (
                              <div key={stIdx} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.2fr auto', gap: '6px', alignItems: 'center' }}>
                                {/* 🎯 સ્ટેટિક ઓપ્શન્સને બદલે ડાયનેમિક BOM સ્ટીલ લિસ્ટ */}
<select 
  value={steel.wireSize} 
  onChange={(e) => updateSteelRow(sIndex, iIndex, stIdx, 'wireSize', e.target.value)} 
  style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', width: '100%' }}
>
  <option value="">-- Select Material from BOM --</option>
  {(() => {
    // 🎯 અતિશય પાવરફુલ નોર્મલાઇઝેશન: ×, x, સ્પેસ, કૌંસ બધું જ કાઢીને માત્ર આંકડા અને અક્ષરો જ સરખાવશે
    const strictNormalize = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const currentProduct = strictNormalize(item.product);
    const rawSize = String(item.sizeVariant || steel.productSize || '').split('(')[0];
    const currentSize = strictNormalize(rawSize);

    // 🔍 1st Attempt: નામ અને સાઈઝ બંને પરફેક્ટ મૅચ કરીને શોધો
    let matchedProd = products.find(p => {
      const pName = strictNormalize(p.name);
      const pSize = strictNormalize(p.product_size);
      return pName === currentProduct && pSize === currentSize;
    });

    // 🔍 2nd Attempt (Safety): જો સાઈઝથી ન મળે, તો માત્ર પ્રોડક્ટના નામથી શોધો જેથી BOM મટીરિયલ તો મળી જ જાય!
    if (!matchedProd) {
      matchedProd = products.find(p => strictNormalize(p.name) === currentProduct);
    }

    const bomList = matchedProd?.bom_items 
      ? (Array.isArray(matchedProd.bom_items) ? matchedProd.bom_items : [matchedProd.bom_items]) 
      : [];

    // 3. માત્ર સિમેન્ટ, RMC, સેન્ડ વગેરે સિવાયના BOM ના મટીરિયલ્સ જ બતાવો
    // 🎯 પરફેક્ટ ફિલ્ટર: માત્ર અસલી સ્ટીલ/વાયર જ આવશે, 20mm એગ્ગ્રીગેટ કે બીજા મટીરિયલ્સ નહીં આવે
    const bomMaterials = bomList.filter(b => {
      const mat = (b.material || '').toLowerCase();
      
      // જો મટીરિયલમાં આમાંથી કોઈ પણ શબ્દ હોય તો તેને તરત જ બહાર કાઢી મૂકો (Exclude)
      if (mat.includes('cement') || mat.includes('rmc') || mat.includes('concrete') || mat.includes('sand') || mat.includes('20mm') || mat.includes('20 mm') || mat.includes('10mm') || mat.includes('10 mm') || mat.includes('aggregate') || mat.includes('stone')) {
        return false;
      }
      
      // માત્ર એ જ મટીરિયલ અંદર આવશે જેમાં steel, tmt, wire અથવા 3mm/4mm/6mm/8mm સ્પષ્ટ લખેલું હોય
      const isTrueSteel = mat.includes('steel') || mat.includes('tmt') || mat.includes('wire') || mat.includes('3mm') || mat.includes('4mm') || mat.includes('6mm') || mat.includes('8mm');
      
      return isTrueSteel;
    });

    return bomMaterials.length > 0 ? (
      bomMaterials.map((b, idx) => (
        <option key={idx} value={b.material}>{b.material}</option>
      ))
    ) : (
      <option value="">-- BOM માં કોઈ મટીરિયલ નથી મળ્યું --</option>
    );
  })()}
</select>          
                                <input type="number" placeholder="Qty" value={steel.qty || ''} onChange={(e) => updateSteelRow(sIndex, iIndex, stIdx, 'qty', e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }} />

                                <div style={{ padding: '6px', backgroundColor: '#e2e8f0', borderRadius: '4px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#1d4ed8' }}>
  Kg / Piece
</div>

                                {item.steelRows.length > 1 ? (
                                  <button type="button" onClick={() => removeSteelRow(sIndex, iIndex, stIdx)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>x</button>
                                ) : <div />}
                              </div>
                            ))}

                            <button type="button" onClick={() => addSteelRow(sIndex, iIndex)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#2563eb', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', padding: '0', marginTop: '2px' }}>
                              [ ➕ Add Row ]
                            </button>
                          </div>
                        </div>
                      ) : (
                        !isColumn && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                              <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Number of Line</label>
                              <input type="number" placeholder="Enter lines" value={item.lineOfCasting} onChange={(e) => updateProductionItem(sIndex, iIndex, 'lineOfCasting', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Auto Calculate Qty (x30)</label>
                              <input type="number" placeholder="Qty" value={item.qty} readOnly style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#f1f5f9', boxSizing: 'border-box' }} />
                            </div>
                          </div>
                        )
                      )}
                            
                      {isPanel || isColumn ? (
                        <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontWeight: 'bold', color: '#334155' }}>🛠️ {isColumn ? 'Column Size & Steel Details:' : 'Steel Details:'}</span>
                          
                          {item.steelRows.map((steel, stIdx) => (
                            <div key={stIdx} style={{ display: 'grid', gridTemplateColumns: isColumn ? '1.2fr 1.2fr 1.2fr 1fr auto' : '1.2fr 1.2fr 1fr auto', gap: '6px', alignItems: 'center' }}>
                              
                              {isColumn && (
  <select
    // 🎯 ફેરફાર માત્ર અહીં value માં જ કરવાનો છે:
    value={steel.productSize ? String(steel.productSize).split(' (')[0].trim() : ''} 
    onChange={(e) => updateSteelRow(sIndex, iIndex, stIdx, 'productSize', e.target.value)} 
    style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', width: '100%' }}
  >
    <option value="">-- Size --</option>
    {products
      .filter(prod => prod.name.toLowerCase() === (item.product || '').toLowerCase())
      .map(prod => prod.product_size ? <option key={prod.id} value={prod.product_size}>{prod.product_size}</option> : null)
    }
  </select>
)}
                             <select 
  value={steel.wireSize} 
  onChange={(e) => updateSteelRow(sIndex, iIndex, stIdx, 'wireSize', e.target.value)} 
  style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', width: '100%' }}
>
  <option value="">-- Select Material from BOM --</option>
  {(() => {
    const strictNormalize = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const currentProduct = strictNormalize(item.product);
    const rawSize = String(item.sizeVariant || steel.productSize || '').split('(')[0];
    const currentSize = strictNormalize(rawSize);

    let matchedProd = products.find(p => {
      const pName = strictNormalize(p.name);
      const pSize = strictNormalize(p.product_size);
      return pName === currentProduct && pSize === currentSize;
    });

    if (!matchedProd) {
      matchedProd = products.find(p => strictNormalize(p.name) === currentProduct);
    }

    const bomList = matchedProd?.bom_items 
      ? (Array.isArray(matchedProd.bom_items) ? matchedProd.bom_items : [matchedProd.bom_items]) 
      : [];

   // 🎯 પરફેક્ટ ફિલ્ટર: માત્ર અસલી સ્ટીલ/વાયર જ આવશે, 20mm એગ્ગ્રીગેટ કે બીજા મટીરિયલ્સ નહીં આવે
    const bomMaterials = bomList.filter(b => {
      const mat = (b.material || '').toLowerCase();
      
      // જો મટીરિયલમાં આમાંથી કોઈ પણ શબ્દ હોય તો તેને તરત જ બહાર કાઢી મૂકો (Exclude)
      if (mat.includes('cement') || mat.includes('rmc') || mat.includes('concrete') || mat.includes('sand') || mat.includes('20mm') || mat.includes('20 mm') || mat.includes('10mm') || mat.includes('10 mm') || mat.includes('aggregate') || mat.includes('stone')) {
        return false;
      }
      
      // માત્ર એ જ મટીરિયલ અંદર આવશે જેમાં steel, tmt, wire અથવા 3mm/4mm/6mm/8mm સ્પષ્ટ લખેલું હોય
      const isTrueSteel = mat.includes('steel') || mat.includes('tmt') || mat.includes('wire') || mat.includes('3mm') || mat.includes('4mm') || mat.includes('6mm') || mat.includes('8mm');
      
      return isTrueSteel;
    });

    return bomMaterials.length > 0 ? (
      bomMaterials.map((b, idx) => (
        <option key={idx} value={b.material}>{b.material}</option>
      ))
    ) : (
      <option value="">-- BOM માં કોઈ મટીરિયલ નથી મળ્યું --</option>
    );
  })()}
</select>
                              
                              <select value={steel.wireCount} onChange={(e) => updateSteelRow(sIndex, iIndex, stIdx, 'wireCount', e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', width: '100%' }}>
                                {[1,2,3,4,5,6,7,8,9,10,12,14,16,18,20].map(num => (
                                  <option key={num} value={num}>{num} Wires</option>
                                ))}
                              </select>

                              {isColumn ? (
                                <input type="number" placeholder="Qty" value={steel.qty || ''} onChange={(e) => updateSteelRow(sIndex, iIndex, stIdx, 'qty', e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }} />
                              ) : (
                                <input type="number" placeholder="Lines" value={steel.totalLines || ''} onChange={(e) => updateSteelRow(sIndex, iIndex, stIdx, 'totalLines', e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }} />
                              )}

                              {item.steelRows.length > 1 ? (
                                <button type="button" onClick={() => removeSteelRow(sIndex, iIndex, stIdx)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>x</button>
                              ) : <div />}
                            </div>
                          ))}
                          <button type="button" onClick={() => addSteelRow(sIndex, iIndex)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#2563eb', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', padding: '0', marginTop: '2px' }}>
                            [ ➕ Add Row ]
                          </button>
                        </div>
                      ) : null}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#b91c1c' }}>
                        <span>⚠️ Broken / Damaged Qty:</span>
                        <input type="number" value={item.brokenQty} onChange={(e) => updateProductionItem(sIndex, iIndex, 'brokenQty', e.target.value)} style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid #fecaca', textAlign: 'center' }} />
                        <span>Nos</span>
                      </div>

                    </div>
                  );
                })}

                <button type="button" onClick={() => addProductionItem(sIndex)} style={{ backgroundColor: 'transparent', color: '#1d4ed8', border: '1px dashed #2563eb', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', alignSelf: 'flex-start' }}>
                  + Add Another Product
                </button>

                {source.concreteSource === 'Site Mix' && (
                  <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#b45309', borderBottom: '1px solid #fde68a', paddingBottom: '4px' }}>
                      Cement Usages
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#92400e', textAlign: 'center' }}>BOM Usage</span>
                        <div style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid #f59e0b', backgroundColor: '#fef3c7', fontSize: '12px', fontWeight: 'bold', color: '#b45309', textAlign: 'center' }}>
                          {source.bomSuggestedCement || 0} Bags
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#92400e', textAlign: 'center' }}>Actual Use</span>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <input 
                            type="number" 
                            placeholder="Enter actual..." 
                            value={source.actualCementUsed} 
                            onChange={(e) => updateProductionSource(sIndex, 'actualCementUsed', e.target.value)} 
                            style={{ width: '75px', padding: '5px 6px', borderRadius: '4px', border: '1px solid #d97706', fontWeight: 'bold', fontSize: '12px', textAlign: 'center', backgroundColor: '#fff', color: '#b45309', boxSizing: 'border-box' }} 
                          />
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#78350f' }}>Bags</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {source.concreteSource === 'RMC' && (
                  <div style={{ backgroundColor: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1d4ed8', borderBottom: '1px solid #bfdbfe', paddingBottom: '4px' }}>
                      Concrete Qty (RMC)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#1e40af', textAlign: 'center' }}>BOM Expected (M3)</span>
                        <div style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid #60a5fa', backgroundColor: '#dbeafe', fontSize: '12px', fontWeight: 'bold', color: '#1e40af', textAlign: 'center' }}>
                          {source.bomSuggestedM3 || 0} M3
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#1e40af', textAlign: 'center' }}>Actual Use (M3)</span>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <input 
                            type="number" 
                            step="0.001"
                            placeholder="Enter M3..." 
                            value={source.actualCementUsed} 
                            onChange={(e) => updateProductionSource(sIndex, 'actualCementUsed', e.target.value)} 
                            style={{ width: '85px', padding: '5px 6px', borderRadius: '4px', border: '1px solid #2563eb', fontWeight: 'bold', fontSize: '12px', textAlign: 'center', backgroundColor: '#fff', color: '#1d4ed8', boxSizing: 'border-box' }} 
                          />
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e40af' }}>M3</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>
        </div>

       <div style={{ display: 'flex', gap: '10px' }}>
          {/* મુખ્ય Submit / Update બટન */}
          <button 
            type="submit" 
            disabled={loading} 
            style={{ 
              flex: 1, 
              backgroundColor: editingId ? '#2563eb' : '#0f172a', 
              color: '#fff', 
              padding: '14px', 
              borderRadius: '12px', 
              border: 'none', 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px', 
              fontSize: '14px', 
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' 
            }}
          >
            <Send size={16} /> 
            {loading ? 'Processing...' : (editingId ? 'Update DPR Entry' : 'Submit DPR Entry')}
          </button>

       {/* ❌ Cancel & Delete Buttons (જો એડિટ મોડ ચાલુ હોય તો જ દેખાશે) */}
          {editingId && (
            <>
              {/* ❌ Cancel Button (પ્રોફેશનલ ગ્રે કલર) */}
              <button 
                type="button" 
                onClick={() => {
                  setEditingId(null);
                  setProductionSources([{
                    id: Date.now(),
                    labour: '',
                    concreteSource: 'Site Mix',
                    actualCementUsed: '',
                    bomSuggestedCement: 0,
                    bomSuggestedM3: 0,
                    items: [{ id: Date.now(), product: '', sizeVariant: '', lineOfCasting: '', steelRows: [{ productSize: '', wireSize: '3mm', wireCount: '4', totalLines: '', qty: '' }], brokenQty: 0, qty: '' }],
                    remarks: ''
                  }]);
                }}
                style={{ 
                  backgroundColor: '#64748b', // મસ્ત પ્રોફેશનલ સ્લેટ ગ્રે
                  color: '#fff', 
                  padding: '14px 24px', 
                  borderRadius: '12px', 
                  border: 'none', 
                  fontWeight: 'bold', 
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                Cancel
              </button>

           {/* 🗑️ Delete Button */}
              <button 
                type="button" 
                title="Delete this entry"
                onClick={async () => {
                  const confirmDelete = window.confirm("શું તમે ખરેખર આ આખી એન્ટ્રી ડિલીટ કરવા માંગો છો? આની સાથે સ્ટોક લેજર અને મટીરીયલ લેજરનો ડેટા પણ ડિલીટ થઈ જશે.");
                  
                  if (confirmDelete) {
                   try {
                      // 1️⃣ આ એન્ટ્રીની તારીખ શોધો (Safety માટે)
                      const dprDateObj = recentHistory.find(h => h.id === editingId);
                      const entryDate = dprDateObj ? (dprDateObj.production_date || dprDateObj.created_at) : null;

                      // 2️⃣ આઇટમ્સના ID શોધો
                      const { data: itemsData, error: itemsFetchErr } = await supabase
                        .from('production_items')
                        .select('id')
                        .eq('header_id', editingId);

                      if (itemsFetchErr) throw itemsFetchErr;

                      if (itemsData && itemsData.length > 0) {
                        const itemIds = itemsData.map(item => item.id);

                        // સ્ટીલ વગેરે લેજરમાંથી કાઢવા (જે Item ID થી સેવ થયા હતા)
                        await supabase.from('material_stock_ledger').delete().in('reference_id', itemIds);
                        
                        await supabase.from('stock_ledger').delete().in('reference_id', itemIds);
                        await supabase.from('production_steel_details').delete().in('item_id', itemIds);
                        await supabase.from('production_items').delete().in('id', itemIds);
                      }

                      // 🎯 નવો સુધારો: RMC અને Cement (જે Header ID થી સેવ થયા હતા) તેને કાઢવા
                      let materialDeleteQuery = supabase.from('material_stock_ledger')
                        .delete()
                        .eq('reference_id', editingId)
                        .in('material_name', ['RMC', 'Cement', 'cement', 'rmc']); // માત્ર RMC અને સિમેન્ટ જ ઉડાવશે

                      // જો તારીખ મળે તો તારીખ પણ મેચ કરાવો (જેથી ભૂલથી બીજા દિવસનો ડેટા ના ઉડે)
                      if (entryDate) {
                        materialDeleteQuery = materialDeleteQuery.eq('date', entryDate);
                      }
                      
                      await materialDeleteQuery;

                      // 3️⃣ છેલ્લે મેઈન હેડર ડિલીટ કરો
                      const { error: headerErr } = await supabase
                        .from('daily_production_headers') 
                        .delete()
                        .eq('id', editingId);

                      if (headerErr) throw new Error("Header ડિલીટ નથી થતું: " + headerErr.message);

                      alert("✅ આખી એન્ટ્રી (RMC/Cement સાથે) સફળતાપૂર્વક ડિલીટ થઈ ગઈ છે!");
                      
                      // 🔄 ફોર્મ રીસેટ કરો
                      setEditingId(null);
                      setProductionSources([{
                        id: Date.now(),
                        labour: '',
                        concreteSource: 'Site Mix',
                        actualCementUsed: '',
                        bomSuggestedCement: 0,
                        bomSuggestedM3: 0,
                        items: [{ id: Date.now(), product: '', sizeVariant: '', lineOfCasting: '', steelRows: [{ productSize: '', wireSize: '3mm', wireCount: '4', totalLines: '', qty: '' }], brokenQty: 0, qty: '' }],
                        remarks: ''
                      }]);
                      fetchRecentHistory(); 

                    } catch (err) {
                      alert("❌ એરર: " + err.message);
                      console.error("Delete Error: ", err);
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
                  gap: '8px', 
                  boxShadow: '0 2px 4px rgba(220, 38, 38, 0.1)'
                }}
              >
                 <Trash2 size={18} /> Delete
              </button>
            </>
          )}
        </div>
      </form>

      {/* 📜 Recent DPR History (24 Hours Editable & Request Edit Logic) */}
      {recentHistory.length > 0 && (
        <div style={{ marginTop: '15px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '8px', paddingLeft: '4px' }}>
            Recent DPR History (Last 24 Hours Editable)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentHistory.map((item) => {
              const entryTime = new Date(item.created_at || item.production_date).getTime();
              const currentTime = new Date().getTime();
              const hoursDifference = (currentTime - entryTime) / (1000 * 60 * 60);
              
              // જો 24 કલાક વીતી ગયા હોય અને ડેટાબેઝમાં is_locked True હોય
         const isLocked = item.is_locked === true || hoursDifference > 24;

              return (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#1d4ed8' }}>Team: {item.team_name}</span>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Date: {item.production_date} | Cement/RMC Used: {item.actual_cement_used || item.total_rmc_used || 0}</div>
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

    </div>
  );
}

export default PlantDprEntry;