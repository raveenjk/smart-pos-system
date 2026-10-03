import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import Layout from './components/shared/Layout';
import ProtectedRoute from './components/shared/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import Employees from './pages/Employees';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

export default function App() {
  const [maintenance, setMaintenance] = useState<{ active: boolean; message: string }>({
    active: false,
    message: '',
  });

  useEffect(() => {
    if (window.api?.getMaintenanceStatus) {
      window.api.getMaintenanceStatus().then(setMaintenance);
    }
    if (window.api?.onMaintenanceUpdate) {
      window.api.onMaintenanceUpdate(setMaintenance);
    }
  }, []);

  return (
    <HashRouter>
      {maintenance.active && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-6 text-white text-center select-none animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
              <Wrench size={32} />
            </div>
            <h2 className="text-xl font-black tracking-tight text-white mb-2">System Under Maintenance</h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-6 font-medium">
              {maintenance.message || 'System maintenance in progress. Please contact your software vendor.'}
            </p>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-500 font-mono">
              POS Terminal temporarily suspended by developer console.
            </div>
          </div>
        </div>
      )}
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
    </HashRouter>
  );
}
