import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowUpRight, Send, Plus, Trash2 } from 'lucide-react';
import { COMPANY_LOGO_BASE64 } from '../services/logoConfig';
export default function PlantOutwardPage({ user }) {
  const [plants, setPlants] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [dprDate, setDprDate] = useState(new Date().toISOString().split('T')[0]);
  const [parties, setParties] = useState([]);
  const [sites, setSites] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [transporters, setTransporters] = useState([]);
const [materials, setMaterials] = useState([]);
const [existingBills, setExistingBills] = useState([]);
// ✏️ Edit Mode & Recent History States
  const [editingId, setEditingId] = useState(null);
  const [recentHistory, setRecentHistory] = useState([]);
  const [outwardSources, setOutwardSources] = useState([
  {
    id: 1,
    party: '',
    site: '',
    dcNumber: '',
    vehicleNumber: '',
    items: [{ id: 1, material: '', size: '', qty: '', unit: 'Nos', steelSpec: '' }]
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
     }
   }, [selectedPlantId]);

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
   const { data: transData } = await supabase.from('site_transporters').select('*').or(`plant_id.eq.${plantId},plant_id.is.null`);
setTransporters(transData || []);
const { data: matData } = await supabase.from('site_materials_master').select('*').or(`plant_id.eq.${plantId},plant_id.is.null`);
    setMaterials(matData || []);
     const fetchMasters = async (plantId) => {
        // ... બાકીના માસ્ટર ડેટા ...
    
        // 🎯 Supabase ના 'sites' ટેબલમાંથી સાઇટ્સ લાવવા માટે આ ઉમેરી દો:
        const { data: siteData } = await supabase.from('sites').select('*').or(`plant_id.eq.${plantId},plant_id.is.null`);
        setSites(siteData || []); // (જો તમે useState માં sites સ્ટેટ ન બનાવ્યું હોય તો const [sites, setSites] = useState([]); ઉપર ડિક્લેર કરી દેવું)
      };
  };
// 📜 આઉટવર્ડની તાજેતરની હિસ્ટ્રી ફેચ કરવાનું ફંક્શન
  const fetchRecentHistory = async () => {
    if (!selectedPlant) return;
    const { data } = await supabase
      .from('plant_material_outward')
      .select('*')
      .eq('plant_name', selectedPlant)
      .order('created_at', { ascending: false })
      .limit(10);
    setRecentHistory(data || []);
  };
  // 📜 હિસ્ટ્રી ફેચ કરવા માટેનો પરફેક્ટ useEffect
  useEffect(() => {
    if (selectedPlant && typeof selectedPlant === 'string') {
      fetchRecentHistory();
    }
  }, [selectedPlant]); // 👈 અહીં selectedPlant ફિક્સ સ્ટ્રિંગ હોવી જોઈએ, એરે નહીં
 const handleEditClick = async (entry) => {
    setEditingId(entry.id);
    setDprDate(entry.date || dprDate);
    setSelectedPlant(entry.plant_name || selectedPlant);
    
    let billsArray = [];
    if (entry.bill_url && entry.bill_url.trim() !== '' && entry.bill_url !== 'EMPTY') {
      billsArray = entry.bill_url.split(',').map(b => b.trim()).filter(b => b !== '');
    }
    setExistingBills(billsArray);

    // 🎯 ૧. જો DC નંબર હોય, તો એ જ DC નંબર વાળી બધી જ રો (Rows) ડેટાબેઝમાંથી શોધીને લાવો
    let allMatchingEntries = [entry]; 
    
    if (entry.dc_number && entry.dc_number !== 'EMPTY') {
      const { data: matchedRows, error } = await supabase
        .from('plant_material_outward')
        .select('*')
        .eq('plant_name', entry.plant_name)
        .eq('dc_number', entry.dc_number);

      if (!error && matchedRows && matchedRows.length > 0) {
        allMatchingEntries = matchedRows;
      }
    }

    // 🎯 ૨. બધી જ મટીરિયલ આઇટમ્સ પર લૂપ ચલાવીને તેનું નામ, સાઈઝ અને કેટેગરી અલગ પાડો
    const mappedItems = allMatchingEntries.map((row) => {
      let fullMatName = row.material_name || '';
      let extractedMaterial = fullMatName;
      let extractedSize = '';
      let extractedSteelSpec = '';
      
      let rawCategory = (row.item_type || 'Raw Material').trim();
      let itemCategory = 'Raw Material'; 

      if (rawCategory.toLowerCase().includes('finish')) {
        itemCategory = 'Finished Product';
      } else if (rawCategory.toLowerCase().includes('consumable')) {
        itemCategory = 'Consumable Item';
      } else if (rawCategory.toLowerCase().includes('tool') || rawCategory.toLowerCase().includes('hardware')) {
        itemCategory = 'Tools and Hardware';
      } else if (rawCategory.toLowerCase().includes('asset')) {
        itemCategory = 'Asset';
      } else {
        itemCategory = 'Raw Material';
      }

      if (itemCategory === 'Finished Product') {
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
          const lastSpaceIndex = fullMatName.lastIndexOf(' ');
          if (lastSpaceIndex !== -1) {
            const potentialSize = fullMatName.substring(lastSpaceIndex + 1).trim();
            if (!isNaN(potentialSize) || potentialSize.includes('*') || potentialSize.length <= 5) {
              extractedMaterial = fullMatName.substring(0, lastSpaceIndex).trim();
              extractedSize = potentialSize;
            }
          }
        }
      }

      return {
        id: row.id,
        material: extractedMaterial,
        size: extractedSize,
        qty: row.quantity || '',
        unit: row.unit || 'Nos',
        category: itemCategory,
        steelSpec: extractedSteelSpec
      };
    });

    // 🎯 ૩. ફોર્મમાં એક જ સોર્સની અંદર આ બધી આઇટમ્સ એકસાથે સેટ કરો
    setOutwardSources([
      {
        id: Date.now(),
        party: entry.party_name || '',
        site: entry.site_name || '',
        transporter: entry.transporter_name || '',
        vehicleNumber: entry.vehicle_no === 'EMPTY' ? '' : (entry.vehicle_no || ''),
        dcNumber: entry.dc_number === 'EMPTY' ? '' : (entry.dc_number || ''),
        description: entry.description || '',
        items: mappedItems, // 👈 અહીં બધા જ મટીરિયલ્સ એકસાથે આઇટમ્સ તરીકે આવી જશે!
        billFiles: []
      }
    ]);
  };
  // 🎯 પ્લાન્ટ બદલાય ત્યારે ID સેટ થાય અને ઓટો DC નંબર જનરેટ થઈને સેટ થાય
  const handlePlantChange = async (e) => {
    const plantName = e.target.value;
    setSelectedPlant(plantName);
    const foundPlant = plants.find(p => p.plant_name === plantName);
    const plantId = foundPlant ? foundPlant.id : '';
    setSelectedPlantId(plantId);

    if (plantName) {
      // 1. ડેટાબેઝમાંથી પેલા પ્લાન્ટનો છેલ્લો DC નંબર શોધીને નવો DC નંબર બનાવો
      let nextNumber = 1001;
      try {
        const { data, error } = await supabase
          .from('plant_material_outward')
          .select('dc_number')
          .eq('plant_name', plantName)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0 && data[0].dc_number && data[0].dc_number !== 'EMPTY') {
          const lastDc = data[0].dc_number;
          const match = lastDc.match(/\d+$/);
          if (match) {
            nextNumber = parseInt(match[0], 10) + 1;
          }
        }
      } catch (err) {
        console.error("Error fetching next DC:", err);
      }

      const plantPrefix = plantName.substring(0, 3).toUpperCase();
      const nextDcNumber = `DC-${plantPrefix}-${nextNumber}`;

      // 2. બધા આઉટવર્ડ સોર્સમાં ઓટો DC નંબર અસાઇન કરી દો
      setOutwardSources(prev => prev.map(src => ({ ...src, dcNumber: nextDcNumber })));
    } else {
      // જો પ્લાન્ટ ખાલી કરી નાખીએ તો DC નંબર પણ ખાલી કરી દો
      setOutwardSources(prev => prev.map(src => ({ ...src, dcNumber: '' })));
    }
  };
   const handleDropdownClick = () => {
    if (!selectedPlant) {
      alert("⚠️ કૃપા કરીને પહેલા ઉપરથી પ્લાન્ટ સિલેક્ટ કરો!");
      return false;
    }
    return true;
  };
  // 🎯 આગામી DC નંબર ડેટાબેઝમાંથી શોધીને લાવવાનું મુખ્ય ફંક્શન
  const fetchNextDcNumber = async (plantName) => {
    if (!plantName) return '';
    try {
      const { data, error } = await supabase
        .from('plant_material_outward')
        .select('dc_number')
        .eq('plant_name', plantName)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1001;
      if (data && data.length > 0 && data[0].dc_number && data[0].dc_number !== 'EMPTY') {
        const lastDc = data[0].dc_number;
        const match = lastDc.match(/\d+$/);
        if (match) {
          nextNumber = parseInt(match[0], 10) + 1;
        }
      }

      const plantPrefix = plantName.substring(0, 3).toUpperCase();
      return `DC-${plantPrefix}-${nextNumber}`;
    } catch (err) {
      console.error("Error fetching next DC:", err);
      return `DC-${plantName.substring(0, 3).toUpperCase()}-1001`;
    }
  };

