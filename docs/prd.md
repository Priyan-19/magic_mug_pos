# Cafe POS System ("MAGIC MUG") — Product Requirements Document (PRD)

## 1. Product Overview

### 1.1 Product Name
**MAGIC MUG — Cafe POS & Sales Management System**

### 1.2 Product Type
Single-cafe production-ready Point of Sale (POS) and Sales Management Application.

### 1.3 Product Objective
Build a fast, reliable, offline-resilient, single-tenant cafe management system designed for cashiers and cafe owners. It enables:
- Product and category catalog management.
- Rapid cart creation and bill generation.
- Instant server-side verified billing with snapshot isolation.
- Historical bill tracking, search, and filtering.
- Controlled bill voiding and auditing.
- Multi-dimensional sales analytics (Daily, Weekly, Monthly, Best-Sellers, Slow-Movers).
- Expense tracking and net revenue reporting.
- Cross-platform access across Web (React), Android (Flutter), and iOS/iPadOS (Flutter) via a single unified FastAPI REST backend.

---

## 2. Platforms & Technology Stack

| Platform | Technology | Target Devices | Primary Use Case |
|---|---|---|---|
| **Web** | React 19, TypeScript, Vite, Tailwind CSS | Desktop, Laptop Browser | Owner dashboard, analytics, web-based billing, catalog management |
| **Mobile / Tablet** | Flutter 3.x, Dart | Android Tablets/Phones, iPad, iPhone (iOS 13+) | Handheld POS, quick touch billing, category management, receipt sharing |
| **Backend** | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0 (Async) | Linux / Docker / Cloud (Render/Railway) | Business logic, authentication, authoritative billing, analytics aggregation |
| **Database** | PostgreSQL 15+ | Linux / Docker / Managed Cloud DB | Structured relational storage, financial ledger, index-optimized search |
| **Containerization** | Docker, Docker Compose, Nginx Alpine | Development & Production | Service orchestration & reverse proxy |

> **Strict Rule**: React Web and Flutter Mobile/Tablet **do NOT share UI code**. They consume the exact same FastAPI REST backend API endpoints, schemas, and database business rules.

---

## 3. Scope & Feature Boundaries

### 3.1 Included Scope (v1.0 Core)
1. **Authentication & Unified Station Access**: Secure background JWT token-based auth with auto-login for terminal stations, maintaining user attribution (`OWNER`, `CASHIER`) without slowing down cashiers with manual login prompts.
2. **Category Management**: Category hierarchy, active status, display ordering, standalone category creation, and in-form category shortcuts directly from mobile and web.
3. **Product Management**: SKU/product catalog, active status, unit prices, descriptions, category mapping, live availability toggles.
4. **Billing Engine**: Real-time client-side calculation + mandatory server-side authoritative recalculation, atomic PostgreSQL transactions, immutable bill item snapshots.
5. **Bill History & Audit**: Search by bill number, date range filtering, status filtering (`CONFIRMED`, `VOID`), bill detail viewing.
6. **Thermal Receipt Printing & Sharing**: Printable visual receipt modal, screenshot image capture, photo library export, and receipt sharing via `share_plus` on mobile and browser print on web.
7. **Bill Void Workflow**: Controlled void operation requiring mandatory reason entry, role checks, and audit log entry.
8. **Sales Analytics**: Backend SQL-aggregated metrics for Daily, Weekly, Monthly performance, product sales ranking, top/slow-moving item identification.
9. **Expense Management**: Expense entry, expense categories, date-based querying, net sales calculation (`Gross Revenue - Expenses`).
10. **Dynamic Cloud & Network Configuration**: Dynamic backend URL switching in mobile app to connect to Cloud API (over 4G/5G/Wi-Fi) or local staging server with 1-click test connection.
11. **Audit Logging**: Structured operational log tracking critical actions (`LOGIN`, `PRODUCT_UPDATE`, `BILL_CREATE`, `BILL_VOID`, `EXPENSE_CREATE`).

### 3.2 Explicitly Out of Scope (v1.0)
- Payment Gateway / Online Payment Processing (UPI, Credit/Debit cards). The POS records payment method (Cash, Card, UPI QR displayed statically), but does not process payments via PG APIs.
- Customer-facing Self-Ordering App or QR Table Ordering.
- Multi-branch / Multi-tenant SaaS infrastructure.
- Inventory Raw Material Procurement & Supplier PO System.
- Customer Loyalty & Coupon Engine.
- AI Demand Forecasting & Automatic Payroll.

---

## 4. User Roles & Permissions Matrix

