import { useState } from 'react';
import { X, Printer, CheckCircle, FileText, MessageSquare } from 'lucide-react';
import type { CartItem, Customer } from '../../types';
import { format } from 'date-fns';
import { useAuthStore } from '../../stores/authStore';

interface PaymentModalProps {
  total: number;
  paymentMethod: 'cash' | 'card' | 'qr';
  cartItems: CartItem[];
  customer: Customer | null;
  discount: number;
  subtotal: number;
  tax: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentModal({
  total, paymentMethod, cartItems, customer, discount, subtotal, tax,
  onClose, onSuccess,
}: PaymentModalProps) {
  const [amountPaid, setAmountPaid] = useState(total);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [saleId, setSaleId] = useState<number | null>(null);
  const [customPhone, setCustomPhone] = useState(customer?.phone || '');
  const { currentEmployee } = useAuthStore();

  const change = Math.max(0, amountPaid - total);
  const formatLKR = (v: number) => `LKR ${v.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

  const handleCharge = async () => {
    if (paymentMethod === 'cash' && amountPaid < total) return;
    setProcessing(true);
    try {
      const result = await window.api?.createSale({
        customer_id: customer?.id || null,
        employee_id: currentEmployee?.id || 1,
        items: cartItems,
        subtotal,
        discount,
        tax,
        total,
        amount_paid: amountPaid,
        change_amount: change,
        payment_method: paymentMethod,
      });
      setInvoiceNumber(result?.invoice_number || '');
      setSaleId(result?.id || null);
      setSuccess(true);

      // Auto-print receipt if enabled in Settings
      if (window.api?.getSettings && window.api?.printReceipt) {
        window.api.getSettings().then((settings) => {
          if (settings?.auto_print_receipt === 'true') {
            buildReceiptData(result?.invoice_number).then((data) => {
              window.api.printReceipt({
                ...data,
                silent: settings?.silent_print === 'true',
              });
            });
          }
        });
      }
    } catch (err) {
      console.error('Sale failed:', err);
      alert('Sale failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const buildReceiptData = async (invNum?: string) => {
    const settings = await window.api.getSettings();
    return {
      invoice_number: invNum || invoiceNumber,
      shop_name: settings.shop_name || 'My Shop',
      shop_subtitle: settings.shop_subtitle || '',
      shop_logo: settings.shop_logo || '',
      shop_address: settings.shop_address || '',
      shop_phone: settings.shop_phone || '',
      shop_br_number: settings.shop_br_number || '',
      receipt_header: settings.receipt_header || '',
      cashier_name: currentEmployee?.name || 'Staff',
      customer_name: customer?.name,
      items: cartItems.map((i) => {
        let displayQty: string | number = i.quantity;
        if (i.unit === 'kg') {
          displayQty = i.quantity < 1 ? `${Math.round(i.quantity * 1000)}g` : `${i.quantity}kg`;
        } else if (i.unit && i.unit !== 'pcs') {
          displayQty = `${i.quantity}${i.unit}`;
        }
        return {
          product_name: i.product_name,
          quantity: displayQty as any,
          unit_price: i.unit_price,
          total: i.total,
        };
      }),
      subtotal,
      discount,
      tax,
      total,
      amount_paid: amountPaid,
      change_amount: change,
      payment_method: paymentMethod,
      footer: settings.receipt_footer || 'Thank you for shopping!',
      date: format(new Date(), 'dd/MM/yyyy HH:mm'),
      branding_enabled: settings.receipt_branding_enabled !== 'false',
      branding_text: settings.receipt_branding_text || 'System by JK Soft - 070 522 4007',
    };
  };

  const handlePrint = async () => {
    const data = await buildReceiptData();
    const settings = await window.api.getSettings();
    await window.api.printReceipt({
      ...data,
      silent: settings?.silent_print === 'true',
    });
  };

  const handleSavePDF = async () => {
    const data = await buildReceiptData();
    const result = await window.api.savePDF(data);
    if (result.success && result.data) {
      // Trigger download
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${result.data}`;
      link.download = `receipt-${invoiceNumber}.pdf`;
      link.click();
    }
  };

  const handleSendWhatsApp = async () => {
    let phone = customPhone.trim().replace(/[^0-9]/g, '');
    if (!phone) {
      alert('Please enter a phone number');
      return;
    }
    if (phone.startsWith('0')) {
      phone = '94' + phone.substring(1);
    }
    const settings = await window.api.getSettings();
    const shopName = settings.shop_name || 'My Shop';
    const itemsText = cartItems
      .map((i) => {
        let qtyLabel = `x${i.quantity}`;
        if (i.unit === 'kg') {
          qtyLabel = i.quantity < 1 ? `${Math.round(i.quantity * 1000)}g` : `${i.quantity}kg`;
        } else if (i.unit && i.unit !== 'pcs') {
          qtyLabel = `${i.quantity}${i.unit}`;
        }
        return `• ${i.product_name} (${qtyLabel}) = LKR ${i.total.toFixed(2)}`;
      })
      .join('\n');

    const msg = `🧾 *${shopName}* - Receipt\n` +
      `Invoice: ${invoiceNumber}\n` +
      `Date: ${format(new Date(), 'dd/MM/yyyy HH:mm')}\n\n` +
      `*Items:*\n${itemsText}\n\n` +
      `*Subtotal:* LKR ${subtotal.toFixed(2)}\n` +
      (discount > 0 ? `*Discount:* -LKR ${discount.toFixed(2)}\n` : '') +
      `*TOTAL:* LKR ${total.toFixed(2)}\n` +
      `Paid (${paymentMethod.toUpperCase()}): LKR ${amountPaid.toFixed(2)}\n` +
      (change > 0 ? `Change: LKR ${change.toFixed(2)}\n` : '') +
      `\n_${settings.receipt_footer || 'Thank you for shopping!'}_` +
      (settings.receipt_branding_enabled !== 'false'
        ? `\n\n_${settings.receipt_branding_text || 'System by JK Soft - 070 522 4007'}_`
        : '');

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Quick cash amounts (round up to nearest 100/500/1000)
  const quickAmounts = [...new Set([
    Math.ceil(total / 100) * 100,
    Math.ceil(total / 500) * 500,
    Math.ceil(total / 1000) * 1000,
  ])].filter((v) => v >= total).slice(0, 3);

  // ===== SUCCESS SCREEN =====
  if (success) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl w-88 shadow-2xl overflow-hidden border border-gray-100">
          {/* Success Header */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-xs rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <CheckCircle size={36} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Payment Done!</h2>
            <p className="text-green-100 text-xs font-mono mt-1">{invoiceNumber}</p>
          </div>

          {/* Change amount */}
          {paymentMethod === 'cash' && change > 0 && (
            <div className="px-6 py-3 bg-green-50/80 border-b border-green-100">
              <div className="flex justify-between items-center">
                <span className="text-xs text-green-700 font-semibold uppercase tracking-wider">Change Due</span>
                <span className="text-2xl font-bold text-green-700">{formatLKR(change)}</span>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="px-5 py-3 text-xs text-gray-600 space-y-1.5 border-b">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Paid</span>
              <span className="font-bold text-gray-800">{formatLKR(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Method</span>
              <span className="capitalize font-semibold text-gray-700">{paymentMethod}</span>
            </div>
            {customer && (
              <div className="flex justify-between">
                <span className="text-gray-400">Customer</span>
                <span className="font-medium text-blue-600">{customer.name}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 space-y-2.5">
            {/* Print & PDF buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 active:scale-98 transition-all"
              >
                <Printer size={15} /> Print Receipt
              </button>
              <button
                onClick={handleSavePDF}
                className="flex items-center justify-center gap-1.5 py-2.5 border border-blue-200 rounded-xl text-xs font-semibold text-blue-600 hover:bg-blue-50 active:scale-98 transition-all"
              >
                <FileText size={15} /> Save PDF
              </button>
            </div>

            {/* WhatsApp Receipt Box */}
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="WhatsApp Phone (07x...)"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                className="flex-1 border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <button
                onClick={handleSendWhatsApp}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs active:scale-95 transition-all"
                title="Send receipt to WhatsApp"
              >
                <MessageSquare size={13} />
                WhatsApp
              </button>
            </div>

            {/* New Sale Button */}
            <button
              onClick={onSuccess}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-200 active:scale-98 transition-all"
            >
              New Sale →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== PAYMENT SCREEN =====
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-96 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-gray-800 text-lg">
            {paymentMethod === 'cash' ? '💵' : paymentMethod === 'card' ? '💳' : '📱'} {paymentMethod.toUpperCase()} Payment
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Amount Due */}
          <div className="text-center bg-blue-50 rounded-2xl py-4">
            <p className="text-xs text-blue-500 font-medium mb-1">AMOUNT DUE</p>
            <p className="text-4xl font-bold text-blue-700">{formatLKR(total)}</p>
            {cartItems.length > 0 && (
              <p className="text-xs text-blue-400 mt-1">{cartItems.reduce((s, i) => s + i.quantity, 0)} items</p>
            )}
          </div>

          {/* Cash Input */}
          {paymentMethod === 'cash' && (
            <>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1.5 block">AMOUNT RECEIVED</label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  className="w-full border-2 border-blue-200 rounded-xl px-4 py-3 text-2xl font-bold text-center focus:outline-none focus:border-blue-500 transition-colors"
                  autoFocus
                />
              </div>

              {/* Quick amounts */}
              <div className="flex gap-2">
                <button
                  onClick={() => setAmountPaid(total)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors border-2 ${
                    amountPaid === total ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'
                  }`}
                >
                  Exact
                </button>
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setAmountPaid(amt)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors border-2 ${
                      amountPaid === amt ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'
                    }`}
                  >
                    {(amt / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>

              {/* Change */}
              <div className={`flex justify-between items-center p-3 rounded-xl border-2 ${change > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <span className={`text-sm font-semibold ${change > 0 ? 'text-green-700' : 'text-gray-500'}`}>Change</span>
                <span className={`text-2xl font-bold ${change > 0 ? 'text-green-600' : 'text-gray-400'}`}>{formatLKR(change)}</span>
              </div>
            </>
          )}

          {/* Card / QR view */}
          {(paymentMethod === 'card' || paymentMethod === 'qr') && (
            <div className="text-center py-6 bg-gray-50 rounded-2xl">
              <div className="text-6xl mb-3">{paymentMethod === 'card' ? '💳' : '📱'}</div>
              <p className="text-sm font-medium text-gray-700">
                {paymentMethod === 'card' ? 'Swipe or tap card on terminal' : 'Show QR code to customer'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Click confirm when done</p>
            </div>
          )}

          {/* Charge Button */}
          <button
            onClick={handleCharge}
            disabled={processing || (paymentMethod === 'cash' && amountPaid < total)}
            className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-base hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200"
          >
            {processing ? '⏳ Processing...' : `✓ Confirm ${formatLKR(total)}`}
          </button>

          {paymentMethod === 'cash' && amountPaid < total && (
            <p className="text-center text-xs text-red-500">
              Need {formatLKR(total - amountPaid)} more
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
