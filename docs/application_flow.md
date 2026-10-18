# Cafe POS System ("MAGIC MUG") — Application Flow & Operational Architecture

## 1. High-Level Architecture Flow

```
                      +-----------------------------+
                      |          Cafe User          |
                      |    (Owner / Cashier)        |
                      +--------------+--------------+
                                     |
               +---------------------+---------------------+
               |                     |                     |
               v                     v                     v
      +-----------------+   +-----------------+   +-----------------+
      |    React Web    |   | Flutter Android |   | Flutter iOS/iPad|
      | (Desktop/Laptop)|   | (Tablet/Mobile) |   | (iPad/iPhone)   |
      +--------+--------+   +--------+--------+   +--------+--------+
               |                     |                     |
               +---------------------+---------------------+
                                     |
                          HTTPS / REST API (JSON)
                                     |
                                     v
                      +-----------------------------+
                      |       FastAPI Backend       |
                      |  - JWT Auth & RBAC          |
                      |  - Product/Category Services|
                      |  - Billing Transaction Engine|
                      |  - Analytics SQL Aggregation|
                      |  - Audit & Expense Logger   |
                      +--------------+--------------+
                                     |
                          Async SQLAlchemy 2.0
                                     |
                                     v
                      +-----------------------------+
                      |     PostgreSQL Database     |
                      |  (ACID Compliant Ledger)    |
                      +-----------------------------+
```

---

## 2. Core Architecture Rules & Cross-Platform Protocol

1. **Single Source of Truth**: FastAPI backend + PostgreSQL database enforce ALL business rules, calculations, permissions, and validation.
2. **Identical REST Contracts**: The React Web client and Flutter Mobile/Tablet clients call the identical REST API endpoints.
3. **Decoupled Frontend UI**: Frontend platforms do not share code directly, allowing each to be natively optimized (e.g. keyboard shortcuts and multi-column web views for React; responsive touch targets and gestural cart interactions for Flutter).
4. **Authoritative Calculation**: Frontends display instant UI estimates, but final bill totals, snapshot prices, and ledger records are computed exclusively inside the database transaction.

---

## 3. Application Startup & Authentication Flow

```
     User opens App (Web/Mobile)
                  |
                  v
       Read Stored JWT Token
       from Storage / SharedPreferences
                  |
         Is Token Present?
        /                 \
      Yes                  No
      /                     \
     v                       v
Validate Token        Silent Auto-Initialize Terminal Session
GET /api/v1/auth/me   POST /api/v1/auth/login (admin/secretpassword)
     |                       |
Token Valid?                 |
 /        \                  v
Yes        No ---------> Store Token in Secure Storage
 |                           |
 v                           v
Navigate Directly to POS / Terminal Dashboard
(Zero Cashier Delay - Terminal Ready for Immediate Billing)
```

---

## 4. Product & Category Management Flow

### 4.1 Category Creation Flow (Standalone & In-Form)
```
   User opens Menu Catalog (Web/Mobile)
                  |
                  v
   Click "+ Category" in Header or Chips Bar
   (Or click "+ New" inside Add Dish form)
                  |
                  v
   Enter Category Name & Optional Description
                  |
                  v
   POST /api/v1/categories
   Payload: { name, description, display_order, is_active }
                  |
                  v
   FastAPI verifies name uniqueness & inserts into DB
                  |
                  v
   Write to audit_logs (Action: CATEGORY_CREATED)
                  |
                  v
   Refresh Category Chips & Auto-select in Dish Form
```

### 4.2 Product Creation Flow
```
   User (Owner) opens Product Catalog
                  |
                  v
         Click "Add Product"
                  |
                  v
    Fill Name, Category, Price, Desc
                  |
                  v
       Frontend Form Validation
                  |
                  v
        POST /api/v1/products
                  |
                  v
        FastAPI Schema Validation
                  |
                  v
       Insert into PostgreSQL
                  |
                  v
     Return Created Product Object
                  |
                  v
    Update Frontend UI & Clear Form
```

### 4.2 Product Deactivation (Soft Delete) Flow
```
   User (Owner) clicks "Deactivate" on Product
                  |
                  v
       DELETE /api/v1/products/{id}
                  |
                  v
       FastAPI Service Request
                  |
                  v
   UPDATE products SET is_active = FALSE
               WHERE id = {id}
                  |
                  v
   Write to audit_logs (Action: PRODUCT_DEACTIVATED)
                  |
                  v
   Return Success (Product remains in DB for historical bills,
                   but excluded from New Bill screen)
```

