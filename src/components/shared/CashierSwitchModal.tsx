import { useState, useEffect } from 'react';
import { X, Lock, KeyRound, Check, AlertCircle, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import type { Employee } from '../../types';

interface CashierSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CashierSwitchModal({ isOpen, onClose }: CashierSwitchModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setCurrentEmployee, logout } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      window.api?.getEmployees().then((data) => {
        setEmployees(data || []);
        if (data && data.length > 0) {
          setSelectedEmployee(data[0]);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNumClick = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setError('');
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedEmployee) return;
    if (!pin) {
      setError('Please enter PIN');
      return;
    }

    setLoading(true);
    try {
      const res = await window.api.verifyEmployeePin(selectedEmployee.id, pin);
      if (res.success && res.employee) {
        setCurrentEmployee(res.employee);
        onClose();
      } else {
        setError('Incorrect PIN. Please try again.');
        setPin('');
      }
    } catch (err) {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden border border-gray-100">
        <div className="flex items-center justify-between p-5 border-b bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <KeyRound size={20} />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-base">Switch Cashier / PIN</h2>
              <p className="text-xs text-gray-500">Select user and enter passcode</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Employee selector */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
              Active User
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
              {employees.map((emp) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => {
                    setSelectedEmployee(emp);
                    setError('');
                    setPin('');
                  }}
                  className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                    selectedEmployee?.id === emp.id
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-semibold ring-2 ring-blue-500/20'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="truncate">
                    <p className="text-xs leading-tight truncate">{emp.name}</p>
                    <span className="text-[10px] text-gray-400 capitalize">{emp.role}</span>
                  </div>
                  {selectedEmployee?.id === emp.id && (
                    <Check size={14} className="text-blue-600 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* PIN Display */}
          <div className="mb-5 text-center">
            <div className="flex items-center justify-center gap-3 my-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    pin.length > i
                      ? 'bg-blue-600 border-blue-600 scale-110 shadow-xs'
                      : 'border-gray-300 bg-gray-50'
                  }`}
                />
              ))}
            </div>
            {error && (
              <p className="text-xs text-red-500 font-medium flex items-center justify-center gap-1 mt-2">
                <AlertCircle size={14} />
                {error}
              </p>
            )}
          </div>

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto mb-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleNumClick(num)}
                className="h-12 rounded-2xl bg-gray-50 hover:bg-gray-100 active:bg-blue-100 text-lg font-bold text-gray-800 border border-gray-200 transition-all shadow-2xs flex items-center justify-center active:scale-95"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="h-12 rounded-2xl bg-gray-50 hover:bg-red-50 hover:text-red-600 text-xs font-bold text-gray-500 border border-gray-200 transition-all flex items-center justify-center active:scale-95"
            >
              C
            </button>
            <button
              type="button"
              onClick={() => handleNumClick('0')}
              className="h-12 rounded-2xl bg-gray-50 hover:bg-gray-100 active:bg-blue-100 text-lg font-bold text-gray-800 border border-gray-200 transition-all shadow-2xs flex items-center justify-center active:scale-95"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-12 rounded-2xl bg-gray-50 hover:bg-gray-100 text-sm font-bold text-gray-600 border border-gray-200 transition-all flex items-center justify-center active:scale-95"
            >
              ⌫
            </button>
          </div>

          {/* Unlock / Switch Button */}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={loading || pin.length === 0}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-98 disabled:opacity-50 text-white rounded-2xl font-bold text-sm shadow-md shadow-blue-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock size={16} />
            {loading ? 'Verifying...' : 'Unlock / Switch'}
          </button>

          {/* Lock Terminal & Log Out Button */}
          <button
            type="button"
            onClick={() => {
              logout();
              onClose();
            }}
            className="w-full mt-2.5 py-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut size={14} />
            Lock Terminal & Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
