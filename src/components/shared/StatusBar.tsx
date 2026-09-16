import { useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useSyncStore } from '../../stores/syncStore';
import type { SyncStatus } from '../../types';

const statusConfig: Record<SyncStatus, { icon: typeof Wifi; label: string; className: string }> = {
  online: { icon: Wifi, label: 'Online', className: 'text-green-500' },
  offline: { icon: WifiOff, label: 'Offline', className: 'text-gray-400' },
  syncing: { icon: RefreshCw, label: 'Syncing...', className: 'text-blue-400 animate-spin' },
  synced: { icon: CheckCircle, label: 'Synced', className: 'text-green-500' },
  error: { icon: AlertCircle, label: 'Sync Error', className: 'text-red-500' },
};

export default function StatusBar() {
  const { status, setStatus } = useSyncStore();

  useEffect(() => {
    // Listen for sync status updates from main process
    if (window.api?.onSyncStatusChange) {
      window.api.onSyncStatusChange((newStatus) => {
        setStatus(newStatus);
      });
    }
  }, [setStatus]);

  const cfg = statusConfig[status];
  const Icon = cfg.icon;

  return (
    <div className="h-8 bg-gray-900 border-t border-gray-800 flex items-center px-4 gap-6 text-xs text-gray-400">
      <div className={`flex items-center gap-1.5 ${cfg.className}`}>
        <Icon size={12} className={status === 'syncing' ? 'animate-spin' : ''} />
        <span>{cfg.label}</span>
      </div>
      <span className="text-gray-600">|</span>
      <span>{new Date().toLocaleDateString('en-LK', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
    </div>
  );
}
