# CIBPAY Payment Gateway Integration Plan

## Context

The platform currently supports three payment methods — `CARD`, `BANK_TRANSFER`, `CASH` — but the `CARD` branch is only a schema stub: the `Payment` model has `gatewayTransactionId`, `cardLast4`, `cardBrand` fields but no actual gateway integration. Manual confirmation exists for all three methods (finance-review-before-payment flow, recent commits `8de1641`, `d3e062f`).

CIBPAY is the Azerbaijani payment gateway the Port of Baku has contracted with. This change wires the `CARD` method to CIBPAY end-to-end so:

- Customers can pay orders by card via CIBPAY's hosted payment page.
- Finance Officers / Administrators can refund or cancel transactions from the finance portal.
- Every CIBPAY request/response is persisted for audit and reconciliation.

### Decisions (confirmed)
- **Charge mode**: `auto_charge=true` (one-step charge — no separate authorize + capture).
- **Status sync**: `return_url` redirect + backend poll of `GET /orders/{id}`. No CIBPAY webhook for now.
- **Refund actors**: `FINANCE_OFFICER` and `ADMINISTRATOR`.
- **PFX storage**: `.p12` file on disk; path & password via env vars.
- **Reuse `PaymentMethod.CARD`** — do not add a new enum; CIBPAY becomes the implementation behind `CARD`.

---

## Architecture

```
Customer clicks "Pay with card"
  → POST /payment/initiate  (method=CARD)
      → PaymentService.initiate(): creates Payment row (PENDING)
      → CibpayService.createOrder(): POST https://api-preprod.cibpay.co/orders/create
      → Persist gatewayTransactionId (CIBPAY order id) + cibpayPaymentUrl
      → Return { paymentUrl } to web
  → Browser redirects to CIBPAY hosted page
  → User completes payment
  → CIBPAY redirects back to RETURN_URL = `${FRONTEND_URL}/{locale}/customer/orders/{orderId}/payment-return`
  → Customer-return page calls POST /payment/{id}/sync
      → CibpayService.getOrder(cibpayId): pull current status
      → PaymentService.applyCibpayStatus(): map to PaymentStatus, run confirmPayment() on success
  → Order becomes VERIFIED with paymentConfirmedAt set (FIFO key)

Refund / Cancel (Finance portal)
  → POST /payment/{id}/refund { amount? }  → CibpayService.refund() → persist refund fields
  → POST /payment/{id}/cancel              → CibpayService.cancel() → sets PaymentStatus.REFUNDED + refund fields
```

Every CIBPAY HTTP call is logged to a new `PaymentGatewayLog` table (request, response, status, latency, idempotency key).

---

## Files to create

### API
- `apps/api/src/modules/payment/cibpay/cibpay.service.ts` — HTTP client wrapping CIBPAY API (axios instance with Basic Auth + PFX `https.Agent`). Methods: `ping()`, `createOrder()`, `getOrder()`, `charge()` (unused under auto_charge but exposed for future), `refund()`, `cancel()`.
- `apps/api/src/modules/payment/cibpay/cibpay.config.ts` — Reads env: `CIBPAY_BASE_URL`, `CIBPAY_USERNAME`, `CIBPAY_PASSWORD`, `CIBPAY_PFX_PATH`, `CIBPAY_PFX_PASSWORD`, `CIBPAY_TERMINAL`, `CIBPAY_DEFAULT_CURRENCY`, `CIBPAY_RETURN_BASE_URL`. Builds `https.Agent` once and caches.
- `apps/api/src/modules/payment/cibpay/cibpay.types.ts` — Typed request/response interfaces mirroring the CIBPAY doc. Union type for their status (`new | prepared | authorized | charged | reversed | refunded | rejected | fraud | declined | chargedback | credited | error`).
- `apps/api/src/modules/payment/cibpay/cibpay.status-map.ts` — Pure mapper from CIBPAY status → our `PaymentStatus`. `charged` / `credited` → `CONFIRMED`; `refunded` / `reversed` → `REFUNDED`; `rejected` / `fraud` / `declined` / `error` → `FAILED`; everything else → `PENDING`.

### Web
- `apps/web/src/app/[locale]/(customer)/customer/orders/[orderId]/payment-return/page.tsx` — Landing page after CIBPAY redirect. Calls `POST /payment/{id}/sync`, shows spinner, redirects to order detail on success/failure.
- `apps/web/src/components/payment/CardPaymentButton.tsx` — Button used on customer order detail; calls `/payment/initiate` then `window.location.href = paymentUrl`.
- `apps/web/src/components/payment/RefundDialog.tsx` — Modal on finance order page; amount + reason, calls `/payment/{id}/refund`.
- `apps/web/src/components/payment/CancelDialog.tsx` — Confirmation modal; calls `/payment/{id}/cancel`.

---

## Files to modify

### Schema (`apps/api/prisma/schema.prisma`)
Add to `Payment` model:
```prisma
  cibpayOrderId       String?       @unique  // == gatewayTransactionId, but indexed & explicit
  cibpayPaymentUrl    String?                // hosted payment page URL
  cibpayStatus        String?                // raw CIBPAY status string
  cibpayLastSyncedAt  DateTime?
  cancelledAt         DateTime?
  cancelledReason     String?
  gatewayLogs         PaymentGatewayLog[]
```

