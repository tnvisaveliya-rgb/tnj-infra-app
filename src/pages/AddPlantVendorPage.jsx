import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, Edit2, Check, X, Eye, Filter, Phone, FileDown, Building, Factory } from 'lucide-react'

import ConfirmModal from '../components/ConfirmModal';

const statesList = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", 
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", 
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

function AddPlantVendorPage() {
  const { user } = useAuth()
  const [qtyPerLine, setQtyPerLine] = useState(''); // 👈 નવું સ્ટેટ
  const [sites, setSites] = useState([])
  const [plants, setPlants] = useState([])
  const [transferForm, setTransferForm] = useState({ id: '', name: '', mobile: '', plant_id: '', site_name: '' });
  const [plantName, setPlantName] = useState('')
  const [plantLocation, setPlantLocation] = useState('')
  const [plantManager, setPlantManager] = useState('')
const [effectiveDate, setEffectiveDate] = useState('');
  const [selectedPlantId, setSelectedPlantId] = useState('')
  const [siteName, setSiteName] = useState('')
  const [siteAddress, setSiteAddress] = useState('')
  const [siteState, setSiteState] = useState('')
  const [sitePhone, setSitePhone] = useState('')
  const [plantState, setPlantState] = useState(''); // 👈 નવું સ્ટેટ
  const [selectedPlantState, setSelectedPlantState] = useState(''); // 👈 સાઇટ ફોર્મ માટે સ્ટેટ ફિલ્ટર
  const [formStateFilter, setFormStateFilter] = useState(''); // ફોર્મની અંદર સ્ટેટ ફિલ્ટર કરવા માટે
const [formPlantFilter, setFormPlantFilter] = useState(''); // ફોર્મની અંદર પ્લાન્ટ ફિલ્ટર કરવા માટે   
const [expectedM3, setExpectedM3] = useState(''); 
const [editId, setEditId] = useState(null); 
const [materialItemType, setMaterialItemType] = useState('Raw Material'); // 👈 નવું સ્ટેટ
// સપ્લાયર ફોર્મમાં મલ્ટીપલ મટીરિયલ એડ કરવા માટેનું એરે સ્ટેટ
const [supplierMaterialsList, setSupplierMaterialsList] = useState([
  { materialName: '' }
]);
// 🧭 નવું સ્ટેટ: નેવિગેશન માટે (મેનુ, પ્લાન્ટ્સ, સાઈટ્સ વગેરે)
  const [activeScreen, setActiveScreen] = useState('menu'); 
  const [editingPlantId, setEditingPlantId] = useState(null);
  const [editPlantForm, setEditPlantForm] = useState({ plant_name: '', location: '', manager_name: '', state: '' });
// 1. કન્ફર્મ મોડલ માટેનું સ્ટેટ

const [modalConfig, setModalConfig] = useState({
  isOpen: false,
  title: 'Alert',
  message: '',
  onConfirm: null,
  isConfirmType: false
});

// 2. આ એક જ ફંક્શન આખા પ્રોગ્રામના બધા જ alert ને હેન્ડલ કરી લેશે
const [filterSitePlant, setFilterSitePlant] = useState('all'); // પ્લાન્ટ ફિલ્ટર માટે
const [searchSiteQuery, setSearchSiteQuery] = useState('');     // સર્ચ બોક્સ માટે
const [editingSiteId, setEditingSiteId] = useState(null);      // એડિટ કરવા માટે સાઈટ આઈડી
const [editSiteForm, setEditSiteForm] = useState({ site_name: '', address: '', state: '', phone: '' }); //
const [filterListViewState, setFilterListViewState] = useState('all'); // વ્યુ લિસ્ટ માટે સ્ટેટ ફિલ્ટર
const [filterListViewPlant, setFilterListViewPlant] = useState('all'); // વ્યુ લિસ્ટ માટે પ્લાન્ટ ફિલ્ટર
const [searchListQuery, setSearchListQuery] = useState('');           // વ્યુ લિસ્ટ માટે સર્ચ બોક્સ
const [editingListType, setEditingListType] = useState(null);         // કયું ટેબલ એડિટ થાય છે (દા.ત. 'vendors')
const [editingListId, setEditingListId] = useState(null);             // એડિટ થતી આઈડી
const [editListForm, setEditListForm] = useState({ name: '', company_name: '', mobile: '', state: '' }); // એડિટ ફોર્મ
const showAlert = (message, title = "Notification", onConfirmCallback = null) => {
  setModalConfig({
    isOpen: true,
    title: title,
    message: message,
    isConfirmType: false,
    onConfirm: onConfirmCallback
  });
};
const [transporterName, setTransporterName] = useState('');
const [transporterVehicles, setTransporterVehicles] = useState([
  { vehicleNo: '', driverName: '', phone: '' }
]);

  const [vendors, setVendors] = useState([])
  const [outwardParties, setOutwardParties] = useState([])
  const [contractors, setContractors] = useState([])
  const [materials, setMaterials] = useState([])
  const [workDescriptions, setWorkDescriptions] = useState([])
  const [products, setProducts] = useState([]) 
const [WorkName, setWorkName] = useState('');
  const [WorkSize, setWorkSize] = useState('');
  const [WorkCategory, setWorkCategory] = useState('');


  const [productName, setProductName] = useState('') 
  const [productSize, setProductSize] = useState('') 
  const [productCategory, setProductCategory] = useState('') 
  const [bomItems, setBomItems] = useState([{ material: '', consumption: '', unit: 'Nos' }]) 
const [filterPlantState, setFilterPlantState] = useState('all'); // પ્લાન્ટના સ્ટેટ ફિલ્ટર માટે
const [searchPlantQuery, setSearchPlantQuery] = useState('');    // પ્લાન્ટ સર્ચ કરવા માટે
  const [activeModal, setActiveModal] = useState(null)
  const [showViewSection, setShowViewSection] = useState(false)
  const [showSiteListSection, setShowSiteListSection] = useState(false)
  // 🎯 Expense Categories Master State
const [expenseCategories, setExpenseCategories] = useState([]);
const [newExpenseCatName, setNewExpenseCatName] = useState('');
const [editingCatId, setEditingCatId] = useState(null);
const [editingCatName, setEditingCatName] = useState('');
const [transporters, setTransporters] = useState([]);
  const [viewTab, setViewTab] = useState('vendors')
  const [filterViewSite, setFilterViewSite] = useState('all')
  const [filterSiteState, setFilterSiteState] = useState('all')
const [sitePartyName, setSitePartyName] = useState('');
  const [assignTarget, setAssignTarget] = useState('site') 
  const [formPlantId, setFormPlantId] = useState('all')
  const [formSite, setFormSite] = useState('all')
  const [formName, setFormName] = useState('')
  const [formCompanyName, setFormCompanyName] = useState('')
  const [formMobile, setFormMobile] = useState('')

  // 🎯 મલ્ટીપલ રેટ એડ કરવા માટેનું સ્ટેટ (Multiple Rates Array)
  const [labourRatesList, setLabourRatesList] = useState([
    { workType: 'Product Rate', product: '', size: '', uom: 'Nos', rate: '', effectiveDate: new Date().toISOString().split('T')[0] }
  ])

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    const { data: plantsData } = await supabase.from('plants').select('*')
    setPlants(plantsData || [])
const { data: expCatData } = await supabase
  .from('expense_category_master')
  .select('*')
  .order('category_name', { ascending: true });
setExpenseCategories(expCatData || []);

    const { data: sitesData } = await supabase.from('sites').select('*, plants(plant_name)')
    setSites(sitesData || [])
    // 🌟 2. દરેક સાઇટ માટે તેના તમામ Work અને BOM ફેચ કરો
    if (sitesData) {
      for (let site of sitesData) {
        const { data: bomData } = await supabase
          .from('site_bom')
          .select('*')
          .eq('site_name', site.site_name);
        
        site.works_list = bomData || [];
      }
    }
    setSites(sitesData || [])


    const { data: vData } = await supabase.from('site_vendors').select('*')
    setVendors(vData || [])

    const { data: oData } = await supabase.from('site_outward_parties').select('*')
    setOutwardParties(oData || [])

    const { data: cData } = await supabase.from('contractors').select('*')
    setContractors(cData || [])

    const { data: mData } = await supabase.from('site_materials_master').select('*')
    setMaterials(mData || [])

    const { data: wData } = await supabase.from('site_work_descriptions').select('*')
    setWorkDescriptions(wData || [])

    const { data: pData } = await supabase.from('plant_work_descriptions').select('*')
    setProducts(pData || [])
    const { data: tData } = await supabase.from('site_transporters').select('*');
setTransporters(tData || []);
  }
  

 const handleSavePlant = async () => {
    if (!plantName.trim()) { showAlert("Please enter plant name!"); return; }
    if (!plantState) { showAlert("કૃપા કરીને રાજ્ય (State) સિલેક્ટ કરો!"); return; } // 👈 ફરજિયાત ચેક
    
    const payload = { 
      plant_name: plantName.trim(), 
      location: plantLocation.trim() || '', 
      manager_name: plantManager.trim() || '',
      state: plantState // 👈 ડેટાબેઝમાં સ્ટેટ સેવ થશે
    }

    const { error } = await supabase.from('plants').insert([payload])
    if (error) showAlert("Error: " + error.message)
    else { 
      showAlert("Plant Added Successfully!"); 
      setPlantName(''); setPlantLocation(''); setPlantManager(''); setPlantState(''); 
      setActiveModal(null); 
      await loadAllData(); 
    }
  }
  // 🏭 નવું ઉમેરેલું ફંક્શન: પ્લાન્ટ લિસ્ટમાંથી અપડેટ કરવા માટે
  const handleUpdatePlant = async (id) => {
    if (!editPlantForm.plant_name.trim()) { showAlert("Please enter plant name!"); return; }
    
    const { error } = await supabase.from('plants').update({
        plant_name: editPlantForm.plant_name.trim(),
        location: editPlantForm.location.trim() || '',
        manager_name: editPlantForm.manager_name.trim() || '',
        state: editPlantForm.state || ''
      }).eq('id', id);

    if (error) {
      showAlert("Error updating plant: " + error.message);
    } else {
      showAlert("✅ Plant Successfully Updated!");
      setEditingPlantId(null);
      loadAllData();
    }
  };
  // ૧. Add New Category
const handleAddExpenseCategory = async () => {
  if (!newExpenseCatName.trim()) {
    showAlert("Please enter category name!");
    return;
  }
  const { error } = await supabase
    .from('expense_category_master')
    .insert([{ category_name: newExpenseCatName.trim(), is_active: true }]);

  if (error) {
    showAlert("Error: " + error.message);
  } else {
    showAlert("✅ Expense Category Added!");
    setNewExpenseCatName('');
    loadAllData();
  }
};

// ૨. Soft Delete / Toggle Status (Active / Inactive)
const handleToggleCategoryActive = async (id, currentStatus) => {
  const { error } = await supabase
    .from('expense_category_master')
    .update({ is_active: !currentStatus })
    .eq('id', id);

  if (error) {
    showAlert("Error updating status: " + error.message);
  } else {
    loadAllData();
  }
};

// ૩. Rename / Update Category
const handleUpdateExpenseCategory = async (id) => {
  if (!editingCatName.trim()) {
    showAlert("Category name cannot be empty!");
    return;
  }
  const { error } = await supabase
    .from('expense_category_master')
    .update({ category_name: editingCatName.trim() })
    .eq('id', id);

  if (error) {
    showAlert("Error: " + error.message);
  } else {
    setEditingCatId(null);
    loadAllData();
  }
};
const handleSaveSite = async () => {
    if (!selectedPlantId) { showAlert("કૃપા કરીને પહેલા પ્લાન્ટ સિલેક્ટ કરો!"); return; }
    if (!sitePartyName) { showAlert("કૃપા કરીને પાર્ટી સિલેક્ટ કરો!"); return; } 
    if (!siteName.trim()) { showAlert("Please enter site name!"); return; }
    if (!siteState) { showAlert("Please select state!"); return; }
    
    // 🌟 જો Work Name કે Work Size ભરેલી હોય તો તેનું પણ વેલિડેશન કરી શકાય
    if (!WorkName.trim()) { showAlert("Please enter Work Name!"); return; }
    if (!WorkSize.trim()) { showAlert("Please enter Work Size!"); return; }

    const exists = sites.some(s => s.site_name.trim().toLowerCase() === siteName.trim().toLowerCase())
    if (exists) { showAlert("This site is already existing!"); return; }

    // ૧. પહેલો પેલોડ: મેઈન સાઇટ 'sites' ટેબલ માટે
    const sitePayload = { 
      plant_id: selectedPlantId, 
      party_name: sitePartyName.trim(), 
      site_name: siteName.trim(), 
      address: siteAddress.trim() || '', 
      state: siteState.trim(), 
      phone: sitePhone.trim() || ''
    }

    const { error: siteError } = await supabase.from('sites').insert([sitePayload])
    
    if (siteError) {
      showAlert("Error saving site: " + siteError.message);
      return;
    } 

    // ૨. બીજો પેલોડ: BOM અને Work ની વિગતો 'site_bom' ટેબલ માટે
    if (WorkName.trim() && WorkSize.trim()) {
      const bomPayload = {
        site_name: siteName.trim(),
        work_name: WorkName.trim(),
        work_size: WorkSize.trim(),
        work_category: WorkCategory ? WorkCategory.trim() : '',
        expected_m3: expectedM3 ? parseFloat(expectedM3) : null,
        effective_date: effectiveDate || new Date().toISOString().split('T')[0],
        bom_items: bomItems || [] // 🌟 મટીરિયલનું આખું લિસ્ટ JSON ફોર્મેટમાં સેવ થશે
      }

      const { error: bomError } = await supabase.from('site_bom').insert([bomPayload]);
      
      if (bomError) {
        console.error("Error saving site BOM:", bomError);
        showAlert("સાઇટ સેવ થઈ ગઈ, પણ BOM ડેટા સેવ કરવામાં એરર આવી: " + bomError.message);
        return;
      }
    }

    // ૩. સફળતાપૂર્વક બધું સેવ થયા પછી ફોર્મ રિસેટ કરવું
    showAlert("Site & BOM Added Successfully!"); 
    setSelectedPlantId(''); 
    setSitePartyName(''); 
    setSiteName(''); 
    setSiteAddress(''); 
    setSiteState(''); 
    setSitePhone(''); 
    setWorkName('');
    setWorkSize('');
    setWorkCategory('');
    setExpectedM3('');
    setEffectiveDate(new Date().toISOString().split('T')[0]);
    setBomItems([{ material: '', consumption: '', unit: 'Nos' }]);
    setActiveModal(null); 
    await loadAllData(); 
  }


const handleSaveModalData = async () => {
    if (!formName.trim()) { showAlert("Please enter name!"); return; }
    
    // 🎯 અહીંથી 'all' વાળી શરત હટાવી દીધી છે, જેથી All Plants સિલેક્ટ કરવા પર એરર ન આવે
  if (activeModal !== 'party') {
      // 🎯 જો assignTarget 'plant' હોય, અને પ્લાન્ટ સિલેક્ટ ન કર્યો હોય (અને 'all' પણ ન હોય તો જ અટકવું)
      if (assignTarget === 'plant' && (!formPlantFilter || formPlantFilter === '')) { showAlert("Please select plant!"); return; }
      if (assignTarget === 'site' && !formSite) { showAlert("Please select site!"); return; }
      if (assignTarget === 'both' && ((!formPlantFilter || formPlantFilter === '') || !formSite)) { showAlert("Please select both plant and site!"); return; }
    }

    let tableName = '';
    if (activeModal === 'supplier') tableName = 'site_vendors';
    else if (activeModal === 'party') tableName = 'site_outward_parties';
    else if (activeModal === 'labour') tableName = 'contractors';
    else if (activeModal === 'material') tableName = 'site_materials_master';
    else if (activeModal === 'description') tableName = 'site_work_descriptions';

    // 🎯 1. ડુપ્લિકેટ નામ ચેક કરવાનું લોજિક (લેબર અને પાર્ટી બંને માટે)
    if (activeModal === 'labour' || activeModal === 'party') {
      const { data: existingData, error: searchErr } = await supabase
        .from(tableName)
        .select('name')
        .ilike('name', formName.trim());

      if (searchErr) {
        showAlert("Error checking duplicate: " + searchErr.message);
        return;
      }

      if (existingData && existingData.length > 0) {
        showAlert("❌ આ નામની એન્ટ્રી પહેલેથી જ અવેલેબલ છે! ડુપ્લિકેટ એન્ટ્રી બંધ છે.");
        return;
      }
    }

    // 2. પ્લાન્ટ અને સાઈટનું નામ નક્કી કરવું
    let targetPlantId = (!formPlantFilter || formPlantFilter === 'all') ? null : formPlantFilter;
    
    let targetSiteName = 'General';
    if (activeModal === 'party') {
      targetSiteName = 'Plant Level (General)';
    } else if (assignTarget === 'plant') {
      if (formPlantFilter && formPlantFilter !== 'all') {
        const plantObj = (plants || []).find(p => p.id === formPlantFilter);
        targetSiteName = plantObj ? plantObj.plant_name : 'Plant Level';
      } else {
        targetSiteName = 'All Plants (General)';
      }
    } else if (assignTarget === 'site' || assignTarget === 'both') {
      targetSiteName = (formSite === 'all' ? 'All Sites (General)' : formSite);
    }

  // 3. ડેટાબેઝમાં સેવ કરવા માટેનો પ્લેલોડ
    const payload = { 
      plant_id: targetPlantId, 
      name: formName.trim(), 
      state: formStateFilter || '', 
      
      // 🎯 જો મટીરિયલ ન હોય તો જ company_name અને mobile સેવ થશે
      ...(activeModal !== 'material' && { 
        company_name: formCompanyName.trim() || '', 
        mobile: formMobile.trim() || '' 
      }),
      
      // 🎯 activeModal === 'party' હોય ત્યારે site_name ડેટાબેઝમાં જશે નહીં
      ...(activeModal !== 'party' && { site_name: targetSiteName }),
      
      // 🎯 જો મટીરિયલ હોય તો item_type સેવ થશે
      ...(activeModal === 'material' && { item_type: materialItemType }), 
      
      // 🎯 જો સપ્લાયર હોય તો મટીરિયલ્સની લિસ્ટ JSON એરે તરીકે સેવ થશે
      ...(activeModal === 'supplier' && { 
        materials_supplied: supplierMaterialsList.map(m => m.materialName).filter(Boolean) 
      })
    };

    const { error: saveErr } = await supabase.from(tableName).insert([payload]);

    if (saveErr) {
     showAlert("Save Error: " + saveErr.message);
      return;
    }
    
    // 4. જો લેબર હોય તો તેના મલ્ટીપલ રેટ્સ સેવ કરવા
    if (activeModal === 'labour') {
      const plantObj = plants.find(p => p.id === formPlantFilter);
      const plantNameStr = plantObj ? plantObj.plant_name : 'General';

      for (let item of labourRatesList) {
        if (item.rate) {
          const { error: rateErr } = await supabase.from('labour_product_rates').insert([{
            plant_name: plantNameStr,
            team_name: formName.trim(),
            work_type: item.workType,
            product_name: item.workType === 'Product Rate' ? item.product : 'Other Department Work',
            product_size: item.workType === 'Product Rate' ? item.size : '-',
            uom: item.uom,
            rate: Number(item.rate),
            effective_from: item.effectiveDate
          }]);

          if (rateErr) {
           showAlert("Rate Save Error: " + rateErr.message);
            return;
          }
        }
      }
    }

   showAlert("✅ Successfully Added!"); 
    setActiveModal(null); 
    setAssignTarget('site'); 
    setFormSite('all'); 
    setFormPlantFilter('all'); 
    setFormStateFilter('');
    setFormName(''); 
    setFormCompanyName(''); 
    setFormMobile(''); 
    setMaterialItemType('Raw Material'); 
    setSupplierMaterialsList([{ materialName: '' }]); 
    setLabourRatesList([{ workType: 'Product Rate', product: '', size: '', uom: 'Nos', rate: '', effectiveDate: new Date().toISOString().split('T')[0] }]);
    loadAllData(); 
  }
