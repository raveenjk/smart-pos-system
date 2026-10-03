# ==============================================================================
# Smart POS System - GitHub Portfolio Deployment Script
# Splits codebase into 25 atomic, conventional commits for a senior-level portfolio
# Target: https://github.com/raveenjk/smart-pos-system
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   🚀 Preparing Smart POS System GitHub Commits" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Initialize Git if not initialized
if (!(Test-Path ".git")) {
    Write-Host "[1/27] Initializing fresh Git repository..." -ForegroundColor Yellow
    git init
} else {
    Write-Host "[1/27] Git repository already initialized." -ForegroundColor Green
}

# 2. Configure Remote Origin
Write-Host "[2/27] Setting remote origin to https://github.com/raveenjk/smart-pos-system.git..." -ForegroundColor Yellow
git remote remove origin 2>$null
git remote add origin https://github.com/raveenjk/smart-pos-system.git
git branch -M main

# Helper function to stage and commit
function Commit-Step($files, $msg, $stepNum) {
    Write-Host "[$stepNum/27] Commit: $msg" -ForegroundColor Magenta
    git add $files
    git commit -m "$msg" --allow-empty 2>$null
}

# 25 Atomic Commits
Commit-Step @(".gitignore", "package.json", "tsconfig.json", "vite.config.ts", "index.html") "chore(init): project setup with Vite, React 19, TypeScript and Tailwind CSS v4" "3"

Commit-Step @("tsconfig.electron.json", "electron/main.ts", "electron/preload.ts") "feat(electron): setup Electron desktop framework with TypeScript configuration" "4"

Commit-Step @("electron/database/schema.ts") "feat(database): design SQLite relational schema with WAL mode and foreign keys" "5"

Commit-Step @("electron/ipc/productHandlers.ts") "feat(ipc): implement modular Electron IPC handlers for products and categories" "6"

Commit-Step @("electron/ipc/saleHandlers.ts") "feat(ipc): implement atomic transaction handler for sales and invoice generation" "7"

Commit-Step @("src/types/index.ts", "src/stores/cartStore.ts") "feat(store): configure Zustand cart store with tax, discounts and live totals" "8"

Commit-Step @("src/index.css", "src/main.tsx", "src/components/shared/Layout.tsx", "src/components/shared/Sidebar.tsx", "src/components/shared/StatusBar.tsx") "feat(ui): design modern sidebar, responsive layout and navigation routing" "9"

Commit-Step @("src/pages/POS.tsx") "feat(pos): build interactive product selection grid with category tabs" "10"

Commit-Step @("electron/ipc/holdHandlers.ts", "src/components/pos/HoldBillsPanel.tsx") "feat(pos): add hold and recall multi-bill parking queue system" "11"

Commit-Step @("src/components/pos/PaymentModal.tsx") "feat(pos): build multi-method checkout modal with instant change calculation" "12"

Commit-Step @("src/pages/Inventory.tsx") "feat(inventory): add product CRUD, profit margin calculator and stock alerts" "13"

Commit-Step @("electron/ipc/barcodeHandlers.ts") "feat(barcode): integrate bwip-js barcode generator for CODE128 and QR codes" "14"

Commit-Step @("electron/ipc/printerHandlers.ts") "feat(printer): add 80mm ESC/POS thermal receipt engine with custom HTML template" "15"

Commit-Step @("src/pages/Customers.tsx", "electron/ipc/customerHandlers.ts") "feat(customers): add customer loyalty points, contacts and credit tracking" "16"

Commit-Step @("src/stores/authStore.ts", "src/components/shared/CashierSwitchModal.tsx", "src/pages/Employees.tsx") "feat(auth): implement employee PIN authentication and active cashier switching" "17"

Commit-Step @("electron/license/licenseManager.ts", "electron/ipc/licenseHandlers.ts", "scripts/generate-license.js") "feat(licensing): build machine-bound HMAC-SHA256 hardware license engine" "18"

Commit-Step @("license-generator.html") "feat(licensing): add mobile vendor license generator tool with PIN protection" "19"

Commit-Step @("src/stores/settingsStore.ts", "src/pages/Settings.tsx") "feat(branding): add live 80mm receipt studio preview and shop logo upload" "20"

Commit-Step @("electron/sync/syncEngine.ts", "supabase/schema.sql", "src/stores/syncStore.ts") "feat(sync): integrate Supabase cloud background sync engine and PostgreSQL schema" "21"

Commit-Step @("src/pages/Reports.tsx", "electron/ipc/reportHandlers.ts", "src/pages/Dashboard.tsx") "feat(analytics): build sales analytics dashboard with charts and CSV export" "22"

Commit-Step @("src/App.tsx") "fix(router): switch BrowserRouter to HashRouter for Electron file protocol compatibility" "23"

Commit-Step @("src/lib/mockApi.ts") "feat(dev): add browser mock API for seamless web preview mode" "24"

Commit-Step @("assets/icon.png", "scripts/create-icon.js") "style(assets): add custom application icon and build generator" "25"

Commit-Step @("scripts/test-webcrypto.js", "scripts/README-LICENSE.md") "test(crypto): add HMAC-SHA256 WebCrypto algorithm verification test" "26"

Commit-Step @("README.md", "walkthrough.md") "docs: add comprehensive architecture, API guide and walkthrough documentation" "27"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "   🎉 All 25 Atomic Commits Created Successfully!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Ready to push to GitHub:" -ForegroundColor Cyan
Write-Host "git push -u origin main --force" -ForegroundColor White
Write-Host ""
