# Order Verification Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Finance Officer order verification flow — including checklist approval, clarification requests, and customer responses — covering API, database, and frontend.

**Architecture:** Add `OrderClarificationRound` to Prisma schema for multi-round clarification history; extend `OrdersService` with three new methods (`verifyOrder`, `requestClarification`, `respondToClarification`); wire them into `OrdersController` as three new POST endpoints; update the Finance Officer order detail page with an action panel; create a new customer order detail page.

**Tech Stack:** NestJS 10, Prisma 5, PostgreSQL 16, Next.js 14 (App Router), TypeScript, Tailwind CSS, next-intl

---

## File Map

| File | Change |
|---|---|
| `apps/api/prisma/schema.prisma` | Add `OrderClarificationRound` model + relations on `Order` and `User` |
| `apps/api/src/modules/orders/orders.service.ts` | Add `verifyOrder`, `requestClarification`, `respondToClarification`, update `findByOrderId` |
| `apps/api/src/modules/orders/orders.controller.ts` | Add 3 new POST endpoints |
| `apps/web/messages/en.json` | Add verification + `orderDetail` i18n keys |
| `apps/web/messages/az.json` | Same keys in Azerbaijani |
| `apps/web/messages/ru.json` | Same keys in Russian |
| `apps/web/messages/tr.json` | Same keys in Turkish |
| `apps/web/src/app/[locale]/(finance)/finance/orders/[orderId]/page.tsx` | Add verification action panel + clarification display |
| `apps/web/src/app/[locale]/(customer)/customer/orders/[orderId]/page.tsx` | **Create** — customer order detail + clarification response form |
| `apps/web/src/app/[locale]/(customer)/customer/orders/page.tsx` | Add "View" link for all orders |

---

## Task 1: Add `OrderClarificationRound` to Prisma schema

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add the model and relations**

In `schema.prisma`, after the `OrderVerification` model (after line 664), add:

```prisma
// ─────────────────────────────────────────────────────────────────────────────
// ORDER CLARIFICATION ROUNDS
// ─────────────────────────────────────────────────────────────────────────────

model OrderClarificationRound {
  id              String    @id @default(cuid())
  orderId         String
  roundNumber     Int
  requestNote     String
  requestedAt     DateTime  @default(now())
  requestedById   String

  customerNote    String?
  customerDocIds  String[]  @default([])
  respondedAt     DateTime?
  closedAt        DateTime?

  order           Order     @relation(fields: [orderId], references: [id])
  requestedBy     User      @relation("ClarificationRequester", fields: [requestedById], references: [id])

  @@index([orderId])
  @@map("order_clarification_rounds")
}
```

- [ ] **Step 2: Add relation to `Order` model**

In the `Order` model relations block (after `timeline OrderEvent[]`, around line 597), add:

```prisma
  clarificationRounds   OrderClarificationRound[]
```

- [ ] **Step 3: Add relation to `User` model**

Find the `User` model and add alongside the other named relations (e.g., near `financeVerifications`):

```prisma
  clarificationRoundsRequested  OrderClarificationRound[] @relation("ClarificationRequester")
```

- [ ] **Step 4: Push schema to database**

```bash
docker compose exec -w /app/apps/api api npx prisma db push
```

Expected output: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 5: Regenerate Prisma client**

```bash
docker compose exec -w /app/apps/api api npx prisma generate
```

Expected: `Generated Prisma Client`

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/schema.prisma
git commit -m "feat(schema): add OrderClarificationRound model"
```

---

## Task 2: Extend `OrdersService` — `verifyOrder`

**Files:**
- Modify: `apps/api/src/modules/orders/orders.service.ts`

- [ ] **Step 1: Add `verifyOrder` method**

Add this method to `OrdersService` after `getDailyAvailability`:

```typescript
async verifyOrder(
  orderId: string,
  actorId: string,
  dto: {
    checkDocumentsOk: boolean;
    checkDriverIdOk: boolean;
    checkVehicleOk: boolean;
    checkPaymentOk: boolean;
    upgradedToPriority?: boolean;
    internalNote?: string;
  },
) {
  const order = await this.prisma.order.findUnique({ where: { orderId } });
  if (!order) throw new NotFoundException(`Order ${orderId} not found`);
  if (order.status !== OrderStatus.AWAITING_VERIFICATION) {
    throw new BadRequestException('Order is not in AWAITING_VERIFICATION status');
  }

  const now = new Date();

  return this.prisma.$transaction([
    this.prisma.orderVerification.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        verifierId: actorId,
        checkDocumentsOk: dto.checkDocumentsOk,
        checkDriverIdOk: dto.checkDriverIdOk,
        checkVehicleOk: dto.checkVehicleOk,
        checkPaymentOk: dto.checkPaymentOk,
        upgradedToPriority: dto.upgradedToPriority ?? false,
        internalNote: dto.internalNote ?? null,
        verifiedAt: now,
      },
      update: {
        verifierId: actorId,
        checkDocumentsOk: dto.checkDocumentsOk,
        checkDriverIdOk: dto.checkDriverIdOk,
        checkVehicleOk: dto.checkVehicleOk,
        checkPaymentOk: dto.checkPaymentOk,
        upgradedToPriority: dto.upgradedToPriority ?? false,
        internalNote: dto.internalNote ?? null,
        verifiedAt: now,
      },
    }),
    this.prisma.order.update({
      where: { orderId },
      data: { status: OrderStatus.VERIFIED },
    }),
    this.prisma.orderClarificationRound.updateMany({
      where: { orderId: order.id, closedAt: null },
      data: { closedAt: now },
    }),
    this.prisma.orderEvent.create({
      data: {
        orderId: order.id,
        actor: 'Finance',
        actorId,
        event: 'VERIFIED',
        note: dto.internalNote ?? null,
      },
    }),
  ]);
}
```

- [ ] **Step 2: Restart API and confirm no TypeScript errors**

```bash
docker compose restart api && docker compose logs -f api | head -40
```

Expected: `NestFactory` startup logs, no compilation errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/orders/orders.service.ts
git commit -m "feat(orders): add verifyOrder service method"
```

---

## Task 3: Extend `OrdersService` — `requestClarification`

**Files:**
- Modify: `apps/api/src/modules/orders/orders.service.ts`

- [ ] **Step 1: Add `requestClarification` method**

