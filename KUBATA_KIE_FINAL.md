# Kubata Kié — Final Consolidated Build

Base: `kubata azul` (Vite + React + Supabase), because it contains the most complete functional services.

Design: adapted from `kubata baía` — editorial black/sand/gold visual system, hero, cards, category and location sections.

Admin access: guard logic adapted from `kubata imobiliária`, restricted to `role = admin` in the actual lowercase schema used by the consolidated project.

Security: hardened using the security patterns from `kubata segurança` and the actual schema of `kubata azul`.

Included:
- Supabase Storage image flow
- inquiry Edge Function with identity enforcement, rate limiting and Turnstile support
- Stripe Checkout Edge Function + signed webhook verification
- analytics events service
- real admin pagination
- private profiles + safe public profile projection
- immutable messages with controlled read-receipt RPC
- protected viewing/service/payment mutations
- NULL-safe conversation uniqueness
- sample property listings and frontend demo fallback

Secrets were intentionally NOT copied from any uploaded `.env` file. Configure them using `.env.example` and Supabase Edge Function secrets.

Run:
- npm install
- npm run build
