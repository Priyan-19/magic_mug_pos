# Magic Mug Cafe - Flutter Mobile POS Application 📱☕

A production-ready cross-platform mobile POS (Point of Sale) & cafe management application built with **Flutter**, connecting directly to the **Magic Mug FastAPI Backend**.

---

## 🚀 Key Features

1. **POS Terminal**:
   - Filter menu items by categories (All, Cold, Hot, Snacks, Desserts).
   - Fast live search bar with instant filter.
   - Popular dish highlight badges.
   - Dynamic Cart Sheet with quantity adjustment, discount input, payment mode selection (CASH, UPI, CARD).
   - Auto bill generation with daily sequential bill numbering (`MUG-YYYYMMDD-XXXX`).

2. **Digital Thermal Receipt**:
   - Pixel-perfect digital thermal receipt with Magic Mug branding, itemized table, and tax calculations.
   - **One-touch WhatsApp PNG Share**: Captures high-res receipt image and shares directly to WhatsApp.
   - **Print Preview**: Ready for ESC/POS Bluetooth/Wi-Fi thermal printers.

3. **Order History**:
   - Real-time order log with daily date filtering.
   - Status tracking (`CONFIRMED` / `VOID`).
   - One-tap bill re-print & share.
   - Manager void authorization with mandatory reason prompt.

4. **Analytics & Reports**:
   - Live KPI Cards: Revenue, Expenses, Net Profit Margin, Avg Order Value.
   - Interactive Sales Trend Charts (`fl_chart`).
   - Ranked Top Selling Dishes (#1, #2, #3).

5. **Menu Catalog Management**:
   - Add new dishes with price, category, and description.
   - Instant soft activate/deactivate toggle switches.

6. **Expense Tracking**:
   - Overhead logger (Raw materials, Utilities, Rent, Salaries, Maintenance).
   - Real-time category tracking.

---

## 📁 Architecture Overview

```
apps/mobile/
├── assets/
│   └── logo.png                        # Magic Mug branding logo
├── lib/
│   ├── main.dart                       # MultiProvider setup & App root
│   ├── core/
│   │   ├── theme.dart                  # Curated palette (#741A23 Maroon, #1E4D2B Forest Green)
│   │   ├── api_config.dart             # Backend endpoint routes & base URL
│   │   └── api_client.dart             # Dio HTTP client with JWT interceptor
│   ├── models/
│   │   ├── user.dart                   # User credentials & roles
│   │   ├── category.dart               # Menu categories
│   │   ├── product.dart                # Dish catalog
│   │   ├── bill.dart                   # Bill & BillItem models
│   │   └── expense.dart                # Expense & Analytics models
│   ├── providers/
│   │   ├── auth_provider.dart          # Session & Auto-login
│   │   ├── cart_provider.dart          # Real-time POS cart math
│   │   ├── menu_provider.dart          # Dish & category catalog
│   │   ├── bill_provider.dart          # Checkout & void transactions
│   │   ├── expense_provider.dart       # Cafe overheads
│   │   └── analytics_provider.dart     # KPI engine & sales trends
│   ├── widgets/
│   │   ├── custom_top_bar.dart         # Responsive Top Header with cafe logo & profile badge
│   │   └── receipt_dialog.dart         # Thermal bill canvas, PNG export, WhatsApp share
│   └── screens/
│       ├── splash_screen.dart          # Ripple logo boot animation
│       ├── main_navigation_screen.dart # 5-Tab persistent navigation bar
│       ├── pos_screen.dart             # POS Terminal & Cart Checkout Sheet
│       ├── history_screen.dart         # Order history & Void actions
│       ├── analytics_screen.dart       # KPI stats & Sales bar charts
│       ├── catalog_screen.dart         # Menu item management
│       └── expenses_screen.dart        # Expense logging
└── pubspec.yaml                        # Dependencies & assets declaration
```

---

## 🛠️ How to Run

### 1. Prerequisites
Ensure you have the Flutter SDK installed on your system:
```bash
flutter doctor
```

### 2. Configure Backend Connection
Open `lib/core/api_config.dart`:
- **Android Emulator**: `http://10.0.2.2:8000/api/v1` (Default)
- **Real Android/iOS Phone over Wi-Fi**: `http://<YOUR_PC_LAN_IP>:8000/api/v1` (e.g. `http://192.168.1.10:8000/api/v1`)
- **Ngrok Public Tunnel**: Use your active ngrok tunnel URL (e.g. `https://xxxx.ngrok-free.app/api/v1`)

### 3. Install Dependencies
Navigate into `apps/mobile`:
```bash
cd "d:\MAGIC MUG\apps\mobile"
flutter pub get
```

### 4. Launch Application
```bash
# Run on connected device or emulator
flutter run

# Build Production Android APK
flutter build apk --release
```
Output APK location:
`build/app/outputs/flutter-apk/app-release.apk`
