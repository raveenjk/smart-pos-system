import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShoppingCart,
  Package,
  Users,
  UserCog,
  BarChart3,
  Settings,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import CashierSwitchModal from './CashierSwitchModal';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pos', icon: ShoppingCart, label: 'POS / Billing' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/employees', icon: UserCog, label: 'Employees' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const [isSwitchOpen, setIsSwitchOpen] = useState(false);
  const { currentEmployee } = useAuthStore();
  const { settings, loadSettings } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const shopName = settings.shop_name || 'POS System';
  const shopSubtitle = settings.shop_subtitle || 'RETAIL & POS';
  const initialLetter = shopName.charAt(0).toUpperCase() || 'P';

  return (
    <>
      <aside className="w-16 lg:w-56 bg-gray-900 text-white flex flex-col py-4 shrink-0 transition-all duration-200 justify-between">
        <div>
          {/* Logo & Shop Name */}
          <div className="px-3 mb-6 flex items-center gap-3">
            {settings.shop_logo ? (
              <img
                src={settings.shop_logo}
                alt={shopName}
                className="w-9 h-9 rounded-xl object-cover bg-white/10 shrink-0 border border-white/20 shadow-md"
              />
            ) : (
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-lg shrink-0 shadow-lg shadow-blue-500/30">
                {initialLetter}
              </div>
            )}
            <div className="hidden lg:block truncate">
              <span className="font-bold text-sm block leading-tight truncate text-white" title={shopName}>
                {shopName}
              </span>
              <span className="text-[10px] text-blue-400 font-medium tracking-wide block truncate uppercase">
                {shopSubtitle}
              </span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-1 px-2">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-gray-400 hover:bg-gray-800/70 hover:text-white'
                  }`
                }
              >
                <Icon size={19} className="shrink-0" />
                <span className="hidden lg:block">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom: Active Cashier & Version */}
        <div className="px-2 pt-3 border-t border-gray-800">
          <button
            onClick={() => setIsSwitchOpen(true)}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-gray-800/60 hover:bg-gray-800 transition-colors text-left group"
            title="Click to Switch Cashier"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              {currentEmployee?.role === 'admin' ? (
                <ShieldCheck size={16} />
              ) : (
                <User size={16} />
              )}
            </div>
            <div className="hidden lg:block flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-200 truncate group-hover:text-white">
                {currentEmployee?.name || 'Cashier'}
              </p>
              <p className="text-[10px] text-gray-400 capitalize">
                {currentEmployee?.role || 'Staff'} • Switch
              </p>
            </div>
            <LogOut size={14} className="hidden lg:block text-gray-500 group-hover:text-gray-300" />
          </button>

          <div className="px-2 mt-2 hidden lg:flex items-center justify-between text-[11px] text-gray-500">
            <span>Offline Ready</span>
            <span>v1.0</span>
          </div>
        </div>
      </aside>

      <CashierSwitchModal isOpen={isSwitchOpen} onClose={() => setIsSwitchOpen(false)} />
    </>
  );
}