Add after `verifyOrder`:

```typescript
async requestClarification(
  orderId: string,
  actorId: string,
  requestNote: string,
) {
  const order = await this.prisma.order.findUnique({ where: { orderId } });
  if (!order) throw new NotFoundException(`Order ${orderId} not found`);
  if (order.status !== OrderStatus.AWAITING_VERIFICATION) {
    throw new BadRequestException('Order is not in AWAITING_VERIFICATION status');
  }

  const existingCount = await this.prisma.orderClarificationRound.count({
    where: { orderId: order.id },
  });
  if (existingCount >= 2) {
    throw new BadRequestException('Maximum 2 clarification rounds already reached for this order');
  }

  return this.prisma.$transaction([
    this.prisma.orderClarificationRound.create({
      data: {
        orderId: order.id,
        roundNumber: existingCount + 1,
        requestNote,
        requestedById: actorId,
      },
    }),
    this.prisma.order.update({
      where: { orderId },
      data: { status: OrderStatus.AWAITING_CLARIFICATION },
    }),
    this.prisma.orderEvent.create({
      data: {
        orderId: order.id,
        actor: 'Finance',
        actorId,
        event: 'CLARIFICATION_REQUESTED',
        note: requestNote,
      },
    }),
  ]);
}
```

- [ ] **Step 2: Restart API and confirm no errors**

```bash
docker compose restart api && docker compose logs -f api | head -40
```

Expected: clean startup, no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/orders/orders.service.ts
git commit -m "feat(orders): add requestClarification service method"
```

---

## Task 4: Extend `OrdersService` — `respondToClarification` and update `findByOrderId`

**Files:**
- Modify: `apps/api/src/modules/orders/orders.service.ts`

- [ ] **Step 1: Add `respondToClarification` method**

Add after `requestClarification`:

```typescript
async respondToClarification(
  orderId: string,
  userId: string,
  dto: { customerNote: string; customerDocIds?: string[] },
) {
  const order = await this.prisma.order.findUnique({ where: { orderId } });
  if (!order) throw new NotFoundException(`Order ${orderId} not found`);
  if (order.userId !== userId) throw new ForbiddenException('You do not own this order');
  if (order.status !== OrderStatus.AWAITING_CLARIFICATION) {
    throw new BadRequestException('Order is not in AWAITING_CLARIFICATION status');
  }

  const openRound = await this.prisma.orderClarificationRound.findFirst({
    where: { orderId: order.id, respondedAt: null },
  });
  if (!openRound) throw new NotFoundException('No open clarification round found for this order');

  const now = new Date();

  return this.prisma.$transaction([
    this.prisma.orderClarificationRound.update({
      where: { id: openRound.id },
      data: {
        customerNote: dto.customerNote,
        customerDocIds: dto.customerDocIds ?? [],
        respondedAt: now,
      },
    }),
    this.prisma.order.update({
      where: { orderId },
      data: { status: OrderStatus.AWAITING_VERIFICATION },
    }),
    this.prisma.orderEvent.create({
      data: {
        orderId: order.id,
        actor: 'Customer',
        actorId: userId,
        event: 'CLARIFICATION_RESPONDED',
        note: dto.customerNote,
      },
    }),
  ]);
}
```

- [ ] **Step 2: Update `findByOrderId` to include clarification rounds and verification**

Find the existing `findByOrderId` method. Replace the `include` block so it reads:

```typescript
include: {
  user: { select: { id: true, email: true, phone: true } },
  planQueueType: true,
  timeline: { orderBy: { createdAt: 'asc' } },
  documents: true,
  payments: true,
  verification: true,
  clarificationRounds: { orderBy: { roundNumber: 'asc' } },
},
```

- [ ] **Step 3: Restart API and confirm no errors**

```bash
docker compose restart api && docker compose logs -f api | head -40
```

Expected: clean startup.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/orders/orders.service.ts
git commit -m "feat(orders): add respondToClarification, expose rounds+verification in findByOrderId"
```

---

## Task 5: Add 3 new endpoints to `OrdersController`

**Files:**
- Modify: `apps/api/src/modules/orders/orders.controller.ts`

- [ ] **Step 1: Add `POST /:orderId/verify` endpoint**

Add after the existing `updateStatus` endpoint:

```typescript
@Post(':orderId/verify')
@UseGuards(RolesGuard)
@Roles(UserRole.FINANCE_OFFICER, UserRole.ADMINISTRATOR)
@ApiOperation({ summary: 'Finance Officer: verify order after payment' })
async verifyOrder(
  @Param('orderId') orderId: string,
  @Body() dto: Parameters<OrdersService['verifyOrder']>[2],
  @Request() req: { user: { id: string; role: string; accountStatus: string } },
) {
  return this.ordersService.verifyOrder(orderId, req.user.id, dto);
}

@Post(':orderId/clarify')
@UseGuards(RolesGuard)
@Roles(UserRole.FINANCE_OFFICER, UserRole.ADMINISTRATOR)
@ApiOperation({ summary: 'Finance Officer: request clarification from customer' })
async requestClarification(
  @Param('orderId') orderId: string,
  @Body() dto: { requestNote: string },
  @Request() req: { user: { id: string; role: string; accountStatus: string } },
) {
  return this.ordersService.requestClarification(orderId, req.user.id, dto.requestNote);
}

@Post(':orderId/clarify/respond')
@ApiOperation({ summary: 'Customer: respond to clarification request' })
async respondToClarification(
  @Param('orderId') orderId: string,
  @Body() dto: { customerNote: string; customerDocIds?: string[] },
  @Request() req: { user: { id: string; role: string; accountStatus: string } },
) {
  return this.ordersService.respondToClarification(orderId, req.user.id, dto);
}
```

> **Note:** `POST /:orderId/clarify/respond` must be added **before** any generic `POST /:orderId/clarify` handler or NestJS will shadow it. Place all three together after `updateStatus`.

- [ ] **Step 2: Restart API and smoke-test via Swagger**

```bash
docker compose restart api
```

