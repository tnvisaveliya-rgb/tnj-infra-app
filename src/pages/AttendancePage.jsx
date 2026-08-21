import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { History, Camera, MapPin, Calendar, FileText, X, CalendarDays, Clock } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

function AttendancePage({ sites, user }) {
  const [attendanceSite, setAttendanceSite] = useState('');
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [history, setHistory] = useState([]);
  const [locationStatus, setLocationStatus] = useState('Fetching GPS...');
  const [currentStatus, setCurrentStatus] = useState('OUT');

  const [supervisorEmail, setSupervisorEmail] = useState('');

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showReportPopup, setShowReportPopup] = useState(false);
  const [reportData, setReportData] = useState([]);

  // Modal State
  const [modal, setModal] = useState({ isOpen: false, message: '', onConfirm: null, onCancel: null });

  useEffect(() => {
    const getActiveUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const authEmail = session?.user?.email;
      const activeEmail = authEmail || user?.email || localStorage.getItem('userEmail') || localStorage.getItem('loggedInSupervisor') || '';
      
      if (activeEmail) {
        setSupervisorEmail(activeEmail.trim().toLowerCase());
      }
    };
    getActiveUser();
  }, [user]);

  useEffect(() => {
    if (supervisorEmail) {
      loadAttendanceHistory(supervisorEmail);
      checkLocation();
    }
  }, [supervisorEmail]);

  const checkLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocationStatus(`GPS Active (${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)})`),
        (err) => setLocationStatus('GPS Error: Please enable location')
      );
    } else {
      setLocationStatus('Geolocation not supported');
    }
  };

  const loadAttendanceHistory = async (email) => {
    let query = supabase
      .from('site_attendance')
      .select('*')
      .eq('employee_name', email)
      .order('created_at', { ascending: false });

    if (fromDate) query = query.gte('created_at', `${fromDate}T00:00:00`);
    if (toDate) query = query.lte('created_at', `${toDate}T23:59:59`);

    const { data, error } = await query;
    
    if (error) {
      console.error("Error loading history:", error.message);
    } else if (data && data.length > 0) {
      setHistory(data);
      
      if (!fromDate && !toDate) {
        const latestPunch = data[0].punch_type; 
        setCurrentStatus(latestPunch);
        if (latestPunch === 'IN') {
          setAttendanceSite(data[0].site_name);
        } else {
          setAttendanceSite(''); 
        }
      }
    } else {
      setHistory([]);
      setCurrentStatus('OUT');
      setAttendanceSite('');
    }
  };

  // MULTIPLE PUNCHES SUPPORT સાથે નવું REPORT LOGIC
  const handleGenerateReport = () => {
    if (!fromDate || !toDate) {
      setModal({ isOpen: true, message: "કૃપા કરીને 'From Date' અને 'To Date' બંને સિલેક્ટ કરો!", onConfirm: () => setModal({ isOpen: false }) });
      return;
    }

    const filtered = history.filter(item => {
      if (!item.created_at) return false;
      const itemDate = item.created_at.split('T')[0];
      return itemDate >= fromDate && itemDate <= toDate;
    });

    if (filtered.length === 0) {
      setModal({ isOpen: true, message: "આ તારીખની વચ્ચે કોઈ ડેટા મળ્યો નથી.", onConfirm: () => setModal({ isOpen: false }) });
      return;
    }

    // ૧. સમય પ્રમાણે જૂનાથી નવો ડેટા (Chronological Order) માં ગોઠવીએ
    const ascendingData = [...filtered].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    let pairs = [];
    let currentIn = null;
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };

    // જોડી (Pair) બનાવવાનું ફંક્શન
    const addPair = (inItem, outItem) => {
      const refItem = inItem || outItem;
      const rawDateStr = refItem.created_at;
      const dateKey = rawDateStr.split('T')[0];
      const displayDate = dateKey.split('-').reverse().join('/'); // DD/MM/YYYY

      let inTime = '-';
      let outTime = '-';
      let workingHours = '-';
      let diffMs = 0;

      if (inItem) inTime = new Date(inItem.created_at).toLocaleTimeString('en-US', timeOptions);
      if (outItem) outTime = new Date(outItem.created_at).toLocaleTimeString('en-US', timeOptions);

      if (inItem && outItem) {
        diffMs = new Date(outItem.created_at) - new Date(inItem.created_at);
        if (diffMs > 0) {
          const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          workingHours = `${diffHrs} hrs ${diffMins} mins`;
        }
      }

      pairs.push({
        displayDate,
        site: refItem.site_name,
        inTime,
        outTime,
        workingHours,
        diffMs,
        rawDateForSort: new Date(rawDateStr)
      });
    };

    // ૨. IN અને OUT ની જોડીઓ બનાવીએ (એક જ દિવસમાં બહુ બધા હોય તો પણ ચાલશે)
    ascendingData.forEach(item => {
      if (item.punch_type === 'IN') {
        if (currentIn) addPair(currentIn, null); // જો ભૂલથી બે વાર IN હોય
        currentIn = item;
      } else if (item.punch_type === 'OUT') {
        if (currentIn) {
          addPair(currentIn, item); // પરફેક્ટ જોડી (IN + OUT)
          currentIn = null;
        } else {
          addPair(null, item); // જો માત્ર OUT હોય (ભૂલથી)
        }
      }
    });

    // જો છેલ્લો માત્ર IN રહી ગયો હોય (હજી OUT ન કર્યું હોય)
    if (currentIn) addPair(currentIn, null);

    // ૩. નવી તારીખ ઉપર આવે તે રીતે ગોઠવો
    pairs.sort((a, b) => b.rawDateForSort - a.rawDateForSort);

    setReportData(pairs);
    setShowReportPopup(true);
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }

          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => { resolve(blob); }, 'image/jpeg', 0.7);
        };
      };
    });
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setLoading(true);
      const compressedBlob = await compressImage(file);
      const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
      setPhoto(compressedFile);
      setPhotoPreview(URL.createObjectURL(compressedBlob));
      setLoading(false);
    }
  };

  const handleSiteSelection = (e) => {
    const selectedSite = e.target.value;
    if (!selectedSite) {
      setAttendanceSite('');
      return;
    }
    
    setModal({
      isOpen: true,
      message: `શું તમે ખાતરી કરો છો કે તમે '${selectedSite}' સાઇટ પસંદ કરવા માંગો છો?`,
      onConfirm: () => {
        setAttendanceSite(selectedSite);
        setModal({ isOpen: false });
      },
      onCancel: () => {
        setModal({ isOpen: false });
      }
    });
  };

  const handlePunch = async (targetType) => {
    if (!attendanceSite) {
      setModal({ isOpen: true, message: "⚠️ કૃપા કરીને સાઇટ પસંદ કરો!", onConfirm: () => setModal({ isOpen: false }) });
      return;
    }
    if (!photo) {
      setModal({ isOpen: true, message: "📸 કૃપા કરીને સેલ્ફી લો!", onConfirm: () => setModal({ isOpen: false }) });
      return;
    }

    if (targetType === 'IN' && currentStatus === 'IN') {
      setModal({ isOpen: true, message: "⚠️ તમે પહેલેથી જ Punch In કરેલ છે! પહેલા Punch Out કરો.", onConfirm: () => setModal({ isOpen: false }) });
      return;
    }
    if (targetType === 'OUT' && currentStatus === 'OUT') {
      setModal({ isOpen: true, message: "⚠️ તમે પહેલાથી જ Punch Out કરેલ છે અથવા પંચ ઇન નથી કર્યું!", onConfirm: () => setModal({ isOpen: false }) });
      return;
    }

    const executePunch = async () => {
      const finalEmail = supervisorEmail || user?.email || localStorage.getItem('userEmail') || "infra.tnj@gmail.com";

      if (!finalEmail) {
        setModal({ isOpen: true, message: "એરર: યુઝરની ઓળખ થઈ શકી નથી. કૃપા કરીને ફરી લોગિન કરો.", onConfirm: () => setModal({ isOpen: false }) });
        return;
      }

      setLoading(true);
      try {
        const folderName = finalEmail.replace(/[^a-zA-Z0-9]/g, '_'); 
        const todayDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-'); 
        const fileName = `attendance/${folderName}/${targetType}_${todayDate}_${Date.now()}.jpg`;
        
        const { error: uploadError } = await supabase.storage.from('site-photos').upload(fileName, photo);
        
        let publicUrl = '';
        if (!uploadError) {
          const { data: pubData } = supabase.storage.from('site-photos').getPublicUrl(fileName);
          publicUrl = pubData.publicUrl;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;

          const payload = {
            employee_name: finalEmail, 
            site_name: attendanceSite,
            punch_type: targetType, 
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            photo_url: publicUrl,
            created_at: new Date().toISOString()
          };

          const { error: insertError } = await supabase.from('site_attendance').insert([payload]);

          if (insertError) {
            console.error("Supabase Insert Error:", insertError);
            setModal({ isOpen: true, message: "ડેટાબેઝ એરર: " + insertError.message, onConfirm: () => setModal({ isOpen: false }) });
          } else {
            setModal({ isOpen: true, message: `✅ Successfully Punched ${targetType}!`, onConfirm: () => setModal({ isOpen: false }) });
            setPhoto(null);
            setPhotoPreview(null);
            await loadAttendanceHistory(finalEmail); 
          }
          setLoading(false);
        }, (geoErr) => {
          setModal({ isOpen: true, message: "GPS લોકેશન એરર: " + geoErr.message, onConfirm: () => setModal({ isOpen: false }) });
          setLoading(false);
        });

      } catch (err) {
        console.error("Catch Error:", err);
        setModal({ isOpen: true, message: "કંઈક ભૂલ થઈ: " + err.message, onConfirm: () => setModal({ isOpen: false }) });
        setLoading(false);
      }
    };

    if (targetType === 'IN') {
      setModal({
        isOpen: true,
        message: `શું તમે ખાતરી કરો છો કે તમે '${attendanceSite}' સાઇટ પર જ હાજર છો?`,
        onConfirm: () => {
          setModal({ isOpen: false });
          executePunch();
        },
        onCancel: () => setModal({ isOpen: false })
      });
    } else {
      executePunch();
    }
  };

  const formatDateToDDMMYYYY = (dateString) => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Camera size={20} color="#2563eb" /> GPS & Selfie Attendance ({supervisorEmail})
      </h2>
      
      <div style={{ fontSize: '11px', color: '#059669', backgroundColor: '#ecfdf5', padding: '6px 10px', borderRadius: '6px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <MapPin size={14} /> {locationStatus}
      </div>

      <select 
        value={attendanceSite} 
        onChange={handleSiteSelection} 
        disabled={currentStatus === 'IN'}
        style={{ width: '100%', padding: '10px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: currentStatus === 'IN' ? '#f1f5f9' : '#fff' }}>
        <option value="">-- Select Site --</option>
        {sites.map(s => <option key={s.id} value={s.site_name}>{s.site_name}</option>)}
      </select>

      {currentStatus === 'IN' && (
        <p style={{ fontSize: '11px', color: '#dc2626', marginBottom: '10px', fontWeight: 'bold' }}>
          🔒 જ્યાં સુધી તમે Punch Out નહીં કરો, ત્યાં સુધી સાઇટ બદલી શકાશે નહીં.
        </p>
      )}

      <div style={{ marginBottom: '15px', textAlign: 'center' }}>
        <input 
          type="file" 
          accept="image/*" 
          capture="user" 
          id="selfieInput" 
          onChange={handlePhotoChange} 
          style={{ display: 'none' }} 
        />
        <label 
          htmlFor="selfieInput" 
          style={{ 
            display: 'block', 
            padding: '12px', 
            backgroundColor: '#2563eb', 
            color: '#fff', 
            borderRadius: '8px', 
            cursor: 'pointer', 
            fontSize: '13px', 
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
          }}>
          📸 Open Camera for Selfie
        </label>
        {photoPreview && (
          <div style={{ marginTop: '10px' }}>
            <img src={photoPreview} alt="Selfie Preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            <p style={{ fontSize: '10px', color: '#16a34a', margin: '2px 0 0 0' }}>Selfie Captured Successfully</p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => handlePunch('IN')} disabled={loading || currentStatus === 'IN'} 
          style={{ flex: 1, backgroundColor: currentStatus === 'IN' ? '#94a3b8' : '#059669', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: currentStatus === 'IN' ? 'not-allowed' : 'pointer', fontSize: '13px' }}>
          {loading ? 'Processing...' : (currentStatus === 'IN' ? 'Already In' : 'Punch In')}
        </button>
        <button onClick={() => handlePunch('OUT')} disabled={loading || currentStatus === 'OUT'} 
          style={{ flex: 1, backgroundColor: currentStatus === 'OUT' ? '#94a3b8' : '#dc2626', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: currentStatus === 'OUT' ? 'not-allowed' : 'pointer', fontSize: '13px' }}>
          {loading ? 'Processing...' : (currentStatus === 'OUT' ? 'Not In' : 'Punch Out')}
        </button>
      </div>

      <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Calendar size={14} /> Generate Attendance Report (Date to Date):
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '110px' }}>
            <span style={{ fontSize: '10px', color: '#64748b' }}>From:</span>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px' }} />
          </div>
          <div style={{ flex: 1, minWidth: '110px' }}>
            <span style={{ fontSize: '10px', color: '#64748b' }}>To:</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px' }} />
          </div>
          <div>
            <button onClick={handleGenerateReport} style={{ padding: '8px 14px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold', marginTop: '14px' }}>
              View Report
            </button>
          </div>
        </div>
      </div>

      {showReportPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', width: '90%', maxWidth: '650px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '15px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={18} color="#2563eb" /> Attendance Report ({supervisorEmail})
              </h3>
              <button onClick={() => setShowReportPopup(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Period: <strong>{formatDateToDDMMYYYY(fromDate)}</strong> to <strong>{formatDateToDDMMYYYY(toDate)}</strong></span>
              <button onClick={() => window.print()} style={{ padding: '4px 10px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>
                📥 Download PDF / Print
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Site</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Punch In</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Punch Out</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Working Hours</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontWeight: '600', color: '#0f172a' }}>{row.displayDate}</td>
                    <td style={{ padding: '8px', fontWeight: '600' }}>{row.site}</td>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#166534', fontWeight: 'bold' }}>{row.inTime}</td>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#991b1b', fontWeight: 'bold' }}>{row.outTime}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: '#2563eb' }}>{row.workingHours}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold', borderTop: '2px solid #cbd5e1' }}>
                  <td colSpan="4" style={{ padding: '10px', textAlign: 'right' }}>Total Working Hours:</td>
                  <td style={{ padding: '10px', textAlign: 'center', color: '#047857' }}>
                    {(() => {
                      let totalMs = reportData.reduce((acc, row) => acc + (row.diffMs || 0), 0);
                      const finalHrs = Math.floor(totalMs / (1000 * 60 * 60));
                      const finalMins = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
                      return `${finalHrs} hrs ${finalMins} mins`;
                    })()}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div style={{ textAlign: 'right', marginTop: '20px' }}>
              <button onClick={() => setShowReportPopup(false)} style={{ padding: '8px 16px', backgroundColor: '#475569', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
        <h3 style={{ fontSize: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <History size={16} /> Recent Punch History (Last {Math.min(history.length, 10)}):
        </h3>
        {history.length === 0 ? (
          <p style={{ fontSize: '12px', color: '#64748b' }}>No records found.</p>
        ) : (
          history.slice(0, 10).map(h => (
            <div key={h.id} style={{ fontSize: '11px', padding: '10px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                  <span style={{ 
                    backgroundColor: h.punch_type === 'IN' ? '#dcfce7' : '#fee2e2', 
                    color: h.punch_type === 'IN' ? '#166534' : '#991b1b', 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    fontWeight: 'bold'
                  }}>
                    {h.punch_type}
                  </span>
                  <strong style={{ color: '#1e293b' }}>{h.site_name}</strong>
                </div>
                <div style={{ color: '#64748b', fontSize: '10px' }}>
                  👤 ID/Email: <span style={{ fontWeight: '600', color: '#475569' }}>{h.employee_name}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '11px' }}>
                  <CalendarDays size={12} color="#64748b" />
                  <span>{h.created_at ? new Date(h.created_at).toLocaleDateString('en-GB') : 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700', color: '#0f172a', fontSize: '12px' }}>
                  <Clock size={12} color="#2563eb" />
                  <span>
                    {h.created_at ? new Date(h.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal 
        isOpen={modal.isOpen} 
        message={modal.message} 
        onConfirm={modal.onConfirm || (() => setModal({ isOpen: false }))} 
        onCancel={modal.onCancel || (() => setModal({ isOpen: false }))} 
      />
    </div>
  );
}

export default AttendancePage;