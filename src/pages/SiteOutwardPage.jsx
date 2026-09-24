import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowUpRight, Send, Plus, Trash2 } from 'lucide-react';
import { COMPANY_LOGO_BASE64 } from '../services/logoConfig';
import ConfirmModal from '../components/ConfirmModal';

export default function PlantOutwardPage({ user }) {
  const [sitesList, setSitesList] = useState([]); // 🌟 પ્લાન્ટની જગ્યાએ સાઇટ્સ લિસ્ટ
  const [selectedSite, setSelectedSite] = useState(''); // selectedPlant ની જગ્યાએ selectedSite
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [dprDate, setDprDate] = useState(new Date().toISOString().split('T')[0]);
  const [parties, setParties] = useState([]);
  const [sites, setSites] = useState([]);
  const [products, setProducts] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [availableSpecs, setAvailableSpecs] = useState({});
  
  const [loading, setLoading] = useState(false);
  const [transporters, setTransporters] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [existingBills, setExistingBills] = useState([]);
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
    fetchSites();
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      fetchMasters(selectedSiteId);
    } else {
      setParties([]);
      setSites([]);
      setProducts([]);
    }
  }, [selectedSiteId]);

  // 🌟 ૧. સાઇટ્સ ફેચ કરવા માટેનું ફંક્શન
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

  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    message: ''
  });

  const triggerAlert = (msg) => {
    setAlertModal({
      isOpen: true,
      message: msg
    });
  };

  const fetchMasters = async (siteId) => {
    const { data: partData } = await supabase.from('site_outward_parties').select('*').or(`plant_id.eq.${siteId},plant_id.is.null`);
    setParties(partData || []);
    const { data: siteData } = await supabase.from('sites').select('*').or(`plant_id.eq.${siteId},plant_id.is.null`);
    setSites(siteData || []);
    const { data: prodData } = await supabase.from('plant_work_descriptions').select('*').or(`plant_id.eq.${siteId},plant_id.is.null`);
    setProducts(prodData || []);
    const { data: transData } = await supabase.from('site_transporters').select('*').or(`plant_id.eq.${siteId},plant_id.is.null`);
    setTransporters(transData || []);
    const { data: matData } = await supabase.from('site_materials_master').select('*').or(`plant_id.eq.${siteId},plant_id.is.null`);
    setMaterials(matData || []);
  };

  // 🌟 site_material_outward ટેબલમાંથી હિસ્ટ્રી લાવવી
  const fetchRecentHistory = async () => {
    if (!selectedSite) return;
    const { data } = await supabase
      .from('site_material_outward')
      .select('*')
      .eq('site_name', selectedSite)
      .order('created_at', { ascending: false })
      .limit(10);
    setRecentHistory(data || []);
  };

  useEffect(() => {
    if (selectedSite && typeof selectedSite === 'string') {
      fetchRecentHistory();
    }
  }, [selectedSite]);

  const handleEditClick = async (entry) => {
    setEditingId(entry.id);
    setDprDate(entry.date || dprDate);
    setSelectedSite(entry.site_name || selectedSite);
    
    let billsArray = [];
    if (entry.bill_url && entry.bill_url.trim() !== '' && entry.bill_url !== 'EMPTY') {
      billsArray = entry.bill_url.split(',').map(b => b.trim()).filter(b => b !== '');
    }
    setExistingBills(billsArray);

    let allMatchingEntries = [entry]; 
    
    if (entry.dc_number && entry.dc_number !== 'EMPTY') {
      const { data: matchedRows, error } = await supabase
        .from('site_material_outward')
        .select('*')
        .eq('site_name', entry.site_name)
        .eq('dc_number', entry.dc_number);

      if (!error && matchedRows && matchedRows.length > 0) {
        allMatchingEntries = matchedRows;
      }
    }

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
        // ૧. સૌથી પહેલા બ્રેકેટ (Bracket) માંથી Steel Spec અલગ કરો
        if (fullMatName.includes('(') && fullMatName.includes(')')) {
          const firstOpen = fullMatName.indexOf('(');
          const lastClose = fullMatName.lastIndexOf(')');
          
          extractedSteelSpec = fullMatName.substring(firstOpen + 1, lastClose).trim();
          fullMatName = fullMatName.substring(0, firstOpen).trim(); // બ્રેકેટ કાઢી નાખો
        }

        // ૨. હવે 'પહેલી' સ્પેસ (First Space) શોધો
        const firstSpaceIndex = fullMatName.indexOf(' ');
        
        if (firstSpaceIndex !== -1) {
          // પહેલી સ્પેસ પહેલાનો શબ્દ મટીરિયલ બનશે (દા.ત. "Column")
          extractedMaterial = fullMatName.substring(0, firstSpaceIndex).trim(); 
          
          // પહેલી સ્પેસ પછીનું બધું જ સાઈઝ ગણાશે (દા.ત. "8ft * 150mm" અથવા "300x300")
          extractedSize = fullMatName.substring(firstSpaceIndex + 1).trim();      
        } else {
          // જો નામમાં કોઈ સ્પેસ જ ન હોય
          extractedMaterial = fullMatName;
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

    setOutwardSources([
      {
        id: Date.now(),
        party: entry.party_name || '',
        site: entry.site_name || '',
        transporter: entry.transporter_name || '',
        vehicleNumber: entry.vehicle_no === 'EMPTY' ? '' : (entry.vehicle_no || ''),
        dcNumber: entry.dc_number === 'EMPTY' ? '' : (entry.dc_number || ''),
        description: entry.description || '',
        items: mappedItems,
        billFiles: []
      }
    ]);
  };

  // 🌟 સાઇટ બદલાય ત્યારે DC નંબર જનરેટ કરવો
  const handleSiteChange = async (e) => {
    const siteName = e.target.value;
    setSelectedSite(siteName);
    const foundSite = sitesList.find(s => (s.site_name || s.name) === siteName);
    const siteId = foundSite ? foundSite.id : '';
    setSelectedSiteId(siteId);

    if (siteName) {
      let nextNumber = 1001;
      try {
        const { data, error } = await supabase
          .from('site_material_outward')
          .select('dc_number')
          .eq('site_name', siteName)
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

      const sitePrefix = siteName.substring(0, 3).toUpperCase();
      const nextDcNumber = `DC-${sitePrefix}-${nextNumber}`;

      setOutwardSources(prev => prev.map(src => ({ ...src, dcNumber: nextDcNumber })));
    } else {
      setOutwardSources(prev => prev.map(src => ({ ...src, dcNumber: '' })));
    }
  };

  const handleDropdownClick = () => {
    if (!selectedSite) {
      triggerAlert("⚠️ કૃપા કરીને પહેલા ઉપરથી સાઇટ સિલેક્ટ કરો!");
      return false;
    }
    return true;
  };

  const fetchAvailableSteelSpecs = async (sIndex, iIndex, productName, productSize) => {
    if (!selectedSite || !productName || !productSize) return;
    try {
      const { data, error } = await supabase
        .from('site_material_stock_ledger')
        .select('*')
        .eq('site_name', selectedSite);

      if (error) throw error;
      if (data) {
        setAvailableSpecs(prev => ({ ...prev, [`${sIndex}-${iIndex}`]: [] }));
      }
    } catch (err) {
      console.error("Error fetching specs:", err);
    }
  };

  const fetchNextDcNumber = async (siteName) => {
    if (!siteName) return '';
    try {
      const { data, error } = await supabase
        .from('site_material_outward')
        .select('dc_number')
        .eq('site_name', siteName)
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

      const sitePrefix = siteName.substring(0, 3).toUpperCase();
      return `DC-${sitePrefix}-${nextNumber}`;
    } catch (err) {
      console.error("Error fetching next DC:", err);
      return `DC-${siteName.substring(0, 3).toUpperCase()}-1001`;
    }
  };

  const addOutwardSource = async () => {
    let nextDc = '';
    if (selectedSite) {
      nextDc = await fetchNextDcNumber(selectedSite);
      if (outwardSources.length > 0 && outwardSources[outwardSources.length - 1].dcNumber) {
        const lastDc = outwardSources[outwardSources.length - 1].dcNumber;
        const match = lastDc.match(/\d+$/);
        if (match) {
          const incremented = parseInt(match[0], 10) + 1;
          const sitePrefix = selectedSite.substring(0, 3).toUpperCase();
          nextDc = `DC-${sitePrefix}-${incremented}`;
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
    setDprDate(new Date().toISOString().split('T')[0]);

    let nextDc = '';
    if (selectedSite) {
      nextDc = await fetchNextDcNumber(selectedSite);
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

  const handleOpenPreview = (e) => {
    e.preventDefault();

    if (!selectedSite) {
      triggerAlert("⚠️ કૃપા કરીને પહેલા સાઇટ સિલેક્ટ કરો!");
      return;
    }

    for (let sIdx = 0; sIdx < outwardSources.length; sIdx++) {
      const src = outwardSources[sIdx];
      if (!src.party || src.party === 'OTHER_PARTY_MANUAL') {
        triggerAlert(`⚠️ Source #${sIdx + 1}: કૃપા કરીને Party / Client પસંદ કરો!`);
        return;
      }
      if (!src.site) {
        triggerAlert(`⚠️ Source #${sIdx + 1}: કૃપા કરીને Site પસંદ કરો!`);
        return;
      }

      const hasItem = src.items.some(it => it.material && Number(it.qty) > 0);
      if (!hasItem) {
        triggerAlert(`⚠️ Source #${sIdx + 1}: ઓછામાં ઓછી એક મટીરિયલ આઇટમ અને જથ્થો (Qty) દાખલ કરો!`);
        return;
      }
    }

    setShowPreview(true);
  };
  
  // 🌟 site_material_outward ટેબલમાં સેવ કરવા અને site_material_stock_ledger માં OUTWARD નાખવા માટેનું મુખ્ય ફંક્શન
  const handleSubmitOutward = async (e) => {
    setShowPreview(false);
    if (!selectedSite) {
      triggerAlert("કૃપા કરીને પહેલા સાઇટ સિલેક્ટ કરો!");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const currentLoggedUser = session?.user?.email || session?.user?.id || user?.email || user?.id || 'Supervisor';

    setLoading(true);
    try {
      let materialLedgerRows = []; 
      let rowsToInsert = [];

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
              site_name: selectedSite, // 🌟 પ્લાન્ટની જગ્યાએ સાઇટ
              party_name: source.party,
              site_name_delivery: source.site,
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
        triggerAlert("કૃપા કરીને ઓછામાં ઓછી એક મટીરિયલ આઇટમ અને જથ્થો ભરો!");
        setLoading(false);
        return;
      }

      if (editingId) {
        const currentDc = outwardSources[0]?.dcNumber;
        
        if (currentDc && currentDc !== 'EMPTY') {
          const { data: oldRows } = await supabase
            .from('site_material_outward')
            .select('id')
            .eq('site_name', selectedSite)
            .eq('dc_number', currentDc);

          if (oldRows && oldRows.length > 0) {
            const oldIds = oldRows.map(r => r.id);
            await supabase.from('site_material_stock_ledger').delete().in('reference_id', oldIds);
            await supabase.from('site_material_outward').delete().in('id', oldIds);
          }
        } else {
          await supabase.from('site_material_stock_ledger').delete().eq('reference_id', editingId);
          await supabase.from('site_material_outward').delete().eq('id', editingId);
        }
      }

      for (const obj of rowsToInsert) {
        const { data: insertedData, error: outErr } = await supabase
          .from('site_material_outward')
          .insert([obj.singleRowData])
          .select()
          .single();

        if (outErr) throw outErr;

        // 🌟 બધું જ મટીરિયલ site_material_stock_ledger માં OUTWARD તરીકે જમા થશે
        materialLedgerRows.push({
          date: dprDate,
          site_name: selectedSite,
          material_name: obj.singleRowData.material_name,
          unit: obj.unit || 'Nos',
          transaction_type: 'OUTWARD',
          qty: obj.qtyVal,
          reference_id: insertedData.id
        });
      }

      if (materialLedgerRows.length > 0) {
        const { error: matErr } = await supabase.from('site_material_stock_ledger').insert(materialLedgerRows);
        if (matErr) throw matErr;
      }

      const wasEditing = editingId !== null;
      setEditingId(null);
      
      if (wasEditing) {
        triggerAlert("✅ આઉટવર્ડ એન્ટ્રી સફળતાપૂર્વક અપડેટ થઈ ગઈ છે!");
      } else {
        triggerAlert("✅ મટીરિયલ આઉટવર્ડ સફળતાપૂર્વક સેવ થઈ ગયું છે!");
      }

      let nextDc = '';
      if (selectedSite) {
        nextDc = await fetchNextDcNumber(selectedSite);
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
      triggerAlert("એરર: " + err.message);
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
      triggerAlert("કૃપા કરીને પૉપ-અપ બ્લોકર બંધ કરો.");
      return;
    }

const itemsTableRows = itemsArray && itemsArray.length > 0 
      ? itemsArray.map((item, idx) => {
          // 🎯 સુધારો 1: category ફરજિયાત ડિફાઇન કરવી પડે
          let category = (item.item_type || item.category || '').toLowerCase();
          
          let rawMatName = item.material || item.material_name || '';
          
          // 🎯 સુધારો 2: અહીંયા '-' ની જગ્યાએ ખાલી '' (બ્લેન્ક) રાખવું
          let rawSize = item.size || ''; 

          if (category.includes('finish') || category.includes('product')) {
            
            // ૧. સૌથી પહેલા કૌંસ (Steel Spec) હોય તો તેને કાઢી નાખો
            if (rawMatName.includes('(') && rawMatName.includes(')')) {
              const firstOpen = rawMatName.indexOf('(');
              rawMatName = rawMatName.substring(0, firstOpen).trim(); 
            }

            // ૨. હવે આપણું ફાઇનલ લોજિક: 'પહેલી સ્પેસ' થી છૂટું પાડો
            if (!rawSize && rawMatName.includes(' ')) {
              const firstSpaceIndex = rawMatName.indexOf(' ');
              
              if (firstSpaceIndex !== -1) {
                rawSize = rawMatName.substring(firstSpaceIndex + 1).trim(); // પહેલી સ્પેસ પછીનું બધું સાઈઝ
                rawMatName = rawMatName.substring(0, firstSpaceIndex).trim(); // પહેલી સ્પેસ પહેલાનું મટીરિયલ
              }
            }

          }
          
          // 🎯 સુધારો 3: જો બધું પત્યા પછી પણ સાઈઝ ખાલી રહે, તો છેલ્લે '-' મૂકી દો
          if (!rawSize) {
            rawSize = '-';
          }

          const qVal = item.qty || item.quantity || '';
          const uVal = item.unit || 'Nos';

          return `
            <tr>
              <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 12px;">${idx + 1}</td>
              <td style="border: 1px solid #000; padding: 6px; font-size: 12px; font-weight: 600; word-break: break-all;">${rawMatName}</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 12px;">${rawSize}</td>
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
            .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 450px; opacity: 0.08; z-index: 0; pointer-events: none; }
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
            .generated-by { position: absolute; bottom: 10px; right: 15px; font-size: 9px; color: #64748b; font-style: italic; }
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
                <div class="capabilities-desc">Precast Manufacturing & Erection | Boundary & Compound Wall Solutions | Fabrication and PEB Work | Oil-Gas & Siphon Pipe Lines | Solar & Electrical | Sign Board & Demarcation</div>
              </div>
              <div class="contact-box">
                <p>Mr. Tarun Patel</p>
                <p style="color: #334155;">Mo.: +91 8238598234 / 9898664655</p>
              </div>
              <div class="title-box">Delivery Challan</div>

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
            <div class="generated-by">Generated by: ${submittedUser || 'System User'}</div>
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
      
      {/* Header */}
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
            Site Material Outward Entry
          </h3>
          <span style={{ fontSize: '11px', color: '#c2410c', fontWeight: '600' }}>
            Manage outgoing stock and dispatches efficiently
          </span>
        </div>
      </div>

      <form onSubmit={handleOpenPreview} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* 🌟 Select Site Card (Choose Site) */}
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

        {/* MATERIAL OUTWARD SECTION */}
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
              const selectedPartyName = (source.party || '').trim();
              const allSitesList = (typeof sites !== 'undefined' ? sites : []);
              
              const partySites = allSitesList.filter(s => {
                const dbParty = (s.party_name || s.party || '').trim();
                return dbParty.toLowerCase() === selectedPartyName.toLowerCase();
              });

              return (
                <div key={source.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: sIndex < outwardSources.length - 1 ? '2px solid #cbd5e1' : 'none', paddingBottom: sIndex < outwardSources.length - 1 ? '16px' : '0' }}>
                  
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
                        value={source.party} 
                        onClick={handleDropdownClick}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'OTHER_PARTY_MANUAL') {
                            updateOutwardSource(sIndex, 'party', 'OTHER_PARTY_MANUAL');
                          } else {
                            updateOutwardSource(sIndex, 'party', val);
                          }
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

                      {/* જો Other સિલેક્ટ કરે અથવા લિસ્ટમાં ન હોય તો ટેક્સ્ટ બોક્સ ચાલુ રહે */}
                      {(source.party === 'OTHER_PARTY_MANUAL' || (source.party && !parties.some(p => (typeof p === 'string' ? p : (p.party_name || p.name)) === source.party))) && (
                        <input 
                          type="text" 
                          placeholder="Type custom party name..." 
                          value={source.party === 'OTHER_PARTY_MANUAL' ? '' : source.party} 
                          onChange={(e) => {
                            const val = e.target.value;
                            updateOutwardSource(sIndex, 'party', val);
                          }} 
                          autoFocus
                          style={{ width: '100%', marginTop: '5px', padding: '7px', borderRadius: '6px', border: '1px solid #2563eb', fontSize: '11px', backgroundColor: '#eff6ff', boxSizing: 'border-box' }} 
                        />
                      )}
                    </div>

                    {/* 2. Site Dropdown / Manual Input */}
                    <div style={{ flex: 1 }}>
                      {source.party === 'OTHER_PARTY_MANUAL' || (source.party && !parties.some(p => (typeof p === 'string' ? p : (p.party_name || p.name)) === source.party)) ? (
                        /* જો પાર્ટી મેન્યુઅલ ટાઈપ કરેલી હોય તો સાઈટ પણ મેન્યુઅલ ટાઈપ કરવાનું બોક્સ ચાલુ રહેશે */
                        <input 
                          type="text" 
                          placeholder="Type site name manually..." 
                          value={source.site} 
                          onChange={(e) => updateOutwardSource(sIndex, 'site', e.target.value)} 
                          style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #2563eb', fontSize: '11px', backgroundColor: '#eff6ff', boxSizing: 'border-box' }} 
                        />
                      ) : (
                        /* જો લિસ્ટમાંથી પાર્ટી સિલેક્ટ કરી હોય તો તેની સાઈટોનું ડ્રોપડાઉન દેખાશે */
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {source.items.map((item, iIndex) => {
                      const currentCategory = item.category || 'Finished Product';
                      const isFinishedProduct = currentCategory === 'Finished Product';
                      
                      const filteredMaterials = materials.filter(m => {
                        if (!m.item_type) return true;
                        return m.item_type.toLowerCase().trim() === currentCategory.toLowerCase().trim() ||
                               m.item_type.toLowerCase().includes(currentCategory.toLowerCase().split(' ')[0]);
                      });

                      const uniqueProductNames = [...new Set(products.map(p => p.name))];

                      const isMaterialInList = isFinishedProduct 
                        ? Array.from(new Map(products.map(p => [p.name ? p.name.trim().toLowerCase() : '', p.name ? p.name.trim() : ''])).values())
                            .map(n => n.trim().toLowerCase())
                            .includes((item.material || '').trim().toLowerCase())
                        : filteredMaterials.some(m => m.name && m.name.trim().toLowerCase() === (item.material || '').trim().toLowerCase());

                      const isCustomItem = item.material === 'OTHER_MANUAL' || (item.material && !isFinishedProduct && !filteredMaterials.some(m => m.name.trim().toLowerCase() === item.material.trim().toLowerCase())) || (item.material && isFinishedProduct && !uniqueProductNames.map(n => n.trim().toLowerCase()).includes(item.material.trim().toLowerCase()));

                      const isPanel = isFinishedProduct && !isCustomItem && item.material && item.material.toLowerCase().includes('panel');
                      const isColumn = isFinishedProduct && !isCustomItem && item.material && item.material.toLowerCase().includes('column');

                      return (
                        <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: '#fff', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                          
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
                              <option value="Asset">5. Asset</option>
                            </select>

                            {source.items.length > 1 && (
                              <button type="button" onClick={() => removeOutwardItem(sIndex, iIndex)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}>
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>

                          {(() => {
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
                                      filteredMaterials.map(m => <option key={`m-${m.id}`} value={m.name}>{m.name}</option>)
                                    )}
                                    <option value="OTHER_MANUAL" style={{ fontWeight: 'bold', color: '#2563eb' }}>➕ Other...</option>
                                  </select>

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
                                        onChange={(e) => {
                                          const newSize = e.target.value;
                                          updateOutwardItem(sIndex, iIndex, 'size', newSize);
                                          updateOutwardItem(sIndex, iIndex, 'steelSpec', '');
                                          
                                          const isColOrPan = (item.material || '').toLowerCase().includes('column') || 
                                                             (item.material || '').toLowerCase().includes('panel');
                                          if (isColOrPan && newSize) {
                                            fetchAvailableSteelSpecs(sIndex, iIndex, item.material, newSize);
                                          }
                                        }} 
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
                                  
                                  <input 
                                    type="number" 
                                    placeholder="Qty" 
                                    value={item.qty} 
                                    onChange={(e) => updateOutwardItem(sIndex, iIndex, 'qty', e.target.value)} 
                                    style={{ flex: '0.7', minWidth: '0', padding: '7px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', textAlign: 'center', boxSizing: 'border-box' }} 
                                  />
                                  
                                  <select 
                                    value={item.unit} 
                                    onChange={(e) => updateOutwardItem(sIndex, iIndex, 'unit', e.target.value)} 
                                    style={{ flex: '0.8', minWidth: '0', padding: '7px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}
                                  >
                                    <option value="Nos">Nos</option>
                                    <option value="Ltr">Ltr</option>
                                    <option value="Bags">Bags</option>
                                    <option value="Kg">Kg</option>
                                  </select>
                                </div>

                                {isCustomItem && (
                                  <input 
                                    type="text" 
                                    placeholder={isFinishedProduct ? "Type custom product name here..." : "Type custom material name here..."}
                                    value={item.material === 'OTHER_MANUAL' ? '' : item.material} 
                                    onChange={(e) => updateOutwardItem(sIndex, iIndex, 'material', e.target.value)} 
                                    autoFocus
                                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '8px', border: '1px solid #2563eb', fontSize: '12px', backgroundColor: '#eff6ff', boxSizing: 'border-box' }} 
                                  />
                                )}
                              </div>
                            );
                          })()}

                          {isColumn && (
                            <div style={{ backgroundColor: '#f8fafc', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#334155' }}>🛠️ Column Spec:</span>
                              <select 
                                value={item.steelSpec || ''} 
                                onChange={(e) => updateOutwardItem(sIndex, iIndex, 'steelSpec', e.target.value)} 
                                style={{ flex: 1, padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff' }}
                              >
                                <option value="">-- Select Steel Spec --</option>
                                <option value="3mm - 4 wires">3mm - 4 wires</option>
                                <option value="3mm - 5 wires">3mm - 5 wires</option>
                                <option value="4mm - 4 wires">4mm - 4 wires</option>
                                <option value="4mm - 5 wires">4mm - 5 wires</option>
                              </select>
                            </div>
                          )}

                          {isPanel && (
                            <div style={{ backgroundColor: '#f8fafc', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#334155' }}>🛠️ Panel Spec:</span>
                              <select 
                                value={item.steelSpec || ''} 
                                onChange={(e) => updateOutwardItem(sIndex, iIndex, 'steelSpec', e.target.value)} 
                                style={{ flex: 1, padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff' }}
                              >
                                <option value="">-- Select Panel Steel Spec --</option>
                                <option value="3mm - 3 wires">3mm - 3 wires</option>
                                <option value="3mm - 4 wires">3mm - 4 wires</option>
                                <option value="4mm - 3 wires">4mm - 3 wires</option>
                                <option value="4mm - 4 wires">4mm - 4 wires</option>
                              </select>
                            </div>
                          )}

                        </div>
                      );
                    })}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', marginBottom: '8px' }}>
                      <button 
                        type="button" 
                        onClick={() => addOutwardItem(sIndex)} 
                        style={{ backgroundColor: 'transparent', color: '#c2410c', border: '1px dashed #ea580c', padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Plus size={13} /> Add Item
                      </button>
                    </div>
                  </div>

                  {(() => {
                    const isCustomTransporter = source.transporter === 'OTHER_TRANSPORTER_MANUAL' || (source.transporter && !transporters.some(t => t.transporter_name === source.transporter));

                    return (
                      <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <select 
                              value={isCustomTransporter ? 'OTHER_TRANSPORTER_MANUAL' : (source.transporter || '')} 
                              onClick={handleDropdownClick}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'OTHER_TRANSPORTER_MANUAL') {
                                  updateOutwardSource(sIndex, 'transporter', 'OTHER_TRANSPORTER_MANUAL');
                                  updateOutwardSource(sIndex, 'vehicleNumber', ''); 
                                  updateOutwardSource(sIndex, 'isCustomVehicle', false);
                                } else {
                                  updateOutwardSource(sIndex, 'transporter', val);
                                  updateOutwardSource(sIndex, 'vehicleNumber', ''); 
                                  updateOutwardSource(sIndex, 'isCustomVehicle', false);
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

                          <div style={{ flex: 1 }}>
                            {isCustomTransporter || source.isCustomVehicle ? (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <input 
                                  type="text" 
                                  placeholder="Type vehicle number manually..." 
                                  value={source.vehicleNumber || ''} 
                                  onChange={(e) => updateOutwardSource(sIndex, 'vehicleNumber', e.target.value)} 
                                  autoFocus
                                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #2563eb', fontSize: '12px', backgroundColor: '#eff6ff', boxSizing: 'border-box' }} 
                                />
                                {!isCustomTransporter && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateOutwardSource(sIndex, 'isCustomVehicle', false);
                                      updateOutwardSource(sIndex, 'vehicleNumber', '');
                                    }}
                                    title="Back to dropdown"
                                    style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: '6px', padding: '0 8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                  >
                                    ↩
                                  </button>
                                )}
                              </div>
                            ) : (
                              <select 
                                value={source.vehicleNumber || ''} 
                                onClick={handleDropdownClick}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === 'OTHER_VEHICLE_MANUAL') {
                                    updateOutwardSource(sIndex, 'isCustomVehicle', true);
                                    updateOutwardSource(sIndex, 'vehicleNumber', '');
                                  } else {
                                    updateOutwardSource(sIndex, 'isCustomVehicle', false);
                                    updateOutwardSource(sIndex, 'vehicleNumber', val);
                                  }
                                }} 
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
                                <option value="OTHER_VEHICLE_MANUAL" style={{ fontWeight: 'bold', color: '#2563eb' }}>➕ Other (Type Manually...)</option>
                              </select>
                            )}
                          </div>
                        </div>

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

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
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
                        const { data: matchedRows } = await supabase
                          .from('site_material_outward')
                          .select('id')
                          .eq('site_name', selectedSite)
                          .eq('dc_number', currentDc);

                        if (matchedRows && matchedRows.length > 0) {
                          const idsToDelete = matchedRows.map(r => r.id);
                          await supabase.from('site_material_stock_ledger').delete().in('reference_id', idsToDelete);
                          await supabase.from('site_material_outward').delete().in('id', idsToDelete);
                        }
                      } else {
                        await supabase.from('site_material_stock_ledger').delete().eq('reference_id', editingId);
                        await supabase.from('site_material_outward').delete().eq('id', editingId);
                      }

                      triggerAlert("✅ આઉટવર્ડ એન્ટ્રી સફળતાપૂર્વક ડિલીટ થઈ ગઈ છે!");
                      handleCancelEdit();
                      fetchRecentHistory();
                    } catch (err) {
                      triggerAlert("એરર: " + err.message);
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

      {/* Preview Modal */}
      {showPreview && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '16px', boxSizing: 'border-box' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '560px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', overflow: 'hidden' }}>
            
            <div style={{ backgroundColor: '#fff7ed', padding: '14px 18px', borderBottom: '1px solid #fed7aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#9a3412' }}>📋 Outward Entry Preview</h3>
                <span style={{ fontSize: '11px', color: '#c2410c' }}>સબમિટ કરતાં પહેલાં આઉટવર્ડ વિગતો ચકાસી લો</span>
              </div>
              <button type="button" onClick={() => setShowPreview(false)} style={{ background: 'none', border: 'none', fontSize: '18px', fontWeight: 'bold', color: '#9a3412', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '10px', fontSize: '12px', border: '1px solid #e2e8f0' }}>
                <div><strong>સાઇટ:</strong> {selectedSite}</div>
                <div><strong>તારીખ:</strong> {dprDate}</div>
              </div>

              {outwardSources.map((src) => (
                <div key={src.id} style={{ border: '1px solid #fed7aa', borderRadius: '10px', padding: '12px', backgroundColor: '#fffaf5', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #fed7aa', paddingBottom: '6px', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 'bold', color: '#ea580c' }}>📄 {src.dcNumber || 'No DC'}</span>
                    <span style={{ fontSize: '11px', color: '#475569' }}>Vehicle: <strong>{src.vehicleNumber || '-'}</strong></span>
                  </div>

                  <div style={{ color: '#334155', marginBottom: '8px', fontSize: '11.5px', lineHeight: '1.5' }}>
                    <div><strong>પાર્ટી:</strong> {src.party}</div>
                    <div><strong>સાઇટ:</strong> {src.site}</div>
                  </div>

                  <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #fed7aa', padding: '8px' }}>
                    <div style={{ fontWeight: '700', fontSize: '11px', color: '#9a3412', marginBottom: '4px' }}>જતાં માલની વિગત (Dispatched Items):</div>
                    {src.items.filter(it => it.material && it.qty).map((it, iIdx) => (
                      <div key={iIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: iIdx < src.items.length - 1 ? '1px dashed #f1f5f9' : 'none', padding: '4px 0', fontSize: '11px' }}>
                        <div>
                          <span style={{ fontWeight: '600', color: '#0f172a' }}>{it.material}</span>
                          {it.size ? ` - ${it.size}` : ''}
                          {it.steelSpec ? ` (${it.steelSpec})` : ''}
                        </div>
                        <div style={{ fontWeight: 'bold', color: '#ea580c', whiteSpace: 'nowrap' }}>{it.qty} {it.unit || 'Nos'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: '12px 16px', backgroundColor: '#fff7ed', borderTop: '1px solid #fed7aa', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowPreview(false)} style={{ padding: '8px 16px', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>✏️ સુધારો કરવો છે (Edit)</button>
              <button type="button" onClick={handleSubmitOutward} disabled={loading} style={{ padding: '8px 18px', backgroundColor: '#ea580c', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>{loading ? 'સેવ થાય છે...' : '✅ બરાબર છે, સબમિટ કરો'}</button>
            </div>

          </div>
        </div>
      )}

      <ConfirmModal isOpen={alertModal.isOpen} message={alertModal.message} onConfirm={() => setAlertModal({ isOpen: false, message: '' })} onCancel={() => setAlertModal({ isOpen: false, message: '' })} />

      {/* Recent History */}
      {recentHistory.length > 0 && (() => {
        const groupedHistoryMap = {};
        recentHistory.forEach((item) => {
          const dcKey = (item.dc_number && item.dc_number !== 'EMPTY') ? item.dc_number : `single-${item.id}`;
          if (!groupedHistoryMap[dcKey]) {
            groupedHistoryMap[dcKey] = {
              ...item,
              combinedMaterials: [`${item.material_name} (${item.quantity} ${item.unit})`]
            };
          } else {
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
                let displayDate = item.date || '';
                return (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div>
                      <span style={{ fontWeight: 'bold', color: '#c2410c' }}>
                        {item.combinedMaterials.join(', ')}
                      </span> 
                      - <span style={{ color: '#64748b' }}>{item.party_name} ({item.site_name_delivery || item.site_name})</span>
                      <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                        DC: {item.dc_number || 'EMPTY'} | Date: {displayDate}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button type="button" onClick={() => handleEditClick(item)} style={{ fontSize: '11px', fontWeight: 'bold', color: '#1d4ed8', backgroundColor: '#eff6ff', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #bfdbfe' }}>
                        {editingId === item.id ? 'Editing...' : 'Edit'}
                      </button>
                      <button type="button" onClick={() => handlePrintDC(item.dc_number, item.party_name, item.site_name_delivery || item.site_name, [item], item.vehicle_no, item.transporter_name, displayDate, item.submitted_by)} style={{ fontSize: '11px', fontWeight: 'bold', color: '#ea580c', backgroundColor: '#fff7ed', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #fed7aa' }}>
                        🖨️ Print DC
                      </button>
                    </div>
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