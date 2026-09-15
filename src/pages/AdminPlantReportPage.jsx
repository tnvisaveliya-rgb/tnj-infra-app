import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, MapPin, Package, Truck, ChevronDown, ChevronUp, RefreshCcw, Globe, FileDown, ArrowUpRight } from 'lucide-react';
// --- Date Formatting Helper ---
const formatDateToDDMMYYYY = (dateString) => {
  if (!dateString || dateString === '-') return '-';
  const datePart = dateString.split('T')[0]; 
  const [year, month, day] = datePart.split('-');
  if (day && month && year) {
    return `${day}/${month}/${year}`;
  }
  return dateString;
};

// --- Smart Material & Size Extractor ---
const extractMaterialAndSize = (rawMaterial, existingSize) => {
  if (!rawMaterial) return { material: '-', size: '-' };
  let cleaned = rawMaterial.replace(/\(.*?\)/g, '').trim();
  let finalSize = (existingSize && existingSize !== '-' && existingSize.trim() !== '') ? existingSize.replace(/\(.*?\)/g, '').trim() : '';
  let finalMaterial = cleaned;

  if (!finalSize) {
    const lastSpaceIdx = cleaned.lastIndexOf(' ');
    if (lastSpaceIdx !== -1) {
      const possibleSize = cleaned.substring(lastSpaceIdx + 1);
      if (/\d/.test(possibleSize)) {
        finalMaterial = cleaned.substring(0, lastSpaceIdx).trim();
        finalSize = possibleSize;
      }
    }
  }
  return { material: finalMaterial || '-', size: finalSize || '-' };
};

const AdminPlantReportPage = () => {
  const [isAllDates, setIsAllDates] = useState(true);
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  const [selectedState, setSelectedState] = useState('All');
  const [selectedPlant, setSelectedPlant] = useState('All');

  const [activeTab, setActiveTab] = useState('FinishedGoods'); 
  
  // Sub-Toggles
  const [stockTabMode, setStockTabMode] = useState('FG'); // 'FG' or 'RM' (For Tab 1)
  const [outwardGroupBy, setOutwardGroupBy] = useState('Site'); // For Tab 2
  const [groupBy, setGroupBy] = useState('Vendor'); // For Tab 3
  
  const [expandedId, setExpandedId] = useState(null); 
  const [expandedOutwardId, setExpandedOutwardId] = useState(null); 

  const [allPlantsDb, setAllPlantsDb] = useState([]);
  const [stateList, setStateList] = useState([]);
  const [availablePlants, setAvailablePlants] = useState([]);
  const [loadingPlants, setLoadingPlants] = useState(true);

  // Data States
  const [fgStockData, setFgStockData] = useState([]); // Tab 1 - FG
  const [rmStockData, setRmStockData] = useState([]); // Tab 1 - RM
  
  const [outwardSiteData, setOutwardSiteData] = useState([]); // Tab 2
  const [outwardTransporterData, setOutwardTransporterData] = useState([]); // Tab 2
  
  const [vendorData, setVendorData] = useState([]); // Tab 3
  const [rawMaterialInwardData, setRawMaterialInwardData] = useState([]); // Tab 3
  
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    const fetchPlantsData = async () => {
      try {
        setLoadingPlants(true);
        const { data } = await supabase.from('plants').select('*');
        if (data) {
          setAllPlantsDb(data);
          setStateList([...new Set(data.map(p => p.state).filter(Boolean))]);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoadingPlants(false);
      }
    };
    fetchPlantsData();
  }, []);

  useEffect(() => {
    if (selectedState === 'All') {
      setAvailablePlants([...new Set(allPlantsDb.map(p => p.plant_name).filter(Boolean))]);
    } else {
      const filtered = allPlantsDb.filter(p => p.state === selectedState);
      setAvailablePlants([...new Set(filtered.map(p => p.plant_name).filter(Boolean))]);
    }
  }, [selectedState, allPlantsDb]);

  const handleStateChange = (e) => {
    setSelectedState(e.target.value);
    setSelectedPlant('All'); 
  };

