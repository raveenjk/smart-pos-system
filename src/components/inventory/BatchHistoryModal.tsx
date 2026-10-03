import React, { useState, useEffect } from 'react';
import { X, Layers, Calendar, Clock, AlertTriangle, CheckCircle, Package, Plus, Edit3 } from 'lucide-react';
import type { Product, ProductBatch } from '../../types';

interface BatchHistoryModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenReceiveStock?: (product: Product) => void;
  onBatchAdjusted?: () => void;
}

export default function BatchHistoryModal({
  product,
  isOpen,
  onClose,
  onOpenReceiveStock,
  onBatchAdjusted,
}: BatchHistoryModalProps) {
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [adjustingBatch, setAdjustingBatch] = useState<ProductBatch | null>(null);
  const [newQty, setNewQty] = useState<number | string>(0);
  const [adjustReason, setAdjustReason] = useState('Stock Count Correction');

  const loadBatches = async () => {
    if (!product || !isOpen) return;
    setLoading(true);
    try {
      const data = await window.api.getProductBatches(product.id);
      setBatches(data || []);
    } catch (err) {
      console.error('Failed to load batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, [product, isOpen]);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingBatch) return;

    try {
      const res = await window.api.adjustStockBatch({
        batch_id: adjustingBatch.id,
        new_quantity: Number(newQty),
        reason: adjustReason,
      });

      if (res.success) {
        setAdjustingBatch(null);
        loadBatches();
        onBatchAdjusted?.();
      } else {
        alert(res.error || 'Adjustment failed');
      }
    } catch (err: any) {
      alert(err?.message || 'Error adjusting batch');
    }
  };

  if (!isOpen || !product) return null;

  const activeBatches = batches.filter((b) => b.quantity_remaining > 0);
  const depletedBatches = batches.filter((b) => b.quantity_remaining <= 0);

  const getExpiryBadge = (batch: ProductBatch) => {
    if (!batch.expiry_date) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
          No Expiry Date
        </span>
      );
    }

    const days = batch.days_left;
    if (days === null || days === undefined) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
          {batch.expiry_date}
        </span>
      );
    }

    if (days < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-md animate-pulse">
          <AlertTriangle size={12} /> Expired {Math.abs(days)}d ago ({batch.expiry_date})
        </span>
      );
    }

    if (days <= 30) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md">
          <Clock size={12} /> Expires in {days} days ({batch.expiry_date})
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
        <CheckCircle size={12} /> Good ({days}d left) · {batch.expiry_date}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between bg-gradient-to-r from-blue-50 via-indigo-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-200">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">Batch & Expiry Inspector</h2>
              <p className="text-xs text-gray-500 font-medium">
                {product.name} · Total Stock: <span className="font-bold text-blue-700">{product.stock} {product.unit}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenReceiveStock && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenReceiveStock(product);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                <Plus size={14} /> + Add Batch
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-xs">
              <p className="animate-pulse">Loading batch history...</p>
            </div>
          ) : batches.length === 0 ? (
            <div className="py-14 text-center">
              <Package size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="font-semibold text-gray-700 text-sm">No Batches Recorded Yet</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1 mb-4">
                This item has a total stock of {product.stock} {product.unit} from initial inventory without separate batch numbers.
              </p>
              {onOpenReceiveStock && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenReceiveStock(product);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 cursor-pointer"
                >
                  <Plus size={14} /> Receive First Batch (Stock In)
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Active Batches Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Active Batches in Stock ({activeBatches.length})
                  </h3>
                  <span className="text-[11px] text-gray-400">Sold via FIFO (First-In, First-Out)</span>
                </div>

                <div className="space-y-2.5">
                  {activeBatches.map((batch, index) => (
                    <div
                      key={batch.id}
                      className="p-4 rounded-2xl border border-gray-200 bg-white hover:border-blue-300 transition-all shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-mono font-bold rounded-lg text-xs">
                            {batch.batch_number}
                          </span>
                          {index === 0 && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              FIFO Next to Sell
                            </span>
                          )}
                        </div>
                        <div>{getExpiryBadge(batch)}</div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                        <div>
                          <span className="text-gray-400 text-[10px] uppercase font-semibold block">Remaining</span>
                          <span className="font-black text-gray-900 text-sm">
                            {batch.quantity_remaining} <span className="text-xs font-normal text-gray-500">/ {batch.quantity_received} {product.unit}</span>
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-[10px] uppercase font-semibold block">Selling Price</span>
                          <span className="font-bold text-blue-600 text-xs">LKR {batch.selling_price.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-[10px] uppercase font-semibold block">Cost Price</span>
                          <span className="font-semibold text-gray-700 text-xs">LKR {batch.cost_price.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-[10px] uppercase font-semibold block">Received Date</span>
                          <span className="text-gray-700 text-xs font-medium">{batch.received_date}</span>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-400 pt-1">
                        <span>{batch.supplier_note ? `Note: ${batch.supplier_note}` : 'No supplier note'}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustingBatch(batch);
                            setNewQty(batch.quantity_remaining);
                            setAdjustReason('Stock Count Correction');
                          }}
                          className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 size={12} /> Adjust Qty
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Depleted / Past Batches */}
              {depletedBatches.length > 0 && (
                <div className="pt-2">
                  <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-2">
                    Depleted Batches (0 Remaining) ({depletedBatches.length})
                  </h3>
                  <div className="space-y-1.5 opacity-70">
                    {depletedBatches.map((batch) => (
                      <div
                        key={batch.id}
                        className="px-3.5 py-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 font-mono text-gray-600">
                          <span className="font-semibold">{batch.batch_number}</span>
                          <span className="text-[11px] text-gray-400">· Rec: {batch.received_date}</span>
                        </div>
                        <div className="flex items-center gap-4 text-gray-500">
                          <span>Received: {batch.quantity_received} {product.unit}</span>
                          <span className="font-bold text-gray-400">Depleted</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Quick Adjustment Modal Sub-form */}
          {adjustingBatch && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-60 p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="font-bold text-gray-900 text-sm">
                    Adjust Batch {adjustingBatch.batch_number}
                  </h4>
                  <button onClick={() => setAdjustingBatch(null)} className="text-gray-400 hover:text-gray-600">
                    <X size={16} />
                  </button>
                </div>
                <form onSubmit={handleAdjustSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-gray-600 block mb-1">New Remaining Quantity</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={newQty}
                      onChange={(e) => setNewQty(e.target.value)}
                      className="w-full border rounded-xl px-3 py-2 font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-600 block mb-1">Reason for Adjustment</label>
                    <select
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      className="w-full border rounded-xl px-3 py-2 bg-white"
                    >
                      <option value="Stock Count Correction">Stock Count Correction</option>
                      <option value="Damaged Stock Write-off">Damaged Stock Write-off</option>
                      <option value="Expired Stock Removal">Expired Stock Removal</option>
                      <option value="Supplier Return">Supplier Return</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setAdjustingBatch(null)}
                      className="flex-1 py-2 border rounded-xl font-semibold text-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs"
                    >
                      Save Adjustment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 font-bold text-gray-700 text-xs rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