Open http://localhost:3001/api/docs — confirm the three new endpoints appear:
- `POST /orders/{orderId}/verify`
- `POST /orders/{orderId}/clarify`
- `POST /orders/{orderId}/clarify/respond`

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/orders/orders.controller.ts
git commit -m "feat(orders): add verify, clarify, and clarify/respond endpoints"
```

---

## Task 6: Add i18n keys to all 4 locale files

**Files:**
- Modify: `apps/web/messages/en.json`
- Modify: `apps/web/messages/az.json`
- Modify: `apps/web/messages/ru.json`
- Modify: `apps/web/messages/tr.json`

- [ ] **Step 1: Add keys to `en.json`**

In `staffOrders`, add these keys after `"rejectFailed"`:

```json
"verifyTitle": "Verify Order",
"checkDocuments": "Documents are OK",
"checkDriverId": "Driver ID is OK",
"checkVehicle": "Vehicle details are OK",
"checkPayment": "Payment is confirmed",
"upgradeToPriority": "Upgrade to Priority queue",
"internalNote": "Internal Note (optional)",
"internalNotePlaceholder": "Add a note visible only to Finance staff…",
"verifyBtn": "Mark as Verified",
"verifying": "Verifying…",
"verifySuccess": "Order verified successfully.",
"verifyFailed": "Failed to verify order.",
"clarifyTitle": "Request Clarification",
"clarifyNote": "Clarification Request",
"clarifyNotePlaceholder": "Describe what the customer needs to provide or correct…",
"clarifyBtn": "Send to Customer",
"clarifying": "Sending…",
"clarifySuccess": "Clarification request sent.",
"clarifyFailed": "Failed to send clarification request.",
"clarifyMaxRounds": "Maximum 2 clarification rounds reached. Cannot request further clarification.",
"clarifyRoundLabel": "Clarification Round {num}",
"clarifyRequestedAt": "Requested on {date}",
"clarifyCustomerResponse": "Customer Response",
"clarifyCustomerNote": "Customer Note",
"clarifyRespondedAt": "Responded on {date}",
"clarifyAwaitingResponse": "Awaiting customer response…",
"clarifyAttachedDocs": "Attached Documents"
```

Add a new top-level namespace `"orderDetail"` (alongside `"staffOrders"`, `"orders"`, etc.):

```json
"orderDetail": {
  "title": "Order Details",
  "backBtn": "← My Orders",
  "status": "Status",
  "createdAt": "Created",
  "scheduledDate": "Scheduled Date",
  "destination": "Destination",
  "driverSection": "Driver",
  "driverName": "Name",
  "driverNationalId": "National ID",
  "driverPhone": "Phone",
  "driverLicense": "License",
  "vehicleSection": "Vehicle",
  "plate": "Plate Number",
  "vehicleType": "Type",
  "makeModel": "Make / Model",
  "cargoSection": "Cargo",
  "cargoType": "Type",
  "cargoWeight": "Weight",
  "cargoDesc": "Description",
  "feesSection": "Fees",
  "baseFee": "Base Fee",
  "queueSurcharge": "Queue Surcharge",
  "cargoFee": "Cargo Fee",
  "total": "Total",
  "paymentSection": "Payment",
  "paymentMethod": "Method",
  "paymentStatus": "Status",
  "cashRef": "Cash Reference",
  "timelineSection": "Timeline",
  "clarifyAlertTitle": "Clarification Required",
  "clarifyAlertDesc": "The Finance Officer has requested additional information about your order.",
  "clarifyRequest": "What's needed:",
  "clarifyResponseSection": "Your Response",
  "clarifyNoteLabel": "Response Note",
  "clarifyNotePlaceholder": "Explain the correction or additional information…",
  "clarifyDocsLabel": "Attach Documents (optional)",
  "clarifySelectDocs": "Select from uploaded documents",
  "clarifySubmitBtn": "Submit Response",
  "clarifySubmitting": "Submitting…",
  "clarifySuccess": "Response submitted. Finance Officer will review your order shortly.",
  "clarifyFailed": "Failed to submit response. Please try again.",
  "failedToLoad": "Failed to load order details.",
  "notFound": "Order not found."
}
```

- [ ] **Step 2: Add keys to `az.json`**

In `staffOrders`, add after `"rejectFailed"`:

```json
"verifyTitle": "Sifarişi Təsdiqlə",
"checkDocuments": "Sənədlər qaydasındadır",
"checkDriverId": "Sürücü şəxsiyyəti qaydasındadır",
"checkVehicle": "Nəqliyyat məlumatları qaydasındadır",
"checkPayment": "Ödəniş təsdiqlənib",
"upgradeToPriority": "Prioritet növbəyə yüksəlt",
"internalNote": "Daxili Qeyd (istəyə bağlı)",
"internalNotePlaceholder": "Yalnız Maliyyə heyəti üçün görünən qeyd əlavə edin…",
"verifyBtn": "Təsdiqlənmiş kimi işarələ",
"verifying": "Təsdiq edilir…",
"verifySuccess": "Sifariş uğurla təsdiqləndi.",
"verifyFailed": "Sifarişi təsdiqləmək alınmadı.",
"clarifyTitle": "Aydınlaşdırma Tələb Et",
"clarifyNote": "Aydınlaşdırma Sorğusu",
"clarifyNotePlaceholder": "Müştərinin təqdim etməli və ya düzəltməli olduğunu təsvir edin…",
"clarifyBtn": "Müştəriyə Göndər",
"clarifying": "Göndərilir…",
"clarifySuccess": "Aydınlaşdırma sorğusu göndərildi.",
"clarifyFailed": "Aydınlaşdırma sorğusunu göndərmək alınmadı.",
"clarifyMaxRounds": "Maksimum 2 aydınlaşdırma dövrü çatdı. Daha çox tələb etmək mümkün deyil.",
"clarifyRoundLabel": "Aydınlaşdırma Turu {num}",
"clarifyRequestedAt": "{date} tarixində tələb edildi",
"clarifyCustomerResponse": "Müştəri Cavabı",
"clarifyCustomerNote": "Müştəri Qeydi",
"clarifyRespondedAt": "{date} tarixində cavablandı",
"clarifyAwaitingResponse": "Müştəri cavabı gözlənilir…",
"clarifyAttachedDocs": "Əlavə Edilmiş Sənədlər"
```

Add `"orderDetail"` namespace:

```json
"orderDetail": {
  "title": "Sifariş Məlumatları",
  "backBtn": "← Sifarişlərim",
  "status": "Status",
  "createdAt": "Yaradılıb",
  "scheduledDate": "Planlaşdırılmış Tarix",
  "destination": "Təyinat",
  "driverSection": "Sürücü",
  "driverName": "Ad",
  "driverNationalId": "Şəxsiyyət vəsiqəsi",
  "driverPhone": "Telefon",
  "driverLicense": "Sürücülük vəsiqəsi",
  "vehicleSection": "Nəqliyyat",
  "plate": "Dövlət nişanı",
  "vehicleType": "Növ",
  "makeModel": "Marka / Model",
  "cargoSection": "Yük",
  "cargoType": "Növ",
  "cargoWeight": "Çəki",
  "cargoDesc": "Təsvir",
  "feesSection": "Ödənişlər",
  "baseFee": "Əsas Tarif",
  "queueSurcharge": "Növbə Əlavəsi",
  "cargoFee": "Yük Tariifi",
  "total": "Cəmi",
  "paymentSection": "Ödəniş",
  "paymentMethod": "Üsul",
  "paymentStatus": "Status",
  "cashRef": "Nağd Arayış",
  "timelineSection": "Hadisələr",
  "clarifyAlertTitle": "Aydınlaşdırma Tələb Olunur",
  "clarifyAlertDesc": "Maliyyə zabiti sifarişiniz barədə əlavə məlumat tələb edib.",
  "clarifyRequest": "Nə lazımdır:",
  "clarifyResponseSection": "Cavabınız",
  "clarifyNoteLabel": "Cavab Qeydi",
  "clarifyNotePlaceholder": "Düzəlişi və ya əlavə məlumatı izah edin…",
  "clarifyDocsLabel": "Sənəd Əlavə Et (istəyə bağlı)",
  "clarifySelectDocs": "Yüklənmiş sənədlərdən seçin",
  "clarifySubmitBtn": "Cavabı Göndər",
  "clarifySubmitting": "Göndərilir…",
  "clarifySuccess": "Cavab göndərildi. Maliyyə zabiti sifarişinizi tezliklə nəzərdən keçirəcək.",
  "clarifyFailed": "Cavabı göndərmək alınmadı. Yenidən cəhd edin.",
  "failedToLoad": "Sifariş məlumatlarını yükləmək alınmadı.",
  "notFound": "Sifariş tapılmadı."
}
```

- [ ] **Step 3: Add keys to `ru.json`**

In `staffOrders`, add after `"rejectFailed"`:

```json
"verifyTitle": "Подтвердить заказ",
"checkDocuments": "Документы в порядке",
"checkDriverId": "Удостоверение водителя в порядке",
"checkVehicle": "Данные транспортного средства в порядке",
"checkPayment": "Оплата подтверждена",
"upgradeToPriority": "Перевести в приоритетную очередь",
"internalNote": "Внутренняя заметка (необязательно)",
"internalNotePlaceholder": "Добавьте заметку, видимую только сотрудникам Финансов…",
"verifyBtn": "Отметить как проверено",
"verifying": "Проверяется…",
"verifySuccess": "Заказ успешно подтверждён.",
"verifyFailed": "Не удалось подтвердить заказ.",
"clarifyTitle": "Запросить уточнение",
"clarifyNote": "Запрос уточнения",
"clarifyNotePlaceholder": "Опишите, что клиент должен предоставить или исправить…",
"clarifyBtn": "Отправить клиенту",
"clarifying": "Отправляется…",
"clarifySuccess": "Запрос уточнения отправлен.",
"clarifyFailed": "Не удалось отправить запрос уточнения.",
"clarifyMaxRounds": "Достигнут максимум 2 раунда уточнений. Дальнейшие запросы невозможны.",
"clarifyRoundLabel": "Раунд уточнения {num}",
"clarifyRequestedAt": "Запрошено {date}",
"clarifyCustomerResponse": "Ответ клиента",
"clarifyCustomerNote": "Заметка клиента",
"clarifyRespondedAt": "Ответ получен {date}",
"clarifyAwaitingResponse": "Ожидается ответ клиента…",
"clarifyAttachedDocs": "Прикреплённые документы"
```

Add `"orderDetail"` namespace:

```json
"orderDetail": {
  "title": "Детали заказа",
  "backBtn": "← Мои заказы",
  "status": "Статус",
  "createdAt": "Создан",
  "scheduledDate": "Дата выезда",
  "destination": "Назначение",
  "driverSection": "Водитель",
  "driverName": "Имя",
  "driverNationalId": "Удостоверение",
  "driverPhone": "Телефон",
  "driverLicense": "Права",
  "vehicleSection": "Транспорт",
  "plate": "Номерной знак",
  "vehicleType": "Тип",
  "makeModel": "Марка / Модель",
  "cargoSection": "Груз",
  "cargoType": "Тип",
  "cargoWeight": "Вес",
  "cargoDesc": "Описание",
  "feesSection": "Сборы",
  "baseFee": "Базовый тариф",
  "queueSurcharge": "Надбавка за очередь",
  "cargoFee": "Грузовой тариф",
  "total": "Итого",
  "paymentSection": "Оплата",
  "paymentMethod": "Метод",
  "paymentStatus": "Статус",
  "cashRef": "Кассовый код",
  "timelineSection": "История",
  "clarifyAlertTitle": "Требуется уточнение",
  "clarifyAlertDesc": "Финансовый офицер запросил дополнительную информацию по вашему заказу.",
  "clarifyRequest": "Что требуется:",
  "clarifyResponseSection": "Ваш ответ",
  "clarifyNoteLabel": "Текст ответа",
  "clarifyNotePlaceholder": "Поясните исправление или предоставьте дополнительную информацию…",
  "clarifyDocsLabel": "Прикрепить документы (необязательно)",
  "clarifySelectDocs": "Выбрать из загруженных документов",
  "clarifySubmitBtn": "Отправить ответ",
  "clarifySubmitting": "Отправляется…",
  "clarifySuccess": "Ответ отправлен. Финансовый офицер скоро рассмотрит ваш заказ.",
  "clarifyFailed": "Не удалось отправить ответ. Попробуйте ещё раз.",
  "failedToLoad": "Не удалось загрузить детали заказа.",
  "notFound": "Заказ не найден."
}
```

- [ ] **Step 4: Add keys to `tr.json`**

In `staffOrders`, add after `"rejectFailed"`:

```json
"verifyTitle": "Siparişi Doğrula",
"checkDocuments": "Belgeler uygun",
"checkDriverId": "Sürücü kimliği uygun",
"checkVehicle": "Araç bilgileri uygun",
"checkPayment": "Ödeme onaylandı",
"upgradeToPriority": "Öncelikli kuyruğa yükselt",
"internalNote": "Dahili Not (isteğe bağlı)",
"internalNotePlaceholder": "Yalnızca Finans personeline görünür not ekleyin…",
"verifyBtn": "Doğrulandı Olarak İşaretle",
"verifying": "Doğrulanıyor…",
"verifySuccess": "Sipariş başarıyla doğrulandı.",
"verifyFailed": "Sipariş doğrulanamadı.",
"clarifyTitle": "Açıklama Talep Et",
"clarifyNote": "Açıklama Talebi",
"clarifyNotePlaceholder": "Müşterinin sağlaması veya düzeltmesi gerekenleri açıklayın…",
"clarifyBtn": "Müşteriye Gönder",
"clarifying": "Gönderiliyor…",
"clarifySuccess": "Açıklama talebi gönderildi.",
"clarifyFailed": "Açıklama talebi gönderilemedi.",
"clarifyMaxRounds": "Maksimum 2 açıklama turu sınırına ulaşıldı. Daha fazla talep edilemez.",
"clarifyRoundLabel": "Açıklama Turu {num}",
"clarifyRequestedAt": "{date} tarihinde talep edildi",
"clarifyCustomerResponse": "Müşteri Yanıtı",
"clarifyCustomerNote": "Müşteri Notu",
"clarifyRespondedAt": "{date} tarihinde yanıtlandı",
"clarifyAwaitingResponse": "Müşteri yanıtı bekleniyor…",
"clarifyAttachedDocs": "Ekli Belgeler"
```

Add `"orderDetail"` namespace:

```json
"orderDetail": {
  "title": "Sipariş Detayları",
  "backBtn": "← Siparişlerim",
  "status": "Durum",
  "createdAt": "Oluşturuldu",
  "scheduledDate": "Planlanan Tarih",
  "destination": "Varış Noktası",
  "driverSection": "Sürücü",
  "driverName": "Ad",
  "driverNationalId": "Kimlik No",
  "driverPhone": "Telefon",
  "driverLicense": "Ehliyet",
  "vehicleSection": "Araç",
  "plate": "Plaka",
  "vehicleType": "Tür",
  "makeModel": "Marka / Model",
  "cargoSection": "Yük",
  "cargoType": "Tür",
  "cargoWeight": "Ağırlık",
  "cargoDesc": "Açıklama",
  "feesSection": "Ücretler",
  "baseFee": "Temel Ücret",
  "queueSurcharge": "Kuyruk Ek Ücreti",
  "cargoFee": "Yük Ücreti",
  "total": "Toplam",
  "paymentSection": "Ödeme",
  "paymentMethod": "Yöntem",
  "paymentStatus": "Durum",
  "cashRef": "Nakit Referansı",
  "timelineSection": "Geçmiş",
  "clarifyAlertTitle": "Açıklama Gerekli",
  "clarifyAlertDesc": "Finans yetkilisi siparişiniz hakkında ek bilgi talep etti.",
  "clarifyRequest": "Gerekenler:",
  "clarifyResponseSection": "Yanıtınız",
  "clarifyNoteLabel": "Yanıt Notu",
  "clarifyNotePlaceholder": "Düzeltmeyi veya ek bilgiyi açıklayın…",
  "clarifyDocsLabel": "Belge Ekle (isteğe bağlı)",
  "clarifySelectDocs": "Yüklü belgelerden seçin",
  "clarifySubmitBtn": "Yanıtı Gönder",
  "clarifySubmitting": "Gönderiliyor…",
  "clarifySuccess": "Yanıt gönderildi. Finans yetkilisi siparişinizi yakında inceleyecektir.",
  "clarifyFailed": "Yanıt gönderilemedi. Lütfen tekrar deneyin.",
  "failedToLoad": "Sipariş detayları yüklenemedi.",
  "notFound": "Sipariş bulunamadı."
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/messages/en.json apps/web/messages/az.json apps/web/messages/ru.json apps/web/messages/tr.json
git commit -m "feat(i18n): add verification flow and orderDetail keys for all 4 locales"
```

---

## Task 7: Update Finance Officer order detail page

**Files:**
- Modify: `apps/web/src/app/[locale]/(finance)/finance/orders/[orderId]/page.tsx`

- [ ] **Step 1: Extend the `OrderDetail` interface**

Replace the existing `OrderDetail` interface with:

```typescript
interface ClarificationRound {
  id: string;
  roundNumber: number;
  requestNote: string;
  requestedAt: string;
  customerNote: string | null;
  customerDocIds: string[];
  respondedAt: string | null;
  closedAt: string | null;
}

interface OrderVerification {
  checkDocumentsOk: boolean;
  checkDriverIdOk: boolean;
  checkVehicleOk: boolean;
  checkPaymentOk: boolean;
  upgradedToPriority: boolean;
  internalNote: string | null;
  verifiedAt: string | null;
}

interface OrderDetail {
  id: string;
  orderId: string;
  status: string;
  queueType: string | null;
  scheduledDate: string | null;
  destination: string;
  vehiclePlateNumber: string | null;
  vehicleMakeModel: string | null;
  transportType: string;
  driverFullName: string;
  driverNationalId: string;
  driverPhone: string;
  driverLicense: string | null;
  cargoDescription: string | null;
  cargoWeightTonnes: number | null;
  cargoType: string | null;
  paymentMethod: string;
  baseFeeAzn: number;
  cargoFeeAzn: number;
  queueSurchargeAzn: number;
  totalAmountAzn: number;
  createdAt: string;
  user: { id: string; email: string; phone: string };
  payments: Payment[];
  verification: OrderVerification | null;
  clarificationRounds: ClarificationRound[];
}
```

- [ ] **Step 2: Add state variables for verification form**

After the existing state declarations (after `const [showRejectForm, setShowRejectForm] = useState(false);`), add:

```typescript
const [checkDocumentsOk, setCheckDocumentsOk] = useState(false);
const [checkDriverIdOk, setCheckDriverIdOk] = useState(false);
const [checkVehicleOk, setCheckVehicleOk] = useState(false);
const [checkPaymentOk, setCheckPaymentOk] = useState(false);
const [upgradedToPriority, setUpgradedToPriority] = useState(false);
const [internalNote, setInternalNote] = useState('');
const [verifying, setVerifying] = useState(false);
const [clarifyNote, setClarifyNote] = useState('');
const [clarifying, setClarifying] = useState(false);
const [showClarifyForm, setShowClarifyForm] = useState(false);
```

- [ ] **Step 3: Add `handleVerify` and `handleClarify` handlers**

Add after `handleReject`:

```typescript
const handleVerify = async () => {
  if (!order) return;
  setVerifying(true);
  setActionMsg(null);
  try {
    await apiClient.post(`/orders/${order.orderId}/verify`, {
      checkDocumentsOk,
      checkDriverIdOk,
      checkVehicleOk,
      checkPaymentOk,
      upgradedToPriority,
      internalNote: internalNote.trim() || undefined,
    });
    setActionMsg({ type: 'success', text: t('verifySuccess') });
    loadOrder();
  } catch {
    setActionMsg({ type: 'error', text: t('verifyFailed') });
  } finally {
    setVerifying(false);
  }
};

const handleClarify = async () => {
  if (!order || !clarifyNote.trim()) return;
  setClarifying(true);
  setActionMsg(null);
  try {
    await apiClient.post(`/orders/${order.orderId}/clarify`, { requestNote: clarifyNote.trim() });
    setActionMsg({ type: 'success', text: t('clarifySuccess') });
    setClarifyNote('');
    setShowClarifyForm(false);
    loadOrder();
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
    setActionMsg({ type: 'error', text: msg ?? t('clarifyFailed') });
  } finally {
    setClarifying(false);
  }
};
```

- [ ] **Step 4: Add the verification action panel to the JSX**

After the existing `{canConfirm && (...)}` block and before the `<div className="grid ...">`, add:

```tsx
{/* Verification Panel — shown when AWAITING_VERIFICATION */}
{order.status === 'AWAITING_VERIFICATION' && (
  <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl space-y-5">
    <p className="font-semibold text-blue-800 text-sm">{t('verifyTitle')}</p>

    {/* Checklist */}
    <div className="space-y-2">
      {[
        { key: 'checkDocuments', value: checkDocumentsOk, setter: setCheckDocumentsOk },
        { key: 'checkDriverId', value: checkDriverIdOk, setter: setCheckDriverIdOk },
        { key: 'checkVehicle', value: checkVehicleOk, setter: setCheckVehicleOk },
        { key: 'checkPayment', value: checkPaymentOk, setter: setCheckPaymentOk },
      ].map(({ key, value, setter }) => (
        <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => setter(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          {t(key as keyof typeof t)}
        </label>
      ))}
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={upgradedToPriority}
          onChange={(e) => setUpgradedToPriority(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        {t('upgradeToPriority')}
      </label>
    </div>

    {/* Internal note */}
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-600">{t('internalNote')}</label>
      <textarea
        value={internalNote}
        onChange={(e) => setInternalNote(e.target.value)}
        rows={2}
        placeholder={t('internalNotePlaceholder')}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
      />
    </div>

    <div className="flex gap-3 flex-wrap">
      <button
        onClick={handleVerify}
        disabled={verifying || !checkDocumentsOk || !checkDriverIdOk || !checkVehicleOk || !checkPaymentOk}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {verifying ? '…' : t('verifyBtn')}
      </button>
      <button
        onClick={() => setShowClarifyForm(!showClarifyForm)}
        className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors"
      >
        {t('clarifyTitle')}
      </button>
    </div>

    {/* Clarification sub-form */}
    {showClarifyForm && (
      <div className="space-y-2 pt-2 border-t border-blue-100">
        {order.clarificationRounds.length >= 2 ? (
          <p className="text-xs text-red-600">{t('clarifyMaxRounds')}</p>
        ) : (
          <>
            <label className="block text-xs font-medium text-gray-600">{t('clarifyNote')}</label>
            <textarea
              value={clarifyNote}
              onChange={(e) => setClarifyNote(e.target.value)}
              rows={3}
              placeholder={t('clarifyNotePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
            <button
              onClick={handleClarify}
              disabled={clarifying || !clarifyNote.trim()}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {clarifying ? '…' : t('clarifyBtn')}
            </button>
          </>
        )}
      </div>
    )}
  </div>
)}

{/* Clarification Status Panel — shown when AWAITING_CLARIFICATION */}
{order.status === 'AWAITING_CLARIFICATION' && order.clarificationRounds.length > 0 && (() => {
  const openRound = order.clarificationRounds[order.clarificationRounds.length - 1];
  return (
    <div className="p-5 bg-orange-50 border border-orange-200 rounded-xl space-y-3">
      <p className="font-semibold text-orange-800 text-sm">
        {t('clarifyRoundLabel', { num: openRound.roundNumber })}
      </p>
      <div className="text-sm text-gray-700">
        <span className="font-medium text-gray-500 text-xs block mb-1">{t('clarifyNote')}</span>
        {openRound.requestNote}
      </div>
      <p className="text-xs text-gray-400">
        {t('clarifyRequestedAt', { date: new Date(openRound.requestedAt).toLocaleString() })}
      </p>
      {openRound.respondedAt ? (
        <div className="space-y-1 pt-2 border-t border-orange-100">
          <p className="text-xs font-medium text-gray-500">{t('clarifyCustomerResponse')}</p>
          {openRound.customerNote && (
            <p className="text-sm text-gray-700">{openRound.customerNote}</p>
          )}
          <p className="text-xs text-gray-400">
            {t('clarifyRespondedAt', { date: new Date(openRound.respondedAt).toLocaleString() })}
          </p>
        </div>
      ) : (
        <p className="text-xs text-orange-600 italic">{t('clarifyAwaitingResponse')}</p>
      )}
    </div>
  );
})()}
```

- [ ] **Step 5: Verify in browser**

Navigate to http://localhost:3000/en/finance/orders — click an order in `AWAITING_VERIFICATION` status. Confirm the verification checklist and clarification sub-form appear.

- [ ] **Step 6: Commit**

```bash
git add "apps/web/src/app/[locale]/(finance)/finance/orders/[orderId]/page.tsx"
git commit -m "feat(finance): add order verification and clarification panels to FO order detail page"
```

---

## Task 8: Create customer order detail page

**Files:**
- Create: `apps/web/src/app/[locale]/(customer)/customer/orders/[orderId]/page.tsx`

- [ ] **Step 1: Create the file**

Create `apps/web/src/app/[locale]/(customer)/customer/orders/[orderId]/page.tsx` with:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';

interface Document {
  id: string;
  documentType: string;
  originalName: string;
}

interface Payment {
  id: string;
  method: string;
  status: string;
  amountAzn: number;
  cashReferenceCode: string | null;
  confirmedAt: string | null;
}

interface TimelineEvent {
  id: string;
  actor: string;
  event: string;
  note: string | null;
  createdAt: string;
}

interface ClarificationRound {
  id: string;
  roundNumber: number;
  requestNote: string;
  requestedAt: string;
  customerNote: string | null;
  customerDocIds: string[];
  respondedAt: string | null;
}

interface OrderDetail {
  id: string;
  orderId: string;
  status: string;
  queueType: string | null;
  scheduledDate: string | null;
  destination: string;
  driverFullName: string;
  driverNationalId: string;
  driverPhone: string;
  driverLicense: string | null;
  transportType: string;
  vehiclePlateNumber: string | null;
  vehicleMakeModel: string | null;
  cargoType: string | null;
  cargoWeightTonnes: number | null;
  cargoDescription: string | null;
  paymentMethod: string;
  baseFeeAzn: number;
  cargoFeeAzn: number;
  queueSurchargeAzn: number;
  totalAmountAzn: number;
  createdAt: string;
  documents: Document[];
  payments: Payment[];
  timeline: TimelineEvent[];
  clarificationRounds: ClarificationRound[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-700',
  AWAITING_VERIFICATION: 'bg-blue-100 text-blue-700',
  AWAITING_CLARIFICATION: 'bg-orange-100 text-orange-700',
  VERIFIED: 'bg-purple-100 text-purple-700',
  IN_SHIPMENT: 'bg-cyan-100 text-cyan-700',
  BORDER_PASSED: 'bg-teal-100 text-teal-700',
  AT_TERMINAL: 'bg-indigo-100 text-indigo-700',
  LOADED: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-red-100 text-red-700',
};

export default function CustomerOrderDetailPage() {
  const locale = useLocale();
  const router = useRouter();
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const t = useTranslations('orderDetail');

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Clarification response form state
  const [clarifyNote, setClarifyNote] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadOrder = () => {
    apiClient
      .get<{ data: OrderDetail }>(`/orders/${orderId}`)
      .then((res) => setOrder(res.data.data))
      .catch(() => setError(t('failedToLoad')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadOrder(); }, [orderId]);

  const handleRespond = async () => {
    if (!order || !clarifyNote.trim()) return;
    setSubmitting(true);
    setActionMsg(null);
    try {
      await apiClient.post(`/orders/${order.orderId}/clarify/respond`, {
        customerNote: clarifyNote.trim(),
        customerDocIds: selectedDocIds,
      });
      setActionMsg({ type: 'success', text: t('clarifySuccess') });
      setClarifyNote('');
      setSelectedDocIds([]);
      loadOrder();
    } catch {
      setActionMsg({ type: 'error', text: t('clarifyFailed') });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDoc = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId],
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-pob-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !order) return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <p className="text-red-600 text-sm">{error ?? t('notFound')}</p>
    </div>
  );

  const openRound = order.clarificationRounds.find((r) => !r.respondedAt) ?? null;
  const payment = order.payments[0] ?? null;

  const row = (label: string, value: string | null | undefined) => value ? (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-500 w-40 shrink-0">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  ) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/${locale}/customer/orders`)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          {t('backBtn')}
        </button>
        <h1 className="text-xl font-bold text-gray-900 font-mono">{order.orderId}</h1>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {order.status.replace(/_/g, ' ')}
        </span>
      </div>

      {actionMsg && (
        <div className={`p-3 rounded-xl text-sm ${actionMsg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {actionMsg.text}
        </div>
      )}

      {/* Clarification Alert — shown when AWAITING_CLARIFICATION with an open round */}
      {order.status === 'AWAITING_CLARIFICATION' && openRound && (
        <div className="p-5 bg-orange-50 border border-orange-200 rounded-xl space-y-4">
          <div>
            <p className="font-semibold text-orange-800">{t('clarifyAlertTitle')}</p>
            <p className="text-sm text-orange-700 mt-1">{t('clarifyAlertDesc')}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">{t('clarifyRequest')}</p>
            <p className="text-sm text-gray-800 bg-white border border-orange-100 rounded-lg px-3 py-2">
              {openRound.requestNote}
            </p>
          </div>

          {/* Response form */}
          <div className="space-y-3 pt-3 border-t border-orange-100">
            <p className="font-medium text-sm text-gray-700">{t('clarifyResponseSection')}</p>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600">{t('clarifyNoteLabel')}</label>
              <textarea
                value={clarifyNote}
                onChange={(e) => setClarifyNote(e.target.value)}
                rows={3}
                placeholder={t('clarifyNotePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              />
            </div>

            {order.documents.length > 0 && (
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">{t('clarifyDocsLabel')}</label>
                <div className="space-y-1">
                  {order.documents.map((doc) => (
                    <label key={doc.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDocIds.includes(doc.id)}
                        onChange={() => toggleDoc(doc.id)}
                        className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                      />
                      <span className="text-xs text-gray-500 uppercase">{doc.documentType.replace(/_/g, ' ')}</span>
                      <span>{doc.originalName}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleRespond}
              disabled={submitting || !clarifyNote.trim()}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? t('clarifySubmitting') : t('clarifySubmitBtn')}
            </button>
          </div>
        </div>
      )}

      {/* Order info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">{t('driverSection')}</h2>
          {row(t('driverName'), order.driverFullName)}
          {row(t('driverNationalId'), order.driverNationalId)}
          {row(t('driverPhone'), order.driverPhone)}
          {row(t('driverLicense'), order.driverLicense)}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">{t('vehicleSection')}</h2>
          {row(t('plate'), order.vehiclePlateNumber)}
          {row(t('vehicleType'), order.transportType.replace(/_/g, ' '))}
          {row(t('makeModel'), order.vehicleMakeModel)}
          {row(t('destination'), order.destination)}
          {row(t('scheduledDate'), order.scheduledDate ? new Date(order.scheduledDate).toLocaleDateString() : null)}
        </div>

        {(order.cargoType || order.cargoWeightTonnes || order.cargoDescription) && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
            <h2 className="font-semibold text-gray-800 text-sm mb-3">{t('cargoSection')}</h2>
            {row(t('cargoType'), order.cargoType?.replace(/_/g, ' ') ?? null)}
            {row(t('cargoWeight'), order.cargoWeightTonnes ? `${order.cargoWeightTonnes} tonnes` : null)}
            {row(t('cargoDesc'), order.cargoDescription)}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">{t('feesSection')}</h2>
          {row(t('baseFee'), `${Number(order.baseFeeAzn).toFixed(2)} AZN`)}
          {row(t('queueSurcharge'), `${Number(order.queueSurchargeAzn).toFixed(2)} AZN`)}
          {row(t('cargoFee'), `${Number(order.cargoFeeAzn).toFixed(2)} AZN`)}
          <div className="flex gap-2 text-sm border-t border-gray-100 pt-2 mt-2">
            <span className="text-gray-500 w-40 shrink-0 font-semibold">{t('total')}</span>
            <span className="text-gray-900 font-bold">{Number(order.totalAmountAzn).toFixed(2)} AZN</span>
          </div>
        </div>

        {payment && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
            <h2 className="font-semibold text-gray-800 text-sm mb-3">{t('paymentSection')}</h2>
            {row(t('paymentMethod'), payment.method.replace(/_/g, ' '))}
            {row(t('paymentStatus'), payment.status.replace(/_/g, ' '))}
            {payment.cashReferenceCode && row(t('cashRef'), payment.cashReferenceCode)}
          </div>
        )}
      </div>

      {/* Timeline */}
      {order.timeline.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 text-sm mb-4">{t('timelineSection')}</h2>
          <ol className="space-y-3">
            {order.timeline.map((ev) => (
              <li key={ev.id} className="flex gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-pob-blue mt-1.5 shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">{ev.event.replace(/_/g, ' ')}</p>
                  {ev.note && <p className="text-gray-500 text-xs">{ev.note}</p>}
                  <p className="text-gray-400 text-xs">{new Date(ev.createdAt).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify page renders**

Navigate to http://localhost:3000/en/customer/orders — the orders list should still load. Manually navigate to `http://localhost:3000/en/customer/orders/<an-order-id>` (use one from the list). Confirm the page loads with order details.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/[locale]/(customer)/customer/orders/[orderId]/page.tsx"
git commit -m "feat(customer): create order detail page with clarification response form"
```

---

## Task 9: Add "View" link on customer orders list

**Files:**
- Modify: `apps/web/src/app/[locale]/(customer)/customer/orders/page.tsx`

- [ ] **Step 1: Add a "View" link for all orders**

In `customer/orders/page.tsx`, find the `<td className="px-4 py-3">` that contains the edit/cancel buttons for `PENDING_PAYMENT`. The wrapping `<tr>` does not have an `onClick`. Add a "View" button as the last element in the actions `<td>` for all orders, or simply make the row clickable.

Replace the entire actions `<td>`:

```tsx
<td className="px-4 py-3">
  <div className="flex items-center gap-2">
    <button
      onClick={() => router.push(`/${locale}/customer/orders/${order.orderId}`)}
      className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
    >
      View
    </button>
    {order.status === 'PENDING_PAYMENT' && (
      <>
        <button
          onClick={() => router.push(`/${locale}/customer/orders/${order.orderId}/edit`)}
          className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
        >
          {t('editBtn')}
        </button>
        {confirmingId === order.orderId ? (
          <span className="flex items-center gap-1.5 text-xs text-red-700">
            {t('cancelConfirm')}
            <button
              onClick={() => handleCancelConfirm(order.orderId)}
              disabled={cancellingId === order.orderId}
              className="underline font-medium"
            >
              {t('cancelBtn')}
            </button>
            <button onClick={() => setConfirmingId(null)} className="text-gray-500 underline">✕</button>
          </span>
        ) : (
          <button
            onClick={() => handleCancelClick(order.orderId)}
            disabled={cancellingId === order.orderId}
            className="text-xs px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-md transition-colors disabled:opacity-50"
          >
            {cancellingId === order.orderId ? '…' : t('cancelBtn')}
          </button>
        )}
      </>
    )}
    {order.status === 'AWAITING_CLARIFICATION' && (
      <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium animate-pulse">
        Action needed
      </span>
    )}
  </div>
</td>
```

- [ ] **Step 2: Verify in browser**

Navigate to http://localhost:3000/en/customer/orders — confirm a "View" button appears on all rows. For any `AWAITING_CLARIFICATION` order, an orange "Action needed" badge also appears. Clicking "View" navigates to the order detail page.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/[locale]/(customer)/customer/orders/page.tsx"
git commit -m "feat(customer): add View link and AWAITING_CLARIFICATION indicator on orders list"
```

---

## Self-Review

**Spec coverage check:**
- ✅ `OrderClarificationRound` schema (Task 1)
- ✅ `verifyOrder` — checklist, upsert verification, VERIFIED transition, close open round (Task 2)
- ✅ `requestClarification` — max-2 guard, round creation, AWAITING_CLARIFICATION transition (Task 3)
- ✅ `respondToClarification` — ownership check, open round lookup, AWAITING_VERIFICATION transition (Task 4)
- ✅ 3 new controller endpoints with correct role guards (Task 5)
- ✅ i18n for all 4 locales, both namespaces (Task 6)
- ✅ FO verification panel + clarification display (Task 7)
- ✅ Customer order detail page with response form (Task 8)
- ✅ Customer list "View" link + clarification indicator (Task 9)
- ✅ Error cases: 400 on wrong status, 403 on ownership, 400 on max rounds, 404 on missing round

**Type consistency check:**
- `ClarificationRound.customerDocIds` is `string[]` in both the Prisma model and all frontend interfaces ✅
- `verifyOrder` method signature matches controller's `Parameters<OrdersService['verifyOrder']>[2]` ✅
- `findByOrderId` now includes `clarificationRounds` and `verification` — both interfaces in Task 7 and Task 8 declare these fields ✅
- `openRound` is found via `.find((r) => !r.respondedAt)` in customer page — matches `respondedAt: null` query in service ✅
