import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // CORS headers setup
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers });

  try {
    const { company_name, gstin, logo_url, admin_email, admin_password } = await req.json();

    // Admin client banavo (Service Role key use karine)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Company Table ma entry karo
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert([{ company_name, gstin, logo_url, email: admin_email }])
      .select()
      .single();

    if (companyError) throw companyError;

    // 2. Navo User (Company Admin) banavo
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: admin_email,
      password: admin_password,
      email_confirm: true
    });

    if (authError) throw authError;

    // 3. User Profile ma company_id ane role 'admin' set karo
    // (Jo database ma auth trigger thi profile auto-create thati hoy, to ahia khali update karvanu che)
    await supabaseAdmin
      .from('user_profiles')
      .update({ company_id: company.id, role: 'admin' })
      .eq('id', authData.user.id);

    return new Response(JSON.stringify({ success: true, company }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers, status: 400 });
  }
})