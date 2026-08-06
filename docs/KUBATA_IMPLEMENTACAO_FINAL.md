# Kubata Kié — Implementação Final

## Visão Geral

O Kubata Kié é uma plataforma imobiliária completa construída com React + TypeScript + Vite, Supabase (base de dados, autenticação, storage, realtime, edge functions), e Tailwind CSS v4.

Este documento descreve as cinco áreas pendentes que foram finalizadas:

1. Supabase Storage para imagens
2. Rate limiting / CAPTCHA para inquiries
3. Integração real de pagamentos
4. Analytics Events
5. Paginação real no Admin

---

## 1. STORAGE DE IMAGENS

### Bucket
- Nome: `property-images`
- Público: sim (leitura pública)
- Tipos permitidos: image/jpeg, image/png, image/webp
- Tamanho máximo: 10MB por imagem

### Estrutura de Caminhos
```
property-images/{user_id}/{property_id}/{uuid}.{extension}
```

### Policies de Storage
- SELECT: público (qualquer pessoa pode ver imagens de imóveis publicados)
- INSERT: utilizador autenticado, path deve começar com o seu user_id
- UPDATE: utilizador autenticado, só pode atualizar os seus próprios ficheiros
- DELETE: utilizador autenticado, só pode eliminar os seus próprios ficheiros

### Upload
- Validação de tipo MIME e extensão no frontend (`imageService.ts`)
- Upload via `supabase.storage.from('property-images').upload()`
- URL pública obtida via `getPublicUrl()`
- Registo guardado na tabela `property_images` com `url` e `storage_path`

### Compatibilidade com URLs Antigas
- Imagens com apenas `url` (sem `storage_path`) continuam a funcionar
- O sistema não tenta migrar nem apagar imagens externas existentes

### Delete
- Remove o ficheiro do Storage (se `storage_path` existir)
- Remove o registo de `property_images`
- Não quebra se o ficheiro já não existir no Storage

### Ficheiros
- `src/services/imageService.ts` — upload, delete, validação, reorder, set primary
- `src/pages/ImageManagerPage.tsx` — UI de gestão de imagens
- Migration: `202608050005_storage_bucket.sql`

---

## 2. RATE LIMITING / CAPTCHA

### Rate Limit
- Limite: 10 inquiries por 10 minutos por utilizador/IP
- Tabela: `inquiry_rate_limits` (identifier, identifier_type, window_start, count)
- Implementado na Edge Function `inquiry-submit`
- Retorna HTTP 429 com mensagem amigável quando excedido
- Não revela mecanismos internos

### CAPTCHA (Cloudflare Turnstile)
- Variáveis de ambiente:
  - `VITE_TURNSTILE_SITE_KEY` — chave pública (frontend)
  - `TURNSTILE_SECRET_KEY` — chave secreta (server-side apenas)
- Validação server-side na Edge Function `inquiry-submit`
- Aplicado principalmente a visitantes anónimos
- Utilizadores autenticados não precisam de CAPTCHA em fluxo normal
- Nunca confia em `captcha_verified=true` do frontend

### Fluxo
1. Utilizador submete inquiry
2. Edge Function verifica rate limit
3. Se anónimo + CAPTCHA configurado: valida token Turnstile
4. Insere inquiry na base de dados
5. Cria lead automaticamente a partir da inquiry
6. Envia notificação ao proprietário do imóvel

### Ficheiros
- `supabase/functions/inquiry-submit/index.ts` — Edge Function
- Migration: `202608050004_audit_rate_limit.sql`

---

## 3. PAGAMENTOS REAIS

### Arquitetura
- Abstração `PaymentProvider` em `src/services/paymentProvider.ts`
- Operações: `createCheckout()`, `getPaymentStatus()`, `handleWebhook()`
- Provider ativo definido por `PAYMENT_PROVIDER` env var

### Tabela `payments`
- Campos: provider, external_payment_id, amount, currency, status, payment_type, metadata, checkout_url
- Statuses: pending, processing, completed, failed, refunded, cancelled
- Constraint UNIQUE (provider, external_payment_id) para idempotência

