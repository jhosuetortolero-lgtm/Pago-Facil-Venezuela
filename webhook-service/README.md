# PagoFácil Messenger

Microsserviço Go responsável por receber eventos de pedidos do Supabase e enviar notificações privadas ao lojista pelo WAHA.

## Segurança

- A rota `POST /webhooks/supabase/orders` exige `X-Supabase-Webhook-Secret` igual a `SUPABASE_WEBHOOK_SECRET`.
- A comparação do segredo é feita em tempo constante.
- O payload é limitado a 1 MB e campos desconhecidos são rejeitados.
- As credenciais WAHA só vêm de variáveis de ambiente e nunca são retornadas ao cliente.

## Configuração e execução

```bash
cp .env.example .env
go mod download
go run .
```

Para produção, injete as variáveis pelo secret manager do ambiente. Compile com:

```bash
go build -o pagofacil-messenger .
```

Health check: `GET /health`.

## Webhook

Configure o webhook do Supabase apontando para `POST /webhooks/supabase/orders`, com o header secreto. O corpo esperado segue o formato de Database Webhook do Supabase:

```json
{
  "type": "UPDATE",
  "table": "orders",
  "schema": "public",
  "record": {
    "id": "uuid-do-pedido",
    "store_id": "uuid-da-loja",
    "store_name": "Mi Tienda",
    "store_phone": "584121234567",
    "customer_name": "Cliente",
    "total_usd": 25.5,
    "payment_method": "binance_pay",
    "status": "verified"
  },
  "old_record": {}
}
```

`store_phone` ou `merchant_phone` deve ser incluído pelo emissor do webhook, pois o registro puro de `orders` não contém o telefone da loja. O formato do chat enviado ao WAHA é `<telefone>@c.us`, conforme a API `POST /api/sendText`. Os status aceitos são `verified`, `manual_review`, `fraud_alert` e `fraud_alert_duplicate`.
