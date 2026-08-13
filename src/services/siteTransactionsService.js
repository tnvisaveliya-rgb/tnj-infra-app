import { supabase } from '../lib/supabase'

const BUCKET_NAME = 'receipts'

// Upload file to Supabase Storage
export const uploadReceipt = async (file) => {
  try {
    // Generate unique filename: timestamp-randomString.extension
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`
    const filePath = `${fileName}`

    // Upload file to storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)

    return publicUrl
  } catch (error) {
    console.error('Error uploading receipt:', error)
    throw new Error('Failed to upload receipt: ' + error.message)
  }
}

// Delete file from Supabase Storage
export const deleteReceipt = async (receiptUrl) => {
  try {
    // Extract file path from URL
    const url = new URL(receiptUrl)
    const pathParts = url.pathname.split('/')
    const filePath = pathParts[pathParts.length - 1]

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath])

    if (error) throw error
  } catch (error) {
    console.error('Error deleting receipt:', error)
    throw new Error('Failed to delete receipt: ' + error.message)
  }
}

// Get all site transactions
export const getSiteTransactions = async () => {
  try {
    const { data, error } = await supabase
      .from('site_transactions')
      .select('*')
      .order('transaction_date', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching transactions:', error)
    throw new Error('Failed to fetch transactions: ' + error.message)
  }
}

// Get transactions by site ID
export const getTransactionsBySite = async (siteId) => {
  try {
    const { data, error } = await supabase
      .from('site_transactions')
      .select('*')
      .eq('site_id', siteId)
      .order('transaction_date', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching site transactions:', error)
    throw new Error('Failed to fetch site transactions: ' + error.message)
  }
}

// Get transactions by type (expense/income)
export const getTransactionsByType = async (type) => {
  try {
    const { data, error } = await supabase
      .from('site_transactions')
      .select('*')
      .eq('transaction_type', type)
      .order('transaction_date', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching transactions by type:', error)
    throw new Error('Failed to fetch transactions: ' + error.message)
  }
}

// Add new transaction
export const addTransaction = async (transaction) => {
  try {
    const { data, error } = await supabase
      .from('site_transactions')
      .insert([{
        site_id: transaction.siteId,
        transaction_type: transaction.type,
        amount: parseFloat(transaction.amount),
        category: transaction.category,
        description: transaction.description,
        receipt_url: transaction.receiptUrl || null,
        transaction_date: transaction.transactionDate || new Date().toISOString(),
        created_by: transaction.createdBy
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding transaction:', error)
    throw new Error('Failed to add transaction: ' + error.message)
  }
}

// Update transaction
export const updateTransaction = async (id, transaction) => {
  try {
    const { data, error } = await supabase
      .from('site_transactions')
      .update({
        site_id: transaction.siteId,
        transaction_type: transaction.type,
        amount: parseFloat(transaction.amount),
        category: transaction.category,
        description: transaction.description,
        receipt_url: transaction.receiptUrl || null,
        transaction_date: transaction.transactionDate
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating transaction:', error)
    throw new Error('Failed to update transaction: ' + error.message)
  }
}

// Delete transaction
export const deleteTransaction = async (id, receiptUrl) => {
  try {
    // Delete receipt file if exists
    if (receiptUrl) {
      await deleteReceipt(receiptUrl)
    }

    // Delete transaction record
    const { error } = await supabase
      .from('site_transactions')
      .delete()
      .eq('id', id)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting transaction:', error)
    throw new Error('Failed to delete transaction: ' + error.message)
  }
}

// Get transaction summary by type
export const getTransactionSummary = async () => {
  try {
    const { data, error } = await supabase
      .from('site_transactions')
      .select('transaction_type, amount')

    if (error) throw error

    const summary = {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0
    }

    data.forEach(transaction => {
      const amount = parseFloat(transaction.amount)
      if (transaction.transaction_type === 'income') {
        summary.totalIncome += amount
      } else {
        summary.totalExpense += amount
      }
    })

    summary.balance = summary.totalIncome - summary.totalExpense
    return summary
  } catch (error) {
    console.error('Error fetching transaction summary:', error)
    throw new Error('Failed to fetch summary: ' + error.message)
  }
}
