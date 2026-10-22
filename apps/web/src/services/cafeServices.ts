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

// ============================================================================
// In-Memory Performance Caching & Request Deduplication
// ============================================================================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CATALOG_CACHE_TTL = 3 * 60 * 1000; // 3 minutes TTL for menu catalog
const catalogCache = new Map<string, CacheEntry<any>>();

export const clearCatalogCache = () => {
  catalogCache.clear();
};

const SESSION_SHIFT_KEY = 'magic_mug_cached_shift';

export const getStoredShift = (): ShiftCashflowSummary | null => {
  try {
    if (typeof window === 'undefined') return null;
    const item = sessionStorage.getItem(SESSION_SHIFT_KEY);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
};

export const setStoredShift = (shift: ShiftCashflowSummary | null) => {
  try {
    if (typeof window === 'undefined') return;
    if (shift) {
      sessionStorage.setItem(SESSION_SHIFT_KEY, JSON.stringify(shift));
    } else {
      sessionStorage.removeItem(SESSION_SHIFT_KEY);
    }
  } catch {}
};

let currentShiftPromise: Promise<ShiftCashflowSummary | null> | null = null;
let lastShiftFetchTime = 0;
let cachedShift: ShiftCashflowSummary | null = getStoredShift();
const SHIFT_CACHE_WINDOW = 3000; // 3s deduplication window for concurrent component mounts

export const clearShiftCache = () => {
  cachedShift = null;
  lastShiftFetchTime = 0;
  currentShiftPromise = null;
  setStoredShift(null);
};

// Listen to window shift-updated events to invalidate cache
if (typeof window !== 'undefined') {
  window.addEventListener('shift-updated', () => {
    clearShiftCache();
  });
}

export const authService = {
  login: (username: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { username, password }),
  getMe: () => api.get<User>('/auth/me'),
};

export const catalogService = {
  getCategories: async (includeInactive = false, forceRefresh = false) => {
    const key = `categories_${includeInactive}`;
    const cached = catalogCache.get(key);
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CATALOG_CACHE_TTL) {
      return cached.data as Category[];
    }
    const data = await api.get<Category[]>(`/categories?include_inactive=${includeInactive}`);
    catalogCache.set(key, { data, timestamp: Date.now() });
    return data;
  },
  createCategory: async (payload: { name: string; description?: string; display_order?: number; is_active?: boolean }) => {
    clearCatalogCache();
    return api.post<Category>('/categories', payload);
  },
  updateCategory: async (id: number, payload: Partial<Category>) => {
    clearCatalogCache();
    return api.put<Category>(`/categories/${id}`, payload);
  },
  deleteCategory: async (id: number) => {
    clearCatalogCache();
    return api.del<{ success: boolean; message: string }>(`/categories/${id}`);
  },
  deactivateCategory: async (id: number) => {
    clearCatalogCache();
    return api.del<{ success: boolean; message: string }>(`/categories/${id}`);
  },

  getProducts: async (
    params?: { category_id?: number; active_only?: boolean; search?: string },
    forceRefresh = false
  ) => {
    const q = new URLSearchParams();
    if (params?.category_id) q.append('category_id', params.category_id.toString());
    if (params?.active_only !== undefined) q.append('active_only', params.active_only.toString());
    if (params?.search) q.append('search', params.search);
    const key = `products_${q.toString()}`;
    const cached = catalogCache.get(key);
    // Only cache unfiltered or category-filtered lists (not search queries)
    if (!forceRefresh && !params?.search && cached && Date.now() - cached.timestamp < CATALOG_CACHE_TTL) {
      return cached.data as Product[];
    }
    const data = await api.get<Product[]>(`/products?${q.toString()}`);
    if (!params?.search) {
      catalogCache.set(key, { data, timestamp: Date.now() });
    }
    return data;
  },
  getProduct: (id: number) => api.get<Product>(`/products/${id}`),
  createProduct: async (payload: {
    category_id: number;
    name: string;
    description?: string;
    selling_price: string;
    image_url?: string;
    track_stock?: boolean;
    stock_quantity?: number;
  }) => {
    clearCatalogCache();
    return api.post<Product>('/products', payload);
  },
  updateProduct: async (id: number, payload: Partial<Product>) => {
    clearCatalogCache();
    return api.put<Product>(`/products/${id}`, payload);
  },
  updateStock: async (id: number, payload: { track_stock?: boolean; stock_quantity?: number }) => {
    clearCatalogCache();
    return api.patch<Product>(`/products/${id}/stock`, payload);
  },
  deleteProduct: async (id: number) => {
    clearCatalogCache();
    return api.del<{ success: boolean; message: string }>(`/products/${id}`);
  },
  deactivateProduct: async (id: number) => {
    clearCatalogCache();
    return api.del<{ success: boolean; message: string }>(`/products/${id}`);
  },
};

