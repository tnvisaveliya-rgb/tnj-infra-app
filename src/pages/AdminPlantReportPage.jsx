import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ClipboardList, Layers, Database, Package, ArrowDownRight } from 'lucide-react';

const AdminPlantReport = () => {
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPlant, setSelectedPlant] = useState('All');
  const [activeTab, setActiveTab] = useState('stock_summary'); // ડિફોલ્ટ લાઈવ સ્ટોક સમરી દેખાશે

  const [plantList, setPlantList] = useState([]);
  const [productionData, setProductionData] = useState([]);
  const [stockLedgerData, setStockLedgerData] = useState([]);
  const [materialLedgerData, setMaterialLedgerData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPlants();
  }, []);

  useEffect(() => {
    fetchAllReports();
  }, [fromDate, toDate, selectedPlant, activeTab]);

  const fetchPlants = async () => {
    const { data } = await supabase.from('plants').select('*');
    if (data) {
      setPlantList([...new Set(data.map(p => p.plant_name))]);
    }
  };

  const fetchAllReports = async () => {
    setLoading(true);
    try {
      // 1. Production Data
      let prodQuery = supabase.from('production_header').select('*, production_items (*, production_steel_details (*))').gte('production_date', fromDate).lte('production_date', toDate);
      if (selectedPlant !== 'All') prodQuery = prodQuery.eq('plant_name', selectedPlant);
      const { data: prodRes } = await prodQuery;
      setProductionData(prodRes || []);

      // 2. Finished Goods Stock Ledger
      let stockQuery = supabase.from('stock_ledger').select('*').gte('date', fromDate).lte('date', toDate);
      if (selectedPlant !== 'All') stockQuery = stockQuery.eq('plant_name', selectedPlant);
      const { data: stockRes } = await stockQuery;
      setStockLedgerData(stockRes || []);

      // 3. Raw Material Stock Ledger
      let matQuery = supabase.from('material_stock_ledger').select('*').gte('date', fromDate).lte('date', toDate);
      if (selectedPlant !== 'All') matQuery = matQuery.eq('plant_name', selectedPlant);
      const { data: matRes } = await matQuery;
      setMaterialLedgerData(matRes || []);

    } catch (err) {
      console.error("Error fetching reports: ", err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🧮 1. Finished Goods Stock Calculation (Panel, Column etc.)
  const calculateFinishedStock = () => {
    const stockMap = {};
    stockLedgerData.forEach(row => {
      const key = `${row.plant_name} | ${row.product_name} (${row.size_variant || 'Standard'})`;
      if (!stockMap[key]) {
        stockMap[key] = { plant: row.plant_name, product: row.product_name, variant: row.size_variant || 'Standard', totalIn: 0, totalOut: 0 };
      }
      if (row.transaction_type === 'PRODUCTION') {
        stockMap[key].totalIn += Number(row.qty) || 0;
      } else if (row.transaction_type === 'OUTWARD' || row.transaction_type === 'BROKEN') {
        stockMap[key].totalOut += Number(row.qty) || 0;
      }
    });

    return Object.values(stockMap).map(item => ({
      ...item,
      balance: item.totalIn - item.totalOut
    }));
  };

  // 🧮 2. Raw Material Stock Calculation (Cement, Steel, Sand etc.)
  const calculateMaterialStock = () => {
    const matMap = {};
    materialLedgerData.forEach(row => {
      const key = `${row.plant_name} | ${row.material_name}`;
      if (!matMap[key]) {
        matMap[key] = { plant: row.plant_name, material: row.material_name, unit: row.unit || 'Kg', totalIn: 0, totalOut: 0 };
      }
      if (row.transaction_type === 'INWARD') {
        matMap[key].totalIn += Number(row.qty) || 0;
      } else if (row.transaction_type === 'CONSUMPTION' || row.transaction_type === 'OUTWARD') {
        matMap[key].totalOut += Number(row.qty) || 0;
      }
    });

    return Object.values(matMap).map(item => ({
      ...item,
      balance: item.totalIn - item.totalOut
    }));
  };

  const finishedStockList = calculateFinishedStock();
  const materialStockList = calculateMaterialStock();

  return (
    <div style={{ padding: '20px', fontFamily: 'Inter, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', backgroundColor: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ClipboardList size={22} color="#2563eb" /> Admin Plant Stock & Production Reports
        </h2>
      </div>

      {/* --- FILTER SECTION --- */}
      <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Plant / Site:</label>
          <select value={selectedPlant} onChange={(e) => setSelectedPlant(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '13px' }}>
            <option value="All">All Plants / Sites</option>
            {plantList.map((plant, index) => <option key={index} value={plant}>{plant}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '160px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>From Date:</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
        </div>
        <div style={{ flex: 1, minWidth: '160px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>To Date:</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
        </div>
      </div>

      {/* --- TABS NAVIGATION --- */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', overflowX: 'auto' }}>
        <button onClick={() => setActiveTab('stock_summary')} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'stock_summary' ? '#16a34a' : '#fff', color: activeTab === 'stock_summary' ? '#fff' : '#64748b', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
          📊 Live Stock Summary (સ્ટોક કેટલો છે?)
        </button>
        <button onClick={() => setActiveTab('production')} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'production' ? '#2563eb' : '#fff', color: activeTab === 'production' ? '#fff' : '#64748b', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
          🏭 Production Report
        </button>
        <button onClick={() => setActiveTab('stock_ledger')} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'stock_ledger' ? '#2563eb' : '#fff', color: activeTab === 'stock_ledger' ? '#fff' : '#64748b', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
          📦 Finished Goods Ledger
        </button>
        <button onClick={() => setActiveTab('material_ledger')} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'material_ledger' ? '#2563eb' : '#fff', color: activeTab === 'material_ledger' ? '#fff' : '#64748b', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
          🧱 Raw Material Ledger
        </button>
      </div>

      {loading && <p style={{ textAlign: 'center', color: '#64748b' }}>Loading report data...</p>}

      {/* --- TAB 0: LIVE STOCK SUMMARY (CLOSING STOCK) --- */}
      {!loading && activeTab === 'stock_summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Finished Goods Stock Box */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '15px', color: '#166534', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={18} /> 📦 Finished Goods Current Stock (તૈયાર માલનો બાકી સ્ટોક)
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f0fdf4', color: '#166534', borderBottom: '2px solid #dcfce7' }}>
                  <th style={{ padding: '10px' }}>Plant Name</th>
                  <th style={{ padding: '10px' }}>Product Name</th>
                  <th style={{ padding: '10px' }}>Size / Variant</th>
                  <th style={{ padding: '10px' }}>Total Produced (+)</th>
                  <th style={{ padding: '10px' }}>Total Out/Broken (-)</th>
                  <th style={{ padding: '10px', color: '#15803d' }}>Current Closing Stock</th>
                </tr>
              </thead>
              <tbody>
                {finishedStockList.length > 0 ? (
                  finishedStockList.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px' }}>{item.plant}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{item.product}</td>
                      <td style={{ padding: '10px' }}>{item.variant}</td>
                      <td style={{ padding: '10px', color: '#2563eb' }}>{item.totalIn} Nos</td>
                      <td style={{ padding: '10px', color: '#dc2626' }}>{item.totalOut} Nos</td>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: item.balance >= 0 ? '#16a34a' : '#dc2626', fontSize: '14px' }}>
                        {item.balance} Nos
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No Finished Goods Stock Data Found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Raw Material Stock Box (Cement, Steel etc.) */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '15px', color: '#b45309', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowDownRight size={18} /> 🧱 Raw Material Current Stock (કાચા માલનો બાકી સ્ટોક - સિમેન્ટ, સ્ટીલ વગેરે)
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#fef3c7', color: '#b45309', borderBottom: '2px solid #fde68a' }}>
                  <th style={{ padding: '10px' }}>Plant Name</th>
                  <th style={{ padding: '10px' }}>Material Name</th>
                  <th style={{ padding: '10px' }}>Total Inward (+)</th>
                  <th style={{ padding: '10px' }}>Total Consumption (-)</th>
                  <th style={{ padding: '10px', color: '#92400e' }}>Current Closing Stock</th>
                </tr>
              </thead>
              <tbody>
                {materialStockList.length > 0 ? (
                  materialStockList.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px' }}>{item.plant}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{item.material}</td>
                      <td style={{ padding: '10px', color: '#16a34a' }}>{item.totalIn} {item.unit}</td>
                      <td style={{ padding: '10px', color: '#dc2626' }}>{item.totalOut} {item.unit}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: item.balance >= 0 ? '#2563eb' : '#dc2626', fontSize: '14px' }}>
                        {item.balance} {item.unit}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No Raw Material Stock Data Found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* --- TAB 1: PRODUCTION REPORT TABLE --- */}
      {!loading && activeTab === 'production' && (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
          <h3 style={{ fontSize: '15px', color: '#1e293b', marginBottom: '15px' }}>📋 Production Summary</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#334155', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '10px' }}>Date</th>
                <th style={{ padding: '10px' }}>Plant Name</th>
                <th style={{ padding: '10px' }}>Labour / Team</th>
                <th style={{ padding: '10px' }}>Product</th>
                <th style={{ padding: '10px' }}>Size / Variant</th>
                <th style={{ padding: '10px' }}>Lines / Qty</th>
                <th style={{ padding: '10px' }}>Broken Qty</th>
                <th style={{ padding: '10px' }}>Cement / RMC</th>
              </tr>
            </thead>
            <tbody>
              {productionData.length > 0 ? (
                productionData.map((header) => 
                  header.production_items && header.production_items.map((item, idx) => (
                    <tr key={`${header.id}-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px' }}>{header.production_date}</td>
                      <td style={{ padding: '10px' }}>{header.plant_name}</td>
                      <td style={{ padding: '10px' }}>{header.team_name}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{item.product_name}</td>
                      <td style={{ padding: '10px' }}>{item.size_variant}</td>
                      <td style={{ padding: '10px' }}>{item.nos_of_line_casting} Lines</td>
                      <td style={{ padding: '10px', color: '#dc2626', fontWeight: 'bold' }}>{item.broken_qty} Nos</td>
                      <td style={{ padding: '10px' }}>
                        {item.concrete_source === 'Site Mix' ? `${header.actual_cement_used} Bags` : `${header.total_rmc_used} M3`}
                      </td>
                    </tr>
                  ))
                )
              ) : (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No Production Data Found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- TAB 2: FINISHED GOODS STOCK LEDGER TABLE --- */}
      {!loading && activeTab === 'stock_ledger' && (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
          <h3 style={{ fontSize: '15px', color: '#1e293b', marginBottom: '15px' }}>📦 Finished Goods Stock Ledger (Product In/Out)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#334155', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '10px' }}>Date</th>
                <th style={{ padding: '10px' }}>Plant Name</th>
                <th style={{ padding: '10px' }}>Product Name</th>
                <th style={{ padding: '10px' }}>Size / Variant</th>
                <th style={{ padding: '10px' }}>Transaction Type</th>
                <th style={{ padding: '10px' }}>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {stockLedgerData.length > 0 ? (
                stockLedgerData.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px' }}>{row.date}</td>
                    <td style={{ padding: '10px' }}>{row.plant_name}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{row.product_name}</td>
                    <td style={{ padding: '10px' }}>{row.size_variant}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: row.transaction_type === 'PRODUCTION' ? '#dbeafe' : '#ffedd5', color: row.transaction_type === 'PRODUCTION' ? '#1d4ed8' : '#c2410c' }}>
                        {row.transaction_type}
                      </span>
                    </td>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{row.qty} Nos</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No Stock Ledger Data Found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- TAB 3: RAW MATERIAL STOCK LEDGER TABLE --- */}
      {!loading && activeTab === 'material_ledger' && (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
          <h3 style={{ fontSize: '15px', color: '#1e293b', marginBottom: '15px' }}>🧱 Raw Material Stock Ledger (Cement, Steel, Sand, etc.)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#334155', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '10px' }}>Date</th>
                <th style={{ padding: '10px' }}>Plant Name</th>
                <th style={{ padding: '10px' }}>Material Name</th>
                <th style={{ padding: '10px' }}>Unit</th>
                <th style={{ padding: '10px' }}>Transaction Type</th>
                <th style={{ padding: '10px' }}>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {materialLedgerData.length > 0 ? (
                materialLedgerData.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px' }}>{row.date}</td>
                    <td style={{ padding: '10px' }}>{row.plant_name}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{row.material_name}</td>
                    <td style={{ padding: '10px' }}>{row.unit}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: row.transaction_type === 'INWARD' ? '#dcfce7' : '#fee2e2', color: row.transaction_type === 'INWARD' ? '#166534' : '#b91c1c' }}>
                        {row.transaction_type}
                      </span>
                    </td>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{row.qty} {row.unit}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No Material Ledger Data Found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};

export default AdminPlantReport;