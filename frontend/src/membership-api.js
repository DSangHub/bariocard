import {createClient} from '@supabase/supabase-js';
export const RECOVERY_MODE=typeof window!=='undefined' && new URLSearchParams(window.location.hash.slice(1)).get('type')==='recovery';
// Public project configuration only. The server secret is never bundled here.
export const auth=createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://goybkvgbbomkkrsnouyx.supabase.co',
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_pz0iwBx1NYQMec4te5Tbdw_bKisH14P'
);
export const API_BASE=import.meta.env.VITE_API_URL || 'https://goybkvgbbomkkrsnouyx.supabase.co/functions/v1/bario-membership';
export async function apiFetch(path,options={}) {
  const {data:{session}}=await auth.auth.getSession();
  if(!session) throw new Error('Sign in to continue.');
  const response=await fetch(API_BASE+'/api/v1/'+path,{
    ...options,headers:{'Content-Type':'application/json',...options.headers,Authorization:'Bearer '+session.access_token},cache:'no-store'
  });
  let data;
  try { data=await response.json(); }
  catch { throw new Error('Membership service is unavailable. Please try again later.'); }
  if(!response.ok) { const error=new Error(data.error || 'Unable to complete your request.'); error.status=response.status; throw error; }
  return data;
}