const handleSaveProduct = async () => {
    if (!productName.trim()) { showAlert("Please enter product name!"); return; }
    
    let targetPlantId = !formPlantFilter || formPlantFilter === 'all' ? null : formPlantFilter;
    let selectedStateVal = formStateFilter || '';

    let targetSiteName = 'General';
    if (assignTarget === 'plant') {
      if (formPlantFilter && formPlantFilter !== 'all') {
        const plantObj = (plants || []).find(p => p.id === formPlantFilter);
        targetSiteName = plantObj ? plantObj.plant_name : 'Plant Level';
      } else {
        targetSiteName = 'All Plants (General)';
      }
    } else if (assignTarget === 'site' || assignTarget === 'both') {
      targetSiteName = (formSite === 'all' ? 'All Sites (General)' : formSite);
    }

    const payload = {
      site_name: targetSiteName,
      plant_id: targetPlantId,
      state: selectedStateVal,
      name: productName.trim(),
      product_size: productSize.trim(),
      product_category: productCategory.trim(),
      expected_m3: expectedM3 ? Number(expectedM3) : 0,
      effective_date: effectiveDate || new Date().toISOString().split('T')[0], // 👈 Effective Date સેટ થઈ ગઈ
      bom_items: bomItems,
      qty_per_line: (productName.toLowerCase().includes('panel') || productName.toLowerCase().includes('pa')) && qtyPerLine ? Number(qtyPerLine) : 30 // 👈 ડેટાબેઝમાં સેવ થશે
    };

    let error;
    if (editId) {
      const res = await supabase.from('plant_work_descriptions').update(payload).eq('id', editId);
      error = res.error;
    } else {
      const res = await supabase.from('plant_work_descriptions').insert([payload]);
      error = res.error;
    }

    if (error) {
      showAlert("Error: " + error.message);
    } else {
      showAlert(editId ? "✅ Product Successfully Updated!" : "✅ Product & BOM Successfully Added!");
      setActiveModal(null); 
      setEditId(null); 
      setAssignTarget('site'); 
      setFormSite('all'); 
      setFormPlantFilter('all'); 
      setProductName(''); 
      setProductSize(''); 
      setProductCategory(''); 
      setExpectedM3('');
      setEffectiveDate('');
      setQtyPerLine('');
      setBomItems([{ material: '', consumption: '', unit: 'Nos' }]); 
      loadAllData();
    }
  };
 const handleSaveTransporter = async () => {
    if (!transporterName.trim()) { showAlert("Please enter transporter name!"); return; }
    
   // 🎯 અહીં પણ 'all' ને વેલિડ એન્ટ્રી ગણવી, માત્ર એકદમ ખાલી હોય તો જ અટકવું
    if (assignTarget === 'plant' && (!formPlantFilter || formPlantFilter === '')) { showAlert("Please select plant!"); return; }
    if (assignTarget === 'site' && !formSite) { showAlert("Please select site!"); return; }
    if (assignTarget === 'both' && ((!formPlantFilter || formPlantFilter === '') || !formSite)) { showAlert("Please select both plant and site!"); return; }

    // 🎯 ૧. ડુપ્લિકેટ ટ્રાન્સપોર્ટર ચેક કરવાનું લોજિક
    const { data: existingTrans, error: searchErr } = await supabase
      .from('site_transporters')
      .select('transporter_name')
      .ilike('transporter_name', transporterName.trim());

    if (searchErr) {
      showAlert("Error checking duplicate: " + searchErr.message);
      return;
    }

    if (existingTrans && existingTrans.length > 0) {
      showAlert("❌ આ નામનું ટ્રાન્સપોર્ટ પહેલેથી જ અવેલેબલ છે! ડુપ્લિકેટ એન્ટ્રી બંધ છે.");
      return;
    }

    // 🎯 ૨. પ્લાન્ટ અને સાઈટનું નામ નક્કી કરવું (Both માટે કમ્બાઈન્ડ નામ)
    let targetPlantId = (!formPlantFilter || formPlantFilter === 'all') ? null : formPlantFilter;
    
    let targetSiteName = 'General';
    if (assignTarget === 'plant') {
      if (formPlantFilter && formPlantFilter !== 'all') {
        const plantObj = (plants || []).find(p => p.id === formPlantFilter);
        targetSiteName = plantObj ? `Plant: ${plantObj.plant_name}` : 'Plant Level';
      } else {
        targetSiteName = 'All Plants (General)';
      }
    } else if (assignTarget === 'site') {
      targetSiteName = (formSite === 'all' ? 'All Sites (General)' : formSite);
    } else if (assignTarget === 'both') {
      const plantObj = (plants || []).find(p => p.id === formPlantFilter);
      const plantStr = plantObj ? plantObj.plant_name : 'Plant';
      const siteStr = formSite === 'all' ? 'All Sites' : formSite;
      targetSiteName = `${plantStr} + ${siteStr}`; // 👈 હવે પ્લાન્ટ અને સાઈટ બંને દેખાશે
    }

    const payload = {
      plant_id: targetPlantId,
      site_name: targetSiteName,
      state: formStateFilter || '',
      transporter_name: transporterName.trim(),
      company_name: formCompanyName.trim() || '',
      mobile: formMobile.trim() || '',
      vehicles_list: transporterVehicles.filter(v => v.vehicleNo.trim() !== '')
    };

    const { error } = await supabase.from('site_transporters').insert([payload]);

    if (error) {
      showAlert("Error saving transporter: " + error.message);
    } else {
      showAlert("✅ Transporter & Vehicles Successfully Added!");
      setActiveModal(null);
      setTransporterName('');
      setFormCompanyName('');
      setFormMobile('');
      setTransporterVehicles([{ vehicleNo: '', driverName: '', phone: '' }]);
      setAssignTarget('site');
      setFormSite('all');
      setFormPlantFilter('all');
      setFormStateFilter('');
      loadAllData();
    }
  };
const handleUpdateSite = async (id) => {
    if (!editSiteForm.site_name.trim()) { 
      showAlert("Please enter site name!"); 
      return; 
    }

    // 🎯 ૧. ડુપ્લિકેટ નામ ચેક કરવું (પોતાની આઈડી છોડીને)
    const { data: duplicateCheck, error: checkErr } = await supabase
      .from('sites')
      .select('id, site_name')
      .ilike('site_name', editSiteForm.site_name.trim())
      .neq('id', id);

    if (checkErr) {
      showAlert("Error checking duplicate: " + checkErr.message);
      return;
    }

    if (duplicateCheck && duplicateCheck.length > 0) {
      showAlert("❌ આ નામની સાઈટ પહેલેથી જ અવેલેબલ છે! ડુપ્લિકેટ એન્ટ્રી બંધ છે.");
      return;
    }

    // 🎯 ૨. 'sites' ટેબલ અપડેટ કરવું
    const { error: siteErr } = await supabase
      .from('sites')
      .update({
        site_name: editSiteForm.site_name.trim(),
        address: editSiteForm.address ? editSiteForm.address.trim() : '',
        state: editSiteForm.state,
        phone: editSiteForm.phone ? editSiteForm.phone.trim() : ''
      })
      .eq('id', id);

    if (siteErr) {
      showAlert("Error updating site: " + siteErr.message);
      return;
    }

    // 🎯 ૩. 'site_bom' ટેબલ માટે જૂના રેકોર્ડ ડિલીટ કરી નવા બધા જ વર્ક ઇન્સર્ટ કરવા
    const oldSiteName = sites.find(s => s.id === id)?.site_name;
    if (oldSiteName) {
      await supabase.from('site_bom').delete().eq('site_name', oldSiteName);
    }

    if (Array.isArray(editSiteForm.works_list) && editSiteForm.works_list.length > 0) {
      const rowsToInsert = editSiteForm.works_list.map(w => ({
        site_name: editSiteForm.site_name.trim(),
        work_name: w.work_name ? w.work_name.trim() : 'General Work',
        work_size: w.work_size ? w.work_size.trim() : '-',
        work_category: w.work_category ? w.work_category.trim() : '-',
        expected_m3: w.expected_m3 ? parseFloat(w.expected_m3) : null,
        effective_date: new Date().toISOString().split('T')[0],
        bom_items: w.bom_items || []
      }));

      const { error: bomErr } = await supabase.from('site_bom').insert(rowsToInsert);
      if (bomErr) {
        console.error("Error inserting BOM works:", bomErr);
      }
    }

    showAlert("✅ Site & All Works BOM Successfully Updated!");
    setEditingSiteId(null);
    loadAllData();
  };
const handleGenericUpdate = async (tableName, id, formData) => {
  if (!formData.name || !formData.name.trim()) { 
    showAlert("Please enter name!"); 
    return; 
  }

  // 🎯 જો ટેબલ પ્લેન્ટ વર્ક ડિસ્ક્રિપ્શન હોય તો નામ + સાઇઝ બંને ચેક કરવા અથવા ડુપ્લિકેટ ચેકને ટેબલ મુજબ સેફ કરવો
  if (tableName === 'plant_work_descriptions') {
    const { data: duplicateCheck, error: checkErr } = await supabase
      .from(tableName)
      .select('id, name, product_size')
      .ilike('name', formData.name.trim())
      .eq('product_size', formData.product_size || '')
      .neq('id', id); // 👈 પોતાની આઈડી છોડીને જ ચેક કરશે

    if (checkErr) {
      showAlert("Error checking duplicate: " + checkErr.message);
      return;
    }

    if (duplicateCheck && duplicateCheck.length > 0) {
      showAlert("❌ આ નામ અને સાઇઝની એન્ટ્રી પહેલેથી જ અવેલેબલ છે!");
      return;
    }
  }

  // ડેટાબેઝ અપડેટ કરો
  const { error } = await supabase
    .from(tableName)
    .update(formData)
    .eq('id', id);

  if (error) {
    showAlert("Error updating: " + error.message);
  } else {
    showAlert("✅ Successfully Updated!");
    setEditingListId(null);
    loadAllData();
  }
};
  const handleTransporterUpdate = async (id, formData) => {
    if (!formData.transporter_name || !formData.transporter_name.trim()) {
      showAlert("Please enter transporter name!");
      return;
    }

    const payload = {
      transporter_name: formData.transporter_name.trim(),
      company_name: formData.company_name ? formData.company_name.trim() : '',
      mobile: formData.mobile ? formData.mobile.trim() : '',
      vehicles_list: Array.isArray(formData.vehicles_list) ? formData.vehicles_list.filter(v => v.vehicleNo && v.vehicleNo.trim() !== '') : []
    };

    const { error } = await supabase
      .from('site_transporters')
      .update(payload)
      .eq('id', id);

    if (error) {
      showAlert("Error updating transporter: " + error.message);
    } else {
      showAlert("✅ Transporter Successfully Updated!");
      setEditingListId(null);
      loadAllData();
    }
  };
const handleLabourUpdate = async (contractorId, formData) => {
    if (!formData.name || !formData.name.trim()) { 
      showAlert("Please enter Labour/Team name!"); 
      return; 
    }

    // 1. ડેટાબેઝમાંથી જૂનો રેકોર્ડ શોધો
    const { data: oldData, error: fetchError } = await supabase
      .from('contractors')
      .select('*')
      .eq('id', contractorId)
      .single();

    if (fetchError) {
      showAlert("Error fetching record: " + fetchError.message);
      return;
    }

    // 2. ચેક કરો કે પ્લાન્ટ અથવા સાઇટ બદલાયા છે કે નહીં
    const oldPlantId = oldData.plant_id ? oldData.plant_id.toString() : '';
    const newPlantId = formData.plant_id ? formData.plant_id.toString() : '';
    
    const isPlantChanged = oldPlantId !== newPlantId;
    const isSiteChanged = oldData.site_name && formData.site_name && (oldData.site_name !== formData.site_name);

    let targetContractorId = contractorId;

    if (isPlantChanged || isSiteChanged) {
      // 🎯 3. જો લોકેશન બદલાયું હોય (Transfer):
      // A. જૂના રેકોર્ડને ઇનએક્ટિવ કરો (જેથી હિસ્ટ્રી અને રિપોર્ટ સેફ રહે, પણ લિસ્ટમાં ન દેખાય)
      await supabase
        .from('contractors')
        .update({ is_active: false })
        .eq('id', contractorId);

      // B. નવા લોકેશન માટે નવો એક્ટિવ રેકોર્ડ INSERT કરો
      const insertPayload = {
        name: formData.name.trim(),
        company_name: formData.company_name ? formData.company_name.trim() : '',
        mobile: formData.mobile ? formData.mobile.trim() : '',
        plant_id: formData.plant_id && formData.plant_id !== 'All Plant (General)' ? formData.plant_id : null,
        site_name: formData.site_name || 'All Sites (General)',
        state: formData.state || '',
        is_active: true
      };

      const { data: newRec, error: insertErr } = await supabase
        .from('contractors')
        .insert([insertPayload])
        .select()
        .single();
      
      if (insertErr) {
        showAlert("Error transferring labour: " + insertErr.message);
        return;
      }

      targetContractorId = newRec.id;
      showAlert("✅ સફળતાપૂર્વક નવા લોકેશન પર ટ્રાન્સફર થઈ ગયું (જૂની હિસ્ટ્રી રિપોર્ટ માટે સુરક્ષિત છે)!");
    } else {
      // 🎯 4. જો લોકેશન એનું એ જ હોય, તો સાદી રીતે UPDATE કરો
      const updatePayload = {
        name: formData.name.trim(),
        company_name: formData.company_name ? formData.company_name.trim() : '',
        mobile: formData.mobile ? formData.mobile.trim() : '',
        plant_id: formData.plant_id && formData.plant_id !== 'All Plant (General)' ? formData.plant_id : null,
        site_name: formData.site_name || 'All Sites (General)'
      };

      const { error: updateErr } = await supabase
        .from('contractors')
        .update(updatePayload)
        .eq('id', contractorId);

      if (updateErr) {
        showAlert("Error updating labour: " + updateErr.message);
        return;
      }
      showAlert("✅ સફળતાપૂર્વક અપડેટ થઈ ગયું!");
    }

   // 5. રેટ્સ મેપિંગ અપડેટ કે ઇન્સર્ટ કરો
    if (Array.isArray(formData.rates_mapping)) {
      for (let rateRow of formData.rates_mapping) {
        if (!rateRow.rate) continue;

        // 🎯 અહીં plant_id પરથી સાચું પ્લાન્ટ નામ શોધો
        const matchedPlant = (plants || []).find(p => p.id.toString() === (formData.plant_id ? formData.plant_id.toString() : ''));
        const plantNameStr = matchedPlant ? matchedPlant.plant_name : (formData.plant_name || 'T&J INFRA');

        const ratePayload = {
          plant_name: plantNameStr, // 👈 હવે નવું પ્લાન્ટ નામ પરફેક્ટ સેવ થશે
          team_name: formData.name.trim(),
          work_type: rateRow.work_type || 'Product Rate',
          product_name: rateRow.work_type === 'Product Rate' ? (rateRow.product_name || '') : 'Other Department Work',
          product_size: rateRow.work_type === 'Product Rate' ? (rateRow.product_size || rateRow.size || '') : '-',
          uom: rateRow.uom || 'Nos',
          rate: Number(rateRow.rate),
          effective_from: rateRow.effective_from || new Date().toISOString().split('T')[0]
        };

        if (rateRow.id) {
          await supabase.from('labour_product_rates').update(ratePayload).eq('id', rateRow.id);
        } else {
          await supabase.from('labour_product_rates').insert([ratePayload]);
        }
      }
    }

    setEditingListId(null);
    if (typeof loadAllData === 'function') loadAllData();
  };
 const handleDelete = async (table, id) => {
    if (!window.confirm("Are you sure you want to delete this?")) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) showAlert("Error deleting: " + error.message)
    else { loadAllData(); showAlert("Deleted successfully!") }
  }

  const handleDeleteSite = async (id) => {
    if (!window.confirm("Are you sure you want to delete this site?")) return
    const { error } = await supabase.from('sites').delete().eq('id', id)
    if (error) showAlert("Error deleting site: " + error.message)
    else { loadAllData(); showAlert("Site deleted successfully!") }
  }

