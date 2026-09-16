# PagoFácil

MVP SaaS B2B2C para lojistas na Venezuela, com vitrine pública, pagamentos em USD/VES/USDT, validação de comprovantes por OCR e notificações via WhatsApp.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS e shadcn/ui
- Supabase PostgreSQL, Auth Magic Link e Storage privado
- OpenAI `gpt-4o-mini` para OCR estruturado
- Zustand para o carrinho
- Microsserviço Go com Gin
- WAHA para notificações WhatsApp

## Funcionalidades

- Login sem senha via Magic Link
- Painel do lojista em `/admin/dashboard`
- Gestão de produtos em `/admin/products`
- Vitrine pública em `/[store-slug]`
- Checkout sem formulário longo
- Métodos Zelle, Pago Móvil e Binance Pay (USDT)
- OCR universal de comprovantes
- Status `verified`, `manual_review`, `fraud_alert` e `fraud_alert_duplicate`
- Painel Super Admin em `/admin-panel`
- Suspensão de lojas com bloqueio automático da vitrine
- Notificação de pedidos via WhatsApp

## Segurança

- RLS habilitado em todas as tabelas do Supabase.
- Lojistas só acessam os próprios dados.
- Super Admin é controlado por `profiles.is_super_admin` e RLS.
- Referências de pagamento possuem unicidade global por `(payment_method, payment_reference)`.
- Comprovantes ficam em bucket privado.
- `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY` e `WAHA_API_KEY` nunca são enviados ao cliente.
- Upload limitado a JPG/PNG de até 5 MB.
- Entradas de Server Actions e API são validadas com Zod.
- Rota de OCR possui rate limiting.
- Webhook Go exige `X-Supabase-Webhook-Secret`.

## Configuração do Supabase

1. Crie um projeto no Supabase.
2. Copie `.env.example` para `.env.local` e preencha as credenciais.
3. No SQL Editor, execute `supabase_schema.sql`.
4. Se o banco já recebeu o schema anterior, execute também `supabase_phase3_patch.sql`.
5. Configure o Magic Link com a URL `http://localhost:3000/auth/callback`.
6. Crie o primeiro Super Admin:
   - Crie o usuário pelo Auth do Supabase.
   - Substitua o e-mail em `supabase_super_admin_seed.sql`.
   - Execute o seed no SQL Editor.

## Variáveis de ambiente

Na raiz, configure `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
OPENAI_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_WEBHOOK_SECRET=
```

Para o microsserviço, configure `webhook-service/.env` conforme `webhook-service/.env.example`:

```env
PORT=8080
SUPABASE_WEBHOOK_SECRET=
WAHA_URL=http://localhost:3000
WAHA_API_KEY=
WAHA_SESSION=default
```

O valor de `SUPABASE_WEBHOOK_SECRET` precisa ser igual nos dois serviços.

## Execução local

Frontend:

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Acesse `http://localhost:3000`.

Microsserviço:

```powershell
cd webhook-service
Copy-Item .env.example .env
go mod download
go run .
```

Health check: `http://localhost:8080/health`.

Testes do serviço Go:

```powershell
cd webhook-service
go test ./...
go vet ./...
```

## Webhook Supabase → Go

Configure um Database Webhook para eventos `INSERT` e `UPDATE` da tabela `public.orders`, apontando para:

```text
POST http://localhost:8080/webhooks/supabase/orders
```

Header obrigatório:

```text
X-Supabase-Webhook-Secret: seu-segredo
```

O evento deve fornecer `store_phone` ou `merchant_phone` no registro para que o serviço saiba qual lojista notificar. Consulte [webhook-service/README.md](webhook-service/README.md) para o payload completo.

## Validação do projeto

```powershell
npx tsc --noEmit
npm run lint
npm run build
```

## Publicação

O projeto está disponível em:

https://github.com/jhosuetortolero-lgtm/Pago-Facil-Venezuela
