import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import QRCode from 'npm:qrcode@1.5.4';
import {createMembershipHandler} from '../_shared/membership-handler.js';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(createMembershipHandler(db,text=>QRCode.toDataURL(text,{width:320,margin:4,errorCorrectionLevel:'M'})));
