import React, { useState } from 'react'

function AddPlantVendorPage() {
  const [plantVendorName, setPlantVendorName] = useState('')

  const handleAdd = () => {
    if (!plantVendorName) {
      alert("Please enter plant vendor name!")
      return
    }
    alert("Plant Vendor Added Successfully!")
    setPlantVendorName('')
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: '#0f172a' }}>🏭 Add Plant Vendor & Party</h2>
      
      <div style={{ display: 'flex', gap: '8px', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <input 
          placeholder="Enter Plant Vendor / Party Name" 
          value={plantVendorName} 
          onChange={(e) => setPlantVendorName(e.target.value)} 
          style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} 
        />
        <button 
          onClick={handleAdd} 
          style={{ backgroundColor: '#059669', color: '#fff', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
        >
          Add Plant Vendor
        </button>
      </div>
    </div>
  )
}

export default AddPlantVendorPage;