useEffect(() => {
    const fetchReportData = async () => {
      setLoadingReports(true);
      try {
        let fgQuery = supabase.from('stock_ledger').select('*');
        if (!isAllDates) fgQuery = fgQuery.lte('date', toDate);
        if (selectedPlant !== 'All') fgQuery = fgQuery.eq('plant_name', selectedPlant);
        else if (selectedState !== 'All' && availablePlants.length > 0) fgQuery = fgQuery.in('plant_name', availablePlants);

        let rmQuery = supabase.from('plant_material_inward').select('*'); 
        if (!isAllDates) rmQuery = rmQuery.lte('date', toDate);
        if (selectedPlant !== 'All') rmQuery = rmQuery.eq('plant_name', selectedPlant);
        else if (selectedState !== 'All' && availablePlants.length > 0) rmQuery = rmQuery.in('plant_name', availablePlants);

        let outQuery = supabase.from('plant_material_outward').select('*');
        if (!isAllDates) outQuery = outQuery.lte('date', toDate);
        if (selectedPlant !== 'All') outQuery = outQuery.eq('plant_name', selectedPlant);
        else if (selectedState !== 'All' && availablePlants.length > 0) outQuery = outQuery.in('plant_name', availablePlants);

        let rmConsumptionQuery = supabase.from('material_stock_ledger').select('*');
        if (!isAllDates) rmConsumptionQuery = rmConsumptionQuery.lte('date', toDate);
        if (selectedPlant !== 'All') rmConsumptionQuery = rmConsumptionQuery.eq('plant_name', selectedPlant);
        else if (selectedState !== 'All' && availablePlants.length > 0) rmConsumptionQuery = rmConsumptionQuery.in('plant_name', availablePlants);

        const [fgResponse, rmResponse, outResponse, rmConsumptionResponse] = await Promise.all([fgQuery, rmQuery, outQuery, rmConsumptionQuery]);

        const fgStockMap = {};
        const rmStockMap = {};
        const vMap = {};
        const rmInwardMap = {};
        const sMap = {}; 
        const tMap = {}; 

        // --------------------------------------------------------------------------------
        // A. FINISHED GOODS (stock_ledger) Processing
        // --------------------------------------------------------------------------------
        if (fgResponse.data) {
          fgResponse.data.forEach(row => {
            const qty = Number(row.qty) || 0;
            const rowDate = new Date(row.date);
            const fromD = new Date(fromDate);
            const isBefore = !isAllDates && rowDate < fromD;
            const isCurrentPeriod = isAllDates || (rowDate >= fromD);

            const tType = String(row.transaction_type || '').toUpperCase().trim();
            
            // ❌ અહીંથી સ્ટીલ કાઢવાનું લોજીક હટાવી દીધું છે, એટલે ઓરીજીનલ સાઈઝ અને સ્ટીલ દેખાશે ❌
            const materialName = row.product_name || 'Unknown Item';
            const sizeVariant = row.size_variant || '-';
            const key = `${materialName}_${sizeVariant}`;

            if (!fgStockMap[key]) {
              fgStockMap[key] = { material: materialName, size: sizeVariant, opening: 0, production: 0, outward: 0, damage: 0, purchase: 0, closing: 0 };
            }

            if (['PRODUCTION', 'OUTWARD', 'BROKEN', 'DAMAGE', 'INWARD', 'PURCHASE'].includes(tType)) {
              if (isBefore) {
                if (['PRODUCTION', 'INWARD', 'PURCHASE'].includes(tType)) fgStockMap[key].opening += qty;
                else if (['OUTWARD', 'BROKEN', 'DAMAGE'].includes(tType)) fgStockMap[key].opening -= qty;
              }
              if (isCurrentPeriod) {
                if (tType === 'PRODUCTION') fgStockMap[key].production += qty;
                else if (tType === 'OUTWARD') fgStockMap[key].outward += qty;
                else if (['BROKEN', 'DAMAGE'].includes(tType)) fgStockMap[key].damage += qty;
                else if (['INWARD', 'PURCHASE'].includes(tType)) fgStockMap[key].purchase += qty;
              }
              if (['PRODUCTION', 'INWARD', 'PURCHASE'].includes(tType)) fgStockMap[key].closing += qty;
              else if (['OUTWARD', 'BROKEN', 'DAMAGE'].includes(tType)) fgStockMap[key].closing -= qty;
            }
          });
        }

        // --------------------------------------------------------------------------------
        // B. RAW MATERIAL (Inward) Processing
        // --------------------------------------------------------------------------------
        if (rmResponse.data) {
          rmResponse.data.forEach(row => {
            const qty = Number(row.quantity) || 0;
            const rowDate = new Date(row.date);
            const fromD = new Date(fromDate);
            const isBefore = !isAllDates && rowDate < fromD;
            const isCurrentPeriod = isAllDates || (rowDate >= fromD);

            const itemName = row.material_name || 'Unknown Material'; 
            const uom = row.unit || '';
            const vehicle = (row.vehicle_no && row.vehicle_no !== 'undefined' && row.vehicle_no !== 'EMPTY') ? row.vehicle_no : '-';
            const dcNum = (row.dc_number && row.dc_number !== 'undefined' && row.dc_number !== 'EMPTY') ? row.dc_number : '-';
            const rawBillUrl = row.bill_url || row.bill_url_text;
            const billUrl = (rawBillUrl && rawBillUrl !== 'undefined' && rawBillUrl !== 'EMPTY') ? rawBillUrl : '-';
            const dateStr = row.date ? formatDateToDDMMYYYY(row.date) : '-';
            const vendor = (row.supplier_name && row.supplier_name.trim() !== '') ? row.supplier_name.trim() : 'સીધી ખરીદી';

            if (!rmStockMap[itemName]) {
              rmStockMap[itemName] = { material: itemName, uom: uom, opening: 0, inward: 0, consumption: 0, outward: 0, closing: 0 };
            }
            if (isBefore) rmStockMap[itemName].opening += qty;
            if (isCurrentPeriod) rmStockMap[itemName].inward += qty;
            rmStockMap[itemName].closing += qty;

            if (isCurrentPeriod) {
              if (!vMap[vendor]) vMap[vendor] = { id: vendor, vendorName: vendor, totalQty: 0, materialsMap: {} };
              if (!rmInwardMap[itemName]) rmInwardMap[itemName] = { id: itemName, name: itemName, totalInward: 0, uom: uom };

              vMap[vendor].totalQty += qty;
              if (!vMap[vendor].materialsMap[itemName]) vMap[vendor].materialsMap[itemName] = { total: 0, uom: uom, transactions: [] };
              vMap[vendor].materialsMap[itemName].total += qty;
              vMap[vendor].materialsMap[itemName].transactions.push({ date: dateStr, dcNumber: dcNum, uom: uom, qty: qty, vehicleNo: vehicle, billUrl: billUrl });
              rmInwardMap[itemName].totalInward += qty;
            }
          });
        }

        // --------------------------------------------------------------------------------
        // C. FINISHED GOODS (Outward / Dispatch to Site) Processing
        // --------------------------------------------------------------------------------
        if (outResponse && outResponse.data) {
          outResponse.data.forEach(row => {
            const qty = Number(row.quantity || row.qty) || 0;
            const rowDate = new Date(row.date);
            const fromD = new Date(fromDate);
            const isCurrentPeriod = isAllDates || (rowDate >= fromD);
            
            const rawMaterial = row.material_name || row.product_name || 'Unknown Material'; 
            const rawSize = row.size_variant || row.size || '';
            
            // અહી જાવક (Outward) ના રિપોર્ટમાં હજુ સ્ટીલની ડીટેલ કાઢીને શુદ્ધ નામ દેખાડશે
            const extracted = extractMaterialAndSize(rawMaterial, rawSize);
            const cleanMaterial = extracted.material;
            const cleanSize = extracted.size;

            const uom = row.unit || row.uom || 'Nos';
            const siteName = (row.site_name || row.site || 'અન્ય સાઇટ').trim();
            const transporterName = (row.transporter_name || row.transporter || 'અન્ય ટ્રાન્સપોર્ટર').trim();
            const dateStr = row.date ? formatDateToDDMMYYYY(row.date) : '-';
            const dcNum = row.dc_number || '-';
            const vehicle = row.vehicle_no || row.vehicle_number || '-';
            const summaryKey = cleanSize !== '-' ? `${cleanMaterial} - ${cleanSize}` : cleanMaterial;

            if (isCurrentPeriod) {
              if (!sMap[siteName]) sMap[siteName] = { id: siteName, name: siteName, totalQty: 0, transactions: [], summary: {} };
              sMap[siteName].totalQty += qty;
              sMap[siteName].transactions.push({ date: dateStr, dcNumber: dcNum, material: cleanMaterial, size: cleanSize, qty, uom, vehicleNo: vehicle, transporter: transporterName });
              if (!sMap[siteName].summary[summaryKey]) sMap[siteName].summary[summaryKey] = { qty: 0, uom };
              sMap[siteName].summary[summaryKey].qty += qty;

              if (!tMap[transporterName]) tMap[transporterName] = { id: transporterName, name: transporterName, totalQty: 0, transactions: [], summary: {} };
              tMap[transporterName].totalQty += qty;
              tMap[transporterName].transactions.push({ date: dateStr, dcNumber: dcNum, material: cleanMaterial, size: cleanSize, qty, uom, vehicleNo: vehicle, site: siteName });
              if (!tMap[transporterName].summary[summaryKey]) tMap[transporterName].summary[summaryKey] = { qty: 0, uom };
              tMap[transporterName].summary[summaryKey].qty += qty;
            }
          });
        }

        // --------------------------------------------------------------------------------
        // D. RAW MATERIAL CONSUMPTION & OUTWARD (material_stock_ledger) Processing
        // --------------------------------------------------------------------------------
        if (rmConsumptionResponse && rmConsumptionResponse.data) {
          rmConsumptionResponse.data.forEach(row => {
            const qty = Number(row.qty || row.quantity) || 0;
            const rowDate = new Date(row.date);
            const fromD = new Date(fromDate);
            const isBefore = !isAllDates && rowDate < fromD;
            const isCurrentPeriod = isAllDates || (rowDate >= fromD);

            const itemName = row.material_name || row.item_name || 'Unknown Material'; 
            const uom = row.unit || row.uom || '';
            const tType = String(row.transaction_type || '').toUpperCase().trim();

            if (!rmStockMap[itemName]) {
              rmStockMap[itemName] = { material: itemName, uom: uom, opening: 0, inward: 0, consumption: 0, outward: 0, closing: 0 };
            }
            
            // ❌ બગ ફિક્સ: માત્ર CONSUMPTION અને OUTWARD ને જ કાઉન્ટ કરો, બાકી બધુ ઈગ્નોર કરો ❌
            if (['CONSUMPTION', 'PRODUCTION'].includes(tType)) {
               if (isBefore) rmStockMap[itemName].opening -= qty;
               if (isCurrentPeriod) rmStockMap[itemName].consumption += qty;
               rmStockMap[itemName].closing -= qty;
            } 
            else if (['OUTWARD', 'DAMAGE', 'WASTAGE', 'RETURN', 'SCRAP'].includes(tType)) {
               if (isBefore) rmStockMap[itemName].opening -= qty;
               if (isCurrentPeriod) rmStockMap[itemName].outward += qty;
               rmStockMap[itemName].closing -= qty;
            }
          });
        }

        // --- Final State Updates ---
        setFgStockData(Object.values(fgStockMap));
        setRmStockData(Object.values(rmStockMap));

        const finalVendors = Object.values(vMap).map(v => {
          const matsList = Object.entries(v.materialsMap).map(([mName, mData]) => ({ name: mName, total: mData.total, uom: mData.uom, transactions: mData.transactions }));
          return { id: v.id, vendorName: v.vendorName, totalQty: v.totalQty, materials: matsList };
        }).filter(v => v.totalQty > 0);
        setVendorData(finalVendors);
        setRawMaterialInwardData(Object.values(rmInwardMap).filter(m => m.totalInward > 0));

        setOutwardSiteData(Object.values(sMap).filter(s => s.totalQty > 0));
        setOutwardTransporterData(Object.values(tMap).filter(t => t.totalQty > 0));
        
      } catch (err) {
        console.error("Fetch Report Error:", err);
      } finally {
        setLoadingReports(false);
      }
    };

    fetchReportData();
  }, [isAllDates, fromDate, toDate, selectedState, selectedPlant, availablePlants]);

  const toggleAccordion = (id) => setExpandedId(expandedId === id ? null : id);
  const toggleOutwardAccordion = (id) => setExpandedOutwardId(expandedOutwardId === id ? null : id);

  // ==========================================
  // PDF Download Functions
  // ==========================================

  // PDF For Tab 1 (Stock Ledger)
  const handleStockPDF = (type) => {
    const printWindow = window.open('', '', 'width=1000,height=700');
    const dateText = isAllDates ? 'All Dates (આજ સુધી)' : `${formatDateToDDMMYYYY(fromDate)} થી ${formatDateToDDMMYYYY(toDate)}`;
    const plantText = selectedPlant === 'All' ? 'બધા પ્લાન્ટ્સ (All Plants)' : selectedPlant;
    const title = type === 'FG' ? 'FINISHED GOODS STOCK REPORT' : 'RAW MATERIAL STOCK REPORT';

    let tableHTML = '';

    if (type === 'FG') {
      tableHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>ITEM NAME</th>
              <th>SIZE</th>
              <th>OPENING STOCK</th>
              <th>PRODUCTION</th>
              <th>OUTWARD</th>
              <th>DAMAGE</th>
              <th>PURCHASE / INWARD</th>
              <th>STOCK</th>
            </tr>
          </thead>
          <tbody>
            ${fgStockData.map(row => `
              <tr>
                <td>${row.material}</td>
                <td>${row.size}</td>
                <td>${row.opening}</td>
                <td>${row.production || ''}</td>
                <td>${row.outward || ''}</td>
                <td>${row.damage || ''}</td>
                <td>${row.purchase || ''}</td>
                <td style="font-weight:bold;">${row.closing}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      tableHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>MATERIAL NAME</th>
              <th>UOM</th>
              <th>OPENING STOCK</th>
              <th>INWARD</th>
              <th>CONSUMPTION</th>
              <th>OUTWARD</th>
              <th>STOCK</th>
            </tr>
          </thead>
          <tbody>
            ${rmStockData.map(row => `
              <tr>
                <td>${row.material}</td>
                <td>${row.uom}</td>
                <td>${row.opening}</td>
                <td>${row.inward || ''}</td>
                <td>${row.consumption || ''}</td>
                <td>${row.outward || ''}</td>
                <td style="font-weight:bold;">${row.closing}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    const html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 20px; color: #1e293b; }
            h2 { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 10px; margin-bottom: 20px; }
            .info-table { margin-bottom: 20px; border-collapse: collapse; width: 50%; font-size: 14px; }
            .info-table td { padding: 6px 10px; border: 1px solid #cbd5e1; }
            .info-table td:first-child { background-color: #f1f5f9; font-weight: bold; width: 140px; }
            .data-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
            .data-table th, .data-table td { border: 1px solid #334155; padding: 8px; }
            .data-table th { background-color: #f8fafc; font-weight: bold; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <h2>T&J Infra - ${title}</h2>
          <table class="info-table">
            <tr><td>Plant / Site</td><td>${plantText}</td></tr>
            <tr><td>Date Period</td><td>${dateText}</td></tr>
          </table>
          ${tableHTML}
          <script>window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 500); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // PDF For Tab 2 (Outward)
  const handleOutwardPDF = (groupData, groupType) => {
    const printWindow = window.open('', '', 'width=1000,height=700');
    const dateText = isAllDates ? 'All Dates (આજ સુધી)' : `${formatDateToDDMMYYYY(fromDate)} થી ${formatDateToDDMMYYYY(toDate)}`;
    const plantText = selectedPlant === 'All' ? 'બધા પ્લાન્ટ્સ (All Plants)' : selectedPlant;
    const dynamicColumnHeader = groupType === 'Site' ? 'Transporter' : 'Site Details';

    const summaryHtml = Object.entries(groupData.summary).map(([key, data]) => `
      <tr>
        <td style="border: 1px solid #334155; padding: 8px;">${key}</td>
        <td style="border: 1px solid #334155; padding: 8px; font-weight: bold; color: #0f172a;">${data.qty} ${data.uom}</td>
      </tr>
    `).join('');

    const html = `
      <html>
        <head>
          <title>Outward Report - ${groupData.name}</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 20px; color: #1e293b; }
            h2 { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 10px; }
            .info-table { margin-bottom: 20px; border-collapse: collapse; width: 60%; font-size: 14px; }
            .info-table td { padding: 6px 10px; border: 1px solid #cbd5e1; }
            .info-table td:first-child { background-color: #f1f5f9; font-weight: bold; width: 140px; }
            .data-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; margin-bottom: 30px; }
            .data-table th, .data-table td { border: 1px solid #334155; padding: 8px; }
            .data-table th { background-color: #f8fafc; font-weight: bold; text-transform: uppercase; }
            .summary-table { width: 50%; border-collapse: collapse; font-size: 14px; text-align: left; }
            .summary-table th { background-color: #e2e8f0; font-weight: bold; padding: 8px; border: 1px solid #334155;}
          </style>
        </head>
        <body>
          <h2>T&J Infra - Outward (Dispatch) Report</h2>
          <table class="info-table">
            <tr><td>${groupType === 'Site' ? 'Site Name' : 'Transporter Name'}</td><td>${groupData.name}</td></tr>
            <tr><td>Dispatched From (Plant)</td><td>${plantText}</td></tr>
            <tr><td>Date Period</td><td>${dateText}</td></tr>
          </table>
          <table class="data-table">
            <thead>
              <tr><th>Date</th><th>Material</th><th>Size</th><th>Quantity</th><th>UOM</th><th>DC Number</th><th>Vehicle Number</th><th>${dynamicColumnHeader}</th></tr>
            </thead>
            <tbody>
              ${groupData.transactions.map(txn => `
                <tr><td>${txn.date}</td><td>${txn.material}</td><td>${txn.size}</td><td style="font-weight:bold;">${txn.qty}</td><td>${txn.uom}</td><td>${txn.dcNumber}</td><td>${txn.vehicleNo}</td><td>${groupType === 'Site' ? txn.transporter : txn.site}</td></tr>
              `).join('')}
            </tbody>
          </table>
          <h3>📦 Product Total Summary</h3>
          <table class="summary-table">
            <thead><tr><th>Product Description</th><th>Total Dispatched</th></tr></thead>
            <tbody>${summaryHtml}</tbody>
          </table>
          <script>window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 500); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // PDF For Tab 3 (Inward)
  const handleInwardPDF = (vendor, mat) => {
    const printWindow = window.open('', '', 'width=900,height=650');
    const dateText = isAllDates ? 'All Dates (આજ સુધી)' : `${formatDateToDDMMYYYY(fromDate)} થી ${formatDateToDDMMYYYY(toDate)}`;
    const plantText = selectedPlant === 'All' ? 'બધા પ્લાન્ટ્સ (All Plants)' : selectedPlant;
    
    const html = `
      <html>
        <head>
          <title>${vendor.vendorName} - ${mat.name} Report</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 20px; color: #1e293b; }
            h2 { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 10px; }
            .info-table { margin-bottom: 20px; border-collapse: collapse; width: 60%; font-size: 14px; }
            .info-table td { padding: 6px 10px; border: 1px solid #cbd5e1; }
            .info-table td:first-child { background-color: #f1f5f9; font-weight: bold; width: 140px; }
            .data-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
            .data-table th, .data-table td { border: 1px solid #334155; padding: 8px; }
            .data-table th { background-color: #f8fafc; font-weight: bold; text-transform: uppercase; }
            .total-row { background-color: #e2e8f0; font-weight: bold; font-size: 14px; }
            a { color: #2563eb; text-decoration: none; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>T&J Infra - Material Inward Report</h2>
          <table class="info-table">
            <tr><td>Supplier Name</td><td>${vendor.vendorName}</td></tr>
            <tr><td>Plant / Site</td><td>${plantText}</td></tr>
            <tr><td>Date Period</td><td>${dateText}</td></tr>
            <tr><td>Material Name</td><td>${mat.name}</td></tr>
          </table>
          <table class="data-table">
            <thead>
              <tr><th>Date</th><th>DC Number</th><th>Weight / Qty</th><th>UOM</th><th>Vehicle Number</th><th>Bill Link</th></tr>
            </thead>
            <tbody>
              ${mat.transactions.map(txn => `
                <tr><td>${txn.date}</td><td>${txn.dcNumber}</td><td>${txn.qty}</td><td>${txn.uom}</td><td>${txn.vehicleNo}</td>
                <td>${txn.billUrl !== '-' ? `<a href="${txn.billUrl}" target="_blank">View Bill</a>` : '-'}</td></tr>
              `).join('')}
              <tr class="total-row"><td colspan="2" style="text-align:right; padding-right:15px;">TOTAL</td><td>${mat.total}</td><td>${mat.uom}</td><td colspan="2"></td></tr>
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 500); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div style={{ backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Inter, sans-serif', paddingBottom: '20px' }}>
      
      {/* --- Top Header & Master Filters --- */}
      <div style={{ position: 'sticky', top: 0, backgroundColor: '#fff', padding: '15px', zIndex: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#1e293b', fontWeight: 'bold' }}>T&J Infra Master Report</h2>
        
        {/* Date Filter */}
        <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: isAllDates ? '0' : '10px' }}>
            <input type="checkbox" checked={isAllDates} onChange={(e) => setIsAllDates(e.target.checked)} style={{ width: '16px', height: '16px' }} />
            બધી તારીખનો ડેટા (All Dates)
          </label>
          {!isAllDates && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>From Date</span>
                <div style={inputWrapperStyle}>
                  <Calendar size={14} color="#64748b" />
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>To Date</span>
                <div style={inputWrapperStyle}>
                  <Calendar size={14} color="#64748b" />
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Location Filter */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <div style={inputWrapperStyle}>
            <Globe size={14} color="#64748b" />
              <select value={selectedState} onChange={handleStateChange} style={inputStyle} disabled={loadingPlants}>
                <option value="All">બધા રાજ્યો (All)</option>
                {stateList?.map((st, i) => <option key={i} value={st}>{st}</option>)}
              </select>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={inputWrapperStyle}>
              <MapPin size={14} color="#64748b" />
              <select value={selectedPlant} onChange={(e) => setSelectedPlant(e.target.value)} style={inputStyle} disabled={loadingPlants}>
                <option value="All">બધા પ્લાન્ટ્સ (All)</option>
                {availablePlants?.map((plant, i) => <option key={i} value={plant}>{plant}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '15px', maxWidth: '600px', margin: '0 auto' }}>
        
        {/* --- Main Tabs --- */}
        <div style={{ display: 'flex', backgroundColor: '#e2e8f0', borderRadius: '10px', padding: '4px', marginBottom: '20px', gap: '4px' }}>
          <button style={activeTab === 'FinishedGoods' ? activeTabStyle : inactiveTabStyle} onClick={() => setActiveTab('FinishedGoods')}>
            <Package size={14} /> સ્ટોક રજીસ્ટર
          </button>
          <button style={activeTab === 'Outward' ? activeTabStyle : inactiveTabStyle} onClick={() => setActiveTab('Outward')}>
            <ArrowUpRight size={14} /> જાવક રિપોર્ટ
          </button>
          <button style={activeTab === 'RawMaterials' ? activeTabStyle : inactiveTabStyle} onClick={() => setActiveTab('RawMaterials')}>
            <Truck size={14} /> ઈનવર્ડ રિપોર્ટ
          </button>
        </div>

        {loadingReports ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Live Data Loading...</div>
        ) : (
          <>
            {/* ----------------------------------------------------------- */}
            {/* TAB 1: STOCK LEDGER (ફિનિશ્ડ ગુડ્સ અને કાચો માલ સ્ટોક)      */}
            {/* ----------------------------------------------------------- */}
            {activeTab === 'FinishedGoods' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
                  <button onClick={() => setStockTabMode(stockTabMode === 'FG' ? 'RM' : 'FG')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', color: '#334155', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <RefreshCcw size={14} color="#2563eb" />
                    {stockTabMode === 'FG' ? 'કાચો માલ સ્ટોક જોવો છે?' : 'ફિનિશ્ડ ગુડ્સ સ્ટોક જોવો છે?'}
                  </button>
                </div>

                <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  
                  {/* Header & PDF Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                    <h3 style={{ fontSize: '14px', margin: 0, color: '#1e293b', textTransform: 'uppercase' }}>
                      {stockTabMode === 'FG' ? '📦 FINISHED GOOD STOCK' : '🪨 RAW MATERIAL STOCK'}
                    </h3>
                    <button onClick={() => handleStockPDF(stockTabMode)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                      <FileDown size={14} /> PDF
                    </button>
                  </div>

                  {/* FG Table */}
                  {stockTabMode === 'FG' && (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', color: '#475569', borderBottom: '2px solid #cbd5e1' }}>
                            <th style={thStyle}>ITEM NAME</th>
                            <th style={thStyle}>SIZE</th>
                            <th style={thStyle}>opening stock</th>
                            <th style={thStyle}>production</th>
                            <th style={thStyle}>outword</th>
                            <th style={thStyle}>damge</th>
                            <th style={thStyle}>purchse/inward</th>
                            <th style={thStyle}>stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fgStockData.length === 0 ? (
                            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No Data Found</td></tr>
                          ) : (
                            fgStockData.map((row, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={tdBorder}>{row.material}</td>
                                <td style={tdBorder}>{row.size}</td>
                                <td style={tdBorder}>{row.opening}</td>
                                <td style={tdBorder}>{row.production || ''}</td>
                                <td style={tdBorder}>{row.outward || ''}</td>
                                <td style={tdBorder}>{row.damage || ''}</td>
                                <td style={tdBorder}>{row.purchase || ''}</td>
                                <td style={{ ...tdBorder, fontWeight: 'bold', color: '#0f172a' }}>{row.closing}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* RM Table */}
                  {stockTabMode === 'RM' && (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', color: '#475569', borderBottom: '2px solid #cbd5e1' }}>
                            <th style={thStyle}>material NAME</th>
                            <th style={thStyle}>uom</th>
                            <th style={thStyle}>opening stock</th>
                            <th style={thStyle}>inward</th>
                            <th style={thStyle}>consumaption</th>
                            <th style={thStyle}>outward</th>
                            <th style={thStyle}>stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rmStockData.length === 0 ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No Data Found</td></tr>
                          ) : (
                            rmStockData.map((row, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={tdBorder}>{row.material}</td>
                                <td style={tdBorder}>{row.uom}</td>
                                <td style={tdBorder}>{row.opening}</td>
                                <td style={tdBorder}>{row.inward || ''}</td>
                                <td style={tdBorder}>{row.consumption || ''}</td>
                                <td style={tdBorder}>{row.outward || ''}</td>
                                <td style={{ ...tdBorder, fontWeight: 'bold', color: '#0f172a' }}>{row.closing}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* ----------------------------------------------------------- */}
            {/* TAB 2: OUTWARD REPORT (સાઇટ અને ટ્રાન્સપોર્ટર મુજબ)           */}
            {/* ----------------------------------------------------------- */}
            {activeTab === 'Outward' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
                  <button onClick={() => setOutwardGroupBy(outwardGroupBy === 'Site' ? 'Transporter' : 'Site')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', color: '#334155', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <RefreshCcw size={14} color="#ef4444" />
                    {outwardGroupBy === 'Site' ? 'ટ્રાન્સપોર્ટર મુજબ જોવું છે?' : 'સાઇટ મુજબ જોવું છે?'}
                  </button>
                </div>

                {outwardGroupBy === 'Site' && (
                  outwardSiteData.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8' }}>કોઈ સાઇટનો જાવક ડેટા મળ્યો નથી.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {outwardSiteData.map(site => (
                        <div key={site.id} style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                          <div onClick={() => toggleOutwardAccordion(site.id)} style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: expandedOutwardId === site.id ? '#f8fafc' : '#fff' }}>
                            <div><h4 style={{ margin: 0, fontSize: '14px', color: '#1e293b' }}>📍 {site.name}</h4></div>
                            {expandedOutwardId === site.id ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                          </div>
                          
                          {expandedOutwardId === site.id && (
                            <div style={{ padding: '15px', borderTop: '1px solid #e2e8f0', backgroundColor: '#fff', overflowX: 'auto' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.5' }}>
                                  <div><span style={{color: '#64748b'}}>Site:</span> <strong>{site.name}</strong></div>
                                </div>
                                <button onClick={() => handleOutwardPDF(site, 'Site')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                                  <FileDown size={14} /> PDF
                                </button>
                              </div>
                              
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', whiteSpace: 'nowrap', border: '1px solid #cbd5e1' }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', borderBottom: '1px solid #cbd5e1' }}>
                                    <th style={tdBorder}>Date</th>
                                    <th style={tdBorder}>Material</th>
                                    <th style={tdBorder}>Size</th>
                                    <th style={tdBorder}>Qty</th>
                                    <th style={tdBorder}>UOM</th>
                                    <th style={tdBorder}>DC Number</th>
                                    <th style={tdBorder}>Vehicle No</th>
                                    <th style={tdBorder}>Transporter</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {site.transactions.map((txn, tIdx) => (
                                    <tr key={tIdx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                      <td style={tdBorder}>{txn.date}</td>
                                      <td style={tdBorder}>{txn.material}</td>
                                      <td style={tdBorder}>{txn.size}</td>
                                      <td style={{ ...tdBorder, fontWeight: 'bold' }}>{txn.qty}</td>
                                      <td style={tdBorder}>{txn.uom}</td>
                                      <td style={tdBorder}>{txn.dcNumber}</td>
                                      <td style={tdBorder}>{txn.vehicleNo}</td>
                                      <td style={tdBorder}>{txn.transporter}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>

                              <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#0f172a' }}>📦 Product Total Summary</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {Object.entries(site.summary).map(([key, data], idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', borderBottom: '1px dashed #cbd5e1', paddingBottom: '4px' }}>
                                      <span>{key}</span>
                                      <strong style={{ color: '#0f172a' }}>{data.qty} {data.uom}</strong>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}

                {outwardGroupBy === 'Transporter' && (
                  outwardTransporterData.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8' }}>કોઈ ટ્રાન્સપોર્ટરનો જાવક ડેટા મળ્યો નથી.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {outwardTransporterData.map(trans => (
                        <div key={trans.id} style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                          <div onClick={() => toggleOutwardAccordion(trans.id)} style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: expandedOutwardId === trans.id ? '#f8fafc' : '#fff' }}>
                            <div><h4 style={{ margin: 0, fontSize: '14px', color: '#1e293b' }}>🚚 {trans.name}</h4></div>
                            {expandedOutwardId === trans.id ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                          </div>
                          
                          {expandedOutwardId === trans.id && (
                            <div style={{ padding: '15px', borderTop: '1px solid #e2e8f0', backgroundColor: '#fff', overflowX: 'auto' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.5' }}>
                                  <div><span style={{color: '#64748b'}}>Transporter:</span> <strong>{trans.name}</strong></div>
                                </div>
                                <button onClick={() => handleOutwardPDF(trans, 'Transporter')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                                  <FileDown size={14} /> PDF
                                </button>
                              </div>
                              
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', whiteSpace: 'nowrap', border: '1px solid #cbd5e1' }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', borderBottom: '1px solid #cbd5e1' }}>
                                    <th style={tdBorder}>Date</th>
                                    <th style={tdBorder}>Material</th>
                                    <th style={tdBorder}>Size</th>
                                    <th style={tdBorder}>Qty</th>
                                    <th style={tdBorder}>UOM</th>
                                    <th style={tdBorder}>DC Number</th>
                                    <th style={tdBorder}>Vehicle No</th>
                                    <th style={tdBorder}>Delivered Site</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {trans.transactions.map((txn, tIdx) => (
                                    <tr key={tIdx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                      <td style={tdBorder}>{txn.date}</td>
                                      <td style={tdBorder}>{txn.material}</td>
                                      <td style={tdBorder}>{txn.size}</td>
                                      <td style={{ ...tdBorder, fontWeight: 'bold' }}>{txn.qty}</td>
                                      <td style={tdBorder}>{txn.uom}</td>
                                      <td style={tdBorder}>{txn.dcNumber}</td>
                                      <td style={tdBorder}>{txn.vehicleNo}</td>
                                      <td style={tdBorder}>{txn.site}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>

                              <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#0f172a' }}>📦 Product Total Summary</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {Object.entries(trans.summary).map(([key, data], idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', borderBottom: '1px dashed #cbd5e1', paddingBottom: '4px' }}>
                                      <span>{key}</span>
                                      <strong style={{ color: '#0f172a' }}>{data.qty} {data.uom}</strong>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            )}

            {/* ----------------------------------------------------------- */}
            {/* TAB 3: INWARD REPORT (કાચો માલ અને વેન્ડર)                    */}
            {/* ----------------------------------------------------------- */}
            {activeTab === 'RawMaterials' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
                  <button onClick={() => setGroupBy(groupBy === 'Vendor' ? 'Material' : 'Vendor')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', color: '#334155', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <RefreshCcw size={14} color="#2563eb" />
                    {groupBy === 'Vendor' ? 'વસ્તુ મુજબ જોવું છે?' : 'પાર્ટી મુજબ જોવું છે?'}
                  </button>
                </div>

                {groupBy === 'Vendor' && (
                  vendorData.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8' }}>કોઈ વેન્ડરનો ડેટા મળ્યો નથી.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {vendorData.map(vendor => (
                        <div key={vendor.id} style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                          <div onClick={() => toggleAccordion(vendor.id)} style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: expandedId === vendor.id ? '#f8fafc' : '#fff' }}>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '14px', color: '#1e293b' }}>👤 {vendor.vendorName}</h4>
                              <span style={{ fontSize: '12px', color: '#64748b' }}>કુલ આવક: {vendor.totalQty}</span>
                            </div>
                            {expandedId === vendor.id ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                          </div>
                          
                          {expandedId === vendor.id && (
                            <div style={{ padding: '15px', borderTop: '1px solid #e2e8f0', backgroundColor: '#fff', overflowX: 'auto' }}>
                              {vendor.materials.map((mat, idx) => (
                                <div key={idx} style={{ marginBottom: idx === vendor.materials.length - 1 ? '0' : '20px' }}>
                                  
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.5' }}>
                                      <div><span style={{color: '#64748b'}}>Supplier:</span> <strong>{vendor.vendorName}</strong></div>
                                      <div><span style={{color: '#64748b'}}>Plant:</span> {selectedPlant === 'All' ? 'All Plants' : selectedPlant}</div>
                                      <div><span style={{color: '#64748b'}}>Date:</span> {isAllDates ? 'All Dates' : `${formatDateToDDMMYYYY(fromDate)} થી ${formatDateToDDMMYYYY(toDate)}`}</div>
                                      <div><span style={{color: '#64748b'}}>Material:</span> <strong style={{color: '#2563eb'}}>{mat.name}</strong></div>
                                    </div>
                                    <button 
                                      onClick={() => handleInwardPDF(vendor, mat)}
                                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)' }}
                                    >
                                      <FileDown size={14} /> PDF
                                    </button>
                                  </div>
                                  
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', whiteSpace: 'nowrap', border: '1px solid #cbd5e1' }}>
                                    <thead>
                                      <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', borderBottom: '1px solid #cbd5e1' }}>
                                        <th style={tdBorder}>Date</th>
                                        <th style={tdBorder}>DC Number</th>
                                        <th style={tdBorder}>Weight / Qty</th>
                                        <th style={tdBorder}>UOM</th>
                                        <th style={tdBorder}>Vehicle Number</th>
                                        <th style={tdBorder}>Bill Link</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {mat.transactions.map((txn, tIdx) => (
                                        <tr key={tIdx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                          <td style={tdBorder}>{txn.date}</td>
                                          <td style={tdBorder}>{txn.dcNumber}</td>
                                          <td style={{ ...tdBorder, fontWeight: 'bold' }}>{txn.qty}</td>
                                          <td style={tdBorder}>{txn.uom}</td>
                                          <td style={tdBorder}>{txn.vehicleNo}</td>
                                          <td style={tdBorder}>
                                            {txn.billUrl !== '-' ? (
                                              <a href={txn.billUrl} target="_blank" rel="noreferrer" style={{color: '#2563eb', textDecoration: 'underline'}}>View Bill</a>
                                            ) : '-'}
                                          </td>
                                        </tr>
                                      ))}
                                      <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold', borderTop: '2px solid #94a3b8' }}>
                                        <td style={tdBorder} colSpan={2} align="right">TOTAL</td>
                                        <td style={tdBorder}>{mat.total}</td>
                                        <td style={tdBorder}>{mat.uom}</td>
                                        <td style={tdBorder} colSpan={2}></td>
                                      </tr>
                                    </tbody>
                                  </table>

                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}

                {groupBy === 'Material' && (
                  rawMaterialInwardData.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8' }}>કોઈ કાચા માલનો ડેટા મળ્યો નથી.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {rawMaterialInwardData.map(item => (
                        <div key={item.id} style={cardStyle}>
                          <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                            📦 {item.name}
                          </h3>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#16a34a', fontWeight: 'bold' }}>
                            <span>કુલ આવક (Inward):</span> 
                            <span>{item.totalInward} {item.uom}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// --- Styles ---
const inputWrapperStyle = {
  display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', gap: '8px'
};

const inputStyle = {
  width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: '#334155', fontWeight: 'bold', appearance: 'none', cursor: 'pointer'
};

const activeTabStyle = {
  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 4px', backgroundColor: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', color: '#2563eb', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'all 0.2s', textAlign: 'center'
};

const inactiveTabStyle = {
  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 4px', backgroundColor: 'transparent', border: 'none', fontSize: '12px', fontWeight: 'bold', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center'
};

const cardStyle = {
  backgroundColor: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
};

const thStyle = {
  padding: '10px 12px', border: '1px solid #e2e8f0', textTransform: 'uppercase', fontWeight: 'bold'
};

const tdBorder = {
  padding: '10px 12px', border: '1px solid #e2e8f0'
};

export default AdminPlantReportPage;