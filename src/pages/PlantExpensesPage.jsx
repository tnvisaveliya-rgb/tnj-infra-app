import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Receipt, Send, Plus, Trash2, Clock, Upload, X } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
export default function PlantExpensesPage({ user }) {
  const [plants, setPlants] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [expensesHistory, setExpensesHistory] = useState([]);
  const [activeModalRowIndex, setActiveModalRowIndex] = useState(null);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  

  // 🌟 રિપોર્ટના તમામ સ્ટેટ્સ અહીં ઉપર જ ડીકલેર કરો
  const [reportPlantFilter, setReportPlantFilter] = useState('All');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportFromDate, setReportFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [reportToDate, setReportToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPaidToFilter, setSelectedPaidToFilter] = useState('All');
  const [reportCategoryFilter, setReportCategoryFilter] = useState('All');

  // Master Lists
  const [dbCategories, setDbCategories] = useState([]);
  const [plantLabours, setPlantLabours] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
const [showPreviewModal, setShowPreviewModal] = useState(false);
const [alertModal, setAlertModal] = useState({
  isOpen: false,
  message: ''
});

// 🔔 alert() ની જગ્યાએ કોલ કરવા માટેનું ફંક્શન
const triggerAlert = (msg) => {
  setAlertModal({
    isOpen: true,
    message: msg
  });
};
const filteredReportList = expensesHistory.filter(item => {
    // ૧. તારીખ ફિલ્ટર
    const itemDate = item.expense_date;
    const matchDate = (!reportFromDate || itemDate >= reportFromDate) && (!reportToDate || itemDate <= reportToDate);

    // ૨. લોકેશન ફિલ્ટર (All, Only Plants, Only Sites, અથવા સ્પેસિફિક પ્લાન્ટ)
    let matchLocation = true;
    if (reportPlantFilter === 'Plant Only') {
      matchLocation = item.source_type === 'Plant';
    } else if (reportPlantFilter === 'Site Only') {
      matchLocation = item.source_type === 'Site';
    } else if (reportPlantFilter !== 'All') {
      matchLocation = item.plant_name === reportPlantFilter;
    }

    // ૩. વ્યક્તિ / વેન્ડર ફિલ્ટર
    const matchPaidTo = selectedPaidToFilter === 'All' || 
      (item.paid_to || '').toLowerCase().trim() === selectedPaidToFilter.toLowerCase().trim();

    // ૪. કેટેગરી ફિલ્ટર
    const matchCat = reportCategoryFilter === 'All' || item.expense_category === reportCategoryFilter;

    return matchDate && matchLocation && matchPaidTo && matchCat;
  });

  const totalReportAmount = filteredReportList.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  // યુનિક વ્યક્તિ/વેન્ડરનું લિસ્ટ ફિલ્ટર માટે
// 🌟 પસંદ કરેલા લોકેશન/પ્લાન્ટ મુજબ જ વેન્ડર્સ લાવો
  const availableExpensesForLocation = expensesHistory.filter(item => {
    if (reportPlantFilter === 'Plant Only') return item.source_type === 'Plant';
    if (reportPlantFilter === 'Site Only') return item.source_type === 'Site';
    if (reportPlantFilter !== 'All') return item.plant_name === reportPlantFilter;
    return true; // જો All હોય તો બધા પ્લાન્ટ અને સાઈટ
  });

  const uniquePaidToList = Array.from(
    new Set(availableExpensesForLocation.map(i => i.paid_to).filter(Boolean))
  );
  // પોપઅપમાં નવી આઇટમ રો ઉમેરવા
const addStockSubItem = (rowIndex) => {
  const updated = [...expenseRows];
  if (!updated[rowIndex].stockItems) updated[rowIndex].stockItems = [];
  updated[rowIndex].stockItems.push({
    id: Date.now(),
    selectedMaterial: '',
    manualMaterialName: '',
    qty: '',
    unit: 'Nos'
  });
  setExpenseRows(updated);
};

// પોપઅપમાંથી આઇટમ રો કાઢી નાખવા
const removeStockSubItem = (rowIndex, subIndex) => {
  const updated = [...expenseRows];
  updated[rowIndex].stockItems = updated[rowIndex].stockItems.filter((_, i) => i !== subIndex);
  setExpenseRows(updated);
};

// પોપઅપની અંદર સબ-આઇટમ વેલ્યુ અપડેટ કરવા
const updateStockSubItem = (rowIndex, subIndex, field, value) => {
  const updated = [...expenseRows];
  updated[rowIndex].stockItems[subIndex][field] = value;
  setExpenseRows(updated);
};

const [expenseRows, setExpenseRows] = useState([
  {
    id: 1,
    expenseCategory: '',
    amount: '',
    paidTo: '',
    selectedLabour: '',
    paymentMode: 'Cash',
    billNo: '',
    remarks: '',
    billFile: null,
    uploading: false,
    addToStock: false,
    // 🎯 મલ્ટીપલ સ્ટોક આઇટમ્સ માટે એરે:
    stockItems: [
    { id: Date.now(), selectedMaterial: '', manualMaterialName: '', qty: '', unit: 'Nos' }
    ]
  }
]);

  useEffect(() => {
    fetchPlants();
    fetchCategories();
    fetchMaterialsMaster();
  }, []);

  useEffect(() => {
    if (selectedPlant) {
      fetchExpensesHistory();
      fetchLaboursForPlant(selectedPlant);
    } else {
      setExpensesHistory([]);
      setPlantLabours([]);
    }
  }, [selectedPlant]);

  const fetchPlants = async () => {
    try {
      const { data } = await supabase.from('plants').select('*');
      setPlants(data || []);
    } catch (err) {
      console.error("Plants Error:", err);
    }
  };
  
const handleOpenPreview = (e) => {
    e.preventDefault();
    if (!selectedPlant) {
      triggerAlert("⚠️ કૃપા કરીને પહેલા પ્લાન્ટ સિલેક્ટ કરો!");
      return;
    }

    for (let i = 0; i < expenseRows.length; i++) {
      const row = expenseRows[i];
      const isHardware = (row.expenseCategory || '').toLowerCase().includes('hardware') || (row.expenseCategory || '').toLowerCase().includes('tool');

      if (!row.amount || Number(row.amount) <= 0) {
        triggerAlert(`⚠️ એક્સપેન્સ #${i + 1}: કૃપા કરીને સાચી રકમ (Amount) દાખલ કરો!`);
        return;
      }

      if ((isHardware || row.addToStock) && !row.billFile) {
        triggerAlert(`⚠️ એક્સપેન્સ #${i + 1}: હાર્ડવેર/ટૂલ્સ માટે બિલ/ફોટો અપલોડ કરવો ફરજિયાત છે!`);
        return;
      }

      if (row.addToStock) {
        if (!row.stockItems || row.stockItems.length === 0) {
          triggerAlert(`⚠️ એક્સપેન્સ #${i + 1}: કૃપા કરીને ઓછામાં ઓછું એક મટીરીયલ ઉમેરો!`);
          return;
        }
        for (let s = 0; s < row.stockItems.length; s++) {
          const item = row.stockItems[s];
          if (!item.selectedMaterial) {
            triggerAlert(`⚠️ એક્સપેન્સ #${i + 1} (Item #${s + 1}): મટીરીયલ પસંદ કરો!`);
            return;
          }
          if (item.selectedMaterial === '__OTHER__' && !item.manualMaterialName?.trim()) {
            triggerAlert(`⚠️ એક્સપેન્સ #${i + 1} (Item #${s + 1}): મેન્યુઅલ નામ દાખલ કરો!`);
            return;
          }
          if (!item.qty || Number(item.qty) <= 0) {
            triggerAlert(`⚠️ એક્સપેન્સ #${i + 1} (Item #${s + 1}): સાચી સંખ્યા (Qty) દાખલ કરો!`);
            return;
          }
        }
      }
    }

    // બધું વેલિડ હોય તો પ્રિવ્યૂ પોપઅપ ઓપન કરો
    setShowPreviewModal(true);
  };
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('expense_category_master').select('*');
      if (!error && data) setDbCategories(data);
    } catch (err) {
      console.error("Categories Fetch Error:", err);
    }
  };

 const fetchMaterialsMaster = async () => {
  try {
    const { data, error } = await supabase
      .from('site_materials_master')
      .select('*');

    if (error) throw error;

    if (data) {
      // 🎯 'item_type' કોલમ પરથી ફિલ્ટર કરો
      const filtered = data.filter((item) => {
        const type = (item.item_type || '').toLowerCase();
        
        return (
          type.includes('hardware') ||
          type.includes('tool') ||
          type.includes('consumable') ||
          type.includes('asset')
        );
      });

      // જો ફિલ્ટરમાં ડેટા મળે તો ફિલ્ટર કરેલો, નહીં તો બેકઅપ તરીકે બધો ડેટા બતાવો
      setAvailableMaterials(filtered.length > 0 ? filtered : data);
    }
  } catch (err) {
    console.error("Materials Master Error:", err.message);
  }
};

  const fetchLaboursForPlant = async (plantName) => {
    try {
      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .or(`site_name.eq.${plantName},site_name.is.null`);

      if (!error && data) setPlantLabours(data);
    } catch (err) {
      console.error("Labours Fetch Error:", err);
    }
  };
