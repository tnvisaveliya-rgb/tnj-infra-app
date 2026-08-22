import React, { useState } from 'react';
import { supabase } from '../lib/supabase'

export default function ForgotPassword() {
  const [loginId, setLoginId] = useState('');
  const [status, setStatus] = useState('idle'); // status: 'idle', 'loading', 'success', 'error'
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      // Tamara banavela Supabase Edge Function ne call karo
      const { data, error } = await supabase.functions.invoke('send-custom-recovery', {
        body: { login_id: loginId }
      });

      if (error) {
        throw error;
      }

      // Jo badhu success thay
      setStatus('success');
      setMessage('Success! Tamara alternate email par password reset link mokli devama aavi che.');
      setLoginId(''); // Form clear karva

    } catch (err) {
      console.error("Error calling function:", err);
      setStatus('error');
      setMessage('Bhul aavi: Aa Login ID chaltu nathi athva system error che.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* T&J Infra nu naam ke logo ahi muki shako cho */}
        <h2 style={styles.title}>TNJ Infra App</h2>
        <h3 style={styles.subtitle}>Forgot Password</h3>
        <p style={styles.description}>
          Tamaru Login ID nakho. Ame tamara record ma set karela alternate email par recovery link moklishu.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            placeholder="Tamaru Login ID nakho (Ex: admin123)"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            required
            style={styles.input}
            disabled={status === 'loading'}
          />

          <button 
            type="submit" 
            style={styles.button} 
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Sending...' : 'Reset Link Moklo'}
          </button>
        </form>

        {/* Message batawa mate */}
        {message && (
          <div style={{
            ...styles.messageBox,
            backgroundColor: status === 'success' ? '#d4edda' : '#f8d7da',
            color: status === 'success' ? '#155724' : '#721c24'
          }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

// Basic CSS Styling (Tame Tailwind CSS vaparta hoy toh classNames use kari shako cho)
const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6' },
  card: { backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px', textAlign: 'center' },
  title: { margin: '0 0 10px 0', color: '#1f2937', fontSize: '24px' },
  subtitle: { margin: '0 0 15px 0', color: '#4b5563', fontSize: '18px' },
  description: { color: '#6b7280', fontSize: '14px', marginBottom: '20px', lineHeight: '1.5' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  input: { padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #d1d5db', outline: 'none' },
  button: { padding: '12px', fontSize: '16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  messageBox: { marginTop: '20px', padding: '10px', borderRadius: '4px', fontSize: '14px' }
};