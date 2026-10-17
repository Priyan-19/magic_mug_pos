import { api } from './api';
import {
  User,
  TokenResponse,
  Category,
  Product,
  Bill,
  BillListResponse,
  Expense,
  ExpenseListResponse,
  DailyAnalytics,
  WeeklyAnalytics,
  MonthlyAnalytics,
  BestSellerItem,
  SlowMoverItem,
  ShiftCashflowSummary,
  ShiftOpenRequest,
  ShiftCloseRequest,
} from '../types';

export const authService = {
  login: (username: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { username, password }),
  getMe: () => api.get<User>('/auth/me'),
};

export const catalogService = {
  getCategories: (includeInactive = false) =>
    api.get<Category[]>(`/categories?include_inactive=${includeInactive}`),
  createCategory: (payload: { name: string; description?: string; display_order?: number; is_active?: boolean }) =>
    api.post<Category>('/categories', payload),
  updateCategory: (id: number, payload: Partial<Category>) =>
    api.put<Category>(`/categories/${id}`, payload),
  deleteCategory: (id: number) => api.del<{ success: boolean; message: string }>(`/categories/${id}`),
  deactivateCategory: (id: number) => api.del<{ success: boolean; message: string }>(`/categories/${id}`),

  getProducts: (params?: { category_id?: number; active_only?: boolean; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.category_id) q.append('category_id', params.category_id.toString());
    if (params?.active_only !== undefined) q.append('active_only', params.active_only.toString());
    if (params?.search) q.append('search', params.search);
    return api.get<Product[]>(`/products?${q.toString()}`);
  },
  getProduct: (id: number) => api.get<Product>(`/products/${id}`),
  createProduct: (payload: { category_id: number; name: string; description?: string; selling_price: string; image_url?: string; track_stock?: boolean; stock_quantity?: number }) =>
    api.post<Product>('/products', payload),
  updateProduct: (id: number, payload: Partial<Product>) =>
    api.put<Product>(`/products/${id}`, payload),
  updateStock: (id: number, payload: { track_stock?: boolean; stock_quantity?: number }) =>
    api.patch<Product>(`/products/${id}/stock`, payload),
  deleteProduct: (id: number) => api.del<{ success: boolean; message: string }>(`/products/${id}`),
  deactivateProduct: (id: number) => api.del<{ success: boolean; message: string }>(`/products/${id}`),
};

export const billingService = {
  createBill: (payload: {
    payment_mode: 'CASH' | 'CARD' | 'UPI' | 'SPLIT';
    split_details?: { cash?: number | string; upi?: number | string; card?: number | string };
    discount_amount?: string;
    tax_amount?: string;
    items: { product_id: number; quantity: number }[];
  }) => api.post<Bill>('/bills', payload),

  listBills: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    payment_mode?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append('page', params.page.toString());
    if (params?.limit) q.append('limit', params.limit.toString());
    if (params?.search) q.append('search', params.search);
    if (params?.status) q.append('status', params.status);
    if (params?.payment_mode) q.append('payment_mode', params.payment_mode);
    if (params?.start_date) q.append('start_date', params.start_date);
    if (params?.end_date) q.append('end_date', params.end_date);
    return api.get<BillListResponse>(`/bills?${q.toString()}`);
  },

  getBillDetail: (id: number) => api.get<Bill>(`/bills/${id}`),

  voidBill: (id: number, reason: string) =>
    api.post<Bill>(`/bills/${id}/void`, { reason }),
};

export const expenseService = {
  listExpenses: (params?: { start_date?: string; end_date?: string; category?: string }) => {
    const q = new URLSearchParams();
    if (params?.start_date) q.append('start_date', params.start_date);
    if (params?.end_date) q.append('end_date', params.end_date);
    if (params?.category) q.append('category', params.category);
    return api.get<ExpenseListResponse>(`/expenses?${q.toString()}`);
  },
  createExpense: (payload: { category: string; description: string; amount: string; expense_date: string }) =>
    api.post<Expense>('/expenses', payload),
  updateExpense: (id: number, payload: Partial<Expense>) =>
    api.put<Expense>(`/expenses/${id}`, payload),
  deleteExpense: (id: number) => api.del<{ success: boolean; message: string }>(`/expenses/${id}`),
};

export const analyticsService = {
  getDaily: (date?: string) => {
    const q = date ? `?date=${date}` : '';
    return api.get<DailyAnalytics>(`/analytics/daily${q}`);
  },
  getWeekly: (startDate?: string) => {
    const q = startDate ? `?start_date=${startDate}` : '';
    return api.get<WeeklyAnalytics>(`/analytics/weekly${q}`);
  },
  getMonthly: (year?: number, month?: number) => {
    const q = new URLSearchParams();
    if (year) q.append('year', year.toString());
    if (month) q.append('month', month.toString());
    return api.get<MonthlyAnalytics>(`/analytics/monthly?${q.toString()}`);
  },
  getBestSellers: (params?: { limit?: number; start_date?: string; end_date?: string }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.append('limit', params.limit.toString());
    if (params?.start_date) q.append('start_date', params.start_date);
    if (params?.end_date) q.append('end_date', params.end_date);
    return api.get<BestSellerItem[]>(`/analytics/best-sellers?${q.toString()}`);
  },
  getSlowMovers: (params?: { limit?: number; days?: number }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.append('limit', params.limit.toString());
    if (params?.days) q.append('days', params.days.toString());
    return api.get<SlowMoverItem[]>(`/analytics/slow-movers?${q.toString()}`);
  },
};

export const shiftService = {
  getCurrentShift: () => api.get<ShiftCashflowSummary | null>('/shifts/current'),
  openShift: (payload: ShiftOpenRequest) => api.post<ShiftCashflowSummary>('/shifts/open', payload),
  closeShift: (payload: ShiftCloseRequest) => api.post<ShiftCashflowSummary>('/shifts/close', payload),
  getHistory: (limit = 15) => api.get<ShiftCashflowSummary[]>(`/shifts/history?limit=${limit}`),
};
