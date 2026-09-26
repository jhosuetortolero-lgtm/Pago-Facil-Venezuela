# PagoFácil Messenger

Microservicio Go que recibe eventos de `public.orders` desde Supabase, enriquece cada pedido con los datos de `public.stores` y envía notificaciones al comerciante y al cliente mediante WAHA.

## Flujo

1. Valida el header `X-Supabase-Webhook-Secret` antes de leer o procesar el payload.
2. Acepta eventos `INSERT` y `UPDATE` de `public.orders`.
3. Consulta `public.stores` por `record.store_id` usando la API REST de Supabase y una clave exclusiva del backend.
4. Busca el número del comerciante en `stores.whatsapp_phone`, `stores.phone` y `stores.pago_movil_phone`, en ese orden, y después en otras columnas de contacto disponibles. Usa `orders.customer_phone` para el cliente.
5. Envía ambos mensajes por `POST /api/sendText` de WAHA.
6. En eventos `UPDATE`, solo notifica cuando cambia el estado del pedido para evitar duplicados innecesarios.

## Variables de entorno

Copie `.env.example` a `.env` y complete los secretos:

```env
PORT=8080
GIN_MODE=release
DEFAULT_COUNTRY_CODE=58
DEFAULT_MERCHANT_PHONE=584121234567
SUPABASE_WEBHOOK_SECRET=un-secreto-aleatorio-de-al-menos-32-caracteres
SUPABASE_URL=https://project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service-role-key-del-backend
WAHA_URL=http://localhost:3001
WAHA_API_KEY=api-key-de-waha
WAHA_SESSION=nombre-de-la-sesion-conectada
```

También se admite `SUPABASE_SECRET_KEY` y, si está definida, tiene prioridad sobre la clave legacy `SUPABASE_SERVICE_ROLE_KEY`. Ninguna de estas claves debe exponerse en el navegador ni versionarse.

Los teléfonos pueden estar en formato internacional, por ejemplo `584121234567`. Cuando comienzan con el prefijo local `0`, el servicio reemplaza ese cero por `DEFAULT_COUNTRY_CODE` (`58` por defecto). El resolver tolera esquemas diferentes y prioriza `whatsapp_phone`, `phone` y `pago_movil_phone`; después inspecciona otras columnas cuyo nombre represente un teléfono o contacto.

`DEFAULT_MERCHANT_PHONE` es opcional y se usa únicamente cuando la tienda no tiene ningún teléfono válido. Si tampoco se configura este respaldo, el servicio registra un aviso, omite la notificación al comercio y continúa enviando la notificación al cliente.

## Ejecución

```powershell
cd webhook-service
go mod download
go run .
```

Health check: `GET /health`.

Para producción, inyecte las variables mediante el secret manager del entorno y compile con:

```powershell
go build -o pagofacil-messenger.exe .
```

## Webhook de Supabase

Configure un Database Webhook para `INSERT` y `UPDATE` de `public.orders` apuntando a:

```text
POST https://su-host-publico/webhooks/supabase/orders
X-Supabase-Webhook-Secret: el-mismo-valor-de-SUPABASE_WEBHOOK_SECRET
```

Ejemplo de payload:

```json
{
  "type": "INSERT",
  "table": "orders",
  "schema": "public",
  "record": {
    "id": "11111111-1111-4111-8111-111111111111",
    "store_id": "22222222-2222-4222-8222-222222222222",
    "customer_name": "Cliente",
    "customer_phone": "584121234567",
    "total_usd": 25.5,
    "payment_method": "binance_pay",
    "status": "pending"
  },
  "old_record": {}
}
```

El servicio ignora campos adicionales que Supabase incluya en el registro, pero valida estrictamente tipo, tabla, esquema, UUID, método de pago, estado, monto y teléfono del cliente. El cuerpo está limitado a 1 MB.
