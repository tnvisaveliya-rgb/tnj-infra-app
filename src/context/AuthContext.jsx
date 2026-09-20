import React, { createContext, useContext, useState, useEffect } from 'react'
  import { supabase } from '../lib/supabase'

  const AuthContext = createContext(null)

  export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [userPermissions, setUserPermissions] = useState(null)

    // 🌟 પરમિશન ફેચ કરવાનું સેફ ફંક્શન
    const fetchUserPermissions = async (currentUser) => {
      try {
        if (!currentUser) {
          setUserPermissions({ assigned_plants: [], assigned_sites: [], allowed_tabs: [] });
          return;
        }

        const userEmail = (currentUser?.email || '').trim().toLowerCase();
        
        // જો એડમિન હોય તો ડાયરેક્ટ પરમિશન
        if (userEmail === 'infra.tnj@gmail.com') {
          setUserPermissions({
            assigned_plants: ['All'],
            assigned_sites: ['All'],
            allowed_tabs: ['dashboard', 'crm', 'site_progress', 'plant_report', 'employee_dashboard']
          });
          return;
        }

        // ડેટાબેઝમાંથી ઈમેલ અથવા યુઝર આઈડીથી પરમિશન લાવવી
        const { data, error } = await supabase
          .from('user_permissions')
          .select('*')
          .or(`user_id.eq.${currentUser.id},email.eq.${userEmail}`)
          .maybeSingle();

        if (!error && data) {
          setUserPermissions(data);
        } else {
          setUserPermissions({ assigned_plants: [], assigned_sites: [], allowed_tabs: [] });
        }
      } catch (err) {
        setUserPermissions({ assigned_plants: [], assigned_sites: [], allowed_tabs: [] });
      }
    };

    useEffect(() => {
      // Check active session on mount
      supabase.auth.getSession().then(({ data: { session } }) => {
        const activeUser = session?.user ?? null;
        setUser(activeUser);
        if (activeUser) {
          fetchUserPermissions(activeUser); // 🌟 અહીં પરમિશન ફેચ કરો
        }
        setLoading(false);
      });

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        const activeUser = session?.user ?? null;
        setUser(activeUser);
        if (activeUser) {
          fetchUserPermissions(activeUser); // 🌟 અહીં પણ પરમિશન ફેચ કરો
        } else {
          setUserPermissions(null);
        }
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    }, [])

    const logout = async () => {
      await supabase.auth.signOut();
      setUserPermissions(null);
    }

    const value = {
      user,
      loading,
      userPermissions,
      logout,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  }

  export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
      throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
  }