Add new model:
```prisma
model PaymentGatewayLog {
  id             String   @id @default(cuid())
  paymentId      String?
  provider       String   // 'cibpay'
  operation      String   // 'create_order' | 'get_order' | 'refund' | 'cancel' | 'charge'
  direction      String   // 'request' | 'response'
  httpStatus     Int?
  idempotencyKey String?
  payload        Json
  latencyMs      Int?
  createdAt      DateTime @default(now())

  payment        Payment? @relation(fields: [paymentId], references: [id])

  @@index([paymentId])
  @@index([provider, operation])
  @@map("payment_gateway_logs")
}
```

### Payment module
- `apps/api/src/modules/payment/payment.module.ts` — register `CibpayService`, export it.
- `apps/api/src/modules/payment/payment.service.ts` — extend with:
  - `initiate()` — when `method === CARD`, call `cibpay.createOrder()`, persist `cibpayOrderId` / `cibpayPaymentUrl`, return payment + `paymentUrl`.
  - `syncCibpayStatus(paymentId)` — fetches order by CIBPAY id; on terminal status runs existing `confirmPayment()` or marks FAILED. Updates `cibpayStatus`, `cibpayLastSyncedAt`.
  - `refundPayment(paymentId, amount?, reason)` — guards on `status=CONFIRMED`; calls `cibpay.refund()`; sets `refundInitiatedAt`, `refundedAt`, `refundAmount`, `refundReference`, `status=REFUNDED`; writes `OrderEvent`.
  - `cancelPayment(paymentId, reason)` — calls `cibpay.cancel()`; `reversed` → FAILED path, `refunded` → REFUNDED path; writes `OrderEvent`.
- `apps/api/src/modules/payment/payment.controller.ts` — add:
  - `POST /payment/:paymentId/sync` (authenticated).
  - `POST /payment/:paymentId/refund` (guards: `FINANCE_OFFICER`, `ADMINISTRATOR`).
  - `POST /payment/:paymentId/cancel` (guards: `FINANCE_OFFICER`, `ADMINISTRATOR`).
  - Register specific sub-paths before any generic `:id` route.

### Customer UI
- `apps/web/src/app/[locale]/(customer)/customer/orders/[orderId]/page.tsx` — when `order.paymentMethod === 'CARD'` and payment is `PENDING`, render `<CardPaymentButton />`.

### Finance UI
- `apps/web/src/app/[locale]/(finance)/finance/orders/[orderId]/page.tsx` — when `payment.status === 'CONFIRMED'` and `method === 'CARD'`, show "Refund" + "Cancel" actions.

### Config & env
- `.env.example` — add CIBPAY block.
- `docker-compose.yml` — mount `./secrets:/app/secrets:ro` on the `api` service.
- `.gitignore` — add `/secrets/` and `*.p12` / `*.pfx`.

### i18n (`apps/web/messages/*.json`)
Add keys under a new `payment` namespace for: `payWithCard`, `redirecting`, `paymentSuccess`, `paymentFailed`, `refund`, `refundAmount`, `refundReason`, `cancelPayment`, `confirmCancel`. Mirror in `az.json`, `en.json`, `ru.json`, `tr.json`.

---

## Existing code to reuse

- `PaymentService.confirmPayment()` — reuse from `syncCibpayStatus` when CIBPAY returns `charged`.
- `OrderEvent` pattern — use `event: 'PAYMENT_REFUNDED'`, `'PAYMENT_CANCELLED'`, `'PAYMENT_FAILED'` for audit trail.
- `axios` — already a dep; pattern in `apps/api/src/modules/planning/weather.service.ts`.
- `JwtAuthGuard` + `RolesGuard` + `@Roles()` decorator chain.
- `apps/web/src/lib/api-client.ts` Axios instance with auto-refresh.
- `PrismaService.$transaction` pattern for atomic refund/cancel + OrderEvent.

---

## Implementation order

1. **Schema**: add `Payment` fields + `PaymentGatewayLog` model; copy to container and `npx prisma db push`.
2. **CIBPAY client**: config, types, status-map, service.
3. **Payment service extensions**: `initiate` (CARD branch), `syncCibpayStatus`, `refundPayment`, `cancelPayment`.
4. **Payment controller endpoints**: `/sync`, `/refund`, `/cancel`.
5. **Customer UI**: `CardPaymentButton` + payment-return page.
6. **Finance UI**: `RefundDialog` + `CancelDialog` on finance order page.
7. **i18n keys** across four locales.
8. **Env + docker-compose** mount.

---

## Verification

**Environment prep**:
```bash
mkdir -p secrets && cp /path/to/cibpay.p12 secrets/cibpay.p12
docker compose up --build
docker cp apps/api/prisma/schema.prisma pob-api:/app/apps/api/prisma/schema.prisma
docker compose exec -w /app/apps/api api npx prisma db push
docker compose exec postgres psql -U pob_user -d pob_eqp -c "\dt payment_gateway_logs"
```

**End-to-end happy path**:
1. Customer creates order with CARD method.
2. Clicks "Pay with card" → redirected to CIBPAY hosted page.
3. Test card (Kapital): `4169 7413 3015 1778`, exp `11/26`, CVV `119`.
4. CIBPAY redirects to `/customer/orders/{orderId}/payment-return`.
5. Return page calls `/payment/{id}/sync`; order → `VERIFIED`, payment → `CONFIRMED`.

**Refund path**: Finance Officer opens order → "Refund" → payment → `REFUNDED`.

**Cancel path**: Finance Officer "Cancel" on charged payment → payment → `REFUNDED`, `cancelledAt` set.

---

## Out of scope

- Rebill / card-on-file.
- 3D Secure tuning.
- Customer-initiated refund requests.
- Webhook / `status_notification` integration.
- Apple Pay / Google Pay toggles.
- Partial refund UI (backend accepts amount; UI exposes only full refund initially).