---

## 5. Daily Register & Cash Drawer Flow

The POS enforces a mandatory daily register (shift) workflow before any billing can occur.

### 5.1 Open Register (Start of Day)
```
   Cashier opens POS Terminal
                 |
                 v
   System checks: Is there an OPEN shift for today?
                 |
        +--------+--------+
        |                 |
       Yes                No
        |                 |
        v                 v
   POS Ready         Show "Day Register Is Not Open" Banner
   for Billing       Block checkout / billing
                          |
                          v
                   Click "Open Register" or Header Register Button
                          |
                          v
                   Open "Daily Register & Cashflow" Modal
                          |
                          v
                   Enter Opening Cash Float (₹)
                   (Quick presets: ₹0, ₹500, ₹1000, ₹1500, ₹2000)
                   Optional: Enter Opening Notes
                          |
                          v
                   POST /api/v1/shifts/open
                   Payload: { opening_cash, opening_notes }
                          |
                          v
                   FastAPI creates Shift record (status: OPEN)
                          |
                          v
                   Banner disappears, POS Ready for Billing
```

### 5.2 Live Cash Drawer Tally (During Shift)
```
   Shift is OPEN → Cashier processes bills throughout the day
                          |
                          v
               GET /api/v1/shifts/current/cashflow
                          |
                          v
               Backend aggregates from bills & expenses tables:

               Physical Cash Drawer Tally:
               ┌──────────────────────────────────────────────┐
               │  Opening Float:                    ₹1000.00  │
               │  (+) Cash Received from Customers: +₹850.00  │
               │  (-) Change Returned:              -₹25.00   │
               │  (=) Net Cash Collected:            ₹825.00  │
               │  (-) Shop Expenses (from Drawer):  -₹200.00  │
               │  ────────────────────────────────────────     │
               │  Total Physical Cash in Drawer:   ₹1625.00   │
               └──────────────────────────────────────────────┘

               Formula:
               Expected = Opening Float
                        + Cash Received (Gross)
                        - Change Returned
                        - Cash Expenses
```

### 5.3 Close Register (End of Day)
```
   Cashier clicks "Close Register" tab in Shift Modal
                          |
                          v
               System shows Expected Cash in Drawer
                          |
                          v
               Cashier counts physical cash and enters Actual Amount
                          |
                          v
               System computes Variance:
               Variance = Actual - Expected
               (Positive = surplus, Negative = shortage)
                          |
                          v
               Optional: Enter Closing Notes
                          |
                          v
               POST /api/v1/shifts/close
               Payload: { closing_cash_actual, closing_notes }
                          |
                          v
               FastAPI updates Shift record:
               - status → CLOSED
               - closing_cash_actual, closing_cash_expected, closing_difference
               - closed_at → current timestamp
                          |
                          v
               Register closed, billing blocked until next day's register opens
```

---

## 6. Billing Flow (Core Transaction Engine)

This is the primary operational flow of the Cafe POS system.

