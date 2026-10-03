import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  ShieldAlert,
  User,
  Lock,
} from 'lucide-react';
import type { PermissionKey } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import CashierSwitchModal from './CashierSwitchModal';
import ManagerApprovalModal from './ManagerApprovalModal';

interface NavItem {
  to: string;
  icon: any;
  label: string;
  permission: PermissionKey;
}

const navItems: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', permission: 'view_dashboard' },
  { to: '/pos', icon: ShoppingCart, label: 'POS / Billing', permission: 'access_pos' },
  { to: '/inventory', icon: Package, label: 'Inventory', permission: 'manage_inventory' },
  { to: '/customers', icon: Users, label: 'Customers', permission: 'manage_customers' },
  { to: '/employees', icon: UserCog, label: 'Employees', permission: 'manage_employees' },
  { to: '/reports', icon: BarChart3, label: 'Reports', permission: 'view_reports' },
  { to: '/settings', icon: Settings, label: 'Settings', permission: 'access_settings' },
];

export default function Sidebar() {
  const [isSwitchOpen, setIsSwitchOpen] = useState(false);
  const [overrideItem, setOverrideItem] = useState<NavItem | null>(null);
  const { currentEmployee, can } = useAuthStore();
  const { settings, loadSettings } = useSettingsStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const shopName = settings.shop_name || 'POS System';
  const shopSubtitle = settings.shop_subtitle || 'RETAIL & POS';
  const initialLetter = shopName.charAt(0).toUpperCase() || 'P';

  const handleLockedClick = (item: NavItem) => {
    setOverrideItem(item);
  };

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

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const hasAccess = can(item.permission);

              if (hasAccess) {
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                          : 'text-gray-400 hover:bg-gray-800/70 hover:text-white'
                      }`
                    }
                  >
                    <Icon size={19} className="shrink-0" />
                    <span className="hidden lg:block">{item.label}</span>
                  </NavLink>
                );
              }

              // Locked item for Cashier -> prompts manager approval when clicked
              return (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => handleLockedClick(item)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-300 hover:bg-gray-800/40 transition-all text-left group"
                  title="Manager PIN required to access"
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon size={19} className="shrink-0 text-gray-600 group-hover:text-gray-400" />
                    <span className="hidden lg:block truncate">{item.label}</span>
                  </div>
                  <Lock size={13} className="hidden lg:block text-gray-600 group-hover:text-amber-400 shrink-0" />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Active User / Cashier Switch */}
        <div className="px-2 pt-3 border-t border-gray-800">
          <button
            onClick={() => setIsSwitchOpen(true)}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-gray-800/60 hover:bg-gray-800 transition-colors text-left group"
            title="Click to Switch Cashier / Lock"
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                currentEmployee?.role === 'admin'
                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                  : currentEmployee?.role === 'manager'
                  ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                  : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
              }`}
            >
              {currentEmployee?.role === 'admin' ? (
                <ShieldCheck size={16} />
              ) : currentEmployee?.role === 'manager' ? (
                <ShieldAlert size={16} />
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

      {overrideItem && (
        <ManagerApprovalModal
          isOpen={Boolean(overrideItem)}
          permission={overrideItem.permission}
          actionTitle={`open ${overrideItem.label}`}
          onClose={() => setOverrideItem(null)}
          onApproved={() => {
            navigate(overrideItem.to);
            setOverrideItem(null);
          }}
        />
      )}
    </>
  );
}
