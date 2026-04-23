# POB EQP — Claude Code Guide

## Project Overview
Port of Baku E-Queue Platform. Turborepo monorepo managing electronic queue for ferry cargo operations at the Port of Baku, Azerbaijan.

## Stack
| Layer | Technology |
|---|---|
| API | NestJS 10, Prisma 5, PostgreSQL 16, Redis 7, Socket.io |
| Web | Next.js 14 (App Router), TypeScript, Tailwind CSS, next-intl |
| Shared | `packages/shared` — enums, types, constants |
| Infra | Docker Compose (dev) |

## Repo Structure
```
pob-eqp/
├── apps/
│   ├── api/                        # NestJS API (port 3001)
│   │   ├── prisma/schema.prisma    # Single source of truth for DB
│   │   ├── prisma/seed.ts          # Seeds SystemConfig, parking, admin users
│   │   └── src/modules/           # Feature modules (see below)
│   └── web/                        # Next.js 14 App Router (port 3000)
│       ├── messages/               # i18n: az.json, en.json, ru.json, tr.json
│       └── src/
│           ├── app/[locale]/       # Route groups per portal
│           ├── components/         # Shared UI components
│           ├── store/              # Zustand stores (auth, registration)
│           └── lib/               # api-client (Axios + auto-refresh)
└── packages/
    └── shared/                     # Enums, types, constants — imported by both apps
```

## API Modules (`apps/api/src/modules/`)
- `auth` — JWT login/refresh, OTP, email verification, account status gating
- `registration` — individual + legal entity registration, Finance review flow
- `orders` — order creation, management, FIFO queue slot assignment
- `payment` — card, bank transfer, cash payment flows
- `planning` — operational plans, day quota management, weather integration
- `shipment` — manifest, vessel, gate, terminal operations
- `parking` — zone and slot management
- `queue` — real-time queue state (Socket.io)
- `files` — document upload (stored locally, S3 key tracked in DB)
- `notifications` — in-app, push, email, SMS channels
- `reporting` — daily snapshots
- `support` — support tickets
- `admin` — user/system administration

## Web Portals (`apps/web/src/app/[locale]/`)
| Route Group | Pages |
|---|---|
| `(auth)` | login, register (individual/legal/documents), verify, forgot-password |
| `(customer)` | dashboard, orders (list + new), profile |
| `(finance)` | dashboard, registrations (list + detail), orders (list + detail — Finance Officer verification) |
| `(admin)` | dashboard, planning, users, system |
| `(operations)` | dashboard, gate, parking, border, terminal |

## Role → Redirect Map
| Role | Portal |
|---|---|
| `CUSTOMER_INDIVIDUAL`, `CUSTOMER_LEGAL` | `/customer/dashboard` |
| `FINANCE_OFFICER` | `/finance/dashboard` |
| `ADMINISTRATOR` | `/admin/dashboard` |
| `SYSTEM_ADMINISTRATOR` | `/admin/system` |
| `CONTROL_TOWER_OPERATOR` | `/operations/dashboard` |
| `GATE_CONTROLLER` | `/operations/gate` |
| `PARKING_CONTROLLER` | `/operations/parking` |
| `BORDER_OFFICER` | `/operations/border` |
| `TERMINAL_OPERATOR` | `/operations/terminal` |

## Key Business Rules
- Queue split: **Priority 10% · Fast-Track 10% · Regular 80%** (in `QUEUE_DEFAULTS`)
- FIFO ordering by `paymentConfirmedAt` (server-generated, immutable)
- No-show timer: **30 minutes** → automatic fine
- Slot reservation hold: **15 minutes**
- Account lockout: **5 failed attempts → 15-minute lockout**
- Hazardous cargo → Zone C parking only
- Legal entity registration: Finance Officer review required (max 2 clarification cycles)
- Manifest PDF is **immutable** after `GENERATED` status
- Data retention: **7 years** (soft-delete via `deletedAt`)
- After email verification: individual → `ACTIVE`, legal → `PENDING_REVIEW`
- Login blocked for: `PENDING_EMAIL`, `PENDING_REVIEW`, `DEACTIVATED` statuses

## Shared Package Constants (`packages/shared`)
- `AUTH_CONSTANTS` — token expiry, lockout, bcrypt cost
- `QUEUE_DEFAULTS` — quota percentages, default daily quota (1000)
- `SLOT_RESERVATION` — hold/payment timeout minutes
- `NO_SHOW` — timer minutes
- `FILE_LIMITS` — max sizes, accepted MIME types
- `ORDER_CONSTANTS` — ID prefix (`POB-ORD-`), SLA days
- `WEATHER_THRESHOLDS` — wind/wave/precipitation block thresholds
- `SUPPORTED_LOCALES` — `['az', 'en', 'ru', 'tr']`

## API Client (Web)
- `apps/web/src/lib/api-client.ts` — Axios instance with:
  - Token attached from Zustand store persisted in `localStorage` key `pob-auth`
  - Auto-refresh on 401 via `/auth/refresh`
  - Redirects to `/login` on refresh failure

## Docker Dev Workflow
```bash
docker compose up --build          # First start
docker compose exec -w /app/apps/api api npx prisma db push   # Apply schema
docker compose exec -w /app/apps/api api npm run db:seed      # Seed data
docker compose restart api         # After source file changes
docker compose logs api | grep "DEV ONLY"   # Find OTP codes in dev
```

## Prisma Schema Changes
- `prisma/` is NOT volume-mounted — editing `schema.prisma` locally has NO effect in the container
- After editing `schema.prisma`, always copy it in first:
  ```bash
  docker cp apps/api/prisma/schema.prisma pob-api:/app/apps/api/prisma/schema.prisma
  docker compose exec -w /app/apps/api api npx prisma db push
  ```
- Verify table creation: `docker compose exec postgres psql -U pob_user -d pob_eqp -c "\dt <table>"`

## Seeded Credentials
| Role | Email | Password |
|---|---|---|
| Administrator | `admin@portofbaku.az` | `Admin@1234!` |
| System Administrator | `sysadmin@portofbaku.az` | `SysAdmin@1234!` |
| Finance Officer | `finance@portofbaku.az` | `Finance@1234!` |
| Gate Controller | `gate@portofbaku.az` | `Gate@1234!` |
| Parking Controller | `parking@portofbaku.az` | `Parking@1234!` |

## Service URLs
- Web: http://localhost:3000
- API: http://localhost:3001
- Swagger: http://localhost:3001/api/docs
- MailHog (dev email): http://localhost:8025

## Development Notes
- No real email/SMS in dev — OTP codes printed to API logs (`[DEV ONLY]`)
- Document uploads stored locally (not real S3 in dev); `s3Key` field is just a path
- All API responses wrapped in standard envelope; check actual response shape before assuming
- Guards: `JwtAuthGuard` + `RolesGuard` + `@Roles(...)` on all protected endpoints
- `req.user` shape: `{ id: string; role: string; accountStatus: string }` — always use `req.user.id` (not `.sub`)
- No tests exist; `jest` exits code 1 with "No tests found" — expected, not a failure
- NestJS route ordering: register specific sub-path routes (e.g. `/:id/clarify/respond`) BEFORE generic ones (e.g. `/:id/clarify`) to avoid shadowing
