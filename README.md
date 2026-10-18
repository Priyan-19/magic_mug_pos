# ☕ Magic Mug POS

> **Production-Ready Cafe POS & Sales Management System**  
> A high-performance, real-time POS suite engineered for modern cafes, coffee shops, and restaurants. Features a **FastAPI (Python)** backend, **React 19 + Vite** web dashboard, and **Flutter (Android & iOS)** mobile application.

---

## 🌟 Key Features

- **⚡ Fast POS Terminal**: Intuitive interface for ringing up orders with instant calculations, discounts, taxes, and multi-mode payments (Cash, Card, UPI, Split).
- **🖨️ Thermal Receipt Printing & Sharing**: Generate visual receipts, print to Bluetooth/USB thermal printers, or export and share receipts instantly.
- **📱 True Cross-Platform**: Web administration dashboard + native mobile application for Android and iOS.
- **📁 Dynamic Menu & Category Management**: Add dishes, toggle item availability in real-time, and create custom menu categories directly from mobile or web.
- **📊 Real-Time Analytics & Reports**: Live tracking of revenue, daily/weekly/monthly trends, profit margins, and best-selling menu items.
- **💸 Expense Ledger**: Track day-to-day cafe expenses categorized by inventory, dairy, packaging, utilities, etc.
- **🏪 Daily Register & Cash Drawer Management**: Open/close daily shift registers with opening float, live physical cash tally, and end-of-day reconciliation with variance tracking.
- **💰 Cash Tender & Change Calculator**: Tracks exact cash tendered by customers and change returned, providing accurate physical drawer balance at all times.
- **🌐 Seamless Local Networking**: Connect mobile devices directly to the in-cafe server over local Wi-Fi with automatic fallback and connection tester.
- **🐳 1-Command Docker Deployment**: Fully containerized multi-service architecture ready for production.

---

## 🏗️ System Architecture

```text
                           ┌────────────────────────┐
                           │      Clients Layer     │
                           └───────────┬────────────┘
                                       │
                 ┌─────────────────────┴─────────────────────┐
                 ▼                                           ▼
      ┌──────────────────────┐                   ┌──────────────────────┐
      │   React Web Portal   │                   │  Flutter Mobile App  │
      │   (Desktop / Tablet) │                   │   (Android & iOS)    │
      └──────────┬───────────┘                   └──────────┬───────────┘
                 │ (Nginx Proxy)                            │ (HTTP / JSON)
                 └─────────────────────┬────────────────────┘
                                       ▼
                       ┌───────────────────────────────┐
                       │   FastAPI Backend API (8000)  │
                       │    (Python 3.12 / AsyncIO)    │
                       └───────────────┬───────────────┘
                                       │ (asyncpg)
                                       ▼
                       ┌───────────────────────────────┐
                       │    PostgreSQL 15 Database     │
                       │     (Volume Persisted)        │
                       └───────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend API** | Python 3.12, FastAPI, SQLAlchemy 2.0 (Async), Pydantic v2, Uvicorn |
| **Database** | PostgreSQL 15 (Docker / Supabase) / SQLite (Fallback for lightweight dev) |
| **Web Dashboard** | React 19, TypeScript, Vite, TailwindCSS, Lucide Icons, html2canvas |
| **Mobile App** | Flutter (Dart), Provider, Dio, FL Chart, Screenshot, Share Plus (iOS 13+ / Android 21+) |
| **Containerization** | Docker, Docker Compose, Nginx Alpine |

---

## 🚀 Quick Start (Production Docker Deployment)

The fastest way to deploy the entire stack is with **Docker Compose**.

### Prerequisites
- [Docker Engine](https://docs.docker.com/engine/install/) (v24.0+)
- [Docker Compose](https://docs.docker.com/compose/) (v2.20+)

### 1. Clone & Configure
```bash
git clone https://github.com/Priyan-19/magic_mug_pos.git
cd magic_mug_pos
```

Copy the example environment file:
```bash
cp .env.example .env
```

*(Optional)* Review `.env` and change `SECRET_KEY` and database passwords for production.

### 2. Launch Services
Run the entire stack with a single command:
```bash
docker compose up -d --build
```

### 3. Verify Deployment
| Service | URL / Port | Credentials / Purpose |
| :--- | :--- | :--- |
| **Web Frontend** | `http://localhost:5173` | Main POS & Management Dashboard |
| **Backend API** | `http://localhost:8000` | REST API Server |
| **Interactive API Docs**| `http://localhost:8000/docs` | Swagger / OpenAPI Documentation |
| **PostgreSQL DB** | `localhost:5432` | `pos_user` / `super_secure_pos_password` |