export const billingService = {
  createBill: async (payload: {
    payment_mode: 'CASH' | 'CARD' | 'UPI' | 'SPLIT';
    split_details?: { cash?: number | string; upi?: number | string; card?: number | string };
    discount_amount?: string;
    tax_amount?: string;
    items: { product_id: number; quantity: number }[];
  }) => {
    const bill = await api.post<Bill>('/bills', payload);
    // Invalidate shift cache and catalog (to reflect deducted stock)
    clearShiftCache();
    clearCatalogCache();
    return bill;
  },

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

  voidBill: async (id: number, reason: string) => {
    const result = await api.post<Bill>(`/bills/${id}/void`, { reason });
    clearShiftCache();
    return result;
  },
};

export const expenseService = {
  listExpenses: (params?: { start_date?: string; end_date?: string; category?: string }) => {
    const q = new URLSearchParams();
    if (params?.start_date) q.append('start_date', params.start_date);
    if (params?.end_date) q.append('end_date', params.end_date);
    if (params?.category) q.append('category', params.category);
    return api.get<ExpenseListResponse>(`/expenses?${q.toString()}`);
  },
  createExpense: async (payload: { category: string; description: string; amount: string; expense_date: string }) => {
    const res = await api.post<Expense>('/expenses', payload);
    clearShiftCache();
    return res;
  },
  updateExpense: async (id: number, payload: Partial<Expense>) => {
    const res = await api.put<Expense>(`/expenses/${id}`, payload);
    clearShiftCache();
    return res;
  },
  deleteExpense: async (id: number) => {
    const res = await api.del<{ success: boolean; message: string }>(`/expenses/${id}`);
    clearShiftCache();
    return res;
  },
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
  getCurrentShift: async (forceRefresh = false): Promise<ShiftCashflowSummary | null> => {
    const now = Date.now();
    // Return cached value if within the short deduplication window
    if (!forceRefresh && cachedShift !== null && now - lastShiftFetchTime < SHIFT_CACHE_WINDOW) {
      return cachedShift;
    }
    // If a request is already in-flight, return the same promise to prevent duplicate network hits
    if (!forceRefresh && currentShiftPromise) {
      return currentShiftPromise;
    }

    currentShiftPromise = api
      .get<ShiftCashflowSummary | null>('/shifts/current')
      .then((data) => {
        cachedShift = data;
        setStoredShift(data);
        lastShiftFetchTime = Date.now();
        currentShiftPromise = null;
        return data;
      })
      .catch((err) => {
        currentShiftPromise = null;
        throw err;
      });

    return currentShiftPromise;
  },
  openShift: async (payload: ShiftOpenRequest) => {
    clearShiftCache();
    const res = await api.post<ShiftCashflowSummary>('/shifts/open', payload);
    cachedShift = res;
    setStoredShift(res);
    return res;
  },
  closeShift: async (payload: ShiftCloseRequest) => {
    clearShiftCache();
    const res = await api.post<ShiftCashflowSummary>('/shifts/close', payload);
    setStoredShift(null);
    return res;
  },
  getHistory: (limit = 15) => api.get<ShiftCashflowSummary[]>(`/shifts/history?limit=${limit}`),
};
