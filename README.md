# Haramaya Trip — University Transportation Platform

**Haramaya Trip** is the transportation scheduling, booking, ticket issuance, and departure management platform for Haramaya University.

It connects Main Campus, HIT Campus, and Station Campus with regional destinations using capacity-controlled bookings, signed QR tickets, and staff check-in.

---

## Technology Stack

- **Framework**: Next.js 16.4.3 (App Router, React 19.3.0)
- **Database**: PostgreSQL 14+
- **ORM**: Prisma 8 (`@prisma/orm-postgres` with static contract architecture)
- **Styling**: Tailwind CSS 4.0 (Haramaya green with restrained blue and neutral surfaces)
- **Type Safety**: TypeScript 5.x
- **PWA**: Web App Manifest and public-asset caching; tickets require a live connection for verification

---

## System Invariants & Guarantees

1. **Finite Physical Fleet Invariant**: Transportation cannot be confirmed without backing physical vehicle capacity. Physical vehicles can never be oversold.
2. **Deterministic FIFO Allocation**: Confirmed travelers are sequentially allocated to physical vehicles using persisted PostgreSQL timestamps (`reviewedAt || createdAt` ASC, RFC-9562 UUIDv7 ASC).
3. **Hold vs. Payment Deadline**:
   - 10-minute temporary seat hold: released automatically if payment proof is not submitted.
   - 30-minute global payment deadline: protects submitted proofs under station review; releases capacity if rejected or unpaid.
4. **12-Hour Cancellation Cutoff**: Non-administrative travelers may only cancel bookings at least 12 hours prior to scheduled departure. Cancellations $>12$h release capacity, delete tickets, and record refund requests.
5. **Gate Security**: Cryptographic ticket tokens, wrong-trip gate scan prevention, duplicate boarding prevention, and mandatory staff physical ID inspection before check-in.

---

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL 14.x or higher running locally or hosted
- npm (Node Package Manager)

### 1. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure `DATABASE_URL` for the transportation database and set a unique `AUTH_SECRET` in `.env`. The seed command also requires your own `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` values:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/university_transport"
AUTH_SECRET="your-unique-random-secret"
SEED_ADMIN_EMAIL="your-admin@example.edu"
SEED_ADMIN_PASSWORD="your-own-long-password"
```

### 2. Database Contract & Schema

Emit the Prisma 8 contract definition from your database:

```bash
npm run contract:emit
```

### 3. Seed Reference Data (Optional Development Step)

Populate reference locations, routes, vehicles, and your local administrator account:

```bash
npm run seed
```

> **Note**: Seeding is an explicit development command. It refuses to run when `NODE_ENV=production`, creates no sample events, trips, bookings, passengers, or shared demo accounts, and requires a locally chosen administrator credential. Create operational events and trips in the application.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Verification & Quality Gates

The platform includes a comprehensive 59-assertion automated regression suite validating finite capacity, concurrency locking, FIFO allocation, QR security, RBAC, and cancellation rules:

```bash
# 1. Run Complete Domain Regression Suite (59 Tests)
npm test

# 2. TypeScript Compilation Check
npx tsc --noEmit

# 3. ESLint Code Quality Check
npm run lint

# 4. Production Application Build
npm run build
```

---

## Deployment & Production Blockers

Before production hosting:

1. **Persistent Upload Storage**: Payment proofs are currently buffered locally in `./storage/proofs`. In hosted multi-instance production (e.g. AWS, Vercel, Railway), this must be backed by a persistent private object storage bucket (e.g., S3, Cloudflare R2) with signed URLs.
2. **Hosted PostgreSQL**: Ensure connection pooling (e.g., PgBouncer / Neon pooler) is configured in `DATABASE_URL` with SSL mode enabled.
3. **Payment instructions**: No official transfer destination is configured in the app. University Transport must provide and publish its payment details before accepting live bookings.
4. **HTTPS / Secure Context**: Camera scanning hardware and PWA service workers require a valid HTTPS certificate or secure localhost context.
5. **Offline tickets**: not supported. Ticket pages and staff verification require a live connection; the service worker never caches authenticated ticket or verification data.

---

## Role-Based Access Reference

| Role | Console Route | Primary Capabilities |
|---|---|---|
| **Traveler** | `/` | Search routes, book group seats, submit payment proof, view confirmed tickets online |
| **Gate Staff** | `/staff` | View today's departures, camera QR scanner, passenger ID verification, check-in console |
| **Administrator** | `/admin` | Review payment receipts, manage fleet vehicles, schedule trips, route management, audit trail |

---

## License

Proprietary — Haramaya University Transportation Services.