```
                  Cashier opens "New Bill"
                             |
                             v
              ┌─────────────────────────────┐
              │ Is Daily Register OPEN?     │
              └──────────┬──────────────────┘
                         |
                   Yes?  /  No?
                   /         \
                  v           v
          Continue      Block Checkout
          Billing       Show "Open Register" Modal
                        (Must open register first)
                             |
                             v
           Fetch Active Products & Categories
             GET /api/v1/products?active_only=true
                             |
                             v
                  Initialize Empty Cart
                             |
                             +<-----------------------------------+
                             |                                    |
                             v                                    |
                    Select Product Item                           |
                             |                                    |
                             v                                    |
                   Add Item to Cart / Increment Quantity          |
                             |                                    |
                             v                                    |
             Calculate Real-time Client UI Total                  |
               Line Total = Unit Price * Quantity                 |
               Subtotal = SUM(Line Totals)                        |
                             |                                    |
                    More Items to Add?                            |
                   /                  \                           |
                 Yes                   No                         |
                 /                      \                         |
                +                        v                        |
                               Click "Confirm & Pay"              |
                                         |                        |
                                         v                        |
                              Enter Cash Tendered (if CASH mode)  |
                              System calculates Change to Return  |
                                         |                        |
                                         v                        |
                              POST /api/v1/bills                  |
                              Payload: { items, payment_mode,     |
                                cash_tendered, change_given }     |
                                         |                        |
                                         v                        |
                             FastAPI Billing Service              |
                                         |                        |
                  ┌──────────────────────┴──────────────────┐    |
                  │ Check: active_shift_id exists?          │    |
                  │ If No → HTTP 400 "Register not open!"   │    |
                  └──────────────────────┬──────────────────┘    |
                                         |                        |
                           +-------------+-------------+          |
                           | Begin DB Transaction      |          |
                           +-------------+-------------+          |
                                         |                        |
                           Fetch Authoritative Product            |
                           Prices directly from DB                |
                                         |                        |
                           Are ALL Products Active & Valid?       |
                           /                           \          |
                         Yes                            No        |
                         /                               \        |
                        v                                 v       |
              Calculate Snapshot Line Totals         ROLLBACK Tx  |
              Subtotal = SUM(Line Totals)            Return Error |
              Total = Subtotal - Disc + Tax          HTTP 400     |
                        |                                 |       |
                        v                                 +------->
             Generate Unique Bill Number                          |
             Format: MUG-YYYYMMDD-XXXX                            |
                        |                                         |
                        v                                         |
             Insert `bills` Record (with shift_id,                |
               cash_tendered, change_given)                       |
                        |                                         |
                        v                                         |
             Insert `bill_items` Records                          |
             (Stores Name & Price Snapshots)                      |
                        |                                         |
                        v                                         |
             Insert `audit_logs` Entry                            |
                        |                                         |
                        v                                         |
                     COMMIT                                       |
                        |                                         |
                        v                                         |
             Return Created Bill Response                         |
             HTTP 201 Created                                     |
                        |                                         |
                        v                                         |
             Frontend displays Success                            |
             Clear Cart & Ready for Next Order                    |
```

---

## 7. Bill Search & History Flow

```
   User opens "Bill History"
              |
              v
   Apply Filters (Optional):
     - Date Range (Start Date, End Date)
     - Search Term (Bill Number)
     - Status (CONFIRMED / VOID)
     - Category / Product Filter
              |
              v
   GET /api/v1/bills?page=1&limit=20&start_date=...
              |
              v
   FastAPI Service executes indexed SQL query:
     SELECT * FROM bills
     WHERE bill_date BETWEEN :start AND :end
       AND status = :status
     ORDER BY bill_date DESC
     LIMIT 20 OFFSET 0;
              |
              v
   Return Paginated Response with Header Summary
              |
              v
   Render Bill Cards / Table
              |
   User Clicks Bill Row
              |
              v
   GET /api/v1/bills/{id}
              |
              v
   Return Bill Details + Snapshot Line Items
              |
              v
   Show Modal with Bill Receipt View
```

---

## 8. Bill Void Workflow

Confirmed bills CANNOT be deleted. They must undergo a controlled void procedure.

```
   User opens Bill Details Modal
              |
              v
      Click "Void Bill"
              |
              v
   Check Authorization Role
              |
   Is User OWNER (or authorized)?
  /                              \
Yes                               No
 /                                 \
v                                   v
Prompt for Void Reason String      Show Permission Denied
(e.g., "Customer returned item")     Error Toast
         |
         v
POST /api/v1/bills/{id}/void
Payload: { "reason": "..." }
         |
         v
FastAPI Billing Service
         |
   Begin DB Transaction
         |
   Is Bill Status 'CONFIRMED'?
  /                           \
Yes                            No (Already VOID)
 /                              \
v                                v
UPDATE bills SET status = 'VOID', ROLLBACK & Return Error 400
  void_reason = :reason,
  voided_at = CURRENT_TIMESTAMP
WHERE id = :id;
         |
         v
Insert `audit_logs` Entry
Action: BILL_VOIDED, Entity: bill, Metadata: { bill_number, reason }
         |
         v
     COMMIT
         |
         v
Return Updated Bill HTTP 200
         |
         v
Update UI Status Tag to VOID (Red)
Exclude Bill from Regular Revenue Analytics
```

---

## 9. Sales Analytics Flow

