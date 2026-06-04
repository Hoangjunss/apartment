# 🏢 QLCHDC — Serviced Apartment Management System

> Internal management system for building operation staff (Admin, Manager, Receptionist, Technician).  
> Architecture: **Monorepo** + **Event-Driven** + **Real-time Socket.io**.

---

## 📐 Module Overview

The system covers the complete business lifecycle of serviced apartment management:

| Business Problem | Module |
|-----------------|--------|
| Staff authentication & authorization | `auth` |
| Real estate asset management | `building` |
| Tenant profiles & residency | `tenant` |
| Lease contract lifecycle | `contract` |
| Monthly financials (utility/invoices) | `finance` |
| Maintenance & service request handling | `service-requests` |
| Building operating expenses | `expense` |
| Real-time notifications | `notifications` |
| System-wide audit trail | `audit-log` |
| Global search | `search` |
| Operations calendar | `calendar` |
| Building-scoped access control (RBAC+) | `policy` |
| Flexible state machine | `workflow` |
| Dynamic business rules | `rules` |
| Document attachments | `attachments` |
| Internal comments | `comments` |
| Analytics & reporting | `report` |
| Public QR-based form | `public` |

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────┐
│           Frontend (React + Vite + TailwindCSS)     │
│  30 Pages · Axios + TanStack Query · Socket.io-client│
└────────────────────┬────────────────────────────────┘
                     │ HTTP / WebSocket
┌────────────────────▼────────────────────────────────┐
│            Backend (Express.js · ESM · Port 3001)   │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │   Auth   │  │ Building │  │ Contract/Finance  │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Expense  │  │ Service  │  │ Policy / Workflow │  │
│  └──────────┘  │ Requests │  │ Rules / Search   │  │
│                └──────────┘  └──────────────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │           Event Hub (in-process)             │   │
│  │  contract.* · invoice.* · maintenance.*      │   │
│  └────────┬──────────┬──────────────────────────┘  │
│           │          │                              │
│  ┌────────▼──┐  ┌────▼───────┐  ┌──────────────┐  │
│  │AuditLog   │  │ Timeline   │  │ Notification │  │
│  │ Listener  │  │ Listener   │  │ Listener     │  │
│  └───────────┘  └────────────┘  └──────┬───────┘  │
└─────────────────────────────────────────┼──────────┘
                     │                    │ Socket.io emit
┌────────────────────▼──────────────┐    │
│         Prisma ORM (ESM)          │    │
│  30 Models · Decimal · Soft Delete│    │
└────────────────────┬──────────────┘    │
                     │                   ▼
┌────────────────────▼──────────┐  ┌──────────────┐
│        MySQL Database         │  │ Browser Client│
└───────────────────────────────┘  │ (Real-time)  │
                                   └──────────────┘
```

**Technology Stack:**

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js + Express.js (ESM) |
| **Frontend** | React.js + Vite + TailwindCSS |
| **Database** | MySQL + Prisma ORM |
| **Monorepo** | pnpm workspaces |
| **Real-time** | Socket.io |
| **File Storage** | Cloudinary (upload_stream · resource_type: auto) |
| **Containerization** | Docker + docker-compose |
| **Auth** | JWT (Access 8h + Refresh 7d) · bcryptjs |
| **Charts** | Recharts |
| **HTTP Client** | Axios + Interceptors |
| **Server Cache** | TanStack React Query |

---

## 🔄 Business Architecture

```
Staff creates Buildings & Apartments
         │
         ▼
Create Tenant Profile (Tenants)
         │
         ▼
Sign Lease Contract (Contracts)
  ├── Register Services (ServiceSubscriptions)
  ├── Apartment → OCCUPIED
  └── Emit contract.created event
         │
         ▼ (monthly)
Record Utility Readings (UtilityReadings)
         │
         ▼
Generate Invoice (Invoices) ←── Debt Rollover + Credit Deduction
  ├── Rent + Electricity + Water (flat rate per person) + Services
  └── Emit invoice.created event
         │
         ▼
Tenant pays → Record Payment (Payments)
  ├── PAID / PARTIALLY_PAID / OVERDUE
  ├── Surplus → ContractCredits (CREDIT_IN)
  └── Emit invoice.paid event
         │
         ▼
Renew / Terminate Contract
  ├── Renew → update end_date, new monthly rent
  ├── Terminate → TERMINATED + reason
  └── Expire (Cron 00:00) → EXPIRED + Apartment → AVAILABLE
         │
         ▼ (parallel)
Building Expenses (BuildingExpenses)
  └── PENDING → PAID + Attach supporting documents

