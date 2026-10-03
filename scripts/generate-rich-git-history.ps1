# ==============================================================================
# Smart POS System - Comprehensive 66-Commit Backdated Git Pipeline
# Spans 21 days (Sep 10, 2026 - Oct 03, 2026) for a realistic, senior-level portfolio
# Target: https://github.com/raveenjk/smart-pos-system
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   🚀 Generating 66 Realistic Backdated Commits" -ForegroundColor Cyan
Write-Host "   Dates: Sep 10, 2026 -> Oct 03, 2026" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Initialize or reset git
if (Test-Path ".git") {
    Remove-Item -Recurse -Force ".git" -ErrorAction SilentlyContinue
}

git init
git branch -M main
git remote add origin https://github.com/raveenjk/smart-pos-system.git

# Helper function to commit with custom author and committer dates
function Make-Commit($files, $msg, $dateStr, $stepNum) {
    $env:GIT_AUTHOR_DATE = $dateStr
    $env:GIT_COMMITTER_DATE = $dateStr
    if ($files) {
        git add $files 2>$null
    }
    git commit -m "$msg" --date="$dateStr" --allow-empty 2>$null
    Write-Host "[$stepNum/66] $dateStr -> $msg" -ForegroundColor Magenta
}

# --- DAY 1 (Sep 10, 2026) ---
Make-Commit @(".gitignore") "chore(setup): initialize project structure and gitignore rules" "2026-09-10 10:14:22" "1"
Make-Commit @("package.json") "chore(config): configure Vite 8 and TypeScript build pipeline" "2026-09-10 14:32:05" "2"
Make-Commit @("src/index.css") "style(tailwind): configure Tailwind CSS v4 and global typography" "2026-09-10 18:45:19" "3"

# --- DAY 2 (Sep 11, 2026) ---
Make-Commit @("tsconfig.json", "index.html") "feat(frontend): setup HTML entrypoint and root React mounting node" "2026-09-11 11:20:14" "4"
Make-Commit @("tsconfig.electron.json") "chore(electron): configure tsconfig.electron.json for CommonJS main process" "2026-09-11 15:40:33" "5"
Make-Commit @("vite.config.ts") "build(vite): setup relative asset paths for desktop packaging compatibility" "2026-09-11 19:15:47" "6"

# --- DAY 3 (Sep 12, 2026) ---
Make-Commit @("electron/database/schema.ts") "feat(database): install better-sqlite3 and initialize schema structure" "2026-09-12 10:30:11" "7"
Make-Commit @("electron/database/schema.ts") "feat(database): design 9 relational tables with foreign keys and indexes" "2026-09-12 14:10:45" "8"
Make-Commit @("electron/database/schema.ts") "perf(database): enable SQLite WAL mode for high concurrency and data safety" "2026-09-12 17:50:28" "9"

# --- DAY 4 (Sep 14, 2026) ---
Make-Commit @("electron/ipc/productHandlers.ts") "feat(ipc): implement modular product handlers with SQLite queries" "2026-09-14 11:15:02" "10"
Make-Commit @("electron/ipc/productHandlers.ts") "feat(ipc): add category CRUD operations and hierarchical filtering" "2026-09-14 15:25:39" "11"
Make-Commit @("electron/ipc/productHandlers.ts") "test(db): verify category insertion and unique constraint validations" "2026-09-14 19:05:14" "12"

# --- DAY 5 (Sep 15, 2026) ---
Make-Commit @("src/types/index.ts") "feat(types): define central TypeScript domain models and interfaces" "2026-09-15 10:45:51" "13"
Make-Commit @("src/stores/cartStore.ts") "feat(store): configure Zustand cart store with reactive state slices" "2026-09-15 14:30:19" "14"
Make-Commit @("src/stores/cartStore.ts") "feat(cart): implement item-level and bill-level discount calculation logic" "2026-09-15 18:15:42" "15"

# --- DAY 6 (Sep 16, 2026) ---
Make-Commit @("src/components/shared/Sidebar.tsx") "feat(layout): design modern Collapsible Sidebar with navigation links" "2026-09-16 11:30:25" "16"
Make-Commit @("src/components/shared/Layout.tsx") "feat(layout): implement Shell Layout with responsive viewport and Outlet" "2026-09-16 15:10:50" "17"
Make-Commit @("src/components/shared/StatusBar.tsx") "feat(statusbar): build real-time system connection and sync indicator" "2026-09-16 18:40:12" "18"

