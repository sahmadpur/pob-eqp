# Order Verification Flow — Design Spec

**Date:** 2026-04-14  
**Status:** Approved

---

## Overview

Implement the Finance Officer verification flow for orders in `AWAITING_VERIFICATION` status. After payment is confirmed, a Finance Officer reviews the order using a checklist, and can either approve it (`VERIFIED`) or request clarification from the customer (`AWAITING_CLARIFICATION`). The customer responds with a note and optional documents, returning the order to `AWAITING_VERIFICATION` for re-review. Maximum 2 clarification rounds enforced.

---

## Status Flow

```
PENDING_PAYMENT
  └─→ AWAITING_VERIFICATION   (payment confirmed — already implemented)
        ├─→ VERIFIED           (FO approves checklist)
        └─→ AWAITING_CLARIFICATION  (FO requests clarification)
              └─→ AWAITING_VERIFICATION  (customer responds)
```

---

## Data Layer

### New table: `OrderClarificationRound`

```prisma
model OrderClarificationRound {
  id              String    @id @default(cuid())
  orderId         String
  roundNumber     Int                         // 1-based, max 2
  requestNote     String
  requestedAt     DateTime  @default(now())
  requestedById   String

  customerNote    String?
  customerDocIds  String[]  @default([])      // OrderDocument IDs
  respondedAt     DateTime?
  closedAt        DateTime?                   // set when FO re-reviews

  order           Order     @relation(fields: [orderId], references: [id])
  requestedBy     User      @relation("ClarificationRequester", fields: [requestedById], references: [id])

  @@map("order_clarification_rounds")
}
```

**`OrderVerification`** — no schema changes. Holds the final checklist verdict.

**`Order`** — add relation: `clarificationRounds OrderClarificationRound[]`

**`User`** — add relation: `clarificationRoundsRequested OrderClarificationRound[] @relation("ClarificationRequester")`

---

## API

All endpoints require `JwtAuthGuard`. Role enforcement per endpoint.

### Finance Officer endpoints

#### `POST /orders/:orderId/verify`
**Roles:** `FINANCE_OFFICER`, `ADMINISTRATOR`  
**Guard preconditions:** Order must be in `AWAITING_VERIFICATION`  
**Body:**
```json
{
  "checkDocumentsOk": true,
  "checkDriverIdOk": true,
  "checkVehicleOk": true,
  "checkPaymentOk": true,
  "upgradedToPriority": false,
  "internalNote": "optional string"
}
```
**Behaviour (in a single transaction):**
1. Upsert `OrderVerification` with checklist fields, `verifierId = req.user.id`, `verifiedAt = now()`
2. Update `Order.status → VERIFIED`
3. Close any open `OrderClarificationRound` (`closedAt = now()`)
4. Append `OrderEvent` (`event = 'VERIFIED'`, `actor = 'FinanceOfficer'`)

#### `POST /orders/:orderId/clarify`
**Roles:** `FINANCE_OFFICER`, `ADMINISTRATOR`  
**Guard preconditions:** Order must be in `AWAITING_VERIFICATION`. Round count must be < 2.  
**Body:**
```json
{
  "requestNote": "string"
}
```
**Behaviour (in a single transaction):**
1. Count existing `OrderClarificationRound` rows for this order — reject with `BadRequestException` if already 2
2. Create `OrderClarificationRound` with `roundNumber = count + 1`, `requestedById = req.user.id`
3. Update `Order.status → AWAITING_CLARIFICATION`
4. Append `OrderEvent` (`event = 'CLARIFICATION_REQUESTED'`)

### Customer endpoint

#### `POST /orders/:orderId/clarify/respond`
**Roles:** `CUSTOMER_INDIVIDUAL`, `CUSTOMER_LEGAL`  
**Guard preconditions:** Order must be owned by `req.user.id`. Order must be in `AWAITING_CLARIFICATION`.  
**Body:**
```json
{
  "customerNote": "string",
  "customerDocIds": ["doc-id-1"]
}
```
**Behaviour (in a single transaction):**
1. Find open `OrderClarificationRound` (where `respondedAt IS NULL`)
2. Update round: `customerNote`, `customerDocIds`, `respondedAt = now()`
3. Update `Order.status → AWAITING_VERIFICATION`
4. Append `OrderEvent` (`event = 'CLARIFICATION_RESPONDED'`)

---

## Frontend

### Finance Officer — `finance/orders/[orderId]/page.tsx`

**When status is `AWAITING_VERIFICATION`:** Show a new action panel below the existing payment panel with two sections:

- **Verify section:** Four checkboxes (`checkDocumentsOk`, `checkDriverIdOk`, `checkVehicleOk`, `checkPaymentOk`) + `upgradedToPriority` toggle + optional `internalNote` textarea + "Mark as Verified" button
- **Request Clarification section:** Textarea for `requestNote` + "Send to Customer" button. Button disabled (with tooltip) if 2 rounds already used.

**When status is `AWAITING_CLARIFICATION`:** Show read-only panel displaying the open round's `requestNote` and — once responded — the customer's `customerNote` and attached document links.

The `OrderDetail` interface must be extended to include `verification` and `clarificationRounds` from the API response.

### Customer — new page `customer/orders/[orderId]/page.tsx`

New page (currently missing). Displays:

- Order details (driver, vehicle, cargo, fees, payment — read-only)
- Status badge + status timeline from `order.timeline`
- **When `AWAITING_CLARIFICATION`:** Alert panel showing the Finance Officer's `requestNote` + response form (textarea for `customerNote` + multi-select of existing `order.documents` + "Submit Response" button)
- **All other statuses:** Read-only status info, no action panel

### i18n

Add keys to all 4 locale files (`en.json`, `az.json`, `ru.json`, `tr.json`):

- Under `staffOrders`: keys for verification checklist, clarification request form, clarification response display
- New namespace `orderDetail`: keys for customer order detail page (status labels, clarification alert, response form)

---

## Error Cases

| Scenario | Response |
|---|---|
| FO tries to verify order not in `AWAITING_VERIFICATION` | `400 BadRequestException` |
| FO tries to request clarification when 2 rounds already exist | `400 Bad RequestException` |
| Customer tries to respond when order not in `AWAITING_CLARIFICATION` | `400 BadRequestException` |
| Customer tries to respond to an order they don't own | `403 ForbiddenException` |
| No open clarification round found on respond | `404 NotFoundException` |

---

## Out of Scope

- Notifications (email/SMS) to customer when clarification is requested — handled by the notifications module separately
- Admin override of clarification round limit
- Clarification on orders in any status other than `AWAITING_VERIFICATION` / `AWAITING_CLARIFICATION`
