// Authentication Types
export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'OWNER' | 'CASHIER';
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// Category Types
export interface Category {
  id: number;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_count?: number;
}

// Product Types
export interface Product {
  id: number;
  category_id: number;
  category_name?: string;
  name: string;
  description?: string;
  selling_price: string; // Decimal string from backend
  image_url?: string;
  is_active: boolean;
  track_stock?: boolean;
  stock_quantity?: number;
  created_at: string;
  updated_at: string;
}

// Cart & Billing Types
export interface CartItem {
  product: Product;
  quantity: number;
}

export interface BillItemSnapshot {
  id: number;
  product_id?: number | null;
  product_name_snapshot: string;
  unit_price_snapshot: string;
  quantity: number;
  line_total: string;
}

export interface Bill {
  id: number;
  bill_number: string;
  bill_date: string;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total_amount: string;
  payment_mode: 'CASH' | 'CARD' | 'UPI' | 'SPLIT';
  split_details?: { cash?: number | string; upi?: number | string; card?: number | string } | null;
  shift_id?: number | null;
  status: 'CONFIRMED' | 'VOID';
  void_reason?: string;
  voided_at?: string;
  created_by: number;
  creator_name?: string;
  items: BillItemSnapshot[];
  created_at: string;
}

export interface BillSummaryStats {
  total_confirmed_revenue: string;
  confirmed_count: number;
  void_count: number;
}

export interface BillListResponse {
  items: Bill[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  summary: {
    total_confirmed_revenue: string;
    confirmed_count: number;
    void_count: number;
  };
}

// Expense Types
export interface Expense {
  id: number;
  category: string;
  description: string;
  amount: string;
  payment_mode?: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER';
  expense_date: string;
  shift_id?: number | null;
  created_by: number;
  creator_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseListResponse {
  items: Expense[];
  total_amount: string;
  count: number;
}

// Analytics Types
export interface TopProductItem {
  product_id: number;
  product_name: string;
  total_qty: number;
  total_revenue: string;
}

export interface HourlySalesPoint {
  hour: number;
  hour_label: string;
  total_sales: string;
  bill_count: number;
}

export interface PaymentBreakdown {
  cash: string;
  card: string;
  upi: string;
}

export interface DailyAnalytics {
  target_date: string;
  total_sales: string;
  bill_count: number;
  avg_bill_value: string;
  total_expense: string;
  net_revenue: string;
  top_products: TopProductItem[];
  hourly_breakdown: HourlySalesPoint[];
  payment_breakdown: PaymentBreakdown;
}

export interface DaySalesPoint {
  date: string;
  day_name: string;
  total_sales: string;
  bill_count: number;
  expenses: string;
  net_revenue: string;
}

export interface CategoryPerformance {
  category_id: number;
  category_name: string;
  total_qty: number;
  total_revenue: string;
}

export interface WeeklyAnalytics {
  start_date: string;
  end_date: string;
  total_sales: string;
  bill_count: number;
  total_expense: string;
  net_revenue: string;
  daily_breakdown: DaySalesPoint[];
  category_performance: CategoryPerformance[];
}

export interface MonthlyAnalytics {
  year: number;
  month: number;
  total_sales: string;
  bill_count: number;
  total_expense: string;
  net_revenue: string;
  daily_breakdown: DaySalesPoint[];
  top_products: TopProductItem[];
}

export interface BestSellerItem {
  product_id: number;
  product_name: string;
  category_name: string;
  total_qty: number;
  total_revenue: string;
  orders_count: number;
}

export interface SlowMoverItem {
  product_id: number;
  product_name: string;
  category_name: string;
  selling_price: string;
  total_qty: number;
  total_revenue: string;
  days_window: number;
}

// Shift & Daily Cashflow Types
export interface ShiftCashflowSummary {
  shift_id: number;
  status: 'OPEN' | 'CLOSED';
  opened_at: string;
  closed_at?: string | null;
  opened_by_id: number;
  opened_by_name: string;
  opening_cash: string;
  cash_sales: string;
  upi_sales: string;
  card_sales: string;
  total_sales: string;
  cash_expenses: string;
  expected_cash: string;
  closing_cash_actual?: string | null;
  closing_difference?: string | null;
  closing_notes?: string | null;
  confirmed_bills_count: number;
  void_bills_count: number;
}

export interface ShiftOpenRequest {
  opening_cash: number;
  opening_notes?: string;
}

export interface ShiftCloseRequest {
  closing_cash_actual: number;
  closing_notes?: string;
}