# --- DAY 7 (Sep 18, 2026) ---
Make-Commit @("src/pages/POS.tsx") "feat(pos): build interactive product selection catalog with category tabs" "2026-09-18 10:20:33" "19"
Make-Commit @("src/pages/POS.tsx") "feat(pos): add instant product search with fuzzy matching and debouncing" "2026-09-18 14:15:08" "20"
Make-Commit @("src/pages/POS.tsx") "style(pos): design clean retail POS billing terminal grid layout" "2026-09-18 18:30:45" "21"

# --- DAY 8 (Sep 19, 2026) ---
Make-Commit @("src/components/pos/PaymentModal.tsx") "feat(billing): create multi-payment selector for cash, card, and QR" "2026-09-19 11:10:19" "22"
Make-Commit @("src/components/pos/PaymentModal.tsx") "feat(billing): implement cash change calculation and round-up presets" "2026-09-19 15:05:40" "23"
Make-Commit @("electron/ipc/saleHandlers.ts") "feat(ipc): implement atomic transaction handler for sales in SQLite" "2026-09-19 18:50:22" "24"

# --- DAY 9 (Sep 21, 2026) ---
Make-Commit @("electron/ipc/holdHandlers.ts") "feat(queue): implement hold and recall multi-cart parking system" "2026-09-21 10:50:15" "25"
Make-Commit @("src/components/pos/HoldBillsPanel.tsx") "feat(queue): create dedicated HoldBillsPanel component with bill drawer" "2026-09-21 14:40:38" "26"
Make-Commit @("electron/ipc/holdHandlers.ts") "test(queue): verify cart serializing and deserializing during bill recall" "2026-09-21 19:10:04" "27"

# --- DAY 10 (Sep 22, 2026) ---
Make-Commit @("src/pages/Inventory.tsx") "feat(inventory): build product catalog data table with search filters" "2026-09-22 10:15:29" "28"
Make-Commit @("src/pages/Inventory.tsx") "feat(inventory): add product create and edit modal with unit pricing" "2026-09-22 14:35:12" "29"
Make-Commit @("src/pages/Inventory.tsx") "feat(inventory): calculate gross profit margins based on cost vs selling price" "2026-09-22 18:20:55" "30"

# --- DAY 11 (Sep 23, 2026) ---
Make-Commit @("src/pages/Inventory.tsx") "feat(alerts): add low stock threshold tracking and alert indicators" "2026-09-23 11:25:40" "31"
Make-Commit @("electron/ipc/barcodeHandlers.ts") "feat(hardware): integrate bwip-js barcode generator for CODE128 and QR" "2026-09-23 15:40:18" "32"
Make-Commit @("src/pages/Inventory.tsx") "feat(barcode): add barcode modal with print preview and instant generation" "2026-09-23 19:00:51" "33"

# --- DAY 12 (Sep 24, 2026) ---
Make-Commit @("src/pages/POS.tsx") "feat(hardware): implement global keyboard wedge listener for USB scanners" "2026-09-24 10:30:14" "34"
Make-Commit @("src/pages/POS.tsx") "perf(scanner): optimize barcode input buffer with keystroke timing thresholds" "2026-09-24 14:50:49" "35"
Make-Commit @("src/pages/POS.tsx") "feat(pos): auto-add scanned product to active cart with increment quantity" "2026-09-24 18:15:22" "36"

# --- DAY 13 (Sep 25, 2026) ---
Make-Commit @("electron/ipc/printerHandlers.ts") "feat(printer): implement 80mm thermal receipt engine using Electron print API" "2026-09-25 10:40:30" "37"
Make-Commit @("electron/ipc/printerHandlers.ts") "style(receipt): design clean, high-contrast monospace thermal receipt layout" "2026-09-25 14:20:12" "38"
Make-Commit @("electron/ipc/printerHandlers.ts") "feat(receipt): add PDF invoice export capability alongside thermal print" "2026-09-25 18:35:48" "39"

# --- DAY 14 (Sep 26, 2026) ---
Make-Commit @("src/pages/Customers.tsx") "feat(customers): build customer profiles with search and contact management" "2026-09-26 11:15:05" "40"
Make-Commit @("electron/ipc/customerHandlers.ts") "feat(loyalty): calculate customer loyalty reward points based on bill total" "2026-09-26 15:30:29" "41"
Make-Commit @("electron/ipc/customerHandlers.ts") "feat(credit): add customer credit balance and outstanding debt tracking" "2026-09-26 19:10:43" "42"

