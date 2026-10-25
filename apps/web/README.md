# ☕ Magic Mug POS — Web Dashboard

> **Modern, High-Performance Cafe POS & Analytics Portal**  
> Built with **React 19**, **TypeScript**, **Vite**, and **TailwindCSS**. Engineered for high-speed counter operations, real-time inventory tracking, and deep financial analytics.

---

## 🌟 Key Capabilities

- **⚡ Lightning-Fast POS Counter**:
  - Full-screen, responsive order ring-up interface.
  - Multi-category navigation with instant search and dish filtering.
  - Live tax, discount, and tender breakdown (Cash, Card, UPI, Split).
  - One-click order completion with instant receipt generation.

- **🖨️ Thermal Receipt Printing & Export**:
  - Built-in printable thermal slip renderer formatted for 80mm & 58mm thermal printers.
  - Instant print trigger and digital receipt sharing via HTML5 Canvas.

- **🏪 Daily Register & Drawer Management**:
  - Enforced register opening float before billing starts.
  - Live cash tally: tracks gross cash tendered, change returned, and net cash sales.
  - End-of-day register closing with physical cash reconciliation and variance calculation.

- **📊 Modern Financial Analytics**:
  - Live KPI cards: Total Revenue, Total Bills, Avg Order Value, Net Profit.
  - Redesigned **Hourly Sales Bar Chart** featuring clean Y-axis scale markers (`₹0`, `₹500`, `₹1k`), horizontal reference gridlines, rounded-top columns (`rounded-t-md`), and floating glassmorphic tooltips.
  - Real-time active hour indicator and peak sales hour badge.
  - Tender breakdown: Cash vs UPI/QR vs Card distribution.

- **🛡️ Single User Role Model (`USER`)**:
  - Unified, streamlined authentication without complex role switches.
  - Full operator profile management via the **Account Settings** modal (update full name, username, password with live feedback).

- **🚀 Boot Preloading & In-Memory Cache**:
  - On login, a 3.8s background pipeline preloads menu products, categories, active shifts, and image assets in parallel.
  - Guarantees zero loading delays or blank skeletons once on the POS counter.

---

## 🏗️ Directory Layout

```text
apps/web/src/
├── components/          # Reusable UI components
│   ├── AccountSettingsModal.tsx  # User profile & password management
│   ├── Navbar.tsx                # Top navigation & system status
│   ├── PrintableReceipt.tsx      # Thermal receipt layout
│   ├── ShiftModal.tsx            # Daily register open / close & drawer tally
│   ├── Sidebar.tsx               # Primary navigation sidebar
│   └── TopHeader.tsx             # Header bar & quick action controls
├── context/             # Global React Contexts
│   ├── AuthContext.tsx           # Session state, JWT token, user info
│   └── ToastContext.tsx          # High-priority z-[9999] floating notifications
├── pages/               # Application Routes
│   ├── AnalyticsPage.tsx         # Revenue trends, hourly bar chart & metrics
│   ├── CatalogPage.tsx           # Menu dish & category CRUD manager
│   ├── ExpensesPage.tsx          # Daily expense ledger & categorization
│   ├── LoginPage.tsx             # Minimalist credential entry & boot loader
│   ├── OrdersPage.tsx            # Order history, bill reprint & audit log
│   └── PosPage.tsx               # High-speed primary billing counter
├── services/            # Backend API Service Integrations
│   └── cafeServices.ts           # Axios / Fetch client with JWT interceptor
├── types/               # TypeScript Data Interfaces & DTOs
│   └── index.ts                  # Product, Category, Bill, Shift, Analytics models
└── utils/               # Helper utilities & image mapping
```

---

## 💻 Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in `apps/web/`:
```ini
VITE_API_URL=http://localhost:8000/api/v1
```

### 3. Launch Development Server
```bash
npm run dev
```
The application will run on `http://localhost:5173`.

### 4. Build for Production
```bash
npm run build
```
Generates a type-checked and minified production bundle in `dist/`.