| Feature / Action | OWNER | CASHIER |
|---|:---:|:---:|
| User Login & Password Reset | ✅ | ✅ |
| View Active Product Catalog | ✅ | ✅ |
| Create New Bill | ✅ | ✅ |
| View Today's Bills & Details | ✅ | ✅ |
| Search Historical Bills | ✅ | ✅ |
| Void Bill | ✅ | ❌ *(Requires Owner Approval)* |
| Create / Edit Products | ✅ | ❌ |
| Deactivate Products | ✅ | ❌ |
| Create / Edit Categories | ✅ | ❌ |
| View Sales Analytics (Daily/Weekly/Monthly) | ✅ | ❌ |
| Create & Manage Expenses | ✅ | ❌ |
| View System Audit Logs | ✅ | ❌ |

---

## 5. Database Schema & Data Models

### 5.1 ER Diagram Overview
```
+---------------+       +---------------+
|  categories   | 1---N |   products    |
+---------------+       +---------------+
                                | 1
                                |
                                | N
+---------------+       +---------------+       +---------------+
|     users     | 1---N |     bills     | 1---N |  bill_items   |
+---------------+       +---------------+       +---------------+
     | 1                     | 1
     | N                     | 1
+---------------+       +---------------+
|   expenses    |       |  audit_logs   |
+---------------+       +---------------+
```

### 5.2 Detailed Table Schemas

#### Table: `users`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID / BIGINT | PRIMARY KEY, GENERATED | Unique user identifier |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL | Login username |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| `password_hash` | VARCHAR(255) | NOT NULL | Argon2id / Bcrypt password hash |
| `full_name` | VARCHAR(100) | NOT NULL | User display name |
| `role` | VARCHAR(20) | NOT NULL, CHECK(`OWNER`, `CASHIER`) | Role-based authorization tag |
| `is_active` | BOOLEAN | DEFAULT TRUE, NOT NULL | Account active flag |
| `created_at` | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

#### Table: `categories`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGINT | PRIMARY KEY, GENERATED | Category ID |
| `name` | VARCHAR(50) | UNIQUE, NOT NULL | Category name (e.g. Coffee, Snacks) |
| `description` | TEXT | NULLABLE | Category details |
| `display_order` | INT | DEFAULT 0, NOT NULL | UI sort order |
| `is_active` | BOOLEAN | DEFAULT TRUE, NOT NULL | Soft activation flag |
| `created_at` | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | Update time |

#### Table: `products`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGINT | PRIMARY KEY, GENERATED | Product ID |
| `category_id` | BIGINT | FOREIGN KEY (`categories.id`), NOT NULL | Parent category |
| `name` | VARCHAR(100) | NOT NULL | Product name |
| `description` | TEXT | NULLABLE | Product description |
| `selling_price` | NUMERIC(10, 2) | NOT NULL, CHECK(selling_price >= 0) | Authoritative unit selling price |
| `is_active` | BOOLEAN | DEFAULT TRUE, NOT NULL | Active status for billing |
| `created_at` | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | Update time |

> **Index**: `CREATE INDEX idx_products_category_active ON products(category_id, is_active);`

#### Table: `bills`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGINT | PRIMARY KEY, GENERATED | Internal bill ID |
| `bill_number` | VARCHAR(30) | UNIQUE, NOT NULL | Human-readable sequential ID (e.g., `MUG-20261004-0001`) |
| `bill_date` | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP, NOT NULL | Date & time of order creation |
| `subtotal` | NUMERIC(12, 2) | NOT NULL, CHECK(subtotal >= 0) | Calculated sum of item line totals |
| `discount_amount` | NUMERIC(10, 2) | DEFAULT 0.00, NOT NULL | Applied discount value |
| `tax_amount` | NUMERIC(10, 2) | DEFAULT 0.00, NOT NULL | Applied tax value |
| `total_amount` | NUMERIC(12, 2) | NOT NULL, CHECK(total_amount >= 0) | Final payable total |
| `payment_mode` | VARCHAR(20) | DEFAULT 'CASH', CHECK(`CASH`, `CARD`, `UPI`) | Recorded payment method |
| `status` | VARCHAR(20) | DEFAULT 'CONFIRMED', CHECK(`CONFIRMED`, `VOID`) | Bill lifecycle status |
| `void_reason` | TEXT | NULLABLE | Mandatory reason if status is `VOID` |
| `voided_at` | TIMESTAMPTZ | NULLABLE | Timestamp of void action |
| `created_by` | BIGINT | FOREIGN KEY (`users.id`), NOT NULL | User who created the bill |
| `created_at` | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | Record timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | Record timestamp |

> **Indexes**:
> - `CREATE INDEX idx_bills_date_status ON bills(bill_date, status);`
> - `CREATE INDEX idx_bills_number ON bills(bill_number);`