const addOutwardSource = async () => {
    let nextDc = '';
    if (selectedPlant) {
      // જો એક કરતા વધુ સોર્સ ઉમેરાતા હોય, તો હાલના સોર્સની સંખ્યાના આધારે આગળનો નંબર પણ સેટ કરી શકાય
      nextDc = await fetchNextDcNumber(selectedPlant);
      
      // જો તે જ પ્લાન્ટમાં અગાઉથી કોઈ DC નંબર બન્યો હોય તો તેમાં +1 કરવા માટે:
      if (outwardSources.length > 0 && outwardSources[outwardSources.length - 1].dcNumber) {
        const lastDc = outwardSources[outwardSources.length - 1].dcNumber;
        const match = lastDc.match(/\d+$/);
        if (match) {
          const incremented = parseInt(match[0], 10) + 1;
          const plantPrefix = selectedPlant.substring(0, 3).toUpperCase();
          nextDc = `DC-${plantPrefix}-${incremented}`;
        }
      }
    }

    setOutwardSources([
      ...outwardSources, 
      { 
        id: Date.now(), 
        party: '', 
        site: '', 
        transporter: '', 
        vehicleNumber: '', 
        dcNumber: nextDc, 
        items: [{ id: Date.now(), material: '', size: '', qty: '', unit: 'Nos', category: 'Finished Product', steelSpec: '' }] 
      }
    ]);
  };
  const updateOutwardSource = (sIdx, field, val) => { const updated = [...outwardSources]; updated[sIdx][field] = val; setOutwardSources(updated); };
  const addOutwardItem = (sIdx) => { const updated = [...outwardSources]; updated[sIdx].items.push({ id: Date.now(), material: '', qty: '', unit: 'Nos', steelSpec: '' }); setOutwardSources(updated); };
  const updateOutwardItem = (sIdx, iIdx, field, val) => { const updated = [...outwardSources]; updated[sIdx].items[iIdx][field] = val; setOutwardSources(updated); };
  const removeOutwardSource = (index) => setOutwardSources(outwardSources.filter((_, i) => i !== index));
  const removeOutwardItem = (sIdx, iIdx) => {
    const updated = [...outwardSources];
    updated[sIdx].items = updated[sIdx].items.filter((_, i) => i !== iIdx);
    setOutwardSources(updated);
  };

const handleCancelEdit = async () => {
    setEditingId(null);
    setExistingBills([]);
    
    // 🎯 Cancel કરીએ એટલે તારીખ પાછી આજની તારીખ થઈ જાય
    setDprDate(new Date().toISOString().split('T')[0]);

    let nextDc = '';
    if (selectedPlant) {
      nextDc = await fetchNextDcNumber(selectedPlant);
    }

    setOutwardSources([
      {
        id: Date.now(),
        party: '',
        site: '',
        transporter: '',
        vehicleNumber: '',
        dcNumber: nextDc, 
        items: [{ id: Date.now(), material: '', size: '', qty: '', unit: 'Nos', category: 'Finished Product', steelSpec: '' }],
        billFiles: []
      }
    ]);
  };

  
