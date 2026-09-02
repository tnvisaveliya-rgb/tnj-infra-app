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

  const [productName, setProductName] = useState('') 
  const [productSize, setProductSize] = useState('') 
  const [productCategory, setProductCategory] = useState('') 
  const [bomItems, setBomItems] = useState([{ material: '', consumption: '', unit: 'Nos' }]) 

  const [activeModal, setActiveModal] = useState(null)
  const [showViewSection, setShowViewSection] = useState(false)
  const [showSiteListSection, setShowSiteListSection] = useState(false)

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

    const { data: sitesData } = await supabase.from('sites').select('*, plants(plant_name)')
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
 const handleSaveSite = async () => {
    if (!selectedPlantId) { showAlert("કૃપા કરીને પહેલા પ્લાન્ટ સિલેક્ટ કરો!"); return; }
    if (!sitePartyName) { showAlert("કૃપા કરીને પાર્ટી સિલેક્ટ કરો!"); return; } // 👈 પાર્ટી સિલેક્ટ કરવી ફરજિયાત છે
    if (!siteName.trim()) { showAlert("Please enter site name!"); return; }
    if (!siteState) { showAlert("Please select state!"); return; }
    
    const exists = sites.some(s => s.site_name.trim().toLowerCase() === siteName.trim().toLowerCase())
    if (exists) { showAlert("This site is already existing!"); return; }

    const payload = { 
      plant_id: selectedPlantId, 
      party_name: sitePartyName.trim(), // 👈 પાર્ટીનું નામ સેવ થશે
      site_name: siteName.trim(), 
      address: siteAddress.trim() || '', 
      state: siteState.trim(), 
      phone: sitePhone.trim() || ''
    }

    const { error } = await supabase.from('sites').insert([payload])
    
    if (error) {
      showAlert("Error: " + error.message);
    } else { 
      showAlert("Site Added Successfully!"); 
      setSelectedPlantId(''); 
      setSitePartyName(''); // 👈 સક્સેસ થયા પછી પાર્ટી રીસેટ થઈ જશે
      setSiteName(''); 
      setSiteAddress(''); 
      setSiteState(''); 
      setSitePhone(''); 
      setActiveModal(null); 
      await loadAllData(); 
    }
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
      bom_items: bomItems 
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

    // 🎯 ૧. એ જ નામની બીજી કોઈ સાઈટ પહેલેથી અવેલેબલ છે કે નહીં તે ચેક કરવું (પોતાની આઈડી છોડીને)
    const { data: duplicateCheck, error: checkErr } = await supabase
      .from('sites')
      .select('id, site_name')
      .ilike('site_name', editSiteForm.site_name.trim())
      .neq('id', id); // 👈 પોતાની આઈડી સિવાય બાકીની સાઈટ્સ ચેક કરશે

    if (checkErr) {
      showAlert("Error checking duplicate: " + checkErr.message);
      return;
    }

    if (duplicateCheck && duplicateCheck.length > 0) {
      showAlert("❌ આ નામની સાઈટ પહેલેથી જ અવેલેબલ છે! ડુપ્લિકેટ એન્ટ્રી બંધ છે.");
      return;
    }

    // 🎯 ૨. જો ડુપ્લિકેટ ન હોય તો અપડેટ કરવું
    const { error } = await supabase
      .from('sites')
      .update({
        site_name: editSiteForm.site_name.trim(),
        address: editSiteForm.address.trim() || '',
        state: editSiteForm.state,
        phone: editSiteForm.phone.trim() || ''
      })
      .eq('id', id);

    if (error) {
      showAlert("Error updating site: " + error.message);
    } else {
      showAlert("✅ Site Successfully Updated!");
      setEditingSiteId(null);
      loadAllData();
    }
  };
 const handleGenericUpdate = async (tableName, id, formData) => {
    if (!formData.name || !formData.name.trim()) { 
      showAlert("Please enter name!"); 
      return; 
    }

    // ડુપ્લિકેટ ચેક
    const { data: duplicateCheck, error: checkErr } = await supabase
      .from(tableName)
      .select('id, name')
      .ilike('name', formData.name.trim())
      .neq('id', id);

    if (checkErr) {
      showAlert("Error checking duplicate: " + checkErr.message);
      return;
    }

    if (duplicateCheck && duplicateCheck.length > 0) {
      showAlert("❌ આ નામની એન્ટ્રી પહેલેથી જ અવેલેબલ છે!");
      return;
    }

    // 🎯 formData ની અંદર જેટલી પણ કોલમ્સ હશે તે બધી જ એકસાથે અપડેટ થઈ જશે
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
 const handleLabourUpdate = async (contractorId, formData) => {
    if (!formData.name || !formData.name.trim()) { 
      showAlert("Please enter Labour/Team name!"); 
      return; 
    }

    // ૧. પહેલા contractors ટેબલ અપડેટ કરો (નામ, કંપની, મોબાઈલ અને સાઈટ)
    const { error: contractorErr } = await supabase
      .from('contractors')
      .update({
        name: formData.name.trim(),
        company_name: formData.company_name ? formData.company_name.trim() : '',
        mobile: formData.mobile ? formData.mobile.trim() : '',
        site_name: formData.site_name || 'All Sites (General)' // 👈 સાઈટ અપડેટ કરવા માટે
      })
      .eq('id', contractorId);

    if (contractorErr) {
      showAlert("Error updating contractor: " + contractorErr.message);
      return;
    }
    // (બાકીનું રેટ્સ અપડેટ કરવાનું લોજિક સેમ રહેશે...)

    // ૨. હવે labour_product_rates ટેબલના રેટ્સ અપડેટ કે ઇન્સર્ટ કરો (જેમ નવા સેવ કરતી વખતે થાય છે)
    if (Array.isArray(formData.rates_mapping)) {
      for (let rateRow of formData.rates_mapping) {
        if (!rateRow.rate) continue; // જો રેટ ખાલી હોય તો સ્કીપ કરો

        const ratePayload = {
          plant_name: formData.plant_name || (typeof selectedPlantName !== 'undefined' ? selectedPlantName : 'T&J INFRA'),
          team_name: formData.name.trim(), // લેબરનું નામ (team_name)
          work_type: rateRow.work_type || 'Product Rate',
          product_name: rateRow.work_type === 'Product Rate' ? (rateRow.product_name || '') : 'Other Department Work',
          product_size: rateRow.work_type === 'Product Rate' ? (rateRow.product_size || rateRow.size || '') : '-',
          uom: rateRow.uom || 'Nos',
          rate: Number(rateRow.rate),
          effective_from: rateRow.effective_from || new Date().toISOString().split('T')[0]
        };

        if (rateRow.id) {
          // જો અગાઉનો રેટ હોય તો તેને ID થી UPDATE કરો
          const { error: updateErr } = await supabase
            .from('labour_product_rates')
            .update(ratePayload)
            .eq('id', rateRow.id);

          if (updateErr) {
            console.error("Rate Update Error:", updateErr.message);
          }
        } else {
          // જો એડિટ કરતી વખતે નવો રેટ પ્લસ કર્યો હોય તો INSERT કરો
          const { error: insertErr } = await supabase
            .from('labour_product_rates')
            .insert([ratePayload]);

          if (insertErr) {
            console.error("Rate Insert Error:", insertErr.message);
          }
        }
      }
    }

    showAlert("✅ Labour & Rates Successfully Updated!");
    setEditingListId(null);
    if (typeof loadAllData === 'function') loadAllData();
  };
  const handleSaveLabourTransfer = async () => {
  if (!transferForm.id || !transferForm.name) {
    alert('કૃપા કરીને લેબર સિલેક્ટ કરો અને નામ ભરો.');
    return;
  }
  
  // Supabase માં અપડેટ કરવાની ક્વેરી
  const { error } = await supabase
    .from('contractors') // તમારું લેબરનું ટેબલ નેમ
    .update({
      name: transferForm.name,
      mobile: transferForm.mobile,
      plant_id: transferForm.plant_id,
      site_name: transferForm.site_name
    })
    .eq('id', transferForm.id);

  if (error) {
    alert('Error updating: ' + error.message);
  } else {
    alert('સફળતાપૂર્વક અપડેટ અને ટ્રાન્સફર થઈ ગયું!');
    setActiveModal(null);
    // fetchData(); // જો ડેટા રિફ્રેશ કરવાનું ફંક્શન હોય તો અહીં મૂકી દેવું
  }
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

  const availableProductsForPlant = products.filter(p => 
    formPlantId === 'all' || p.plant_id == formPlantId || !p.plant_id
  );

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
    const matchesState = filterSiteState === 'all' || s.state === filterSiteState;
    const matchesPlant = filterSitePlant === 'all' || s.plant_id == filterSitePlant;
    const matchesSearch = !searchSiteQuery || 
      s.site_name.toLowerCase().includes(searchSiteQuery.toLowerCase()) || 
      (s.address && s.address.toLowerCase().includes(searchSiteQuery.toLowerCase()));
    return matchesState && matchesPlant && matchesSearch;
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
  return (
    <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}>
      
      {/* Top Header & Toggles */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>🏗️ Master Management</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowSiteListSection(!showSiteListSection)} style={{ backgroundColor: showSiteListSection ? '#475569' : '#0284c7', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building size={14} /> {showSiteListSection ? 'Hide Sites' : 'View Sites'}
          </button>
          <button onClick={() => setShowViewSection(!showViewSection)} style={{ backgroundColor: showViewSection ? '#475569' : '#0f172a', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Eye size={14} /> {showViewSection ? 'Hide Lists' : 'View Lists'}
          </button>
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
      {/* ACTION BUTTONS CARD */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={() => setActiveModal('plant')} style={{ backgroundColor: '#1e3a8a', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}><Plus size={16} /> 1. Add New Plant</button>
          <button onClick={() => setActiveModal('site')} style={{ backgroundColor: '#2563eb', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}><Plus size={16} /> 2. Add New Site</button>
          <button onClick={() => setActiveModal('supplier')} style={{ backgroundColor: '#059669', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}><Plus size={16} /> 3. Add Supplier</button>
          <button onClick={() => setActiveModal('party')} style={{ backgroundColor: '#ea580c', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}><Plus size={16} /> 4. Add New Customer / Party</button>
          <button onClick={() => setActiveModal('labour')} style={{ backgroundColor: '#9333ea', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}><Plus size={16} /> 5. Add New Labour</button>
          <button onClick={() => setActiveModal('material')} style={{ backgroundColor: '#4f46e5', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}><Plus size={16} /> 6. Add Material</button>
          <button onClick={() => setActiveModal('description')} style={{ backgroundColor: '#d97706', color: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}><Plus size={16} /> 7. Add Description</button>
          <button onClick={() => setActiveModal('product')} style={{ backgroundColor: '#0891b2', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}><Plus size={16} /> 8. Add Products Name</button>
          <button onClick={() => setActiveModal('transport')} style={{ backgroundColor: '#0284c7', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}><Plus size={16} /> 9. Add Transpoter</button>
          <button onClick={() => {
  setTransferForm({ id: '', name: '', mobile: '', plant_id: '', site_name: '' });
  setActiveModal('labourTransfer');
}} style={{ backgroundColor: '#1d4ed8', color: '#fff', padding: '8px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
  🔄 Edit / Transfer Labour
</button>
        </div>
      </div>

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
                 '🏷️ Add Products Name'}

              </h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
            </div>

            {/* PRODUCT MODAL FORM */}
            {activeModal === 'product' ? (
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

    {/* 🎯 Effective Date ઇનપુટ ઉમેરવામાં આવ્યું છે */}
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
            <option value="Tons">Tons</option>
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

  // ... (Plant modal code)
           ) : activeModal === 'plant' ? (
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
              /* 🎯 ADD CUSTOMER / PARTY MODAL (ONLY PLANT LEVEL, NO SITES) */
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
    
    {/* 🎯 જો તે સ્ટેટના પ્લાન્ટ્સ ઝીરો હોય તો નો પ્લાન્ટ બતાવશે */}
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
              // 🚚 🎯 Transport Modal
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
    
    {/* 🎯 જો તે સ્ટેટના પ્લાન્ટ્સ ઝીરો હોય તો નો પ્લાન્ટ બતાવશે */}
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

                <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#0284c7' }}>🚛 Vehicles List (વાહનોની વિગતો)</span>
                    <button type="button" onClick={() => setTransporterVehicles([...transporterVehicles, { vehicleNo: '', driverName: '' }])} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>+ Add Vehicle Row</button>
                  </div>

                  {transporterVehicles.map((vh, vIdx) => (
                    <div key={vIdx} style={{ display: 'flex', gap: '6px', alignItems: 'center', backgroundColor: '#fff', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <input placeholder="Vehicle No (e.g. GJ01AB1234)" value={vh.vehicleNo} onChange={(e) => {
                        const updated = [...transporterVehicles];
                        updated[vIdx].vehicleNo = e.target.value;
                        setTransporterVehicles(updated);
                      }} style={{ flex: 2, padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />

                      <input placeholder="Driver Name (Opt)" value={vh.driverName} onChange={(e) => {
                        const updated = [...transporterVehicles];
                        updated[vIdx].driverName = e.target.value;
                        setTransporterVehicles(updated);
                      }} style={{ flex: 2, padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />

                      {transporterVehicles.length > 1 && (
                        <button type="button" onClick={() => setTransporterVehicles(transporterVehicles.filter((_, i) => i !== vIdx))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}>✕</button>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* 🎯 ૧. Select Plant State */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Select Plant State *</label>
                  <select value={selectedPlantState} onChange={(e) => {
                    setSelectedPlantState(e.target.value);
                    setSelectedPlantId(''); // સ્ટેટ બદલાય એટલે પ્લાન્ટ રીસેટ થઈ જાય
                  }} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    <option value="">🌐 All States (General)</option>
                    {statesList.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>

                {/* 🎯 ૨. Select Plant (All Plants ઓપ્શન સાથે) */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Select Plant *</label>
                  <select value={selectedPlantId} onChange={(e) => setSelectedPlantId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    
                    {filteredPlantsForSite.length === 0 ? (
                      <option value="" disabled>⚠️ No Plant Available in this State</option>
                    ) : (
                      <>
                        <option value="">🌐 All Plants (General)</option>
                        {filteredPlantsForSite.map(p => <option key={p.id} value={p.id}>{p.plant_name}</option>)}
                      </>
                    )}
                  </select>
                </div>

                {/* 🎯 ૩. Select Party / Client (ફક્ત સિલેક્ટ કરેલા પ્લાન્ટ કે જનરલ પાર્ટીઓ જ દેખાશે) */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Select Party / Client *</label>
                  <select value={sitePartyName} onChange={(e) => setSitePartyName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    <option value="">-- Choose Party --</option>
                    {(outwardParties || [])
                      .filter(p => {
                        // જો ઉપર 'All Plants' કે ખાલી હોય તો બધી જ જનરલ/પ્લાન્ટ વગરની પાર્ટીઓ દેખાશે
                        if (!selectedPlantId) {
                          return !p.plant_id || p.plant_id === 'All Plants (General)';
                        }
                        // બાકી માત્ર એ જ પાર્ટી આવશે જે આ પ્લાન્ટ સાથે જોડાયેલી હોય
                        return p.plant_id == selectedPlantId || p.plant_id === 'All Plants (General)';
                      })
                      .map(p => (
                        <option key={p.id} value={p.name}>{p.name} {p.company_name ? `(${p.company_name})` : ''}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Site Name *</label>
                  <input placeholder="Enter site name..." value={siteName} onChange={(e) => setSiteName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Address (Optional)</label>
                  <input placeholder="Enter address..." value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>State *</label>
                  <select value={siteState} onChange={(e) => setSiteState(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    <option value="">-- Choose State --</option>
                    {statesList.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Phone Number (Optional)</label>
                  <input type="tel" placeholder="Enter phone number..." value={sitePhone} onChange={(e) => setSitePhone(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button onClick={handleSaveSite} style={{ flex: 1, backgroundColor: '#2563eb', color: '#fff', padding: '10px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Save Site</button>
                  <button onClick={() => { setActiveModal(null); setSelectedPlantState(''); }} style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#475569', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                </div>
              </div>
              
            ) : activeModal === 'labour' ? (
              // 🎯 મલ્ટીપલ રેટ એડ કરવા માટેનું સુધારેલું ફોર્મ (પ્રોડક્ટ અને ડિપાર્ટમેન્ટ બંને એકસાથે)
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
 <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Assign Type *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => setAssignTarget('plant')} style={{ flex: 1, padding: '6px', fontSize: '11px', fontWeight: 'bold', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: assignTarget === 'plant' ? '#1e3a8a' : '#f1f5f9', color: assignTarget === 'plant' ? '#fff' : '#475569', cursor: 'pointer' }}>Plant Only</button>
                    <button type="button" onClick={() => setAssignTarget('site')} style={{ flex: 1, padding: '6px', fontSize: '11px', fontWeight: 'bold', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: assignTarget === 'site' ? '#2563eb' : '#f1f5f9', color: assignTarget === 'site' ? '#fff' : '#475569', cursor: 'pointer' }}>Site Only</button>
                    <button type="button" onClick={() => setAssignTarget('both')} style={{ flex: 1, padding: '6px', fontSize: '11px', fontWeight: 'bold', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: assignTarget === 'both' ? '#059669' : '#f1f5f9', color: assignTarget === 'both' ? '#fff' : '#475569', cursor: 'pointer' }}>Both</button>
                  </div>
                </div>


                {/* 🎯 ૧. સ્ટેટ ફિલ્ટર */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Select State *</label>
                  <select value={formStateFilter} onChange={(e) => {
                    setFormStateFilter(e.target.value);
                    setFormPlantFilter(''); // સ્ટેટ બદલાય એટલે પ્લાન્ટ ખાલી થઈ જાય
                    setFormSite('all');     // સાઈટ રીસેટ થઈ જાય
                  }} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    <option value="">🌐 All States (General)</option>
                    {statesList.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>

                <div>
  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Select Plant *</label>
  <select value={formPlantFilter} onChange={(e) => setFormPlantFilter(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
    
    {/* 🎯 જો તે સ્ટેટના પ્લાન્ટ્સ ઝીરો હોય તો નો પ્લાન્ટ બતાવશે */}
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

                {/* 🎯 ૩. ફાઇનલ સાઈટ ડ્રોપડાઉન (જેમાં માત્ર તે જ પ્લાન્ટની સાઈટ્સ દેખાશે) */}
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

               {/* 🎯 Multiple Labour Rates & Work Types Section */}
<div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#9333ea' }}>💰 Labour Rates & Work Mappings (પ્રોડક્ટ અને ડિપાર્ટમેન્ટ રેટ્સ)</span>
    <button type="button" onClick={() => setLabourRatesList([...labourRatesList, { workType: 'Product Rate', product: '', size: '', uom: 'Nos', rate: '', effectiveDate: new Date().toISOString().split('T')[0] }])} style={{ backgroundColor: '#9333ea', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>+ Add Rate Row</button>
  </div>

  {labourRatesList.map((item, idx) => {
    // 🎯 જે તે સિલેક્ટ કરેલી પ્રોડક્ટની બધી જ ઉપલબ્ધ સાઈઝ શોધવા માટે (જેમ કે 6 અને 8)
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
              if (e.target.value === 'Other Work') {
                updated[idx].size = '-'; // જો ડિપાર્ટમેન્ટ હોય તો સાઈઝ ડૅશ કરી દેવી
              }
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
                
                // પહેલી સાઈઝ ઓટોમેટિક સેટ કરવી
                const matchedProducts = availableProductsForPlant.filter(p => p.name === selProdName);
                if (matchedProducts.length > 0) {
                  updated[idx].size = matchedProducts[0].product_size || '';
                } else {
                  updated[idx].size = '';
                }
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
          
          {/* 🎯 જો પ્રોડક્ટ રેટ હોય તો જ સાઈઝનું ડ્રોપડાઉન બતાવવું */}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Assign Type *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
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

                {/* 🎯 ૨. Select Plant (હવે તે Site Only માં પણ કાયમ દેખાશે) */}
               <div>
  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Select Plant *</label>
  <select value={formPlantFilter} onChange={(e) => setFormPlantFilter(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
    
    {/* 🎯 જો તે સ્ટેટના પ્લાન્ટ્સ ઝીરો હોય તો નો પ્લાન્ટ બતાવશે */}
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

                {/* 🎯 ૩. Select Site (જો Assign Type માં Site કે Both હોય તો જ દેખાશે) */}
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
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>
                    {activeModal === 'material' ? 'Material Name *' : activeModal === 'description' ? 'Work Description *' : 'Name *'}
                  </label>
                  <input placeholder="Enter name..." value={formName} onChange={(e) => setFormName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>

                {activeModal !== 'material' && activeModal !== 'description' && (
                  <>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Company Name (Optional)</label>
                      <input placeholder="Enter company name..." value={formCompanyName} onChange={(e) => setFormCompanyName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Mobile Number (Optional)</label>
                      <input type="tel" placeholder="Enter mobile number..." value={formMobile} onChange={(e) => setFormMobile(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                    </div>
                  </>
                )}
{/* 🎯 જો મટીરિયલ હોય તો જ Item Category નું ડ્રોપડાઉન દેખાશે */}
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
                {/* 🎯 ફક્ત Supplier ફોર્મ માટે જ મટીરિયલ રો સેક્શન */}
            {activeModal === 'supplier' && (
              <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#059669' }}>📦 Linked Materials (કયું મટીરિયલ આવે છે?)</span>
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




{/* 🏗️ VIEW SITES SECTION (સાઈટ્સ જોવા અને મેનેજ કરવા માટે) */}
{showSiteListSection && (
  <div style={{ marginTop: '24px', backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
    
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>🏢 Sites List & Manage</h3>
    </div>

    {/* સાઈટ માટેના ફિલ્ટર્સ (State, Plant અને Search) */}
    <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
      
      {/* ૧. State Filter */}
      <select value={filterSiteState} onChange={(e) => { setFilterSiteState(e.target.value); setFilterSitePlant('all'); }} style={{ flex: '1 1 120px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', fontWeight: '600', boxSizing: 'border-box' }}>
        <option value="all">🌐 All States</option>
        {statesList.map(st => <option key={st} value={st}>{st}</option>)}
      </select>

      {/* ૨. Plant Filter */}
     <div>
  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Select Plant *</label>
  <select value={formPlantFilter} onChange={(e) => setFormPlantFilter(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
    
    {/* 🎯 જો તે સ્ટેટના પ્લાન્ટ્સ ઝીરો હોય તો નો પ્લાન્ટ બતાવશે */}
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

      {/* ૩. Search Box */}
      <input placeholder="🔍 Search site name..." value={searchSiteQuery} onChange={(e) => setSearchSiteQuery(e.target.value)} style={{ flex: '2 1 140px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
    
    </div>

    {/* સાઈટ્સની યાદી */}
    <div>
      {filteredSites.length === 0 ? <p style={{ fontSize: '12px', color: '#64748b' }}>No sites found.</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filteredSites.map(s => {
            const plantObj = (plants || []).find(p => p.id === s.plant_id);
            return (
              <div key={s.id} style={{ display: 'flex', flexDirection: 'column', padding: '10px 12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', gap: '6px', boxSizing: 'border-box' }}>
                {editingSiteId === s.id ? (
                  
                  /* સાઈટ એડિટ કરવા માટેનું ફોર્મ */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input placeholder="Site Name" value={editSiteForm.site_name || ''} onChange={(e) => setEditSiteForm({ ...editSiteForm, site_name: e.target.value })} style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                    <input placeholder="Address" value={editSiteForm.address || ''} onChange={(e) => setEditSiteForm({ ...editSiteForm, address: e.target.value })} style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <select value={editSiteForm.state || ''} onChange={(e) => setEditSiteForm({ ...editSiteForm, state: e.target.value })} style={{ flex: 1, padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}>
                        <option value="">-- Select State --</option>
                        {statesList.map(st => <option key={st} value={st}>{st}</option>)}
                      </select>
                      <input placeholder="Phone" value={editSiteForm.phone || ''} onChange={(e) => setEditSiteForm({ ...editSiteForm, phone: e.target.value })} style={{ flex: 1, padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <button onClick={() => handleUpdateSite(s.id)} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
                      <button onClick={() => setEditingSiteId(null)} style={{ backgroundColor: '#cbd5e1', color: '#1e293b', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>

                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '13px' }}>{s.site_name}</span>
                      {plantObj && <span style={{ fontSize: '11px', color: '#1e3a8a', marginLeft: '6px', fontWeight: '600' }}>[Plant: {plantObj.plant_name}]</span>}
                      {s.state && <span style={{ fontSize: '10px', color: '#059669', marginLeft: '6px', backgroundColor: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>{s.state}</span>}
                      {s.phone && <span style={{ fontSize: '11px', color: '#0284c7', marginLeft: '8px' }}>📞 {s.phone}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button onClick={() => { setEditingSiteId(s.id); setEditSiteForm({ site_name: s.site_name, address: s.address || '', state: s.state || '', phone: s.phone || '' }); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}><Edit2 size={14} /></button>
                      <button onClick={() => handleDeleteSite(s.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={14} /></button>
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

{activeModal === 'labourTransfer' && (
  <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '15px', color: '#1e3a8a' }}>🔄 Edit & Site Transfer</h3>
        <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#64748b' }}>✕</button>
      </div>

      {/* 🎯 કયા લેબરને એડિટ કરવું છે તેનું ડ્રોપડાઉન */}
      <div>
        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Select Labour *</label>
        <select value={transferForm.id || ''} onChange={(e) => {
          const lId = e.target.value;
          const found = (contractors || []).find(c => c.id == lId);
          if (found) {
            setTransferForm({
              id: found.id,
              name: found.name || '',
              mobile: found.mobile || '',
              plant_id: found.plant_id || '',
              site_name: found.site_name || ''
            });
          } else {
            setTransferForm({ id: '', name: '', mobile: '', plant_id: '', site_name: '' });
          }
        }} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
          <option value="">-- Choose Labour to Edit/Transfer --</option>
          {(contractors || []).map(c => (
            <option key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ''} - [{c.site_name || 'General'}]</option>
          ))}
        </select>
      </div>

      {transferForm.id && (
        <>
          {/* 🎯 નામ એડિટ કરવા માટે */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Labour Name *</label>
            <input type="text" value={transferForm.name} onChange={(e) => setTransferForm({ ...transferForm, name: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
          </div>

          {/* 🎯 મોબાઈલ નંબર એડિટ કરવા માટે */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Mobile Number</label>
            <input type="tel" value={transferForm.mobile} onChange={(e) => setTransferForm({ ...transferForm, mobile: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
          </div>

          {/* 🎯 નવો પ્લાન્ટ સિલેક્ટ કરવા માટે */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Transfer to Plant *</label>
            <select value={transferForm.plant_id} onChange={(e) => setTransferForm({ ...transferForm, plant_id: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
              <option value="">-- Choose Plant --</option>
              <option value="All Plants (General)">🌐 All Plants (General)</option>
              {(plants || []).map(p => (
                <option key={p.id} value={p.id}>{p.plant_name}</option>
              ))}
            </select>
          </div>

          {/* 🎯 નવી સાઈટ સિલેક્ટ અથવા એન્ટ્રી કરવા માટે */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Transfer to Site Name *</label>
            <input type="text" placeholder="Enter site name..." value={transferForm.site_name} onChange={(e) => setTransferForm({ ...transferForm, site_name: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
          </div>
        </>
      )}

      {/* 🎯 બટન્સ */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
        <button onClick={handleSaveLabourTransfer} style={{ flex: 1, backgroundColor: '#2563eb', color: '#fff', padding: '8px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}>Update & Transfer</button>
        <button onClick={() => setActiveModal(null)} style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#475569', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
      </div>

    </div>
  </div>
)}

{/* VIEW LISTS SECTION */}
      {showViewSection && (
        <div style={{ marginTop: '24px', backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>📋 View Lists & Manage</h3>
          </div>

          {/* 🎯 State, Plant અને Search Box નું ફિલ્ટર સેટઅપ */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
            
            {/* ૧. State Filter */}
            <select value={filterListViewState} onChange={(e) => { setFilterListViewState(e.target.value); setFilterListViewPlant('all'); setFilterViewSite('all'); }} style={{ flex: '1 1 100px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', fontWeight: '600', boxSizing: 'border-box' }}>
              <option value="all">🌐 All States</option>
              {statesList.map(st => <option key={st} value={st}>{st}</option>)}
            </select>

            {/* ૨. Plant Filter */}
           <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Select Plant *</label>
                              
                              {/* 🎯 ફિલ્ટર થયેલા પ્લાન્ટ્સની લિસ્ટ મેળવવી */}
                              {(() => {
                                const filteredPlants = (plants || []).filter(p => {
                                  if (!editListForm.selected_state || editListForm.selected_state === 'All state (General)') {
                                    return true;
                                  }
                                  return p.state && p.state.trim().toLowerCase() === editListForm.selected_state.trim().toLowerCase();
                                });

                                return (
                                  <select value={editListForm.plant_id || ''} onChange={(e) => {
                                    const selPlantId = e.target.value;
                                    setEditListForm({ 
                                      ...editListForm, 
                                      plant_id: selPlantId,
                                      site_name: '' 
                                    });
                                  }} style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                                    
                                    {filteredPlants.length === 0 ? (
                                      <option value="" disabled>⚠️ No Plant Available in this State</option>
                                    ) : (
                                      <>
                                        <option value="">-- Choose Plant --</option>
                                        <option value="All Plant (General)">🌐 All Plant (General)</option>
                                        {filteredPlants.map(p => (
                                          <option key={p.id} value={p.id}>{p.plant_name}</option>
                                        ))}
                                      </>
                                    )}
                                  </select>
                                );
                              })()}
                            </div>

            {/* ૩. Search Box */}
            <input placeholder="🔍 Search name..." value={searchListQuery} onChange={(e) => setSearchListQuery(e.target.value)} style={{ flex: '2 1 140px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
          
          </div>

          {/* Tabs Navigation */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <button onClick={() => setViewTab('vendors')} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: viewTab === 'vendors' ? '#059669' : '#f1f5f9', color: viewTab === 'vendors' ? '#fff' : '#475569', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>Suppliers ({filteredVendors.length})</button>
            <button onClick={() => setViewTab('parties')} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: viewTab === 'parties' ? '#ea580c' : '#f1f5f9', color: viewTab === 'parties' ? '#fff' : '#475569', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>Parties ({filteredParties.length})</button>
            <button onClick={() => setViewTab('contractors')} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: viewTab === 'contractors' ? '#9333ea' : '#f1f5f9', color: viewTab === 'contractors' ? '#fff' : '#475569', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>Labours ({filteredContractors.length})</button>
            <button onClick={() => setViewTab('materials')} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: viewTab === 'materials' ? '#4f46e5' : '#f1f5f9', color: viewTab === 'materials' ? '#fff' : '#475569', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>Materials ({filteredMaterials.length})</button>
            <button onClick={() => setViewTab('WorkDescriptions')} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: viewTab === 'WorkDescriptions' ? '#d97706' : '#f1f5f9', color: viewTab === 'WorkDescriptions' ? '#fff' : '#475569', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>Descriptions ({filteredWorkDescriptions.length})</button>
            <button onClick={() => setViewTab('products')} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: viewTab === 'products' ? '#0891b2' : '#f1f5f9', color: viewTab === 'products' ? '#fff' : '#475569', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>Products ({filteredProducts.length})</button>
          </div>
{/* 1. VENDORS / SUPPLIERS */}
          {viewTab === 'vendors' && (
            <div>
              {filteredVendors.length === 0 ? <p style={{ fontSize: '12px', color: '#64748b' }}>No suppliers found.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {filteredVendors.map(v => (
                    <div key={v.id} style={{ display: 'flex', flexDirection: 'column', padding: '8px 12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', gap: '6px' }}>
                      {editingListId === v.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          
                          {/* Supplier Name */}
                          <input placeholder="Name" value={editListForm.name || ''} onChange={(e) => setEditListForm({ ...editListForm, name: e.target.value })} style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                          
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input placeholder="Company Name" value={editListForm.company_name || ''} onChange={(e) => setEditListForm({ ...editListForm, company_name: e.target.value })} style={{ flex: 1, padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                            <input placeholder="Mobile" value={editListForm.mobile || ''} onChange={(e) => setEditListForm({ ...editListForm, mobile: e.target.value })} style={{ flex: 1, padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                          </div>

                          {/* 🎯 ૧. Select State First */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Select State *</label>
                            <select value={editListForm.selected_state || ''} onChange={(e) => {
                              const selectedSt = e.target.value;
                              setEditListForm({ 
                                ...editListForm, 
                                selected_state: selectedSt,
                                plant_id: '',
                                site_name: '' 
                              });
                            }} style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                              <option value="">-- Choose State --</option>
                              <option value="All state (General)">🌐 All State (General)</option>
                              {statesList.map(st => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          </div>

                          {/* 🎯 ૨. Select Plant */}
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Select Plant *</label>
                              
                              {/* 🎯 ફિલ્ટર થયેલા પ્લાન્ટ્સની લિસ્ટ મેળવવી */}
                              {(() => {
                                const filteredPlants = (plants || []).filter(p => {
                                  if (!editListForm.selected_state || editListForm.selected_state === 'All state (General)') {
                                    return true;
                                  }
                                  return p.state && p.state.trim().toLowerCase() === editListForm.selected_state.trim().toLowerCase();
                                });

                                return (
                                  <select value={editListForm.plant_id || ''} onChange={(e) => {
                                    const selPlantId = e.target.value;
                                    setEditListForm({ 
                                      ...editListForm, 
                                      plant_id: selPlantId,
                                      site_name: '' 
                                    });
                                  }} style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                                    
                                    {filteredPlants.length === 0 ? (
                                      <option value="" disabled>⚠️ No Plant Available in this State</option>
                                    ) : (
                                      <>
                                        <option value="">-- Choose Plant --</option>
                                        <option value="All Plant (General)">🌐 All Plant (General)</option>
                                        {filteredPlants.map(p => (
                                          <option key={p.id} value={p.id}>{p.plant_name}</option>
                                        ))}
                                      </>
                                    )}
                                  </select>
                                );
                              })()}
                            </div>

                          {/* 🎯 ૩. Select Site / Location */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Select Site / Location *</label>
                            <select value={editListForm.site_name || ''} onChange={(e) => {
                              setEditListForm({ ...editListForm, site_name: e.target.value });
                            }} style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                              <option value="">-- Choose Site --</option>
                              <option value="All Sites (General)">🌐 All Sites (General)</option>
                          
                              
                              {(sites || [])
                                .filter(s => !editListForm.plant_id || editListForm.plant_id === 'All Plant (General)' || s.plant_id == editListForm.plant_id)
                                .map(s => (
                                  <option key={s.id} value={s.site_name}>{s.site_name}</option>
                                ))}
                            </select>
                          </div>

                          {/* Save & Cancel Buttons */}
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <button onClick={() => handleGenericUpdate('site_vendors', v.id, { 
                              name: editListForm.name.trim(), 
                              company_name: editListForm.company_name ? editListForm.company_name.trim() : '', 
                              mobile: editListForm.mobile ? editListForm.mobile.trim() : '',
                              site_name: editListForm.site_name || v.site_name,
                              plant_id: editListForm.plant_id && editListForm.plant_id !== 'All Plant (General)' ? editListForm.plant_id : null
                            })} style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
                            
                            <button onClick={() => setEditingListId(null)} style={{ backgroundColor: '#cbd5e1', color: '#1e293b', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                          </div>

                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{v.name}</span>
                            {v.company_name && <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>({v.company_name})</span>}
                            
                            {/* મોબાઈલ નંબર પર ટેપ કરવાથી કોલ જશે */}
                            {v.mobile ? (
                              <a href={`tel:${v.mobile}`} style={{ fontSize: '11px', color: '#0284c7', marginLeft: '8px', textDecoration: 'none', fontWeight: '600' }}>
                                📞 {v.mobile}
                              </a>
                            ) : (
                              <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '6px' }}>(No Mobile)</span>
                            )}

                            <span style={{ fontSize: '10px', color: '#059669', marginLeft: '6px' }}>[{v.site_name}]</span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button onClick={() => { setEditingListId(v.id); setEditListForm({ ...v }); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}><Edit2 size={14} /></button>
                            <button onClick={() => handleDelete('site_vendors', v.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={14} /></button>
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
          {viewTab === 'parties' && (
            <div>
              {filteredParties.length === 0 ? <p style={{ fontSize: '12px', color: '#64748b' }}>No parties found.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {filteredParties.map(p => (
                    <div key={p.id} style={{ display: 'flex', flexDirection: 'column', padding: '8px 12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', gap: '6px' }}>
                      {editingListId === p.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          
                          {/* Party Name */}
                          <input placeholder="Party Name" value={editListForm.name || ''} onChange={(e) => setEditListForm({ ...editListForm, name: e.target.value })} style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                          
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input placeholder="Company Name" value={editListForm.company_name || ''} onChange={(e) => setEditListForm({ ...editListForm, company_name: e.target.value })} style={{ flex: 1, padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                            <input placeholder="Mobile" value={editListForm.mobile || ''} onChange={(e) => setEditListForm({ ...editListForm, mobile: e.target.value })} style={{ flex: 1, padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                          </div>

                          {/* 🎯 ૧. Select State First */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Select State *</label>
                            <select value={editListForm.selected_state || ''} onChange={(e) => {
                              const selectedSt = e.target.value;
                              setEditListForm({ 
                                ...editListForm, 
                                selected_state: selectedSt,
                                plant_id: '',
                                site_name: '' 
                              });
                            }} style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                              <option value="">-- Choose State --</option>
                              <option value="All state (General)">🌐 All State (General)</option>
                              {statesList.map(st => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          </div>

                          {/* 🎯 ૨. Select Plant */}
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Select Plant *</label>
                              
                              {/* 🎯 ફિલ્ટર થયેલા પ્લાન્ટ્સની લિસ્ટ મેળવવી */}
                              {(() => {
                                const filteredPlants = (plants || []).filter(p => {
                                  if (!editListForm.selected_state || editListForm.selected_state === 'All state (General)') {
                                    return true;
                                  }
                                  return p.state && p.state.trim().toLowerCase() === editListForm.selected_state.trim().toLowerCase();
                                });

                                return (
                                  <select value={editListForm.plant_id || ''} onChange={(e) => {
                                    const selPlantId = e.target.value;
                                    setEditListForm({ 
                                      ...editListForm, 
                                      plant_id: selPlantId,
                                      site_name: '' 
                                    });
                                  }} style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                                    
                                    {filteredPlants.length === 0 ? (
                                      <option value="" disabled>⚠️ No Plant Available in this State</option>
                                    ) : (
                                      <>
                                        <option value="">-- Choose Plant --</option>
                                        <option value="All Plant (General)">🌐 All Plant (General)</option>
                                        {filteredPlants.map(p => (
                                          <option key={p.id} value={p.id}>{p.plant_name}</option>
                                        ))}
                                      </>
                                    )}
                                  </select>
                                );
                              })()}
                            </div>
                         
                          {/* Save & Cancel Buttons */}
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <button onClick={() => handleGenericUpdate('site_outward_parties', p.id, { 
                              name: editListForm.name.trim(), 
                              company_name: editListForm.company_name ? editListForm.company_name.trim() : '', 
                              mobile: editListForm.mobile ? editListForm.mobile.trim() : '',
                         
                              plant_id: editListForm.plant_id && editListForm.plant_id !== 'All Plant (General)' ? editListForm.plant_id : null
                            })} style={{ backgroundColor: '#ea580c', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
                            
                            <button onClick={() => setEditingListId(null)} style={{ backgroundColor: '#cbd5e1', color: '#1e293b', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                          </div>

                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{p.name}</span>
                            {p.company_name && <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>({p.company_name})</span>}
                            
                            {/* મોબાઈલ નંબર પર ક્લિક કરવાથી કોલ જશે */}
                            {p.mobile ? (
                              <a href={`tel:${p.mobile}`} style={{ fontSize: '11px', color: '#0284c7', marginLeft: '8px', textDecoration: 'none', fontWeight: '600' }}>
                                📞 {p.mobile}
                              </a>
                            ) : (
                              <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '6px' }}>(No Mobile)</span>
                            )}

                            <span style={{ fontSize: '10px', color: '#0284c7', marginLeft: '6px' }}>[{p.site_name}]</span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button onClick={() => { setEditingListId(p.id); setEditListForm({ ...p }); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}><Edit2 size={14} /></button>
                            <button onClick={() => handleDelete('site_outward_parties', p.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={14} /></button>
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
          {viewTab === 'contractors' && (
            <div>
              {filteredContractors.length === 0 ? <p style={{ fontSize: '12px', color: '#64748b' }}>No labours found.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {filteredContractors.map(c => (
                    <div key={c.id} style={{ display: 'flex', flexDirection: 'column', padding: '10px 12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', gap: '8px', boxSizing: 'border-box' }}>
                      {editingListId === c.id ? (
                        
                        /* 🎯 લેબર અને તેના રેટ્સ એડિટ કરવા માટેનું પરફેક્ટ ફોર્મ */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
                          
                       {/* ૧. Labour / Team Name */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Labour / Team Name *</label>
                              <input value={editListForm.name || ''} onChange={(e) => setEditListForm({ ...editListForm, name: e.target.value })} style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                            </div>
{/* ૧. Select State First */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Select State *</label>
                              <select value={editListForm.selected_state || ''} onChange={(e) => {
                                const selectedSt = e.target.value;
                                setEditListForm({ 
                                  ...editListForm, 
                                  selected_state: selectedSt,
                                  plant_id: '',
                                  site_name: '' 
                                });
                              }} style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                                <option value="">-- Choose State --</option>
                                <option value="All state (General)">🌐 All State (General)</option>
                                {statesList.map(st => (
                                  <option key={st} value={st}>{st}</option>
                                ))}
                              </select>
                            </div>

                            {/* ૨. Select Plant (ઓલ સ્ટેટ હોય તો બધા પ્લાન્ટ, બાકી સ્ટેટ મુજબ ફિલ્ટર) */}
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Select Plant *</label>
                              
                              {/* 🎯 ફિલ્ટર થયેલા પ્લાન્ટ્સની લિસ્ટ મેળવવી */}
                              {(() => {
                                const filteredPlants = (plants || []).filter(p => {
                                  if (!editListForm.selected_state || editListForm.selected_state === 'All state (General)') {
                                    return true;
                                  }
                                  return p.state && p.state.trim().toLowerCase() === editListForm.selected_state.trim().toLowerCase();
                                });

                                return (
                                  <select value={editListForm.plant_id || ''} onChange={(e) => {
                                    const selPlantId = e.target.value;
                                    setEditListForm({ 
                                      ...editListForm, 
                                      plant_id: selPlantId,
                                      site_name: '' 
                                    });
                                  }} style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                                    
                                    {filteredPlants.length === 0 ? (
                                      <option value="" disabled>⚠️ No Plant Available in this State</option>
                                    ) : (
                                      <>
                                        <option value="">-- Choose Plant --</option>
                                        <option value="All Plant (General)">🌐 All Plant (General)</option>
                                        {filteredPlants.map(p => (
                                          <option key={p.id} value={p.id}>{p.plant_name}</option>
                                        ))}
                                      </>
                                    )}
                                  </select>
                                );
                              })()}
                            </div>

                            {/* ૩. Select Site (ઓલ પ્લાન્ટ હોય તો બધી સાઈટ્સ, બાકી પ્લાન્ટ મુજબ ફિલ્ટર) */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Select Site / Location *</label>
                              <select value={editListForm.site_name || ''} onChange={(e) => {
                                setEditListForm({ ...editListForm, site_name: e.target.value });
                              }} style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                                <option value="">-- Choose Site --</option>
                                <option value="All Sites (General)">🌐 All Sites (General)</option>
                           
                                
                                {(sites || [])
                                  .filter(s => !editListForm.plant_id || editListForm.plant_id === 'All Plant (General)' || s.plant_id == editListForm.plant_id)
                                  .map(s => (
                                    <option key={s.id} value={s.site_name}>{s.site_name}</option>
                                  ))}
                              </select>
                            </div>

                            {/* ૩. Company Name & Mobile Number */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Company Name (Optional)</label>
                                <input value={editListForm.company_name || ''} onChange={(e) => setEditListForm({ ...editListForm, company_name: e.target.value })} style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Mobile Number (Optional)</label>
                                <input value={editListForm.mobile || ''} onChange={(e) => setEditListForm({ ...editListForm, mobile: e.target.value })} style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                              </div>
                            </div>
{/* 💰 Labour Rates & Work Mappings (ઇન (In) જેવું પરફેક્ટ સાઈઝ ડ્રોપડાઉન લોજિક) */}
                          <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#9333ea' }}>💰 Labour Rates & Work Mappings (પ્રોડક્ટ અને ડિપાર્ટમેન્ટ રેટ્સ)</span>
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
                              
                              // 🎯 આ પ્રોડક્ટ માટેની ઉપલબ્ધ સાઈઝ ફિલ્ટર કરવા માટે
                              const matchedSizes = (products || [])
                                .filter(p => p.name === rm.product_name)
                                .map(p => p.product_size)
                                .filter(Boolean);

                              return (
                                <div key={rIdx} style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box', width: '100%' }}>
                                  
                                  {/* ૧. Work Type અને Remove બટન */}
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

                                  {/* ૨. Product Name અને Size (ડ્રોપડાઉન સાથે) */}
                                  {isProductRate ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '6px', width: '100%' }}>
                                      
                                      {/* Product Name Dropdown */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                        <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>Product Name:</label>
                                        <select value={rm.product_name || ''} onChange={(e) => {
                                          const selProdName = e.target.value;
                                          const updated = [...editListForm.rates_mapping];
                                          updated[rIdx].product_name = selProdName;
                                          
                                          // પહેલી સાઈઝ ઓટોમેટિક સેટ કરવી
                                          const matchedProducts = (products || []).filter(p => p.name === selProdName);
                                          if (matchedProducts.length > 0) {
                                            updated[rIdx].product_size = matchedProducts[0].product_size || '';
                                          } else {
                                            updated[rIdx].product_size = '';
                                          }
                                          setEditListForm({ ...editListForm, rates_mapping: updated });
                                        }} style={{ padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', width: '100%', boxSizing: 'border-box' }}>
                                          <option value="">-- Select Product --</option>
                                          {[...new Set((products || []).map(p => p.name))].map((pName, i) => (
                                            <option key={i} value={pName}>{pName}</option>
                                          ))}
                                        </select>
                                      </div>

                                      {/* 🎯 Size Dropdown (માત્ર તે જ પ્રોડક્ટની સાઈઝ બતાવશે) */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                        <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>Size:</label>
                                        <select value={rm.product_size || rm.size || ''} onChange={(e) => {
                                          const updated = [...editListForm.rates_mapping];
                                          updated[rIdx].product_size = e.target.value;
                                          setEditListForm({ ...editListForm, rates_mapping: updated });
                                        }} style={{ padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', width: '100%', boxSizing: 'border-box' }}>
                                          <option value="">-- Size --</option>
                                          {matchedSizes.map((sz, sIdx) => (
                                            <option key={sIdx} value={sz}>{sz}</option>
                                          ))}
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

                                  {/* ૩. UOM, Rate અને Effective From ની લાઇન */}
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
                          {/* ૪. Save અને Cancel બટન્સ */}
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '6px' }}>
                           <button onClick={() => handleLabourUpdate(c.id, editListForm)} style={{ backgroundColor: '#9333ea', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
  Save All Changes
</button>
                            <button onClick={() => setEditingListId(null)} style={{ backgroundColor: '#cbd5e1', color: '#1e293b', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                          </div>

                        </div>

                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{c.name}</span>
                            {c.mobile ? (
                              <a href={`tel:${c.mobile}`} style={{ fontSize: '11px', color: '#0284c7', marginLeft: '8px', textDecoration: 'none', fontWeight: '600' }}>
                                📞 {c.mobile}
                              </a>
                            ) : (
                              <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '6px' }}>(No Mobile)</span>
                            )}
                            <span style={{ fontSize: '10px', color: '#059669', marginLeft: '6px' }}>[{c.site_name}]</span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            
                            <button onClick={async () => { 
                              setEditingListId(c.id); 
                              const { data: rateData, error } = await supabase
                                .from('labour_product_rates')
                                .select('*')
                                .eq('team_name', c.name);

                              if (error) {
                                console.error("Error fetching rates:", error.message);
                              }

                              setEditListForm({ 
                                ...c, 
                                rates_mapping: rateData && rateData.length > 0 ? rateData : (c.rates_mapping || []) 
                              }); 
                            }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}>
                              <Edit2 size={14} />
                            </button>
                            
                            <button onClick={() => handleDelete('contractors', c.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={14} /></button>
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
          {viewTab === 'materials' && (
            <div>
              {filteredMaterials.length === 0 ? <p style={{ fontSize: '12px', color: '#64748b' }}>No materials found.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {filteredMaterials.map(m => (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', padding: '8px 12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', gap: '6px' }}>
                      {editingListId === m.id ? (
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {/* ૧. Material Name Input */}
                          <input placeholder="Material Name" value={editListForm.name || ''} onChange={(e) => setEditListForm({ ...editListForm, name: e.target.value })} style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box', width: '100%' }} />
                          
                          {/* ૨. 🎯 Item Type Dropdown (જેમ કે Raw Material વગેરે) */}
                          <select value={editListForm.item_type || 'Raw Material'} onChange={(e) => setEditListForm({ ...editListForm, item_type: e.target.value })} style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box', width: '100%' }}>
                            <option value="Raw Material">Raw Material</option>
                            <option value="Consumable">Consumable</option>
                            <option value="Finished Goods">Finished Goods</option>
                            <option value="Other">Other</option>
                          </select>

                          {/* ૩. Save અને Cancel બટન્સ */}
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <button onClick={() => handleGenericUpdate('site_materials_master', m.id, { 
                              name: editListForm.name.trim(),
                              item_type: editListForm.item_type || 'Raw Material'
                            })} style={{ backgroundColor: '#4f46e5', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
                            
                            <button onClick={() => setEditingListId(null)} style={{ backgroundColor: '#cbd5e1', color: '#1e293b', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                          </div>
                        </div>

                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{m.name}</span>
                            {m.item_type && <span style={{ fontSize: '10px', color: '#9333ea', marginLeft: '6px', backgroundColor: '#f3e8ff', padding: '2px 6px', borderRadius: '4px' }}>{m.item_type}</span>}
                            <span style={{ fontSize: '10px', color: '#0284c7', marginLeft: '6px' }}>[{m.site_name}]</span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button onClick={() => { setEditingListId(m.id); setEditListForm({ ...m }); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}><Edit2 size= {14} /></button>
                            <button onClick={() => handleDelete('site_materials_master', m.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={14} /></button>
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
          {viewTab === 'WorkDescriptions' && (
            <div>
              {filteredWorkDescriptions.length === 0 ? <p style={{ fontSize: '12px', color: '#64748b' }}>No descriptions found.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {filteredWorkDescriptions.map(w => (
                    <div key={w.id} style={{ display: 'flex', flexDirection: 'column', padding: '8px 12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', gap: '6px' }}>
                      {editingListId === w.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <input placeholder="Description Name" value={editListForm.name || ''} onChange={(e) => setEditListForm({ ...editListForm, name: e.target.value })} style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <button onClick={() => handleGenericUpdate('site_work_descriptions', w.id, { name: editListForm.name.trim() })} style={{ backgroundColor: '#d97706', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
                            <button onClick={() => setEditingListId(null)} style={{ backgroundColor: '#cbd5e1', color: '#1e293b', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{w.name}</span>
                            <span style={{ fontSize: '10px', color: '#0284c7', marginLeft: '6px' }}>[{w.site_name}]</span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button onClick={() => { setEditingListId(w.id); setEditListForm({ ...w }); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}><Edit2 size={14} /></button>
                            <button onClick={() => handleDelete('site_work_descriptions', w.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={14} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
{viewTab === 'products' && (
            <div>
              {filteredProducts.length === 0 ? <p style={{ fontSize: '12px', color: '#64748b' }}>No products found.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {filteredProducts.map(p => (
                    <div key={p.id} style={{ display: 'flex', flexDirection: 'column', padding: '10px 12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', gap: '8px', boxSizing: 'border-box' }}>
                      {editingListId === p.id ? (
                        
                        /* 🎯 BOM અને Concrete સાથેનું કમ્પ્લીટ એડિટ ફોર્મ */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                          
                          {/* ૧. Product Name */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Product Name</label>
                            <input value={editListForm.name || ''} onChange={(e) => setEditListForm({ ...editListForm, name: e.target.value })} style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                          </div>

                          {/* ૨. Size અને Category */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Size</label>
                              <input value={editListForm.product_size || ''} onChange={(e) => setEditListForm({ ...editListForm, product_size: e.target.value })} style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Category</label>
                              <input value={editListForm.product_category || ''} onChange={(e) => setEditListForm({ ...editListForm, product_category: e.target.value })} style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                            </div>
                          </div>

                          {/* ૩. Expected Concrete (M3) */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Expected Concrete (M3)</label>
                            <input type="number" step="0.001" value={editListForm.expected_m3 || ''} onChange={(e) => setEditListForm({ ...editListForm, expected_m3: e.target.value })} style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                          </div>

                         {/* ૪. BOM (Bill of Materials) મેનેજ કરવા માટે */}
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
                                
                                {/* ૧. Material Selection (વધુ જગ્યા રોકશે) */}
                                <select value={bom.material || ''} onChange={(e) => {
                                  const updatedBom = [...editListForm.bom_items];
                                  updatedBom[bIdx].material = e.target.value;
                                  setEditListForm({ ...editListForm, bom_items: updatedBom });
                                }} style={{ flex: '1.4', padding: '6px 4px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                                  <option value="">-- Material --</option>
                                  {(materials || []).map(mat => <option key={mat.id} value={mat.name}>{mat.name}</option>)}
                                </select>
                                
                                {/* ૨. 🎯 Qty Box (થોડું નાનું કર્યું જેથી બહાર ન નીકળે) */}
                                <input type="number" step="any" placeholder="Qty" value={bom.consumption || ''} onChange={(e) => {
                                  const updatedBom = [...editListForm.bom_items];
                                  updatedBom[bIdx].consumption = e.target.value;
                                  setEditListForm({ ...editListForm, bom_items: updatedBom });
                                }} style={{ flex: '0.7', width: '50px', padding: '6px 4px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />

                                {/* ૩. UOM Dropdown (KG, Bags વગેરે) */}
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

                                {/* ૪. Delete Row Button ('X' હવે બિલકુલ અંદર અને પરફેક્ટ દેખાશે) */}
                                <button type="button" onClick={() => {
                                  const updatedBom = editListForm.bom_items.filter((_, i) => i !== bIdx);
                                  setEditListForm({ ...editListForm, bom_items: updatedBom });
                                }} style={{ flex: '0.2', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', textAlign: 'center', padding: '0' }}>✕</button>
                              
                              </div>
                            ))}
                          </div>

                          {/* ૫. Save અને Cancel બટન્સ */}
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '6px' }}>
                            <button onClick={() => handleGenericUpdate('plant_work_descriptions', p.id, editListForm)} style={{ backgroundColor: '#0891b2', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Save All Changes</button>
                            <button onClick={() => setEditingListId(null)} style={{ backgroundColor: '#cbd5e1', color: '#1e293b', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
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
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button onClick={() => { setEditingListId(p.id); setEditListForm({ ...p }); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}><Edit2 size={14} /></button>
                            <button onClick={() => handleDelete('plant_work_descriptions', p.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={14} /></button>
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

    </div>
  )
}

export default AddPlantVendorPage;