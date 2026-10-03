import { HashRouter, Routes, Route } from 'react-router-dom';
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
  return (
    <HashRouter>
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
