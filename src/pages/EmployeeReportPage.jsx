import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Filter, FileSpreadsheet, FileText, MapPin, ArrowLeft, ClipboardList, CalendarDays, Users } from 'lucide-react';
import AdminLeaveRequests from './AdminLeaveRequests'; // 👈 તમારી લીવ રિક્વેસ્ટ ફાઈલ

// તારીખને DD/MM/YYYY માં ફેરવવાનું ફંક્શન
const formatDateToDDMMYYYY = (dateStr) => {
  if (!dateStr) return '';
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return cleanDate;
};

const DateFormatter = (dateStr) => {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
};

function EmployeeReportPage() {
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [processedReport, setProcessedReport] = useState([]);
  
  // Tab State: 'attendance' or 'leaves'
  const [activeTab, setActiveTab] = useState('attendance'); 

  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedSite, setSelectedSite] = useState('');
  const [fromDate, setFromDate] = useState('');

  const [toDate, setToDate] = useState('');
  const [isAllDates, setIsAllDates] = useState(false);

  const [employeeList, setEmployeeList] = useState([]);
  

  const [siteList, setSiteList] = useState([]);

  useEffect(() => {
    fetchAllAttendance();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [selectedEmployee, selectedSite, fromDate, toDate, attendanceLogs]);

  const fetchAllAttendance = async () => {
    const { data, error } = await supabase
      .from('site_attendance')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching logs:", error.message);
    } else if (data) {
      setAttendanceLogs(data);

      const uniqueEmployees = [...new Set(data.map(item => item.employee_name))];
      const uniqueSites = [...new Set(data.map(item => item.site_name))];
      
      setEmployeeList(uniqueEmployees);
      setSiteList(uniqueSites);
    }
  };

  const applyFilters = () => {
    let temp = [...attendanceLogs];

    if (selectedEmployee) {
      temp = temp.filter(item => item.employee_name === selectedEmployee);
    }
    if (selectedSite) {
      temp = temp.filter(item => item.site_name === selectedSite);
    }
    if (fromDate) {
      temp = temp.filter(item => item.created_at && DateFormatter(item.created_at) >= fromDate);
    }
    if (toDate) {
      temp = temp.filter(item => item.created_at && DateFormatter(item.created_at) <= toDate);
    }

    processWorkingHours(temp);
  };

  // MULTIPLE PUNCHES SUPPORT લોજીક
  const processWorkingHours = (logs) => {
    const ascendingLogs = [...logs].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const reportArray = [];
    
    const groupedByEmpSite = {};
    ascendingLogs.forEach(item => {
      const empKey = item.employee_name || 'Unknown';
      const siteKey = item.site_name || 'Unknown Site';
      const mapKey = `${empKey}_${siteKey}`;

      if (!groupedByEmpSite[mapKey]) {
        groupedByEmpSite[mapKey] = [];
      }
      groupedByEmpSite[mapKey].push(item);
    });

    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };

    Object.keys(groupedByEmpSite).forEach(mapKey => {
      const empLogs = groupedByEmpSite[mapKey];
      const partsKey = mapKey.split('_');
      const empName = partsKey[0];
      const siteName = partsKey.slice(1).join('_');

      let currentIn = null;

      empLogs.forEach(item => {
        if (item.punch_type === 'IN') {
          if (currentIn) {
            reportArray.push({
              employee: empName,
              date: formatDateToDDMMYYYY(currentIn.created_at),
              site: siteName,
              inTime: new Date(currentIn.created_at).toLocaleTimeString('en-US', timeOptions),
              outTime: '-',
              inLat: currentIn.latitude || '',
              inLng: currentIn.longitude || '',
              outLat: '',
              outLng: '',
              workingHours: '-',
              diffMs: 0,
              rawDateForSort: new Date(currentIn.created_at)
            });
          }
          currentIn = item;
        } else if (item.punch_type === 'OUT') {
          if (currentIn) {
            const dateStr = formatDateToDDMMYYYY(currentIn.created_at);
            const inTimeStr = new Date(currentIn.created_at).toLocaleTimeString('en-US', timeOptions);
            const outTimeStr = new Date(item.created_at).toLocaleTimeString('en-US', timeOptions);
            
            const inDateObj = new Date(currentIn.created_at);
            const outDateObj = new Date(item.created_at);
            const diffMs = outDateObj - inDateObj;

            let workingHours = '-';
            if (diffMs > 0) {
              const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
              const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
              workingHours = `${diffHrs} hrs ${diffMins} mins`;
            }

            reportArray.push({
              employee: empName,
              date: dateStr,
              site: siteName,
              inTime: inTimeStr,
              outTime: outTimeStr,
              inLat: currentIn.latitude || '',
              inLng: currentIn.longitude || '',
              outLat: item.latitude || '',
              outLng: item.longitude || '',
              workingHours,
              diffMs: diffMs > 0 ? diffMs : 0,
              rawDateForSort: inDateObj
            });

            currentIn = null;
          } else {
            reportArray.push({
              employee: empName,
              date: formatDateToDDMMYYYY(item.created_at),
              site: siteName,
              inTime: '-',
              outTime: new Date(item.created_at).toLocaleTimeString('en-US', timeOptions),
              inLat: '',
              inLng: '',
              outLat: item.latitude || '',
              outLng: item.longitude || '',
              workingHours: '-',
              diffMs: 0,
              rawDateForSort: new Date(item.created_at)
            });
          }
        }
      });

      if (currentIn) {
        reportArray.push({
          employee: empName,
          date: formatDateToDDMMYYYY(currentIn.created_at),
          site: siteName,
          inTime: new Date(currentIn.created_at).toLocaleTimeString('en-US', timeOptions),
          outTime: '-',
          inLat: currentIn.latitude || '',
          inLng: currentIn.longitude || '',
          outLat: '',
          outLng: '',
          workingHours: '-',
          diffMs: 0,
          rawDateForSort: new Date(currentIn.created_at)
        });
      }
    });

    reportArray.sort((a, b) => b.rawDateForSort - a.rawDateForSort);
    setProcessedReport(reportArray);
  };

  const calculateTotalWorkingHours = () => {
    let totalMs = processedReport.reduce((acc, row) => acc + (row.diffMs || 0), 0);
    const finalHrs = Math.floor(totalMs / (1000 * 60 * 60));
    const finalMins = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${finalHrs} hrs ${finalMins} mins`;
  };

  // 👈 નવું લોજીક: Total Working Days ગણવા માટે
  const calculateTotalWorkingDays = () => {
    const uniqueDates = new Set(processedReport.map(row => row.date));
    return uniqueDates.size;
  };

  const exportToExcel = () => {
    if (processedReport.length === 0) {
      alert("No data to export!");
      return;
    }

    let csvContent = `data:text/csv;charset=utf-8,Company: T&J Infra | Employee: ${selectedEmployee || 'All'} | Site: ${selectedSite || 'All'}\n`;
    csvContent += `Period: ${fromDate ? formatDateToDDMMYYYY(fromDate) : 'All'} to ${toDate ? formatDateToDDMMYYYY(toDate) : 'All'}\n\n`;
    csvContent += `Date,Employee,Site Name,Punch In,Punch Out,Working Hours,In Location,Out Location\n`;

    processedReport.forEach(row => {
      csvContent += `"${row.date}","${row.employee}","${row.site}","${row.inTime}","${row.outTime}","${row.workingHours}","${row.inLat}, ${row.inLng}","${row.outLat}, ${row.outLng}"\n`;
    });

    csvContent += `\n,,,,,,Total Working Hours: "${calculateTotalWorkingHours()}"\n`;
    csvContent += `,,,,,,Total Working Days: "${calculateTotalWorkingDays()} Days"\n`; // 👈 એક્સેલમાં પણ પ્રિન્ટ થશે

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_Report_${selectedEmployee || 'All'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setSelectedEmployee('');
    setSelectedSite('');
    setFromDate('');
    setToDate('');
  };

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Print Header (Only visible on print) */}
      <div className="print-header" style={{ display: 'none', textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', margin: '0 0 5px 0', color: '#000' }}>T&J Infra - Master Attendance Report</h1>
        <p style={{ fontSize: '12px', margin: 2, color: '#333' }}>
          <strong>Employee:</strong> {selectedEmployee || 'All'} | <strong>Site:</strong> {selectedSite || 'All'}
        </p>
        <p style={{ fontSize: '12px', margin: 2, color: '#333' }}>
          <strong>Period:</strong> {fromDate ? formatDateToDDMMYYYY(fromDate) : 'N/A'} to {toDate ? formatDateToDDMMYYYY(toDate) : 'N/A'}
        </p>
        <hr style={{ border: '0.5px solid #000', margin: '10px 0' }} />
      </div>

      {/* Modern Header & Back Button */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
        <button 
          onClick={() => window.history.back()}
          style={{
            padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', 
            background: '#ffffff', color: '#334155', fontWeight: '500', 
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', 
            fontSize: '13px', whiteSpace: 'nowrap', marginTop: '2px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          <ArrowLeft size={18} strokeWidth={2.5} /> Back
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 'bold' }}>
            <Users size={20} color="#2563eb" /> Master Reports
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
            સ્ટાફની હાજરી, લોકેશન અને રજાના રિપોર્ટ્સ મેનેજ કરો.
          </p>
        </div>
      </div>

      {/* 👈 નવા ઉમેરેલા TABS (Attendance vs Leave Requests) */}
      <div className="no-print" style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: '#ffffff', padding: '6px', borderRadius: '10px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
        <button 
          onClick={() => setActiveTab('attendance')}
          style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', whiteSpace: 'nowrap', transition: 'all 0.2s',
            background: activeTab === 'attendance' ? '#eff6ff' : 'transparent',
            color: activeTab === 'attendance' ? '#2563eb' : '#64748b'
          }}
        >
          <ClipboardList size={16} /> Attendance & GPS
        </button>
        <button 
          onClick={() => setActiveTab('leaves')}
          style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', whiteSpace: 'nowrap', transition: 'all 0.2s',
            background: activeTab === 'leaves' ? '#fdf4ff' : 'transparent',
            color: activeTab === 'leaves' ? '#a21caf' : '#64748b'
          }}
        >
          <CalendarDays size={16} /> Leave Requests
        </button>
      </div>

      {/* કન્ટેન્ટ રેન્ડરીંગ: જો Tab 1 સિલેક્ટ હોય તો રિપોર્ટ બતાવશે, નહીંતર રજાનું પેજ */}
      {activeTab === 'attendance' ? (
        <>
          {/* Action Bar (Export Buttons) */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '16px' }}>
            <button onClick={exportToExcel} style={{ padding: '8px 14px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 2px 4px rgba(22,163,74,0.2)' }}>
              <FileSpreadsheet size={16} /> Export Excel
            </button>
            <button onClick={() => window.print()} style={{ padding: '8px 14px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 2px 4px rgba(37,99,235,0.2)' }}>
              <FileText size={16} /> Print Report
            </button>
          </div>

  {/* Advanced Filter Section - New Design */}
          <div className="no-print" style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            
            {/* All Dates Checkbox */}
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="checkbox" 
                id="allDatesCheck"
                checked={isAllDates}
                onChange={(e) => {
                  setIsAllDates(e.target.checked);
                  if (e.target.checked) {
                    setFromDate('');
                    setToDate('');
                  }
                }}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
              />
              <label htmlFor="allDatesCheck" style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', cursor: 'pointer' }}>
                બધી તારીખનો ડેટા (All Dates)
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              
              {/* 👇 જો isAllDates ફોલ્સ (અનચેક) હોય, તો જ આ બે તારીખના બોક્સ દેખાશે (Hide/Show Logic) */}
              {!isAllDates && (
                <>
                  {/* From Date */}
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>From Date</label>
                    <input 
                      type="date" 
                      value={fromDate} 
                      onChange={(e) => { setFromDate(e.target.value); setIsAllDates(false); }} 
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#f8fafc', color: '#0f172a', boxSizing: 'border-box', outline: 'none' }} 
                    />
                  </div>

                  {/* To Date */}
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>To Date</label>
                    <input 
                      type="date" 
                      value={toDate} 
                      onChange={(e) => { setToDate(e.target.value); setIsAllDates(false); }} 
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#f8fafc', color: '#0f172a', boxSizing: 'border-box', outline: 'none' }} 
                    />
                  </div>
                </>
              )}

              {/* Employee ID */}
              <div>
                <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#f8fafc', color: '#0f172a', boxSizing: 'border-box', outline: 'none', cursor: 'pointer' }}>
                  <option value="">👥 બધા એમ્પ્લોયી (All)</option>
                  {employeeList.map((emp, idx) => (
                    <option key={idx} value={emp}>{emp}</option>
                  ))}
                </select>
              </div>

              {/* Site Name */}
              <div>
                <select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#f8fafc', color: '#0f172a', boxSizing: 'border-box', outline: 'none', cursor: 'pointer' }}>
                  <option value="">📍 બધી સાઈટ્સ (All)</option>
                  {siteList.map((site, idx) => (
                    <option key={idx} value={site}>{site}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Reset Button */}
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <button 
                onClick={() => { resetFilters(); setIsAllDates(false); }} 
                style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}>
                Reset Filters
              </button>
            </div>
          </div>

          

          {/* Attendance Summary Table */}
          <div style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', background: '#f8fafc' }} className="no-print">
              Attendance Records ({processedReport.length})
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', minWidth: '700px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#475569' }} className="report-th">
                    <th style={{ padding: '10px 12px' }}>Date</th>
                    <th style={{ padding: '10px 12px' }}>Employee</th>
                    <th style={{ padding: '10px 12px' }}>Site Name</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Punch In</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Punch Out</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Working Hours</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>GPS Location</th>
                  </tr>
                </thead>
                <tbody>
                  {processedReport.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>No records found.</td>
                    </tr>
                  ) : (
                    processedReport.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px 12px', color: '#334155', fontWeight: '600' }}>{row.date}</td>
                        <td style={{ padding: '10px 12px', fontWeight: '600', color: '#0f172a' }}>{row.employee}</td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>{row.site}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#16a34a', fontWeight: 'bold' }}>{row.inTime}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#dc2626', fontWeight: 'bold' }}>{row.outTime}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#2563eb', fontWeight: 'bold' }}>{row.workingHours}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                            {row.inLat && row.inLng ? (
                              <a href={`https://www.google.com/maps?q=${row.inLat},${row.inLng}`} target="_blank" rel="noopener noreferrer" style={{ color: '#059669', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}>
                                <MapPin size={12} /> In: {Number(row.inLat).toFixed(3)}, {Number(row.inLng).toFixed(3)}
                              </a>
                            ) : 'In: -'}

                            {row.outLat && row.outLng ? (
                              <a href={`https://www.google.com/maps?q=${row.outLat},${row.outLng}`} target="_blank" rel="noopener noreferrer" style={{ color: '#dc2626', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}>
                                <MapPin size={12} /> Out: {Number(row.outLat).toFixed(3)}, {Number(row.outLng).toFixed(3)}
                              </a>
                            ) : (row.outTime !== '-' ? 'Out GPS: -' : '')}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold', borderTop: '2px solid #cbd5e1' }} className="report-tf">
                    <td colSpan="5" style={{ padding: '12px', textAlign: 'right', color: '#1e293b' }}>Total Working Hours:</td>
                    <td colSpan="2" style={{ padding: '12px', textAlign: 'left', color: '#047857', fontSize: '13px' }}>
                      {calculateTotalWorkingHours()}
                    </td>
                  </tr>
                  
                  {/* 👈 નવું: Total Working Days પ્રિન્ટ કરવા માટે */}
                  <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }} className="report-tf">
                    <td colSpan="5" style={{ padding: '12px', textAlign: 'right', color: '#1e293b' }}>Total Working Days:</td>
                    <td colSpan="2" style={{ padding: '12px', textAlign: 'left', color: '#0284c7', fontSize: '13px' }}>
                      {calculateTotalWorkingDays()} Days
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* જો 'Leave Requests' ટેબ પસંદ કર્યું હોય તો AdminLeaveRequests કમ્પોનન્ટ બતાવશે */
        <div className="no-print">
          <AdminLeaveRequests />
        </div>
      )}

 {/* Print CSS */}
      <style>{`
        @media print {
          header, nav, aside, .no-print, [role="navigation"] { display: none !important; }
          
          /* 👈 Page Margin Set karyu jethi paper ni border thi cut na thay */
          @page { margin: 12mm; size: auto; }
          
          body { 
            background-color: #ffffff !important; 
            color: #000000 !important; 
            margin: 0 !important; 
            padding: 0 !important; 
          }
          
          .print-header { display: block !important; }
          
          /* 👈 Overflow Reset karyu jethi table aaju-baju thi cut na thay */
          div { 
            background-color: transparent !important; 
            box-shadow: none !important; 
            overflow: visible !important; 
            overflow-x: visible !important; 
          }
          
          /* 👈 Table width 100% fix kari jethi page ni andar fit rahe */
          table { 
            width: 100% !important; 
            min-width: 100% !important;
            border: 1px solid #000 !important; 
            table-layout: auto !important;
          }
          
          th, td { 
            border: 1px solid #ccc !important; 
            color: #000 !important; 
            padding: 6px 8px !important; 
            font-size: 11px !important;
            word-wrap: break-word !important;
            white-space: normal !important;
          }
          
          .report-th { background-color: #eee !important; -webkit-print-color-adjust: exact; }
          .report-tf { background-color: #f5f5f5 !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}

export default EmployeeReportPage;