Sales analytics are computed using database aggregations (SQL `SUM`, `COUNT`, `GROUP BY`) rather than fetching raw records to the frontend.

```
   User (Owner) opens "Analytics" Dashboard
                  |
                  v
         Select Time Horizon
   (Today / Weekly / Monthly / Custom)
                  |
                  v
      API Request to Backend:
      GET /api/v1/analytics/daily?date=2026-10-04
                  |
                  v
      FastAPI Analytics Service executes Aggregation Queries:

      Query 1: Sales Metrics
      SELECT
        COALESCE(SUM(total_amount), 0) AS total_sales,
        COUNT(id) AS bill_count,
        COALESCE(AVG(total_amount), 0) AS avg_bill_value
      FROM bills
      WHERE status = 'CONFIRMED'
        AND bill_date::date = :target_date;

      Query 2: Best-Selling Products
      SELECT
        bi.product_id,
        bi.product_name_snapshot,
        SUM(bi.quantity) AS total_qty,
        SUM(bi.line_total) AS total_revenue
      FROM bill_items bi
      JOIN bills b ON b.id = bi.bill_id
      WHERE b.status = 'CONFIRMED'
        AND b.bill_date::date = :target_date
      GROUP BY bi.product_id, bi.product_name_snapshot
      ORDER BY total_qty DESC
      LIMIT 5;

      Query 3: Expenses Summary
      SELECT COALESCE(SUM(amount), 0) AS total_expense
      FROM expenses
      WHERE expense_date = :target_date;
                  |
                  v
      Combine Metrics into Response Object:
      {
        "total_sales": 1450.00,
        "bill_count": 32,
        "avg_bill_value": 45.31,
        "total_expense": 200.00,
        "net_revenue": 1250.00,
        "top_products": [...],
        "hourly_breakdown": [...]
      }
                  |
                  v
      Render Dashboard KPI Cards & Charts (Web / Mobile)
```

---

## 10. Expense Management Flow

```
   User (Owner) clicks "Add Expense"
                  |
                  v
   Enter Category, Description, Amount, Date
                  |
                  v
        POST /api/v1/expenses
                  |
                  v
        FastAPI Service validates payload
        (amount > 0, required fields)
                  |
                  v
        Insert into `expenses` table
                  |
                  v
        Insert into `audit_logs` table
        Action: EXPENSE_CREATED
                  |
                  v
   Return Saved Expense Record
                  |
                  v
   Refresh Expense List & Update Net Sales KPIs
```

---

## 11. Unified Error Handling Flow

```
                 Client API Call
                        |
                        v
                 FastAPI Backend
                        |
               Execute Processing
                        |
              Did an Exception Occur?
             /                       \
           Yes                        No
           /                           \
          v                             v
Determine Exception Type:          Return HTTP 200/201
- Pydantic ValidationError          JSON Data Response
- Auth / Token Error (401)
- Permission Error (403)
- Product Inactive (400)
- Database Exception (500)
          |
          v
Rollback Active DB Transaction (if any)
          |
          v
Construct Standard Error Payload:
{
  "success": false,
  "error": {
    "code": "PRODUCT_INACTIVE",
    "message": "Selected item 'Cold Coffee' is no longer active for billing.",
    "details": null
  }
}
          |
          v
Send Response with proper HTTP Status Code
          |
          v
Frontend intercepts response:
- Display user-friendly Toast Alert
- Maintain current UI state (do not lose cart items)
```

---

## 12. Cloud Deployment & Dynamic Server Switching

```
                 Mobile App (Android / iOS)
                             |
                             v
               Tap Cafe Logo on Top Bar
                             |
                             v
               Open Server Settings Modal
                             |
         +-------------------+-------------------+
         |                                       |
         v                                       v
  Enter Live Cloud URL                   Enter Local Staging URL
  (e.g. https://api.magicmug.com/api/v1) (e.g. http://10.28.67.82:8000/api/v1)
         |                                       |
         +-------------------+-------------------+
                             |
                             v
                   Tap "Test Connection"
                   GET / (Health Check)
                             |
                  Connection Successful?
                 /                      \
               Yes                       No
               /                          \
              v                            v
      Tap "Save & Connect"           Show Error Message
      Saved to SharedPreferences    Verify Internet / Server Status
              |
              v
     Connect seamlessly over
     4G, 5G, or any Wi-Fi network
```
