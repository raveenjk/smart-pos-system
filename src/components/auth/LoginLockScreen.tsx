import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Shield,
  User,
  UserCog,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Delete,
  Store,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import type { Employee } from '../../types';

export default function LoginLockScreen() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  const { setCurrentEmployee } = useAuthStore();
  const { settings, loadSettings } = useSettingsStore();
  const navigate = useNavigate();

  // Load shop settings & live clock
  useEffect(() => {
    loadSettings();

    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString([], { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })
      );
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, [loadSettings]);

  // Load employees
  useEffect(() => {
    window.api?.getEmployees().then((data) => {
      const active = (data || []).filter((e) => e.is_active !== false);
      setEmployees(active);

      // Restore last logged-in employee if available
      const lastId = localStorage.getItem('pos_last_employee_id');
      const found = active.find((e) => String(e.id) === lastId);
      if (found) {
        setSelectedEmployee(found);
      } else if (active.length > 0) {
        setSelectedEmployee(active[0]);
      }
    });
  }, []);

  // Verification logic
  const handleVerify = useCallback(
    async (pinToVerify: string, employeeToVerify = selectedEmployee) => {
      if (!employeeToVerify) {
        setError('Please select your staff profile');
        return;
      }
      if (pinToVerify.length !== 4) {
        setError('Please enter your 4-digit PIN');
        return;
      }

      setIsVerifying(true);
      setError('');

      try {
        const res = await window.api.verifyEmployeePin(employeeToVerify.id, pinToVerify);
        if (res.success && res.employee) {
          const authUser = res.employee;
          setIsSuccess(true);
          localStorage.setItem('pos_last_employee_id', String(employeeToVerify.id));

          setTimeout(() => {
            setCurrentEmployee(authUser);
            if (authUser.role === 'cashier') {
              navigate('/pos');
            }
          }, 350);
        } else {
          setError('Incorrect PIN. Please try again.');
          setPin('');
          setIsVerifying(false);
        }
      } catch (err) {
        setError('Verification failed. Please retry.');
        setPin('');
        setIsVerifying(false);
      }
    },
    [selectedEmployee, setCurrentEmployee, navigate]
  );

  // Keypad & keyboard input
  const handleDigit = useCallback(
    (digit: string) => {
      if (isVerifying || isSuccess) return;
      setError('');

      setPin((prev) => {
        if (prev.length >= 4) return prev;
        const next = prev + digit;
        if (next.length === 4) {
          setTimeout(() => handleVerify(next), 60);
        }
        return next;
      });
    },
    [handleVerify, isVerifying, isSuccess]
  );

  const handleBackspace = useCallback(() => {
    if (isVerifying || isSuccess) return;
    setError('');
    setPin((prev) => prev.slice(0, -1));
  }, [isVerifying, isSuccess]);

  const handleClear = useCallback(() => {
    if (isVerifying || isSuccess) return;
    setError('');
    setPin('');
  }, [isVerifying, isSuccess]);

  // Physical keyboard listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        handleClear();
      } else if (e.key === 'Enter') {
        if (pin.length === 4) {
          handleVerify(pin);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleDigit, handleBackspace, handleClear, handleVerify, pin]);

  const shopName = settings.shop_name || 'POS System';
  const shopSubtitle = settings.shop_subtitle || 'RETAIL & POINT OF SALE';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between text-white select-none overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header: Shop Branding & Live Clock */}
      <header className="relative z-10 px-6 sm:px-10 py-5 flex items-center justify-between border-b border-slate-900 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          {settings.shop_logo ? (
            <img
              src={settings.shop_logo}
              alt={shopName}
              className="w-10 h-10 rounded-xl object-cover bg-white/10 border border-white/20 shadow-md"
            />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-blue-500/30">
              <Store size={20} />
            </div>
          )}
          <div>
            <h1 className="text-base font-bold text-white leading-tight flex items-center gap-2">
              {shopName}
              <span className="text-[10px] bg-blue-500/20 text-blue-400 font-semibold px-2 py-0.5 rounded-full border border-blue-500/30">
                TERMINAL LOCKED
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 tracking-wider font-medium uppercase mt-0.5">
              {shopSubtitle}
            </p>
          </div>
        </div>

        {/* Live Clock Display */}
        <div className="text-right hidden sm:block">
          <div className="text-sm font-bold font-mono tracking-wider text-slate-200 flex items-center justify-end gap-1.5">
            <Clock size={14} className="text-blue-400" />
            {currentTime || '00:00:00'}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">{currentDate}</div>
        </div>
      </header>

      {/* Center Main Login & PIN Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Staff Profile Selection */}
          <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserCog size={18} className="text-blue-400" />
                  Select Staff Member
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Choose your account to enter PIN</p>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {employees.length} {employees.length === 1 ? 'user' : 'users'}
              </span>
            </div>

            {/* Employee Tiles Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
              {employees.map((emp) => {
                const isSelected = selectedEmployee?.id === emp.id;
                const roleBadge =
                  emp.role === 'admin'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : emp.role === 'manager'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    : 'bg-blue-500/20 text-blue-300 border-blue-500/30';

                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => {
                      setSelectedEmployee(emp);
                      setPin('');
                      setError('');
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between group cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500/80 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/30'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          emp.role === 'admin'
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            : emp.role === 'manager'
                            ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                            : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                        }`}
                      >
                        {emp.role === 'admin' ? (
                          <Shield size={18} />
                        ) : emp.role === 'manager' ? (
                          <UserCog size={18} />
                        ) : (
                          <User size={18} />
                        )}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-bold text-white truncate leading-tight group-hover:text-blue-300 transition-colors">
                          {emp.name}
                        </p>
                        <span
                          className={`inline-block mt-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${roleBadge}`}
                        >
                          {emp.role}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-md">
                        <CheckCircle2 size={14} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
              <span>🔒 PIN required for each shift</span>
              <span className="font-mono">Offline Secured</span>
            </div>
          </div>

          {/* Right Column: 4-Digit Security PIN & Keypad */}
          <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl flex flex-col items-center">
            {/* Header info */}
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-lg shadow-blue-500/10">
                <KeyRound size={22} />
              </div>
              <h3 className="text-base font-bold text-white">
                Enter PIN for <span className="text-blue-400">{selectedEmployee?.name || 'Staff'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Type on physical keyboard or use on-screen pad</p>
            </div>

            {/* 4 Security PIN Indicator Dots */}
            <div className="flex items-center justify-center gap-4 my-3">
              {[0, 1, 2, 3].map((idx) => {
                const filled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
                      isSuccess
                        ? 'bg-emerald-500 border-emerald-400 scale-110 shadow-lg shadow-emerald-500/40'
                        : filled
                        ? 'bg-blue-500 border-blue-400 scale-110 shadow-lg shadow-blue-500/50'
                        : 'bg-slate-950 border-slate-700'
                    }`}
                  />
                );
              })}
            </div>

            {/* Feedback message (Error or Success) */}
            <div className="h-6 flex items-center justify-center mb-3">
              {error ? (
                <p className="text-xs text-rose-400 font-semibold flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle size={14} />
                  {error}
                </p>
              ) : isSuccess ? (
                <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 size={14} />
                  PIN Verified! Unlocking Terminal...
                </p>
              ) : isVerifying ? (
                <p className="text-xs text-blue-400 font-semibold animate-pulse">Verifying credentials...</p>
              ) : (
                <span className="text-[11px] text-slate-500">4-digit access code</span>
              )}
            </div>

            {/* Numeric Touch Keypad */}
            <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px] mb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigit(digit)}
                  disabled={isVerifying || isSuccess}
                  className="h-13 rounded-2xl bg-slate-950 hover:bg-slate-800 active:bg-blue-600/30 text-xl font-bold text-white border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-center active:scale-95 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {digit}
                </button>
              ))}

              {/* Clear button */}
              <button
                type="button"
                onClick={handleClear}
                disabled={isVerifying || isSuccess || pin.length === 0}
                className="h-13 rounded-2xl bg-slate-950 hover:bg-rose-500/20 hover:text-rose-400 text-xs font-bold text-slate-400 border border-slate-800 hover:border-rose-500/40 transition-all flex items-center justify-center active:scale-95 disabled:opacity-40 cursor-pointer"
              >
                CLEAR
              </button>

              {/* Zero */}
              <button
                type="button"
                onClick={() => handleDigit('0')}
                disabled={isVerifying || isSuccess}
                className="h-13 rounded-2xl bg-slate-950 hover:bg-slate-800 active:bg-blue-600/30 text-xl font-bold text-white border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-center active:scale-95 shadow-md disabled:opacity-50 cursor-pointer"
              >
                0
              </button>

              {/* Backspace */}
              <button
                type="button"
                onClick={handleBackspace}
                disabled={isVerifying || isSuccess || pin.length === 0}
                className="h-13 rounded-2xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-center active:scale-95 disabled:opacity-40 cursor-pointer"
                title="Backspace"
              >
                <Delete size={18} />
              </button>
            </div>

            {/* Unlock button */}
            <button
              type="button"
              onClick={() => handleVerify(pin)}
              disabled={isVerifying || isSuccess || pin.length !== 4}
              className="w-full max-w-[260px] py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-98 disabled:opacity-40 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock size={16} />
              {isVerifying ? 'Verifying...' : isSuccess ? 'Unlocked!' : 'Unlock Terminal'}
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Footer: Security & Developer Recovery Hint */}
      <footer className="relative z-10 px-6 py-3 border-t border-slate-900 bg-slate-950/80 backdrop-blur-md flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Local POS System v1.0 • Offline Database</span>
        </div>
        <div className="font-mono text-[11px] text-slate-500">
          Forgot PIN? Developer Console: <strong className="text-slate-400">Ctrl + Alt + D</strong>
        </div>
      </footer>
    </div>
  );
}
