# Cafe POS System ("MAGIC MUG") — Engineering Guidelines & AI Skills

## 1. Project Engineering Principles

All contributors and AI coding agents MUST adhere strictly to these principles:

1. **Billing Correctness First**: Financial accuracy and data integrity precede visual flashiness or micro-optimizations.
2. **Backend Authority**: Frontends calculate instant UI feedback, but FastAPI + PostgreSQL hold authoritative truth for prices, totals, tax, discounts, and permissions.
3. **Financial Precision**: Use `NUMERIC(10,2)` / `Decimal` for all currency representations. **Never use IEEE 754 floating point numbers (`float`/`double`) for monetary operations.**
4. **Historical Ledger Immutability**: Historical bill items store price and name snapshots. Modifying products or categories does NOT alter past bills. Confirmed bills are NEVER hard deleted.
5. **Atomic Consistency**: Bill creation operates inside an isolated database transaction (`BEGIN ... COMMIT`). Errors trigger an immediate `ROLLBACK`.

---

## 2. Monorepo Directory Structure

The project is organized as a clean monorepo:

```
MAGIC MUG/
├── apps/
│   ├── web/                     # React 19 + TypeScript + Vite + Tailwind CSS
│   │   ├── src/
│   │   │   ├── components/      # UI components & PrintableReceipt
│   │   │   ├── context/         # Auth, Toast, and Cart Contexts
│   │   │   ├── pages/           # POS, Orders, Analytics, Catalog, Expenses
│   │   │   ├── services/        # Typed API service wrappers (api.ts, cafeServices.ts)
│   │   │   ├── types/           # TypeScript data interfaces & DTOs
│   │   │   ├── utils/           # Helper functions & formatting utilities
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   ├── nginx.conf
│   │   └── Dockerfile
│   │
│   └── mobile/                  # Flutter 3.x + Dart (Android & iOS 13+)
│       ├── lib/
│       │   ├── core/            # Theme, ApiClient (Dio), ApiConfig
│       │   ├── models/          # Bill, Category, Product, Expense, User models
│       │   ├── providers/       # State Management (Cart, Menu, Bill, Expense, Auth, Analytics)
│       │   ├── screens/         # POS, Catalog, History, Analytics, Expenses, Splash, MainNavigation
│       │   ├── widgets/         # CustomTopBar, ReceiptDialog, ServerSettingsDialog
│       │   └── main.dart
│       ├── assets/              # Branding, logos, and HD multi-density icons
│       ├── android/             # Native Android configuration (API 21+)
│       ├── ios/                 # Native iOS configuration (iOS 13+, Podfile, ATS, Permissions)
│       └── pubspec.yaml
│
├── backend/                     # Python 3.12 FastAPI Backend Service
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/              # API v1 Router endpoints
│   │   │       ├── auth.py
│   │   │       ├── categories.py
│   │   │       ├── products.py
│   │   │       ├── bills.py
│   │   │       ├── shifts.py
│   │   │       ├── expenses.py
│   │   │       └── analytics.py
│   │   ├── core/
│   │   │   ├── config.py        # Pydantic settings & env management
│   │   │   ├── security.py      # Password hashing & JWT helper functions
│   │   │   └── database.py      # SQLAlchemy 2.0 Async Session engine
│   │   ├── models/              # SQLAlchemy ORM Database Models
│   │   │   ├── user.py
│   │   │   ├── category.py
│   │   │   ├── product.py
│   │   │   ├── bill.py
│   │   │   ├── shift.py
│   │   │   └── expense.py
│   │   ├── schemas/             # Pydantic Request/Response DTOs
│   │   ├── services/            # Core business logic services
│   │   │   ├── billing_service.py
│   │   │   ├── analytics_service.py
│   │   │   └── auth_service.py
│   │   └── main.py              # FastAPI app initialization & CORS
│   ├── requirements.txt
│   └── Dockerfile
│
├── docker/                      # Docker & Postgres init scripts
│   ├── postgres/
│   │   └── init.sql
│   └── docker-compose.yml
│
├── prd.md                       # Product Requirements Document
├── application_flow.md          # Flowcharts & Architecture
├── skills.md                    # Engineering Guidelines (This File)
└── README.md
```

---

## 3. Technology Stack & Coding Standards

### 3.1 Backend: Python & FastAPI
- **Python Version**: 3.12
- **Package Manager**: uv
- **Framework**: FastAPI (Async ecosystem)
- **ORM / Database**: SQLAlchemy 2.0 with `asyncpg` driver + Alembic for migrations.
- **Validation**: Pydantic v2 schemas.
- **Rules**:
  - Keep route handlers thin; delegate business logic to service layer classes (e.g. `BillingService`).
  - Use `Decimal` from standard `decimal` module for monetary math.
  - Return standardized error objects with explicit HTTP status codes.

