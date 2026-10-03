import { useState, useEffect } from 'react';
import { X, Printer, QrCode, Barcode, Copy, Check, Sparkles, Tag, Layers } from 'lucide-react';
import type { Product } from '../../types';
import { useSettingsStore } from '../../stores/settingsStore';

interface BarcodeModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onProductUpdated?: () => void;
}

export default function BarcodeModal({ product, isOpen, onClose, onProductUpdated }: BarcodeModalProps) {
  const { settings } = useSettingsStore();
  const [format, setFormat] = useState<'CODE128' | 'QR'>('CODE128');
  const [quantity, setQuantity] = useState(1);
  const [includeShopName, setIncludeShopName] = useState(true);
  const [includePrice, setIncludePrice] = useState(true);
  const [labelSize, setLabelSize] = useState<'50x30' | '40x30' | 'receipt'>('50x30');
  const [imgData, setImgData] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentBarcode, setCurrentBarcode] = useState<string>('');
  const [generatingBarcode, setGeneratingBarcode] = useState(false);

  const shopName = settings.shop_name || 'My Store';

  // Sync current barcode when product opens
  useEffect(() => {
    if (product) {
      setCurrentBarcode(product.barcode || '');
    }
  }, [product, isOpen]);

  // Load barcode / QR code whenever currentBarcode or format changes
  useEffect(() => {
    if (!isOpen || !currentBarcode) {
      setImgData('');
      return;
    }

    setLoading(true);
    window.api
      ?.generateBarcode(currentBarcode, format)
      .then((res) => {
        if (res?.success && res.data) {
          setImgData(`data:image/png;base64,${res.data}`);
        }
      })
      .finally(() => setLoading(false));

    // Reset default quantity to stock or 1
    if (product?.stock && product.stock > 0) {
      setQuantity(Math.min(product.stock, 50));
    } else {
      setQuantity(1);
    }
  }, [isOpen, currentBarcode, format]);

  if (!isOpen || !product) return null;

  const handleGenerateAndAssignBarcode = async () => {
    if (!product) return;
    setGeneratingBarcode(true);
    try {
      const code = await window.api.generateUniqueBarcode();
      await window.api.updateProduct(product.id, { barcode: code });
      setCurrentBarcode(code);
      product.barcode = code;
      onProductUpdated?.();
    } catch (err) {
      console.error('Failed to generate barcode:', err);
    } finally {
      setGeneratingBarcode(false);
    }
  };

  const handleCopyBarcode = () => {
    if (currentBarcode) {
      navigator.clipboard.writeText(currentBarcode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    if (!imgData) return;

    const win = window.open('', '_blank');
    if (!win) return;

    // Dimensions CSS based on label size
    const sizeConfig = {
      '50x30': { width: '50mm', height: '30mm', fontSize: '9px', titleSize: '10px', priceSize: '12px', imgMax: '20mm' },
      '40x30': { width: '40mm', height: '30mm', fontSize: '8.5px', titleSize: '9.5px', priceSize: '11px', imgMax: '18mm' },
      'receipt': { width: '72mm', height: 'auto', fontSize: '11px', titleSize: '13px', priceSize: '15px', imgMax: '35mm' },
    }[labelSize];

    let labelsHtml = '';
    for (let i = 0; i < quantity; i++) {
      labelsHtml += `
        <div class="label-card">
          ${includeShopName ? `<div class="shop-name">${shopName}</div>` : ''}
          <div class="product-name">${product.name}</div>
          <div class="barcode-wrapper ${format === 'QR' ? 'is-qr' : ''}">
            <img src="${imgData}" alt="Code" />
          </div>
          <div class="barcode-text font-mono">${currentBarcode}</div>
          ${includePrice ? `<div class="price font-bold">LKR ${product.price.toFixed(2)}</div>` : ''}
        </div>
      `;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Tags - ${product.name}</title>
        <style>
          @page {
            size: ${sizeConfig.width} ${sizeConfig.height};
            margin: 0;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            background: #fff;
            color: #000;
            margin: 0;
            padding: 0;
          }
          .label-card {
            width: ${sizeConfig.width};
            ${sizeConfig.height !== 'auto' ? `height: ${sizeConfig.height};` : 'padding: 4mm 2mm;'}
            padding: 1.5mm 2mm;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            page-break-after: always;
            overflow: hidden;
          }
          .shop-name {
            font-size: ${sizeConfig.fontSize};
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
            margin-bottom: 0.5mm;
          }
          .product-name {
            font-size: ${sizeConfig.titleSize};
            font-weight: 700;
            line-height: 1.15;
            max-height: 2.3em;
            overflow: hidden;
            margin-bottom: 1mm;
            text-overflow: ellipsis;
          }
          .barcode-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0.5mm 0;
          }
          .barcode-wrapper img {
            max-height: ${sizeConfig.imgMax};
            max-width: 95%;
            object-fit: contain;
          }
          .barcode-wrapper.is-qr img {
            max-height: 16mm;
          }
          .barcode-text {
            font-size: 8px;
            font-family: monospace;
            letter-spacing: 0.5px;
            margin-top: 0.5mm;
          }
          .price {
            font-size: ${sizeConfig.priceSize};
            font-weight: 900;
            margin-top: 0.5mm;
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <Tag size={20} />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-base">Barcode & QR Price Tag Studio</h2>
              <p className="text-xs text-gray-400">Generate clothing tags, barcode stickers & price labels</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">

          {/* Missing Barcode Alert Banner */}
          {!currentBarcode && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-600" />
                  No Barcode / QR Assigned Yet
                </p>
                <p className="text-[11px] text-amber-700">
                  Ideal for garments, clothes, or custom items. Click to generate a unique code instantly!
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateAndAssignBarcode}
                disabled={generatingBarcode}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Sparkles size={14} />
                {generatingBarcode ? 'Generating...' : 'Generate Code'}
              </button>
            </div>
          )}

          {/* 1. Format Switcher Toggle */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
              Select Tag Code Format
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setFormat('CODE128')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  format === 'CODE128'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Barcode size={16} />
                1D Barcode (Code128)
              </button>
              <button
                type="button"
                onClick={() => setFormat('QR')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  format === 'QR'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <QrCode size={16} />
                2D QR Code (Clothing Tags)
              </button>
            </div>
          </div>

          {/* 2. Interactive Live Sticker Preview */}
          <div className="bg-gray-100/70 p-4 rounded-2xl border border-gray-200/80">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2">
              <span className="flex items-center gap-1">
                <Sparkles size={14} className="text-amber-500" /> Live Sticker Preview ({labelSize}mm)
              </span>
              <span className="font-mono text-[11px] text-gray-400">Ready to Print</span>
            </div>

            {/* Sticker Simulation Card */}
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-4 max-w-[280px] mx-auto shadow-md text-center">
              {includeShopName && (
                <p className="text-[11px] font-black uppercase tracking-wider text-gray-900 mb-0.5 truncate">
                  {shopName}
                </p>
              )}
              <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight mb-2">
                {product.name}
              </p>

              <div className="min-h-[70px] flex items-center justify-center my-1 bg-gray-50/50 p-2 rounded-xl">
                {loading ? (
                  <p className="text-xs text-gray-400 animate-pulse">Generating code...</p>
                ) : imgData ? (
                  <img
                    src={imgData}
                    alt={format}
                    className={`object-contain mx-auto ${format === 'QR' ? 'max-h-24' : 'max-h-14 max-w-full'}`}
                  />
                ) : !currentBarcode ? (
                  <div className="py-2 text-center">
                    <p className="text-xs font-medium text-gray-400">No code generated</p>
                    <button
                      type="button"
                      onClick={handleGenerateAndAssignBarcode}
                      disabled={generatingBarcode}
                      className="mt-1 text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 mx-auto cursor-pointer"
                    >
                      <Sparkles size={12} /> Generate Now
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-red-500">Failed to render</p>
                )}
              </div>

              <p className="text-[10px] font-mono text-gray-400 mt-1 select-all">{currentBarcode || '—'}</p>

              {includePrice && (
                <p className="text-base font-black text-gray-900 mt-1">
                  LKR {product.price.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* 3. Sticker Print Settings */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Quantity */}
            <div>
              <label className="font-bold text-gray-600 block mb-1.5 uppercase tracking-wider text-[11px]">
                Print Quantity
              </label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 bg-gray-50 hover:bg-gray-100 font-bold text-gray-600"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full text-center font-bold text-gray-800 text-sm focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-3 py-2 bg-gray-50 hover:bg-gray-100 font-bold text-gray-600"
                >
                  +
                </button>
              </div>
              <div className="flex gap-1 mt-1.5">
                {[1, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setQuantity(num)}
                    className="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 text-[10px] font-semibold text-gray-600"
                  >
                    {num}
                  </button>
                ))}
                {product.stock > 0 && (
                  <button
                    type="button"
                    onClick={() => setQuantity(product.stock)}
                    className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-bold"
                  >
                    Stock ({product.stock})
                  </button>
                )}
              </div>
            </div>

            {/* Label Paper Preset */}
            <div>
              <label className="font-bold text-gray-600 block mb-1.5 uppercase tracking-wider text-[11px]">
                Label Paper Size
              </label>
              <select
                value={labelSize}
                onChange={(e) => setLabelSize(e.target.value as any)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="50x30">50mm × 30mm (Standard Tag)</option>
                <option value="40x30">40mm × 30mm (Small Sticker)</option>
                <option value="receipt">80mm Thermal Paper Roll</option>
              </select>
              <p className="text-[10px] text-gray-400 mt-1">Compatible with Xprinter, TSC, Zebra</p>
            </div>
          </div>

          {/* 4. Display Toggles */}
          <div className="flex items-center gap-4 text-xs font-semibold text-gray-600 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeShopName}
                onChange={(e) => setIncludeShopName(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-400"
              />
              Show Shop Name
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includePrice}
                onChange={(e) => setIncludePrice(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-400"
              />
              Show Selling Price
            </label>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-gray-50/70 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyBarcode}
            disabled={!currentBarcode}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-100 disabled:opacity-40 rounded-xl text-xs font-semibold text-gray-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy Code'}
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !imgData || !currentBarcode}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <Printer size={16} />
              Print {quantity} {quantity === 1 ? 'Sticker' : 'Stickers'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
