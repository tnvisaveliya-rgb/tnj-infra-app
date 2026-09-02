import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { History, Camera, MapPin, Calendar, FileText, X, CalendarDays, Clock } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

function AttendancePage({ sites = [], user }) {
  const [attendanceSite, setAttendanceSite] = useState('');
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [history, setHistory] = useState([]);
  const [locationStatus, setLocationStatus] = useState('Fetching GPS...');
  const [currentStatus, setCurrentStatus] = useState('OUT');

  const [supervisorEmail, setSupervisorEmail] = useState('');
  const [fetchedSites, setFetchedSites] = useState([]);
  const [myLeaveRequests, setMyLeaveRequests] = useState([]); 
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showReportBox, setShowReportBox] = useState(false); // 👈 AA STATE ADD KARELI CHHE (Error solve karva mate)
  const [showReportPopup, setShowReportPopup] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [showLeaveBox, setShowLeaveBox] = useState(false);
  const [leaveFromDate, setLeaveFromDate] = useState('');
  const [leaveToDate, setLeaveToDate] = useState('');
  const [leaveType, setLeaveType] = useState('Personal'); // Default type
  const [leaveReason, setLeaveReason] = useState('');
  const [showMyLeaveStatusBox, setShowMyLeaveStatusBox] = useState(false);

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
      loadMyLeaves(supervisorEmail);
      checkLocation();
      loadSites(); 
    }
  }, [supervisorEmail]);

  const loadSites = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = user?.email || session?.user?.email || localStorage.getItem('userEmail') || '';
      const userId = user?.id || session?.user?.id;
      
      if (userEmail === 'infra.tnj@gmail.com') {
        const { data } = await supabase.from('sites').select('*');
        setFetchedSites(data || []);
        return;
      }

      let permQuery = supabase.from('user_permissions').select('assigned_sites');
      if (userId) {
        permQuery = permQuery.eq('user_id', userId);
      } else {
        permQuery = permQuery.eq('user_id', userEmail);
      }

      const { data: permData, error: permError } = await permQuery.single();

      if (permError || !permData || !permData.assigned_sites || permData.assigned_sites.length === 0) {
        setFetchedSites([]); 
        return;
      }

      const assignedSiteNames = permData.assigned_sites;
      const { data: siteData, error: siteError } = await supabase
        .from('sites')
        .select('*')
        .in('site_name', assignedSiteNames);

      if (!siteError && siteData) {
        setFetchedSites(siteData);
      } else {
        setFetchedSites([]);
      }
    } catch (err) {
      console.error('Error loading assigned sites:', err);
      setFetchedSites([]);
    }
  };

  const availableSites = (sites && sites.length > 0) ? sites : fetchedSites;

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
  const loadMyLeaves = async (email) => {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('employee_email', email)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setMyLeaveRequests(data);
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

    const ascendingData = [...filtered].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    let pairs = [];
    let currentIn = null;
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };

    const addPair = (inItem, outItem) => {
      const refItem = inItem || outItem;
      const rawDateStr = refItem.created_at;
      const dateKey = rawDateStr.split('T')[0];
      const displayDate = dateKey.split('-').reverse().join('/');

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

    ascendingData.forEach(item => {
      if (item.punch_type === 'IN') {
        if (currentIn) addPair(currentIn, null);
        currentIn = item;
      } else if (item.punch_type === 'OUT') {
        if (currentIn) {
          addPair(currentIn, item);
          currentIn = null;
        } else {
          addPair(null, item);
        }
      }
    });

    if (currentIn) addPair(currentIn, null);

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

      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;

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
        } catch (err) {
          console.error("Catch Error:", err);
          setModal({ isOpen: true, message: "કંઈક ભૂલ થઈ: " + err.message, onConfirm: () => setModal({ isOpen: false }) });
          setLoading(false);
        }
      }, (geoErr) => {
        setModal({ isOpen: true, message: "GPS લોકેશન એરર: " + geoErr.message, onConfirm: () => setModal({ isOpen: false }) });
        setLoading(false);
      });
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
const handleLeaveSubmit = async () => {
    if (!leaveFromDate || !leaveToDate || !leaveReason) {
      setModal({ isOpen: true, message: "⚠️ કૃપા કરીને તારીખ અને કારણ બંને ભરો!", onConfirm: () => setModal({ isOpen: false }) });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('leave_requests').insert([
        {
          employee_email: supervisorEmail,
          from_date: leaveFromDate,
          to_date: leaveToDate,
          leave_type: leaveType,
          reason: leaveReason,
          status: 'Pending'
        }
      ]);

      if (error) throw error;

      setModal({ 
        isOpen: true, 
        message: "✅ રજાની અરજી સફળતાપૂર્વક એડમિનને મોકલી દેવામાં આવી છે!", 
        onConfirm: () => {
          setModal({ isOpen: false });
          setLeaveFromDate('');
          setLeaveToDate('');
          setLeaveReason('');
          setShowLeaveBox(false);
        } 
      });
    } catch (err) {
      setModal({ isOpen: true, message: "એરર: " + err.message, onConfirm: () => setModal({ isOpen: false }) });
    } finally {
      setLoading(false);
    }
  };


  const formatDateToDDMMYYYY = (dateString) => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString; 
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '600px', margin: '0 auto', paddingBottom: '15px', backgroundColor: 'transparent' }}>
      
      {/* ========================================================================= */}
      {/* 1. STICKY CARDS (આ કાર્ડ્સ સ્ક્રોલ કરતી વખતે ઉપર ફ્રીઝ રહેશે) */}
      {/* ========================================================================= */}
      
      {/* --- CARD 1: TOP BANNER (Sticky) --- */}
      <div style={{ 
        position: 'sticky', 
        top: '65px', 
        zIndex: 50, 
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px', 
        padding: '16px 20px', 
        color: '#fff', 
        boxShadow: '0 8px 16px -3px rgba(15, 23, 42, 0.4)', 
        border: '1px solid rgba(255,255,255,0.1)',
        overflow: 'hidden',
      
      }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '90px', height: '90px', background: '#3b82f6', filter: 'blur(40px)', opacity: 0.4, borderRadius: '50%' }}></div>
        <div style={{ fontSize: '8px', letterSpacing: '1px', textTransform: 'uppercase', color: '#93c5fd', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
          ⚡ T&J INFRA PORTAL
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Camera size={20} color="#f8f9fa" /> Attendance
        </h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '8px', fontSize: '11px', color: '#d8dadc' }}>
          <span>{supervisorEmail}</span>
          <span style={{ fontWeight: '600', color: 'rgb(23, 173, 23)', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} />{locationStatus}</span>
        </div>
      </div>

      {/* --- CARD 2: SITE SELECTION (Sticky - બેનરની બરાબર નીચે ચોંટેલું રહેશે) --- */}
      <div style={{ 
        position: 'sticky', 
        top: '165px', // બેનરની અંદાજિત હાઈટ મુજબ
        zIndex: 40, 
        backgroundColor: '#ffffff', 
        borderRadius: '16px', 
        padding: '12px', 
        border: '1px solid #e2e8f0', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)', 
        marginTop: '-6px'
      }}>
        <select 
          value={attendanceSite} 
          onChange={handleSiteSelection} 
          disabled={currentStatus === 'IN'}
          style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: currentStatus === 'IN' ? '#f1f5f9' : '#fff', fontWeight: '500', outline: 'none' }}>
          <option value="">-- Select Site for Attendance --</option>
          {(availableSites || []).map(s => <option key={s.id} value={s.site_name}>{s.site_name}</option>)}
        </select>

        {currentStatus === 'IN' && (
          <p style={{ fontSize: '11px', color: '#dc2626', marginTop: '8px', marginBottom: 0, fontWeight: 'bold' }}>
            🔒 જ્યાં સુધી તમે Punch Out નહીં કરો, ત્યાં સુધી સાઇટ બદલી શકાશે નહીં.
          </p>
        )}
      </div>

      {/* --- CARD 3: CAMERA & PUNCH ACTIONS (Normal Card - સ્ક્રોલ થશે) --- */}
      <div style={{marginTop:'-6px', position: 'sticky',  top: '232px',  zIndex: 40,  backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
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
            onClick={(e) => {
              if (!attendanceSite) {
                e.preventDefault();
                setModal({ isOpen: true, message: "⚠️ કૃપા કરીને પહેલા સાઇટ સિલેક્ટ કરો!", onConfirm: () => setModal({ isOpen: false }) });
              }
            }}
            htmlFor={attendanceSite ? "selfieInput" : ""} 
            style={{ 
              display: 'block', 
              padding: '12px', 
              backgroundColor: attendanceSite ? '#2563eb' : '#94a3b8', 
              color: '#fff', 
              borderRadius: '10px', 
              cursor: attendanceSite ? 'pointer' : 'not-allowed', 
              fontSize: '13px', 
              fontWeight: 'bold',
              boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)' 
            }}>
            📸 Open Camera for Selfie
          </label>
          {photoPreview && (
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8fafc', padding: '8px', borderRadius: '8px' }}>
              <img src={photoPreview} alt="Selfie Preview" style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              <p style={{ fontSize: '11px', color: '#16a34a', margin: 0, fontWeight: 'bold' }}>Selfie Captured Successfully ✔</p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => handlePunch('IN')} disabled={loading || currentStatus === 'IN'} 
            style={{ flex: 1, backgroundColor: currentStatus === 'IN' ? '#94a3b8' : '#059669', color: '#fff', padding: '14px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: currentStatus === 'IN' ? 'not-allowed' : 'pointer', fontSize: '13px', boxShadow: currentStatus === 'IN' ? 'none' : '0 4px 10px rgba(5, 150, 105, 0.2)' }}>
            {loading ? 'Processing...' : (currentStatus === 'IN' ? 'Already In' : 'Punch In')}
          </button>
          <button onClick={() => handlePunch('OUT')} disabled={loading || currentStatus === 'OUT'} 
            style={{ flex: 1, backgroundColor: currentStatus === 'OUT' ? '#94a3b8' : '#dc2626', color: '#fff', padding: '14px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: currentStatus === 'OUT' ? 'not-allowed' : 'pointer', fontSize: '13px', boxShadow: currentStatus === 'OUT' ? 'none' : '0 4px 10px rgba(220, 38, 38, 0.2)' }}>
            {loading ? 'Processing...' : (currentStatus === 'OUT' ? 'Not In' : 'Punch Out')}
          </button>
        </div>
      </div>

      {/* --- CARD 4: ACTIONS (Report & Leave Request) --- */}
      <div style={{ marginTop: '-6px', backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
        <button 
          onClick={() => setShowReportBox(!showReportBox)} 
          style={{ width: '100%', padding: '12px 16px', backgroundColor: '#475569', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> Generate Attendance Report</span>
          <span>{showReportBox ? '▲' : '▼'}</span>
        </button>

        {showReportBox && (
          <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '8px' }}>Select Date Range:</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '110px' }}>
                <span style={{ fontSize: '10px', color: '#64748b' }}>From:</span>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px' }} />
              </div>
              <div style={{ flex: 1, minWidth: '110px' }}>
                <span style={{ fontSize: '10px', color: '#64748b' }}>To:</span>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px' }} />
              </div>
              <div style={{ width: '100%', textAlign: 'right', marginTop: '4px' }}>
                <button onClick={handleGenerateReport} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>
                  View Report
                </button>
              </div>
            </div>
          </div>
        )}

        <button 
          onClick={() => setShowLeaveBox(!showLeaveBox)} 
          style={{ width: '100%', padding: '12px 16px', backgroundColor: '#9333ea', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>📝 Request for Leave (રજા માટે અરજી)</span>
          <span>{showLeaveBox ? '▲' : '▼'}</span>
        </button>
{/* --- MY LEAVE REQUESTS STATUS TOGGLE BUTTON --- */}
      <button 
        onClick={() => setShowMyLeaveStatusBox(!showMyLeaveStatusBox)} 
        style={{ width: '100%', padding: '12px 16px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>📌 My Leave Requests Status (મારી રજાઓની સ્થિતિ)</span>
        <span>{showMyLeaveStatusBox ? '▲' : '▼'}</span>
      </button>

      {/* ટૉગલ ખુલે ત્યારે જ આ બોક્સ દેખાશે */}
      {showMyLeaveStatusBox && (
        <div style={{ backgroundColor: '#f0f9ff', borderRadius: '16px', padding: '14px', border: '1px solid #bae6fd', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#0369a1', marginBottom: '4px' }}>Your Leave Applications:</div>

          {myLeaveRequests.length === 0 ? (
            <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>કોઈ રજાની અરજી કરી નથી.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
              {myLeaveRequests.map((leave) => (
                <div key={leave.id} style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>📅 <strong>{leave.from_date}</strong> to <strong>{leave.to_date}</strong> ({leave.leave_type})</span>
                    <span style={{ 
                      fontWeight: 'bold', 
                      color: leave.status === 'Approved' ? '#059669' : leave.status === 'Partially Approved' ? '#2563eb' : leave.status === 'Rejected' ? '#dc2626' : '#d97706' 
                    }}>
                      {leave.status}
                    </span>
                  </div>
                  <div style={{ color: '#475569' }}>💬 Reason: {leave.reason}</div>
                  {leave.admin_remark && (
                    <div style={{ color: '#7c3aed', marginTop: '3px', fontWeight: '500' }}>
                      👑 Admin Remark: {leave.admin_remark} {leave.approved_from_date ? `(${leave.approved_from_date} to ${leave.approved_to_date})` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
        {showLeaveBox && (
          <div style={{ backgroundColor: '#faf5ff', padding: '12px', borderRadius: '10px', border: '1px solid #e9d5ff' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#581c87', marginBottom: '8px' }}>Apply for Leave:</div>
            
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ flex: 1, minWidth: '110px' }}>
                <span style={{ fontSize: '10px', color: '#6b21a8' }}>From Date:</span>
                <input type="date" value={leaveFromDate} onChange={(e) => setLeaveFromDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d8b4fe', fontSize: '11px' }} />
              </div>
              <div style={{ flex: 1, minWidth: '110px' }}>
                <span style={{ fontSize: '10px', color: '#6b21a8' }}>To Date:</span>
                <input type="date" value={leaveToDate} onChange={(e) => setLeaveToDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d8b4fe', fontSize: '11px' }} />
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '10px', color: '#6b21a8', display: 'block', marginBottom: '4px' }}>Leave Type:</span>
              <div style={{ display: 'flex', gap: '15px', fontSize: '11px', color: '#4c1d95', fontWeight: 'bold' }}>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input type="radio" name="leaveType" value="Personal" checked={leaveType === 'Personal'} onChange={(e) => setLeaveType(e.target.value)} /> Personal
                </label>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input type="radio" name="leaveType" value="Medical" checked={leaveType === 'Medical'} onChange={(e) => setLeaveType(e.target.value)} /> Medical
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <textarea 
                value={leaveReason} 
                onChange={(e) => setLeaveReason(e.target.value)} 
                placeholder="રજાનું કારણ લખો..." 
                rows="2"
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d8b4fe', fontSize: '11px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ textAlign: 'right' }}>
              <button 
                onClick={handleLeaveSubmit} 
                disabled={loading}
                style={{ padding: '8px 16px', backgroundColor: '#9333ea', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                {loading ? 'Submitting...' : 'Submit Leave'}
              </button>
            </div>
            </div>
         
        )}

      </div>

      {/* --- RECENT PUNCH HISTORY (Separate Cards) --- */}
      
      {/* ૧. બટન જેવા લુકવાળું હેડિંગ (આના પર ક્લિક નહીં થાય, માત્ર હેડિંગ તરીકે દેખાશે) */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ 
          position: 'sticky',
          top: '364px',
          width: '100%', 
          padding: '12px 16px', 
          backgroundColor: '#fff', // ડાર્ક સ્લેટ ગ્રે બટન કલર (તમે ઈચ્છો તો બદલી શકો છો)
        
          borderRadius: '10px', 
          fontSize: '12px', 
          fontWeight: 'bold', 
          display: 'flex', 
          alignItem: 'center', 
          justifyContent: 'space-between',
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          marginBottom: '6px',
          marginTop: '-28px'

        }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e293b' }}>
          <History size={16} color="#2563eb" /> Recent Punch History (Last {Math.min(history.length, 10)}):
        </h3>
            </div>
        {history.length === 0 ? (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>No records found.</p>
          </div>
        ) : (
          history.slice(0, 10).map(h => (
            <div key={h.id} style={{ 
              backgroundColor: '#ffffff', 
           
              borderRadius: '16px', 
              padding: '14px 16px', 
              border: '1px solid #e2e8f0', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ 
                    backgroundColor: h.punch_type === 'IN' ? '#dcfce7' : '#fee2e2', 
                    color: h.punch_type === 'IN' ? '#166534' : '#991b1b', 
                    padding: '3px 8px', 
                    borderRadius: '6px', 
                
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}>
                    {h.punch_type}
                  </span>
                  <strong style={{ color: '#1e293b', fontSize: '13px' }}>{h.site_name}</strong>
                </div>
                <div style={{ color: '#64748b', fontSize: '11px' }}>
                  👤 <span style={{ fontWeight: '600', color: '#475569' }}>{h.employee_name}</span>
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

      {/* --- REPORT POPUP MODAL --- */}
      {showReportPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', width: '90%', maxWidth: '650px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
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