### Webhook
- Edge Function: `payment-webhook`
- Valida assinatura do webhook
- Idempotência: verifica se external_payment_id já existe
- Não duplica pagamentos nem benefícios
- Atualiza estado do pagamento
- Activa benefício (ex: is_featured no imóvel)
- Envia notificação ao utilizador
- Regista evento PAYMENT_COMPLETED

### Estados
- O frontend NUNCA decide que pagamento está concluído
- O estado final vem do webhook do gateway
- `createPayment()` cria registo pending
- Webhook atualiza para completed/failed/etc.

### Variáveis de Ambiente Necessárias
```
PAYMENT_PROVIDER=stripe|paypal|none
VITE_PAYMENT_PUBLIC_KEY=pk_xxx
PAYMENT_SECRET_KEY=sk_xxx  (server-side only)
PAYMENT_WEBHOOK_SECRET=whsec_xxx  (server-side only)
```

### Configuração Externa Necessária
- Conta no gateway de pagamento (Stripe/PayPal)
- Chaves de API do gateway
- Webhook secret configurado no gateway
- URL do webhook: `https://your-project.supabase.co/functions/v1/payment-webhook`

### Ficheiros
- `src/services/paymentService.ts` — CRUD de pagamentos
- `src/services/paymentProvider.ts` — abstração do provider
- `src/pages/CheckoutPage.tsx` — UI de checkout
- `supabase/functions/payment-webhook/index.ts` — webhook handler
- Migration: `202608050002_payments.sql`

---

## 4. ANALYTICS EVENTS

### Tabela `analytics_events`
- Campos: event_name, user_id, session_id, property_id, lead_id, metadata, created_at
- RLS ativado: anon/authenticated podem inserir; utilizadores leem os seus; admins leem todos
- Índices: event_name, created_at, property_id, user_id

### Eventos Implementados
1. PROPERTY_VIEW — ao visualizar página de imóvel
2. PROPERTY_FAVORITE — ao adicionar/remover favorito
3. CONTACT — ao enviar inquiry
4. WHATSAPP_CLICK — ao clicar WhatsApp
5. PHONE_CLICK — ao clicar telefone
6. VIEWING_REQUEST — ao pedir visita
7. MESSAGE_SENT — ao enviar mensagem
8. LEAD_CREATED — criado automaticamente na inquiry
9. PAYMENT_STARTED — ao iniciar checkout
10. PAYMENT_COMPLETED — via webhook
11. PAYMENT_FAILED — quando pagamento falha
12. SEARCH — ao pesquisar imóveis

### Serviço
- `src/services/analyticsService.ts`
- Função central `trackEvent(eventName, metadata)`
- Session ID gerado por sessão de browser
- Falha silenciosamente — nunca impede a ação principal
- Não armazena passwords, tokens, dados de cartão

### Ficheiros
- `src/services/analyticsService.ts`
- Migration: `202608050003_analytics_events.sql`

---

## 5. PAGINAÇÃO REAL NO ADMIN

### Implementação
- Paginação real na base de dados usando `range()` do Supabase
- Default: 25 itens por página
- Máximo: 100 itens por página
- Contagem total obtida via `count: 'exact'`

### Hook Reutilizável
- `src/hooks/useAdminPagination.ts`
- Gerencia page, pageSize, search, filters, sortBy, sortOrder
- Busca apenas os registos da página atual

### Listas com Paginação
1. Properties (Imóveis)
2. Users (Utilizadores)
3. Leads
4. Inquiries
5. Payments (Pagamentos)
6. Viewing Requests (Visitas)
7. Service Requests (Serviços)
8. Audit Logs (Auditoria)
9. Analytics Events

### UI
- Botões Anterior / Próxima
- Indicador "Página X de Y"
- Anterior desativado na primeira página
- Próxima desativado na última página
- Loading state durante carregamento

### Filtros e Ordenação
- Pesquisa por texto
- Filtros por status, tipo, prioridade, papel, etc.
- Ordenação por coluna (click no header)
- Filtros e ordenação preservados ao mudar de página

