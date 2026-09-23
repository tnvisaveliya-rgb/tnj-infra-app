import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowDownRight, Send, Plus, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal'; 

export default function SiteMaterialInward({ user }) {
  const [searchParams] = useSearchParams();
  const approveIdFromRouter = searchParams.get('approve_id');
  
  // 🌟 Plant ની જગ્યાએ Sites
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  
  const [dprDate, setDprDate] = useState(new Date().toISOString().split('T')[0]);
  const [suppliers, setSuppliers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✏️ Edit Mode State
  const [editingId, setEditingId] = useState(null);
  const [existingBills, setExistingBills] = useState([]);

  // 🌟 ૧. સાઇટ્સ ફેચ કરવા માટે (ડેટાબેઝમાં sites ટેબલમાંથી)
  const fetchSites = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = user?.email || session?.user?.email || localStorage.getItem('userEmail') || '';
      const userId = user?.id || session?.user?.id;
      
      if (userEmail === 'infra.tnj@gmail.com') {
        const { data } = await supabase.from('sites').select('*');
        setSites(data || []);
        return;
      }

      let permQuery = supabase.from('user_permissions').select('assigned_sites');
      if (userId) {
        permQuery = permQuery.eq('user_id', userId);
      } else {
        permQuery = permQuery.eq('user_id', userEmail);
      }

      const { data: permData, error: permError } = await permQuery.single();

      if (permError || !permData || !permData.assigned_sites || permData.assigned_sites.length === 0) {
        setSites([]); 
        return;
      }

      const assignedSitesNames = permData.assigned_sites;
      const { data: allowedSitesData } = await supabase
        .from('sites')
        .select('*')
        .in('site_name', assignedSitesNames);

      setSites(allowedSitesData || []);

    } catch (err) {
      console.error('Error fetching sites:', err);
      setSites([]);
    }
  };

  const handleEditClick = (entry) => {
    setEditingId(entry.id);
    setDprDate(entry.date || dprDate);
    setSelectedSite(entry.site_name || selectedSite);
    
    let billsArray = [];
    if (entry.bill_url && entry.bill_url.trim() !== '' && entry.bill_url !== 'EMPTY') {
      billsArray = entry.bill_url.split(',').map(b => b.trim()).filter(b => b !== '');
    }
    setExistingBills(billsArray);

    let fullMatName = entry.material_name || '';
    let extractedMaterial = fullMatName;
    let extractedSize = '';
    let extractedSteelSpec = '';

    const itemCategory = entry.item_type || 'Raw Material';

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
            category: itemCategory,
            steelSpec: extractedSteelSpec 
          }
        ],
        billFiles: []
      }
    ]);
  };

const handleEditClickWithTimeCheck = (entry) => {
    // 🎯 ૧. સૌથી પહેલાં ડેટાબેઝનું is_locked ચેક કરો
    if (entry.is_locked === true) {
      handleRequestEditAfter24Hours(entry);
      return;
    }

    const entryTime = new Date(entry.created_at || entry.date).getTime();
    const currentTime = new Date().getTime();
    const hoursDifference = (currentTime - entryTime) / (1000 * 60 * 60);

    if (hoursDifference > 24) {
      handleRequestEditAfter24Hours(entry);
    } else {
      handleEditClick(entry);
    }
  };

  const [inwardSources, setInwardSources] = useState([
    {
      id: 1,
      supplier: '',
      dcNumber: '',
      vehicleNumber: '',
      items: [{ id: 1, material: '', size: '', qty: '', unit: 'Nos', category: 'Finished Product', steelSpec: '' }],
      billFiles: []
    }
  ]);

  const [showPreview, setShowPreview] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });

  const triggerAlert = (msg) => {
    setAlertModal({ isOpen: true, message: msg });
  };

  useEffect(() => {
    fetchSites();
  }, []);

 // 🌟 સાઇટ સિલેક્ટ થાય એટલે તરત જ માસ્ટર ડેટા ફેચ કરવા માટે
  useEffect(() => {
    if (selectedSite) {
      fetchMasters(selectedSite);
      fetchRecentHistory();
    } else {
      setSuppliers([]);
      setMaterials([]);
      setProducts([]);
    }
  }, [selectedSite]);


  
  const [recentHistory, setRecentHistory] = useState([]);

  useEffect(() => {
    if (selectedSite) {
      fetchRecentHistory();
    }
  }, [selectedSite]);

  const fetchRecentHistory = async () => {
    const { data } = await supabase
      .from('site_material_inward') // 🌟 નવું ટેબલ
      .select('*')
      .eq('site_name', selectedSite) // 🌟 સાઇટ મુજબ
      .order('created_at', { ascending: false })
      .limit(10);
    setRecentHistory(data || []);
  };
