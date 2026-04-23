# Port of Baku — E-Queue Platform (POB EQP)

Turborepo monorepo powering the Port of Baku electronic queue management system.

---

## Stack

| Layer | Technology |
|---|---|
| API | NestJS 10, Prisma 5, PostgreSQL 16, Redis 7, Socket.io |
| Web | Next.js 14 (App Router), TypeScript, Tailwind CSS, next-intl |
| Shared | `packages/shared` — enums, types, constants |
| Infra | Docker Compose (dev), ts-node (API runtime) |

---

## Quick Start

### 1. Copy environment file

```bash
cp .env.example .env
```

The defaults in `.env.example` work out-of-the-box for local Docker development.
Only the JWT secrets **must** be set before first run:

```bash
# Generate two secure secrets and paste them into .env
openssl rand -base64 64   # → JWT_SECRET
openssl rand -base64 64   # → JWT_REFRESH_SECRET
```

### 2. Start all services

```bash
docker compose up --build
```

First build takes ~3–5 minutes. Subsequent starts are faster.

### 3. Apply schema & seed database

Run these **once** after the first `docker compose up` (or after wiping volumes):

```bash
# Push Prisma schema to Postgres (creates all tables)
docker compose exec -w /app/apps/api api npx prisma db push

# Seed default data (SystemConfig, parking zones/slots, admin users)
docker compose exec -w /app/apps/api api npm run db:seed
```

---

## Service URLs

| Service | URL |
|---|---|
| Web (Next.js) | http://localhost:3000 |
| API (NestJS) | http://localhost:3001 |
| Swagger UI | http://localhost:3001/api/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

---

## Seeded Credentials

These accounts are created by `npm run db:seed`. Use them to log in immediately.

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@portofbaku.az` | `Admin@1234!` |
| System Administrator | `sysadmin@portofbaku.az` | `SysAdmin@1234!` |
| Finance Officer | `finance@portofbaku.az` | `Finance@1234!` |
gate@portofbaku.az / Gate@1234! → GATE_CONTROLLER
  - parking@portofbaku.az / Parking@1234! → PARKING_CONTROLLER

> **Note:** All passwords follow the pattern `Role@1234!`. Bcrypt cost 12 (BRD requirement).

---

## Docker Commands

### Start / Stop

```bash
# Start all services (foreground, with logs)
docker compose up

# Start all services (background / detached)
docker compose up -d

# Start and rebuild images (use after code changes to Dockerfile or package.json)
docker compose up --build

# Stop all services (keep volumes)
docker compose down

# Stop all services AND delete volumes (wipes database)
docker compose down -v
```

### Logs

```bash
# All services
docker compose logs -f

# API only (live)
docker compose logs api -f

# Last 50 lines of API logs
docker compose logs api --tail=50

# Find OTP codes in logs (registration / forgot-password)
docker compose logs api | grep "DEV ONLY"
```

### Database

```bash
# Apply Prisma schema to database (idempotent)
docker compose exec -w /app/apps/api api npx prisma db push

# Run seed (SystemConfig defaults, parking zones, admin users)
docker compose exec -w /app/apps/api api npm run db:seed

# Open Prisma Studio (database GUI) — runs on host port 5555
docker compose exec -w /app/apps/api api npx prisma studio

# Connect to Postgres directly
docker compose exec postgres psql -U pob_user -d pob_eqp

# Run a quick SQL query
docker compose exec postgres psql -U pob_user -d pob_eqp -c "SELECT email, role, account_status FROM users LIMIT 10;"

# View latest OTP tokens
docker compose exec postgres psql -U pob_user -d pob_eqp -c "SELECT identifier, purpose, expires_at, used_at FROM otp_tokens ORDER BY created_at DESC LIMIT 5;"
```

### Restart / Rebuild

```bash
# Restart API only (picks up source file changes — no rebuild needed)
docker compose restart api

# Restart web only
docker compose restart web

# Full rebuild of a single service
docker compose up --build api -d

