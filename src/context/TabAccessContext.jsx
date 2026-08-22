import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const TabAccessContext = createContext(null)

export function TabAccessProvider({ children }) {
  const { user } = useAuth()
  const [allowedTabs, setAllowedTabs] = useState([])
  const [loading, setLoading] = useState(true)
  const userEmail = (user?.email || '').trim().toLowerCase()
  const isFetchingRef = useRef(false)

  const fetchUserTabs = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return
    }
    
    if (!user) {
      setAllowedTabs([])
      setLoading(false)
      return
    }

    isFetchingRef.current = true
    setLoading(true)

    // Admin gets all tabs
    if (userEmail === 'infra.tnj@gmail.com') {
      setAllowedTabs(['dashboard', 'crm', 'site_progress', 'plant_report', 'site_transaction', 'plant_transaction'])
      setLoading(false)
      isFetchingRef.current = false
      return
    }

    try {
      const { data, error } = await supabase
        .from('staff_details')
        .select('allowed_tabs')
        .eq('email', userEmail)
        .maybeSingle()
      
      if (error) {
        console.error('Error fetching allowed tabs:', error)
        setAllowedTabs([])
      } else if (data && data.allowed_tabs && Array.isArray(data.allowed_tabs)) {
        setAllowedTabs(data.allowed_tabs)
      } else {
        setAllowedTabs([])
      }
    } catch (err) {
      console.error('Error fetching allowed tabs:', err)
      setAllowedTabs([])
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [user, userEmail])

  // Initial fetch and refetch on auth state change
  useEffect(() => {
    fetchUserTabs()
  }, [fetchUserTabs])

  // Manual refetch function for post-update refresh
  const refetchTabs = useCallback(() => {
    fetchUserTabs()
  }, [fetchUserTabs])

  const hasTabAccess = useCallback((tabId) => {
    // Admin has access to all tabs
    if (userEmail === 'infra.tnj@gmail.com') {
      return true
    }
    return allowedTabs.includes(tabId)
  }, [userEmail, allowedTabs])

  const value = {
    allowedTabs,
    loading,
    hasTabAccess,
    refetchTabs
  }

  return <TabAccessContext.Provider value={value}>{children}</TabAccessContext.Provider>
}

export function useTabAccess() {
  const context = useContext(TabAccessContext)
  if (!context) {
    throw new Error('useTabAccess must be used within TabAccessProvider')
  }
  return context
}
