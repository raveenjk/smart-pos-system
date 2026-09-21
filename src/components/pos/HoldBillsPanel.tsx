import { useEffect, useState } from 'react';
import { X, PlayCircle, Trash2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface HoldBillsPanelProps {
  onClose: () => void;
  onRecall: (id: number) => void;
}

export default function HoldBillsPanel({ onClose, onRecall }: HoldBillsPanelProps) {
  const [bills, setBills] = useState<any[]>([]);

  const load = async () => {
    const data = await window.api.holdGetAll();
    setBills(data || []);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await window.api.holdDelete(id);
    load();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-96 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-orange-50">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-orange-500" />
            <h2 className="font-bold text-gray-800">Held Bills ({bills.length})</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-80 overflow-auto p-3 space-y-2">
          {bills.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Clock size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No held bills</p>
            </div>
          ) : (
            bills.map((bill) => {
              const cart = JSON.parse(bill.cart_data || '[]');
              const total = cart.reduce((s: number, i: any) => s + i.total, 0);
              return (
                <div
                  key={bill.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-orange-300 hover:bg-orange-50 transition-colors cursor-pointer group"
                  onClick={() => onRecall(bill.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800">{bill.label}</p>
                    <p className="text-xs text-gray-500">
                      {cart.length} items · LKR {total.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(bill.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <button
                      onClick={(e) => handleDelete(bill.id, e)}
                      className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                    <PlayCircle size={20} className="text-orange-400 group-hover:text-orange-600" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 border-t">
          <button onClick={onClose} className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
