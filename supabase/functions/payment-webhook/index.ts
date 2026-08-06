import Stripe from 'npm:stripe@14.25.0';
import { createClient } from 'npm:@supabase/supabase-js@2.111.0';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, Stripe-Signature' };
const STATUS: Record<string,string> = { succeeded:'completed', paid:'completed', completed:'completed', pending:'pending', processing:'processing', failed:'failed', canceled:'cancelled', cancelled:'cancelled', refunded:'refunded' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null,{status:204,headers:corsHeaders});
  if (req.method !== 'POST') return new Response(JSON.stringify({error:'Method not allowed'}),{status:405,headers:{...corsHeaders,'Content-Type':'application/json'}});
  try {
    const url=Deno.env.get('SUPABASE_URL')!; const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; const provider=(Deno.env.get('PAYMENT_PROVIDER')||'stripe').toLowerCase();
    const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}); const raw=await req.text(); let event:any;
    if(provider==='stripe'){
      const secret=Deno.env.get('PAYMENT_SECRET_KEY'); const webhookSecret=Deno.env.get('PAYMENT_WEBHOOK_SECRET'); const signature=req.headers.get('stripe-signature');
      if(!secret||!webhookSecret||!signature) return new Response(JSON.stringify({error:'Webhook configuration incomplete'}),{status:500,headers:{...corsHeaders,'Content-Type':'application/json'}});
      const stripe=new Stripe(secret,{apiVersion:'2024-06-20'});
      try{ event=stripe.webhooks.constructEvent(raw,signature,webhookSecret); }catch{ return new Response(JSON.stringify({error:'Invalid signature'}),{status:400,headers:{...corsHeaders,'Content-Type':'application/json'}}); }
    }else{
      try{event=JSON.parse(raw)}catch{return new Response(JSON.stringify({error:'Invalid payload'}),{status:400,headers:{...corsHeaders,'Content-Type':'application/json'}})}
    }
    const object=event?.data?.object ?? event; const externalId=String(object?.id||event?.id||''); if(!externalId) return new Response(JSON.stringify({error:'Missing payment ID'}),{status:400,headers:{...corsHeaders,'Content-Type':'application/json'}});
    const rawStatus=String(object?.status||object?.payment_status||event?.status||'pending').toLowerCase(); const mapped=STATUS[rawStatus]||'pending';
    const amount=((object?.amount_total??object?.amount??event?.amount??0) as number)/100; const currency=String(object?.currency||event?.currency||'eur').toUpperCase();
    const metadata=object?.metadata||{};
    const {data:existing}=await db.from('payments').select('id,status').eq('provider',provider).eq('external_payment_id',externalId).maybeSingle();
    if(existing){
      if(existing.status===mapped) return new Response(JSON.stringify({received:true,duplicate:true}),{status:200,headers:{...corsHeaders,'Content-Type':'application/json'}});
      await db.from('payments').update({status:mapped,metadata:{...metadata,webhook_event_id:event?.id||null,webhook_received_at:new Date().toISOString()}}).eq('id',existing.id);
      if(mapped==='completed') await activateBenefit(db,existing.id);
      return new Response(JSON.stringify({received:true,updated:true}),{status:200,headers:{...corsHeaders,'Content-Type':'application/json'}});
    }
    const {data:payment,error}=await db.from('payments').insert({provider,external_payment_id:externalId,amount,currency,status:mapped,payment_type:metadata.payment_type||'listing',description:object?.description||null,user_id:metadata.user_id||null,property_id:metadata.property_id||null,metadata:{...metadata,webhook_event_id:event?.id||null,webhook_received_at:new Date().toISOString()}}).select().single();
    if(error) throw error; if(mapped==='completed') await activateBenefit(db,payment.id);
    return new Response(JSON.stringify({received:true,created:true}),{status:200,headers:{...corsHeaders,'Content-Type':'application/json'}});
  }catch(e){console.error(e);return new Response(JSON.stringify({error:'Internal server error'}),{status:500,headers:{...corsHeaders,'Content-Type':'application/json'}})}
});
async function activateBenefit(db:any,id:string){const {data:p}=await db.from('payments').select('id,user_id,property_id,payment_type').eq('id',id).maybeSingle();if(!p)return;if(p.payment_type==='featured'&&p.property_id)await db.from('properties').update({is_featured:true}).eq('id',p.property_id);if(p.user_id)await db.from('notifications').insert({user_id:p.user_id,type:'payment_completed',title:'Pagamento confirmado',body:'O teu pagamento foi confirmado com sucesso.',link:'/dashboard',data:{payment_id:id}});await db.from('analytics_events').insert({event_name:'PAYMENT_COMPLETED',user_id:p.user_id,property_id:p.property_id,metadata:{payment_id:id}})}
