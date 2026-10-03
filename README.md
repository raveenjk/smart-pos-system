# 🛒 Smart POS System — Enterprise Desktop & Cloud-Hybrid Point of Sale

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Electron](https://img.shields.io/badge/Electron_36-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![SQLite](https://img.shields.io/badge/SQLite_WAL-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org/)
[![Supabase](https://img.shields.io/badge/Supabase_Cloud-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

An **offline-first, cloud-hybrid Point of Sale (POS) and inventory management desktop application** built for retail stores, supermarkets, and pharmacies. Engineered with a zero-latency local SQLite engine, automatic background cloud synchronization, hardware integration for thermal receipt printers & USB barcode scanners, and a machine-bound cryptographic licensing system.

---

## 🌟 Key Features

### 🛍️ 1. Ultra-Fast POS Billing Terminal
- **Interactive Product Grid**: Fast category filtering, real-time name & barcode search.
- **Cart Management**: Item-level discounts, quantity multipliers, dynamic tax calculations.
- **Multi-Bill Parking Queue (Hold & Recall)**: Park active carts for multiple customers and recall them without loss of cart state.
- **Multi-Method Checkout**: Cash (instant change calculation & quick amount roundups), Card, and QR payment.
- **Instant Digital Receipts**: Print to 80mm thermal receipt printer, export PDF, or send itemized bill directly via WhatsApp.

### 📦 2. Comprehensive Inventory Management
- Real-time stock decrement on checkout with automatic **Low Stock Alerts**.
- Unit pricing, cost price tracking, and automatic **Gross Profit Margin Calculations**.
- Built-in **Barcode & QR Generator** (`bwip-js`) supporting Code128 format with direct printing capability.

### 👥 3. Cashier Shifts & Multi-User Access
- Role-Based Access Control (**Admin, Manager, Cashier**).
- Interactive Numpad PIN modal for seamless cashier switching during shift handovers.
- Sales transactions automatically attributed to the logged-in cashier.

### 📊 4. Business Analytics & Reporting
- Daily revenue trends, average transaction value, and best-selling product leaderboards powered by `recharts`.
- Date range presets (Today, 7 Days, 30 Days, This Month) and custom range picker.
- **One-click Export to CSV / Excel** for accounting and book-keeping.

### 🏪 5. Shop Identity & Live 80mm Receipt Studio
- Dynamic branding: Upload shop logo, custom store name, branch subtitle, BR/Tax number, address, and phone.
- **Live 80mm Thermal Receipt Studio Preview**: Real-time paper simulation in settings showing exact print output as details are typed.
- Custom receipt greetings and return/exchange policy footer notes.
- **Auto-Print on Checkout** and **Silent Direct Printing** switches for high-volume retail counters.

### 🔐 6. Machine-Bound Hardware Licensing (Commercial Retail Protection)
- Anti-piracy architecture: System extracts permanent physical hardware identifiers (NIC MAC Address + CPU processor model).
- Cryptographic **HMAC-SHA256 signature verification** runs 100% offline.
- Software is cryptographically locked to the client's PC hardware — cannot be copied to unauthorized computers.
- Includes a mobile-responsive vendor tool (`license-generator.html`) for generating client keys from smartphones.

### ☁️ 7. Offline-First Cloud Synchronization
- Primary operations use local SQLite with **Write-Ahead Logging (WAL)** for high concurrency and zero power-loss data corruption.
- Background sync worker detects network status and pushes pending sales and stock levels to **Supabase Cloud PostgreSQL** every 30 seconds.
- Real-time WebSockets allow live multi-counter stock synchronization and remote owner monitoring.

---

## 🏗️ Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Frontend UI  : React 19 + TypeScript + Tailwind CSS     │
├─────────────────────────────────────────────────────────────┤
│ 2. Desktop OS   : Electron (Native Windows Runtime)         │
├─────────────────────────────────────────────────────────────┤
│ 3. Offline DB   : SQLite (better-sqlite3) - 0ms Latency     │
├─────────────────────────────────────────────────────────────┤
│ 4. Cloud DB     : Supabase (PostgreSQL + Realtime Sync)     │
├─────────────────────────────────────────────────────────────┤
│ 5. Hardware/Sec : bwip-js (Barcode) + HMAC-SHA256 (License) │
└─────────────────────────────────────────────────────────────┘
```

- **Runtime**: Node.js v22 + Electron v36
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Zustand, Lucide Icons, Recharts, date-fns
- **Local Storage**: SQLite 3 (`better-sqlite3` native C++ bindings with WAL mode)
- **Cloud Backend**: Supabase PostgreSQL with Row Level Security (RLS)
- **Packaging**: `electron-builder` producing Windows NSIS (`.exe`) installers

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/raveenjk/smart-pos-system.git
cd smart-pos-system

# Install dependencies
npm install --legacy-peer-deps
```

### Running in Development
```bash
# Launches Vite dev server and Electron desktop window concurrently
npm run dev
```

### Production Build & Installer Generation
```bash
# Compile Vite frontend and Electron TypeScript main process
npm run build

# Package into Windows NSIS installer
npm run dist:win
# Output: release/POS System Setup 1.0.0.exe
```

---

## 📂 Project Structure

```
smart-pos-system/
├── electron/                  # Electron Main Process (Node.js)
│   ├── database/schema.ts     # SQLite schema, tables & WAL config
│   ├── ipc/                   # Modular IPC Handlers
│   │   ├── productHandlers.ts # Products, inventory & categories
│   │   ├── saleHandlers.ts    # Transaction billing & stock deductions
│   │   ├── customerHandlers.ts# Customer profiles & loyalty
│   │   ├── printerHandlers.ts # 80mm thermal receipt HTML builder
│   │   ├── barcodeHandlers.ts # bwip-js Code128 & QR engine
│   │   ├── holdHandlers.ts    # Bill parking / hold queue
│   │   └── licenseHandlers.ts # Hardware license activation IPC
│   ├── license/               # Machine-bound HMAC-SHA256 licensing
│   ├── sync/syncEngine.ts     # Offline-to-Supabase background sync
│   ├── main.ts                # Application lifecycle & window creation
│   └── preload.ts             # Secure contextBridge IPC exposure
├── src/                       # React Renderer Process
│   ├── components/            # Layout, POS panels, modals & UI widgets
│   ├── pages/                 # Dashboard, POS, Inventory, Reports, Settings
│   ├── stores/                # Zustand stores (cartStore, settingsStore, authStore)
│   ├── lib/mockApi.ts         # Browser fallback mock API for web preview
│   └── types/index.ts         # Central TypeScript interfaces
├── supabase/schema.sql        # Cloud PostgreSQL database migration script
├── scripts/                   # Vendor licensing utilities & CLI
└── license-generator.html     # Standalone mobile PWA for generating client keys
```

---

## 📜 License
Proprietary commercial software. Developed by **Raveen**. All rights reserved.