#### Table: `bill_items`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGINT | PRIMARY KEY, GENERATED | Item line ID |
| `bill_id` | BIGINT | FOREIGN KEY (`bills.id`) ON DELETE CASCADE, NOT NULL | Parent bill ID |
| `product_id` | BIGINT | FOREIGN KEY (`products.id`), NOT NULL | Reference product |
| `product_name_snapshot` | VARCHAR(100) | NOT NULL | Immutable name snapshot at time of billing |
| `unit_price_snapshot` | NUMERIC(10, 2) | NOT NULL | Immutable price snapshot at time of billing |
| `quantity` | INT | NOT NULL, CHECK(quantity > 0) | Quantity purchased |
| `line_total` | NUMERIC(12, 2) | NOT NULL | `unit_price_snapshot * quantity` |

> **Index**: `CREATE INDEX idx_bill_items_product_bill ON bill_items(product_id, bill_id);`

#### Table: `expenses`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGINT | PRIMARY KEY, GENERATED | Expense ID |
| `category` | VARCHAR(50) | NOT NULL | Expense category (Milk, Inventory, Utilities, Rent, Misc) |
| `description` | TEXT | NOT NULL | Detail note |
| `amount` | NUMERIC(10, 2) | NOT NULL, CHECK(amount > 0) | Expense monetary amount |
| `expense_date` | DATE | NOT NULL | Date expense occurred |
| `created_by` | BIGINT | FOREIGN KEY (`users.id`), NOT NULL | Creator |
| `created_at` | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | Update time |

> **Index**: `CREATE INDEX idx_expenses_date ON expenses(expense_date);`

#### Table: `audit_logs`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGINT | PRIMARY KEY, GENERATED | Log ID |
| `user_id` | BIGINT | FOREIGN KEY (`users.id`), NULLABLE | Actor user ID |
| `action` | VARCHAR(50) | NOT NULL | Action code (e.g. `BILL_VOIDED`, `PRODUCT_PRICE_CHANGED`) |
| `entity_type` | VARCHAR(50) | NOT NULL | Target entity (e.g. `bill`, `product`) |
| `entity_id` | VARCHAR(50) | NOT NULL | Target entity primary key |
| `metadata` | JSONB | DEFAULT '{}', NOT NULL | Additional details (e.g., previous price, new price, void reason) |
| `created_at` | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | Log timestamp |

---

## 6. Business Logic & Financial Integrity Rules

1. **Financial Field Precision**:
   All financial fields MUST use `NUMERIC(10,2)` or `NUMERIC(12,2)` in PostgreSQL and `Decimal` / `bigint` cents in backend services. **IEEE 754 floating-point numbers (`float`/`double`) are strictly prohibited.**

2. **Price Snapshot Rule**:
   When a bill is saved, the `bill_items` table stores `product_name_snapshot` and `unit_price_snapshot`. Future edits to product names or prices will NOT alter existing historical bills.

3. **Authoritative Calculation Rule**:
   The frontend calculates totals strictly for real-time UI feedback. Upon submitting a bill to `POST /api/v1/bills`:
   - The backend validates all `product_id` values for existence and active status (`is_active = true`).
   - The backend reads authoritative unit prices directly from the `products` table inside the DB transaction.
   - The backend calculates `line_total = unit_price * quantity`, `subtotal = SUM(line_total)`, and `total_amount = subtotal - discount_amount + tax_amount`.
   - Client-provided totals are ignored or checked for discrepancies.

4. **Atomic Transactions**:
   Bill creation occurs inside a single database transaction block (`BEGIN ... COMMIT`). If inserting bill items or generating the unique bill number fails, the transaction issues a `ROLLBACK`. Partial or orphaned bill headers are impossible.

5. **Soft Deactivation**:
   Products and categories associated with historical bills cannot be hard deleted (`DELETE`). They must set `is_active = false`. Inactive products are hidden from the billing screen, but historical bills retain complete auditability.

6. **Bill Void Rule**:
   Bills CANNOT be deleted. Voiding a bill sets `status = 'VOID'`, requires an explicit void reason string, records `voided_at`, creates an entry in `audit_logs`, and immediately excludes the bill from regular revenue aggregations.

---

## 7. API Specification

All endpoints are prefixed with `/api/v1`. Authenticated endpoints require `Authorization: Bearer <JWT_TOKEN>`.

### 7.1 Authentication
- `POST /api/v1/auth/login`
  - **Request**: `{ "username": "admin", "password": "secretpassword" }`
  - **Response 200**: `{ "access_token": "eyJ...", "token_type": "bearer", "user": { "id": 1, "username": "admin", "role": "OWNER", "full_name": "Cafe Owner" } }`