const fetchMasters = async (siteName) => {
    if (!siteName) {
      setSuppliers([]); setMaterials([]); setProducts([]);
      return;
    }

    try {
      const { data: outwardData, error } = await supabase
        .from('plant_material_outward')
        .select('*')
        .ilike('site_name', `%${siteName.trim()}%`);

      if (error) {
        console.error('Error fetching outward data:', error);
        return;
      }

      if (outwardData && outwardData.length > 0) {
        // ૧. સપ્લાયર / વેન્ડર 
        const outwardSuppliers = outwardData
          .filter(o => o.plant_name && o.plant_name.trim() !== '')
          .map(o => ({
            id: `out_sup_${Math.random()}`,
            name: o.plant_name.trim(),
            site_name: siteName
          })).filter((v, i, arr) => arr.findIndex(t => t.name === v.name) === i);

        // ૨. મટીરિયલ (નામ અને સાઇઝ છૂટા પાડવાનું લોજીક)
        const parsedMaterials = [];
        
        outwardData.forEach(o => {
          if (o.material_name && o.material_name.trim() !== '') {
            const rawName = o.material_name.trim();
            const itemType = o.item_type ? o.item_type.trim() : 'Finished Product';
            
            let parsedName = rawName;
            let parsedSize = '';
            
            if (itemType === 'Finished Product') {
              // ૧. કૌંસ (...) અને તેમાં લખેલી Steel details કાઢી નાખો
              const noBrackets = rawName.replace(/\s*\(.*?\)\s*/g, '').trim();
              
              // ૨. સ્પેસથી છૂટું પાડો 
              const parts = noBrackets.split(' ');
              const lastPart = parts[parts.length - 1];
              
              // ૩. જો છેલ્લા ભાગમાં કોઈ નંબર હોય (દા.ત. 7, 2950x150, 3m), તો તેને સાઇઝ માનો
              if (/\d/.test(lastPart) && parts.length > 1) {
                parsedSize = lastPart;
                parsedName = parts.slice(0, -1).join(' '); // સાઇઝ સિવાયનું બધું જ નામ ગણાશે
              } else {
                parsedName = noBrackets;
              }
            }
            
            parsedMaterials.push({
              id: `out_mat_${Math.random()}`,
              name: parsedName,
              product_size: parsedSize, // 🌟 સાઇઝ અલગ સેવ થશે એટલે સાઇઝના બોક્સમાં દેખાશે
              item_type: itemType,
              site_name: siteName
            });
          }
        });

        // ડુપ્લિકેટ કાઢવા (મટીરિયલનું નામ અને સાઇઝ બંને સરખા હોય તેને જ ડુપ્લિકેટ ગણશે)
        const uniqueMaterials = parsedMaterials.filter((v, i, arr) => 
          arr.findIndex(t => t.name === v.name && t.product_size === v.product_size) === i
        );

        setSuppliers(outwardSuppliers);
        setMaterials(uniqueMaterials);
        setProducts(uniqueMaterials); 
      } else {
        setSuppliers([]); setMaterials([]); setProducts([]);
      }
    } catch (err) {
      console.error('Error in fetchMasters:', err);
      setSuppliers([]); setMaterials([]); setProducts([]);
    }
  };