// ✏️ એડિટ વખતે સ્ટોકની વિગતો સાથે ડેટા લોડ કરવો
const handleEditExpense = async (item) => {
    setEditingExpenseId(item.id);
    setExpenseDate(item.expense_date || expenseDate);
    setSelectedPlant(item.plant_name || selectedPlant);

    const isLabour = (item.expense_category || '').toLowerCase().includes('labour') || (item.expense_category || '').toLowerCase().includes('wages');
    const isHardware = (item.expense_category || '').toLowerCase().includes('hardware') || (item.expense_category || '').toLowerCase().includes('tool');

    let loadedStockItems = [];
    let hasStock = false;

    if (isHardware) {
      try {
        const rawRefId = String(item.id).replace('site_', '');
        
        // ૧. પહેલા reference_id થી શોધો
        let { data: stockData } = await supabase
          .from('material_stock_ledger')
          .select('*')
          .eq('reference_id', rawRefId)
          .eq('transaction_type', 'INWARD');

        // ૨. જો reference_id માં NULL હોય તો બેકઅપ તરીકે Date + Plant થી શોધો (જૂની એન્ટ્રીઓ માટે)
        if (!stockData || stockData.length === 0) {
          const { data: fallbackStock } = await supabase
            .from('material_stock_ledger')
            .select('*')
            .eq('plant_name', item.plant_name)
            .eq('date', item.expense_date)
            .eq('transaction_type', 'INWARD')
            .is('reference_id', null);

          if (fallbackStock && fallbackStock.length > 0) {
            stockData = fallbackStock;
          }
        }

        if (stockData && stockData.length > 0) {
          hasStock = true;
          loadedStockItems = stockData.map(st => ({
            id: st.id || Date.now(),
            selectedMaterial: st.material_name,
            manualMaterialName: '',
            qty: st.qty,
            unit: st.unit || 'Nos'
          }));
        }
      } catch (err) {
        console.error("Fetch stock error on edit:", err);
      }
    }

    setExpenseRows([
      {
        id: Date.now(),
        expenseCategory: item.expense_category || '',
        amount: item.amount || '',
        paidTo: isLabour ? '' : (item.paid_to || ''),
        selectedLabour: isLabour ? (item.paid_to || '') : '',
        paymentMode: item.payment_mode || 'Cash',
        billNo: item.bill_no === '-' ? '' : (item.bill_no || ''),
        remarks: item.remarks || '',
        billFile: item.bill_url || null,
        uploading: false,
        addToStock: hasStock,
        stockItems: loadedStockItems.length > 0 ? loadedStockItems : [{ id: Date.now(), selectedMaterial: '', manualMaterialName: '', qty: '' }]
      }
    ]);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
const handleDeleteCurrentExpense = async () => {
    const confirmDelete = window.confirm("⚠️ શું તમે ખરેખર આ ખર્ચ, બિલ અને સ્ટોક ડિલીટ કરવા માંગો છો?");
    if (!confirmDelete) return;

    setLoading(true);
    try {
      const expId = Number(editingExpenseId);

      // ૧. બિલ URL મેળવી સ્ટોરેજમાંથી ફાઈલ ડિલીટ કરવી
      try {
        const { data: pData } = await supabase
          .from('plant_expenses')
          .select('bill_url')
          .eq('id', expId)
          .maybeSingle();

        const fileUrl = pData?.bill_url;
        if (fileUrl && fileUrl.includes('/Plant/')) {
          const marker = '/Plant/';
          let cleanPath = fileUrl.substring(fileUrl.indexOf(marker) + marker.length);
          cleanPath = decodeURIComponent(cleanPath.split('?')[0]);
          if (cleanPath.startsWith('/')) cleanPath = cleanPath.slice(1);

          await supabase.storage.from('Plant').remove([cleanPath]);
        }
      } catch (storageErr) {
        console.warn("Storage removal note:", storageErr);
      }

      // ૨. સ્ટોક લેજરમાંથી સેફલી ડિલીટ કરવું (Try-catch સાથે જેથી મેઈન ડિલીટ ન અટકે)
      try {
        await supabase
          .from('material_stock_ledger')
          .delete()
          .eq('reference_id', String(expId));
      } catch (stockErr) {
        console.warn("Stock ledger delete note:", stockErr);
      }

      // 🌟 ૩. મુખ્ય plant_expenses ટેબલમાંથી એન્ટ્રી ડિલીટ કરવી (ગેરંટી સાથે)
      const { error: delErr } = await supabase
        .from('plant_expenses')
        .delete()
        .eq('id', expId);

      if (delErr) {
        throw new Error("ડેટાબેઝ ડિલીટ એરર: " + delErr.message);
      }

      triggerAlert("✅ ખર્ચ સફળતાપૂર્વક ડિલીટ થઈ ગયો છે!");

      // ૪. ફોર્મ રીસેટ કરવું
      setEditingExpenseId(null);
      setExpenseRows([
        {
          id: Date.now(),
          expenseCategory: '',
          amount: '',
          paidTo: '',
          selectedLabour: '',
          paymentMode: 'Cash',
          billNo: '',
          remarks: '',
          billFile: null,
          uploading: false,
          addToStock: false,
          stockItems: [{ id: Date.now(), selectedMaterial: '', manualMaterialName: '', qty: '' }]
        }
      ]);

      // લિસ્ટ રિફ્રેશ કરો
      await fetchExpensesHistory();

    } catch (err) {
      triggerAlert("Delete Error: " + err.message);
      console.error("Delete process error:", err);
    } finally {
      setLoading(false);
    }
  };
const fetchExpensesHistory = async () => {
    try {
      // ૧. પ્લાન્ટના ખર્ચા (બધા જ પ્લાન્ટ લાવો જેથી પોપઅપમાં પ્લાન્ટ બદલો તો તરત ડેટા મળે)
      const { data: plantData } = await supabase
        .from('plant_expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      // ૨. સાઈટના ખર્ચા
      const { data: siteData } = await supabase
        .from('site_transactions')
        .select('*')
        .order('created_by', { ascending: false })
        .limit(200);

      // ૩. નોર્મલાઈઝ અને મર્જ
      const formattedPlantExpenses = (plantData || []).map(p => ({
        ...p,
        source_type: 'Plant',
        display_location: p.plant_name || 'Plant'
      }));

      const formattedSiteExpenses = (siteData || []).map(s => ({
        id: `site_${s.id}`,
        expense_date: s.date || s.transaction_date || (s.created_at ? s.created_at.split('T')[0] : expenseDate),
        plant_name: s.site_name || 'Site Work',
        display_location: `Site: ${s.site_name || 'General Site'}`,
        expense_category: s.category || s.expense_category || 'Site Expense',
        amount: Number(s.amount || 0),
        paid_to: s.paid_to || s.party_name || s.vendor_name || 'Self',
        payment_mode: s.payment_mode || 'Cash',
        bill_no: s.bill_no || '-',
        bill_url: s.bill_url || s.attachment_url || null,
        remarks: s.remarks || '',
        source_type: 'Site'
      }));

      const combined = [...formattedPlantExpenses, ...formattedSiteExpenses].sort(
        (a, b) => new Date(b.expense_date) - new Date(a.expense_date)
      );

      setExpensesHistory(combined);
    } catch (err) {
      console.error("Combined Expenses Error:", err);
    }
  };
     
  const addExpenseRow = () => {
    setExpenseRows([
      ...expenseRows,
      {
        id: Date.now(),
        expenseCategory: '',
        amount: '',
        paidTo: '',
        selectedLabour: '',
        paymentMode: 'Cash',
        billNo: '',
        remarks: '',
        billFile: null,
        uploading: false,
        addToStock: false,
        selectedMaterial: '',
        manualMaterialName: '',
        qty: ''
      }
    ]);
  };

  const removeExpenseRow = (index) => {
    setExpenseRows(expenseRows.filter((_, i) => i !== index));
  };

  const updateExpenseRow = (index, field, value) => {
    const updated = [...expenseRows];
    updated[index][field] = value;
    setExpenseRows(updated);
  };

  // 🎯 કેટેગરી બદલાય ત્યારે પોપઅપ કંટ્રોલ
  const handleCategoryChange = (index, value) => {
    updateExpenseRow(index, 'expenseCategory', value);
    const valLower = value.toLowerCase();
    if (valLower.includes('hardware') || valLower.includes('tool')) {
      setActiveModalRowIndex(index);
    } else {
      updateExpenseRow(index, 'addToStock', false);
      updateExpenseRow(index, 'selectedMaterial', '');
      updateExpenseRow(index, 'manualMaterialName', '');
      updateExpenseRow(index, 'qty', '');
    }
  };

  const handleFileUpload = async (index, file) => {
    if (!file) return;
    const updated = [...expenseRows];
    updated[index].uploading = true;
    setExpenseRows(updated);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `plant_expense/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from('Plant')
        .upload(filePath, file);

      if (uploadErr) throw uploadErr;

      const { data: publicURLData } = supabase.storage
        .from('Plant')
        .getPublicUrl(filePath);

      updated[index].billFile = publicURLData.publicUrl;
      triggerAlert("✅ બિલ સફળતાપૂર્વક અપલોડ થઈ ગયું છે!");
    } catch (err) {
      triggerAlert("Upload Error: " + err.message);
    } finally {
      updated[index].uploading = false;
      setExpenseRows(updated);
    }
  };

const handleFinalSubmit = async () => {
    setShowPreviewModal(false);

    const { data: { session } } = await supabase.auth.getSession();
    const currentLoggedUser = session?.user?.email || session?.user?.id || user?.email || user?.id || 'Admin';

    setLoading(true);
    try {
      const expenseInsertRows = [];

      for (const row of expenseRows) {
        let finalPaidTo = row.paidTo.trim() || 'Self';
        const isLabourCat = row.expenseCategory.toLowerCase().includes('labour') || row.expenseCategory.toLowerCase().includes('wages');
        if (isLabourCat && row.selectedLabour) {
          finalPaidTo = row.selectedLabour;
        }

        expenseInsertRows.push({
          plant_name: selectedPlant,
          expense_date: expenseDate,
          expense_category: row.expenseCategory,
          amount: Number(row.amount),
          paid_to: finalPaidTo,
          payment_mode: row.paymentMode,
          bill_no: row.billNo.trim() || '-',
          remarks: row.remarks.trim() || '',
          bill_url: row.billFile || null,
          submitted_by: currentLoggedUser
        });
      }

      // ૧. અપડેટ મોડ
      if (editingExpenseId) {
        const updatePayload = expenseInsertRows[0];
        const expId = Number(editingExpenseId);

        if (!updatePayload.bill_url) {
          const existingItem = expensesHistory.find(h => Number(h.id) === expId);
          if (existingItem && existingItem.bill_url) {
            updatePayload.bill_url = existingItem.bill_url;
          }
        }

        const { error: updateErr } = await supabase
          .from('plant_expenses')
          .update(updatePayload)
          .eq('id', expId);

        if (updateErr) throw updateErr;

        await supabase
          .from('material_stock_ledger')
          .delete()
          .eq('reference_id', String(expId));

        const row = expenseRows[0];
        if (row.addToStock && row.stockItems && row.stockItems.length > 0) {
          const newStockLedger = row.stockItems
            .filter(sub => sub.qty && Number(sub.qty) > 0)
            .map(sub => ({
              date: expenseDate,
              plant_name: selectedPlant,
              material_name: sub.selectedMaterial === '__OTHER__' ? (sub.manualMaterialName?.trim() || 'General Tool') : sub.selectedMaterial,
              transaction_type: 'INWARD',
              qty: Number(sub.qty),
              unit: sub.unit || 'Nos',
              reference_id: String(expId)
            }));

          if (newStockLedger.length > 0) {
            await supabase.from('material_stock_ledger').insert(newStockLedger);
          }
        }

        setEditingExpenseId(null);
        triggerAlert("✅ ખર્ચ અને સ્ટોક સફળતાપૂર્વક અપડેટ થઈ ગયા છે!");

      } else {
        // ૨. નવી એન્ટ્રી
        for (let rIdx = 0; rIdx < expenseRows.length; rIdx++) {
          const row = expenseRows[rIdx];
          const payload = expenseInsertRows[rIdx];

          const { data: newExp, error: expErr } = await supabase
            .from('plant_expenses')
            .insert([payload])
            .select('id')
            .single();

          if (expErr) throw expErr;
          const savedExpenseId = newExp.id;

          if (row.addToStock && row.stockItems && row.stockItems.length > 0) {
            const stockRowsForThisExpense = [];
            for (const subItem of row.stockItems) {
              if (subItem.qty && Number(subItem.qty) > 0) {
                const matName = subItem.selectedMaterial === '__OTHER__' 
                  ? (subItem.manualMaterialName?.trim() || 'General Tool') 
                  : subItem.selectedMaterial;

                stockRowsForThisExpense.push({
                  date: expenseDate,
                  plant_name: selectedPlant,
                  material_name: matName,
                  transaction_type: 'INWARD',
                  qty: Number(subItem.qty),
                  unit: subItem.unit || 'Nos',
                  reference_id: String(savedExpenseId)
                });
              }
            }

            if (stockRowsForThisExpense.length > 0) {
              await supabase.from('material_stock_ledger').insert(stockRowsForThisExpense);
            }
          }
        }
triggerAlert("✅ ખર્ચ સફળતાપૂર્વક સેવ થઈ ગયો છે અને સ્ટોક જમા થઈ ગયો છે!");
      }

      setExpenseRows([
        {
          id: Date.now(),
          expenseCategory: '',
          amount: '',
          paidTo: '',
          selectedLabour: '',
          paymentMode: 'Cash',
          billNo: '',
          remarks: '',
          billFile: null,
          uploading: false,
          addToStock: false,
          selectedMaterial: '',
          manualMaterialName: '',
          qty: '',
          stockItems: [{ id: Date.now(), selectedMaterial: '', manualMaterialName: '', qty: '', unit: 'Nos' }]
        }
      ]);

      await fetchExpensesHistory();
    } catch (err) {
      triggerAlert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '650px', margin: '0 auto', paddingBottom: '20px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* 1. Header Card (Red Theme) */}
      <div style={{ 
        background: 'linear-gradient(135deg, #fff5f5 0%, #fee2e2 100%)', 
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
          <Receipt size={20} color="#ffffff" strokeWidth={2.5} />
        </div>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#991b1b', margin: 0, letterSpacing: '0.2px' }}>
            PLANT EXPENSES & AUTO-INWARD
          </h3>
          <span style={{ fontSize: '11px', color: '#b91c1c', fontWeight: '600' }}>
            Record expenses and auto-add asset/material stock
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
            Expense Date *
          </label>
          <input 
            type="date" 
            value={expenseDate} 
            onChange={(e) => setExpenseDate(e.target.value)} 
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

      {/* 3. EXPENSE ENTRY FORM */}
<form onSubmit={handleOpenPreview} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ backgroundColor: '#fff5f5', border: '1px solid #fecaca', borderRadius: '16px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
          
          <div style={{ borderBottom: '2px dashed #fca5a5', paddingBottom: '10px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#991b1b', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Receipt size={16} /> New Expense Entry (ખર્ચ નોંધો)
            </h4>
            <button 
              type="button" 
              onClick={addExpenseRow} 
              style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={14} /> Add Row
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {expenseRows.map((row, index) => {
              const isLabourSelected = row.expenseCategory.toLowerCase().includes('labour') || row.expenseCategory.toLowerCase().includes('wages');
              const isHardware = row.expenseCategory.toLowerCase().includes('hardware') || row.expenseCategory.toLowerCase().includes('tool');

              return (
                <div key={row.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#991b1b' }}>Expense #{index + 1}</span>
                    {expenseRows.length > 1 && (
                      <button type="button" onClick={() => removeExpenseRow(index)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Category & Amount */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1.4 }}>
                      <label style={{ fontSize: '10px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '2px' }}>Category *</label>
                      <select
                        value={row.expenseCategory}
                        onChange={(e) => handleCategoryChange(index, e.target.value)}
                        style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#f8fafc', fontWeight: 'bold', color: '#991b1b' }}
                        required
                      >
                        <option value="">-- Select Category --</option>
                        {dbCategories.map((cat) => (
                          <option key={cat.id} value={cat.name || cat.category_name}>
                            {cat.name || cat.category_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '10px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '2px' }}>Amount (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        placeholder="Enter Amount"
                        value={row.amount}
                        onChange={(e) => updateExpenseRow(index, 'amount', e.target.value)}
                        style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box', fontWeight: 'bold', color: '#dc2626' }}
                        required
                      />
                    </div>
                  </div>

                  {/* Paid To OR Plant Labours Dropdown */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1.2 }}>
                      <label style={{ fontSize: '10px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '2px' }}>
                        {isLabourSelected ? 'Select Labour / Worker *' : 'Paid To / Vendor Name'}
                      </label>
                      
                      {isLabourSelected ? (
                        <select
                          value={row.selectedLabour}
                          onChange={(e) => updateExpenseRow(index, 'selectedLabour', e.target.value)}
                          style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff' }}
                          required
                        >
                          <option value="">-- Choose Plant Labour --</option>
                          {plantLabours.map((lab) => (
                            <option key={lab.id} value={lab.name || lab.labour_name}>
                              {lab.name || lab.labour_name} {lab.designation ? `(${lab.designation})` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder="e.g. Petrol Pump / Person Name"
                          value={row.paidTo}
                          onChange={(e) => updateExpenseRow(index, 'paidTo', e.target.value)}
                          style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }}
                        />
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '10px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '2px' }}>Payment Mode</label>
                      <select
                        value={row.paymentMode}
                        onChange={(e) => updateExpenseRow(index, 'paymentMode', e.target.value)}
                        style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff' }}
                      >
                        <option value="Cash">💵 Cash</option>
                        <option value="Online / UPI">📱 Online / UPI</option>
                        <option value="Cheque / Bank">🏦 Cheque / Bank</option>
                        <option value="Credit / Udhar">📋 Credit</option>
                      </select>
                    </div>
                  </div>

                {/* 🎯 હાર્ડવેર સ્ટોક બેજ */}
{isHardware && (
  <div style={{ 
    backgroundColor: row.addToStock ? '#f0fdf4' : '#f8fafc', 
    padding: '8px 10px', 
    borderRadius: '8px', 
    border: `1px solid ${row.addToStock ? '#86efac' : '#e2e8f0'}`, 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  }}>
    <span style={{ fontSize: '11px', fontWeight: '700', color: row.addToStock ? '#15803d' : '#475569' }}>
      {row.addToStock 
        ? `📦 Stock Inward: ${
            (row.stockItems || [])
              .map(item => `${item.selectedMaterial === '__OTHER__' ? item.manualMaterialName : item.selectedMaterial} (${item.qty || 0})`)
              .filter(Boolean)
              .join(', ') || 'કોઈ આઇટમ નથી'
          }` 
        : '📦 Stock Inward: ઉમેરેલ નથી'}
    </span>
    <button
      type="button"
      onClick={() => setActiveModalRowIndex(index)}
      style={{
        backgroundColor: row.addToStock ? '#15803d' : '#2563eb',
        color: '#fff',
        border: 'none',
        padding: '4px 8px',
        borderRadius: '6px',
        fontSize: '10px',
        fontWeight: 'bold',
        cursor: 'pointer'
      }}
    >
      {row.addToStock ? 'Edit Stock' : '+ Add to Stock'}
    </button>
  </div>
)}

                  {/* Bill No & Mandatory Attachment */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        placeholder="Bill / Voucher No"
                        value={row.billNo}
                        onChange={(e) => updateExpenseRow(index, 'billNo', e.target.value)}
                        style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                     <label style={{ 
  flex: 1, 
  padding: '6px 8px', 
  backgroundColor: row.billFile ? '#f0fdf4' : ((isHardware || row.addToStock) ? '#ffeeee' : '#f1f5f9'), 
  border: `1px solid ${row.billFile ? '#86efac' : ((isHardware || row.addToStock) ? '#dc2626' : '#cbd5e1')}`, 
  borderRadius: '6px', 
  fontSize: '11px', 
  cursor: 'pointer', 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center', 
  gap: '4px', 
  color: row.billFile ? '#15803d' : '#334155', 
  fontWeight: '600' 
}}>
  <Upload size={13} /> 
  {row.uploading 
    ? 'Uploading...' 
    : (row.billFile ? '✅ Bill Attached (Change)' : ((isHardware || row.addToStock) ? '⚠️ Bill Required' : 'Attach Bill'))}
  
  <input 
    type="file" 
    accept="image/*,application/pdf" 
    onChange={(e) => handleFileUpload(index, e.target.files[0])} 
    style={{ display: 'none' }} 
  />
</label>
                    </div>
                  </div>

                  {/* Remarks */}
                  <div>
                    <input
                      type="text"
                      placeholder="Remarks / Note (Optional)"
                      value={row.remarks}
                      onChange={(e) => updateExpenseRow(index, 'remarks', e.target.value)}
                      style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }}
                    />
                  </div>

                </div>
              );
            })}

          {/* 🌟 ACTION BUTTONS (Edit મોડમાં Update, Cancel અને Delete દેખાશે) */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              {/* મુખ્ય Submit / Update બટન */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1,
                  backgroundColor: editingExpenseId ? '#2563eb' : '#dc2626',
                  color: '#fff',
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <Send size={15} /> 
                {loading ? 'Processing...' : (editingExpenseId ? 'Update Expense' : 'Submit Expenses')}
              </button>

              {/* ❌ Cancel અને 🗑️ Delete બટન્સ (માત્ર Edit મોડમાં જ દેખાશે) */}
              {editingExpenseId && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingExpenseId(null);
                      setExpenseRows([
                        {
                          id: Date.now(),
                          expenseCategory: '',
                          amount: '',
                          paidTo: '',
                          selectedLabour: '',
                          paymentMode: 'Cash',
                          billNo: '',
                          remarks: '',
                          billFile: null,
                          uploading: false,
                          addToStock: false,
                          stockItems: [{ id: Date.now(), selectedMaterial: '', manualMaterialName: '', qty: '' }]
                        }
                      ]);
                    }}
                    style={{
                      backgroundColor: '#64748b',
                      color: '#fff',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>

             <button
  type="button"
  disabled={loading}
  onClick={handleDeleteCurrentExpense}
  style={{
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #fca5a5',
    fontWeight: 'bold',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  }}
>
  <Trash2 size={15} /> Delete
</button>
                </>
              )}
            </div>
          </div>
        </div>
      </form>
      {/* 📊 3.5. TRANSACTION / EXPENSE REPORT TAB BUTTON */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '16px',
        padding: '14px 18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)'
      }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
            📑 Expense Transaction Report
          </h4>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            કોને કેટલા રૂપિયા આપ્યા તેનો તારીખ મુજબ રિપોર્ટ કાઢો / પ્રિન્ટ કરો
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!selectedPlant) {
              triggerAlert("⚠️ કૃપા કરીને પહેલા ઉપરથી પ્લાન્ટ સિલેક્ટ કરો!");
              return;
            }
            setShowReportModal(true);
          }}
          style={{
            backgroundColor: '#1e293b',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          📄 View / Print Report
        </button>
      </div>

     {showReportModal && (
  <div className="report-modal-wrapper" style={{
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
    zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px'
  }}>

    {/* 🌟 સ્પેશિયલ પ્રિન્ટ સ્ટાઈલ - પ્રિન્ટ વખતે પ્રોફેશનલ પેપર રિપોર્ટ બનાવશે */}
    <style>{`
      @media print {
        body * {
          visibility: hidden !important;
        }
        .printable-report-area, .printable-report-area * {
          visibility: visible !important;
        }
        .printable-report-area {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
          box-shadow: none !important;
          border: none !important;
          background: #fff !important;
        }
        .no-print {
          display: none !important;
        }
        .print-only-header {
          display: block !important;
        }
        table {
          width: 100% !important;
          border-collapse: collapse !important;
        }
        th, td {
          border: 1px solid #94a3b8 !important;
          padding: 6px 8px !important;
        }
        thead {
          display: table-header-group !important;
        }
        tr {
          page-break-inside: avoid !important;
        }
      }
      .print-only-header {
        display: none;
      }
    `}</style>

    <div className="printable-report-area" style={{
      width: '100%', maxWidth: '750px', maxHeight: '90vh', backgroundColor: '#ffffff',
      borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', overflow: 'hidden'
    }}>
            
   {/* 🌟 1. સ્ક્રીન પર દેખાતું હેડર (પ્રિન્ટમાં નહીં આવે) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
            Plant & Site Expense Statement
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>તારીખ અને વ્યક્તિ પસંદ કરી રિપોર્ટ પ્રિન્ટ / PDF કાઢો</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            🖨️ Print / Save PDF
          </button>
          <button
            type="button"
            onClick={() => setShowReportModal(false)}
            style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* 🌟 2. માત્ર પ્રિન્ટ વખતે જ દેખાતું કંપની લેટરહેડ (Professional Look) */}
      <div className="print-only-header" style={{ marginBottom: '15px', borderBottom: '2px solid #0f172a', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: '0 0 2px 0', fontSize: '20px', fontWeight: '900', color: '#0f172a', letterSpacing: '0.5px' }}>
              EXPENSE STATEMENT / VOUCHER REPORT
            </h2>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>
              Location / Plant: <span style={{ color: '#0f172a' }}>{reportPlantFilter === 'All' ? 'All Plants & Sites' : reportPlantFilter}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '11px', color: '#334155' }}>
            <div><strong>Period:</strong> {reportFromDate.split('-').reverse().join('/')} to {reportToDate.split('-').reverse().join('/')}</div>
            <div><strong>Vendor/Person:</strong> {selectedPaidToFilter}</div>
            <div><strong>Printed On:</strong> {new Date().toLocaleDateString('en-GB')}</div>
          </div>
        </div>
      </div>

      {/* 🌟 3. ફિલ્ટર્સ બાર (no-print ક્લાસ સાથે, જે પ્રિન્ટમાં ગાયબ થઈ જશે) */}
      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
        <div>
          <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>From Date</label>
          <input
            type="date"
            value={reportFromDate}
            onChange={(e) => setReportFromDate(e.target.value)}
            style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>To Date</label>
          <input
            type="date"
            value={reportToDate}
            onChange={(e) => setReportToDate(e.target.value)}
            style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Expense Location</label>
          <select
            value={reportPlantFilter}
            onChange={(e) => {
              setReportPlantFilter(e.target.value);
              setSelectedPaidToFilter('All');
            }}
            style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 'bold', color: '#1e3a8a', backgroundColor: '#fff', boxSizing: 'border-box' }}
          >
            <option value="All">🌐 All (પ્લાન્ટ + સાઈટ બંને)</option>
            <option value="Plant Only">🏭 Only Plants</option>
            <option value="Site Only">🏗️ Only Sites</option>
            {plants.map((p) => (
              <option key={p.id} value={p.plant_name}>{p.plant_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Filter By Person / Vendor</label>
          <select
            value={selectedPaidToFilter}
            onChange={(e) => setSelectedPaidToFilter(e.target.value)}
            style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', fontWeight: 'bold', boxSizing: 'border-box' }}
          >
            <option value="All">All Persons / Vendors (બધા)</option>
            {uniquePaidToList.map((p, idx) => (
              <option key={idx} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 🌟 4. પ્રિન્ટેબલ ટેબલ (સાફ અને એકાઉન્ટિંગ લુક) */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #334155' }}>
              <th style={{ padding: '8px', border: '1px solid #cbd5e1', width: '85px' }}>Date</th>
              {reportPlantFilter === 'All' && (
                <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Location</th>
              )}
              <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Paid To (પાર્ટી/નામ)</th>
              <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Category / Work</th>
              <th style={{ padding: '8px', border: '1px solid #cbd5e1', width: '70px' }}>Mode</th>
              <th style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'right', width: '90px' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {filteredReportList.length === 0 ? (
              <tr>
                <td colSpan={reportPlantFilter === 'All' ? 6 : 5} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                  પસંદ કરેલી તારીખોમાં કોઈ ખર્ચ મળ્યો નથી.
                </td>
              </tr>
            ) : (
              filteredReportList.map((item, idx) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfcfc' }}>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>
                    {item.expense_date ? item.expense_date.split('-').reverse().join('/') : '-'}
                  </td>
                  {reportPlantFilter === 'All' && (
                    <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#1e3a8a' }}>
                      {item.display_location || item.plant_name}
                    </td>
                  )}
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#0f172a' }}>
                    {item.paid_to}
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', color: '#334155' }}>
                    {item.expense_category}
                    {item.remarks ? ` - ${item.remarks}` : ''}
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1' }}>
                    {item.payment_mode}
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
                    ₹ {Number(item.amount).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filteredReportList.length > 0 && (
            <tfoot>
              <tr style={{ backgroundColor: '#f8fafc', fontWeight: '900', borderTop: '2px solid #0f172a' }}>
                <td colSpan={reportPlantFilter === 'All' ? 5 : 4} style={{ padding: '10px 8px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#0f172a', fontSize: '12px' }}>
                  Grand Total (કુલ ચૂકવેલ ખર્ચ):
                </td>
                <td style={{ padding: '10px 8px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#b91c1c', fontSize: '13px' }}>
                  ₹ {totalReportAmount.toLocaleString('en-IN')}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

          </div>
        </div>
      )}

      {/* 4. EXPENSES HISTORY */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#991b1b', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={15} /> Recent Expenses History
          </h4>
          <span style={{ fontSize: '11px', fontWeight: 'bold', backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '12px' }}>
            Total Records: {expensesHistory.length}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto', paddingRight: '2px' }}>
        {/* પાછળના પેજની Recent History માં: */}
{expensesHistory
  .filter(item => !selectedPlant || item.plant_name === selectedPlant)
  .slice(0, 15)
  .map((item) => (
   
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
              <div>
                <div style={{ fontWeight: 'bold', color: '#0f172a' }}>
                  {item.expense_category} <span style={{ color: '#dc2626', fontWeight: '800' }}>₹{item.amount}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  Paid To: <strong style={{ color: '#334155' }}>{item.paid_to}</strong> | Mode: <span style={{ color: '#dc2626', fontWeight: '600' }}>{item.payment_mode}</span> | Date: {item.expense_date}
                  {item.remarks && <span style={{ color: '#94a3b8' }}> ({item.remarks})</span>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
  {item.bill_url && (
    <a href={item.bill_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '10px', fontWeight: 'bold', backgroundColor: '#dcfce7', color: '#15803d', padding: '4px 8px', borderRadius: '6px', textDecoration: 'none' }}>
      View Bill
    </a>
  )}

  {/* ✏️ Edit Button */}
  <button
    type="button"
    onClick={() => handleEditExpense(item)}
    style={{
      backgroundColor: '#eff6ff',
      color: '#2563eb',
      border: '1px solid #bfdbfe',
      padding: '4px 8px',
      borderRadius: '6px',
      fontSize: '10px',
      fontWeight: 'bold',
      cursor: 'pointer'
    }}
  >
    Edit
  </button>


</div>
            </div>
          ))}

          {expensesHistory.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px' }}>
              હાલમાં કોઈ ખર્ચ નોંધાયેલ નથી. કૃપા કરીને પ્લાન્ટ સિલેક્ટ કરો.
            </div>
          )}
        </div>
      </div>

 {/* ================= 🎯 મલ્ટી-આઇટમ સ્ટોક ઇનવર્ડ પોપઅપ ================= */}
{activeModalRowIndex !== null && (
  <div style={{
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
    zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
  }}>
    <div style={{
      width: '100%', maxWidth: '460px', maxHeight: '85vh', backgroundColor: '#ffffff',
      borderRadius: '20px', padding: '20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
      border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '14px',
      overflow: 'hidden'
    }}>
      
      {/* Header */}
      <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#1e3a8a' }}>
            📦 Plant Stock Inward Confirmation
          </h4>
          <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#64748b' }}>
            આ ટૂલ/હાર્ડવેરને પ્લાન્ટના સ્ટોકમાં જમા કરવું છે?
          </p>
        </div>
        <button 
          type="button" 
          onClick={() => setActiveModalRowIndex(null)}
          style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Buttons: Yes or No */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button"
          onClick={() => {
            const updated = [...expenseRows];
            updated[activeModalRowIndex].addToStock = true;
            if (!updated[activeModalRowIndex].stockItems || updated[activeModalRowIndex].stockItems.length === 0) {
              updated[activeModalRowIndex].stockItems = [{ id: Date.now(), selectedMaterial: '', manualMaterialName: '', qty: '' }];
            }
            setExpenseRows(updated);
          }}
          style={{
            flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
            backgroundColor: expenseRows[activeModalRowIndex]?.addToStock ? '#16a34a' : '#f1f5f9',
            color: expenseRows[activeModalRowIndex]?.addToStock ? '#ffffff' : '#334155',
            fontWeight: 'bold', fontSize: '12px', cursor: 'pointer'
          }}
        >
          ✅ હા, સ્ટોકમાં લો
        </button>
        <button
          type="button"
          onClick={() => {
            const updated = [...expenseRows];
            updated[activeModalRowIndex].addToStock = false;
            updated[activeModalRowIndex].stockItems = [{ id: Date.now(), selectedMaterial: '', manualMaterialName: '', qty: '' }];
            setExpenseRows(updated);
            setActiveModalRowIndex(null);
          }}
          style={{
            flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
            backgroundColor: !expenseRows[activeModalRowIndex]?.addToStock ? '#dc2626' : '#f1f5f9',
            color: !expenseRows[activeModalRowIndex]?.addToStock ? '#ffffff' : '#334155',
            fontWeight: 'bold', fontSize: '12px', cursor: 'pointer'
          }}
        >
          ❌ માત્ર ખર્ચ રાખો
        </button>
      </div>

      {/* Multi-Items Dynamic List */}
      {expenseRows[activeModalRowIndex]?.addToStock && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '350px', paddingRight: '2px' }}>
          {(expenseRows[activeModalRowIndex]?.stockItems || []).map((subItem, sIdx) => (
            <div key={subItem.id || sIdx} style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e3a8a' }}>Item #{sIdx + 1}</span>
                {expenseRows[activeModalRowIndex]?.stockItems.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeStockSubItem(activeModalRowIndex, sIdx)}
                    style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                  >
                    ✕ કાઢો
                  </button>
                )}
              </div>

        <div style={{ display: 'flex', gap: '6px' }}>
                      {/* ૧. મટીરીયલ સિલેક્શન */}
                      <div style={{ flex: 2 }}>
                        <select
                          value={subItem.selectedMaterial}
                          onChange={(e) => {
                            const selectedName = e.target.value;
                            updateStockSubItem(activeModalRowIndex, sIdx, 'selectedMaterial', selectedName);
                            // જો માસ્ટરમાંથી UOM મળતો હોય તો ઓટો-સેટ થશે
                            const matObj = availableMaterials.find(m => m.name === selectedName);
                            if (matObj && (matObj.unit || matObj.uom)) {
                              updateStockSubItem(activeModalRowIndex, sIdx, 'unit', matObj.unit || matObj.uom);
                            }
                          }}
                          style={{ width: '100%', padding: '7px 6px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}
                        >
                          <option value="">-- મટીરીયલ પસંદ કરો --</option>
                          {availableMaterials.map((mat) => (
                            <option key={mat.id} value={mat.name}>{mat.name}</option>
                          ))}
                          <option value="__OTHER__">➕ Other / Manual Enter</option>
                        </select>
                      </div>

                      {/* ૨. Qty ઇનપુટ */}
                      <div style={{ flex: 1 }}>
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          placeholder="Qty"
                          value={subItem.qty}
                          onChange={(e) => updateStockSubItem(activeModalRowIndex, sIdx, 'qty', e.target.value)}
                          style={{ width: '100%', padding: '7px 6px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }}
                        />
                      </div>

                      {/* 🌟 ૩. UOM ડ્રોપડાઉન */}
                      <div style={{ width: '85px' }}>
                        <select
                          value={subItem.unit || 'Nos'}
                          onChange={(e) => updateStockSubItem(activeModalRowIndex, sIdx, 'unit', e.target.value)}
                          style={{ width: '100%', padding: '7px 4px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#f1f5f9', fontWeight: 'bold', color: '#1e3a8a', boxSizing: 'border-box' }}
                        >
                          <option value="Nos">Nos</option>
                          <option value="Kg">Kg</option>
                          <option value="Ltr">Ltr</option>
                          <option value="Bag">Bag</option>
                          <option value="Box">Box</option>
                          <option value="Pkt">Pkt</option>
                          <option value="Mtr">Mtr</option>
                          <option value="Set">Set</option>
                        </select>
                      </div>
                    
              </div>

              {subItem.selectedMaterial === '__OTHER__' && (
                <div>
                  <input
                    type="text"
                    placeholder="હાથેથી નામ લખો (દા.ત. પાવડા, તગારા)"
                    value={subItem.manualMaterialName || ''}
                    onChange={(e) => updateStockSubItem(activeModalRowIndex, sIdx, 'manualMaterialName', e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }}
                  />
                </div>
              )}
            </div>
          ))}

          {/* ➕ Add Another Item Button */}
          <button
            type="button"
            onClick={() => addStockSubItem(activeModalRowIndex)}
            style={{
              alignSelf: 'flex-start', background: 'none', border: '1px dashed #2563eb',
              color: '#2563eb', padding: '6px 12px', borderRadius: '8px', fontSize: '11px',
              fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
            }}
          >
            <Plus size={13} /> + બીજી આઇટમ ઉમેરો (Add Item)
          </button>
        </div>
      )}

   {/* Done Button with Validation */}
      <button
        type="button"
        onClick={() => {
          const row = expenseRows[activeModalRowIndex];
          if (row.addToStock) {
            for (let s = 0; s < row.stockItems.length; s++) {
              const item = row.stockItems[s];
              if (!item.selectedMaterial) {
                triggerAlert(`⚠️ Item #${s + 1}: મટીરીયલ પસંદ કરો!`);
                return;
              }
              if (item.selectedMaterial === '__OTHER__' && !item.manualMaterialName?.trim()) {
                triggerAlert(`⚠️ Item #${s + 1}: મેન્યુઅલ નામ લખો!`);
                return;
              }
              if (!item.qty || Number(item.qty) <= 0) {
              triggerAlert(`⚠️ Item #${s + 1}: સાચી સંખ્યા (Qty) લખો!`);
                return;
              }
            }
          }
          setActiveModalRowIndex(null);
        }}
        style={{
          width: '100%', padding: '10px', backgroundColor: '#1e3a8a', color: '#fff',
          borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', marginTop: '4px'
        }}
      >
        Done (ઓકે)
      </button>

    </div>
  </div>
)}
{/* 🔔 Existing ConfirmModal Integration */}
<ConfirmModal
  isOpen={alertModal.isOpen}
  message={alertModal.message}
  onConfirm={() => setAlertModal({ isOpen: false, message: '' })}
  onCancel={() => setAlertModal({ isOpen: false, message: '' })}
