import { useState } from 'react';
import { X, ShieldAlert, KeyRound, Check, AlertCircle } from 'lucide-react';
import type { PermissionKey } from '../../types';
import { useAuthStore } from '../../stores/authStore';

interface ManagerApprovalModalProps {
  isOpen: boolean;
  permission: PermissionKey;
  actionTitle?: string;
  onClose: () => void;
  onApproved: () => void;
}

export default function ManagerApprovalModal({
  isOpen,
  permission,
  actionTitle = 'This restricted action',
  onClose,
  onApproved,
}: ManagerApprovalModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { grantOverride } = useAuthStore();

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
    if (!pin) {
      setError('Please enter Manager/Admin PIN');
      return;
    }

    setLoading(true);
    try {
      // Fetch all employees and find any manager or admin that matches this PIN
      const employees = await window.api?.getEmployees();
      const authorizedEmployee = employees?.find(
        (emp) => (emp.role === 'admin' || emp.role === 'manager')
      );

      // Verify PIN against authorized employees
      let verified = false;
      if (employees) {
        for (const emp of employees) {
          if (emp.role === 'admin' || emp.role === 'manager') {
            const res = await window.api?.verifyEmployeePin(emp.id, pin);
            if (res?.success) {
              verified = true;
              break;
            }
          }
        }
      }

      if (verified) {
        grantOverride(permission);
        setPin('');
        setError('');
        onApproved();
        onClose();
      } else {
        setError('Unauthorized PIN. Manager or Admin PIN required.');
        setPin('');
      }
    } catch (err) {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-amber-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-base">Manager Override</h2>
              <p className="text-xs text-amber-700 font-medium">Authorization required</p>
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
          <p className="text-xs text-gray-500 mb-4 text-center">
            To authorize <strong>{actionTitle}</strong>, please enter an authorized <strong>Manager</strong> or <strong>Admin PIN</strong>.
          </p>

          {/* PIN dots display */}
          <div className="mb-5 text-center">
            <div className="flex items-center justify-center gap-3 my-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    pin.length > i
                      ? 'bg-amber-600 border-amber-600 scale-110 shadow-xs'
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

          {/* Numeric keypad */}
          <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto mb-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleNumClick(num)}
                className="h-12 rounded-2xl bg-gray-50 hover:bg-gray-100 active:bg-amber-100 text-lg font-bold text-gray-800 border border-gray-200 transition-all flex items-center justify-center active:scale-95"
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
              className="h-12 rounded-2xl bg-gray-50 hover:bg-gray-100 active:bg-amber-100 text-lg font-bold text-gray-800 border border-gray-200 transition-all flex items-center justify-center active:scale-95"
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

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-2xl font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={loading || pin.length === 0}
              className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 active:scale-98 disabled:opacity-50 text-white rounded-2xl font-bold text-xs shadow-md shadow-amber-200 transition-all flex items-center justify-center gap-1.5"
            >
              <KeyRound size={15} />
              {loading ? 'Checking...' : 'Authorize'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