const availableProductsForPlant = products.filter(p => {
    // જો પ્લાન્ટ સિલેક્ટ ન કર્યો હોય તો બધી જ બતાવવી
    if (!formPlantFilter || formPlantFilter === 'all') return true;

    const selectedPlantObj = (plants || []).find(pl => pl.id.toString() === formPlantFilter.toString());
    const plantNameStr = selectedPlantObj ? selectedPlantObj.plant_name.trim().toLowerCase() : '';

    const prodPlantId = p.plant_id ? p.plant_id.toString() : '';
    const prodSiteName = p.site_name ? p.site_name.trim().toLowerCase() : '';

    // ૧. જો પ્રોડક્ટની plant_id સિલેક્ટ કરેલા પ્લાન્ટ સાથે મેચ થતી હોય
    const isPlantIdMatch = prodPlantId === formPlantFilter.toString();

    // ૨. જો site_name માં પ્લાન્ટનું નામ આવતું હોય
    const isSiteNameMatch = plantNameStr && prodSiteName.includes(plantNameStr);

    // ૩. 🌟 સૌથી મહત્ત્વનું: જો એન્ટ્રી "All Plants (General)" અથવા "General" હોય તો તે પણ બતાવવી
    const isGeneral = prodSiteName.includes('all plants') || prodSiteName.includes('general') || !p.plant_id;

    return isPlantIdMatch || isSiteNameMatch || isGeneral;
  });
  const filteredPlantsForSite = (plants || []).filter(p => 
    !selectedPlantState || p.state === selectedPlantState
  );

const availablePlantsForForm = (plants || []).filter(p => {
    // જો સ્ટેટ સિલેક્ટ જ ન કર્યું હોય અથવા All States હોય તો બધા પ્લાન્ટ્સ બતાવવા
    if (!formStateFilter || formStateFilter === 'all' || formStateFilter === 'All States (General)') {
      return true;
    }
    // બાકી માત્ર એ જ પ્લાન્ટ બતાવવા જેનું સ્ટેટ સિલેક્ટ કરેલા સ્ટેટ સાથે મેચ થતું હોય
    return p.state && p.state.trim().toLowerCase() === formStateFilter.trim().toLowerCase();
  });

  const availableSitesForForm = (sites || []).filter(s => 
    !formPlantFilter || formPlantFilter === 'all' || s.plant_id == formPlantFilter
  );

 // 1. View Sites માટે ફિલ્ટર
  const filteredSites = (sites || []).filter(s => {
    // 🎯 સાઇટના લિસ્ટને સ્ટેટથી ફિલ્ટર નથી કરવું, સ્ટેટ માત્ર પ્લાન્ટ શોધવા માટે છે.
    const matchesPlant = filterSitePlant === 'all' || s.plant_id == filterSitePlant;
    
    const matchesSearch = !searchSiteQuery || 
      s.site_name.toLowerCase().includes(searchSiteQuery.toLowerCase()) || 
      (s.address && s.address.toLowerCase().includes(searchSiteQuery.toLowerCase()));
      
    return matchesPlant && matchesSearch; // 👈 અહીંથી matchesState કાઢી નાખ્યું
  });

  const availableMaterials = materials.filter(m => 
    formSite === 'all' || m.site_name === formSite || m.site_name === 'All Sites (General)' || m.site_name === 'Plant Level (General)'
  );

  // ----------------------------------------------------
  // 🎯 VIEW LISTS માટેના કમ્બાઈન્ડ ફિલ્ટર્સ (State, Site અને Search સાથે)
  // ----------------------------------------------------

// 1. Suppliers / Vendors Filter
  const filteredVendors = (vendors || []).filter(v => {
    const siteObj = (sites || []).find(s => s.site_name === v.site_name);
    const materialPlantId = v.plant_id || (siteObj ? siteObj.plant_id : null);
    const plantObj = (plants || []).find(p => p.id == materialPlantId);
    const materialState = v.state || (siteObj ? siteObj.state : null) || (plantObj ? plantObj.state : null);

    const matchesState = filterListViewState === 'all' || 
      (materialState && materialState.trim().toLowerCase() === filterListViewState.trim().toLowerCase());
    
    const matchesPlant = filterListViewPlant === 'all' || 
      (materialPlantId == filterListViewPlant);
    
    const matchesSite = filterViewSite === 'all' || 
      v.site_name === filterViewSite || 
      v.site_name === 'All Sites (General)' || 
      v.site_name === 'Plant Level (General)' ||
      v.site_name === 'T&J INFRA';

    const matchesSearch = !searchListQuery || 
      v.name.toLowerCase().includes(searchListQuery.toLowerCase()) || 
      (v.company_name && v.company_name.toLowerCase().includes(searchListQuery.toLowerCase()));
    
    return matchesState && matchesPlant && matchesSite && matchesSearch;
  });

 // 2. Parties Filter
  const filteredParties = (outwardParties || []).filter(p => {
    const siteObj = (sites || []).find(s => s.site_name === p.site_name);
    const materialPlantId = p.plant_id || (siteObj ? siteObj.plant_id : null);
    const plantObj = (plants || []).find(pObj => pObj.id == materialPlantId);
    const materialState = p.state || (siteObj ? siteObj.state : null) || (plantObj ? plantObj.state : null);

    const matchesState = filterListViewState === 'all' || 
      (materialState && materialState.trim().toLowerCase() === filterListViewState.trim().toLowerCase());
    
    const matchesPlant = filterListViewPlant === 'all' || 
      (materialPlantId == filterListViewPlant);
    
    const matchesSite = filterViewSite === 'all' || 
      p.site_name === filterViewSite || 
      p.site_name === 'All Sites (General)' || 
      p.site_name === 'Plant Level (General)' ||
      p.site_name === 'T&J INFRA';

    const matchesSearch = !searchListQuery || 
      p.name.toLowerCase().includes(searchListQuery.toLowerCase());
    
    return matchesState && matchesPlant && matchesSite && matchesSearch;
  });

 // 3. Contractors / Labours Filter
const filteredContractors = (contractors || []).filter(c => {
    // 🎯 ૧. સૌથી પહેલી અને કડક શરત: જો લેબર ઇનએક્ટિવ હોય (false), તો તેને ક્યારેય બતાવવું નહીં
    if (c.is_active === false || c.is_active === 'false') return false;

    // 🎯 ૨. જો ડેટાબેઝમાં is_active કૉલમ હજુ અપડેટ ન થઈ હોય કે ખાલી હોય તો પણ સેફટી માટે ચેક
    if (c.plant_id && filterListViewPlant !== 'all' && c.plant_id.toString() !== filterListViewPlant.toString()) {
      return false;
    }
    const siteObj = (sites || []).find(s => s.site_name === c.site_name);
    const materialPlantId = c.plant_id || (siteObj ? siteObj.plant_id : null);
    const plantObj = (plants || []).find(p => p.id == materialPlantId);
    const materialState = c.state || (siteObj ? siteObj.state : null) || (plantObj ? plantObj.state : null);

    const matchesState = filterListViewState === 'all' || 
      (materialState && materialState.trim().toLowerCase() === filterListViewState.trim().toLowerCase());
    
    const matchesPlant = filterListViewPlant === 'all' || 
      (materialPlantId == filterListViewPlant);
    
    const matchesSite = filterViewSite === 'all' || 
      c.site_name === filterViewSite || 
      c.site_name === 'All Sites (General)' || 
      c.site_name === 'Plant Level (General)' ||
      c.site_name === 'T&J INFRA';

    const matchesSearch = !searchListQuery || 
      c.name.toLowerCase().includes(searchListQuery.toLowerCase());
    
    return matchesState && matchesPlant && matchesSite && matchesSearch;
  });

// 4. Materials Filter (પરફેક્ટ સ્ટેટ અને પ્લાન્ટ મેચિંગ સાથે)
  const filteredMaterials = (materials || []).filter(m => {
    // સાઈટ ઓબ્જેક્ટ શોધો
    const siteObj = (sites || []).find(s => s.site_name === m.site_name);
    
    // મટીરિયલની પોતાની પાસે રહેલું plant_id અથવા siteObj નું plant_id
    const materialPlantId = m.plant_id || (siteObj ? siteObj.plant_id : null);
    
    // પ્લાન્ટ ઓબ્જેક્ટ શોધો (સ્ટેટ મેળવવા માટે)
    const plantObj = (plants || []).find(p => p.id == materialPlantId);
    
    // સાઈટ, મટીરિયલ કે પ્લાન્ટમાંથી ગમે ત્યાંથી સ્ટેટ મેળવો
    const materialState = m.state || (siteObj ? siteObj.state : null) || (plantObj ? plantObj.state : null);

    // ૧. સ્ટેટનું ફિલ્ટર (Case-insensitive સરખામણી)
    const matchesState = filterListViewState === 'all' || 
      (materialState && materialState.trim().toLowerCase() === filterListViewState.trim().toLowerCase());

    // ૨. પ્લાન્ટનું ફિલ્ટર
    const matchesPlant = filterListViewPlant === 'all' || 
      (materialPlantId == filterListViewPlant);

    // ૩. સાઈટનું ફિલ્ટર
    const matchesSite = filterViewSite === 'all' || 
      m.site_name === filterViewSite || 
      m.site_name === 'All Sites (General)' || 
      m.site_name === 'Plant Level (General)' ||
      m.site_name === 'T&J INFRA';

    // ૪. સર્ચ બારનું ફિલ્ટર
    const matchesSearch = !searchListQuery || 
      (m.name && m.name.toLowerCase().includes(searchListQuery.toLowerCase()));

    return matchesState && matchesPlant && matchesSite && matchesSearch;
  });
// 7. Transporters Filter
  const filteredTransporters = (transporters || []).filter(t => {
    const siteObj = (sites || []).find(s => s.site_name === t.site_name);
    const materialPlantId = t.plant_id || (siteObj ? siteObj.plant_id : null);
    const plantObj = (plants || []).find(p => p.id == materialPlantId);
    const materialState = t.state || (siteObj ? siteObj.state : null) || (plantObj ? plantObj.state : null);

    const matchesState = filterListViewState === 'all' || 
      (materialState && materialState.trim().toLowerCase() === filterListViewState.trim().toLowerCase());
    
    const matchesPlant = filterListViewPlant === 'all' || 
      (materialPlantId == filterListViewPlant);
    
    const matchesSite = filterViewSite === 'all' || 
      t.site_name === filterViewSite || 
      t.site_name === 'All Sites (General)' || 
      t.site_name === 'Plant Level (General)' ||
      t.site_name === 'T&J INFRA';

    const matchesSearch = !searchListQuery || 
      t.transporter_name.toLowerCase().includes(searchListQuery.toLowerCase()) ||
      (t.company_name && t.company_name.toLowerCase().includes(searchListQuery.toLowerCase()));
    
    return matchesState && matchesPlant && matchesSite && matchesSearch;
  });
  // 5. Work Descriptions Filter
  const filteredWorkDescriptions = (workDescriptions || []).filter(w => {
    const siteObj = (sites || []).find(s => s.site_name === w.site_name);
    const materialPlantId = w.plant_id || (siteObj ? siteObj.plant_id : null);
    const plantObj = (plants || []).find(p => p.id == materialPlantId);
    const materialState = w.state || (siteObj ? siteObj.state : null) || (plantObj ? plantObj.state : null);

    const matchesState = filterListViewState === 'all' || 
      (materialState && materialState.trim().toLowerCase() === filterListViewState.trim().toLowerCase());
    
    const matchesPlant = filterListViewPlant === 'all' || 
      (materialPlantId == filterListViewPlant);
    
    const matchesSite = filterViewSite === 'all' || 
      w.site_name === filterViewSite || 
      w.site_name === 'All Sites (General)' || 
      w.site_name === 'Plant Level (General)' ||
      w.site_name === 'T&J INFRA';

    const matchesSearch = !searchListQuery || 
      w.name.toLowerCase().includes(searchListQuery.toLowerCase());
    
    return matchesState && matchesPlant && matchesSite && matchesSearch;
  });

  // 6. Products Filter
  const filteredProducts = (products || []).filter(p => {
    const siteObj = (sites || []).find(s => s.site_name === p.site_name);
    const materialPlantId = p.plant_id || (siteObj ? siteObj.plant_id : null);
    const plantObj = (plants || []).find(pObj => pObj.id == materialPlantId);
    const materialState = p.state || (siteObj ? siteObj.state : null) || (plantObj ? plantObj.state : null);

    const matchesState = filterListViewState === 'all' || 
      (materialState && materialState.trim().toLowerCase() === filterListViewState.trim().toLowerCase());
    
    const matchesPlant = filterListViewPlant === 'all' || 
      (materialPlantId == filterListViewPlant) || 
      (siteObj && siteObj.plant_id == filterListViewPlant);
    
    const matchesSite = filterViewSite === 'all' || 
      p.site_name === filterViewSite || 
      p.site_name === 'All Sites (General)' || 
      p.site_name === 'Plant Level (General)' ||
      p.site_name === 'T&J INFRA';

    const matchesSearch = !searchListQuery || 
      p.name.toLowerCase().includes(searchListQuery.toLowerCase()) || 
      (p.product_size && p.product_size.toLowerCase().includes(searchListQuery.toLowerCase())) ||
      (p.product_category && p.product_category.toLowerCase().includes(searchListQuery.toLowerCase()));
    
    return matchesState && matchesPlant && matchesSite && matchesSearch;
  });

// 🎯 નવું લોજિક: ટાઈટલ અને મોડલ સિલેક્શન
  const getScreenTitle = () => {
    if (activeScreen === 'vendors') return '🏢 Suppliers List';
    if (activeScreen === 'parties') return '🚚 Customers / Parties List';
    if (activeScreen === 'contractors') return '👷 Labours List';
    if (activeScreen === 'materials') return '📦 Materials List';
    if (activeScreen === 'WorkDescriptions') return '📝 Work Descriptions List';
    if (activeScreen === 'products') return '🏷️ Products List';
    if (activeScreen === 'transporters') return '🚛 Transporters List';
    return '';
  };

  const getAddModalType = () => {
    if (activeScreen === 'vendors') return 'supplier';
    if (activeScreen === 'parties') return 'party';
    if (activeScreen === 'contractors') return 'labour';
    if (activeScreen === 'materials') return 'material';
    if (activeScreen === 'WorkDescriptions') return 'description';
    if (activeScreen === 'products') return 'product';
    if (activeScreen === 'transporters') return 'transport';
    return null;
  };

  const isListScreen = ['vendors', 'parties', 'contractors', 'materials', 'WorkDescriptions', 'products','transporters' ].includes(activeScreen);


return (
    <div style={{ maxWidth: '650px', margin: '0 auto', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}>
      
    {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* ⬅️ સ્માર્ટ Back બટન */}
          <button 
            onClick={() => {
              if (activeScreen !== 'menu') {
                setActiveScreen('menu'); // જો કોઈ લિસ્ટમાં હોય તો મેનુ પર પાછા જશે
              } else {
                window.history.back(); // જો મેનુ પર જ હોય તો આખા પેજની બહાર જશે (અથવા અહી onBack() લખી શકો છો)
              }
            }}
            style={{ 
              backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', 
              padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', 
              fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.2s'
            }}
          >
            ← Back
          </button>

          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building size={20} color="#2563eb" /> Master Management
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b' }}>પ્લાન્ટ્સ, સાઈટ્સ, અને પાર્ટીઓને અહીંથી મેનેજ કરો.</p>
          </div>
        </div>

      </div>

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        isConfirmType={modalConfig.isConfirmType}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        onConfirm={() => {
          if (modalConfig.onConfirm) modalConfig.onConfirm();
          setModalConfig({ ...modalConfig, isOpen: false });
        }}
      />

      {/* -------------------------------------------------------- */}
      {/* 🧭 MAIN NAVIGATION & SCREENS (ULTRA COMPACT 2-COLUMN GRID) */}
      {/* -------------------------------------------------------- */}
      {activeScreen === 'menu' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
          
          {/* 🏗️ વિભાગ 1: Infrastructure */}
          <div>
            <h3 style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', paddingLeft: '2px' }}>
              Core Infrastructure
            </h3>
            {/* 🎯 અહી 1fr 1fr કરવાથી ફિક્સ ૨ કોલમ થઈ ગઈ અને gap 8px કરી દીધો */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              
              <div onClick={() => setActiveScreen('plants')} style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px' }}>🏭</div>
                  <div style={{ color: '#cbd5e1', fontSize: '14px', fontWeight: 'bold' }}>›</div>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '11px', color: '#0f172a', fontWeight: 'bold' }}>Manage Plants</h4>
                  <p style={{ margin: 0, fontSize: '9px', color: '#64748b' }}>ઉમેરો અથવા સુધારો</p>
                </div>
              </div>

              <div onClick={() => setActiveScreen('sites')} style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px' }}>🏗️</div>
                  <div style={{ color: '#cbd5e1', fontSize: '14px', fontWeight: 'bold' }}>›</div>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '11px', color: '#0f172a', fontWeight: 'bold' }}>Manage Sites</h4>
                  <p style={{ margin: 0, fontSize: '9px', color: '#64748b' }}>નવી સાઇટ/લોકેશન</p>
                </div>
              </div>

            </div>
          </div>

          {/* 🤝 વિભાગ 2: People & Network */}
          <div>
            <h3 style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', paddingLeft: '2px' }}>
              People & Network
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              
              <div onClick={() => setActiveScreen('vendors')} style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #fdf4ff 0%, #fbcfe8 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px' }}>🏢</div>
                  <div style={{ color: '#cbd5e1', fontSize: '14px', fontWeight: 'bold' }}>›</div>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '11px', color: '#0f172a', fontWeight: 'bold' }}>Suppliers</h4>
                  <p style={{ margin: 0, fontSize: '9px', color: '#64748b' }}>લિસ્ટ મેનેજ કરો</p>
                </div>
              </div>

              <div onClick={() => setActiveScreen('parties')} style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px' }}>🤝</div>
                  <div style={{ color: '#cbd5e1', fontSize: '14px', fontWeight: 'bold' }}>›</div>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '11px', color: '#0f172a', fontWeight: 'bold' }}>Parties</h4>
                  <p style={{ margin: 0, fontSize: '9px', color: '#64748b' }}>આઉટવર્ડ પાર્ટી મેનેજ</p>
                </div>
              </div>

              <div onClick={() => setActiveScreen('contractors')} style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px' }}>👷</div>
                  <div style={{ color: '#cbd5e1', fontSize: '14px', fontWeight: 'bold' }}>›</div>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '11px', color: '#0f172a', fontWeight: 'bold' }}>Labours</h4>
                  <p style={{ margin: 0, fontSize: '9px', color: '#64748b' }}>ટીમ અને રેટ્સ</p>
                </div>
              </div>

             <div onClick={() => setActiveScreen('transporters')} style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #f0f9ff 0%, #bae6fd 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px' }}>🚛</div>
    <div style={{ color: '#cbd5e1', fontSize: '14px', fontWeight: 'bold' }}>›</div>
  </div>
  <div>
    <h4 style={{ margin: '0 0 2px 0', fontSize: '11px', color: '#0f172a', fontWeight: 'bold' }}>Transporters</h4>
    <p style={{ margin: 0, fontSize: '9px', color: '#64748b' }}>લિસ્ટ મેનેજ કરો</p>
  </div>