/>
{/* 🔍 EXPENSE PREVIEW MODAL (ભૂલ અટકાવવા માટે - સ્વતંત્ર મોડલ) */}
{showPreviewModal && (
  <div style={{
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
    zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
  }}>
    <div style={{
      width: '100%', maxWidth: '520px', maxHeight: '90vh', backgroundColor: '#ffffff',
      borderRadius: '20px', padding: '20px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '14px',
      overflow: 'hidden'
    }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
            🔍 Expense Entry Preview (ચકાસણી)
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>સબમિટ કરતાં પહેલાં વિગતો ચકાસી લો</span>
        </div>
        <button
          type="button"
          onClick={() => setShowPreviewModal(false)}
          style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Plant & Date Bar */}
      <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
        <div><strong>Plant:</strong> <span style={{ color: '#1e3a8a' }}>{selectedPlant}</span></div>
        <div><strong>Date:</strong> {expenseDate.split('-').reverse().join('/')}</div>
      </div>

      {/* Expenses Breakdown */}
      <div style={{ overflowY: 'auto', maxHeight: '50vh', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '2px' }}>
        {expenseRows.map((row, idx) => {
          const isLabour = (row.expenseCategory || '').toLowerCase().includes('labour') || (row.expenseCategory || '').toLowerCase().includes('wages');
          const finalPaid = isLabour ? (row.selectedLabour || 'Labour') : (row.paidTo || 'Self');

          return (
            <div key={idx} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #fecaca', backgroundColor: '#fff5f5', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontWeight: '800', color: '#991b1b' }}>#{idx + 1} {row.expenseCategory}</span>
                <span style={{ fontSize: '14px', fontWeight: '900', color: '#dc2626' }}>₹ {Number(row.amount).toLocaleString('en-IN')}</span>
              </div>

              <div style={{ fontSize: '11px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div><strong>Paid To:</strong> {finalPaid} | <strong>Mode:</strong> {row.paymentMode}</div>
                <div><strong>Bill No:</strong> {row.billNo || '-'} | <strong>Bill Photo:</strong> {row.billFile ? '✅ Attached' : '❌ Not Attached'}</div>
                {row.remarks && <div><strong>Remarks:</strong> {row.remarks}</div>}

                {/* Stock Details */}
                {row.addToStock && row.stockItems && (
                  <div style={{ marginTop: '6px', backgroundColor: '#f0fdf4', padding: '6px 8px', borderRadius: '6px', border: '1px solid #86efac', color: '#15803d' }}>
                    <strong>📦 Stock Inward: </strong>
                    {row.stockItems.map((st, s) => (
                      <span key={s}>
                        {st.selectedMaterial === '__OTHER__' ? st.manualMaterialName : st.selectedMaterial} ({st.qty} {st.unit || 'Nos'}){s < row.stockItems.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Total Amount Summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#fee2e2', borderRadius: '10px' }}>
        <span style={{ fontWeight: 'bold', color: '#991b1b', fontSize: '12px' }}>કુલ ચૂકવવાપાત્ર રકમ (Total):</span>
        <span style={{ fontSize: '16px', fontWeight: '900', color: '#dc2626' }}>
          ₹ {expenseRows.reduce((sum, r) => sum + Number(r.amount || 0), 0).toLocaleString('en-IN')}
        </span>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
        <button
          type="button"
          onClick={() => setShowPreviewModal(false)}
          style={{
            flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid #cbd5e1',
            backgroundColor: '#f8fafc', color: '#334155', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer'
          }}
        >
          ✏️ Edit (સુધારો કરવો છે)
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={handleFinalSubmit}
          style={{
            flex: 1.4, padding: '11px', borderRadius: '10px', border: 'none',
            backgroundColor: '#16a34a', color: '#ffffff', fontWeight: 'bold', fontSize: '12px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
          }}
        >
          <Send size={14} /> {loading ? 'Saving...' : '✅ Yes, Confirm & Save'}
        </button>
      </div>

    </div>
  </div>
)}

    </div>
  );
}