---

## 💻 Local Development Setup (Manual)

### 1. Backend (FastAPI)
```bash
cd backend
python -m venv .venv

# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Web Frontend (React + Vite)
```bash
cd apps/web
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Mobile App (Flutter)
```bash
cd apps/mobile
flutter pub get

# Run on connected device or emulator:
flutter run
```

---

## 🏪 Daily Register & Cash Drawer System

The POS enforces a mandatory daily register workflow to ensure accurate cash accountability:

### How It Works
1. **Open Register**: At the start of each day/shift, the cashier opens the register by entering the **Opening Cash Float** (physical cash in the drawer for making change).
2. **Billing Enforced**: No bills can be placed until the daily register is opened. The system blocks checkout and prompts the cashier to open the register first.
3. **Live Cash Tally**: Throughout the day, the system tracks:
   - **Cash Received from Customers** (gross amount tendered)
   - **Change Returned** (chillarai given back)
   - **Net Cash Sales** (received minus change)
   - **Shop Expenses** (paid from cash drawer)
   - **Expected Physical Cash in Drawer** = Opening Float + Net Cash Sales - Cash Expenses
4. **Close Register (EOD)**: At end of day, the cashier counts physical cash and enters the actual amount. The system computes the **variance** (surplus or shortage) for reconciliation.

### Cash Drawer Formula
```
Expected Cash = Opening Float + Cash Received (Gross) - Change Returned - Cash Expenses
Variance = Actual Closing Cash - Expected Cash
```

---

## 🌐 Cloud Backend Deployment & Mobile Sync Guide

Instead of being restricted to a local Wi-Fi network, hosting your backend on a cloud platform (Render, Railway, AWS, DigitalOcean, or any VPS) allows the mobile app and web dashboard to work **from anywhere over 4G/5G mobile data or any Wi-Fi connection**.

### 1. Deploy the Backend to the Cloud
You can deploy the backend using Docker or directly with Python:
- **Render / Railway / Fly.io**:
  1. Push this repository to GitHub.
  2. Create a new **Web Service** on Render or Railway pointing to `./backend`.
  3. Attach a managed **PostgreSQL** database instance.
  4. Set environment variables:
     - `DATABASE_URL`: `postgresql+asyncpg://...` (from your PostgreSQL database)
     - `SECRET_KEY`: `your-secure-production-secret-key`
     - `ALLOWED_ORIGINS`: `*`
  5. Deploy! You will receive your public live URL (e.g., `https://magic-mug-api.onrender.com`).

### 2. Configure Permanent Backend URL in Mobile App
Once your backend is live, set your cloud domain as the permanent default in `apps/mobile/lib/core/api_config.dart`:

```dart
// apps/mobile/lib/core/api_config.dart
static const String defaultBaseUrl = 'https://magic-mug-api.onrender.com/api/v1';
```

When you build the app, it will connect automatically to your cloud server on boot with zero setup needed by the user.

### 3. Change Backend URL Dynamically (In-App)
If you ever switch domains or want to test against a staging server:
- Tap the **Cafe Logo** in the top-left corner of the mobile app top bar.
- Enter your new API Server URL.
- Tap **Test Connection** to verify connectivity.
- Tap **Save & Connect**. The URL is saved permanently to local device storage (`SharedPreferences`).