Service Requests
  ├── Source: INTERNAL / PUBLIC_FORM (QR code)
  ├── PENDING → ASSIGNED → IN_PROGRESS → RESOLVED
  └── Emit maintenance.* events

         │ (all actions emit Events)
         ▼
EventHub → AuditLog · Timeline · Notification
              └── Socket.io → Real-time browser push
```

---

## 🗂️ Monorepo Structure

```
apartment/
├── apps/
│   ├── backend/          ← Express server (server.js · 18 routers · Socket.io)
│   └── frontend/         ← React + Vite (App.jsx · routing · layout)
├── modules/
│   ├── auth/             ← JWT · bcrypt · RBAC middleware
│   ├── building/         ← Buildings · Floors · Apartments · QR Token
│   ├── tenant/           ← Tenant profiles · Temporary registration
│   ├── contract/         ← Contract lifecycle · Renewal · Termination · Cron
│   ├── finance/          ← Utility readings · Invoices · Payments · Credits
│   ├── service-requests/ ← Maintenance tickets · QR Public Form
│   ├── expense/          ← Building expenses · Attachment integration
│   ├── attachments/      ← Cloudinary upload/delete · in-memory multer
│   ├── audit-log/        ← AuditLog listener · Timeline listener
│   ├── notifications/    ← Notification listener · Cron reminder
│   ├── comments/         ← ServiceRequest internal comments
│   ├── search/           ← Global search (5 entities)
│   ├── report/           ← 4 analytics aggregations
│   ├── calendar/         ← Calendar events (Contract/Invoice/Maintenance)
│   ├── policy/           ← checkPolicy middleware · applyBuildingScope
│   ├── workflow/         ← State machine · validateTransition
│   ├── rules/            ← Business Rules Engine · CRON scan
│   └── public/           ← Public API (no auth required — QR form)
└── packages/
    └── prisma/           ← 30-model schema · migrations · seed.js
```

---

## ✅ Business Features

### 🔐 Auth Module

#### Login
- **Actor**: All staff roles
- **Input**: `email`, `password`
- **Output**: `accessToken` (JWT 8h), `refreshToken` (JWT 7d), user info
- **Business Rules**:
  - `is_active = false` → login rejected
  - Password compared via `bcryptjs` (10 salt rounds)
  - `last_login_at` updated on every successful login
  - `password_hash` never returned in response

#### User Management (ADMIN only)
- New accounts created with default password `password123`
- Email cannot be changed after creation (update endpoint strips email)
- Toggle active: soft lock without deleting data

---

### 🏗️ Building Module

- Room types: `STUDIO` / `ONE_BR` / `TWO_BR` / `THREE_BR`
- Apartment statuses: `AVAILABLE` / `OCCUPIED` / `MAINTENANCE` / `RESERVED`
- Every status change creates an `ApartmentStatusLogs` record
- Furniture condition: `NEW` / `GOOD` / `WORN`
- QR Token: 16 random characters, 90-day expiry, unique per apartment
- Quick Preview API returns summary without exposing sensitive tenant data

---

### 📄 Contract Module

#### Contract Lifecycle
```
ACTIVE ──[≤ 30 days]──▶ EXPIRING_SOON ──[past end_date]──▶ EXPIRED
                                                              │
                                                   Apartment → AVAILABLE
ACTIVE / EXPIRING_SOON ──[staff action]──▶ TERMINATED (with reason)
EXPIRED / TERMINATED   ──[staff action]──▶ RENEWED → ACTIVE (ContractRenewals)
```

#### Key Business Rules
- Apartment must be `AVAILABLE` before contract creation
- Default: `electricity_price = 3,500 VND/kWh`, `water_price_per_month = 100,000 VND/person/month`
- `payment_due_day` stored on contract — `due_date` = that day in the **next** month after `billing_month`
- Termination requires `termination_reason`

---

### 💰 Finance Module

#### Invoice Calculation
```
total = rent_amount
      + (electricity_curr - electricity_prev) × electricity_unit_price
      + water_price_per_month   (flat rate, not metered)
      + service_amount
      + other_amount
      - credit_applied          (auto-deducted from credit wallet)
      + debt_amount             (rolled over from previous unpaid invoices)
