import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Receipt, Send, Plus, Trash2, Clock, Upload, X } from 'lucide-react';

export default function PlantExpensesPage({ user }) {
  const [plants, setPlants] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [expensesHistory, setExpensesHistory] = useState([]);
  const [activeModalRowIndex, setActiveModalRowIndex] = useState(null); // 🎯 કઈ રો માટે પોપઅપ ચાલુ છે

  // Master Lists
  const [dbCategories, setDbCategories] = useState([]);
  const [plantLabours, setPlantLabours] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  // પોપઅપમાં નવી આઇટમ રો ઉમેરવા
const addStockSubItem = (rowIndex) => {
  const updated = [...expenseRows];
  if (!updated[rowIndex].stockItems) updated[rowIndex].stockItems = [];
  updated[rowIndex].stockItems.push({
    id: Date.now(),
    selectedMaterial: '',
    manualMaterialName: '',
    qty: ''
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
      { id: Date.now(), selectedMaterial: '', manualMaterialName: '', qty: '' }
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

  const fetchExpensesHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('plant_expenses')
        .select('*')
        .eq('plant_name', selectedPlant)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error) setExpensesHistory(data || []);
    } catch (err) {
      console.error("Expenses History Error:", err);
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
      alert("✅ બિલ સફળતાપૂર્વક અપલોડ થઈ ગયું છે!");
    } catch (err) {
      alert("Upload Error: " + err.message);
    } finally {
      updated[index].uploading = false;
      setExpenseRows(updated);
    }
  };

const handleSubmitExpenses = async (e) => {
  e.preventDefault();
  if (!selectedPlant) {
    alert("⚠️ કૃપા કરીને પહેલા પ્લાન્ટ સિલેક્ટ કરો!");
    return;
  }

  for (let i = 0; i < expenseRows.length; i++) {
    const row = expenseRows[i];
    const isHardware = (row.expenseCategory || '').toLowerCase().includes('hardware') || (row.expenseCategory || '').toLowerCase().includes('tool');
    
    // 📸 બિલ અપલોડ વેલિડેશન
    if ((isHardware || row.addToStock) && !row.billFile) {
      alert(`⚠️ એક્સપેન્સ #${i + 1}: હાર્ડવેર/ટૂલ્સ અથવા સ્ટોક એન્ટ્રી માટે બિલ/ફોટો અપલોડ કરવો ફરજિયાત છે!`);
      return;
    }

    // 📦 સ્ટોક ઇનવર્ડ વેલિડેશન (મલ્ટીપલ આઇટમ્સ માટે)
    if (row.addToStock) {
      if (!row.stockItems || row.stockItems.length === 0) {
        alert(`⚠️ એક્સપેન્સ #${i + 1}: કૃપા કરીને ઓછામાં ઓછું એક મટીરીયલ ઉમેરો!`);
        return;
      }

      for (let s = 0; s < row.stockItems.length; s++) {
        const item = row.stockItems[s];
        
        if (!item.selectedMaterial) {
          alert(`⚠️ એક્સપેન્સ #${i + 1} (Item #${s + 1}): કૃપા કરીને મટીરીયલ પસંદ કરો!`);
          return;
        }

        if (item.selectedMaterial === '__OTHER__' && !item.manualMaterialName?.trim()) {
          alert(`⚠️ એક્સપેન્સ #${i + 1} (Item #${s + 1}): કૃપા કરીને મટીરિયલનું મેન્યુઅલ નામ દાખલ કરો!`);
          return;
        }

        if (!item.qty || Number(item.qty) <= 0) {
          alert(`⚠️ એક્સપેન્સ #${i + 1} (Item #${s + 1}): કૃપા કરીને સાચી સ્ટોક સંખ્યા (Qty) દાખલ કરો!`);
          return;
        }
      }
    }
  }

  // આગળનું સેવ કરવાનું લોજિક (જેમ હતું તેમ જ)...

    const { data: { session } } = await supabase.auth.getSession();
    const currentLoggedUser = session?.user?.email || session?.user?.id || user?.email || user?.id || 'Admin';

    setLoading(true);
    try {
      const expenseInsertRows = [];
      const stockLedgerRows = [];

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
// ૨. સ્ટોક લેજર ઇનવર્ડ એન્ટ્રી (મલ્ટીપલ આઇટમ્સ લૂપ)
if (row.addToStock && row.stockItems && row.stockItems.length > 0) {
  for (const subItem of row.stockItems) {
    if (subItem.qty && Number(subItem.qty) > 0) {
      const finalMaterialName = subItem.selectedMaterial === '__OTHER__' 
        ? (subItem.manualMaterialName?.trim() || 'General Tool') 
        : subItem.selectedMaterial;

      stockLedgerRows.push({
        date: expenseDate,
        plant_name: selectedPlant,
        material_name: finalMaterialName,
        transaction_type: 'INWARD',
        qty: Number(subItem.qty),
        unit: 'Nos'
      });
    }
  }
}
      }

      const { error: expErr } = await supabase.from('plant_expenses').insert(expenseInsertRows);
      if (expErr) throw expErr;

      if (stockLedgerRows.length > 0) {
        const { error: stockErr } = await supabase.from('material_stock_ledger').insert(stockLedgerRows);
        if (stockErr) throw stockErr;
      }

      alert("✅ ખર્ચ સફળતાપૂર્વક સેવ થઈ ગયો છે અને ઓટો-ઇનવર્ડ સ્ટોક જમા થઈ ગયો છે!");

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
          qty: ''
        }
      ]);

      fetchExpensesHistory();
    } catch (err) {
      alert("Error: " + err.message);
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
      <form onSubmit={handleSubmitExpenses} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                        flex: 1, padding: '6px 8px', backgroundColor: (isHardware || row.addToStock) && !row.billFile ? '#ffeeee' : '#f1f5f9', 
                        border: `1px solid ${(isHardware || row.addToStock) && !row.billFile ? '#dc2626' : '#cbd5e1'}`, 
                        borderRadius: '6px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#334155', fontWeight: '600' 
                      }}>
                        <Upload size={13} /> {row.uploading ? 'Uploading...' : (row.billFile ? '✅ Bill Attached' : ((isHardware || row.addToStock) ? '⚠️ Bill Required' : 'Attach Bill'))}
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

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '10px',
                backgroundColor: '#dc2626',
                color: '#fff',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Send size={15} /> {loading ? 'Processing...' : 'Submit Expenses'}
            </button>
          </div>
        </div>
      </form>

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
          {expensesHistory.map((item) => (
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
                  <a href={item.bill_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '10px', fontWeight: 'bold', backgroundColor: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '6px', textDecoration: 'none' }}>
                    View Bill
                  </a>
                )}
                <span style={{ fontSize: '10px', fontWeight: 'bold', backgroundColor: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  {item.bill_no !== '-' ? `Bill: ${item.bill_no}` : 'No Bill'}
                </span>
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

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 2 }}>
                  <select
                    value={subItem.selectedMaterial}
                    onChange={(e) => updateStockSubItem(activeModalRowIndex, sIdx, 'selectedMaterial', e.target.value)}
                    style={{ width: '100%', padding: '7px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff' }}
                  >
                    <option value="">-- મટીરીયલ પસંદ કરો --</option>
                    {availableMaterials.map((mat) => (
                      <option key={mat.id} value={mat.name}>{mat.name}</option>
                    ))}
                    <option value="__OTHER__">➕ Other / Manual Enter</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={subItem.qty}
                    onChange={(e) => updateStockSubItem(activeModalRowIndex, sIdx, 'qty', e.target.value)}
                    style={{ width: '100%', padding: '7px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }}
                  />
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
                alert(`⚠️ Item #${s + 1}: મટીરીયલ પસંદ કરો!`);
                return;
              }
              if (item.selectedMaterial === '__OTHER__' && !item.manualMaterialName?.trim()) {
                alert(`⚠️ Item #${s + 1}: મેન્યુઅલ નામ લખો!`);
                return;
              }
              if (!item.qty || Number(item.qty) <= 0) {
                alert(`⚠️ Item #${s + 1}: સાચી સંખ્યા (Qty) લખો!`);
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
    </div>
  );
}