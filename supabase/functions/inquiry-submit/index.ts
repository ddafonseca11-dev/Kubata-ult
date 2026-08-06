import { createClient } from 'npm:@supabase/supabase-js@2.111.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MINUTES = 10;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      property_id,
      user_id,
      name,
      email,
      phone,
      message,
      inquiry_type,
      captcha_token,
    } = body;

    if (!message || !message.trim()) {
      return new Response(
        JSON.stringify({ error: 'Mensagem é obrigatória.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role for rate limit checks
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Also create anon client for inserting inquiry (respects RLS)
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Determine authenticated identity from the bearer token; never trust user_id from JSON.
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    let authenticatedUserId: string | null = null;
    if (token) {
      const { data: authData } = await anonClient.auth.getUser(token);
      authenticatedUserId = authData.user?.id ?? null;
    }

    const effectiveUserId = authenticatedUserId;
    let identifier: string;
    let identifierType: 'user_id' | 'ip' | 'session';

    if (effectiveUserId) {
      identifier = effectiveUserId;
      identifierType = 'user_id';
    } else {
      // Try to get IP from headers
      const forwarded = req.headers.get('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0].trim() : null;
      identifier = ip || 'anonymous';
      identifierType = ip ? 'ip' : 'session';
    }

    // Atomic rate-limit reservation.
    const { data: allowedBeforeInsert, error: limitError } = await supabase.rpc('consume_inquiry_rate_limit', { p_identifier: identifier });
    if (limitError || allowedBeforeInsert === false) {
      return new Response(JSON.stringify({ error: 'Muitos pedidos foram enviados recentemente. Aguarda alguns minutos e tenta novamente.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // CAPTCHA validation for anonymous users
    const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY');
    const isAnonymous = !effectiveUserId;

    if (isAnonymous && turnstileSecret) {
      if (!captcha_token) {
        return new Response(JSON.stringify({ error: 'Verificação CAPTCHA obrigatória.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      // Validate CAPTCHA token with Cloudflare Turnstile
      const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: turnstileSecret,
          response: captcha_token,
        }),
      });

      const turnstileData = await turnstileResponse.json();

      if (!turnstileData.success) {
        return new Response(
          JSON.stringify({ error: 'Verificação CAPTCHA falhou.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Insert using the service-role client after server-side identity validation.
    const { data: inquiry, error: insertError } = await supabase
      .from('inquiries')
      .insert({
        property_id,
        user_id: effectiveUserId,
        name: name || null,
        email: email || null,
        phone: phone || null,
        message,
        inquiry_type: inquiry_type || 'info',
        status: 'new',
        captcha_verified: !!(captcha_token && turnstileSecret),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao guardar pedido.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a lead from the inquiry (if property exists)
    if (property_id) {
      const { data: property } = await supabase
        .from('properties')
        .select('owner_id')
        .eq('id', property_id)
        .maybeSingle();

      if (property) {
        await supabase.from('leads').insert({
          name: name || email || 'Anónimo',
          email: email || null,
          phone: phone || null,
          source: 'inquiry',
          status: 'new',
          property_id,
          inquiry_id: inquiry.id,
          user_id: effectiveUserId,
        });
      }
    }

    // Send notification to property owner if applicable
    if (property_id) {
      const { data: property } = await supabase
        .from('properties')
        .select('owner_id, title')
        .eq('id', property_id)
        .maybeSingle();

      if (property?.owner_id) {
        await supabase.from('notifications').insert({
          user_id: property.owner_id,
          type: 'inquiry',
          title: 'Nova inquiry recebida',
          body: `Recebeste uma inquiry sobre "${property.title}"`,
          link: `/properties/${property_id}`,
          data: { inquiry_id: inquiry.id, property_id },
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, inquiry_id: inquiry.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
