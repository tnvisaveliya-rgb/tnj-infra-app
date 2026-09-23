import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Home, ClipboardEdit, IndianRupee, Wallet, ChevronRight, FileText, Box, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import PlantDprEntry from './PlantDprEntry';
import PlantInwardPage from './PlantInwardPage';
import PlantOutwardPage from './PlantOutwardPage';
import PlantExpensesPage from './PlantExpensesPage';
import SupervisorFundRequest from './SupervisorFundRequest';

function ProductionReportView({ onBack, plantList = [] }) {
  const [selectedPlant, setSelectedPlant] = useState(plantList[0] || 'All');
  const [labourList, setLabourList] = useState([]);
  const [selectedLabour, setSelectedLabour] = useState('');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [reportRows, setReportRows] = useState([]);
  const [totalUpad, setTotalUpad] = useState(0);
  const [dynamicColumns, setDynamicColumns] = useState([]);
  const [productRates, setProductRates] = useState({});

  const formatDateToDMY = (dateStr) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  useEffect(() => {
    const fetchContractorsByPlant = async () => {
      try {
        let query = supabase.from('contractors').select('*');
        if (selectedPlant && selectedPlant !== 'All') {
          query = query.or(`site_name.eq."${selectedPlant}",company_name.eq."${selectedPlant}"`);
        }
        const { data, error } = await query;
        if (!error && data) {
          const filteredNames = data.map(d => d.name).filter(Boolean);
          setLabourList(filteredNames);
          if (filteredNames.length > 0) {
            setSelectedLabour(filteredNames[0]);
          } else {
            setSelectedLabour('');
          }
        }
      } catch (err) {
        console.error('Error fetching contractors for plant:', err);
      }
    };
    fetchContractorsByPlant();
  }, [selectedPlant]);

  useEffect(() => {
    if (!selectedLabour) return;
    fetchReportData();
  }, [selectedPlant, selectedLabour, fromDate, toDate]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const groupedByDate = {};
      const uniqueColSet = new Set();
      
      let rateQuery = supabase.from('labour_product_rates').select('*');
      if (selectedPlant && selectedPlant !== 'All') {
        rateQuery = rateQuery.eq('plant_name', selectedPlant);
      }
      if (selectedLabour) {
        rateQuery = rateQuery.eq('team_name', selectedLabour);
      }
      const { data: rateData, error: rateErr } = await rateQuery;

      const rateList = [];
      if (!rateErr && rateData && rateData.length > 0) {
        rateData.forEach(r => {
          rateList.push({
            pName: (r.product_name || '').toLowerCase().trim(),
            pSize: (r.product_size || '').toLowerCase().trim(),
            rate: Number(r.rate || 0)
          });
        });
      }
      setProductRates(rateList);

      let headerQuery = supabase.from('production_header').select('id, production_date, team_name, plant_name');
      if (selectedPlant && selectedPlant !== 'All') {
        headerQuery = headerQuery.eq('plant_name', selectedPlant);
      }
      if (selectedLabour) {
        headerQuery = headerQuery.eq('team_name', selectedLabour);
      }
      if (fromDate) headerQuery = headerQuery.gte('production_date', fromDate);
      if (toDate) headerQuery = headerQuery.lte('production_date', toDate);

      const { data: headers, error: hErr } = await headerQuery;

      if (!hErr && headers && headers.length > 0) {
        const headerIds = headers.map(h => h.id);
        const headerDateMap = {};
        headers.forEach(h => {
          headerDateMap[h.id] = h.production_date;
        });

        const { data: items, error: iErr } = await supabase
          .from('production_items')
          .select('*')
          .in('header_id', headerIds);

        if (!iErr && items && items.length > 0) {
          const itemIds = items.map(it => it.id);
          const { data: stockEntries } = await supabase
            .from('stock_ledger')
            .select('reference_id, qty')
            .in('reference_id', itemIds);

          const stockMap = {};
          if (stockEntries) {
            stockEntries.forEach(s => {
              stockMap[s.reference_id] = (stockMap[s.reference_id] || 0) + Number(s.qty || 0);
            });
          }

          items.forEach(item => {
            const dStr = headerDateMap[item.header_id];
            if (!dStr) return;
            const pName = (item.product_name || 'Item').trim();
            const pVariant = (item.size_variant || '').trim();
            const colHeader = pVariant ? `${pName} ${pVariant}` : pName;

            uniqueColSet.add(colHeader);
            if (!groupedByDate[dStr]) {
              groupedByDate[dStr] = { date: dStr };
            }

            const lineQty = Number(item.nos_of_line_casting || 0);
            const ledgerQty = stockMap[item.id] || 0;
            const finalQty = lineQty > 0 ? lineQty : ledgerQty;

            groupedByDate[dStr][colHeader] = (groupedByDate[dStr][colHeader] || 0) + finalQty;
          });

          setDynamicColumns(Array.from(uniqueColSet));
        }
      }

      const upadByDateMap = {};
      let totalUpadSum = 0;
      if (selectedLabour) {
        let upadQuery = supabase.from('plant_expenses').select('amount, expense_date').eq('paid_to', selectedLabour);
        if (fromDate) upadQuery = upadQuery.gte('expense_date', fromDate);
        if (toDate) upadQuery = upadQuery.lte('expense_date', toDate);

        const { data: upadData } = await upadQuery;
        if (upadData && upadData.length > 0) {
          upadData.forEach(item => {
            const expDate = item.expense_date;
            const amt = Number(item.amount || 0);
            upadByDateMap[expDate] = (upadByDateMap[expDate] || 0) + amt;
            totalUpadSum += amt;
          });
        }
      }
      setTotalUpad(totalUpadSum);

      Object.keys(groupedByDate).forEach(dStr => {
        groupedByDate[dStr].dayUpad = upadByDateMap[dStr] || 0;
      });

      Object.keys(upadByDateMap).forEach(expDate => {
        if (!groupedByDate[expDate]) {
          groupedByDate[expDate] = { date: expDate, dayUpad: upadByDateMap[expDate] };
        }
      });

      setReportRows(Object.values(groupedByDate).sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (err) {
      console.error('Error fetching dynamic report:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRateForColumn = (colName) => {
    if (!Array.isArray(productRates) || productRates.length === 0) return 0;
    const cleanCol = colName.toLowerCase().replace(/×/g, 'x').replace(/[^a-z0-9]/g, '');
    const isOtherWork = cleanCol.includes('cleaning') || cleanCol.includes('daywork') || cleanCol.includes('other') || cleanCol.includes('department');

    if (isOtherWork) {
      const otherRateItem = productRates.find(r => r.pName.includes('other') || r.pName.includes('department') || r.pName.includes('cleaning'));
      return otherRateItem ? otherRateItem.rate : 0;
    }

    for (const item of productRates) {
      const cleanDBName = item.pName.replace(/×/g, 'x').replace(/[^a-z0-9]/g, '');
      const cleanDBSize = item.pSize.replace(/×/g, 'x').replace(/[^a-z0-9]/g, '');
      if (cleanDBName && cleanCol.includes(cleanDBName)) return item.rate;
      if (cleanDBSize && cleanCol.includes(cleanDBSize)) return item.rate;
    }
    return 0;
  };

  let grandTotalProduction = 0;
  dynamicColumns.forEach(col => {
    const totalColQty = reportRows.reduce((sum, row) => sum + (Number(row[col]) || 0), 0);
    grandTotalProduction += (totalColQty * getRateForColumn(col));
  });
  const netOutstanding = grandTotalProduction - totalUpad;

  return (
    <div style={{ padding: '10px 8px', maxWidth: '650px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <button onClick={onBack} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}>
          ← Back
        </button>
        <button onClick={() => window.print()} style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: '800', fontSize: '12px' }}>
          🖨️ Export PDF / Print
        </button>
      </div>
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px' }}>
        <h2 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: '900', color: '#0f172a' }}>PRODUCTION & LABOUR BILLING REPORT</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px', color: '#334155', marginBottom: '12px' }}>
          <div><strong>Plant:</strong> {selectedPlant}</div>
          <div><strong>Date Filter:</strong> {formatDateToDMY(fromDate)} to {formatDateToDMY(toDate)}</div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardState() {
  const { user } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('home');
  const [workingBalance, setWorkingBalance] = useState(0);
  const [rawMaterialsStock, setRawMaterialsStock] = useState([]);
  const [finishedGoodsStock, setFinishedGoodsStock] = useState([]);
  
  const [selectedType, setSelectedType] = useState('All'); 
  const [selectedState, setSelectedState] = useState('All'); 
  const [selectedLocation, setSelectedLocation] = useState('All'); 
  
  const [allLocationsDb, setAllLocationsDb] = useState([]);
  const [stateList, setStateList] = useState([]);
  const [availableLocations, setAvailableLocations] = useState([]);

  useEffect(() => {
    const fetchLocationsData = async () => {
      try {
        const { data: plantsData } = await supabase.from('plants').select('*');
        const formattedPlants = (plantsData || []).map(p => ({
          name: p.plant_name || p.name,
          state: p.state || 'Gujarat',
          type: 'Plant'
        }));

        const { data: sitesData } = await supabase.from('sites').select('*');
        const formattedSites = (sitesData || []).map(s => ({
          name: s.site_name || s.name,
          state: s.state || 'Gujarat', 
          type: 'Site'
        }));

        const combinedData = [...formattedPlants, ...formattedSites];
        setAllLocationsDb(combinedData);

        const uniqueStates = [...new Set(combinedData.map(loc => loc.state).filter(Boolean))];
        setStateList(uniqueStates.length > 0 ? uniqueStates : ['Gujarat']);

      } catch (error) {
        console.error("Error fetching locations:", error);
      }
    };
    
    fetchLocationsData();
  }, []);

  useEffect(() => {
    let filtered = allLocationsDb;
    if (selectedType !== 'All') {
      filtered = filtered.filter(loc => loc.type === selectedType);
    }
    if (selectedState !== 'All') {
      filtered = filtered.filter(loc => loc.state === selectedState);
    }
    setAvailableLocations([...new Set(filtered.map(loc => loc.name).filter(Boolean))]);
    setSelectedLocation('All');
  }, [selectedState, selectedType, allLocationsDb]);

  useEffect(() => {
    fetchAdminDashboardData();
  }, [user, selectedType, selectedState, selectedLocation]);

  const fetchAdminDashboardData = async () => {
    try {
      const userEmail = (user?.email || '').toLowerCase().trim();
      if (!userEmail) return;

      let totalIncome = 0;
      let totalExpense = 0;

      const { data: fundData } = await supabase.from('plant_fund_transfers').select('*');
      if (fundData) {
        fundData.forEach(item => {
          if ((item.status || '').toUpperCase() === 'RECEIVED') {
            totalIncome += parseFloat(item.approved_amount || item.requested_amount || 0);
          }
        });
      }

      const { data: plantExpData } = await supabase.from('plant_expenses').select('*');
      if (plantExpData) {
        plantExpData.forEach(item => {
          totalExpense += parseFloat(item.amount || 0);
        });
      }

      setWorkingBalance(totalIncome - totalExpense);

      // 🌟 1. Jo TYPE 'Site' hoy to site_material_stock_ledger mathi ane 'Plant' hoy to material_stock_ledger mathi fetch karso
      let materialTable = 'material_stock_ledger';
      if (selectedType === 'Site') {
        materialTable = 'site_material_stock_ledger';
      }

      const { data: materialData, error: matErr } = await supabase.from(materialTable).select('*');
      if (!matErr && materialData) {
        const filteredMaterial = materialData.filter(item => {
          const itemLoc = item.plant_name || item.site_name || '';
          return selectedLocation === 'All' || itemLoc === selectedLocation || availableLocations.includes(itemLoc);
        });

        const stockMap = {};
        const fgMap = {};

        filteredMaterial.forEach(item => {
          const rawName = (item.material_name || item.product_name || '').trim();
          if (!rawName) return;

          const key = rawName.toLowerCase();
          const qty = parseFloat(item.qty || item.quantity || 0);
          const type = (item.transaction_type || '').toUpperCase().trim();
          const unit = item.unit || 'Nos';

          // Check if finished goods
          const isFinishedGood = item.product_name || key.includes('drain') || key.includes('panel') || key.includes('wall') || key.includes('column');

          if (isFinishedGood && selectedType === 'Site') {
            if (!fgMap[key]) fgMap[key] = { name: rawName, stock: 0, unit };
            if (type.includes('IN')) fgMap[key].stock += qty;
            else if (type.includes('OUT') || type.includes('ISSUE')) fgMap[key].stock -= qty;
          } else {
            if (!stockMap[key]) {
              let cat = 'store';
              if (key.includes('cement') || key.includes('steel') || key.includes('sand') || key.includes('aggregate')) cat = 'raw';
              else if (key.includes('mould') || key.includes('machine')) cat = 'asset';
              stockMap[key] = { name: rawName, stock: 0, unit, category: cat };
            }
            if (type.includes('IN')) stockMap[key].stock += qty;
            else if (type.includes('OUT') || type.includes('ISSUE')) stockMap[key].stock -= qty;
          }
        });

        setRawMaterialsStock(Object.values(stockMap));
        if (selectedType === 'Site') {
          setFinishedGoodsStock(Object.values(fgMap).filter(item => item.stock !== 0));
        }
      }

      // 🌟 2. Plant mate stock_ledger mathi Finished Goods fetch karva
      if (selectedType === 'Plant' || selectedType === 'All') {
        let fgQuery = supabase.from('stock_ledger').select('*');
        if (selectedLocation !== 'All') {
          fgQuery = fgQuery.eq('plant_name', selectedLocation);
        } else if (availableLocations.length > 0) {
          fgQuery = fgQuery.in('plant_name', availableLocations);
        }

        const { data: stockLedgerData, error: stockErr } = await fgQuery;
        if (!stockErr && stockLedgerData) {
          const fgMap = {};
          stockLedgerData.forEach(item => {
            const productName = (item.product_name || item.item_name || 'Finished Item').trim();
            const sizeVariant = (item.size_variant || item.size || '').trim();
            
            const displayName = sizeVariant ? `${productName} (${sizeVariant})` : productName;
            const key = displayName.toLowerCase();

            const qty = parseFloat(item.qty || item.quantity || 0);
            const unit = item.unit || 'Nos';
            const tType = String(item.transaction_type || '').toUpperCase().trim();

            if (!fgMap[key]) {
              fgMap[key] = { name: displayName, stock: 0, unit };
            }

            if (['PRODUCTION', 'INWARD', 'PURCHASE'].includes(tType)) {
              fgMap[key].stock += qty;
            } else if (['OUTWARD', 'BROKEN', 'DAMAGE'].includes(tType)) {
              fgMap[key].stock -= qty;
            } else {
              fgMap[key].stock += qty;
            }
          });

          setFinishedGoodsStock(Object.values(fgMap).filter(item => item.stock !== 0));
        }
      } else if (selectedType === 'Site') {
        // Site mate upar site_material_stock_ledger thi aavi gaya che
      }

    } catch (err) {
      console.error('Error loading admin dashboard data:', err);
    }
  };

  const rawItems = rawMaterialsStock.filter(i => i.category === 'raw');
  const storeItems = rawMaterialsStock.filter(i => i.category === 'store');

  return (
    <div style={{ width: '100%', maxWidth: '650px', minHeight: '100vh', paddingBottom: '40px', backgroundColor: '#f8fafc', position: 'relative', boxSizing: 'border-box', margin: '0 auto' }}>
      {activeTab === 'home' && (
        <div style={{ width: '100%', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', padding: '10px 14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
                A
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Admin Dashboard</p>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>T&J Infra Management</h2>
              </div>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '16px', padding: '16px 18px', color: 'white', boxShadow: '0 8px 20px -6px rgba(15, 23, 42, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', opacity: 0.85 }}>
              <Wallet size={16} color="#38bdf8" />
              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>Total Working Balance (Live Cash)</span>
            </div>
            <h1 style={{ margin: '4px 0 10px 0', fontSize: '28px', fontWeight: '900', color: workingBalance < 0 ? '#f87171' : '#ffffff' }}>
              ₹ {workingBalance.toLocaleString('en-IN')}
            </h1>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '14px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#334155', textTransform: 'uppercase' }}>⚙️ Filter Hierarchy</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '6px' }}>
              
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} style={{ padding: '6px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: '700' }}>
                <option value="All">Type: All</option>
                <option value="Site">Site</option>
                <option value="Plant">Plant</option>
              </select>

              <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} style={{ padding: '6px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: '700' }}>
                <option value="All">State: All</option>
                {stateList.map((st, i) => <option key={i} value={st}>{st}</option>)}
              </select>

              <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} style={{ padding: '6px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: '700' }}>
                <option value="All">Location: All</option>
                {availableLocations.map((loc, i) => <option key={i} value={loc}>{loc}</option>)}
              </select>

            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            <div>
              <span style={{ fontSize: '10px', fontWeight: '800', color: '#2563eb', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                📦 Finished Goods Stock ({finishedGoodsStock.length})
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                {finishedGoodsStock.length === 0 ? (
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', gridColumn: 'span 2' }}>No finished goods found</span>
                ) : (
                  finishedGoodsStock.map((item, idx) => (
                    <div key={idx} style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '6px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#1e40af', wordBreak: 'break-word', maxWidth: '65%' }}>{item.name}</span>
                      <span style={{ fontSize: '12px', fontWeight: '900', color: '#1d4ed8' }}>{item.stock.toLocaleString('en-IN')} {item.unit}</span>
                    </div>
                  ))
                )}
              </div>
              <div style={{ borderTop: '1px dashed #e2e8f0', margin: '8px 0' }} />
            </div>

            <div>
              <span style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                🛠️ Store & Daily Tools ({storeItems.length})
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                {storeItems.map((item, idx) => (
                  <div key={idx} style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '10px', padding: '6px 8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#92400e' }}>{item.name}</span>
                    <span style={{ fontSize: '12px', fontWeight: '900', color: '#78350f' }}>{item.stock.toLocaleString('en-IN')} {item.unit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #e2e8f0', margin: '4px 0' }} />

            <div>
              <span style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                🧱 Raw Materials Stock ({rawItems.length})
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                {rawItems.map((item, idx) => (
                  <div key={idx} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '6px 8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#1e293b' }}>{item.name}</span>
                    <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>{item.stock.toLocaleString('en-IN')} {item.unit}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '12px 14px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '8px', borderRadius: '10px' }}><FileText size={16} /></div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>Production & Labour Report</h4>
                  <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}>Itemwise billing & statement overview</p>
                </div>
              </div>
              <button onClick={() => setActiveTab('production_report')} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: '800', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                Open Report <ChevronRight size={12} />
              </button>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'production_report' && (
        <ProductionReportView onBack={() => setActiveTab('home')} plantList={availableLocations} />
      )}
      {activeTab === 'dpr' && <PlantDprEntry />}
      {activeTab === 'supervisiorfundrequest' && <SupervisorFundRequest />}
      {activeTab === 'inward' && <PlantInwardPage />}
      {activeTab === 'outward' && <PlantOutwardPage />}
      {activeTab === 'plantexpense' && <PlantExpensesPage user={user} />}
    </div>
  );
}