const handleSubmitOutward = async (e) => {
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
      let materialLedgerRows = []; 
      let rowsToInsert = [];

      // ૧. ફોર્મમાં ભરેલા બધા જ સોર્સ અને આઇટમ્સને કલેક્ટ કરો
      for (const source of outwardSources) {
        for (const item of source.items) {
          if (item.qty && item.material) {
            const qtyVal = Number(item.qty);
            const categoryStr = (item.category || 'Finished Product').trim();
            
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

            const singleRowData = {
              date: dprDate,                        
              plant_name: selectedPlant,
              party_name: source.party,
              site_name: source.site,
              dc_number: source.dcNumber && source.dcNumber.trim() !== '' ? source.dcNumber.trim() : 'EMPTY',
              item_type: categoryStr, 
              description: source.description || '',
              transporter_name: source.transporter || 'EMPTY', 
              vehicle_no: source.vehicleNumber && source.vehicleNumber.trim() !== '' ? source.vehicleNumber.trim() : 'EMPTY',
              material_name: fullMaterialNameToSave,
              quantity: qtyVal,
              unit: item.unit,
              submitted_by: currentLoggedUser
            };

            rowsToInsert.push({ 
              singleRowData, 
              exactProductName, 
              finalSizeVariant, 
              categoryStr, 
              qtyVal, 
              unit: item.unit, 
              rawMaterial: item.material 
            });
          }
        }
      }

      if (rowsToInsert.length === 0) {
        alert("કૃપા કરીને ઓછામાં ઓછી એક મટીરિયલ આઇટમ અને જથ્થો ભરો!");
        setLoading(false);
        return;
      }

      // ૨. 🎯 એડિટ મોડ હોય તો એ જ DC નંબર વાળા જૂના બધા રેકૉર્ડ્સ અને લેજર ડિલીટ કરો
      if (editingId) {
        const currentDc = outwardSources[0]?.dcNumber;
        
        if (currentDc && currentDc !== 'EMPTY') {
          // એ જ DC નંબર વાળી બધી જૂની રો શોધીને સાફ કરો
          const { data: oldRows } = await supabase
            .from('plant_material_outward')
            .select('id')
            .eq('plant_name', selectedPlant)
            .eq('dc_number', currentDc);

          if (oldRows && oldRows.length > 0) {
            const oldIds = oldRows.map(r => r.id);
            await supabase.from('stock_ledger').delete().in('reference_id', oldIds);
            await supabase.from('material_stock_ledger').delete().in('reference_id', oldIds);
            await supabase.from('plant_material_outward').delete().in('id', oldIds);
          }
        } else {
          // જો DC નંબર ન હોય તો માત્ર સિંગલ editingId થી સાફ કરો
          await supabase.from('stock_ledger').delete().eq('reference_id', editingId);
          await supabase.from('material_stock_ledger').delete().eq('reference_id', editingId);
          await supabase.from('plant_material_outward').delete().eq('id', editingId);
        }
      }

      // ૩. ૩ નવું લિસ્ટ વન બાય વન ઇન્સર્ટ કરો અને લેજર માટે રો તૈયાર કરો
      for (const obj of rowsToInsert) {
        const { data: insertedData, error: outErr } = await supabase
          .from('plant_material_outward')
          .insert([obj.singleRowData])
          .select()
          .single();

        if (outErr) throw outErr;

        // કેટેગરી મુજબ સાચા લેજરમાં એન્ટ્રી નાખો
        if (obj.categoryStr.toLowerCase() === 'finished product') {
          stockLedgerRows.push({
            date: dprDate,
            plant_name: selectedPlant,
            product_name: obj.exactProductName,
            size_variant: obj.finalSizeVariant,
            transaction_type: 'OUTWARD',
            qty: obj.qtyVal,
            reference_id: insertedData.id
          });
        } else {
          materialLedgerRows.push({
            date: dprDate,
            plant_name: selectedPlant,
            material_name: obj.rawMaterial,
            unit: obj.unit || 'Nos',
            transaction_type: 'OUTWARD',
            qty: obj.qtyVal,
            reference_id: insertedData.id
          });
        }
      }

      // ૪. લેજરમાં ઇન્સર્ટ કરો
      if (stockLedgerRows.length > 0) {
        const { error: stockErr } = await supabase.from('stock_ledger').insert(stockLedgerRows);
        if (stockErr) throw stockErr;
      }

      if (materialLedgerRows.length > 0) {
        const { error: matErr } = await supabase.from('material_stock_ledger').insert(materialLedgerRows);
        if (matErr) throw matErr;
      }

      const wasEditing = editingId !== null;
      setEditingId(null);
      
      if (wasEditing) {
        alert("✅ આઉટવર્ડ એન્ટ્રી સફળતાપૂર્વક અપડેટ થઈ ગઈ છે!");
      } else {
        alert("✅ મટીરિયલ આઉટવર્ડ સફળતાપૂર્વક સેવ થઈ ગયું છે!");
      }

      let nextDc = '';
      if (selectedPlant) {
        nextDc = await fetchNextDcNumber(selectedPlant);
      }

      setOutwardSources([
        {
          id: Date.now(),
          party: '',
          site: '',
          transporter: '',
          vehicleNumber: '',
          dcNumber: nextDc, 
          items: [{ id: Date.now(), material: '', size: '', qty: '', unit: 'Nos', category: 'Finished Product', steelSpec: '' }]
        }
      ]);

      fetchRecentHistory();

    } catch (err) {
      alert("એરર: " + err.message);
    } finally {
      setLoading(false);
    }
  };

