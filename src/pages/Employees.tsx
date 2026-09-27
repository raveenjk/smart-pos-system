import { useEffect, useState } from 'react';
import { Plus, Shield, User, UserCog } from 'lucide-react';
import type { Employee } from '../types';

const roleColors = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-purple-100 text-purple-700',
  cashier: 'bg-blue-100 text-blue-700',
};

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'cashier', pin: '', phone: '' });

  const load = () => {
    window.api?.getEmployees().then((data) => setEmployees(data || []));
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    await window.api?.createEmployee(form);
    setShowForm(false);
    setForm({ name: '', role: 'cashier', pin: '', phone: '' });
    load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Employees</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
          <Plus size={16} /> Add Employee
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {employees.map((e) => (
          <div key={e.id} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                {e.role === 'admin' ? <Shield size={20} className="text-red-500" /> :
                  e.role === 'manager' ? <UserCog size={20} className="text-purple-500" /> :
                    <User size={20} className="text-blue-500" />}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{e.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[e.role]}`}>{e.role}</span>
              </div>
            </div>
            {e.phone && <p className="text-xs text-gray-500 mt-2">{e.phone}</p>}
          </div>
        ))}
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-80 p-6 shadow-2xl">
            <h2 className="font-bold text-lg mb-4">Add Employee</h2>
            <div className="flex flex-col gap-3">
              {[{ label: 'Name *', key: 'name' }, { label: 'Phone', key: 'phone' }, { label: 'PIN (4 digits) *', key: 'pin' }].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                  <input value={(form as any)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" maxLength={key === 'pin' ? 4 : undefined} />
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Role</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 border rounded-lg text-sm text-gray-600">Cancel</button>
              <button onClick={handleSave} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