```

- Unique constraint: `(contract_id, billing_month)` — no duplicate invoices
- Credit surplus → `ContractCredits (CREDIT_IN)`
- Overpaid month's remainder auto-applied next invoice `(CREDIT_APPLY)`
- Underpaid balance auto-rolled to next invoice's `debt_amount`; old invoice → PAID with note

#### Payment Status Flow
```
UNPAID ──[partial payment]──▶ PARTIALLY_PAID
UNPAID/PARTIALLY_PAID ──[full payment]──▶ PAID
UNPAID/PARTIALLY_PAID + [past due_date, via Cron]──▶ OVERDUE
```

---

### 🔧 Service Requests Module

| Source | Flow |
|--------|------|
| INTERNAL | Staff creates directly in system |
| PUBLIC_FORM | Tenant scans QR code → no login required → auto-linked to active contract |

**Status lifecycle**: `PENDING → ASSIGNED → IN_PROGRESS → RESOLVED`  
**Additional**: `CANCELLED`, `POSTPONED`

`scheduled_start_date` enables planned maintenance scheduling with Cron reminders.

---

### 💸 Expense Module

- **Categories**: `OPERATIONS` / `MAINTENANCE`
- **Status flow**: `PENDING → PAID`
- Create/Update/Status: ADMIN, MANAGER, RECEPTIONIST
- Delete (soft): **ADMIN only**
- `amount > 0` validated in service layer (not just controller)
- Attachment-enabled via `entity_type = 'BuildingExpense'`
- Dashboard integration: monthly expense KPI + gross profit chart

---

### 📎 Attachments Module

- **Storage**: Cloudinary via stream upload (`resource_type: 'auto'`)
- **Allowed types**: PDF, JPEG, PNG, WEBP
- **Size limit**: 10 MB
- **Supported entities**: ServiceRequest, Contract, Invoice, Tenant, BuildingExpense
- **Delete permission**: uploader OR ADMIN/MANAGER
- Cloudinary deletion failure → DB record still deleted (graceful degradation)
- Delete uses `resource_type: 'raw'` for non-image files

---

### 🔔 Notifications Module

| Type | Trigger | Recipients |
|------|---------|-----------|
| `CONTRACT_CREATED` | `contract.created` event | All ADMIN + MANAGER |
| `PAYMENT_RECEIVED` | `invoice.paid` event | All ADMIN + MANAGER |
| `MAINTENANCE_ASSIGNED` | `maintenance.assigned` event | Assigned Technician |
| `MAINTENANCE_RESOLVED` | `maintenance.completed` event | All ADMIN + MANAGER |
| `MAINTENANCE_REMINDER` | Cron (scheduled_start_date ≤ 2 days) | Technician or ADMIN/MANAGER |
| `CONTRACT_EXPIRING` | Cron (end_date ≤ 30 days) | All ADMIN + MANAGER |
| `INVOICE_OVERDUE` | Cron (due_date < today) | All ADMIN + MANAGER |
| `CONTRACT_EXPIRING_RULE` | Business Rules Engine | Contract creator |
| `INVOICE_OVERDUE_RULE` | Business Rules Engine | ADMIN + MANAGER + creator |
| `MAINTENANCE_REMINDER_RULE` | Business Rules Engine | Technician or ADMIN/MANAGER |

- Real-time push via Socket.io to room `user:{userId}`
- Duplicate prevention: `findFirst` check before creating in all Cron jobs

---

### 📋 Audit Log Module

Events captured:

| Event | Action | ResourceType |
|-------|--------|-------------|
| `contract.created` | CREATE | Contract |
| `contract.updated` | UPDATE | Contract |
| `contract.terminated` | DELETE | Contract |
| `contract.renewed` | UPDATE | Contract |
| `invoice.created` | CREATE | Invoice |
| `invoice.paid` | UPDATE | Invoice |
| `maintenance.created` | CREATE | ServiceRequest |
| `maintenance.assigned` | UPDATE | ServiceRequest |
| `maintenance.completed` | UPDATE | ServiceRequest |

- Audit log failures **never fail** the parent request
- `actorId = 0` + `actorName = 'System'` for Cron-triggered actions

---

### 🛡️ Policy Module (RBAC+)

Upgrades basic RBAC to building-scoped resource-level access control:

| Function | Description |
|----------|-------------|
| `checkPolicy(resourceType, action)` | Middleware — verifies user has access to the specific resource's building |
| `applyBuildingScope(user, where)` | Injects building filter into Prisma queries for list endpoints |
| `assignBuilding(userId, buildingId)` | ADMIN assigns a building to a user |
| `revokeAssignment(id)` | Soft revoke (`revoked_at = now`) |

Resource types covered: `Building`, `BuildingExpense`, `Apartment`, `Contract`, `Invoice`, `ServiceRequest`

---

### ⚙️ Workflow Engine

- Configurable state machine: `Workflows → WorkflowSteps → WorkflowTransitions`
- `validateTransition(workflowName, fromStep, toStep, userRole)` — throws on invalid
- `role_allowed` per transition (CSV of roles); ADMIN bypasses
- ADMIN-only configuration

---

### 📐 Business Rules Engine

Dynamic rules evaluated from database — no hard-coded thresholds:

| Entity | Field | Operators |
|--------|-------|----------|
| Contract | `days_remaining` | `<=` |
| Invoice | `days_overdue` | `>=` |
| ServiceRequest | `days_to_start` | `<=` |

- Triggered by daily Cron + manual `POST /rules/trigger-scan`
- Supported operators: `==`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `not_in`

---

## 🗄️ Database Model

### Core Domain Models

| Model | Records | Key Constraints |
|-------|---------|----------------|
| `Users` | Staff accounts | email UNIQUE, role ENUM |
| `Buildings` | Buildings | code UNIQUE, soft delete |
| `Floors` | Floors | INDEX building_id |
| `Apartments` | Units | code UNIQUE, INDEX(floor_id, status), soft delete |
| `ApartmentFurniture` | Inventory | INDEX apartment_id |
| `ApartmentStatusLogs` | Status history | INDEX apartment_id |
| `Tenants` | Tenant profiles | national_id UNIQUE, INDEX(national_id, phone), soft delete |
| `Contracts` | Lease contracts | contract_code UNIQUE, 6 composite indexes, soft delete |
| `ContractRenewals` | Renewal history | INDEX contract_id |
| `TemporaryRegistrations` | Residency declarations | INDEX(tenant_id, apartment_id) |
| `Services` | Service catalog | is_active flag |
| `ServiceSubscriptions` | Per-contract services | INDEX contract_id |
| `UtilityReadings` | Monthly utility data | UNIQUE(apartment_id, billing_month) |
| `Invoices` | Monthly bills | invoice_code UNIQUE, UNIQUE(contract_id, billing_month), 3 indexes, soft delete |
| `Payments` | Payment receipts | INDEX invoice_id |
| `ServiceRequests` | Maintenance tickets | 4 indexes, scheduled_start_date |

### Supporting Models

| Model | Purpose | Key Notes |
|-------|---------|-----------|
| `AuditLogs` | Immutable action log | actor_id=0 for system, 3 indexes |
| `Notifications` | User notifications | INDEX(user_id, is_read) |
| `Timeline` | Chronological entity history | INDEX(entity_type, entity_id) |
| `Attachments` | Polymorphic file storage | INDEX(entity_type, entity_id) |
| `ServiceRequestComments` | Internal notes | onDelete: Cascade |
| `ServiceRequestExpenses` | Repair material costs | onDelete: Cascade |
| `ContractCredits` | Credit wallet per contract | UNIQUE contract_id, onDelete: Cascade |
| `CreditTransactions` | Credit wallet ledger | Types: CREDIT_IN / CREDIT_APPLY / CREDIT_REFUND |
| `BuildingExpenses` | Operating expenses | INDEX(building_id, status, expense_date), soft delete |
| `BuildingAssignments` | Building-user assignments | UNIQUE(user_id, building_id), soft revoke |
| `ApartmentTokens` | QR tokens | UNIQUE token, expires_at |
| `BusinessRules` | Dynamic rules | condition: Json, UNIQUE name |
| `Workflows` | State machine definitions | UNIQUE name |
| `WorkflowSteps` | State nodes | is_initial, is_final, order_number |
| `WorkflowTransitions` | State transitions | role_allowed (CSV), onDelete: Cascade |

> **All money fields use `Decimal` type — never Float.**  
> **All tables have `created_at` and `updated_at` timestamps.**

---

## 🔌 API Documentation

### Auth — `/api/auth`

| Method | Route | Permission | Key Validation |
|--------|-------|-----------|----------------|
| POST | `/login` | Public | Email exists, is_active=true, password match |
| POST | `/refresh` | Public | Valid refresh token, user still active |
| POST | `/logout` | Auth | — |
| GET | `/me` | Auth | — |
| PUT | `/change-password` | Auth | Old password must match |
| GET | `/users` | ADMIN | — |
| POST | `/users` | ADMIN | Email unique |
| PUT | `/users/:id` | ADMIN | Email field stripped from update |
| PATCH | `/users/:id/toggle-active` | ADMIN | — |

### Contract — `/api/contract`

| Method | Route | Permission | Policy |
|--------|-------|-----------|--------|
| GET | `/` | ADMIN, MANAGER | — |
| GET | `/expiring-soon` | ADMIN, MANAGER | — |
| GET | `/:id` | ADMIN, MANAGER, RECEPTIONIST | `checkPolicy(Contract, read)` |
| POST | `/` | ADMIN, MANAGER | — |
| PUT | `/:id` | ADMIN, MANAGER | `checkPolicy(Contract, update)` |
| PATCH | `/:id/terminate` | ADMIN, MANAGER | `checkPolicy(Contract, delete)` |
| POST | `/:id/renew` | ADMIN, MANAGER | `checkPolicy(Contract, update)` |
| GET | `/:id/renewals` | ADMIN, MANAGER | `checkPolicy(Contract, read)` |
| GET | `/:id/audit-history` | ADMIN, MANAGER, RECEPTIONIST | `checkPolicy(Contract, read)` |

### Finance — `/api/finance`

| Method | Route | Permission | Policy |
|--------|-------|-----------|--------|
| GET/POST | `/utilities` | ADMIN, MANAGER, RECEPTIONIST | — |
| POST | `/utilities/bulk-import` | ADMIN, MANAGER, RECEPTIONIST | — |
| GET | `/utilities/template` | ADMIN, MANAGER, RECEPTIONIST | — |
| GET | `/invoices` | ADMIN, MANAGER, RECEPTIONIST | — |
| GET | `/invoices/:id` | ADMIN, MANAGER, RECEPTIONIST | `checkPolicy(Invoice, read)` |
| POST | `/invoices/generate` | ADMIN, MANAGER | — |
| PATCH | `/invoices/:id/status` | ADMIN, MANAGER | `checkPolicy(Invoice, update)` |
| POST | `/payments` | ADMIN, MANAGER, RECEPTIONIST | — |
| GET | `/contracts/:id/credits` | ADMIN, MANAGER, RECEPTIONIST | `checkPolicy(Contract, read)` |
| POST | `/contracts/:id/credits/refund` | ADMIN, MANAGER | `checkPolicy(Contract, update)` |

### Expense — `/api/expense`

| Method | Route | Permission |
|--------|-------|-----------|
| GET | `/` | ADMIN, MANAGER, RECEPTIONIST |
| GET | `/summary` | ADMIN, MANAGER, RECEPTIONIST |
| POST | `/` | ADMIN, MANAGER, RECEPTIONIST |
| PUT | `/:id` | ADMIN, MANAGER, RECEPTIONIST |
| PATCH | `/:id/status` | ADMIN, MANAGER, RECEPTIONIST |
| DELETE | `/:id` | **ADMIN only** |

### Attachments — `/api/attachments`

| Method | Route | Permission |
|--------|-------|-----------|
| GET | `/?entity_type=X&entity_id=Y` | Auth |
| POST | `/upload` | Auth (multipart/form-data) |
| DELETE | `/:id` | Auth (owner or ADMIN/MANAGER) |

### Senior-Level Modules

| Module | Base Route | Permission |
|--------|-----------|-----------|
| Policy Assignments | `/api/policy/assignments` | ADMIN |
| Workflow Config | `/api/workflows` | ADMIN (read: Auth) |
| Business Rules | `/api/rules` | ADMIN |
| Audit Logs | `/api/audit-logs` | ADMIN |
| Reports | `/api/report` | ADMIN, MANAGER |

---

## 📊 Workflow Diagrams

### Contract Lifecycle

```mermaid
flowchart TD
    A[Select Tenant + Apartment] --> B{Apartment AVAILABLE?}
    B -->|No| ERR1[❌ 400 Apartment not available]
    B -->|Yes| C[Create Contract ACTIVE]
    C --> D[Apartment → OCCUPIED]
    D --> E[Emit contract.created]
    E --> F1[AuditLog: CREATE]
    E --> F2[Timeline: Contract signed]
    E --> F3[Notification → ADMIN/MANAGER]
    C --> G{Daily Cron 00:00}
    G -->|end_date ≤ 30 days| H[EXPIRING_SOON + Notification]
    G -->|end_date lt today| I[EXPIRED]
    I --> J[Apartment → AVAILABLE]
    C --> L[Staff: TERMINATE]
    L --> M[Apartment → AVAILABLE + Emit terminated]
    C --> O[Staff: RENEW]
    O --> P[ContractRenewals record]
    P --> Q[Contract back to ACTIVE]
