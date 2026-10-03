import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldAlert, KeyRound, ArrowLeft, UserCheck } from 'lucide-react';
import type { PermissionKey } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import ManagerApprovalModal from './ManagerApprovalModal';
import CashierSwitchModal from './CashierSwitchModal';

interface ProtectedRouteProps {
  permission: PermissionKey;
  title: string;
  children: React.ReactNode;
}

export default function ProtectedRoute({ permission, title, children }: ProtectedRouteProps) {
  const { can, currentEmployee } = useAuthStore();
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const navigate = useNavigate();

  // If user has permission or temporary override is granted, show the page!
  if (can(permission)) {
    return <>{children}</>;
  }

  // Otherwise, render a clean Access Restricted Screen with Supervisor Override option
  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-gray-50/50">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-lg border border-gray-100 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-inner">
          <ShieldAlert size={32} />
        </div>

        <h2 className="text-xl font-bold text-gray-800">Access Restricted</h2>
        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
          The <strong>{title}</strong> page requires elevated permissions.
          Your current active profile: <strong className="text-gray-800">{currentEmployee?.name || 'Staff'}</strong> (<span className="capitalize font-semibold text-blue-600">{currentEmployee?.role || 'cashier'}</span>).
        </p>

        <div className="mt-6 space-y-2.5">
          <button
            onClick={() => setShowOverrideModal(true)}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-200 flex items-center justify-center gap-2 transition-all"
          >
            <KeyRound size={16} />
            Authorize with Manager PIN
          </button>

          <button
            onClick={() => setShowSwitchModal(true)}
            className="w-full py-3 border border-gray-200 hover:bg-gray-50 active:scale-98 text-gray-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <UserCheck size={16} />
            Switch to Admin / Manager
          </button>

          <button
            onClick={() => navigate('/pos')}
            className="w-full py-2.5 text-gray-400 hover:text-gray-600 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <ArrowLeft size={14} />
            Return to POS Billing
          </button>
        </div>
      </div>

      <ManagerApprovalModal
        isOpen={showOverrideModal}
        permission={permission}
        actionTitle={`access to ${title}`}
        onClose={() => setShowOverrideModal(false)}
        onApproved={() => {}}
      />

      <CashierSwitchModal
        isOpen={showSwitchModal}
        onClose={() => setShowSwitchModal(false)}
      />
    </div>
  );
}