const handleSiteChange = (e) => {
    const siteName = e.target.value;
    setSelectedSite(siteName);
    const foundSite = sites.find(s => (s.site_name || s.plant_name || s.name) === siteName);
    const siteId = foundSite ? foundSite.id : '';
    setSelectedSiteId(siteId);
    
    // 🌟 અહીં siteId ની જગ્યાએ સીધું siteName પાસ કરો
    if (siteName) {
      fetchMasters(siteName);
    } else {
      setSuppliers([]);
      setMaterials([]);
      setProducts([]);
    }
  };
  const handleDropdownClick = () => {
    if (!selectedSite) {
      triggerAlert("⚠️ કૃપા કરીને પહેલા ઉપરથી સાઇટ સિલેક્ટ કરો!");
      return false;
    }
    return true;
  };

  const addInwardSource = () => setInwardSources([...inwardSources, { id: Date.now(), supplier: '', dcNumber: '', vehicleNumber: '', items: [{ id: Date.now(), material: '', qty: '', unit: 'Bags', category: 'Finished Product', steelSpec: '' }], billFiles: [] }]);
  const updateInwardSource = (sIdx, field, val) => { const updated = [...inwardSources]; updated[sIdx][field] = val; setInwardSources(updated); };
  const addInwardItem = (sIdx) => { const updated = [...inwardSources]; updated[sIdx].items.push({ id: Date.now(), material: '', qty: '', unit: 'Bags', category: 'Finished Product', steelSpec: '' }); setInwardSources(updated); };
  const updateInwardItem = (sIdx, iIdx, field, val) => { const updated = [...inwardSources]; updated[sIdx].items[iIdx][field] = val; setInwardSources(updated); };
  const removeInwardSource = (index) => setInwardSources(inwardSources.filter((_, i) => i !== index));
  const removeInwardItem = (sIdx, iIdx) => {
    const updated = [...inwardSources];
    updated[sIdx].items = updated[sIdx].items.filter((_, i) => i !== iIdx);
    setInwardSources(updated);
  };

  const handleOpenPreview = async (e) => {
    e.preventDefault();
    if (!selectedSite) {
      triggerAlert("કૃપા કરીને પહેલા સાઇટ સિલેક્ટ કરો!");
      return;
    }

    for (let sIdx = 0; sIdx < inwardSources.length; sIdx++) {
      const src = inwardSources[sIdx];
      const hasAnyData = src.supplier || src.dcNumber || src.vehicleNumber || src.items.some(i => i.material || i.qty);
      if (hasAnyData) {
        if (!src.supplier) {
          triggerAlert(`⚠️ Inward Source #${sIdx + 1}: કૃપા કરીને સપ્લાયર સિલેક્ટ કરો!`);
          return;
        }
        for (let iIdx = 0; iIdx < src.items.length; iIdx++) {
          const item = src.items[iIdx];
          if (!item.material || !item.qty) {
            triggerAlert(`⚠️ Inward Source #${sIdx + 1} (Item #${iIdx + 1}): મટીરિયલ અને Qty બંને ભરવા ફરજિયાત છે!`);
            return;
          }

          const cleanDc = src.dcNumber ? src.dcNumber.trim() : '';
          // 🌟 ૩. ડુપ્લિકેટ ચેક (site_material_inward ટેબલ માટે)
          if (cleanDc !== '' && cleanDc.toLowerCase() !== 'empty') {
            const { data: existingDc } = await supabase
              .from('site_material_inward')
              .select('id')
              .eq('site_name', selectedSite)
              .eq('dc_number', cleanDc)
              .neq('id', editingId || 0)
              .maybeSingle();

            if (existingDc) {
              triggerAlert(`❌ ડુપ્લિકેટ એન્ટ્રી અટકાવાઈ: Inward DC Number "${cleanDc}" આ સાઇટમાં પહેલેથી જ મોજૂદ છે!`);
              return;
            }
          } else {
            const { data: existingMat } = await supabase
              .from('site_material_inward')
              .select('id')
              .eq('site_name', selectedSite)
              .eq('date', dprDate)
              .eq('material_name', item.material)
              .neq('id', editingId || 0)
              .maybeSingle();

            if (existingMat) {
              triggerAlert(`❌ ડુપ્લિકેટ એન્ટ્રી અટકાવાઈ: તારીખ ${dprDate} પર આ સાઇટમાં "${item.material}" ની એન્ટ્રી પહેલેથી જ થયેલ છે!`);
              return;
            }
          }
        }
      }
    }
    setShowPreview(true);
  };

  const handleSubmitInward = async () => {
    setShowPreview(false);

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
            
            // 🌟 ૧. સિક્યોર ફાઇલનામ સાથે સાઇટ બકેટમાં અપલોડ
            const fileName = `${safeSupplier}_${safeDate}_${safeMaterial}_${uniqueSuffix}.${fileExt}`;
            const filePath = `site_inward_material/${fileName}`;
     
            const { error: uploadErr } = await supabase.storage
              .from('Plant') // બકેટનું નામ Plant અથવા site_bucket હોય તો અહીં બદલી શકાય
              .upload(filePath, file);
     
            if (uploadErr) {
              console.error("Upload Error Details:", uploadErr);
              triggerAlert("Bill Upload Error: " + uploadErr.message);
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

            const materialNameToSave = categoryStr.toLowerCase() === 'finished product' ? fullMaterialNameToSave : item.material;

            let inData;

            // 🌟 ૨. site_material_inward ટેબલમાં ઇન્સર્ટ કે અપડેટ
            if (editingId) {
              const { data: updatedData, error: updateErr } = await supabase
                .from('site_material_inward')
                .update({
                  date: dprDate,
                  site_name: selectedSite,
                  supplier_name: source.supplier,
                  dc_number: source.dcNumber && source.dcNumber.trim() !== '' ? source.dcNumber.trim() : 'EMPTY',
                  vehicle_no: source.vehicleNumber && source.vehicleNumber.trim() !== '' ? source.vehicleNumber.trim() : 'EMPTY',
                  material_name: materialNameToSave,
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
                .from('site_material_inward')
                .insert([{
                  date: dprDate,
                  site_name: selectedSite,
                  supplier_name: source.supplier,
                  dc_number: source.dcNumber && source.dcNumber.trim() !== '' ? source.dcNumber.trim() : 'EMPTY',
                  vehicle_no: source.vehicleNumber && source.vehicleNumber.trim() !== '' ? source.vehicleNumber.trim() : 'EMPTY',
                  material_name: materialNameToSave,
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

           // 🌟 ગમે તે કેટેગરી હોય (Raw Material કે Finished Product), સાઇટ માટે બધું જ એક જ ફોર્મેટમાં જમા થશે
            materialLedgerRows.push({
              date: dprDate,
              site_name: selectedSite,
              material_name: materialNameToSave, // પૂરેપૂરું નામ અને સાઈઝ સાથે
              unit: item.unit || 'Nos',
              transaction_type: 'INWARD',
              qty: qtyVal,
              reference_id: inData.id
            });
            }
          }
        
      }

    if (editingId) {
        await supabase.from('site_material_stock_ledger').delete().eq('reference_id', editingId);
      }

      // 🌟 બધા જ પ્રકારના મટીરિયલ્સ (ચહે તે Raw હોય કે Finished Product) એક જ ટેબલમાં જમા થશે
      const combinedLedgerRows = [...materialLedgerRows, ...stockLedgerRows];
      if (combinedLedgerRows.length > 0) {
        const { error: ledErr } = await supabase.from('site_material_stock_ledger').insert(combinedLedgerRows);
        if (ledErr) throw ledErr;
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
        triggerAlert("✅ મટીરિયલ ઇનવર્ડ સફળતાપૂર્વક અપડેટ થઈ ગયું છે!");
      } else {
        triggerAlert("✅ મટીરિયલ ઇનવર્ડ સફળતાપૂર્વક સેવ થઈ ગયું છે!");
      }
    } catch (err) {
      triggerAlert("એરર: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setExistingBills([]);
    setInwardSources([
      {
        id: Date.now(),
        supplier: '',
        dcNumber: '',
        vehicleNumber: '',
        description: '',
        items: [{ id: Date.now(), material: '', qty: '', unit: 'Nos', category: 'Finished Product', steelSpec: '' }],
        billFiles: []
      }
    ]);
  };

  const handleDeleteExistingBill = async (billUrlToRemove) => {
    try {
      const urlObj = new URL(billUrlToRemove);
      const pathMatch = urlObj.pathname.split('/public/Plant/')[1] || urlObj.pathname.split('/Plant/')[1];

      if (pathMatch) {
        const { error } = await supabase.storage
          .from('Plant')
          .remove([decodeURIComponent(pathMatch)]);
          
        if (error) {
          console.error("Storage delete error:", error.message);
        }
      }

      const updatedBills = existingBills.filter(url => url !== billUrlToRemove);
      setExistingBills(updatedBills);

    } catch (err) {
      console.error("Error deleting file from bucket:", err);
    }
  };

const handleAutoUnlockEntry = async (entryId) => {
    const { data, error } = await supabase
      .from('site_material_inward')
      .update({ 
        is_locked: false, 
        edit_requested: false,
        created_at: new Date().toISOString() // 👈 આનાથી 24 કલાક નવેસરથી ચાલુ થઈ જશે!
      })
      .eq('id', entryId)
      .select();

    if (error) {
      triggerAlert("Database Error: " + error.message);
    } else if (!data || data.length === 0) {
      triggerAlert("⚠️ એન્ટ્રી મળી નહીં!");
    } else {
      triggerAlert("✅ ઇનવર્ડ એન્ટ્રી સફળતાપૂર્વક અનલોક થઈ ગઈ! તમારી પાસે એડિટ કરવા માટે નવા 24 કલાક છે.");
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchRecentHistory();
    }
  };;

  // 🎯 પેજ લોડ થાય ત્યારે approve_id ચેક કરવા માટેનો useEffect
  useEffect(() => {
    fetchSites();

    const searchParams = new URLSearchParams(window.location.search);
    let approveId = searchParams.get('approve_id');

    if (!approveId) {
      approveId = localStorage.getItem('pending_approve_id');
    } else {
      localStorage.setItem('pending_approve_id', approveId);
    }

    if (approveId) {
      handleAutoUnlockEntry(approveId);
      localStorage.removeItem('pending_approve_id');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      fetchRecentHistory();
    }
  }, []);
const handleRequestEditAfter24Hours = async (entry) => {
    try {
      await supabase
        .from('site_material_inward')
        .update({ is_locked: true, edit_requested: true })
        .eq('id', entry.id);

      const adminPhone = "918238598234"; // એડમિનનો વ્હોટ્સએપ નંબર
      const portalLink = `${window.location.origin}/Dashboard`; // એપની મેઈન લિંક
      
      const message = `🔔 *Inward Edit Approval Request*\n\nયુઝરે 24 કલાક જૂની નીચેની ઇનવર્ડ એન્ટ્રી સુધારવા માટે પરવાનગી માંગી છે:\n• સાઇટ: ${entry.site_name}\n• સપ્લાયર: ${entry.supplier_name}\n• મટીરિયલ: ${entry.material_name}\n\n👉 એપ્લિકેશનમાં લોગ-ઈન કરી *Bell Icon (🔔)* માંથી રિક્વેસ્ટ Approve કે Reject કરો.\nLink: ${portalLink}`;

      window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`, '_blank');
      fetchRecentHistory(); 
    } catch (err) {
      console.error("Error requesting edit:", err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '650px', margin: '0 auto', paddingBottom: '20px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header */}
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
            Site Material Inward Entry
          </h3>
          <span style={{ fontSize: '11px', color: '#15803d', fontWeight: '600' }}>
            Manage raw materials and incoming stock efficiently
          </span>
        </div>
      </div>

      <form onSubmit={handleOpenPreview} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* 🌟 5. Select Site Card */}
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
              {sites.map(s => {
                const sName = s.site_name || s.plant_name || s.name;
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

        {/* MATERIAL INWARD SECTION */}
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
                        .filter(sup => sup.site_name === selectedSite || sup.site_name === 'All Sites (General)' || !sup.site_name) 
                        .map(sup => <option key={sup.id} value={sup.name}>{sup.name}</option>)
                      }
                      <option value="OTHER_SUPPLIER_MANUAL" style={{ fontWeight: 'bold', color: '#2563eb' }}>➕ Other (Type Manually...)</option>
                    </select>

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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {source.items.map((item, iIndex) => {
                      const isFinishedProduct = item.category === 'Finished Product';
                      
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
                        ? Array.from(new Map(products.map(p => [p.name ? p.name.trim().toLowerCase() : '', p.name ? p.name.trim() : ''])).values())
                            .map(n => n.trim().toLowerCase())
                            .includes((item.material || '').trim().toLowerCase())
                        : filteredMaterials.some(m => m.name && m.name.trim().toLowerCase() === (item.material || '').trim().toLowerCase());

                      const isCustomMaterial = item.material === 'OTHER_MANUAL' || (!isMaterialInList && item.material !== '');

                      const isPanel = isFinishedProduct && !isCustomMaterial && item.material && item.material.toLowerCase().includes('panel');
                      const isColumn = isFinishedProduct && !isCustomMaterial && item.material && item.material.toLowerCase().includes('column');

                      return (
                        <div key={item.id} style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'space-between' }}>
                            <select 
                              value={item.category || 'Finished Product'} 
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

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              
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
                                    updateInwardItem(sIndex, iIndex, 'size', '');
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

                              <div style={{ flex: '0.7', minWidth: '0' }}>
                                <input 
                                  type="number" 
                                  placeholder="Qty" 
                                  value={item.qty} 
                                  onChange={(e) => updateInwardItem(sIndex, iIndex, 'qty', e.target.value)} 
                                  style={{ width: '100%', padding: '7px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', textAlign: 'center', boxSizing: 'border-box' }} 
                                />
                              </div>

                              <div style={{ flex: '0.8', minWidth: '0' }}>
                                <select 
                                  value={item.unit} 
                                  onChange={(e) => updateInwardItem(sIndex, iIndex, 'unit', e.target.value)} 
                                  style={{ width: '100%', padding: '7px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}
                                >
                                  <option value="Nos">Nos</option>
                                  <option value="Ltr">Ltr</option>
                                  <option value="Bags">Bags</option>
                                  <option value="Kg">Kg</option>
                                </select>
                              </div>

                            </div>

                            {isCustomMaterial && (
                              <input 
                                type="text" 
                                placeholder="Type custom material name here..." 
                                value={item.material === 'OTHER_MANUAL' ? '' : item.material} 
                                onChange={(e) => updateInwardItem(sIndex, iIndex, 'material', e.target.value)} 
                                autoFocus
                                style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #ea580c', fontSize: '12px', backgroundColor: '#fff7ed', boxSizing: 'border-box' }} 
                              />
                            )}
                          </div>

                        

                        </div>
                      );
                    })}

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
                        
                        <label 
                          htmlFor={`bill-upload-${sIndex}`} 
                          style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px dashed #3b82f6', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          📎 {source.billFiles && source.billFiles.length > 0 ? `${source.billFiles.length} Files Selected` : 'Upload Bills'}
                        </label>

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

                  <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                    <input 
                      type="text" 
                      placeholder="DC Number" 
                      value={source.dcNumber} 
                      onChange={(e) => updateInwardSource(sIndex, 'dcNumber', e.target.value)} 
                      style={{ flex: 1, minWidth: 0, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} 
                    />
                    <input 
                      type="text" 
                      placeholder="Vehicle Number" 
                      value={source.vehicleNumber} 
                      onChange={(e) => updateInwardSource(sIndex, 'vehicleNumber', e.target.value)} 
                      style={{ flex: 1, minWidth: 0, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} 
                    />
                  </div>

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

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
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
                title="Delete this entry"
                onClick={async () => {
                  const confirmDelete = window.confirm("શું તમે ખરેખર આ આખી ઇનવર્ડ એન્ટ્રી ડિલીટ કરવા માંગો છો? આની સાથે લેજરનો ડેટા પણ ડિલીટ થઈ જશે.");
                  
                  if (confirmDelete) {
                    try {
                      await supabase.from('site_material_stock_ledger').delete().eq('reference_id', editingId);
   

                      const { error: delErr } = await supabase
                        .from('site_material_inward')
                        .delete()
                        .eq('id', editingId);

                      if (delErr) throw delErr;

                      triggerAlert("✅ ઇનવર્ડ એન્ટ્રી સફળતાપૂર્વક ડિલીટ થઈ ગઈ છે!");
                      handleCancelEdit();
                      fetchRecentHistory();

                    } catch (err) {
                      triggerAlert("એરર: એન્ટ્રી ડિલીટ કરવામાં સમસ્યા આવી રહી છે - " + err.message);
                    }
                  }
                }}
                style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '14px 20px', borderRadius: '12px', border: '1px solid #fca5a5', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                 <Trash2 size={18} /> Delete
              </button>
            </>
          )}
        </div>

      </form>

      <ConfirmModal
        isOpen={alertModal.isOpen}
        message={alertModal.message}
        singleButton={true}
        onConfirm={() => setAlertModal({ isOpen: false, message: '' })}
      />

      {/* Preview Modal */}
      {showPreview && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '16px', boxSizing: 'border-box' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '560px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', overflow: 'hidden' }}>
            
            <div style={{ backgroundColor: '#f0fdf4', padding: '14px 18px', borderBottom: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#14532d' }}>📋 Inward Entry Preview</h3>
                <span style={{ fontSize: '11px', color: '#15803d' }}>સબમિટ કરતાં પહેલાં ઇનવર્ડ વિગતો ચકાસી લો</span>
              </div>
              <button type="button" onClick={() => setShowPreview(false)} style={{ background: 'none', border: 'none', fontSize: '18px', fontWeight: 'bold', color: '#14532d', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '10px', fontSize: '12px', border: '1px solid #e2e8f0' }}>
                <div><strong>સાઇટ:</strong> {selectedSite}</div>
                <div><strong>તારીખ:</strong> {dprDate}</div>
              </div>

              {inwardSources.map((src) => (
                <div key={src.id} style={{ border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px', backgroundColor: '#fafffb', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #dcfce7', paddingBottom: '6px', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 'bold', color: '#16a34a' }}>🏢 {src.supplier || 'No Supplier'}</span>
                    <span style={{ fontSize: '11px', color: '#475569' }}>DC: <strong>{src.dcNumber || '-'}</strong> | Veh: <strong>{src.vehicleNumber || '-'}</strong></span>
                  </div>

                  <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #dcfce7', padding: '8px' }}>
                    <div style={{ fontWeight: '700', fontSize: '11px', color: '#14532d', marginBottom: '4px' }}>આવેલ મટીરિયલ (Incoming Items):</div>
                    {src.items.filter(it => it.material && it.qty).map((it, iIdx) => (
                      <div key={iIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: iIdx < src.items.length - 1 ? '1px dashed #f1f5f9' : 'none', padding: '4px 0', fontSize: '11px' }}>
                        <div>
                          <span style={{ fontWeight: '600', color: '#0f172a' }}>{it.material}</span>
                          {it.size ? ` - ${it.size}` : ''}
                          {it.steelSpec ? ` (${it.steelSpec})` : ''}
                          <span style={{ color: '#64748b', fontSize: '10px', marginLeft: '6px' }}>[{it.category || 'Raw Material'}]</span>
                        </div>
                        <div style={{ fontWeight: 'bold', color: '#16a34a' }}>{it.qty} {it.unit || 'Nos'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', borderTop: '1px solid #bbf7d0', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowPreview(false)} style={{ padding: '8px 16px', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>✏️ સુધારો કરવો છે (Edit)</button>
              <button type="button" onClick={handleSubmitInward} disabled={loading} style={{ padding: '8px 18px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>{loading ? 'સેવ થાય છે...' : '✅ બરાબર છે, સબમિટ કરો'}</button>
            </div>

          </div>
        </div>
      )}

      {/* Recent History */}
      {recentHistory.length > 0 && (
        <div style={{ marginTop: '15px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '8px', paddingLeft: '4px' }}>
            Recent Inward History (Last 24 Hours Editable)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentHistory.map((item) => {
          // 🎯 ૨૪ કલાકનું ટાઈમ લૉજિક કેલ્ક્યુલેટ કરવા માટે
              const entryTime = new Date(item.created_at || item.date).getTime();
              const currentTime = new Date().getTime();
              const hoursDifference = (currentTime - entryTime) / (1000 * 60 * 60);
              const isLocked = item.is_locked === true || hoursDifference > 24;

              return (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#166534' }}>{item.material_name}</span> ({item.quantity} {item.unit}) - <span style={{ color: '#64748b' }}>{item.supplier_name}</span>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>DC: {item.dc_number || 'EMPTY'} | Date: {item.date}</div>
                  </div>

                  {isLocked ? (
                    <button type="button" onClick={() => handleEditClickWithTimeCheck(item)} style={{ fontSize: '11px', fontWeight: 'bold', color: '#b91c1c', backgroundColor: '#fef2f2', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #fecaca' }}>
                      🔒 Request Edit
                    </button>
                  ) : (
                    <button type="button" onClick={() => handleEditClickWithTimeCheck(item)} style={{ fontSize: '11px', fontWeight: 'bold', color: '#1d4ed8', backgroundColor: '#eff6ff', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #bfdbfe' }}>
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