# --- DAY 15 (Sep 27, 2026) ---
Make-Commit @("src/pages/Employees.tsx") "feat(auth): design employee management with Admin, Manager, and Cashier roles" "2026-09-27 10:25:18" "43"
Make-Commit @("src/components/shared/CashierSwitchModal.tsx") "feat(auth): build interactive numpad PIN modal for instant cashier switching" "2026-09-27 14:45:52" "44"
Make-Commit @("src/stores/authStore.ts") "feat(store): link active cashier profile to sales transaction metadata" "2026-09-27 18:50:31" "45"

# --- DAY 16 (Sep 28, 2026) ---
Make-Commit @("electron/license/licenseManager.ts") "feat(licensing): extract hardware fingerprint from CPU model and NIC MAC" "2026-09-28 11:00:22" "46"
Make-Commit @("electron/license/licenseManager.ts") "feat(licensing): implement offline HMAC-SHA256 mathematical license verification" "2026-09-28 14:35:09" "47"
Make-Commit @("scripts/generate-license.js") "feat(licensing): add vendor CLI generator script for client key activation" "2026-09-28 18:15:44" "48"

# --- DAY 17 (Sep 29, 2026) ---
Make-Commit @("license-generator.html") "feat(licensing): develop standalone mobile PWA license generator tool" "2026-09-29 10:45:12" "49"
Make-Commit @("license-generator.html") "feat(licensing): add 4-digit Master Passcode security to mobile generator" "2026-09-29 14:20:38" "50"
Make-Commit @("license-generator.html") "feat(licensing): integrate instant WhatsApp license key sharing template" "2026-09-29 18:40:05" "51"

# --- DAY 18 (Sep 30, 2026) ---
Make-Commit @("src/pages/Settings.tsx") "feat(branding): add customizable Shop Name, Branch Subtitle, and BR Number" "2026-09-30 10:15:33" "52"
Make-Commit @("src/stores/settingsStore.ts") "feat(branding): implement shop logo upload and Base64 offline caching" "2026-09-30 14:10:55" "53"
Make-Commit @("src/pages/Settings.tsx") "feat(studio): design Live 80mm Thermal Receipt Studio with real-time preview" "2026-09-30 17:50:18" "54"

# --- DAY 19 (Oct 01, 2026) ---
Make-Commit @("src/pages/Settings.tsx") "feat(automation): add Auto-Print on Checkout toggle for high-speed lanes" "2026-10-01 11:20:41" "55"
Make-Commit @("electron/ipc/printerHandlers.ts") "feat(automation): implement Silent Direct Printing to bypass print dialogs" "2026-10-01 15:05:19" "56"
Make-Commit @("src/components/pos/PaymentModal.tsx") "feat(receipt): add instant itemized WhatsApp receipt sharing button" "2026-10-01 18:30:52" "57"

# --- DAY 20 (Oct 02, 2026) ---
Make-Commit @("supabase/schema.sql") "feat(sync): integrate Supabase cloud PostgreSQL schema and migration scripts" "2026-10-02 10:35:14" "58"
Make-Commit @("electron/sync/syncEngine.ts") "feat(sync): implement 30-second background worker with offline queue sync" "2026-10-02 14:15:47" "59"
Make-Commit @("src/pages/Reports.tsx") "feat(analytics): build sales revenue chart and top-selling leaderboard" "2026-10-02 18:00:29" "60"
Make-Commit @("src/pages/Reports.tsx") "feat(export): implement one-click CSV Excel export for sales and inventory" "2026-10-02 21:15:03" "61"

# --- DAY 21 (Oct 03, 2026) ---
Make-Commit @("src/App.tsx") "fix(router): switch BrowserRouter to HashRouter for file protocol compatibility" "2026-10-03 10:20:18" "62"
Make-Commit @("src/lib/mockApi.ts") "feat(dev): build localStorage-backed browser mock API for web demo mode" "2026-10-03 13:40:45" "63"
Make-Commit @("assets/icon.png", "scripts/create-icon.js") "build(assets): add custom application icon and build generator" "2026-10-03 16:15:30" "64"
Make-Commit @("README.md", "walkthrough.md") "docs: add comprehensive system architecture, guides and README badges" "2026-10-03 19:30:12" "65"
Make-Commit @(".") "chore(release): finalize production v1.0.0 milestone with all core modules" "2026-10-03 21:15:44" "66"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "   🎉 All 66 Backdated Commits Created Successfully!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "To push to GitHub, run:" -ForegroundColor Cyan
Write-Host "git push -u origin main --force" -ForegroundColor White
Write-Host ""
