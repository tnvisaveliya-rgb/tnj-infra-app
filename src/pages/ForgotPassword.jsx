import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function ForgotPassword() {
  const [loginId, setLoginId] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1); // Step 1: Send OTP, Step 2: Verify & Update
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  // Step 1: Send OTP Edge Function Call
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.functions.invoke('send-otp-reset', {
        body: { login_id: loginId }
      });

      if (error) throw error;

      setIsSuccess(true);
      setMessage('Success! 6 ank no OTP tamara email par mokli devama aaviyo chhe.');
      setStep(2); // Step 2 par javu

    } catch (err) {
      console.error("Error sending OTP:", err);
      setIsSuccess(false);
      setMessage('Bhul aavi: Aa Login ID chaltu nathi athva network error chhe.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and Update Password Edge Function Call
  const handleVerifyAndUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.functions.invoke('verify-otp-and-update', {
        body: { 
          login_id: loginId, 
          otp: otp, 
          new_password: newPassword 
        }
      });

      if (error) throw error;

      setIsSuccess(true);
      setMessage('Password successfully update thai gayo! Tame have nava password thi login kari shako cho.');
      
      // 3 second pachi login page par redirect karvu
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);

    } catch (err) {
      console.error("Error verifying OTP:", err);
      setIsSuccess(false);
      setMessage(err.message || 'Khoto OTP chhe athva expired thai gayo chhe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>TNJ Infra App</h2>
        <h3 style={styles.subtitle}>
          {step === 1 ? 'Forgot Password' : 'Verify OTP & Set New Password'}
        </h3>
        <p style={styles.description}>
          {step === 1 
            ? 'Tamaru Login ID nakho. Ame tamara email par 6 ank no OTP moklishu.' 
            : `Email par aavelo 6 ank no OTP ane navo password nakho (ID: ${loginId}).`}
        </p>

        {step === 1 ? (
          /* Step 1 Form: Login ID Input */
          <form onSubmit={handleSendOtp} style={styles.form}>
            <input
              type="text"
              placeholder="Tamaru Login ID nakho (Ex: admin123)"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
              style={styles.input}
              disabled={loading}
            />

            <button 
              type="submit" 
              style={styles.button} 
              disabled={loading}
            >
              {loading ? 'Sending OTP...' : 'OTP Moklo'}
            </button>
          </form>
        ) : (
          /* Step 2 Form: OTP & New Password Input */
          <form onSubmit={handleVerifyAndUpdate} style={styles.form}>
            <input
              type="text"
              placeholder="6 Ank no OTP nakho"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              maxLength={6}
              style={styles.input}
              disabled={loading}
            />

            <input
              type="password"
              placeholder="Navo Password (Min 6 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={styles.input}
              disabled={loading}
            />

            <button 
              type="submit" 
              style={styles.button} 
              disabled={loading}
            >
              {loading ? 'Updating Password...' : 'Password Update Karo'}
            </button>
          </form>
        )}

        {/* Status Message */}
        {message && (
          <div style={{
            ...styles.messageBox,
            backgroundColor: isSuccess ? '#d4edda' : '#f8d7da',
            color: isSuccess ? '#155724' : '#721c24'
          }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6' },
  card: { backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px', textAlign: 'center' },
  title: { margin: '0 0 10px 0', color: '#1f2937', fontSize: '24px' },
  subtitle: { margin: '0 0 15px 0', color: '#4b5563', fontSize: '18px' },
  description: { color: '#6b7280', fontSize: '14px', marginBottom: '20px', lineHeight: '1.5' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  input: { padding: '12px', fontSize: '16px', borderRadius: '4px', border: '1px solid #d1d5db', outline: 'none' },
  button: { padding: '12px', fontSize: '16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  messageBox: { marginTop: '20px', padding: '10px', borderRadius: '4px', fontSize: '14px' }
};