- `GET /api/v1/auth/me`
  - **Response 200**: Current user profile & role.

### 7.2 Categories
- `GET /api/v1/categories?include_inactive=false` — List categories.
- `POST /api/v1/categories` — Create category (`OWNER` only).
- `PUT /api/v1/categories/{id}` — Update category (`OWNER` only).
- `DELETE /api/v1/categories/{id}` — Soft deactivation (`OWNER` only).

### 7.3 Products
- `GET /api/v1/products?category_id=1&active_only=true` — Fetch products.
- `POST /api/v1/products` — Create product (`OWNER` only).
- `GET /api/v1/products/{id}` — Get single product details.
- `PUT /api/v1/products/{id}` — Update product (`OWNER` only).
- `DELETE /api/v1/products/{id}` — Soft deactivate product (`OWNER` only).

### 7.4 Billing
- `POST /api/v1/bills` — Create new bill.
  - **Request**:
    ```json
    {
      "payment_mode": "CASH",
      "discount_amount": 0.00,
      "tax_amount": 0.00,
      "items": [
        { "product_id": 10, "quantity": 2 },
        { "product_id": 14, "quantity": 1 }
      ]
    }
    ```
  - **Response 201**: Full generated bill object including `bill_number`, recalculated `subtotal`, `total_amount`, snapshot line items, and timestamp.

- `GET /api/v1/bills?page=1&limit=20&start_date=2026-10-01&end_date=2026-10-04&status=CONFIRMED&search=MUG-2026` — Paginated bill list with multi-filter search.
- `GET /api/v1/bills/{id}` — Fetch bill header and snapshot item details.
- `POST /api/v1/bills/{id}/void` — Void bill (`OWNER` or authorized staff).
  - **Request**: `{ "reason": "Customer changed mind / incorrect cashier input" }`
  - **Response 200**: Updated bill with `status: "VOID"`.

### 7.5 Sales Analytics
- `GET /api/v1/analytics/daily?date=2026-10-04` — Today's KPIs, hourly trend, top seller.
- `GET /api/v1/analytics/weekly?start_date=2026-09-28` — 7-day sales breakdown by day, category performance.
- `GET /api/v1/analytics/monthly?year=2026&month=10` — Daily trend across month, top/slow products.
- `GET /api/v1/analytics/best-sellers?limit=10&start_date=...&end_date=...` — Product sales ranking by quantity sold & total revenue.
- `GET /api/v1/analytics/slow-movers?limit=10&days=30` — Active products with lowest sales volume.

### 7.6 Expenses
- `GET /api/v1/expenses?start_date=...&end_date=...` — Fetch expense records.
- `POST /api/v1/expenses` — Log new expense (`OWNER` only).
- `PUT /api/v1/expenses/{id}` — Update expense (`OWNER` only).
- `DELETE /api/v1/expenses/{id}` — Delete expense record (`OWNER` only).

---

## 8. Non-Functional Requirements (NFRs)

1. **Performance**:
   - Bill creation API latency < 150ms under standard local network conditions.
   - Billing UI product search filter latency < 50ms (instant client-side filtering).
   - Database queries for analytics aggregated over 100,000 bills < 500ms using composite indexes.

2. **Reliability & Consistency**:
   - Zero lost transactions. Database operates with ACID guarantees.
   - Transaction Rollback: Any failure during cart validation or DB commit MUST revert all partial writes.

3. **Security**:
   - Passwords hashed using Argon2id or Bcrypt with minimum 12 rounds.
   - JWT tokens signed with strong secret (`HS256` or `RS256`) with configurable expiration (e.g. 12 hours).
   - Input validation handled strictly at API boundary via Pydantic schemas to prevent injection.
   - CORS origin validation enforcing access only from authorized web client origins.

4. **Usability & UX**:
   - Optimized for touch targets on 10" and 12.9" iPads and Android tablets (min 48px touch targets).
   - High-contrast visual UI tailored for fast-paced cashier usage with keyboard shortcuts on desktop (e.g. `Enter` to confirm, `Esc` to clear cart).

---

## 9. Environment Configuration & Deployment

### Required Environment Variables (`.env`)
```ini
# Application Configuration
APP_NAME="MAGIC MUG POS"
ENV="production"
PORT=8000

# Database Configuration
POSTGRES_SERVER=db
POSTGRES_PORT=5432
POSTGRES_DB=magic_mug_pos
POSTGRES_USER=pos_user
POSTGRES_PASSWORD=super_secure_pos_password

# Security Configuration
SECRET_KEY="generate-a-strong-random-secret-key-here"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=720

# CORS Configuration
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173"
```
