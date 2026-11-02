import QRCode from 'qrcode';
import {supabase} from './supabase.js';
import {createMembershipHandler} from '../../../supabase/functions/_shared/membership-handler.js';
const handle=createMembershipHandler(supabase,text=>QRCode.toDataURL(text,{width:320,margin:4,errorCorrectionLevel:'M'}));
export async function membershipWeb(req,res,next){
  try {
    const headers={};if(req.get('authorization'))headers.authorization=req.get('authorization');
    const request=new Request('https://bario.internal'+req.originalUrl,{method:req.method,headers,
      ...(['GET','HEAD'].includes(req.method)?{}:{body:JSON.stringify(req.body||{})})});
    const response=await handle(request);
    response.headers.forEach((value,key)=>res.set(key,value));
    res.status(response.status).send(await response.text());
  }catch(error){next(error);}
}