#### FastAPI Endpoint & Service Pattern Example
```python
# app/services/billing_service.py
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.bill import Bill, BillItem
from app.models.product import Product
from app.schemas.bill import BillCreateSchema

class BillingService:
    @staticmethod
    async def create_bill(db: AsyncSession, user_id: int, payload: BillCreateSchema) -> Bill:
        async with db.begin(): # Starts DB transaction block
            subtotal = Decimal("0.00")
            bill_items = []
            
            for item_in in payload.items:
                product = await db.get(Product, item_in.product_id)
                if not product or not product.is_active:
                    raise ValueError(f"Product ID {item_in.product_id} is inactive or invalid")
                
                unit_price = Decimal(str(product.selling_price))
                line_total = unit_price * item_in.quantity
                subtotal += line_total
                
                bill_items.append(
                    BillItem(
                        product_id=product.id,
                        product_name_snapshot=product.name,
                        unit_price_snapshot=unit_price,
                        quantity=item_in.quantity,
                        line_total=line_total
                    )
                )
            
            discount = Decimal(str(payload.discount_amount or "0.00"))
            tax = Decimal(str(payload.tax_amount or "0.00"))
            total = subtotal - discount + tax
            
            # Generate sequential bill number
            bill_number = await BillingService.generate_bill_number(db)
            
            bill = Bill(
                bill_number=bill_number,
                subtotal=subtotal,
                discount_amount=discount,
                tax_amount=tax,
                total_amount=total,
                payment_mode=payload.payment_mode,
                created_by=user_id,
                items=bill_items
            )
            db.add(bill)
            await db.flush()
            return bill
```

### 3.2 Frontend (Web): React, TypeScript & Tailwind CSS
- **Framework**: React 19 with Vite compiler.
- **Styling**: Vanilla Tailwind CSS with custom theme design system.
- **State Management**: TanStack Query (React Query) for server state; Context / Zustand for active cart state.
- **Design Guidelines**:
  - Dark / Sleek Cafe Aesthetics (Rich warm dark accents `#1A1817`, coffee amber `#D97706`, crisp card borders `#2D2A28`).
  - Min touch target size 44px x 44px for comfortable tablet browser usage.
  - Full support for POS keyboard navigation (`N` for New Bill, `F2` for search, `Enter` to confirm bill).

### 3.3 Frontend (Mobile & Tablet): Flutter & Dart
- **Framework**: Flutter 3.x with Material 3 design system.
- **Target Optimization**: Android & iPadOS Tablet multi-column split view (Catalog Grid on left 65%, Cart Summary on right 35%).
- **Http Client**: `dio` package with custom interceptors for automatic JWT token injection and refresh handling.
- **Secure Storage**: `flutter_secure_storage` for storing JWT credentials.

---

## 4. Critical Financial Test Scenarios

Before declaring any feature complete, the system MUST pass these automated/manual verification test suites:

### Scenario 1: Basic Item Billing Calculation
- **Input**:
  - Small Coffee (Price: ₹20.00, Qty: 2)
  - Sandwich (Price: ₹50.00, Qty: 1)
- **Expected Calculation**:
  - Line 1: `20.00 * 2 = 40.00`
  - Line 2: `50.00 * 1 = 50.00`
  - Subtotal: `90.00`
  - Total Payable: `90.00`

### Scenario 2: Historical Price Snapshot Preservation
- **Steps**:
  1. Product "Espresso" created at ₹30.00.
  2. Bill `MUG-001` saved containing 1 Espresso (Line Total: ₹30.00).
  3. Product "Espresso" price updated to ₹40.00 in Product Management.
  4. Query Bill `MUG-001` via `GET /api/v1/bills/{id}`.
- **Expected Outcome**:
  - Bill `MUG-001` snapshot price MUST remain ₹30.00.
  - Total for Bill `MUG-001` MUST remain ₹30.00.
  - New bills generated after step 3 will use ₹40.00.

### Scenario 3: Inactive Product Rejection
- **Steps**:
  1. Cashier adds product "Pastry" to local cart.
  2. Owner sets "Pastry" `is_active = false` from another terminal.
  3. Cashier clicks "Save Bill".
- **Expected Outcome**:
  - Backend rejects request with HTTP 400 (`PRODUCT_INACTIVE`).
  - Database transaction rolls back cleanly. Zero bills created.

### Scenario 4: Bill Void Auditability
- **Steps**:
  1. Cashier voids Bill `MUG-002` with reason "Customer changed mind".
- **Expected Outcome**:
  - Bill status updated to `VOID`. `void_reason` saved.
  - `audit_logs` record created referencing `user_id`, `bill_id`, and reason.
  - Daily analytics endpoint `GET /api/v1/analytics/daily` excludes Bill `MUG-002` totals.

---

## 5. Docker Development Environment

### `docker-compose.yml` Template
```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    container_name: magic_mug_db
    restart: always
    environment:
      POSTGRES_USER: pos_user
      POSTGRES_PASSWORD: super_secure_pos_password
      POSTGRES_DB: magic_mug_pos
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql

  backend:
    build:
      context: ../backend
      dockerfile: Dockerfile
    container_name: magic_mug_backend
    restart: always
    ports:
      - "8000:8000"
    environment:
      - POSTGRES_SERVER=db
      - POSTGRES_PORT=5432
      - POSTGRES_USER=pos_user
      - POSTGRES_PASSWORD=super_secure_pos_password
      - POSTGRES_DB=magic_mug_pos
      - SECRET_KEY=dev_secret_key_change_in_production
    depends_on:
      - db

volumes:
  postgres_data:
```

---

## 6. Development Workflow & AI Guidelines

When creating code or making edits to the MAGIC MUG codebase, AI agents MUST follow these execution guidelines:

1. **Inspect Existing Files**: Always use file viewing and search tools to examine schema definitions, services, and components before adding new endpoints or code.
2. **Never Mask Errors**: If a test or build fails, fix the underlying code or database model. Do not wrap calls in silent try/except blocks or hardcode dummy responses.
3. **No Schema Mismatch**: Ensure Pydantic schemas, SQLAlchemy ORM models, and TypeScript interface types match field-for-field.
4. **Run Verification Commands**: Always execute pytest, build scripts, or linters to verify changes before marking a task as complete.
