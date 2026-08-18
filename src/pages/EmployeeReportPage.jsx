import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Filter, FileSpreadsheet, FileText } from 'lucide-react';

const DateFormatter = (dateStr) => {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
};

function EmployeeReportPage() {
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [processedReport, setProcessedReport] = useState([]);
  
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedSite, setSelectedSite] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
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

  const processWorkingHours = (logs) => {
    const grouped = {};
    
    logs.forEach(item => {
      if (!item.created_at) return;
      const dateKey = DateFormatter(item.created_at);
      const empKey = item.employee_name || 'Unknown';
      const uniqueKey = `${empKey}_${dateKey}_${item.site_name}`;

      if (!grouped[uniqueKey]) {
        grouped[uniqueKey] = {
          employee: empKey,
          date: dateKey,
          site: item.site_name,
          inTime: '-',
          outTime: '-',
          workingHours: '-'
        };
      }

      const timeStr = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (item.punch_type === 'IN') {
        grouped[uniqueKey].inTime = timeStr;
      } else if (item.punch_type === 'OUT') {
        grouped[uniqueKey].outTime = timeStr;
      }
    });

    const reportArray = Object.values(grouped).map(row => {
      if (row.inTime !== '-' && row.outTime !== '-') {
        const inDate = new Date(`${row.date} ${row.inTime}`);
        const outDate = new Date(`${row.date} ${row.outTime}`);
        const diffMs = outDate - inDate;
        if (diffMs > 0) {
          const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          row.workingHours = `${diffHrs} hrs ${diffMins} mins`;
        }
      }
      return row;
    });

    setProcessedReport(reportArray);
  };

  const calculateTotalWorkingHours = () => {
    let totalMinutes = processedReport.reduce((acc, row) => {
      if (row.workingHours !== '-') {
        const parts = row.workingHours.split(' ');
        const hrs = parseInt(parts[0]) || 0;
        const mins = parseInt(parts[2]) || 0;
        return acc + (hrs * 60) + mins;
      }
      return acc;
    }, 0);
    const finalHrs = Math.floor(totalMinutes / 60);
    const finalMins = totalMinutes % 60;
    return `${finalHrs} hrs ${finalMins} mins`;
  };

  const exportToExcel = () => {
    if (processedReport.length === 0) {
      alert("No data to export!");
      return;
    }

    let csvContent = `data:text/csv;charset=utf-8,Company: T&J Infra | Employee: ${selectedEmployee || 'All'} | Site: ${selectedSite || 'All'}\n`;
    csvContent += `Period: ${fromDate || 'All'} to ${toDate || 'All'}\n\n`;
    csvContent += `Date,Employee,Site Name,Punch In,Punch Out,Working Hours\n`;

    processedReport.forEach(row => {
      csvContent += `"${row.date}","${row.employee}","${row.site}","${row.inTime}","${row.outTime}","${row.workingHours}"\n`;
    });

    csvContent += `\n,,,,,Total Working Hours: "${calculateTotalWorkingHours()}"\n`;

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
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, sans-serif', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
      
      {/* Print Header */}
      <div className="print-header" style={{ display: 'none', textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', margin: '0 0 5px 0', color: '#000' }}>T&J Infra - Master Attendance Report</h1>
        <p style={{ fontSize: '12px', margin: 2, color: '#333' }}>
          <strong>Employee:</strong> {selectedEmployee || 'All'} | <strong>Site:</strong> {selectedSite || 'All'}
        </p>
        <p style={{ fontSize: '12px', margin: 2, color: '#333' }}>
          <strong>Period:</strong> {fromDate || 'N/A'} to {toDate || 'N/A'}
        </p>
        <hr style={{ border: '0.5px solid #000', margin: '10px 0' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }} className="no-print">
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
          👥 Master Employee & Attendance Report
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={exportToExcel} style={{ padding: '8px 12px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <FileSpreadsheet size={14} /> Export Excel
          </button>
          <button onClick={() => window.print()} style={{ padding: '8px 12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <FileText size={14} /> Export PDF / Print
          </button>
        </div>
      </div>

      {/* Advanced Filter Section */}
      <div className="no-print" style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Filter size={16} color="#2563eb" /> Advanced Filters:
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Employee ID / Email:</label>
            <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
              <option value="">-- All Employees --</option>
              {employeeList.map((emp, idx) => (
                <option key={idx} value={emp}>{emp}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Site Name:</label>
            <select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
              <option value="">-- All Sites --</option>
              {siteList.map((site, idx) => (
                <option key={idx} value={site}>{site}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>From Date:</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>To Date:</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
          </div>
        </div>

        <div style={{ marginTop: '12px', textAlign: 'right' }}>
          <button onClick={resetFilters} style={{ padding: '6px 12px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}>
            Reset Filters
          </button>
        </div>
      </div>

      {/* Attendance Summary Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }} className="no-print">
          Attendance Summary & Working Hours ({processedReport.length} Records)
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#475569' }} className="report-th">
                <th style={{ padding: '10px' }}>Date</th>
                <th style={{ padding: '10px' }}>Employee</th>
                <th style={{ padding: '10px' }}>Site Name</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Punch In</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Punch Out</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Working Hours</th>
              </tr>
            </thead>
            <tbody>
              {processedReport.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No records found.</td>
                </tr>
              ) : (
                processedReport.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px', color: '#334155' }}>{row.date}</td>
                    <td style={{ padding: '10px', fontWeight: '600', color: '#0f172a' }}>{row.employee}</td>
                    <td style={{ padding: '10px', color: '#47556px' }}>{row.site}</td>
                    <td style={{ padding: '10px', textAlign: 'center', color: '#166534', fontWeight: 'bold' }}>{row.inTime}</td>
                    <td style={{ padding: '10px', textAlign: 'center', color: '#991b1b', fontWeight: 'bold' }}>{row.outTime}</td>
                    <td style={{ padding: '10px', textAlign: 'center', color: '#2563eb', fontWeight: 'bold' }}>{row.workingHours}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold', borderTop: '2px solid #cbd5e1' }} className="report-tf">
                <td colSpan="5" style={{ padding: '12px', textAlign: 'right', color: '#1e293b' }}>Total Working Hours:</td>
                <td style={{ padding: '12px', textAlign: 'center', color: '#047857' }}>
                  {calculateTotalWorkingHours()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Print CSS to completely remove background colors and hide navigation/layout headers */}
      <style>{`
        @media print {
          /* App level navbar/sidebar hide કરવા માટે */
          header, nav, aside, .no-print, [role="navigation"] {
            display: none !important;
          }
          /* માત્ર રિપોર્ટ સેક્શન પ્રિન્ટ થાય તે માટે */
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-header {
            display: block !important;
          }
          div {
            background-color: transparent !important;
            box-shadow: none !important;
          }
          table {
            border: 1px solid #000 !important;
          }
          th, td {
            border: 1px solid #ccc !important;
            color: #000 !important;
          }
          .report-th {
            background-color: #eee !important;
            -webkit-print-color-adjust: exact;
          }
          .report-tf {
            background-color: #f5f5f5 !important;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}

export default EmployeeReportPage;