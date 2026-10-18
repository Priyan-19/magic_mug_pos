-- Magic Mug POS - PostgreSQL Database Initialization Script
-- Initializes schema, tables, indices, and constraints
-- SAFE TO RE-RUN: Uses IF NOT EXISTS throughout — will NOT drop or lose existing data.

-- ============================================================================
-- 1. USERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('OWNER', 'CASHIER')),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- 2. CATEGORIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT NULL,
    display_order INT DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- 3. PRODUCTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    selling_price NUMERIC(10, 2) NOT NULL CHECK (selling_price >= 0),
    image_url TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    track_stock BOOLEAN DEFAULT FALSE NOT NULL,
    stock_quantity INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category_id, is_active);

-- ============================================================================
-- 4. SHIFTS (Daily Register / Cash Drawer)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shifts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'OPEN' NOT NULL,
    opened_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    closed_at TIMESTAMPTZ NULL,
    opening_cash NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    opening_notes TEXT NULL,
    closing_cash_actual NUMERIC(12, 2) NULL,
    closing_cash_expected NUMERIC(12, 2) NULL,
    closing_difference NUMERIC(12, 2) NULL,
    closing_notes TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT check_shift_status CHECK (status IN ('OPEN', 'CLOSED')),
    CONSTRAINT check_shift_opening_cash_positive CHECK (opening_cash >= 0)
);

CREATE INDEX IF NOT EXISTS idx_shifts_user ON shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_status_opened ON shifts(status, opened_at);

-- ============================================================================
-- 5. BILLS
-- ============================================================================
CREATE TABLE IF NOT EXISTS bills (
    id BIGSERIAL PRIMARY KEY,
    bill_number VARCHAR(30) UNIQUE NOT NULL,
    bill_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    discount_amount NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    tax_amount NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    payment_mode VARCHAR(20) DEFAULT 'CASH' NOT NULL,
    split_details JSONB NULL,
    cash_tendered NUMERIC(12, 2) NULL,
    change_given NUMERIC(12, 2) NULL,
    status VARCHAR(20) DEFAULT 'CONFIRMED' NOT NULL,
    void_reason TEXT NULL,
    voided_at TIMESTAMPTZ NULL,
    shift_id BIGINT NULL REFERENCES shifts(id) ON DELETE SET NULL,
    created_by BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT check_bill_payment_mode CHECK (payment_mode IN ('CASH', 'CARD', 'UPI', 'SPLIT')),
    CONSTRAINT check_bill_status CHECK (status IN ('CONFIRMED', 'VOID'))
);

CREATE INDEX IF NOT EXISTS idx_bills_date_status ON bills(bill_date, status);
CREATE INDEX IF NOT EXISTS idx_bills_number ON bills(bill_number);
CREATE INDEX IF NOT EXISTS idx_bills_shift ON bills(shift_id);

-- ============================================================================
-- 6. BILL ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS bill_items (
    id BIGSERIAL PRIMARY KEY,
    bill_id BIGINT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    product_id BIGINT NULL REFERENCES products(id) ON DELETE SET NULL,
    product_name_snapshot VARCHAR(100) NOT NULL,
    unit_price_snapshot NUMERIC(10, 2) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    line_total NUMERIC(12, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bill_items_product_bill ON bill_items(product_id, bill_id);

-- ============================================================================
-- 7. EXPENSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS expenses (
    id BIGSERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_mode VARCHAR(20) DEFAULT 'CASH' NOT NULL,
    expense_date DATE NOT NULL,
    shift_id BIGINT NULL REFERENCES shifts(id) ON DELETE SET NULL,
    created_by BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT check_expense_payment_mode CHECK (payment_mode IN ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER'))
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_shift ON expenses(shift_id);

-- ============================================================================
-- 8. AUDIT LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- 9. MIGRATION: Add new columns to EXISTING tables (safe to re-run)
--    These ALTER statements handle the case where the tables already exist
--    in Supabase but are missing the newer columns.
-- ============================================================================

-- Bills: add split_details, cash_tendered, change_given, shift_id
ALTER TABLE bills ADD COLUMN IF NOT EXISTS split_details JSONB NULL;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS cash_tendered NUMERIC(12, 2) NULL;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS change_given NUMERIC(12, 2) NULL;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS shift_id BIGINT NULL REFERENCES shifts(id) ON DELETE SET NULL;

-- Bills: update payment_mode CHECK to include 'SPLIT'
-- (drop old constraint if it exists, then re-add)
ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_payment_mode_check;
ALTER TABLE bills DROP CONSTRAINT IF EXISTS check_bill_payment_mode;
ALTER TABLE bills ADD CONSTRAINT check_bill_payment_mode CHECK (payment_mode IN ('CASH', 'CARD', 'UPI', 'SPLIT'));

-- Expenses: add payment_mode, shift_id
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(20) DEFAULT 'CASH' NOT NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS shift_id BIGINT NULL REFERENCES shifts(id) ON DELETE SET NULL;

-- Expenses: add payment_mode CHECK
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS check_expense_payment_mode;
ALTER TABLE expenses ADD CONSTRAINT check_expense_payment_mode CHECK (payment_mode IN ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER'));

-- ============================================================================
-- 10. DEFAULT SEED DATA
-- ============================================================================

-- Default Cafe System Account for POS Station Auth (password: secretpassword)
INSERT INTO users (username, email, password_hash, full_name, role, is_active)
VALUES (
    'admin',
    'admin@magicmug.com',
    '$2b$12$dVGHeTk49l/ynOKSpFbS7ud2RmT1SdIyAPpivQvoRX8NXkcC52Tcy',
    'Magic Mug',
    'OWNER',
    TRUE
)
ON CONFLICT (username) DO NOTHING;
