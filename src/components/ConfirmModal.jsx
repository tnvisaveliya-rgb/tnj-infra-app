import React from 'react';

const ConfirmModal = ({ isOpen, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', confirmColor = '#2563eb', cancelColor = '#e2e8f0', cancelTextColor = '#1e293b' }) => {
  if (!isOpen) return null;

  const parts = message ? message.split('"') : [];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', width: '90%', maxWidth: '350px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#1e293b' }}>Confirmation Required</h3>
        
        <p style={{ fontSize: '14px', marginBottom: '20px', color: '#475569' }}>
          {parts.length > 1 ? (
            <>
              {parts[0]}<strong style={{ color: '#0f172a', fontWeight: 'bold' }}>"{parts[1]}"</strong>{parts[2]}
            </>
          ) : (
            message
          )}
        </p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '6px', backgroundColor: cancelColor, color: cancelTextColor, cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
            {cancelText}
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '6px', backgroundColor: confirmColor, color: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;