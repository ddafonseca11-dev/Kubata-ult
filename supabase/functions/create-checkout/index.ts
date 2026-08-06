import Stripe from 'npm:stripe@14.25.0';
import { createClient } from 'npm:@supabase/supabase-js@2.111.0';
const cors={ 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization, Apikey, X-Client-Info' };
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 try{
  const token=(req.headers.get('Authorization')||'').replace(/^Bearer\\s+/i,'');
  if(!token) return new Response(JSON.stringify({error:'Authentication required'}),{status:401,headers:{...cors,'Content-Type':'application/json'}});
  const url=Deno.env.get('SUPABASE_URL')!, anon=Deno.env.get('SUPABASE_ANON_KEY')!, secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, stripeKey=Deno.env.get('PAYMENT_SECRET_KEY'), appUrl=Deno.env.get('APP_URL');
  if(!stripeKey || !appUrl) return new Response(JSON.stringify({error:'Payment gateway not configured'}),{status:503,headers:{...cors,'Content-Type':'application/json'}});
  const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}}); const {data:{user},error:authError}=await auth.auth.getUser(token); if(authError||!user)return new Response(JSON.stringify({error:'Invalid session'}),{status:401,headers:{...cors,'Content-Type':'application/json'}});
  const body=await req.json(); const amount=Number(body.amount); const currency=String(body.currency||'eur').toLowerCase(); const description=String(body.description||'Kubata Kié'); const propertyId=body.property_id||null; const paymentType=body.payment_type||'listing';
  if(!Number.isFinite(amount)||amount<=0)return new Response(JSON.stringify({error:'Invalid amount'}),{status:400,headers:{...cors,'Content-Type':'application/json'}});
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}}); const {data:payment,error}=await db.from('payments').insert({user_id:user.id,property_id:propertyId,provider:'stripe',amount,currency:currency.toUpperCase(),status:'pending',payment_type:paymentType,description,metadata:{user_id:user.id,property_id:propertyId,payment_type:paymentType}}).select().single(); if(error)throw error;
  const stripe=new Stripe(stripeKey,{apiVersion:'2024-06-20'}); const origin=appUrl.replace(/\/$/,''); const session=await stripe.checkout.sessions.create({mode:'payment',line_items:[{price_data:{currency,product_data:{name:description},unit_amount:Math.round(amount*100)},quantity:1}],success_url:`${origin}/checkout?payment_id=${payment.id}&success=1`,cancel_url:`${origin}/checkout?payment_id=${payment.id}&cancelled=1`,metadata:{payment_id:payment.id,user_id:user.id,property_id:propertyId||'',payment_type:paymentType}});
  await db.from('payments').update({external_payment_id:session.id,checkout_url:session.url}).eq('id',payment.id); return new Response(JSON.stringify({checkout_url:session.url,payment_id:payment.id}),{status:200,headers:{...cors,'Content-Type':'application/json'}});
 }catch(e){console.error(e);return new Response(JSON.stringify({error:'Unable to create checkout'}),{status:500,headers:{...cors,'Content-Type':'application/json'}})}
});