---

## 📂 Project Structure

```text
MAGIC MUG/
├── apps/
│   ├── mobile/                  # Flutter Mobile Application
│   │   ├── android/             # Android native configuration & icons
│   │   ├── ios/                 # iOS native configuration & Podfile
│   │   ├── assets/              # App branding, logos, and HD icons
│   │   ├── lib/
│   │   │   ├── core/            # API client, theme tokens, network configs
│   │   │   ├── models/          # Product, Category, Bill, Expense models
│   │   │   ├── providers/       # State management (Cart, Menu, Auth, etc.)
│   │   │   ├── screens/         # POS, Catalog, History, Analytics, Expenses
│   │   │   └── widgets/         # Top bar, receipt modal, connection dialog
│   │   └── pubspec.yaml         # Flutter dependencies and assets config
│   │
│   └── web/                     # React 19 Web Management Dashboard
│       ├── src/
│       │   ├── components/      # UI components, ShiftModal, PrintableReceipt
│       │   ├── pages/           # POS, Orders, Analytics, Catalog, Expenses
│       │   ├── services/        # Typed API service integrations
│       │   ├── context/         # Auth, Toast, Cart contexts
│       │   └── types/           # TypeScript data interfaces & DTOs
│       ├── Dockerfile           # Web multi-stage build container
│       └── nginx.conf           # SPA routing & API reverse proxy
│
├── backend/                     # FastAPI Backend Server
│   ├── app/
│   │   ├── api/v1/              # Endpoints (auth, bills, products, shifts, analytics)
│   │   ├── core/                # Config, database engine, security
│   │   ├── models/              # SQLAlchemy database entities (incl. Shift)
│   │   ├── schemas/             # Pydantic request/response validation schemas
│   │   └── services/            # Business logic, audit logging
│   ├── Dockerfile               # Production Python container
│   └── requirements.txt         # Python dependencies
│
├── docker/
│   ├── postgres/
│   │   └── init.sql             # Database schema & initial seed data
│   └── unified-nginx.conf       # Single-container reverse proxy configuration
│
├── docs/                        # Architecture specs, PRD, and workflows
├── .env.example                 # Sample environment configuration template
├── .gitignore                   # Multi-platform production gitignore
├── docker-compose.yml           # Production multi-service orchestration
└── Dockerfile                   # All-in-one unified container build
```

---

## ⚙️ Environment Variables Reference

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `APP_NAME` | `MAGIC MUG POS` | Display name of the application |
| `ENV` | `production` | Environment mode (`development` / `production`) |
| `PORT` | `8000` | Backend API port |
| `DEBUG` | `False` | Enable debug logs and stack traces |
| `TIMEZONE` | `Asia/Kolkata` | Standard operational timezone for receipts |
| `DATABASE_URL` | `postgresql+asyncpg://...` | Asynchronous PostgreSQL connection string |
| `SECRET_KEY` | `magic-mug-super-secret-key...` | Cryptographic secret for JWT signing |
| `ALLOWED_ORIGINS`| `*` | CORS allowed origins (comma-separated or `*`) |

---

## 🔒 Security & Best Practices

- **Zero Hardcoded Secrets in Git**: Sensitive credentials are kept in `.env` files and excluded via `.gitignore`.
- **Prepared Statements**: All database operations use SQLAlchemy async ORM with parameterized queries to prevent SQL injections.
- **Audit Logging**: Every sensitive action (bill voids, product creations, expense additions) is automatically recorded in the `audit_logs` table.
- **Register Enforcement**: No bills can be processed without an active open shift/register, preventing untracked cash transactions.
- **Safe Network Isolation**: Database ports can be unexposed in production by removing host port bindings in `docker-compose.yml` if external access is not required.

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
