import { supabase } from '../lib/supabase'

// 1. Get Leads
export async function getLeads() {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

// 2. Add Lead
export async function addLead(leadData) {
  const { data, error } = await supabase
    .from('leads')
    .insert([
      {
        client_name: leadData.clientName,
        phone: leadData.phone,
        email: leadData.email,
        status: leadData.status,
        notes: leadData.notes
      }
    ])
    .select() // 👈 અહીં પણ .select() ઉમેરી દેવું સારું રહે

  if (error) throw error
  return data
}

// 3. Update Lead
export async function updateLead(id, leadData) {
  const { data, error } = await supabase
    .from('leads')
    .update({
      client_name: leadData.clientName,
      phone: leadData.phone,
      email: leadData.email,
      status: leadData.status,
      notes: leadData.notes,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select() // 👈 ખાસ યાદ રાખીને આ .select() અહીં ઉમેરી દેવું!

  if (error) throw error
  return data
} 
// 4. Delete Lead
export async function deleteLead(id) {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}