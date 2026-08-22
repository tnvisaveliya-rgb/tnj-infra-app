import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { login_id } = await req.json()
    console.log("-> Step 1: Request aavi Login ID mate:", login_id)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, recovery_email')
      .eq('login_id', login_id)
      .single()

    if (profileError || !profile) throw new Error('User aava Login ID sathe malyo nathi.')
    console.log("-> Step 2: Database mathi User malyo, Recovery Email:", profile.recovery_email)

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.id)
    if (authError) throw authError

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: authUser.user.email, 
    })
    if (linkError) throw linkError

    const resetLink = linkData.properties.action_link
    console.log("-> Step 3: Reset link generate thai gai.")

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    console.log("-> Step 4: Shu API Key maleli che?", resendApiKey ? "Haa, key che." : "NAHI, key missing che!")

    console.log("-> Step 5: Resend ne email moklva request kari rahya che...")
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev', 
        to: profile.recovery_email,
        subject: 'Tamaro Password Reset Karo',
        html: `<p>Tamaru ID: ${login_id}</p><p>Password reset karva ahi click karo: <a href="${resetLink}">Reset Password</a></p>`,
      }),
    })

    const resendData = await res.json()
    console.log("-> Step 6: Resend no JAVAB:", resendData)

    if (!res.ok) {
      throw new Error(`Resend Error: ${JSON.stringify(resendData)}`)
    }

    return new Response(JSON.stringify({ success: true, message: 'Recovery email moklai gayo!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("-> ERROR AAVI CHE:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})