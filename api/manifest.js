import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 1. Vercel na environment variables mathi Supabase URL & Key laviye
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 2. URL mathi Subdomain pakdo
  const host = req.headers.host || '';
  let subdomain = 'app'; // default
  
  const parts = host.split('.');
  if (parts.length >= 3 && parts[0] !== 'www') {
    subdomain = parts[0];
  }

  // 3. Supabase mathi logo ane company name fetch karo
  const { data } = await supabase
    .from('companies')
    .select('company_name, logo_url')
    .eq('subdomain', subdomain)
    .maybeSingle();

  // 4. Jo data na male to T&J Infra no default set thase
  const appName = data?.company_name || 'T&J Infra ERP';
  // Niche na fallback URL ma tamaro je default logo hoy eni public link nakhi dejo
  const appLogo = data?.logo_url || 'https://shreeinfra.tnjinfra.in/logo.png'; 

  // 5. Dynamic Manifest generate karo
  const manifest = {
    name: appName,
    short_name: appName,
    description: `${appName} Management Application`,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#dc2626", // Tamaro main brand color (Red)
    icons: [
      {
        src: appLogo,
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: appLogo,
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ]
  };

  // 6. JSON tarike moklo ane Cache set karo (jethi mobile ma juno logo na choti rey)
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  res.status(200).json(manifest);
}