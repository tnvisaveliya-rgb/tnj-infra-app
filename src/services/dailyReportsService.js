import { supabase } from '../lib/supabase'

const BUCKET_NAME = 'site-photos'

// Upload photo to Supabase Storage
export const uploadSitePhoto = async (file) => {
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
    console.error('Error uploading site photo:', error)
    throw new Error('Failed to upload photo: ' + error.message)
  }
}

// Delete photo from Supabase Storage
export const deleteSitePhoto = async (photoUrl) => {
  try {
    // Extract file path from URL
    const url = new URL(photoUrl)
    const pathParts = url.pathname.split('/')
    const filePath = pathParts[pathParts.length - 1]

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath])

    if (error) throw error
  } catch (error) {
    console.error('Error deleting site photo:', error)
    throw new Error('Failed to delete photo: ' + error.message)
  }
}

// Get all daily reports
export const getDailyReports = async () => {
  try {
    const { data, error } = await supabase
      .from('daily_reports')
      .select('*')
      .order('report_date', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching daily reports:', error)
    throw new Error('Failed to fetch reports: ' + error.message)
  }
}

// Get reports by user ID
export const getReportsByUser = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('user_id', userId)
      .order('report_date', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching user reports:', error)
    throw new Error('Failed to fetch user reports: ' + error.message)
  }
}

// Get reports by site name
export const getReportsBySite = async (siteName) => {
  try {
    const { data, error } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('site_name', siteName)
      .order('report_date', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching site reports:', error)
    throw new Error('Failed to fetch site reports: ' + error.message)
  }
}

// Add new daily report
export const addDailyReport = async (report) => {
  try {
    const { data, error } = await supabase
      .from('daily_reports')
      .insert([{
        site_name: report.siteName,
        work_description: report.workDescription,
        photo_url: report.photoUrl || null,
        report_date: report.reportDate || new Date().toISOString(),
        user_id: report.userId
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding daily report:', error)
    throw new Error('Failed to add report: ' + error.message)
  }
}

// Update daily report
export const updateDailyReport = async (id, report) => {
  try {
    const { data, error } = await supabase
      .from('daily_reports')
      .update({
        site_name: report.siteName,
        work_description: report.workDescription,
        photo_url: report.photoUrl || null,
        report_date: report.reportDate
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating daily report:', error)
    throw new Error('Failed to update report: ' + error.message)
  }
}

// Delete daily report
export const deleteDailyReport = async (id, photoUrl) => {
  try {
    // Delete photo file if exists
    if (photoUrl) {
      await deleteSitePhoto(photoUrl)
    }

    // Delete report record
    const { error } = await supabase
      .from('daily_reports')
      .delete()
      .eq('id', id)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting daily report:', error)
    throw new Error('Failed to delete report: ' + error.message)
  }
}

// Get reports by date range
export const getReportsByDateRange = async (startDate, endDate) => {
  try {
    const { data, error } = await supabase
      .from('daily_reports')
      .select('*')
      .gte('report_date', startDate)
      .lte('report_date', endDate)
      .order('report_date', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching reports by date range:', error)
    throw new Error('Failed to fetch reports: ' + error.message)
  }
}