const handlePrintDC = async (dcNumber, partyName, siteName, itemsArray, vehicleNo, transName, entryDate, submittedUser) => {
    
    let siteAddress = '';
    try {
      if (siteName && siteName !== '-') {
        const { data: siteData, error: siteError } = await supabase
          .from('sites')
          .select('address')
          .eq('site_name', siteName)
          .maybeSingle();

        if (!siteError && siteData) {
          siteAddress = siteData.address || '';
        }
      }
    } catch (err) {
      console.log("Site address fetch error:", err);
    }

    const printWindow = window.open('', '_blank', 'width=1000,height=750');
    
    if (!printWindow) {
      alert("કૃપા કરીને પૉપ-અપ બ્લોકર બંધ કરો.");
      return;
    }

    const itemsTableRows = itemsArray && itemsArray.length > 0 
      ? itemsArray.map((item, idx) => {
          let category = (item.item_type || item.category || '').toLowerCase();
          let rawMatName = item.material || item.material_name || '';
          let rawSize = item.size || '';

          if (category.includes('finish') || category.includes('product')) {
            if (rawMatName.includes('(') && rawMatName.includes(')')) {
              const firstOpen = rawMatName.indexOf('(');
              rawMatName = rawMatName.substring(0, firstOpen).trim();
            }

            if (!rawSize && rawMatName.includes(' ')) {
              const lastSpace = rawMatName.lastIndexOf(' ');
              const potentialSz = rawMatName.substring(lastSpace + 1).trim();
              if (!isNaN(potentialSz) || potentialSz.includes('*') || potentialSz.length <= 6) {
                rawSize = potentialSz;
                rawMatName = rawMatName.substring(0, lastSpace).trim();
              }
            }
          } else {
            rawSize = '-';
          }

          const qVal = item.qty || item.quantity || '';
          const uVal = item.unit || 'Nos';

          return `
            <tr>
              <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 12px;">${idx + 1}</td>
              <td style="border: 1px solid #000; padding: 6px; font-size: 12px; font-weight: 600; word-break: break-all;">${rawMatName}</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 12px;">${rawSize || '-'}</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 12px; font-weight: 600;">${uVal}</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 12px;">${qVal}</td>
            </tr>
          `;
        }).join('')
      : `<tr><td colspan="5" style="text-align: center; padding: 10px;">No items found</td></tr>`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Delivery Challan - ${dcNumber}</title>
          <style>
            body { font-family: 'Arial', sans-serif; color: #000; margin: 0; padding: 10px; background: #fff; }
            .page-border { border: 2px solid #000; padding: 10px 10px 45px 10px; position: relative; min-height: 94vh; box-sizing: border-box; }
            
            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 450px;
              opacity: 0.08;
              z-index: 0;
              pointer-events: none;
            }

            .content-wrapper { position: relative; z-index: 1; }

            .letterhead-table { width: 100%; border-collapse: collapse; border-bottom: 2px solid #000; margin-bottom: 5px; }
            .letterhead-table td { border: none; padding: 4px 5px; vertical-align: middle; }
            
            .address-box { border: 1px solid #000; border-top: none; padding: 5px 10px; font-size: 11px; font-weight: bold; margin-bottom: 0; background: #f8fafc; text-align: center; }
            
            .capabilities-box { border: 1px solid #000; border-top: 1px solid #000; background: #f1f5f9; padding: 5px 10px; text-align: center; margin-bottom: 0; }
            .capabilities-title { font-size: 11px; font-weight: bold; color: #000; text-transform: uppercase; margin-bottom: 2px; }
            .capabilities-desc { font-size: 10px; color: #334155; line-height: 1.4; }

            .contact-box { border: 1px solid #000; border-top: 1px solid #000; padding: 6px 10px; font-size: 11px; margin-bottom: 12px; }
            .contact-box p { margin: 2px 0; font-weight: bold; }

            .title-box { text-align: center; background: #e2e8f0; border: 1px solid #000; padding: 6px; font-size: 14px; font-weight: bold; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 1px; }

        
            .details-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; table-layout: fixed; }
            .details-table td { border: 1px solid #000; padding: 10px 14px; vertical-align: top; line-height: 1.6; word-break: break-word; overflow-wrap: break-word; }

            table.main-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            th { background-color: #f1f5f9; color: #000; border: 1px solid #000; padding: 6px; text-align: center; font-size: 12px; }
        
            .footer-table { width: 100%; border-collapse: collapse; margin-top: 50px; font-size: 12px; }
            .footer-table td { border: none; padding: 10px; font-weight: bold; }
            
            .generated-by { 
              position: absolute; 
              bottom: 10px; 
              right: 15px; 
              font-size: 9px; 
              color: #64748b; 
              font-style: italic; 
            }
          </style>
        </head>
        <body>
          <div class="page-border">
            
            <img src="${COMPANY_LOGO_BASE64}" class="watermark" alt="Watermark" />

            <div class="content-wrapper">
              
              
              <table class="letterhead-table">
                <tr>
                  <td style="width: 155px; text-align: left;">
                    <img src="${COMPANY_LOGO_BASE64}" alt="Logo" style="height: 100px; width: auto; object-fit: contain; display: block;" />
                  </td>
                  <td style="text-align: center;">
                    <h1 style="font-size: 36px; font-weight: 800; color: #a32a2a; margin: 0; letter-spacing: 1px;">T&J INFRA</h1>
                    <p style="font-size: 9px; color: #a32a2a; font-weight: bold; margin: 2px 0 0 0;">(AN ISO 9001:2015, 14001:2015, 45001:2018 CERTIFIED COMPANY)</p>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top: 6px; padding-bottom: 4px;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="border: none; text-align: left; font-size: 10px; font-weight: bold; padding: 0; width: 160px;">
                          Website: <a href="https://www.tnjinfra.com" style="color: #2563eb;">www.tnjinfra.com</a>
                        </td>
                        <td style="border: none; text-align: right; font-size: 10px; font-weight: bold; padding: 0;">
                          Email: <a href="mailto:sales@tnjinfra.com" style="color: #2563eb;">sales@tnjinfra.com</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <div class="address-box">
                Corporate Address: 404, Gala Magnus, Safal Parisar Road, South Bopal, Ahmedabad, Gujarat - 380057
              </div>

              <div class="capabilities-box">
                <div class="capabilities-title">OUR CAPABILITIES</div>
                <div class="capabilities-desc">
                  Precast Manufacturing & Erection | Boundary & Compound Wall Solutions | Fabrication and PEB Work | Oil-Gas & Siphon Pipe Lines | Solar & Electrical | Sign Board & Demarcation
                </div>
              </div>

              <div class="contact-box">
                <p>Mr. Tarun Patel</p>
                <p style="color: #334155;">Mo.: +91 8238598234 / 9898664655</p>
              </div>

              <div class="title-box">
                Delivery Challan
              </div>

              <table class="details-table">
                <tr>
                  <td style="width: 50%;">
                    <div style="margin-bottom: 4px;"><b>DC No:</b> <span style="font-weight: 600;">${dcNumber}</span></div>
                    <div style="margin-bottom: 4px;"><b>Party Name:</b> <span style="font-weight: 600;">${partyName || '-'}</span></div>
                    <div style="margin-bottom: 4px;"><b>Site Name:</b> <span style="font-weight: 600;">${siteName || '-'}</span></div>
                    ${siteAddress ? `<div style="color: #334155; font-size: 11px; margin-top: 2px;"><b>Site Address:</b> ${siteAddress}</div>` : ''}
                  </td>
                  <td style="width: 50%;">
                    <div style="margin-bottom: 4px;"><b>Date:</b> <span style="font-weight: 600;">${entryDate}</span></div>
                    <div style="margin-bottom: 4px;"><b>Transporter:</b> <span style="font-weight: 600;">${transName && transName !== 'EMPTY' ? transName : '-'}</span></div>
                    <div><b>Vehicle No:</b> <span style="font-weight: 600;">${vehicleNo && vehicleNo !== 'EMPTY' ? vehicleNo : '-'}</span></div>
                  </td>
                </tr>
              </table>

              <table class="main-table">
                <thead>
                  <tr>
                    <th style="width: 45px;">Sr No</th>
                    <th>Material / Product Description</th>
                    <th style="width: 110px;">Size</th>
                    <th style="width: 80px;">UOM</th>
                    <th style="width: 90px;">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsTableRows}
                </tbody>
              </table>

              <table class="footer-table">
                <tr>
                  <td>Receiver's Signature</td>
                  <td style="text-align: right;">Authorized Signatory</td>
                </tr>
              </table>

            </div>

            <div class="generated-by">
              Generated by: ${submittedUser || 'System User'}
            </div>

          </div>

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '650px', margin: '0 auto', paddingBottom: '20px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* 1. Modern Orange/Outward Header (ઇનવર્ડ જેવો જ સેમ પ્રીમિયમ લુક) */}
      <div style={{ 
        background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', 
        padding: '14px 18px', 
        borderRadius: '16px', 
        border: '1px solid #fed7aa', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px',
        boxShadow: '0 4px 12px rgba(234, 88, 12, 0.08)'
      }}>
        <div style={{ 
          backgroundColor: '#ea580c', 
          padding: '8px', 
          borderRadius: '10px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(234, 88, 12, 0.2)'
        }}>
          <ArrowUpRight size={20} color="#ffffff" strokeWidth={2.5} />
        </div>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#9a3412', margin: 0, letterSpacing: '0.2px' }}>
            Plant Material Outward Entry
          </h3>
          <span style={{ fontSize: '11px', color: '#c2410c', fontWeight: '600' }}>
            Manage outgoing stock and dispatches efficiently
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmitOutward} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
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
 {/* ================= 3. MATERIAL OUTWARD ================= */}
<div style={{ backgroundColor: '#fff7ed', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px dashed #cbd5e1', paddingBottom: '10px' }}>
    <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#c2410c', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
      <ArrowUpRight size={18} /> 3. MATERIAL OUTWARD (મટીરિયલ ગયું)
    </h4>
    <button type="button" onClick={addOutwardSource} style={{ backgroundColor: '#ea580c', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
      <Plus size={14} /> Add Source
    </button>
  </div>

  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
  
      
   
     {outwardSources.map((source, sIndex) => {
      // 🎯 100% સચોટ ફિલ્ટર લોજિક (Parties અને Sites ના નામ મેચ કરવા માટે)
      const selectedPartyName = (source.party || '').trim();
      const allSitesList = (typeof sites !== 'undefined' ? sites : []);
      
      const partySites = allSitesList.filter(s => {
        // ડેટાબેઝના 'party_name' કે 'party' કૉલમ સાથે સરખામણી કરવી
        const dbParty = (s.party_name || s.party || '').trim();
        
        // જો પાર્ટીનું નામ અક્ષરો સાથે પરફેક્ટ મેચ થતું હોય (Case-insensitive)
        if (dbParty.toLowerCase() === selectedPartyName.toLowerCase()) {
          return true;
        }
        
        // સેફ્ટી માટે: જો ડેટાબેઝમાં પાર્ટી ખાલી હોય તો પણ એરર ન આવે
        return false;
      });

 
      return (
        <div key={source.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: sIndex < outwardSources.length - 1 ? '2px solid #cbd5e1' : 'none', paddingBottom: sIndex < outwardSources.length - 1 ? '16px' : '0' }}>
          
       {/* 🏷️ Outward Source ની જગ્યાએ સીધો ઓટો DC નંબર */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '6px', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      📄 DC No: {source.dcNumber || 'Loading...'}
                    </span>

                    {outwardSources.length > 1 && (
                      <button type="button" onClick={() => removeOutwardSource(sIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                        Remove Source
                      </button>
                    )}
                  </div>
{/* Party and Site Row */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    
                    {/* 1. Party / Client Dropdown & Manual Input */}
                    <div style={{ flex: 1 }}>
                      <select 
                        value={parties.map(p => typeof p === 'string' ? p : (p.party_name || p.name)).includes(source.party) ? source.party : (source.party ? 'OTHER_PARTY_MANUAL' : '')} 
                        onClick={handleDropdownClick}
                        onChange={(e) => {
                          updateOutwardSource(sIndex, 'party', e.target.value);
                          updateOutwardSource(sIndex, 'site', ''); // પાર્ટી બદલાય એટલે સાઈટ રિસેટ થઈ જાય
                        }} 
                        style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}
                      >
                        <option value="">-- Select Party / Client --</option>
                        {parties.map((p, idx) => {
                          const pName = typeof p === 'string' ? p : (p.party_name || p.name);
                          return <option key={`party-${idx}`} value={pName}>{pName}</option>;
                        })}
                        <option value="OTHER_PARTY_MANUAL" style={{ fontWeight: 'bold', color: '#2563eb' }}>➕ Other (Type Manually...)</option>
                      </select>

                      {/* Party Manual Input Box (જો Other સિલેક્ટ કરીએ તો જ દેખાશે) */}
                      {(source.party === 'OTHER_PARTY_MANUAL' || (!parties.some(p => (typeof p === 'string' ? p : (p.party_name || p.name)) === source.party) && source.party !== '')) && (
                        <input 
                          type="text" 
                          placeholder="Type custom party name..." 
                          value={source.party === 'OTHER_PARTY_MANUAL' ? '' : source.party} 
                          onChange={(e) => {
                            const val = e.target.value;
                            updateOutwardSource(sIndex, 'party', val === '' ? 'OTHER_PARTY_MANUAL' : val);
                          }} 
                          autoFocus
                          style={{ width: '100%', marginTop: '5px', padding: '7px', borderRadius: '6px', border: '1px solid #2563eb', fontSize: '11px', backgroundColor: '#eff6ff', boxSizing: 'border-box' }} 
                        />
                      )}
                    </div>

                    {/* 2. Site Dropdown (માત્ર સિલેક્ટ કરેલી પાર્ટીની સાઈટો જ બતાવશે, કોઈ Other નહીં) */}
                    <div style={{ flex: 1 }}>
                      {source.party === 'OTHER_PARTY_MANUAL' || (!parties.some(p => (typeof p === 'string' ? p : (p.party_name || p.name)) === source.party) && source.party !== '' && parties.length > 0 && partySites.length === 0) ? (
                        /* જો કસ્ટમ પાર્ટી હોય તો સાઈટ જાતે ટાઈપ કરવા માટેનું બોક્સ */
                        <input 
                          type="text" 
                          placeholder="Type site name manually..." 
                          value={source.site} 
                          onChange={(e) => updateOutwardSource(sIndex, 'site', e.target.value)} 
                          style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #2563eb', fontSize: '11px', backgroundColor: '#eff6ff', boxSizing: 'border-box' }} 
                        />
                      ) : (
                        /* સામાન્ય સંજોગોમાં ફક્ત પાર્ટીની લિસ્ટવાળી સાઈટોનું ડ્રોપડાઉન */
                        <select 
                          value={source.site || ''} 
                          onClick={handleDropdownClick}
                          onChange={(e) => updateOutwardSource(sIndex, 'site', e.target.value)} 
                          style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}
                        >
                          <option value="">-- Select Site (Required) --</option>
                          {partySites.map((s, idx) => {
                            const sName = typeof s === 'string' ? s : (s.name || s.site_name);
                            return <option key={`site-${idx}`} value={sName}>{sName}</option>;
                          })}
                        </select>
                      )}
                    </div>

                  </div>
          {/* 📦 Material Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {source.items.map((item, iIndex) => {
              
              const isFinishedProduct = item.category === 'Finished Product';
              const isPanel = item.material && item.material.toLowerCase().includes('panel');
              const isColumn = item.material && item.material.toLowerCase().includes('column');

              return (
                <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: '#fff', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  
                  {/* Category Select */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <select 
                      value={item.category || 'Finished Product'} 
                      onChange={(e) => {
                        updateOutwardItem(sIndex, iIndex, 'category', e.target.value);
                        updateOutwardItem(sIndex, iIndex, 'material', ''); 
                      }} 
                      style={{ flex: 1, padding: '5px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff7ed', fontWeight: 'bold', color: '#c2410c' }}
                    >
                      <option value="Finished Product">1. Finished Product</option>
                      <option value="Raw Material">2. Raw Material</option>
                      <option value="Consumable Item">3. Consumable Item</option>
                      <option value="Tools and Hardware">4. Tools and Hardware</option>
                    </select>

                    {source.items.length > 1 && (
                      <button type="button" onClick={() => removeOutwardItem(sIndex, iIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
{/* Material Dropdown + Size Dropdown + Qty + Unit */}
{(() => {
  // 🎯 જો કેટેગરી ખાલી હોય તો ડિફોલ્ટ 'Finished Product' માની લો, જેથી રિફ્રેશ કરતાની સાથે જ બરાબર દેખાય
  const currentCategory = item.category || 'Finished Product';
  const isFinishedProduct = currentCategory === 'Finished Product';
  
  // 1. ફક્ત યુનિક પ્રોડક્ટના નામ કાઢવા માટે (ડુપ્લિકેટ વગર)
  const uniqueProductNames = [...new Set(products.map(p => p.name))];

  // 2. રો મટીરિયલ કે અન્ય માટેનું ફિલ્ટર (currentCategory નો ઉપયોગ કર્યો છે)
  const filteredMaterials = materials.filter(m => {
    if (!m.item_type) return true;
    return m.item_type.toLowerCase().trim() === currentCategory.toLowerCase().trim() ||
           m.item_type.toLowerCase().includes(currentCategory.toLowerCase().split(' ')[0]);
  });

  const isCustomItem = item.material === 'OTHER_MANUAL' || (item.material && !isFinishedProduct && !filteredMaterials.some(m => m.name.trim().toLowerCase() === item.material.trim().toLowerCase())) || (item.material && isFinishedProduct && !uniqueProductNames.map(n => n.trim().toLowerCase()).includes(item.material.trim().toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
      
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
       <select 
            value={isCustomItem ? 'OTHER_MANUAL' : (item.material || '')} 
            onClick={handleDropdownClick} 
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'OTHER_MANUAL') {
                updateOutwardItem(sIndex, iIndex, 'material', 'OTHER_MANUAL');
              } else {
                updateOutwardItem(sIndex, iIndex, 'material', val);
              }
              updateOutwardItem(sIndex, iIndex, 'size', ''); 
            }} 
            style={{ flex: isFinishedProduct ? '1.1' : '1.8', minWidth: '0', padding: '7px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}
          >
            <option value="">-- Select Material --</option>
            {isFinishedProduct ? (
              Array.from(
                new Map(
                  products.map(p => [p.name ? p.name.trim().toLowerCase() : '', p.name ? p.name.trim() : ''])
                ).values()
              ).map((prodName, idx) => (
                <option key={`prod-${idx}`} value={prodName}>{prodName}</option>
              ))
            ) : (
              filteredMaterials
                .map(m => <option key={`m-${m.id}`} value={m.name}>{m.name}</option>)
            )}

            <option value="OTHER_MANUAL" style={{ fontWeight: 'bold', color: '#2563eb' }}>➕ Other...</option>
          </select>

         {/* Size Dropdown / Manual Input (Only for Finished Product) */}
          {isFinishedProduct && (
            isCustomItem ? (
              <input 
                type="text" 
                placeholder="Type size manually..." 
                value={item.size || ''} 
                onChange={(e) => updateOutwardItem(sIndex, iIndex, 'size', e.target.value)} 
                style={{ flex: '1', minWidth: '0', padding: '7px 4px', borderRadius: '6px', border: '1px solid #2563eb', fontSize: '11px', backgroundColor: '#eff6ff', boxSizing: 'border-box' }} 
              />
            ) : (
              <select 
                value={item.size || ''} 
                onChange={(e) => updateOutwardItem(sIndex, iIndex, 'size', e.target.value)} 
                style={{ flex: '1', minWidth: '0', padding: '7px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#f8fafc', fontWeight: 'bold', color: '#0f172a', boxSizing: 'border-box' }}
              >
                <option value="">-- Select Size --</option>
                {products
                  .filter(p => p.name && item.material && p.name.trim().toLowerCase() === item.material.trim().toLowerCase() && p.product_size)
                  .map((p, sIdx) => (
                    <option key={`sz-${sIdx}`} value={p.product_size}>{p.product_size}</option>
                  ))
                }
              </select>
            )
          )}
          
          {/* Qty Input */}
          <input 
            type="number" 
            placeholder="Qty" 
            value={item.qty} 
            onChange={(e) => updateOutwardItem(sIndex, iIndex, 'qty', e.target.value)} 
            style={{ flex: '0.7', minWidth: '0', padding: '7px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', textAlign: 'center', boxSizing: 'border-box' }} 
          />
          
          {/* Unit Select */}
          <select 
            value={item.unit} 
            onChange={(e) => updateOutwardItem(sIndex, iIndex, 'unit', e.target.value)} 
            style={{ flex: '0.8', minWidth: '0', padding: '7px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}
          >
            <option value="Nos">Nos</option>
            <option value="Tons">Tons</option>
            <option value="Bags">Bags</option>
            <option value="Kg">Kg</option>
          </select>
        </div>

        {/* 🎯 Custom Material / Product Name Input Box */}
        {isCustomItem && (
          <input 
            type="text" 
            placeholder={isFinishedProduct ? "Type custom product name here..." : "Type custom material name here..."}
            value={item.material === 'OTHER_MANUAL' ? '' : item.material} 
            onChange={(e) => {
              const val = e.target.value;
              updateOutwardItem(sIndex, iIndex, 'material', val); 
            }} 
            autoFocus
            style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '8px', border: '1px solid #2563eb', fontSize: '12px', backgroundColor: '#eff6ff', boxSizing: 'border-box' }} 
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
                        onChange={(e) => updateOutwardItem(sIndex, iIndex, 'steelSpec', e.target.value)} 
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

                 {/* Panel Spec (Optgroup વાળા ઓરિજિનલ ડિઝાઇન સાથે) */}
{isPanel && (
  <div style={{ backgroundColor: '#f8fafc', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
    <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#334155' }}>🛠️ Panel Spec:</span>
    <select 
      value={item.steelSpec || ''} 
      onChange={(e) => updateOutwardItem(sIndex, iIndex, 'steelSpec', e.target.value)} 
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

            {/* 🎯 Add Item અને Create DC બટન એક જ લાઈનમાં */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', marginBottom: '8px' }}>
              <button 
                type="button" 
                onClick={() => addOutwardItem(sIndex)} 
                style={{ backgroundColor: 'transparent', color: '#c2410c', border: '1px dashed #ea580c', padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={13} /> Add Item
              </button>

              <div>
                <input 
                  type="file" 
                  id={`outward-dc-upload-${sIndex}`} 
                  style={{ display: 'none' }} 
                  multiple 
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    if (files.length > 0) {
                      const existingFiles = source.billFiles || [];
                      updateOutwardSource(sIndex, 'billFiles', [...existingFiles, ...files]);
                    }
                    e.target.value = null;
                  }} 
                />
                
                {/* 📄 Create DC / Attach DC Button */}
                <label 
                  htmlFor={`outward-dc-upload-${sIndex}`} 
                  style={{ backgroundColor: '#fff7ed', color: '#c2410c', border: '1px dashed #ea580c', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  📄 {source.billFiles && source.billFiles.length > 0 ? `${source.billFiles.length} DC Attached` : 'Create DC'}
                </label>

                {/* સિલેક્ટ થયેલી ફાઇલોની યાદી અને હટાવવા માટેનું ✕ બટન */}
                {source.billFiles && source.billFiles.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                    {source.billFiles.map((file, fIndex) => (
                      <div key={fIndex} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', border: '1px solid #cbd5e1' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }} title={file.name}>
                          📄 {file.name}
                        </span>
                        <button 
                          type="button" 
                          onClick={() => {
                            const updatedFiles = source.billFiles.filter((_, idx) => idx !== fIndex);
                            updateOutwardSource(sIndex, 'billFiles', updatedFiles);
                          }} 
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', padding: '0 4px' }}
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
{/* Transporter & Vehicle Number Section */}
{(() => {
  const isCustomTransporter = source.transporter === 'OTHER_TRANSPORTER_MANUAL' || (source.transporter && !transporters.some(t => t.transporter_name === source.transporter));

  return (
    <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
      
      <div style={{ display: 'flex', gap: '8px' }}>
        
        {/* 1. Transporter Dropdown */}
        <div style={{ flex: 1 }}>
          <select 
            value={isCustomTransporter ? 'OTHER_TRANSPORTER_MANUAL' : (source.transporter || '')} 
            onClick={handleDropdownClick}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'OTHER_TRANSPORTER_MANUAL') {
                updateOutwardSource(sIndex, 'transporter', 'OTHER_TRANSPORTER_MANUAL');
                updateOutwardSource(sIndex, 'vehicleNumber', ''); 
              } else {
                updateOutwardSource(sIndex, 'transporter', val);
                updateOutwardSource(sIndex, 'vehicleNumber', ''); 
              }
            }} 
            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}
          >
            <option value="">-- Select Transporter --</option>
            {transporters.map(t => (
              <option key={`trans-${t.id}`} value={t.transporter_name}>{t.transporter_name}</option>
            ))}
            <option value="OTHER_TRANSPORTER_MANUAL" style={{ fontWeight: 'bold', color: '#2563eb' }}>➕ Other (Type Manually...)</option>
          </select>
        </div>

        {/* 2. Vehicle Number Box */}
        <div style={{ flex: 1 }}>
          {isCustomTransporter ? (
            <input 
              type="text" 
              placeholder="Type vehicle number manually..." 
              value={source.vehicleNumber || ''} 
              onChange={(e) => updateOutwardSource(sIndex, 'vehicleNumber', e.target.value)} 
              style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #2563eb', fontSize: '12px', backgroundColor: '#eff6ff', boxSizing: 'border-box' }} 
            />
          ) : (
            <select 
              value={source.vehicleNumber || ''} 
              onClick={handleDropdownClick}
              onChange={(e) => updateOutwardSource(sIndex, 'vehicleNumber', e.target.value)} 
              style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}
            >
              <option value="">-- Select Vehicle Number --</option>
              {transporters
                .filter(t => t.transporter_name === source.transporter)
                .flatMap(t => {
                  const vList = t.vehicles_list;
                  if (Array.isArray(vList)) {
                    return vList.map(v => v.vehicleNo).filter(Boolean);
                  }
                  return [];
                })
                .map((vehNo, vIdx) => (
                  <option key={`veh-${vIdx}`} value={vehNo}>{vehNo}</option>
                ))
              }
            </select>
          )}
        </div>

      </div>

      {/* 🎯 Custom Transporter Name Input Box */}
      {isCustomTransporter && (
        <input 
          type="text" 
          placeholder="Type custom transporter name..." 
          value={source.transporter === 'OTHER_TRANSPORTER_MANUAL' ? '' : source.transporter} 
          onChange={(e) => {
            const val = e.target.value;
            updateOutwardSource(sIndex, 'transporter', val);
          }} 
          autoFocus
          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #2563eb', fontSize: '12px', backgroundColor: '#eff6ff', boxSizing: 'border-box' }} 
        />
      )}

    </div>
  );
})()}
        </div>
      );
    })}
  </div>
</div>
       


       <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        {/* મુખ્ય Update / Submit બટન */}
        <button 
          type="submit" 
          disabled={loading} 
          style={{ 
            flex: 1,
            backgroundColor: editingId ? '#2563eb' : '#ea580c', 
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
          {loading ? 'Processing...' : (editingId ? 'Update Outward Entry' : 'Submit Outward Entry')}
        </button>

        {/* ❌ Cancel & Delete Buttons (એડિટ મોડ ચાલુ હોય તો જ દેખાશે) */}
        {editingId && (
          <>
            <button 
              type="button" 
              onClick={handleCancelEdit}
              style={{ backgroundColor: '#64748b', color: '#fff', padding: '14px 20px', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Cancel
            </button>
<button 
  type="button" 
  onClick={async () => {
    if (window.confirm("શું તમે ખરેખર આ આખી આઉટવર્ડ એન્ટ્રી ડિલીટ કરવા માંગો છો?")) {
      try {
        const currentDc = outwardSources[0]?.dcNumber;

        if (currentDc && currentDc !== 'EMPTY') {
          // ૧. એ જ DC નંબર વાળા બધા રેકૉર્ડ્સના IDs શોધો
          const { data: matchedRows, error: fetchErr } = await supabase
            .from('plant_material_outward')
            .select('id')
            .eq('plant_name', selectedPlant)
            .eq('dc_number', currentDc);

          if (fetchErr) throw fetchErr;

          if (matchedRows && matchedRows.length > 0) {
            const idsToDelete = matchedRows.map(r => r.id);

            // ૨. લેજરમાંથી અને મેઈન ટેબલમાંથી એ બધા IDs ડિલીટ કરો
            await supabase.from('stock_ledger').delete().in('reference_id', idsToDelete);
            await supabase.from('material_stock_ledger').delete().in('reference_id', idsToDelete);
            
            const { error: delErr } = await supabase
              .from('plant_material_outward')
              .delete()
              .in('id', idsToDelete);

            if (delErr) throw delErr;
          }
        } else {
          // જો DC નંબર ન હોય તો સિંગલ editingId થી ડિલીટ કરો
          await supabase.from('stock_ledger').delete().eq('reference_id', editingId);
          await supabase.from('material_stock_ledger').delete().eq('reference_id', editingId);
          
          const { error: delErr } = await supabase
            .from('plant_material_outward')
            .delete()
            .eq('id', editingId);

          if (delErr) throw delErr;
        }

        alert("✅ આઉટવર્ડ એન્ટ્રી સફળતાપૂર્વક ડિલીટ થઈ ગઈ છે!");

        // ૩. ફોર્મ રિસેટ કરો અને નવો DC નંબર મેળવો
        let nextDc = '';
        if (selectedPlant) {
          nextDc = await fetchNextDcNumber(selectedPlant);
        }

        setEditingId(null);
        setExistingBills([]);
        setDprDate(new Date().toISOString().split('T')[0]); // તારીખ આજની કરી દો
        
        setOutwardSources([
          {
            id: Date.now(),
            party: '',
            site: '',
            transporter: '',
            vehicleNumber: '',
            dcNumber: nextDc, 
            items: [{ id: Date.now(), material: '', size: '', qty: '', unit: 'Nos', category: 'Finished Product', steelSpec: '' }],
            billFiles: []
          }
        ]);

        fetchRecentHistory();

      } catch (err) {
        alert("એરર: " + err.message);
      }
    }
  }}
  style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '14px 20px', borderRadius: '12px', border: '1px solid #fca5a5', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
>
  <Trash2 size={16} /> Delete
</button>

          </>
        )}
      </div>
      </form>
{/* 📜 Recent Outward History (Grouped by DC Number) */}
{recentHistory.length > 0 && (() => {
  // 🎯 ૧. એક જ DC નંબર વાળા બધા રેકૉર્ડ્સને ભેગા (Group) કરવાનું લોજિક
  const groupedHistoryMap = {};
  
  recentHistory.forEach((item) => {
    const dcKey = (item.dc_number && item.dc_number !== 'EMPTY') ? item.dc_number : `single-${item.id}`;
    
    if (!groupedHistoryMap[dcKey]) {
      // જો આ DC પહેલીવાર આવતો હોય તો તેને મુખ્ય ઓબ્જેક્ટ તરીકે સાચવો
      groupedHistoryMap[dcKey] = {
        ...item,
        combinedMaterials: [`${item.material_name} (${item.quantity} ${item.unit})`]
      };
    } else {
      // જો આ DC નંબર પહેલેથી જ હોય, તો તેનું મટીરિયલ અને જથ્થો આની અંદર જોડી દો
      groupedHistoryMap[dcKey].combinedMaterials.push(`${item.material_name} (${item.quantity} ${item.unit})`);
    }
  });

  const groupedHistoryList = Object.values(groupedHistoryMap);

  return (
    <div style={{ marginTop: '20px' }}>
      <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '8px', paddingLeft: '4px' }}>
        Recent Outward History
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {groupedHistoryList.map((item) => {
          
          // તારીખને DD/MM/YYYY ફોર્મેટમાં ફેરવવાનું સ્માર્ટ ફંક્શન
          let displayDate = item.date || '';
          if (displayDate) {
            if (displayDate.includes('-') && displayDate.indexOf('-') === 4) {
              const p = displayDate.split('-');
              if (p.length === 3) {
                displayDate = `${p[2]}/${p[1]}/${p[0]}`;
              }
            } else if (displayDate.includes('/') && displayDate.indexOf('/') === 4) {
              const p = displayDate.split('/');
              if (p.length === 3) {
                displayDate = `${p[2]}/${p[1]}/${p[0]}`;
              }
            }
          }

          return (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div>
                {/* 🎯 એક જ DC ના બધા મટીરિયલ્સ અહીં કોમા કરીને ભેગા દેખાશે */}
                <span style={{ fontWeight: 'bold', color: '#c2410c' }}>
                  {item.combinedMaterials.join(', ')}
                </span> 
                - <span style={{ color: '#64748b' }}>{item.party_name} ({item.site_name})</span>
                
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                  DC: {item.dc_number || 'EMPTY'} | Date: {displayDate}
                </div>
              </div>

              <button 
                type="button"
                onClick={() => handleEditClick(item)}
                style={{ fontSize: '11px', fontWeight: 'bold', color: '#1d4ed8', backgroundColor: '#eff6ff', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #bfdbfe', whiteSpace: 'nowrap', marginLeft: '10px' }}
              >
                {editingId === item.id ? 'Editing...' : 'Edit'}
              </button>
             <button 
  type="button"
  onClick={async () => {
    try {
      const { data: allRows, error } = await supabase
        .from('plant_material_outward')
        .select('*')
        .eq('plant_name', selectedPlant)
        .eq('dc_number', item.dc_number);

      if (error) throw error;

      if (allRows && allRows.length > 0) {
        await handlePrintDC(
          item.dc_number, 
          item.party_name, 
          item.site_name, 
          allRows, 
          item.vehicle_no, 
          item.transporter_name, 
          displayDate,
          item.submitted_by
        );
      } else {
        await handlePrintDC(
          item.dc_number, 
          item.party_name, 
          item.site_name, 
          [item], 
          item.vehicle_no, 
          item.transporter_name, 
          displayDate,
          item.submitted_by
        );
      }
    } catch (err) {
      console.error("Print Error:", err);
    }
  }}
  style={{ fontSize: '11px', fontWeight: 'bold', color: '#ea580c', backgroundColor: '#fff7ed', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #fed7aa', marginLeft: '6px', whiteSpace: 'nowrap' }}
>
  🖨️ Print DC
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