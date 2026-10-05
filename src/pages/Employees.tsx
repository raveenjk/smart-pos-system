import { useEffect, useState } from 'react';
import { Plus, Shield, User, UserCog, KeyRound, Check, AlertCircle } from 'lucide-react';
import type { Employee } from '../types';
import { useAuthStore } from '../stores/authStore';

const roleColors = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-purple-100 text-purple-700',
  cashier: 'bg-blue-100 text-blue-700',
};

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'cashier', pin: '', phone: '' });
  
  // Edit & Change PIN state
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: 'cashier', pin: '', phone: '' });
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const { currentEmployee, setCurrentEmployee } = useAuthStore();

  const load = () => {
    window.api?.getEmployees().then((data) => setEmployees(data || []));
  };
  useEffect(() => { load(); }, []);

  const showNotification = (text: string, error = false) => {
    setMsg({ text, error });
    setTimeout(() => setMsg(null), 3500);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showNotification('Please enter employee name', true);
      return;
    }
    if (!form.pin || !/^\d{4}$/.test(form.pin)) {
      showNotification('PIN must be exactly 4 digits', true);
      return;
    }

    try {
      await window.api?.createEmployee(form);
      setShowForm(false);
      setForm({ name: '', role: 'cashier', pin: '', phone: '' });
      load();
      showNotification('Employee created successfully!');
    } catch {
      showNotification('Failed to create employee', true);
    }
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditForm({
      name: emp.name,
      role: emp.role,
      phone: emp.phone || '',
      pin: '', // blank by default so it's not changed unless typed
    });
  };

  const handleUpdate = async () => {
    if (!editingEmployee) return;
    if (!editForm.name.trim()) {
      showNotification('Please enter employee name', true);
      return;
    }
    if (editForm.pin && !/^\d{4}$/.test(editForm.pin)) {
      showNotification('New PIN must be exactly 4 digits', true);
      return;
    }

    try {
      const payload: any = {
        name: editForm.name.trim(),
        role: editForm.role,
        phone: editForm.phone.trim(),
      };
      if (editForm.pin) {
        payload.pin = editForm.pin.trim();
      }

      await window.api?.updateEmployee(editingEmployee.id, payload);

      // If the currently logged in user updated their own profile
      if (currentEmployee && currentEmployee.id === editingEmployee.id) {
        setCurrentEmployee({
          ...currentEmployee,
          name: payload.name,
          role: payload.role,
          phone: payload.phone,
        });
      }

      setEditingEmployee(null);
      load();
      showNotification(editForm.pin ? 'Employee details & PIN updated successfully!' : 'Employee details updated successfully!');
    } catch {
      showNotification('Failed to update employee', true);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {msg && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${
          msg.error ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
        }`}>
          {msg.error ? <AlertCircle size={18} /> : <Check size={18} />}
          {msg.text}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Employees & PIN Security</h1>
          <p className="text-xs text-gray-500 mt-1">Manage staff roles, names, and 4-digit access PINs</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
          <Plus size={16} /> Add Employee
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {employees.map((e) => (
          <div key={e.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    {e.role === 'admin' ? <Shield size={22} className="text-red-500" /> :
                      e.role === 'manager' ? <UserCog size={22} className="text-purple-500" /> :
                        <User size={22} className="text-blue-500" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800">{e.name}</p>
                      {currentEmployee?.id === e.id && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded">You</span>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[e.role]}`}>{e.role}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>Phone: {e.phone || 'Not set'}</span>
                <span className="font-mono bg-gray-50 px-2 py-1 rounded text-gray-600">PIN: ••••</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => openEditModal(e)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-600 rounded-lg text-xs font-semibold border border-gray-200 hover:border-blue-200 transition-colors"
              >
                <KeyRound size={14} />
                Edit / Change PIN
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Employee Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h2 className="font-bold text-lg mb-1 text-gray-800">Add New Employee</h2>
            <p className="text-xs text-gray-500 mb-4">Set up login PIN and permissions</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Full Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Kasun Perera"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="e.g. 0771234567"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Security PIN (4 digits) *</label>
                <input
                  value={form.pin}
                  onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
                  placeholder="e.g. 1234"
                  maxLength={4}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="cashier">Cashier (Billing only)</option>
                  <option value="manager">Manager (Reports & Discounts)</option>
                  <option value="admin">Admin (Full Control)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleSave} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee & Change PIN Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound size={20} className="text-blue-600" />
              <h2 className="font-bold text-lg text-gray-800">Edit / Change PIN</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">Editing profile for <strong>{editingEmployee.name}</strong></p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Full Name *</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Phone</label>
                <input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="cashier">Cashier (Billing only)</option>
                  <option value="manager">Manager (Reports & Discounts)</option>
                  <option value="admin">Admin (Full Control)</option>
                </select>
              </div>

              <div className="mt-1 pt-3 border-t border-dashed border-gray-200">
                <label className="text-xs font-semibold text-blue-700 mb-1 flex items-center justify-between">
                  <span>Change 4-Digit PIN</span>
                  <span className="text-[10px] text-gray-400 font-normal">Optional</span>
                </label>
                <input
                  type="password"
                  value={editForm.pin}
                  onChange={(e) => setEditForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
                  placeholder="Leave blank to keep current PIN"
                  maxLength={4}
                  className="w-full border border-blue-200 bg-blue-50/30 rounded-lg px-3 py-2 text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Type a new 4-digit number to reset PIN, or leave it empty if you only want to change the name or role.
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setEditingEmployee(null)}
                className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm"
              >
                Update PIN & Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