</div>

            

            </div>
          </div>

          {/* 📦 વિભાગ 3: Inventory & Operations */}
          <div>
            <h3 style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', paddingLeft: '2px' }}>
              Inventory & Operations
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              
              <div onClick={() => setActiveScreen('materials')} style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px' }}>📦</div>
                  <div style={{ color: '#cbd5e1', fontSize: '14px', fontWeight: 'bold' }}>›</div>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '11px', color: '#0f172a', fontWeight: 'bold' }}>Materials</h4>
                  <p style={{ margin: 0, fontSize: '9px', color: '#64748b' }}>રો-મટીરીયલ લિસ્ટ</p>
                </div>
              </div>

              <div onClick={() => setActiveScreen('products')} style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #ecfeff 0%, #a5f3fc 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px' }}>🏷️</div>
                  <div style={{ color: '#cbd5e1', fontSize: '14px', fontWeight: 'bold' }}>›</div>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '11px', color: '#0f172a', fontWeight: 'bold' }}>Products</h4>
                  <p style={{ margin: 0, fontSize: '9px', color: '#64748b' }}>પ્રોડક્ટ્સ અને BOM</p>
                </div>
              </div>

              <div onClick={() => setActiveScreen('WorkDescriptions')} style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #fefce8 0%, #fde047 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px' }}>📝</div>
                  <div style={{ color: '#cbd5e1', fontSize: '14px', fontWeight: 'bold' }}>›</div>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '11px', color: '#0f172a', fontWeight: 'bold' }}>Descriptions</h4>
                  <p style={{ margin: 0, fontSize: '9px', color: '#64748b' }}>કામની વિગતો</p>
                </div>
              </div>

              <div onClick={() => setActiveModal('expenseCategory')} style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #f0fdfa 0%, #99f6e4 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px' }}>💳</div>
                  <div style={{ color: '#14b8a6', fontSize: '16px', fontWeight: 'bold' }}>+</div>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '11px', color: '#0f172a', fontWeight: 'bold' }}>Expense Cat.</h4>
                  <p style={{ margin: 0, fontSize: '9px', color: '#0d9488', fontWeight: '600' }}>+ Direct Add</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}
{/* -------------------------------------------------------- */}
    {/* -------------------------------------------------------- */}
      {/* 🏭 PLANT MANAGEMENT SCREEN */}
      {/* -------------------------------------------------------- */}
      {activeScreen === 'plants' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
          
          {/* 🎯 Header Card */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🏭 Plants List
            </h3>
            <button onClick={() => setActiveModal('plant')} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={14} /> Add New Plant
            </button>
          </div>

          {/* 🎯 Filters (State + Search) */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={filterPlantState} onChange={(e) => setFilterPlantState(e.target.value)} style={{ flex: '1 1 120px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', fontWeight: '600', boxSizing: 'border-box' }}>
              <option value="all">🌐 All States</option>
              {statesList.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
            
            <input placeholder="🔍 Search plant name or location..." value={searchPlantQuery} onChange={(e) => setSearchPlantQuery(e.target.value)} style={{ flex: '2 1 140px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
          </div>

          {/* 🎯 List Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(() => {
              // અહી ડેટા ફિલ્ટર થઈ રહ્યો છે
              const filteredPlantsList = (plants || []).filter(p => {
                const matchesState = filterPlantState === 'all' || p.state === filterPlantState;
                const matchesSearch = !searchPlantQuery || p.plant_name.toLowerCase().includes(searchPlantQuery.toLowerCase()) || (p.location && p.location.toLowerCase().includes(searchPlantQuery.toLowerCase()));
                return matchesState && matchesSearch;
              });

              if (filteredPlantsList.length === 0) {
                return <p style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '20px' }}>No plants found.</p>;
              }

              return filteredPlantsList.map(p => (
                <div key={p.id} style={{ display: 'flex', flexDirection: 'column', padding: '14px', backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  
                  {editingPlantId === p.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <input placeholder="Plant Name" value={editPlantForm.plant_name} onChange={(e) => setEditPlantForm({ ...editPlantForm, plant_name: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '12px' }} />
                      <div style={{ display: 'flex', gap: '8px' }}>
                       
                        <input placeholder="Location" value={editPlantForm.location} onChange={(e) => setEditPlantForm({ ...editPlantForm, location: e.target.value })} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '12px' }} />
                      </div>
                      <input placeholder="Manager Name" value={editPlantForm.manager_name} onChange={(e) => setEditPlantForm({ ...editPlantForm, manager_name: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '12px' }} />
                      
                     {/* 🎯 બટન્સ: Delete (ડાબી બાજુ) અને Update & Cancel (જમણી બાજુ) */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                        
                        {/* ડાબી બાજુનું ડીલીટ બટન */}
                        <button 
                          onClick={() => handleDelete('plants', p.id)} 
                          style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                        
                        {/* જમણી બાજુના Update અને Cancel બટન */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => setEditingPlantId(null)} 
                            style={{ backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => handleUpdatePlant(p.id)} 
                            style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Check size={14} /> Update
                          </button>
                        </div>

                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '14px' }}>{p.plant_name}</span>
                        {p.state && <span style={{ fontSize: '10px', backgroundColor: '#e0f2fe', color: '#0284c7', padding: '3px 8px', borderRadius: '6px', marginLeft: '8px', fontWeight: '600' }}>{p.state}</span>}
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                          Manager: {p.manager_name || 'N/A'} | Loc: {p.location || 'N/A'}
                        </div>
                      </div>
                     {/* 🎯 ફક્ત Edit બટન (Delete અંદર આપી દીધું છે) */}
                      <div style={{ display: 'flex' }}>
                        <button 
                          onClick={() => { setEditingPlantId(p.id); setEditPlantForm({ plant_name: p.plant_name, location: p.location || '', manager_name: p.manager_name || '', state: p.state || '' }); }} 
                          style={{ 
                            background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', 
                            padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', 
                            display: 'flex', alignItems: 'center', gap: '6px', 
                            fontWeight: 'bold', fontSize: '11px' 
                          }}
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ));
            })()}
          </div>
        </div>
      )}


      {/* -------------------------------------------------------- */}
      {/* 🏗️ SITES MANAGEMENT SCREEN */}
      {/* -------------------------------------------------------- */}
      {activeScreen === 'sites' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
          
          {/* 🎯 Header Card */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>🏢 Sites List</h3>
            <button onClick={() => setActiveModal('site')} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={14} /> Add New Site
            </button>
          </div>

          {/* 🎯 Filters */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={filterSiteState} onChange={(e) => { setFilterSiteState(e.target.value); setFilterSitePlant('all'); }} style={{ flex: '1 1 120px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', fontWeight: '600', boxSizing: 'border-box' }}>
              <option value="all">🌐 All States</option>
              {statesList.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
           {/* 🎯 સાચું Plant Filter (જે માત્ર Sites ના લિસ્ટને જ ફિલ્ટર કરશે) */}
            <select 
              value={filterSitePlant} 
              onChange={(e) => setFilterSitePlant(e.target.value)} 
              style={{ flex: '1 1 120px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}
            >
              <option value="all">🌐 All Plants</option>
              {(plants || [])
                .filter(p => filterSiteState === 'all' || p.state === filterSiteState) // જો State સિલેક્ટ કર્યું હોય તો જ તે સ્ટેટના પ્લાન્ટ બતાવશે
                .map(p => <option key={p.id} value={p.id}>{p.plant_name}</option>)
              }
            </select>
            <input placeholder="🔍 Search site name..." value={searchSiteQuery} onChange={(e) => setSearchSiteQuery(e.target.value)} style={{ flex: '2 1 140px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
          </div>

          {/* 🎯 List Items */}
          <div>
            {filteredSites.length === 0 ? <p style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '20px' }}>No sites found.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredSites.map(s => {
                  const plantObj = (plants || []).find(p => p.id === s.plant_id);
                  return (
                    <div key={s.id} style={{ display: 'flex', flexDirection: 'column', padding: '14px', backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', boxSizing: 'border-box' }}>
          {editingSiteId === s.id ? (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
    <input placeholder="Site Name" value={editSiteForm.site_name || ''} onChange={(e) => setEditSiteForm({ ...editSiteForm, site_name: e.target.value })} style={{ padding: '8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #94a3b8' }} />
    <input placeholder="Address" value={editSiteForm.address || ''} onChange={(e) => setEditSiteForm({ ...editSiteForm, address: e.target.value })} style={{ padding: '8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #94a3b8' }} />
    <input placeholder="Phone" value={editSiteForm.phone || ''} onChange={(e) => setEditSiteForm({ ...editSiteForm, phone: e.target.value })} style={{ padding: '8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #94a3b8' }} />

    {/* 🌟 મલ્ટીપલ વર્ક સોર્સ લિસ્ટ */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0369a1' }}>🏗️ Work & BOM Sources</span>
      <button type="button" onClick={() => {
        const currentWorks = Array.isArray(editSiteForm.works_list) ? editSiteForm.works_list : [];
        setEditSiteForm({
          ...editSiteForm,
          works_list: [...currentWorks, { work_name: '', work_size: '', work_category: '', expected_m3: '', bom_items: [{ material: '', consumption: '', unit: 'Nos' }] }]
        });
      }} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>+ Add Source (Work)</button>
    </div>

    {(Array.isArray(editSiteForm.works_list) ? editSiteForm.works_list : []).map((work, wIdx) => (
      <div key={wIdx} style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Work Source #{wIdx + 1}</span>
          {editSiteForm.works_list.length > 1 && (
            <button type="button" onClick={() => {
              const updated = editSiteForm.works_list.filter((_, i) => i !== wIdx);
              setEditSiteForm({ ...editSiteForm, works_list: updated });
            }} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Remove Source</button>
          )}
        </div>

        {/* Work Name & Work Size */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <div>
            <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Work Name *</label>
            <input placeholder="e.g. Column" value={work.work_name || ''} onChange={(e) => {
              const updated = [...editSiteForm.works_list];
              updated[wIdx].work_name = e.target.value;
              setEditSiteForm({ ...editSiteForm, works_list: updated });
            }} style={{ padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Work Size *</label>
            <input placeholder="e.g. 8" value={work.work_size || ''} onChange={(e) => {
              const updated = [...editSiteForm.works_list];
              updated[wIdx].work_size = e.target.value;
              setEditSiteForm({ ...editSiteForm, works_list: updated });
            }} style={{ padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Work Category & Expected M3 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <div>
            <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Category *</label>
            <input placeholder="Category" value={work.work_category || ''} onChange={(e) => {
              const updated = [...editSiteForm.works_list];
              updated[wIdx].work_category = e.target.value;
              setEditSiteForm({ ...editSiteForm, works_list: updated });
            }} style={{ padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Expected M³ *</label>
            <input type="number" step="0.001" placeholder="M3" value={work.expected_m3 || ''} onChange={(e) => {
              const updated = [...editSiteForm.works_list];
              updated[wIdx].expected_m3 = e.target.value;
              setEditSiteForm({ ...editSiteForm, works_list: updated });
            }} style={{ padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* 🌟 1. નવું: Effective Date ઇનપુટ બોક્સ */}
        <div>
          <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Effective From Date *</label>
          <input type="date" value={work.effective_date || new Date().toISOString().split('T')[0]} onChange={(e) => {
            const updated = [...editSiteForm.works_list];
            updated[wIdx].effective_date = e.target.value;
            setEditSiteForm({ ...editSiteForm, works_list: updated });
          }} style={{ padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', width: '100%', boxSizing: 'border-box' }} />
        </div>

        {/* BOM Items for this Work */}
        <div style={{ backgroundColor: '#fff', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#0891b2' }}>📦 BOM Materials</span>
            <button type="button" onClick={() => {
              const updated = [...editSiteForm.works_list];
              updated[wIdx].bom_items.push({ material: '', consumption: '', unit: 'Nos' });
              setEditSiteForm({ ...editSiteForm, works_list: updated });
            }} style={{ backgroundColor: '#0891b2', color: '#fff', border: 'none', padding: '2px 6px', borderRadius: '3px', fontSize: '9px', cursor: 'pointer' }}>+ Add Material</button>
          </div>

          {(work.bom_items || []).map((bom, bIdx) => (
            <div key={bIdx} style={{ display: 'flex', gap: '4px', marginBottom: '4px', alignItems: 'center' }}>
              <select value={bom.material || ''} onChange={(e) => {
                const updated = [...editSiteForm.works_list];
                updated[wIdx].bom_items[bIdx].material = e.target.value;
                setEditSiteForm({ ...editSiteForm, works_list: updated });
              }} style={{ flex: 2, padding: '4px', fontSize: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}>
                <option value="">-- Material --</option>
                {(materials || []).map(mat => <option key={mat.id} value={mat.name}>{mat.name}</option>)}
              </select>
              
              <input type="number" placeholder="Qty" value={bom.consumption || ''} onChange={(e) => {
                const updated = [...editSiteForm.works_list];
                updated[wIdx].bom_items[bIdx].consumption = e.target.value;
                setEditSiteForm({ ...editSiteForm, works_list: updated });
              }} style={{ flex: 1, padding: '4px', fontSize: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />

              <select value={bom.unit || 'Nos'} onChange={(e) => {
                const updated = [...editSiteForm.works_list];
                updated[wIdx].bom_items[bIdx].unit = e.target.value;
                setEditSiteForm({ ...editSiteForm, works_list: updated });
              }} style={{ flex: 1, padding: '4px', fontSize: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}>
                <option value="Nos">Nos</option>
                <option value="Bags">Bags</option>
                <option value="Kg">Kg</option>
              
              </select>

              {work.bom_items.length > 1 && (
                <button type="button" onClick={() => {
                  const updated = [...editSiteForm.works_list];
                  updated[wIdx].bom_items = updated[wIdx].bom_items.filter((_, i) => i !== bIdx);
                  setEditSiteForm({ ...editSiteForm, works_list: updated });
                }} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}>✕</button>
              )}
            </div>
          ))}
        </div>

      </div>
    ))}

    {/* Buttons */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
      <button onClick={() => handleDeleteSite(s.id)} style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Trash2 size={14} /> Delete
      </button>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => setEditingSiteId(null)} style={{ backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
        <button onClick={() => handleUpdateSite(s.id)} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Check size={14} /> Update
        </button>
      </div>
    </div>
  </div>
) : (
  
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '14px' }}>{s.site_name}</span>
                            {plantObj && <span style={{ fontSize: '11px', color: '#1e3a8a', marginLeft: '6px', fontWeight: '600' }}>[Plant: {plantObj.plant_name}]</span>}
                            {s.state && <span style={{ fontSize: '10px', color: '#059669', marginLeft: '6px', backgroundColor: '#ecfdf5', padding: '3px 8px', borderRadius: '6px', fontWeight: '600' }}>{s.state}</span>}
                            {s.phone && <span style={{ fontSize: '11px', color: '#0284c7', marginLeft: '8px' }}>📞 {s.phone}</span>}
                          </div>
                         {/* 🎯 ફક્ત Edit બટન (બહારથી Delete કાઢી નાખ્યું છે) */}
                          <div style={{ display: 'flex' }}>
                           <button 
  onClick={() => { 
    setEditingSiteId(s.id); 
    setEditSiteForm({ 
      site_name: s.site_name, 
      address: s.address || '', 
      state: s.state || '', 
      phone: s.phone || '',
      works_list: s.works_list && s.works_list.length > 0 ? s.works_list : [{
        work_name: '',
        work_size: '',
        work_category: '',
        expected_m3: '',
        bom_items: [{ material: '', consumption: '', unit: 'Nos' }]
      }]
    }); 
  }}
                              style={{ 
                                background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', 
                                padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', 
                                display: 'flex', alignItems: 'center', gap: '6px', 
                                fontWeight: 'bold', fontSize: '11px' 
                              }}
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}


      {/* -------------------------------------------------------- */}
      {/* 📋 SHARED LIST SCREENS (Vendors, Labours, Products etc.) */}
      {/* -------------------------------------------------------- */}
      {isListScreen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
          
          {/* 🎯 Header Card */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>{getScreenTitle()}</h3>
            <button onClick={() => setActiveModal(getAddModalType())} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={14} /> Add New
            </button>
          </div>

       {/* 🎯 Filters */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
            
            {/* ૧. State Filter */}
            <select value={filterListViewState} onChange={(e) => { setFilterListViewState(e.target.value); setFilterListViewPlant('all'); }} style={{ flex: '1 1 120px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', fontWeight: '600', boxSizing: 'border-box' }}>
              <option value="all">🌐 All States</option>
              {statesList.map(st => <option key={st} value={st}>{st}</option>)}
            </select>

            {/* ૨. Plant Filter (સાચું સ્ટેટ: filterListViewPlant) */}
            <select value={filterListViewPlant} onChange={(e) => setFilterListViewPlant(e.target.value)} style={{ flex: '1 1 120px', padding: '10px', fontSize: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}>
              <option value="all">🌐 All Plants</option>
              {(plants || [])
                .filter(p => filterListViewState === 'all' || p.state === filterListViewState) // 👈 માત્ર સિલેક્ટ કરેલા સ્ટેટના જ પ્લાન્ટ બતાવશે
                .map(p => <option key={p.id} value={p.id}>{p.plant_name}</option>)
              }
            </select>

            {/* ૩. Search Box */}
            <input placeholder="🔍 Search name..." value={searchListQuery} onChange={(e) => setSearchListQuery(e.target.value)} style={{ flex: '2 1 140px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
          
          </div>

        

          {/* 1. VENDORS / SUPPLIERS */}
          {activeScreen === 'vendors' && (
            <div>
              {filteredVendors.length === 0 ? <p style={{ fontSize: '12px', color: '#64748b' }}>No suppliers found.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {filteredVendors.map(v => (
                    <div key={v.id} style={{ display: 'flex', flexDirection: 'column', padding: '8px 12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', gap: '6px' }}>
                      {editingListId === v.id ? (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        
                     

                       {/* 🎯 Company Name હવે ઉપર આવી ગયું અને ફરજિયાત (*) થઈ ગયું */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Company Name *</label>
                          <input placeholder="Company Name" value={editListForm.company_name || ''} onChange={(e) => setEditListForm({ ...editListForm, company_name: e.target.value })} style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box', width: '100%' }} />
                        </div>

                        {/* 🎯 Supplier/Person Name હવે નીચે આવી ગયું અને ઓપ્શનલ થઈ ગયું */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Contact Person Name (Optional)</label>
                            <input placeholder="Name" value={editListForm.name || ''} onChange={(e) => setEditListForm({ ...editListForm, name: e.target.value })} style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box', width: '100%' }} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Mobile</label>
                            <input placeholder="Mobile" value={editListForm.mobile || ''} onChange={(e) => setEditListForm({ ...editListForm, mobile: e.target.value })} style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box', width: '100%' }} />
                          </div>
                        </div>

                        {/* 🎯 4. નવું: Linked Materials (મટીરિયલ્સ ઉમેરવા/બદલવા માટે) */}
                        <div style={{ backgroundColor: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#059669' }}>📦 Linked Materials (મટીરિયલ્સ)</span>
                            <button type="button" onClick={() => {
                              const currentMats = Array.isArray(editListForm.materials_supplied) ? editListForm.materials_supplied : [];
                              setEditListForm({ ...editListForm, materials_supplied: [...currentMats, ''] });
                            }} style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: '4px', fontSize: '9px', cursor: 'pointer', fontWeight: 'bold' }}>+ Add Material</button>
                          </div>

                          {(Array.isArray(editListForm.materials_supplied) ? editListForm.materials_supplied : []).map((matName, mIdx) => (
                            <div key={mIdx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <select 
                                value={matName || ''} 
                                onChange={(e) => {
                                  const updated = [...editListForm.materials_supplied];
                                  updated[mIdx] = e.target.value;
                                  setEditListForm({ ...editListForm, materials_supplied: updated });
                                }} 
                                style={{ flex: 1, padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}
                              >
                                <option value="">-- Select Material --</option>
                               {/* 🎯 માત્ર એ જ મટીરિયલ્સ બતાવશે જે સબંધિત પ્લાન્ટ કે સાઈટના હોય */}
{(materials || [])
  .filter(mat => {
    // જો સપ્લાયર પાસે plant_id કે site_name હોય, તો તેના આધારે મટીરિયલ ફિલ્ટર કરો
    if (editListForm.plant_id && editListForm.plant_id !== 'All Plant (General)') {
      return mat.plant_id == editListForm.plant_id || mat.site_name === editListForm.site_name;
    }
    return true; // જો કશું સિલેક્ટ ન હોય તો બધા બતાવવા
  })
  .map(mat => <option key={mat.id} value={mat.name}>{mat.name}</option>)
}
                              </select>
                              <button type="button" onClick={() => {
                                const updated = editListForm.materials_supplied.filter((_, i) => i !== mIdx);
                                setEditListForm({ ...editListForm, materials_supplied: updated });
                              }} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                            </div>
                          ))}
                        </div>

                        {/* 5. બટન્સ: Delete અને Update */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                          <button onClick={() => handleDelete('site_vendors', v.id)} style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Trash2 size={13} /> Delete</button>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => setEditingListId(null)} style={{ backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={() => handleGenericUpdate('site_vendors', v.id, { 
                              name: editListForm.name.trim(), 
                              company_name: editListForm.company_name ? editListForm.company_name.trim() : '', 
                              mobile: editListForm.mobile ? editListForm.mobile.trim() : '',
                              site_name: editListForm.site_name || v.site_name,
                              plant_id: editListForm.plant_id && editListForm.plant_id !== 'All Plant (General)' ? editListForm.plant_id : null,
                              materials_supplied: editListForm.materials_supplied ? editListForm.materials_supplied.filter(Boolean) : []
                            })} style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={13} /> Update</button>
                          </div>
                        </div>

                      </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{v.name}</span>
                            {v.company_name && <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>({v.company_name})</span>}
                            {v.mobile ? (
                              <a href={`tel:${v.mobile}`} style={{ fontSize: '11px', color: '#0284c7', marginLeft: '8px', textDecoration: 'none', fontWeight: '600' }}>📞 {v.mobile}</a>
                            ) : ( <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '6px' }}>(No Mobile)</span> )}
                            <span style={{ fontSize: '10px', color: '#059669', marginLeft: '6px' }}>[{v.site_name}]</span>
                          </div>
                         <div style={{ display: 'flex' }}>
                            <button onClick={() => { setEditingListId(v.id); setEditListForm({ ...v }); }} style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', fontSize: '11px' }}><Edit2 size={12} /> Edit</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. PARTIES */}
          {activeScreen === 'parties' && (
            <div>
              {filteredParties.length === 0 ? <p style={{ fontSize: '12px', color: '#64748b' }}>No parties found.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {filteredParties.map(p => (
                    <div key={p.id} style={{ display: 'flex', flexDirection: 'column', padding: '8px 12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', gap: '6px' }}>
                      {editingListId === p.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input placeholder="Party Name" value={editListForm.name || ''} onChange={(e) => setEditListForm({ ...editListForm, name: e.target.value })} style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                          <div style={{ display: 'flex', gap: '6px' }}>
                            
                            <input placeholder="Company Name" value={editListForm.company_name || ''} onChange={(e) => setEditListForm({ ...editListForm, company_name: e.target.value })} style={{ flex: 1, padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                            <input placeholder="Mobile" value={editListForm.mobile || ''} onChange={(e) => setEditListForm({ ...editListForm, mobile: e.target.value })} style={{ flex: 1, padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                          </div>
{/* 3. બટન્સ: Delete (ડાબી બાજુ) અને Update & Cancel (જમણી બાજુ) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                          
                          {/* ડાબી બાજુનું ડીલીટ બટન */}
                          <button 
                            onClick={() => handleDelete('site_outward_parties', p.id)} 
                            style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Trash2 size={13} /> Delete
                          </button>

                          {/* જમણી બાજુના Update અને Cancel બટન */}
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button 
                              onClick={() => setEditingListId(null)} 
                              style={{ backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                            
                            <button 
                              onClick={() => handleGenericUpdate('site_outward_parties', p.id, { 
                                company_name: editListForm.company_name ? editListForm.company_name.trim() : '', 
                                name: editListForm.name ? editListForm.name.trim() : '', 
                                mobile: editListForm.mobile ? editListForm.mobile.trim() : ''
                              })} 
                              style={{ backgroundColor: '#ea580c', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Check size={13} /> Update
                            </button>
                          </div>

                        </div>

                      </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{p.name}</span>
                            {p.company_name && <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>({p.company_name})</span>}
                            {p.mobile ? (
                              <a href={`tel:${p.mobile}`} style={{ fontSize: '11px', color: '#0284c7', marginLeft: '8px', textDecoration: 'none', fontWeight: '600' }}>📞 {p.mobile}</a>
                            ) : ( <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '6px' }}>(No Mobile)</span> )}
                            <span style={{ fontSize: '10px', color: '#0284c7', marginLeft: '6px' }}>[{p.site_name}]</span>
                          </div>
                         <div style={{ display: 'flex' }}>
  <button 
    onClick={() => { setEditingListId(p.id); setEditListForm({ ...p }); }} 
    style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', fontSize: '11px' }}
  >
    <Edit2 size={12} /> Edit
  </button>
</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. CONTRACTORS / LABOURS */}
          {activeScreen === 'contractors' && (
            <div>
              {filteredContractors.length === 0 ? <p style={{ fontSize: '12px', color: '#64748b' }}>No labours found.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {filteredContractors.map(c => (
                    <div key={c.id} style={{ display: 'flex', flexDirection: 'column', padding: '10px 12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', gap: '8px', boxSizing: 'border-box' }}>
                      {editingListId === c.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        
                   {/* 1. Select Plant */}
  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
    <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Select Plant (Transfer)</label>
    <select 
      value={editListForm.plant_id || ''} 
      onChange={(e) => {
        const selectedPlantId = e.target.value;
        const foundPlant = (plants || []).find(p => p.id === selectedPlantId);
        
        // જો પ્લાન્ટ બદલીએ, તો બાય ડિફોલ્ટ site_name માં એ પ્લાન્ટનું નામ આવી જશે 
        // (જે Plant-to-Plant ટ્રાન્સફર માટે કામ લાગશે)
        setEditListForm({ 
          ...editListForm, 
          plant_id: selectedPlantId, 
          site_name: foundPlant ? foundPlant.plant_name : '' 
        });
      }} 
      style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box', width: '100%' }}
    >
      <option value="">-- Choose Plant --</option>
      {(plants || []).map(p => <option key={p.id} value={p.id}>{p.plant_name}</option>)}
    </select>
  </div>

  {/* 2. Select Site (Optional / Specific Site) */}
  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
    <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Select Specific Site (If applicable)</label>
    <select 
      value={editListForm.site_name || ''} 
      onChange={(e) => {
        // જો યુઝર પર્ટીક્યુલર સાઇટ સિલેક્ટ કરે તો site_name બદલાઈ જશે (Plant-to-Site અથવા Site-to-Site માટે)
        setEditListForm({ 
          ...editListForm, 
          site_name: e.target.value 
        });
      }} 
      style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box', width: '100%' }}
    >
      <option value={editListForm.plant_name || ''}>-- Plant Level (General) --</option>
      {(sites || []).filter(s => !editListForm.plant_id || s.plant_id == editListForm.plant_id).map(s => (
        <option key={s.id} value={s.site_name}>{s.site_name}</option>
      ))}
    </select>
  </div>
                        {/* Labour / Team Name */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Labour / Team Name *</label>
                          <input 
                            placeholder="Team Name" 
                            value={editListForm.name || ''} 
                            onChange={(e) => setEditListForm({ ...editListForm, name: e.target.value })} 
                            style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box', width: '100%' }} 
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Company Name (Optional)</label>
                            <input 
                              placeholder="Company Name" 
                              value={editListForm.company_name || ''} 
                              onChange={(e) => setEditListForm({ ...editListForm, company_name: e.target.value })} 
                              style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box', width: '100%' }} 
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Mobile Number</label>
                            <input 
                              placeholder="Mobile" 
                              value={editListForm.mobile || ''} 
                              onChange={(e) => setEditListForm({ ...editListForm, mobile: e.target.value })} 
                              style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box', width: '100%' }} 
                            />
                          </div>
                        </div>

                        {/* Rates & Mappings section... (તમારું જૂનું રેટ્સ વાળું બોક્સ અહીં ચાલુ રહેશે) */}

                          <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#9333ea' }}>💰 Labour Rates & Work Mappings</span>
                              <button type="button" onClick={() => {
                                const currentRates = Array.isArray(editListForm.rates_mapping) ? editListForm.rates_mapping : [];
                                setEditListForm({ 
                                  ...editListForm, 
                                  rates_mapping: [...currentRates, { work_type: 'Product Rate', product_name: '', product_size: '', uom: 'Nos', rate: '', effective_from: new Date().toISOString().split('T')[0] }] 
                                });
                              }} style={{ backgroundColor: '#9333ea', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}>+ Add Rate Row</button>
                            </div>

                            {(Array.isArray(editListForm.rates_mapping) ? editListForm.rates_mapping : []).map((rm, rIdx) => {
                              const isProductRate = !rm.work_type || rm.work_type.includes('Product Rate');
                              const matchedSizes = (products || []).filter(p => p.name === rm.product_name).map(p => p.product_size).filter(Boolean);

                              return (
                                <div key={rIdx} style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box', width: '100%' }}>
                                  
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '60%' }}>
                                      <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>Work Type:</label>
                                      <select value={rm.work_type || 'Product Rate'} onChange={(e) => {
                                        const updated = [...editListForm.rates_mapping];
                                        updated[rIdx].work_type = e.target.value;
                                        setEditListForm({ ...editListForm, rates_mapping: updated });
                                      }} style={{ padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', width: '100%', boxSizing: 'border-box' }}>
                                        <option value="Product Rate">Product Rate</option>
                                        <option value="Department Rate">Department Rate</option>
                                        <option value="Other Work">Other Work</option>
                                      </select>
                                    </div>
                                    <button type="button" onClick={() => {
                                      const updated = editListForm.rates_mapping.filter((_, i) => i !== rIdx);
                                      setEditListForm({ ...editListForm, rates_mapping: updated });
                                    }} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', marginTop: '12px' }}>✕ Remove</button>
                                  </div>

                                  {isProductRate ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '6px', width: '100%' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                        <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>Product Name:</label>
                                        <select value={rm.product_name || ''} onChange={(e) => {
                                          const selProdName = e.target.value;
                                          const updated = [...editListForm.rates_mapping];
                                          updated[rIdx].product_name = selProdName;
                                          const matchedProducts = (products || []).filter(p => p.name === selProdName);
                                          updated[rIdx].product_size = matchedProducts.length > 0 ? (matchedProducts[0].product_size || '') : '';
                                          setEditListForm({ ...editListForm, rates_mapping: updated });
                                        }} style={{ padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', width: '100%', boxSizing: 'border-box' }}>
                                          <option value="">-- Select Product --</option>
                                          {[...new Set((products || []).map(p => p.name))].map((pName, i) => (
                                            <option key={i} value={pName}>{pName}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                        <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>Size:</label>
                                        <select value={rm.product_size || rm.size || ''} onChange={(e) => {
                                          const updated = [...editListForm.rates_mapping];
                                          updated[rIdx].product_size = e.target.value;
                                          setEditListForm({ ...editListForm, rates_mapping: updated });
                                        }} style={{ padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', width: '100%', boxSizing: 'border-box' }}>
                                          <option value="">-- Size --</option>
                                          {matchedSizes.map((sz, sIdx) => <option key={sIdx} value={sz}>{sz}</option>)}
                                        </select>
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                      <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>Department Task:</label>
                                      <input type="text" placeholder="e.g. Maintenance" value={rm.product_name || ''} onChange={(e) => {
                                        const updated = [...editListForm.rates_mapping];
                                        updated[rIdx].product_name = e.target.value;
                                        setEditListForm({ ...editListForm, rates_mapping: updated });
                                      }} style={{ padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box', width: '100%' }} />
                                    </div>
                                  )}

                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.5fr', gap: '6px', alignItems: 'center', width: '100%' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                      <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>UOM:</label>
                                      <select value={rm.uom || 'Nos'} onChange={(e) => {
                                        const updated = [...editListForm.rates_mapping];
                                        updated[rIdx].uom = e.target.value;
                                        setEditListForm({ ...editListForm, rates_mapping: updated });
                                      }} style={{ padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box', width: '100%' }}>
                                        <option value="Nos">Nos</option>
                                        <option value="M3">M3</option>
                                        <option value="RFT">RFT</option>
                                        <option value="SFT">SFT</option>
                                        <option value="Kg">Kg</option>
                                        <option value="Lines">Lines</option>
                                        <option value="Days">Days</option>
                                      </select>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                      <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>Rate (₹):</label>
                                      <input type="number" placeholder="Rate" value={rm.rate || ''} onChange={(e) => {
                                        const updated = [...editListForm.rates_mapping];
                                        updated[rIdx].rate = e.target.value;
                                        setEditListForm({ ...editListForm, rates_mapping: updated });
                                      }} style={{ padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box', width: '100%' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                      <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>Effective From:</label>
                                      <input type="date" value={rm.effective_from || ''} onChange={(e) => {
                                        const updated = [...editListForm.rates_mapping];
                                        updated[rIdx].effective_from = e.target.value;
                                        setEditListForm({ ...editListForm, rates_mapping: updated });
                                      }} style={{ padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box', width: '100%' }} />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* બટન્સ: Delete (ડાબી બાજુ) અને Cancel & Save (જમણી બાજુ) */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', width: '100%' }}>
                        
                        {/* 1. ડાબી બાજુનું ડીલીટ બટન */}
                        <button 
                          onClick={() => handleDelete('contractors', c.id)} 
                          style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                        
                        {/* 2. જમણી બાજુના Cancel અને Save બટન */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            onClick={() => setEditingListId(null)} 
                            style={{ backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                          
                          <button 
                            onClick={() => handleLabourUpdate(c.id, editListForm)} 
                            style={{ backgroundColor: '#9333ea', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Check size={13} /> Save All Changes
                          </button>
                        </div>

                      </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{c.name}</span>
                            {c.mobile ? (
                              <a href={`tel:${c.mobile}`} style={{ fontSize: '11px', color: '#0284c7', marginLeft: '8px', textDecoration: 'none', fontWeight: '600' }}>📞 {c.mobile}</a>
                            ) : ( <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '6px' }}>(No Mobile)</span> )}
                            <span style={{ fontSize: '10px', color: '#059669', marginLeft: '6px' }}>[{c.site_name}]</span>
                          </div>
                         <div style={{ display: 'flex', alignItems: 'center' }}>
  <button 
    onClick={async () => { 
      setEditingListId(c.id); 
      const { data: rateData, error } = await supabase.from('labour_product_rates').select('*').eq('team_name', c.name);
      if (error) console.error("Error fetching rates:", error.message);
      setEditListForm({ ...c, rates_mapping: rateData && rateData.length > 0 ? rateData : (c.rates_mapping || []) }); 
    }} 
    style={{ 
      background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', 
      padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', 
      display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', fontSize: '11px' 
    }}
  >
    <Edit2 size={12} /> Edit
  </button>
</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

     {/* 4. MATERIALS */}
         {activeScreen === 'materials' && (
           <div>
             {filteredMaterials.length === 0 ? <p style={{ fontSize: '12px', color: '#64748b' }}>No materials found.</p> : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                 {filteredMaterials.map(m => (
                   <div key={m.id} style={{ display: 'flex', flexDirection: 'column', padding: '10px 12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', gap: '8px', boxSizing: 'border-box' }}>
                     {editingListId === m.id ? (
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                         
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                           <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Material Name *</label>
                           <input placeholder="Material Name" value={editListForm.name || ''} onChange={(e) => setEditListForm({ ...editListForm, name: e.target.value })} style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box', width: '100%' }} />
                         </div>

                         <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                           <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Item Category</label>
                           <select value={editListForm.item_type || 'Raw Material'} onChange={(e) => setEditListForm({ ...editListForm, item_type: e.target.value })} style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box', width: '100%' }}>
                             <option value="Raw Material">Raw Material</option>
                             <option value="Consumable">Consumable</option>
                             <option value="Finished Goods">Finished Goods</option>
                             <option value="Other">Other</option>
                           </select>
                         </div>

                         {/* બટન્સ: Delete (ડાબી બાજુ) અને Cancel & Update (જમણી બાજુ) */}
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', width: '100%', boxSizing: 'border-box' }}>
                           <button onClick={() => handleDelete('site_materials_master', m.id)} style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Trash2 size={13} /> Delete</button>
                           <div style={{ display: 'flex', gap: '6px' }}>
                             <button onClick={() => setEditingListId(null)} style={{ backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                             <button onClick={() => handleGenericUpdate('site_materials_master', m.id, { 
                               name: editListForm.name.trim(), 
                               item_type: editListForm.item_type || 'Raw Material' 
                             })} style={{ backgroundColor: '#4f46e5', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={13} /> Update</button>
                           </div>
                         </div>

                       </div>
                     ) : (
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div>
                           <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{m.name}</span>
                           {m.item_type && <span style={{ fontSize: '10px', color: '#9333ea', marginLeft: '6px', backgroundColor: '#f3e8ff', padding: '2px 6px', borderRadius: '4px' }}>{m.item_type}</span>}
                           <span style={{ fontSize: '10px', color: '#0284c7', marginLeft: '6px' }}>[{m.site_name}]</span>
                         </div>
                         <div style={{ display: 'flex' }}>
                           <button onClick={() => { setEditingListId(m.id); setEditListForm({ ...m }); }} style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', fontSize: '11px' }}><Edit2 size={12} /> Edit</button>
                         </div>
                       </div>
                     )}
                   </div>
                 ))}
               </div>
             )}
           </div>
         )}
{/* 5. WORK DESCRIPTIONS */}
         {activeScreen === 'WorkDescriptions' && (
           <div>
             {filteredWorkDescriptions.length === 0 ? <p style={{ fontSize: '12px', color: '#64748b' }}>No descriptions found.</p> : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                 {filteredWorkDescriptions.map(w => (
                   <div key={w.id} style={{ display: 'flex', flexDirection: 'column', padding: '10px 12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', gap: '8px', boxSizing: 'border-box' }}>
                     {editingListId === w.id ? (
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                         
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                           <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Description Name *</label>
                           <input placeholder="Description Name" value={editListForm.name || ''} onChange={(e) => setEditListForm({ ...editListForm, name: e.target.value })} style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box', width: '100%' }} />
                         </div>

                         {/* બટન્સ: Delete (ડાબી બાજુ) અને Cancel & Update (જમણી બાજુ) */}
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', width: '100%', boxSizing: 'border-box' }}>
                           <button onClick={() => handleDelete('site_work_descriptions', w.id)} style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Trash2 size={13} /> Delete</button>
                           <div style={{ display: 'flex', gap: '6px' }}>
                             <button onClick={() => setEditingListId(null)} style={{ backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                             <button onClick={() => handleGenericUpdate('site_work_descriptions', w.id, { name: editListForm.name.trim() })} style={{ backgroundColor: '#d97706', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={13} /> Update</button>
                           </div>
                         </div>

                       </div>
                     ) : (
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div>
                           <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{w.name}</span>
                           <span style={{ fontSize: '10px', color: '#0284c7', marginLeft: '6px' }}>[{w.site_name}]</span>
                         </div>
                         <div style={{ display: 'flex' }}>
                           <button onClick={() => { setEditingListId(w.id); setEditListForm({ ...w }); }} style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', fontSize: '11px' }}><Edit2 size={12} /> Edit</button>
                         </div>
                       </div>
                     )}
                   </div>
                 ))}
               </div>
             )}
           </div>
         )}
{/* 7. TRANSPORTERS LIST */}
         {activeScreen === 'transporters' && (
           <div>
             {filteredTransporters.length === 0 ? <p style={{ fontSize: '12px', color: '#64748b' }}>No transporters found.</p> : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                 {filteredTransporters.map(tr => (
                   <div key={tr.id} style={{ display: 'flex', flexDirection: 'column', padding: '10px 12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', gap: '8px', boxSizing: 'border-box' }}>
                     {editingListId === tr.id ? (
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                         
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                           <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Transporter / Agency Name *</label>
                           <input placeholder="Transporter Name" value={editListForm.transporter_name || ''} onChange={(e) => setEditListForm({ ...editListForm, transporter_name: e.target.value })} style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} />
                         </div>

                         <div style={{ display: 'flex', gap: '6px' }}>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                             <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Company Name</label>
                             <input placeholder="Company Name" value={editListForm.company_name || ''} onChange={(e) => setEditListForm({ ...editListForm, company_name: e.target.value })} style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} />
                           </div>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                             <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Mobile</label>
                             <input placeholder="Mobile" value={editListForm.mobile || ''} onChange={(e) => setEditListForm({ ...editListForm, mobile: e.target.value })} style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} />
                           </div>
                         </div>

                       {/* 🚛 Vehicles List Management (બિનજરૂરી ફ્રેમ અને સ્ક્રોલ હટાવ્યા) */}
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', boxSizing: 'border-box', margin: '4px 0' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                             <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#0284c7' }}>🚛 Vehicles List (વાહનોની વિગતો)</span>
                             <button type="button" onClick={() => {
                               const currentVehicles = Array.isArray(editListForm.vehicles_list) ? editListForm.vehicles_list : [];
                               setEditListForm({ ...editListForm, vehicles_list: [...currentVehicles, { vehicleNo: '', driverName: '', phone: '' }] });
                             }} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}>+ Add Vehicle</button>
                           </div>

                           {(Array.isArray(editListForm.vehicles_list) ? editListForm.vehicles_list : []).map((vh, vIdx) => (
                             <div key={vIdx} style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
                               <input placeholder="Vehicle No (e.g. GJ01AB1234)" value={vh.vehicleNo || ''} onChange={(e) => {
                                 const updated = [...editListForm.vehicles_list];
                                 updated[vIdx].vehicleNo = e.target.value;
                                 setEditListForm({ ...editListForm, vehicles_list: updated });
                               }} style={{ flex: 1, padding: '7px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box', minWidth: '0', backgroundColor: '#fff' }} />
                               
                               <input placeholder="Driver Name" value={vh.driverName || ''} onChange={(e) => {
                                 const updated = [...editListForm.vehicles_list];
                                 updated[vIdx].driverName = e.target.value;
                                 setEditListForm({ ...editListForm, vehicles_list: updated });
                               }} style={{ flex: 1, padding: '7px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box', minWidth: '0', backgroundColor: '#fff' }} />

                               <button type="button" onClick={() => {
                                 const updated = editListForm.vehicles_list.filter((_, i) => i !== vIdx);
                                 setEditListForm({ ...editListForm, vehicles_list: updated });
                               }} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', flexShrink: '0', padding: '0 4px' }}>✕</button>
                             </div>
                           ))}
                         </div>
                       {/* બટન્સ */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                        <button onClick={() => handleDelete('site_transporters', tr.id)} style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Trash2 size={13} /> Delete</button>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => setEditingListId(null)} style={{ backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                          
                          {/* 🎯 અહી handleGenericUpdate ના બદલે handleTransporterUpdate મૂકી દીધું છે */}
                          <button onClick={() => handleTransporterUpdate(tr.id, editListForm)} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={13} /> Update</button>
                        </div>
                    
                         </div>
                       </div>
                     ) : (
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div>
                           <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{tr.transporter_name}</span>
                           {tr.company_name && <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>({tr.company_name})</span>}
                           {tr.mobile && <a href={`tel:${tr.mobile}`} style={{ fontSize: '11px', color: '#0284c7', marginLeft: '8px', textDecoration: 'none', fontWeight: '600' }}>📞 {tr.mobile}</a>}
                           <span style={{ fontSize: '10px', color: '#059669', marginLeft: '6px' }}>[{tr.site_name}]</span>
                           
                           {/* લિસ્ટમાં જ વાહનોની સંખ્યા અથવા નંબર બતાવવા માટે */}
                           {Array.isArray(tr.vehicles_list) && tr.vehicles_list.length > 0 && (
                             <div style={{ fontSize: '10px', color: '#9333ea', marginTop: '2px' }}>
                               🚛 Vehicles: {tr.vehicles_list.map(v => v.vehicleNo).join(', ')}
                             </div>
                           )}
                         </div>
                         <div style={{ display: 'flex' }}>
                           <button onClick={() => { setEditingListId(tr.id); setEditListForm({ ...tr, vehicles_list: tr.vehicles_list || [] }); }} style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', fontSize: '11px' }}><Edit2 size={12} /> Edit</button>
                         </div>
                       </div>
                     )}
                   </div>
                 ))}
               </div>
             )}
           </div>
         )}
          {/* 6. PRODUCTS */}
          {activeScreen === 'products' && (
            <div>
              {filteredProducts.length === 0 ? <p style={{ fontSize: '12px', color: '#64748b' }}>No products found.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {filteredProducts.map(p => (
                    <div key={p.id} style={{ display: 'flex', flexDirection: 'column', padding: '10px 12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', gap: '8px', boxSizing: 'border-box' }}>
                      {editingListId === p.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Product Name</label>
                            <input value={editListForm.name || ''} onChange={(e) => setEditListForm({ ...editListForm, name: e.target.value })} style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Size</label>
                              <input value={editListForm.product_size || ''} onChange={(e) => setEditListForm({ ...editListForm, product_size: e.target.value })} style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                            </div>
{/* 🎯 એડિટ અથવા નવું ઉમેરતી વખતે જો નામમાં panel કે pa/patiya હોય તો જ બોક્સ દેખાશે */}
{((productName || editListForm.name || '').toLowerCase().includes('panel') || 
  (productName || editListForm.name || '').toLowerCase().includes('pa') || 
  (productName || editListForm.name || '').toLowerCase().includes('patiya')) && (
  <div style={{ backgroundColor: '#fef3c7', padding: '10px', borderRadius: '8px', border: '1px solid #f59e0b', boxSizing: 'border-box', width: '100%', marginTop: '8px' }}>
    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#b45309', display: 'block', marginBottom: '4px' }}>
      લાઈન નંગ (Qty Per Line / Multiplier) *
    </label>
    <input 
      type="number" 
      placeholder="દા.ત. 30 અથવા 24" 
      value={qtyPerLine} 
      onChange={(e) => setQtyPerLine(e.target.value)} 
      style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #d97706', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#fff', fontWeight: 'bold' }} 
    />
    <span style={{ fontSize: '10px', color: '#92400e', display: 'block', marginTop: '3px' }}>
      આ પૅનલ/પટિયા માટે એક લાઈનમાં કેટલા નંગ બને છે તે લખો.
    </span>
  </div>
)}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Category</label>
                              <input value={editListForm.product_category || ''} onChange={(e) => setEditListForm({ ...editListForm, product_category: e.target.value })} style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Expected Concrete (M3)</label>
                            <input type="number" step="0.001" value={editListForm.expected_m3 || ''} onChange={(e) => setEditListForm({ ...editListForm, expected_m3: e.target.value })} style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
  <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Effective From Date</label>
  <input 
    type="date" 
    value={editListForm.effective_date || new Date().toISOString().split('T')[0]} 
    onChange={(e) => setEditListForm({ ...editListForm, effective_date: e.target.value })} 
    style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} 
  />
</div>

                          <div style={{ backgroundColor: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#0891b2' }}>📦 Edit BOM (Materials & UOM)</span>
                              <button type="button" onClick={() => {
                                const currentBom = Array.isArray(editListForm.bom_items) ? editListForm.bom_items : [];
                                setEditListForm({ ...editListForm, bom_items: [...currentBom, { material: '', consumption: '', unit: 'KG' }] });
                              }} style={{ backgroundColor: '#0891b2', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>+ Add Material</button>
                            </div>

                            {(Array.isArray(editListForm.bom_items) ? editListForm.bom_items : []).map((bom, bIdx) => (
                              <div key={bIdx} style={{ display: 'flex', gap: '4px', marginBottom: '6px', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
                                <select value={bom.material || ''} onChange={(e) => {
                                  const updatedBom = [...editListForm.bom_items];
                                  updatedBom[bIdx].material = e.target.value;
                                  setEditListForm({ ...editListForm, bom_items: updatedBom });
                                }} style={{ flex: '1.4', padding: '6px 4px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                                  <option value="">-- Material --</option>
                                  {(materials || []).map(mat => <option key={mat.id} value={mat.name}>{mat.name}</option>)}
                                </select>
                                
                                <input type="number" step="any" placeholder="Qty" value={bom.consumption || ''} onChange={(e) => {
                                  const updatedBom = [...editListForm.bom_items];
                                  updatedBom[bIdx].consumption = e.target.value;
                                  setEditListForm({ ...editListForm, bom_items: updatedBom });
                                }} style={{ flex: '0.7', width: '50px', padding: '6px 4px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />

                                <select value={bom.unit || 'KG'} onChange={(e) => {
                                  const updatedBom = [...editListForm.bom_items];
                                  updatedBom[bIdx].unit = e.target.value;
                                  setEditListForm({ ...editListForm, bom_items: updatedBom });
                                }} style={{ flex: '0.9', padding: '6px 2px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                                  <option value="KG">KG</option>
                                  <option value="Nos">Nos</option>
                                  <option value="Bags">Bags</option>
                                  <option value="CFT">CFT</option>
                                  <option value="M3">M3</option>
                                  <option value="Ton">Ton</option>
                                  <option value="LTR">LTR</option>
                                </select>

             <button type="button" onClick={() => {
                                 const updatedBom = editListForm.bom_items.filter((_, i) => i !== bIdx);
                                 setEditListForm({ ...editListForm, bom_items: updatedBom });
                               }} style={{ flex: '0.2', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', textAlign: 'center', padding: '0' }}>✕</button>
                             </div>
                           ))}
                         </div>

                         {/* બટન્સ: Delete (ડાબી બાજુ) અને Cancel & Save All Changes (જમણી બાજુ) */}
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', width: '100%', boxSizing: 'border-box' }}>
                           <button onClick={() => handleDelete('plant_work_descriptions', p.id)} style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Trash2 size={13} /> Delete</button>
                           <div style={{ display: 'flex', gap: '6px' }}>
                             <button onClick={() => setEditingListId(null)} style={{ backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                             <button onClick={() => handleGenericUpdate('plant_work_descriptions', p.id, { 
  ...editListForm, 
  qty_per_line: qtyPerLine ? Number(qtyPerLine) : 30})} style={{ backgroundColor: '#0891b2', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={13} /> Save All Changes</button>
                           </div>
                         </div>
                       </div>
                     ) : (
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div>
                           <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{p.name}</span>
                           {p.product_size && <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>(Size: {p.product_size})</span>}
                           {p.product_category && <span style={{ fontSize: '11px', color: '#0891b2', marginLeft: '6px' }}>[{p.product_category}]</span>}
                           {p.expected_m3 && <span style={{ fontSize: '11px', color: '#ea580c', marginLeft: '6px' }}>(M3: {p.expected_m3})</span>}
                           <span style={{ fontSize: '10px', color: '#0284c7', marginLeft: '6px' }}>[{p.site_name}]</span>
                         </div>
                         <div style={{ display: 'flex' }}>
                          <button onClick={() => { 
  setEditingListId(p.id); 
  setEditListForm({ ...p }); 
  setProductName(p.name || '');
  setQtyPerLine(p.qty_per_line ? p.qty_per_line.toString() : '30'); }} style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', fontSize: '11px' }}><Edit2 size={12} /> Edit</button>
                         </div>
                       </div>
                     )}
                   </div>
                 ))}
               </div>
             )}
           </div>
         )}
        </div>
      )}
     {/* POPUP MODALS */}
      {activeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '12px', boxSizing: 'border-box' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                {activeModal === 'plant' ? '🏭 Add New Plant' :
                 activeModal === 'site' ? '🏗️ Add New Site' : 
                 activeModal === 'supplier' ? '🏢 Add Supplier' : 
                 activeModal === 'party' ? '🚚 Add Customer / Party' : 
                 activeModal === 'labour' ? '👷 Add New Labour & Multiple Rates' : 
                 activeModal === 'material' ? '📦 Add Material' : 
                 activeModal === 'description' ? '📝 Add Description' : 
                 activeModal === 'product' ? '🏷️ Add Products Name' : 
                 activeModal === 'transport' ? '🚚 Add Transporter' : 
                 activeModal === 'expenseCategory' ? '💳 Expense Categories Master' :
                 '🏷️ Add Products Name'}
              </h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
            </div>
            
            {/* 🎯 1. EXPENSE CATEGORY MODAL FORM */}
            {activeModal === 'expenseCategory' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Enter new expense category name..." 
                    value={newExpenseCatName} 
                    onChange={(e) => setNewExpenseCatName(e.target.value)} 
                    style={{ flex: 1, padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} 
                  />
                  <button 
                    onClick={handleAddExpenseCategory} 
                    style={{ backgroundColor: '#0d9488', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    + Add
                  </button>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '8px' }}>
                    Categories List ({expenseCategories.length}) [Hard delete disabled for integrity]
                  </span>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
                    {expenseCategories.length === 0 ? (
                      <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '10px 0' }}>No categories created yet.</p>
                    ) : (
                      expenseCategories.map(cat => (
                        <div 
                          key={cat.id} 
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            padding: '8px 10px', 
                            borderRadius: '6px', 
                            backgroundColor: cat.is_active ? '#f8fafc' : '#fef2f2', 
                            border: `1px solid ${cat.is_active ? '#e2e8f0' : '#fecaca'}` 
                          }}
                        >
                          {editingCatId === cat.id ? (
                            <div style={{ display: 'flex', gap: '6px', flex: 1, marginRight: '8px' }}>
                              <input 
                                value={editingCatName} 
                                onChange={(e) => setEditingCatName(e.target.value)} 
                                style={{ flex: 1, padding: '4px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} 
                              />
                              <button onClick={() => handleUpdateExpenseCategory(cat.id)} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Save</button>
                              <button onClick={() => setEditingCatId(null)} style={{ backgroundColor: '#94a3b8', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Cancel</button>
                            </div>
                          ) : (
                            <div>
                              <span style={{ fontWeight: 'bold', fontSize: '13px', color: cat.is_active ? '#0f172a' : '#991b1b', textDecoration: cat.is_active ? 'none' : 'line-through' }}>
                                {cat.category_name}
                              </span>
                              <span style={{ marginLeft: '8px', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', backgroundColor: cat.is_active ? '#dcfce7' : '#fee2e2', color: cat.is_active ? '#15803d' : '#b91c1c' }}>
                                {cat.is_active ? 'Active' : 'Disabled'}
                              </span>
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {editingCatId !== cat.id && (
                              <button 
                                onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.category_name); }} 
                                style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}
                              >
                                <Edit2 size={13} />
                              </button>
                            )}

                            {/* 🛡️ Soft Delete Toggle (Disable/Enable) */}
                            <button 
                              onClick={() => handleToggleCategoryActive(cat.id, cat.is_active)} 
                              title={cat.is_active ? "Disable Category" : "Enable Category"} 
                              style={{ 
                                backgroundColor: cat.is_active ? '#fee2e2' : '#dcfce7', 
                                color: cat.is_active ? '#b91c1c' : '#15803d', 
                                border: 'none', 
                                padding: '4px 8px', 
                                borderRadius: '4px', 
                                fontSize: '11px', 
                                fontWeight: 'bold', 
                                cursor: 'pointer' 
                              }}
                            >
                              {cat.is_active ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => setActiveModal(null)} 
                  style={{ marginTop: '10px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '9px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
                >
                  Close
                </button>
              </div>
            ) : activeModal === 'product' ? (
              /* 🎯 2. PRODUCT MODAL FORM */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', boxSizing: 'border-box', width: '100%' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Assign Type *</label>
                  <div style={{ display: 'flex', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
                    <button type="button" onClick={() => setAssignTarget('plant')} style={{ flex: 1, padding: '6px', fontSize: '11px', fontWeight: 'bold', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: assignTarget === 'plant' ? '#1e3a8a' : '#f1f5f9', color: assignTarget === 'plant' ? '#fff' : '#475569', cursor: 'pointer' }}>Plant Only</button>
                    <button type="button" onClick={() => setAssignTarget('site')} style={{ flex: 1, padding: '6px', fontSize: '11px', fontWeight: 'bold', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: assignTarget === 'site' ? '#2563eb' : '#f1f5f9', color: assignTarget === 'site' ? '#fff' : '#475569', cursor: 'pointer' }}>Site Only</button>
                    <button type="button" onClick={() => setAssignTarget('both')} style={{ flex: 1, padding: '6px', fontSize: '11px', fontWeight: 'bold', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: assignTarget === 'both' ? '#059669' : '#f1f5f9', color: assignTarget === 'both' ? '#fff' : '#475569', cursor: 'pointer' }}>Both</button>
                  </div>  
                </div>

                {/* 🎯 ૧. Select State */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Select State *</label>
                  <select value={formStateFilter} onChange={(e) => {
                    setFormStateFilter(e.target.value);
                    setFormPlantFilter(''); 
                    setFormSite('all');    
                  }} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    <option value="">🌐 All States (General)</option>
                    {statesList.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Select Plant *</label>
                  <select value={formPlantFilter} onChange={(e) => setFormPlantFilter(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    {availablePlantsForForm.length === 0 ? (
                      <option value="" disabled>⚠️ No Plant Available in this State</option>
                    ) : (
                      <>
                        <option value="all">🌐 All Plants (General)</option>
                        {availablePlantsForForm.map(p => <option key={p.id} value={p.id}>{p.plant_name}</option>)}
                      </>
                    )}
                  </select>
                </div>

                {/* 🎯 ૩. Select Site */}
                {(assignTarget === 'site' || assignTarget === 'both') && (
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Select Site *</label>
                    <select value={formSite} onChange={(e) => setFormSite(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                      <option value="all">🌐 All Sites (General)</option>
                      {availableSitesForForm.map(s => <option key={s.id} value={s.site_name}>{s.site_name}</option>)}
                    </select>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', boxSizing: 'border-box', width: '100%' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Product Name *</label>
                    <input placeholder="e.g. U-Drain" value={productName} onChange={(e) => setProductName(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Product Size *</label>
                    <input placeholder="e.g. 600x600" value={productSize} onChange={(e) => setProductSize(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>
                </div>
                {/* 🎯 જો પ્રોડક્ટના નામમાં panel કે patiya હોય તો જ આ બોક્સ દેખાશે */}
{(productName.toLowerCase().includes('panel') || productName.toLowerCase().includes('pa')) && (
  <div style={{ backgroundColor: '#fef3c7', padding: '10px', borderRadius: '8px', border: '1px solid #f59e0b', boxSizing: 'border-box', width: '100%' }}>
    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#b45309', display: 'block', marginBottom: '4px' }}>
      લાઈન નંગ (Qty Per Line / Multiplier) *
    </label>
    <input 
      type="number" 
      placeholder="દા.ત. 30 અથવા 24" 
      value={qtyPerLine} 
      onChange={(e) => setQtyPerLine(e.target.value)} 
      style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #d97706', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#fff', fontWeight: 'bold' }} 
    />
    <span style={{ fontSize: '10px', color: '#92400e', display: 'block', marginTop: '3px' }}>
      આ પૅનલ/પટિયા માટે એક લાઈનમાં કેટલા નંગ બને છે તે લખો.
    </span>
  </div>
)}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', boxSizing: 'border-box', width: '100%' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Product Category *</label>
                    <input placeholder="e.g. Precast Drainage" value={productCategory} onChange={(e) => setProductCategory(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Expected Concrete (M3) *</label>
                    <input type="number" step="0.001" placeholder="e.g. 0.75" value={expectedM3} onChange={(e) => setExpectedM3(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>
                </div>

                {/* 🎯 Effective Date ઇનપુટ */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Effective From Date *</label>
                  <input type="date" value={effectiveDate || new Date().toISOString().split('T')[0]} onChange={(e) => setEffectiveDate(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }} />
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box', width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#0891b2' }}>📦 Bill of Materials (BOM)</span>
                    <button type="button" onClick={() => setBomItems([...bomItems, { material: '', consumption: '', unit: 'Nos' }])} style={{ backgroundColor: '#0891b2', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>+ Add Material</button>
                  </div>

                  {bomItems.map((bom, bIdx) => (
                    <div key={bIdx} style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
                      <select value={bom.material} onChange={(e) => {
                        const updated = [...bomItems];
                        updated[bIdx].material = e.target.value;
                        setBomItems(updated);
                      }} style={{ flex: 1.8, padding: '7px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box', minWidth: '0' }}>
                        <option value="">-- Material --</option>
                        {availableMaterials.map(mat => <option key={mat.id} value={mat.name}>{mat.name}</option>)}
                      </select>
                      
                      <input type="number" placeholder="Consumption" value={bom.consumption} onChange={(e) => {
                        const updated = [...bomItems];
                        updated[bIdx].consumption = e.target.value;
                        setBomItems(updated);
                      }} style={{ flex: 1, padding: '7px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box', minWidth: '0' }} />

                      <select value={bom.unit} onChange={(e) => {
                        const updated = [...bomItems];
                        updated[bIdx].unit = e.target.value;
                        setBomItems(updated);
                      }} style={{ flex: 0.9, padding: '7px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box', minWidth: '0' }}>
                        <option value="Nos">Nos</option>
                        <option value="Bags">Bags</option>
                        <option value="Kg">Kg</option>
                     
                      </select>

                      {bomItems.length > 1 && (
                        <button type="button" onClick={() => setBomItems(bomItems.filter((_, i) => i !== bIdx))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px', flexShrink: 0 }}><Trash2 size={14} /></button>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', boxSizing: 'border-box', width: '100%' }}>
                  <button onClick={handleSaveProduct} style={{ flex: 1, backgroundColor: '#0891b2', color: '#fff', padding: '10px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Save Product & BOM</button>
                  <button onClick={() => setActiveModal(null)} style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#475569', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                </div>
              </div>
            ) : activeModal === 'plant' ? (
              /* 🏭 3. PLANT MODAL FORM */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Plant Name *</label>
                  <input placeholder="Enter plant name..." value={plantName} onChange={(e) => setPlantName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>

                {/* 🎯 ફરજિયાત સ્ટેટ ડ્રોપડાઉન */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>State *</label>
                  <select value={plantState} onChange={(e) => setPlantState(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    <option value="">🌐 All States (General)</option>
                    {statesList.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Location (Optional)</label>
                  <input placeholder="Enter location..." value={plantLocation} onChange={(e) => setPlantLocation(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Manager Name (Optional)</label>
                  <input placeholder="Enter manager name..." value={plantManager} onChange={(e) => setPlantManager(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button onClick={handleSavePlant} style={{ flex: 1, backgroundColor: '#1e3a8a', color: '#fff', padding: '10px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Save Plant</button>
                  <button onClick={() => { setActiveModal(null); setPlantState(''); }} style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#475569', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                </div>
              </div>
            ) : activeModal === 'party' ? (
              /* 🎯 4. ADD CUSTOMER / PARTY MODAL */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Select State *</label>
                  <select value={formStateFilter} onChange={(e) => {
                    setFormStateFilter(e.target.value);
                    setFormPlantFilter('all');
                  }} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    <option value="all">🌐 All States (General)</option>
                    {statesList.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Select Plant *</label>
                  <select value={formPlantFilter} onChange={(e) => setFormPlantFilter(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    {availablePlantsForForm.length === 0 ? (
                      <option value="" disabled>⚠️ No Plant Available in this State</option>
                    ) : (
                      <>
                        <option value="all">🌐 All Plants (General)</option>
                        {availablePlantsForForm.map(p => <option key={p.id} value={p.id}>{p.plant_name}</option>)}
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Party Name *</label>
                  <input placeholder="Enter party name..." value={formName} onChange={(e) => setFormName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Company Name (Optional)</label>
                  <input placeholder="Enter company name..." value={formCompanyName} onChange={(e) => setFormCompanyName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Mobile Number (Optional)</label>
                  <input type="tel" placeholder="Enter mobile number..." value={formMobile} onChange={(e) => setFormMobile(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button onClick={handleSaveModalData} style={{ flex: 1, backgroundColor: '#ea580c', color: '#fff', padding: '10px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Save Party</button>
                  <button onClick={() => setActiveModal(null)} style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#475569', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                </div>
              </div>
            ) : activeModal === 'transport' ? (
              /* 🚚 5. TRANSPORT MODAL FORM */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Assign Type *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => setAssignTarget('plant')} style={{ flex: 1, padding: '6px', fontSize: '11px', fontWeight: 'bold', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: assignTarget === 'plant' ? '#1e3a8a' : '#f1f5f9', color: assignTarget === 'plant' ? '#fff' : '#475569', cursor: 'pointer' }}>Plant Only</button>
                    <button type="button" onClick={() => setAssignTarget('site')} style={{ flex: 1, padding: '6px', fontSize: '11px', fontWeight: 'bold', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: assignTarget === 'site' ? '#2563eb' : '#f1f5f9', color: assignTarget === 'site' ? '#fff' : '#475569', cursor: 'pointer' }}>Site Only</button>
                    <button type="button" onClick={() => setAssignTarget('both')} style={{ flex: 1, padding: '6px', fontSize: '11px', fontWeight: 'bold', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: assignTarget === 'both' ? '#059669' : '#f1f5f9', color: assignTarget === 'both' ? '#fff' : '#475569', cursor: 'pointer' }}>Both</button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Select State *</label>
                  <select value={formStateFilter} onChange={(e) => { setFormStateFilter(e.target.value); setFormPlantFilter(''); setFormSite('all'); }} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    <option value="">🌐 All States (General)</option>
                    {statesList.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Select Plant *</label>
                  <select value={formPlantFilter} onChange={(e) => setFormPlantFilter(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    {availablePlantsForForm.length === 0 ? (
                      <option value="" disabled>⚠️ No Plant Available in this State</option>
                    ) : (
                      <>
                        <option value="all">🌐 All Plants (General)</option>
                        {availablePlantsForForm.map(p => <option key={p.id} value={p.id}>{p.plant_name}</option>)}
                      </>
                    )}
                  </select>
                </div>

                {(assignTarget === 'site' || assignTarget === 'both') && (
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Select Site *</label>
                    <select value={formSite} onChange={(e) => setFormSite(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                      <option value="all">🌐 All Sites (General)</option>
                      {availableSitesForForm.map(s => <option key={s.id} value={s.site_name}>{s.site_name}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Transporter / Agency Name *</label>
                  <input placeholder="e.g. Shree Ram Roadways" value={transporterName} onChange={(e) => setTransporterName(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>

                {/* 🎯 ૧. નવા Company Name અને Mobile Number ના બોક્સ */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Transporter Name (Optional)</label>
                    <input placeholder="Transporter name..." value={formCompanyName} onChange={(e) => setFormCompanyName(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Mobile Number (Optional)</label>
                    <input type="tel" placeholder="Mobile number..." value={formMobile} onChange={(e) => setFormMobile(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>
                </div>

              {/* 🚛 Vehicles List Management (પૉપઅપ ફોર્મ માટે ક્લીન લેઆઉટ) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', boxSizing: 'border-box', margin: '4px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#0284c7' }}>🚛 Vehicles List (વાહનોની વિગતો)</span>
                    <button type="button" onClick={() => setTransporterVehicles([...transporterVehicles, { vehicleNo: '', driverName: '', phone: '' }])} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}>+ Add Vehicle Row</button>
                  </div>

                  {transporterVehicles.map((vh, vIdx) => (
                    <div key={vIdx} style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
                      <input placeholder="Vehicle No (e.g. GJ01AB1234)" value={vh.vehicleNo} onChange={(e) => {
                        const updated = [...transporterVehicles];
                        updated[vIdx].vehicleNo = e.target.value;
                        setTransporterVehicles(updated);
                      }} style={{ flex: 2, padding: '7px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box', minWidth: '0', backgroundColor: '#fff' }} />

                      <input placeholder="Driver Name (Opt)" value={vh.driverName} onChange={(e) => {
                        const updated = [...transporterVehicles];
                        updated[vIdx].driverName = e.target.value;
                        setTransporterVehicles(updated);
                      }} style={{ flex: 2, padding: '7px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box', minWidth: '0', backgroundColor: '#fff' }} />

                      {transporterVehicles.length > 1 && (
                        <button type="button" onClick={() => setTransporterVehicles(transporterVehicles.filter((_, i) => i !== vIdx))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', flexShrink: '0', padding: '0 4px' }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button onClick={handleSaveTransporter} style={{ flex: 1, backgroundColor: '#2563eb', color: '#fff', padding: '10px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Save Transport</button>
                  <button onClick={() => setActiveModal(null)} style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#475569', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                </div>
              </div>
            ) : activeModal === 'site' ? (
           /* 🏗️ 6. SITE MODAL FORM (COMPACT) */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                
                {/* Row 1: Plant State & Plant */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', boxSizing: 'border-box' }}>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Select Plant State *</label>
                    <select value={selectedPlantState} onChange={(e) => {
                      setSelectedPlantState(e.target.value);
                      setSelectedPlantId('');
                    }} style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                      <option value="">🌐 All States (General)</option>
                      {statesList.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Select Plant *</label>
                    <select value={selectedPlantId} onChange={(e) => setSelectedPlantId(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                      {filteredPlantsForSite.length === 0 ? (
                        <option value="" disabled>⚠️ No Plant Available</option>
                      ) : (
                        <>
                          <option value="">🌐 All Plants</option>
                          {filteredPlantsForSite.map(p => <option key={p.id} value={p.id}>{p.plant_name}</option>)}
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* Row 2: Party & Site Name */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', boxSizing: 'border-box' }}>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Select Party / Client *</label>
                    <select value={sitePartyName} onChange={(e) => setSitePartyName(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                      <option value="">-- Choose Party --</option>
                      {(outwardParties || [])
                        .filter(p => {
                          if (!selectedPlantId) return !p.plant_id || p.plant_id === 'All Plants (General)';
                          return p.plant_id == selectedPlantId || p.plant_id === 'All Plants (General)';
                        })
                        .map(p => (
                          <option key={p.id} value={p.name}>{p.name} {p.company_name ? `(${p.company_name})` : ''}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Site Name *</label>
                    <input placeholder="Enter site name..." value={siteName} onChange={(e) => setSiteName(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
                  </div>
                </div>

                {/* Row 3: Address (Single Row) */}
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Address</label>
                  <input placeholder="Enter full address..." value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
                </div>

                {/* Row 4: State & Phone (2 Columns) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', boxSizing: 'border-box' }}>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>State *</label>
                    <select value={siteState} onChange={(e) => setSiteState(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                      <option value="">-- State --</option>
                      {statesList.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Phone</label>
                    <input type="tel" placeholder="Phone..." value={sitePhone} onChange={(e) => setSitePhone(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
                  </div>
                </div>

                {/* 🛑 DIVIDER & HIGHLIGHT FOR BOM SECTION 🛑 */}
                <div style={{ borderTop: '2px dashed #cbd5e1', marginTop: '6px', paddingTop: '10px' }}>
                  <div style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🛠️ Site Work & BOM Details
                  </div>
                </div>

                {/* Row 5: Work Name & Work Size */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', boxSizing: 'border-box' }}>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Work Name *</label>
                    <input placeholder="e.g. U-Drain" value={WorkName} onChange={(e) => setWorkName(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Work Size *</label>
                    <input placeholder="e.g. 600x600" value={WorkSize} onChange={(e) => setWorkSize(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
                  </div>
                </div>

                {/* Row 6: Work Category & Expected Concrete */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', boxSizing: 'border-box' }}>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Work Category *</label>
                    <input placeholder="e.g. Footing" value={WorkCategory} onChange={(e) => setWorkCategory(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Expected Concrete (M³)</label>
                    <input type="number" step="0.001" placeholder="0.75" value={expectedM3} onChange={(e) => setExpectedM3(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
                  </div>
                </div>

                {/* Row 7: Effective Date */}
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '2px' }}>Effective From Date *</label>
                  <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }} />
                </div>

                {/* BOM Section (Compact) */}
                <div style={{ backgroundColor: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#0891b2' }}>📦 Bill of Materials (BOM)</span>
                    <button type="button" onClick={() => setBomItems([...bomItems, { material: '', consumption: '', unit: 'Nos' }])} style={{ backgroundColor: '#0891b2', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>+ Add</button>
                  </div>

                  {bomItems.map((bom, bIdx) => (
                    <div key={bIdx} style={{ display: 'flex', gap: '4px', marginBottom: '4px', alignItems: 'center' }}>
                      <select value={bom.material} onChange={(e) => {
                        const updated = [...bomItems];
                        updated[bIdx].material = e.target.value;
                        setBomItems(updated);
                      }} style={{ flex: 2, padding: '5px', fontSize: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}>
                        <option value="">-- Material --</option>
                        {availableMaterials.map(mat => <option key={mat.id} value={mat.name}>{mat.name}</option>)}
                      </select>
                      
                      <input type="number" placeholder="Qty" value={bom.consumption} onChange={(e) => {
                        const updated = [...bomItems];
                        updated[bIdx].consumption = e.target.value;
                        setBomItems(updated);
                      }} style={{ flex: 1, padding: '5px', fontSize: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />

                      <select value={bom.unit} onChange={(e) => {
                        const updated = [...bomItems];
                        updated[bIdx].unit = e.target.value;
                        setBomItems(updated);
                      }} style={{ flex: 1, padding: '5px', fontSize: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}>
                        <option value="Nos">Nos</option>
                        <option value="Bags">Bags</option>
                        <option value="Kg">Kg</option>
                   
                      </select>

                      {bomItems.length > 1 && (
                        <button type="button" onClick={() => setBomItems(bomItems.filter((_, i) => i !== bIdx))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}><Trash2 size={12} /></button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  <button onClick={handleSaveSite} style={{ flex: 1, backgroundColor: '#2563eb', color: '#fff', padding: '8px', borderRadius: '4px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>Save Site</button>
                  <button onClick={() => { setActiveModal(null); setSelectedPlantState(''); }} style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#475569', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                </div>
              </div>




            ) : activeModal === 'labour' ? (
              /* 👷 7. LABOUR MODAL FORM */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Assign Type *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => setAssignTarget('plant')} style={{ flex: 1, padding: '6px', fontSize: '11px', fontWeight: 'bold', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: assignTarget === 'plant' ? '#1e3a8a' : '#f1f5f9', color: assignTarget === 'plant' ? '#fff' : '#475569', cursor: 'pointer' }}>Plant Only</button>
                    <button type="button" onClick={() => setAssignTarget('site')} style={{ flex: 1, padding: '6px', fontSize: '11px', fontWeight: 'bold', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: assignTarget === 'site' ? '#2563eb' : '#f1f5f9', color: assignTarget === 'site' ? '#fff' : '#475569', cursor: 'pointer' }}>Site Only</button>
                    <button type="button" onClick={() => setAssignTarget('both')} style={{ flex: 1, padding: '6px', fontSize: '11px', fontWeight: 'bold', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: assignTarget === 'both' ? '#059669' : '#f1f5f9', color: assignTarget === 'both' ? '#fff' : '#475569', cursor: 'pointer' }}>Both</button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Select State *</label>
                  <select value={formStateFilter} onChange={(e) => {
                    setFormStateFilter(e.target.value);
                    setFormPlantFilter(''); 
                    setFormSite('all');     
                  }} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    <option value="">🌐 All States (General)</option>
                    {statesList.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Select Plant *</label>
                  <select value={formPlantFilter} onChange={(e) => setFormPlantFilter(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    {availablePlantsForForm.length === 0 ? (
                      <option value="" disabled>⚠️ No Plant Available in this State</option>
                    ) : (
                      <>
                        <option value="all">🌐 All Plants (General)</option>
                        {availablePlantsForForm.map(p => <option key={p.id} value={p.id}>{p.plant_name}</option>)}
                      </>
                    )}
                  </select>
                </div>

                {(assignTarget === 'site' || assignTarget === 'both') && (
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Select Site *</label>
                    <select value={formSite} onChange={(e) => setFormSite(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                      <option value="all">🌐 All Sites (General)</option>
                      {availableSitesForForm.map(s => <option key={s.id} value={s.site_name}>{s.site_name}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Labour / Team Name *</label>
                  <input placeholder="e.g. Team A" value={formName} onChange={(e) => setFormName(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Company Name (Optional)</label>
                    <input placeholder="Company name..." value={formCompanyName} onChange={(e) => setFormCompanyName(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Mobile Number (Optional)</label>
                    <input type="tel" placeholder="Mobile number..." value={formMobile} onChange={(e) => setFormMobile(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#9333ea' }}>💰 Labour Rates & Work Mappings</span>
                    <button type="button" onClick={() => setLabourRatesList([...labourRatesList, { workType: 'Product Rate', product: '', size: '', uom: 'Nos', rate: '', effectiveDate: new Date().toISOString().split('T')[0] }])} style={{ backgroundColor: '#9333ea', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>+ Add Rate Row</button>
                  </div>

                  {labourRatesList.map((item, idx) => {
                    const availableSizesForProduct = availableProductsForPlant
                      .filter(p => p.name === item.product)
                      .map(p => p.product_size)
                      .filter(Boolean);

                    return (
                      <div key={idx} style={{ backgroundColor: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
                        {labourRatesList.length > 1 && (
                          <button type="button" onClick={() => setLabourRatesList(labourRatesList.filter((_, i) => i !== idx))} style={{ position: 'absolute', top: '6px', right: '6px', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={14} /></button>
                        )}

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#475569' }}>Work Type:</label>
                            <select value={item.workType} onChange={(e) => {
                              const updated = [...labourRatesList];
                              updated[idx].workType = e.target.value;
                              if (e.target.value === 'Other Work') updated[idx].size = '-';
                              setLabourRatesList(updated);
                            }} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px' }}>
                              <option value="Product Rate">Product Rate (પ્રોડક્ટ)</option>
                              <option value="Other Work">Other Department (ડિપાર્ટમેન્ટ)</option>
                            </select>
                          </div>

                          {item.workType === 'Product Rate' ? (
                            <div style={{ flex: 1.5 }}>
                              <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#475569' }}>Product Name:</label>
                              <select value={item.product} onChange={(e) => {
                                const selProdName = e.target.value;
                                const updated = [...labourRatesList];
                                updated[idx].product = selProdName;
                                const matchedProducts = availableProductsForPlant.filter(p => p.name === selProdName);
                                updated[idx].size = matchedProducts.length > 0 ? (matchedProducts[0].product_size || '') : '';
                                setLabourRatesList(updated);
                              }} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px' }}>
                                <option value="">-- Select Product --</option>
                                {[...new Set(availableProductsForPlant.map(p => p.name))].map((pName, i) => (
                                  <option key={i} value={pName}>{pName}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div style={{ flex: 1.5 }}>
                              <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#475569' }}>Department Task:</label>
                              <input type="text" placeholder="e.g. Maintenance" value={item.product} onChange={(e) => {
                                const updated = [...labourRatesList];
                                updated[idx].product = e.target.value;
                                setLabourRatesList(updated);
                              }} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: item.workType === 'Product Rate' ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', gap: '6px' }}>
                          {item.workType === 'Product Rate' && (
                            <div>
                              <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#475569' }}>Size:</label>
                              <select value={item.size} onChange={(e) => {
                                const updated = [...labourRatesList];
                                updated[idx].size = e.target.value;
                                setLabourRatesList(updated);
                              }} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff' }}>
                                <option value="">-- Size --</option>
                                {availableSizesForProduct.map((sz, sIdx) => (
                                  <option key={sIdx} value={sz}>{sz}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div>
                            <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#475569' }}>UOM:</label>
                            <select value={item.uom} onChange={(e) => {
                              const updated = [...labourRatesList];
                              updated[idx].uom = e.target.value;
                              setLabourRatesList(updated);
                            }} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px' }}>
                              <option value="Nos">Nos</option>
                              <option value="Lines">Lines</option>
                              <option value="Hours">Hours</option>
                              <option value="Days">Days</option>
                              <option value="SqFt">SqFt</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#475569' }}>Rate (₹):</label>
                            <input type="number" placeholder="Rate" value={item.rate} onChange={(e) => {
                              const updated = [...labourRatesList];
                              updated[idx].rate = e.target.value;
                              setLabourRatesList(updated);
                            }} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
                          </div>

                          <div>
                            <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#475569' }}>Effective From:</label>
                            <input type="date" value={item.effectiveDate} onChange={(e) => {
                              const updated = [...labourRatesList];
                              updated[idx].effectiveDate = e.target.value;
                              setLabourRatesList(updated);
                            }} style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '10px', boxSizing: 'border-box' }} />
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button onClick={handleSaveModalData} style={{ flex: 1, backgroundColor: '#2563eb', color: '#fff', padding: '10px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Save Labour & Rates</button>
                  <button onClick={() => setActiveModal(null)} style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#475569', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                </div>
              </div>
            ) : (
              /* 📦 8. DEFAULT MODAL (Supplier, Material, Description) */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Assign Type *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => setAssignTarget('plant')} style={{ flex: 1, padding: '6px', fontSize: '11px', fontWeight: 'bold', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: assignTarget === 'plant' ? '#1e3a8a' : '#f1f5f9', color: assignTarget === 'plant' ? '#fff' : '#475569', cursor: 'pointer' }}>Plant Only</button>
                    <button type="button" onClick={() => setAssignTarget('site')} style={{ flex: 1, padding: '6px', fontSize: '11px', fontWeight: 'bold', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: assignTarget === 'site' ? '#2563eb' : '#f1f5f9', color: assignTarget === 'site' ? '#fff' : '#475569', cursor: 'pointer' }}>Site Only</button>
                    <button type="button" onClick={() => setAssignTarget('both')} style={{ flex: 1, padding: '6px', fontSize: '11px', fontWeight: 'bold', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: assignTarget === 'both' ? '#059669' : '#f1f5f9', color: assignTarget === 'both' ? '#fff' : '#475569', cursor: 'pointer' }}>Both</button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Select State *</label>
                  <select value={formStateFilter} onChange={(e) => {
                    setFormStateFilter(e.target.value);
                    setFormPlantFilter(''); 
                    setFormSite('all');     
                  }} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    <option value="">🌐 All States (General)</option>
                    {statesList.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Select Plant *</label>
                  <select value={formPlantFilter} onChange={(e) => setFormPlantFilter(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    {availablePlantsForForm.length === 0 ? (
                      <option value="" disabled>⚠️ No Plant Available in this State</option>
                    ) : (
                      <>
                        <option value="all">🌐 All Plants (General)</option>
                        {availablePlantsForForm.map(p => <option key={p.id} value={p.id}>{p.plant_name}</option>)}
                      </>
                    )}
                  </select>
                </div>

                {(assignTarget === 'site' || assignTarget === 'both') && (
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Select Site *</label>
                    <select value={formSite} onChange={(e) => setFormSite(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                      <option value="all">🌐 All Sites (General)</option>
                      {availableSitesForForm.map(s => <option key={s.id} value={s.site_name}>{s.site_name}</option>)}
                    </select>
                  </div>
                )}

              

              {/* 🎯 Company Name હવે ઉપર આવી ગયું અને ફરજિયાત (*) થઈ ગયું */}
                {activeModal !== 'material' && activeModal !== 'description' && (
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Company Name *
                    </label>
                    <input placeholder="Enter company name..." value={formCompanyName} onChange={(e) => setFormCompanyName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>
                )}

                {/* 🎯 Name (વ્યક્તિનું નામ) હવે નીચે આવી ગયું અને ઓપ્શનલ થઈ ગયું */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>
                    {activeModal === 'material' ? 'Material Name *' : activeModal === 'description' ? 'Work Description *' : 'Contact Person Name (Optional)'}
                  </label>
                  <input placeholder="Enter name..." value={formName} onChange={(e) => setFormName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>

                {activeModal !== 'material' && activeModal !== 'description' && (
                  <>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Mobile Number (Optional)</label>
                      <input type="tel" placeholder="Enter mobile number..." value={formMobile} onChange={(e) => setFormMobile(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                    </div>
                  </>
                )}

                {activeModal === 'material' && (
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Item Category *</label>
                    <select value={materialItemType} onChange={(e) => setMaterialItemType(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                      <option value="Raw Material">1. Raw Material</option>
                      <option value="Consumable Item">2. Consumable Item</option>
                      <option value="Tools and Hardware">3. Tools and Hardware</option>
                      <option value="Finished Product">4. Finished Product</option>
                      <option value="Asset">5. Asset</option>
                    </select>
                  </div>
                )}

                {activeModal === 'supplier' && (
                  <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#059669' }}>📦 Linked Materials</span>
                      <button type="button" onClick={() => setSupplierMaterialsList([...supplierMaterialsList, { materialName: '' }])} style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>+ Add Row</button>
                    </div>

                    {supplierMaterialsList.map((supMat, sIdx) => (
                      <div key={sIdx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <select value={supMat.materialName} onChange={(e) => {
                          const updated = [...supplierMaterialsList];
                          updated[sIdx].materialName = e.target.value;
                          setSupplierMaterialsList(updated);
                        }} style={{ flex: 1, padding: '7px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                          <option value="">-- Select Material --</option>
                          {availableMaterials.map(mat => <option key={mat.id} value={mat.name}>{mat.name}</option>)}
                        </select>

                        {supplierMaterialsList.length > 1 && (
                          <button type="button" onClick={() => setSupplierMaterialsList(supplierMaterialsList.filter((_, i) => i !== sIdx))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}><Trash2 size={14} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button onClick={handleSaveModalData} style={{ flex: 1, backgroundColor: '#2563eb', color: '#fff', padding: '10px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Save</button>
                  <button onClick={() => setActiveModal(null)} style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#475569', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                </div>
              </div>
            )}  

          </div>
        </div>
      )}





    </div>
  )
}

export default AddPlantVendorPage;