# Remove all containers, images, and volumes (nuclear reset)
docker compose down -v --rmi all
```

### Shell Access

```bash
# Open shell inside API container
docker compose exec -w /app/apps/api api sh

# Open shell inside web container
docker compose exec web sh

# Open Postgres shell
docker compose exec postgres psql -U pob_user -d pob_eqp
```

---

## Development Workflow

### After changing API source files

```bash
docker compose restart api
```

Source files are volume-mounted (`./apps/api/src` → `/app/apps/api/src`), so a restart is enough — no rebuild required.

### After changing `package.json` or `Dockerfile`

```bash
docker compose up --build api -d
```

### After changing Prisma schema (`schema.prisma`)

```bash
docker compose exec -w /app/apps/api api npx prisma db push
docker compose restart api
```

### After changing shared package (`packages/shared`)

```bash
docker compose restart api
docker compose restart web
```

---

## Finding OTP Codes (Development)

No real email/SMS is sent in development. OTP codes are printed to the API log:

```bash
docker compose logs api | grep "DEV ONLY"
```

Example output:
```
[RegistrationService] [DEV ONLY] OTP for user@example.com: 482916
[AuthService]         [DEV ONLY] OTP for user@example.com: 391847
```

---

## Role-Based Redirects After Login

| Role | Redirects To |
|---|---|
| `CUSTOMER_INDIVIDUAL` | `/customer/dashboard` |
| `CUSTOMER_LEGAL` | `/customer/dashboard` |
| `FINANCE_OFFICER` | `/finance/dashboard` |
| `ADMINISTRATOR` | `/admin/dashboard` |
| `SYSTEM_ADMINISTRATOR` | `/admin/system` |
| `CONTROL_TOWER_OPERATOR` | `/operations/dashboard` |
| `GATE_CONTROLLER` | `/operations/gate` |
| `PARKING_CONTROLLER` | `/operations/parking` |
| `BORDER_OFFICER` | `/operations/border` |
| `TERMINAL_OPERATOR` | `/operations/terminal` |

---

## Project Structure

```
pob-eqp/
├── apps/
│   ├── api/                  # NestJS API
│   │   ├── prisma/
│   │   │   ├── schema.prisma # Single source of truth for DB schema
│   │   │   └── seed.ts       # Default data seeder
│   │   └── src/
│   │       └── modules/      # auth, registration, orders, payment, queue, …
│   └── web/                  # Next.js 14 App Router
│       ├── messages/         # i18n: az.json, en.json, ru.json, tr.json
│       └── src/
│           ├── app/[locale]/ # All pages (route groups by portal)
│           ├── components/   # Shared UI components
│           ├── store/        # Zustand stores (auth, registration)
│           └── lib/          # api-client (Axios + auto-refresh)
└── packages/
    └── shared/               # Enums, types, constants shared by api + web
```

---

## Environment Variables Reference

See `.env.example` for the full list with descriptions. Key variables:

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | — | **Required.** Access token signing secret |
| `JWT_REFRESH_SECRET` | — | **Required.** Refresh token signing secret |
| `DATABASE_URL` | postgres://... | Full Prisma connection string |
| `REDIS_PASSWORD` | `redis_secret` | Redis auth password |
| `POSTGRES_PASSWORD` | `pob_secret` | Postgres password |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api/v1` | API base URL for browser |

---

## BRD Business Rules (Key)

- Queue split: **Priority 10% · Fast-Track 10% · Regular 80%**
- FIFO ordering by `paymentConfirmedAt` (server-generated, immutable)
- No-show timer: **30 minutes** → automatic fine
- Slot reservation timer: **15 minutes** visible on all order steps
- Account lockout: **5 failed attempts** → **15-minute** lockout
- Hazardous cargo → **Zone C** parking only
- Legal entity registration requires **Finance Officer review** (max 2 cycles)
- Manifest PDF is **immutable** after `GENERATED` status
- Data retention: **7 years** (soft-delete via `deletedAt`)