### Ficheiros
- `src/hooks/useAdminPagination.ts`
- `src/components/admin/AdminProperties.tsx`
- `src/components/admin/AdminUsers.tsx`
- `src/components/admin/AdminLeads.tsx`
- `src/components/admin/AdminInquiries.tsx`
- `src/components/admin/AdminPayments.tsx`
- `src/components/admin/AdminViewingRequests.tsx`
- `src/components/admin/AdminServiceRequests.tsx`
- `src/components/admin/AdminAuditLogs.tsx`
- `src/components/admin/AdminAnalytics.tsx`
- `src/components/Pagination.tsx`

---

## MIGRATIONS CRIADAS

1. `202608050001_core_schema.sql` — profiles, properties, property_images, inquiries, leads, favorites, viewing_requests, service_requests, conversations, messages, notifications + RLS + índices + triggers
2. `202608050002_payments.sql` — payments com provider, external_payment_id, idempotência
3. `202608050003_analytics_events.sql` — analytics_events com RLS e índices
4. `202608050004_audit_rate_limit.sql` — audit_logs + inquiry_rate_limits
5. `202608050005_storage_bucket.sql` — bucket property-images + policies de storage
6. `202608050006_property_views_function.sql` — função SECURITY DEFINER para incrementar views

## EDGE FUNCTIONS DEPLOYED

1. `inquiry-submit` — rate limiting + CAPTCHA + criação de inquiry + lead + notificação
2. `payment-webhook` — validação de webhook + idempotência + ativação de benefício + notificação

---

## VARIÁVEIS DE AMBIENTE

Ver `.env.example` para a lista completa.

### Configuração Externa Necessária

Para que todas as funcionalidades estejam 100% ativas:

1. **Cloudflare Turnstile** (CAPTCHA):
   - Criar conta em dash.cloudflare.com
   - Obter Site Key e Secret Key
   - Configurar `VITE_TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY`

2. **Gateway de Pagamento** (Stripe recomendado):
   - Criar conta em stripe.com
   - Obter Publishable Key e Secret Key
   - Configurar webhook endpoint
   - Definir `PAYMENT_PROVIDER=stripe`
   - Configurar `VITE_PAYMENT_PUBLIC_KEY`, `PAYMENT_SECRET_KEY`, `PAYMENT_WEBHOOK_SECRET`

Sem estas credenciais, o projeto compila e funciona, mas:
- CAPTCHA não valida tokens (inquiries anónimas aceites sem CAPTCHA)
- Pagamentos não processam (checkout mostra aviso de gateway não configurado)

---

## TESTES

- Typecheck: ✓ (npm run build sem erros TS)
- Build: ✓ (vite build concluído com sucesso)
- Testes funcionais: requerem navegador e credenciais Supabase

---

## ESTRUTURA DO PROJETO

```
src/
  context/AuthContext.tsx
  hooks/useAdminPagination.ts
  lib/supabase.ts
  types/index.ts
  services/
    propertyService.ts
    imageService.ts
    inquiryService.ts
    favoriteService.ts
    viewingService.ts
    serviceRequestService.ts
    leadService.ts
    chatService.ts
    notificationService.ts
    paymentService.ts
    paymentProvider.ts
    analyticsService.ts
    adminService.ts
  components/
    Header.tsx, Footer.tsx, PropertyCard.tsx, Pagination.tsx
    admin/
      AdminSearchBar.tsx
      AdminProperties.tsx, AdminUsers.tsx, AdminLeads.tsx
      AdminInquiries.tsx, AdminPayments.tsx, AdminViewingRequests.tsx
      AdminServiceRequests.tsx, AdminAuditLogs.tsx, AdminAnalytics.tsx
  pages/
    HomePage.tsx, PropertiesPage.tsx, PropertyDetailPage.tsx
    SignInPage.tsx, SignUpPage.tsx, DashboardPage.tsx
    FavoritesPage.tsx, MessagesPage.tsx, NotificationsPage.tsx
    PropertyEditorPage.tsx, ImageManagerPage.tsx, CheckoutPage.tsx
    AdminPage.tsx
supabase/functions/
  inquiry-submit/index.ts
  payment-webhook/index.ts
```