```

### Invoice Payment Flow

```mermaid
flowchart TD
    A[Record UtilityReading] --> B[POST /invoices/generate]
    B --> C{Invoice exists for this month?}
    C -->|Yes| ERR[❌ 409 Duplicate billing month]
    C -->|No| D{Credit balance > 0?}
    D -->|Yes| E[Apply credit → CREDIT_APPLY]
    D -->|No| F[credit_applied = 0]
    E --> G{Unpaid debt from previous month?}
    F --> G
    G -->|Yes| H[debt_amount = previous remaining]
    G -->|No| I[debt_amount = 0]
    H --> J[Create Invoice UNPAID]
    I --> J
    J --> N[POST /payments]
    N --> O{amount ≥ remaining?}
    O -->|Yes| P[Invoice → PAID]
    O -->|No| Q[Invoice → PARTIALLY_PAID]
    P --> R{Surplus > 0?}
    R -->|Yes| S[ContractCredits += surplus CREDIT_IN]
    S --> T[Emit invoice.paid]
    R -->|No| T
```

---

## 🔐 Permission Matrix

### Role Data Scope

| Role | Data Scope | Notes |
|------|-----------|-------|
| **ADMIN** | **All buildings** | Bypasses all policy checks |
| **MANAGER** | **Assigned buildings only** | `BuildingAssignments.revoked_at IS NULL` |
| **RECEPTIONIST** | **Assigned buildings only** | Cannot access Technician-only routes |
| **TECHNICIAN** | **Assigned buildings only** | Only sees assigned ServiceRequests |

### Action Matrix

| Action | ADMIN | MANAGER | RECEPTIONIST | TECHNICIAN |
|--------|-------|---------|-------------|-----------|
| Login / Refresh | ✓ | ✓ | ✓ | ✓ |
| Manage Users | ✓ | ✗ | ✗ | ✗ |
| View Buildings/Apartments | ✓ | ✓ (scope) | ✓ (scope) | ✓ (scope) |
| Create Building | ✓ | ✗ | ✗ | ✗ |
| Create/Edit Apartment | ✓ | ✓ | ✗ | ✗ |
| Delete Furniture | ✓ | ✗ | ✗ | ✗ |
| View Contracts | ✓ | ✓ (scope) | ✓ detail only | ✗ |
| Create/Terminate Contract | ✓ | ✓ (scope) | ✗ | ✗ |
| View Invoices | ✓ | ✓ (scope) | ✓ (scope) | ✗ |
| Generate Invoice | ✓ | ✓ | ✗ | ✗ |
| Record Payment | ✓ | ✓ | ✓ | ✗ |
| Refund Credit | ✓ | ✓ | ✗ | ✗ |
| Create/Edit Expense | ✓ | ✓ (scope) | ✓ (scope) | ✗ |
| Delete Expense | ✓ | ✗ | ✗ | ✗ |
| Create ServiceRequest | ✓ | ✓ | ✓ | ✗ |
| Assign Technician | ✓ | ✓ | ✗ | ✗ |
| Update SR Status | ✓ | ✓ | ✗ | ✓ (assigned) |
| Configure Workflow/Rules | ✓ | ✗ | ✗ | ✗ |
| View Reports | ✓ | ✓ | ✗ | ✗ |
| View All Audit Logs | ✓ | ✗ | ✗ | ✗ |

---

## ⏰ Cron Jobs

### Contract Cron (`0 0 * * *`)

**File**: `modules/contract/backend/cron.js`

| Step | Action |
|------|--------|
| 1 | Contracts ACTIVE + `end_date ≤ today+30` → `EXPIRING_SOON` + send `CONTRACT_EXPIRING` notifications |
| 2 | Contracts ACTIVE/EXPIRING_SOON + `end_date < today` → `EXPIRED` |
| 3 | Apartments of expired contracts → `AVAILABLE` + create `ApartmentStatusLog` |
| 4 | Invoices UNPAID/PARTIALLY_PAID + `due_date < today` → `OVERDUE` + send `INVOICE_OVERDUE` notifications |

### Notifications Cron (`0 0 * * *`)

**File**: `modules/notifications/backend/cron.js`

| Condition | Action |
|-----------|--------|
| ServiceRequests PENDING/ASSIGNED/IN_PROGRESS + `scheduled_start_date ∈ [today, today+2]` | Send `MAINTENANCE_REMINDER` to assigned Technician (if any) or all ADMIN/MANAGER |
| Deduplication | `findFirst` before creating to prevent same-day spam |

---

## 📡 Events Produced

| Event | Producer | Key Payload Fields |
|-------|----------|-------------------|
| `contract.created` | Contract service | contract_code, start_date, apartment_id |
| `contract.updated` | Contract service | oldData, newData |
| `contract.terminated` | Contract service | termination_reason, oldData, newData |
| `contract.renewed` | Contract service | new_end_date, new_monthly_rent |
| `invoice.created` | Finance service | invoice_code, billing_month, total_amount |
| `invoice.paid` | Finance service | invoiceCode, paymentAmount, paymentMethod, newStatus, contractId |
| `maintenance.created` | Service Requests | title, priority |
| `maintenance.assigned` | Service Requests | assignedTo, title |
| `maintenance.completed` | Service Requests | title |

**Standard Event Payload:**
```json
{
  "eventId": "uuid",
  "eventType": "contract.created",
  "actorId": 1,
  "entityId": 100,
  "data": { ... }
}
```

---

## 📎 Attachments Integration

| Aspect | Detail |
|--------|--------|
| Storage | Cloudinary (stream upload, `resource_type: 'auto'`) |
| Upload Library | multer in-memory storage |
| Accepted MIME types | `application/pdf`, `image/jpeg`, `image/png`, `image/webp` |
| Max file size | 10 MB |
| Folder | `CLOUDINARY_FOLDER` env var (default: `qlchdv`) |
| Public ID | `{cleanFileName}_{timestamp}` |
| Supported entities | ServiceRequest, Contract, Invoice, Tenant, BuildingExpense |
| Delete flow | 1. Delete from Cloudinary (detect `image` vs `raw`) → 2. Delete from DB |
| Delete permission | File uploader OR ADMIN/MANAGER |
| Graceful degradation | Cloudinary error → DB record still deleted |

---

## ⚠️ Exception Catalog

| Error | HTTP | Condition |
|-------|------|----------|
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `ACCOUNT_LOCKED` | 401 | `is_active = false` |
| `TOKEN_EXPIRED` | 401 | Access token past 8h |
| `TOKEN_INVALID` | 401 | Forged or malformed token |
| `MISSING_TOKEN` | 401 | No Authorization header |
| `FORBIDDEN_ROLE` | 403 | Role not allowed (`requireRole`) |
| `BUILDING_SCOPE_VIOLATION` | 403 | Entity belongs to unassigned building |
| `ATTACHMENT_FORBIDDEN` | 403 | Not uploader, not ADMIN/MANAGER |
| `USER_NOT_FOUND` | 404 | User does not exist |
| `CONTRACT_NOT_FOUND` | 404 | Contract does not exist |
| `EXPENSE_NOT_FOUND` | 404 | Expense not found or soft-deleted |
| `ATTACHMENT_NOT_FOUND` | 404 | Attachment does not exist |
| `ASSIGNMENT_NOT_FOUND` | 404 | Building assignment not found |
| `EMAIL_DUPLICATE` | 409 | Email already registered |
| `INVOICE_DUPLICATE` | 409 | Invoice for (contract, billing_month) already exists |
| `ASSIGNMENT_DUPLICATE` | 409 | User already assigned to this building |
| `INVALID_AMOUNT` | 400 | `amount <= 0` |
| `MISSING_REQUIRED_FIELDS` | 400 | Required field absent |
| `INVALID_EXPENSE_STATUS` | 400 | Status not in [PENDING, PAID] |
| `INVALID_FILE_TYPE` | 400 | MIME type not supported |
| `FILE_TOO_LARGE` | 400 | File exceeds 10 MB |
| `MISSING_ENTITY_INFO` | 400 | Missing entity_type or entity_id |
| `INVALID_TRANSITION` | 400 | Workflow transition not valid for role/state |
| `APARTMENT_NOT_AVAILABLE` | 400 | Apartment not in AVAILABLE status |
| `WRONG_OLD_PASSWORD` | 400 | Old password mismatch on change-password |

---

## 🧩 Edge Cases

| Scenario | Handling |
|----------|---------|
| Overpaid invoice | Surplus → `ContractCredits` (CREDIT_IN), not immediately refunded |
| Invoice with existing credit | Auto-deduct `credit_applied` before invoice creation |
| Underpaid previous month | `debt_amount` added to new invoice; old invoice → PAID with note |
| Cron re-runs on EXPIRING_SOON | Only `ACTIVE → EXPIRING_SOON`, idempotent on already-EXPIRING_SOON |
| Apartment release by Cron | Only processes contracts with `end_date ∈ [yesterday-2, today)` |
| Cloudinary delete failure | DB record still deleted (graceful degradation) |
| Cron notification dedup | `findFirst` before `createNotification` in every Cron |
| Expired QR token | Error returned, room info not exposed |
| MANAGER with no building assigned | `applyBuildingScope` injects `building_id: { in: [-1] }` → empty results |
| ServiceRequest deletion with attachments | Comments + Expenses cascade; Attachments need separate cleanup |
| Audit log write failure | Never fails parent request — errors only logged |
| Timeline entry failure | Never fails parent request — errors only logged |

---

## 🔧 Technical Debt

### 🔴 High Priority

| Issue | Location | Risk |
|-------|----------|------|
| **Missing Prisma Transaction** in invoice generation: Invoice creation + CREDIT_APPLY + debt rollover not wrapped in `$transaction` | `finance/backend/service.js` | Race condition under concurrent requests |
| **Hard-coded `changed_by: 1`** when Cron releases EXPIRED apartments | `contract/backend/cron.js` L94 | Audit log always attributed to User ID 1 |
| **No refresh token revocation**: logout does not invalidate the refresh token | `auth/backend/service.js` | Stolen refresh tokens remain valid for 7 days |

### 🟡 Medium Priority

| Issue | Location | Risk |
|-------|----------|------|
| **N+1 Query risk** in `getExpenses`: attachment count via `groupBy` after list fetch — not batched efficiently | `expense/backend/service.js` | Performance degradation with large datasets |
| **N+1 in Business Rules scan**: `for...of` loop with `createNotification` + `findFirst` inside — no batching | `rules/backend/service.js` | Timeout when many contracts/invoices match |
| **No transaction** in Contract Cron: status update + notification — notification failure leaves status already updated | `contract/backend/cron.js` | Data inconsistency |

### 🟢 Low Priority

| Issue | Location | Note |
|-------|----------|------|
| **Duplicate validation** between controller and service: both check required fields | `expense/backend/` | Refactor to single-layer validation |
| **JWT_SECRET fallback** `'fallback_secret_key'` in middleware | `auth/backend/middleware.js` | Should enforce required env var |
| **resource_type mismatch**: `'auto'` on upload vs `'raw'` on delete | `attachments/backend/` | Needs thorough testing with PDFs |

---

## 💡 Improvement Suggestions

### Must Have
- Wrap invoice generation in Prisma `$transaction`
- Add refresh token blacklist (Redis or DB table)
- Fix hard-coded `changed_by: 1` → use system user ID from env/config

### Should Have
- Batch notification inserts instead of Cron loop
- Rate limiting on `/api/auth/login` and `/api/public`
- Add composite index `(billing_month, status)` on `Invoices`
- Centralized global error handler middleware

### Nice To Have
- WebSocket room authentication (currently client self-joins `user:{userId}` without server verification)
- Background job queue (Bull/BullMQ) replacing in-process Cron
- API versioning (`/api/v1/`)
- Auto-generated OpenAPI/Swagger documentation

---

## 🚀 Running the Project

### Docker (Recommended)
```bash
docker-compose up -d
```

### Manual Setup
```bash
pnpm install

