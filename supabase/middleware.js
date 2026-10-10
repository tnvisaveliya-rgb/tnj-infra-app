import { NextResponse } from 'next/server';

export const config = {
  matcher: ['/:path*'],
};

export async function middleware(req) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';
  
  // 1. Subdomain extract karo
  const parts = hostname.split('.');
  let subdomain = 'app';
  
  if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'tnjinfra') {
    subdomain = parts[0];
  } else {
    return NextResponse.next();
  }

  // 2. Supabase credentials env mathi get karo
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || process.env.SUPABASE_URL;
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next();
  }

  try {
    // 3. Companies table mathi te subdomain no data fetch karo
    const res = await fetch(`${supabaseUrl}/rest/v1/companies?subdomain=eq.${subdomain}&select=company_name,logo_url`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    const data = await res.json();
    
    if (data && data.length > 0) {
      const company = data[0];
      const response = await fetch(url);
      
      // 4. HTMLRewriter thi HTML na meta tags dynamic update karo
      return new HTMLRewriter()
        .on('title', {
          element(element) {
            element.setInnerContent(`${company.company_name} - ERP Portal`);
          }
        })
        .on('meta[property="og:title"]', {
          element(element) {
            element.setAttribute('content', `${company.company_name} ERP System`);
          }
        })
        .on('meta[property="og:image"]', {
          element(element) {
            if (company.logo_url) {
              element.setAttribute('content', company.logo_url);
            }
          }
        })
        .transform(response);
    }
  } catch (err) {
    console.error("Middleware error:", err);
  }

  return NextResponse.next();
}