import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import {
  Wrench,
  Lock,
  ShieldAlert,
  Key,
  Copy,
  Check,
  MessageSquare,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import Layout from './components/shared/Layout';
import ProtectedRoute from './components/shared/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import Employees from './pages/Employees';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import type { LicenseStatus } from './types';

export default function App() {
  const [maintenance, setMaintenance] = useState<{ active: boolean; message: string }>({
    active: false,
    message: '',
  });

  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [activationKey, setActivationKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState('');
  const [activationSuccess, setActivationSuccess] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);

  useEffect(() => {
    // 1. Maintenance Status
    if (window.api?.getMaintenanceStatus) {
      window.api.getMaintenanceStatus().then(setMaintenance);
    }
    if (window.api?.onMaintenanceUpdate) {
      window.api.onMaintenanceUpdate(setMaintenance);
    }

    // 2. License & Trial Status
    if (window.api?.getLicenseStatus) {
      window.api.getLicenseStatus().then(setLicense);
    }
    if (window.api?.onLicenseUpdate) {
      window.api.onLicenseUpdate(setLicense);
    }
  }, []);

  const handleCopyMachineId = () => {
    if (license?.machineId) {
      navigator.clipboard.writeText(license.machineId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationKey.trim()) {
      setActivationError('Please enter a license key');
      return;
    }

    setIsActivating(true);
    setActivationError('');
    setActivationSuccess('');

    try {
      if (window.api?.activateLicense) {
        const res = await window.api.activateLicense(activationKey.trim());
        if (res.success) {
          setActivationSuccess(res.message || 'Activated successfully!');
          if (res.status) setLicense(res.status);
          setShowKeyModal(false);
          setActivationKey('');
        } else {
          setActivationError(res.message || 'Invalid license key for this computer');
        }
      }
    } catch {
      setActivationError('Failed to activate license');
    } finally {
      setIsActivating(false);
    }
  };

  const handleOpenDevPortal = () => {
    if (window.api?.openDeveloperPortal) {
      window.api.openDeveloperPortal();
    }
  };

  // Determine lockout states
  const isLocked =
    license &&
    (license.status === 'TRIAL_EXPIRED' ||
      license.status === 'SETUP_REQUIRED' ||
      license.status === 'TAMPERED');

  const isTrialActive = license && license.status === 'TRIAL_ACTIVE';

  const whatsappHref = `https://wa.me/94705224007?text=Hello%20Vendor,%20I%20need%20assistance%20with%20my%20POS%20system%20license.%20Machine%20ID:%20${
    license?.machineId || ''
  }`;

  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col bg-slate-950">
        {/* ========================================================
            1. TRIAL ACTIVE COUNTDOWN BANNER
           ======================================================== */}
        {isTrialActive && (
          <aside aria-label="Trial Mode Banner" className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md shrink-0 z-40 select-none">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-white animate-pulse" />
              <span>
                ⏳ <strong>Evaluation Test Run:</strong> {license.daysLeft}{' '}
                {license.daysLeft === 1 ? 'day' : 'days'} remaining (Expires on{' '}
                {license.trialEnd ? new Date(license.trialEnd).toLocaleDateString() : 'soon'})
              </span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="hover:underline hidden sm:flex items-center gap-1.5 opacity-90 hover:opacity-100"
              >
                <MessageSquare size={13} />
                WhatsApp: 070 522 4007
              </a>
              <button
                type="button"
                onClick={() => setShowKeyModal(true)}
                className="px-3 py-1 bg-white text-orange-950 font-bold rounded-lg text-[11px] shadow-xs hover:bg-orange-50 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Key size={12} />
                Activate Full License
              </button>
            </div>
          </aside>
        )}

        {/* ========================================================
            2. FULL-SCREEN MAINTENANCE LOCKOUT OVERLAY
           ======================================================== */}
        {maintenance.active && (
          <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-6 text-white text-center select-none animate-in fade-in duration-200">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
                <Wrench size={32} />
              </div>
              <h2 className="text-xl font-black tracking-tight text-white mb-2">
                System Under Maintenance
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6 font-medium">
                {maintenance.message ||
                  'System maintenance in progress. Please contact your software vendor.'}
              </p>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-500 font-mono">
                POS Terminal temporarily suspended by developer console.
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            3. FULL-SCREEN ENGLISH LOCKOUT OVERLAY (TRIAL EXPIRED / SETUP REQUIRED)
           ======================================================== */}
        {isLocked && !maintenance.active && (
          <div className="fixed inset-0 z-[90] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 text-white select-none animate-in fade-in duration-300">
            <div className="max-w-lg w-full bg-slate-900/90 border border-slate-800/90 rounded-3xl p-7 sm:p-9 shadow-2xl shadow-black/80 relative overflow-hidden">
              {/* Top ambient glow */}
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-40 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

              {/* Status Icon */}
              <div className="text-center mb-6">
                <div
                  className={`w-18 h-18 rounded-2xl flex items-center justify-center mx-auto mb-4 border shadow-xl ${
                    license?.status === 'TAMPERED'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-amber-500/10'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-500 shadow-rose-500/10'
                  }`}
                >
                  {license?.status === 'TAMPERED' ? (
                    <AlertTriangle size={36} />
                  ) : license?.status === 'SETUP_REQUIRED' ? (
                    <ShieldAlert size={36} />
                  ) : (
                    <Lock size={36} />
                  )}
                </div>

                <h2 className="text-2xl font-black tracking-tight text-white mb-2">
                  {license?.status === 'TAMPERED'
                    ? 'Security Tamper Violation'
                    : license?.status === 'SETUP_REQUIRED'
                    ? 'License Activation Required'
                    : 'Trial Period Expired'}
                </h2>

                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
                  {license?.status === 'TAMPERED'
                    ? 'A system clock rollback or database modification was detected. System access has been suspended for security.'
                    : license?.status === 'SETUP_REQUIRED'
                    ? 'This POS system requires license activation or trial provisioning before it can be used.'
                    : 'Your test run evaluation period has ended. To continue using the POS system and activate your full license, please contact your software vendor.'}
                </p>
              </div>

              {/* WhatsApp & Hotline Card */}
              <div className="bg-gradient-to-r from-emerald-950/60 to-emerald-900/40 border border-emerald-500/30 rounded-2xl p-4 mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
                      Software Support & Licensing
                    </div>
                    <div className="text-sm font-bold text-white font-mono mt-0.5">
                      Hotline: 070 522 4007
                    </div>
                  </div>
                </div>

                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all shrink-0 cursor-pointer"
                >
                  <span>Chat on WhatsApp</span>
                  <ExternalLink size={12} />
                </a>
              </div>

              {/* Hardware Machine ID Box */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 mb-5 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Client Hardware Machine ID
                  </div>
                  <div className="text-sm font-bold font-mono text-sky-400 mt-0.5">
                    {license?.machineId || 'DETECTING...'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyMachineId}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedId ? (
                    <>
                      <Check size={13} className="text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copy ID</span>
                    </>
                  )}
                </button>
              </div>

              {/* License Key Activation Form */}
              <form onSubmit={handleActivate} className="space-y-3 mb-5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Enter License Activation Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={activationKey}
                    onChange={(e) => {
                      setActivationKey(e.target.value.toUpperCase());
                      setActivationError('');
                    }}
                    placeholder="POS-LIFE-XXXXXX-XXXXXXXX"
                    className="flex-1 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono tracking-wider text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="submit"
                    disabled={isActivating}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-blue-600/30 active:scale-95 transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                  >
                    <Key size={14} />
                    {isActivating ? 'Verifying...' : 'Activate'}
                  </button>
                </div>

                {activationError && (
                  <p className="text-xs text-rose-400 font-medium animate-in fade-in flex items-center gap-1 mt-1">
                    ⚠️ {activationError}
                  </p>
                )}
                {activationSuccess && (
                  <p className="text-xs text-emerald-400 font-medium animate-in fade-in flex items-center gap-1 mt-1">
                    ✓ {activationSuccess}
                  </p>
                )}
              </form>

              {/* Developer Super Admin Hint */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Vendor / Developer Console:</span>
                <button
                  type="button"
                  onClick={handleOpenDevPortal}
                  className="text-slate-400 hover:text-blue-400 font-mono flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span>Press Ctrl+Alt+D</span>
                  <ExternalLink size={11} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            4. IN-TRIAL LICENSE ACTIVATION MODAL (WHEN USER CLICKS ACTIVATE)
           ======================================================== */}
        {showKeyModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Key size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">Activate Full License</h3>
                    <p className="text-[11px] text-slate-400">Unlock permanent lifetime access</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Machine ID</div>
                  <div className="text-xs font-bold font-mono text-sky-400">
                    {license?.machineId}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyMachineId}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {copiedId ? '✓ Copied' : 'Copy'}
                </button>
              </div>

              <form onSubmit={handleActivate} className="space-y-3">
                <input
                  type="text"
                  value={activationKey}
                  onChange={(e) => {
                    setActivationKey(e.target.value.toUpperCase());
                    setActivationError('');
                  }}
                  placeholder="POS-LIFE-XXXXXX-XXXXXXXX"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-mono tracking-wider text-white placeholder-slate-600 focus:outline-none"
                  autoFocus
                />
                {activationError && (
                  <p className="text-xs text-rose-400 font-medium">⚠️ {activationError}</p>
                )}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowKeyModal(false)}
                    className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isActivating}
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/30 cursor-pointer"
                  >
                    {isActivating ? 'Verifying...' : 'Activate Key'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================
            5. MAIN APPLICATION ROUTES
           ======================================================== */}
        <div className="flex-1 flex flex-col">
          <Routes>
            <Route element={<Layout />}>
              <Route
                path="/"
                element={
                  <ProtectedRoute permission="view_dashboard" title="Dashboard">
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pos"
                element={
                  <ProtectedRoute permission="access_pos" title="POS Terminal">
                    <POS />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute permission="manage_inventory" title="Inventory & Stock">
                    <Inventory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customers"
                element={
                  <ProtectedRoute permission="manage_customers" title="Customers">
                    <Customers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employees"
                element={
                  <ProtectedRoute permission="manage_employees" title="Employees & Roles">
                    <Employees />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute permission="view_reports" title="Sales Reports & Analytics">
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute permission="access_settings" title="System Settings">
                    <Settings />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </div>
      </div>
    </HashRouter>
  );
}