# Run migrations and seed data
cd packages/prisma
pnpm prisma migrate dev
pnpm prisma db seed

# Backend (port 3001)
cd apps/backend && pnpm dev

# Frontend (port 5173)
cd apps/frontend && pnpm dev
```

### Required Environment Variables (`.env`)
```env
DATABASE_URL=mysql://user:pass@host:3306/dbname
JWT_SECRET=your_strong_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=qlchdv
FRONTEND_URL=http://localhost:5173
PORT=3001
```

### Demo Accounts
| Email | Password | Role |
|-------|----------|------|
| `admin@qlchdc.com` | `password123` | Admin |
| `manager@qlchdc.com` | `password123` | Manager |
| `tech@qlchdc.com` | `password123` | Technician |

---

## 📊 System Statistics

| Metric | Value |
|--------|-------|
| Backend Modules | **18** |
| Frontend Pages | **30** (29 internal + 1 public QR form) |
| API Endpoints | **70+** |
| Database Models | **30** |
| Event Types | **9** |
| Notification Types | **10** |
| Cron Jobs | **2** |
| Supported Roles | **4** |
| Attachment-enabled Modules | **5** (Expense, ServiceRequest, Contract, Invoice, Tenant) |
| Workflow-enabled Modules | **1** (ServiceRequest — configurable, extensible) |
| Seed Data | 24 apartments · 16 tenants · 16 contracts · ~80 invoices |

---

## 🎯 Product Level Assessment

| Level | Required Features | Status |
|-------|-----------------|--------|
| **Mid-Level** | Basic CRUD, Auth, DB schema | ✅ Complete |
| **Strong Mid-Level** | Audit Log, Notification, Attachment, Comment, Timeline, Payment Workflow, Search, Reporting, Export | ✅ Complete |
| **Senior-Level** | + Event Driven Architecture, Workflow Engine, Business Rules Engine, Policy Based Permission | ✅ Complete |
| **Enterprise-Level** | + Dynamic Custom Fields, Saved Views, Advanced Filter Builder, Bulk Actions | 🔲 Planned |
