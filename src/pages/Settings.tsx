import { useEffect, useState, useRef } from 'react';
import {
  Save, Store, Receipt, Wifi, KeyRound, Copy, Check,
  ShieldCheck, AlertTriangle, RefreshCw, Upload, Image as ImageIcon,
  Trash2, Printer, Sparkles
} from 'lucide-react';
import type { AppSettings } from '../types';
import { useSettingsStore } from '../stores/settingsStore';

export default function Settings() {
  const { settings, updateSettings, loadSettings } = useSettingsStore();
  const [formData, setFormData] = useState<Partial<AppSettings>>({});
  const [saved, setSaved] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState<{
    isActivated: boolean;
    machineId: string;
    licenseKey: string;
    tier: string;
  } | null>(null);
  const [inputKey, setInputKey] = useState('');
  const [activateMsg, setActivateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
    if (window.api?.getLicenseStatus) {
      window.api.getLicenseStatus().then((lic) => {
        setLicenseInfo(lic || null);
        if (lic?.licenseKey) setInputKey(lic.licenseKey);
      });
    }
  }, [loadSettings]);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleChange = (key: keyof AppSettings, val: string) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size should be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        handleChange('shop_logo', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    handleChange('shop_logo', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    const success = await updateSettings(formData);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const handleCopyMachineId = () => {
    if (licenseInfo?.machineId) {
      navigator.clipboard.writeText(licenseInfo.machineId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleActivateLicense = async () => {
    if (!inputKey.trim()) {
      setActivateMsg({ type: 'error', text: 'Please enter a license key' });
      return;
    }
    const res = await window.api?.activateLicense(inputKey);
    if (res?.success) {
      setActivateMsg({ type: 'success', text: res.message });
      if (window.api?.getLicenseStatus) {
        const lic = await window.api.getLicenseStatus();
        setLicenseInfo(lic || null);
      }
    } else {
      setActivateMsg({ type: 'error', text: res?.message || 'Activation failed' });
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await window.api?.forcSync();
      setTimeout(() => setSyncing(false), 1500);
    } catch {
      setSyncing(false);
    }
  };

  const handleTestPrint = async () => {
    if (!window.api?.printReceipt) return;
    const testData = {
      invoice_number: 'TEST-0001',
      shop_name: formData.shop_name || 'My Shop',
      shop_subtitle: formData.shop_subtitle || '',
      shop_logo: formData.shop_logo || '',
      shop_address: formData.shop_address || '123 Main Street',
      shop_phone: formData.shop_phone || '077 123 4567',
      shop_br_number: formData.shop_br_number || '',
      receipt_header: formData.receipt_header || 'Welcome to our store!',
      cashier_name: 'Admin',
      items: [
        { product_name: 'Sample Item 1', quantity: 2, unit_price: 150, total: 300 },
        { product_name: 'Sample Item 2', quantity: 1, unit_price: 450, total: 450 },
      ],
      subtotal: 750,
      discount: 0,
      tax: 0,
      total: 750,
      amount_paid: 1000,
      change_amount: 250,
      payment_method: 'CASH',
      footer: formData.receipt_footer || 'Thank you for shopping with us!',
      date: new Date().toLocaleString(),
    };
    await window.api.printReceipt(testData);
  };

  return (
    <div className="p-6 max-w-6xl pb-24 mx-auto">
      {/* Page Title */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Shop Setup & Receipt Studio</h1>
          <p className="text-sm text-gray-500">
            Customize your shop branding, live receipt format, and machine license
          </p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 ${
            saved
              ? 'bg-green-600 text-white shadow-green-200'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
          }`}
        >
          <Save size={16} />
          {saved ? '✓ Saved & Applied!' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Settings Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Shop Branding */}
          <section className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Store size={20} />
              </div>
              <div>
                <h2 className="font-bold text-gray-800 text-base">Shop Identity & Branding</h2>
                <p className="text-xs text-gray-400">Shown in Sidebar and on every printed receipt</p>
              </div>
            </div>

            {/* Logo Upload Box */}
            <div className="mb-5 p-4 rounded-2xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                {formData.shop_logo ? (
                  <img
                    src={formData.shop_logo}
                    alt="Logo preview"
                    className="w-14 h-14 rounded-2xl object-cover border bg-white shadow-xs"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 text-gray-400 flex items-center justify-center">
                    <ImageIcon size={24} />
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-gray-700">Shop Logo</p>
                  <p className="text-[11px] text-gray-400">Prints on receipts & shows in Sidebar</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 bg-white hover:bg-gray-100 border text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Upload size={13} />
                  {formData.shop_logo ? 'Change' : 'Upload'}
                </button>
                {formData.shop_logo && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    title="Remove Logo"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Shop Name *
                </label>
                <input
                  type="text"
                  value={formData.shop_name || ''}
                  onChange={(e) => handleChange('shop_name', e.target.value)}
                  placeholder="e.g. Sunil Supermarket"
                  className="w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-gray-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Branch / Subtitle
                </label>
                <input
                  type="text"
                  value={formData.shop_subtitle || ''}
                  onChange={(e) => handleChange('shop_subtitle', e.target.value)}
                  placeholder="e.g. Kandy Branch - Retail & Wholesale"
                  className="w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Shop Address
                </label>
                <input
                  type="text"
                  value={formData.shop_address || ''}
                  onChange={(e) => handleChange('shop_address', e.target.value)}
                  placeholder="e.g. No. 45, Peradeniya Road, Kandy"
                  className="w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Contact Number(s)
                </label>
                <input
                  type="text"
                  value={formData.shop_phone || ''}
                  onChange={(e) => handleChange('shop_phone', e.target.value)}
                  placeholder="e.g. 081-2233445 / 077-1234567"
                  className="w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Business Reg / Tax No
                </label>
                <input
                  type="text"
                  value={formData.shop_br_number || ''}
                  onChange={(e) => handleChange('shop_br_number', e.target.value)}
                  placeholder="e.g. BR No: PV-12345 / VAT"
                  className="w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-xs"
                />
              </div>
            </div>
          </section>

          {/* 2. Receipt Notes & Policies */}
          <section className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Receipt size={20} />
              </div>
              <div>
                <h2 className="font-bold text-gray-800 text-base">Receipt Header & Footer Notes</h2>
                <p className="text-xs text-gray-400">Exchange policies, greetings, and thank you notes</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Greeting / Header Note (optional)
                </label>
                <input
                  type="text"
                  value={formData.receipt_header || ''}
                  onChange={(e) => handleChange('receipt_header', e.target.value)}
                  placeholder="e.g. Welcome! Happy to serve you."
                  className="w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Thank You & Exchange Policy (Receipt Footer)
                </label>
                <textarea
                  value={formData.receipt_footer || ''}
                  onChange={(e) => handleChange('receipt_footer', e.target.value)}
                  rows={2}
                  placeholder="e.g. Goods once sold can be exchanged within 7 days with bill. Thank you!"
                  className="w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Printer Automation Toggles */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="pr-4">
                    <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <span>⚡ Auto-Print on Checkout</span>
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Automatically print receipt the moment payment is confirmed (No need to click Print button)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChange('auto_print_receipt', formData.auto_print_receipt === 'true' ? 'false' : 'true')}
                    className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 cursor-pointer ${
                      formData.auto_print_receipt === 'true' ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                        formData.auto_print_receipt === 'true' ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="pr-4">
                    <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <span>🤫 Silent Direct Print</span>
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Send directly to default Windows POS printer without showing the print dialog popup
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChange('silent_print', formData.silent_print === 'true' ? 'false' : 'true')}
                    className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 cursor-pointer ${
                      formData.silent_print === 'true' ? 'bg-emerald-600' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                        formData.silent_print === 'true' ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Software License Section */}
          <section className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-gray-800 text-base">Machine License</h2>
                  <p className="text-xs text-gray-400">Lock software to client hardware</p>
                </div>
              </div>
              {licenseInfo?.isActivated ? (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 border border-green-200 text-xs font-bold rounded-full">
                  <ShieldCheck size={14} />
                  {licenseInfo.tier}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-full">
                  <AlertTriangle size={14} />
                  UNREGISTERED
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200/70 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">
                    Hardware Machine ID
                  </p>
                  <p className="text-sm font-mono font-bold text-gray-800 mt-0.5">
                    {licenseInfo?.machineId || 'Generating...'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyMachineId}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl border shadow-2xs transition-colors"
                >
                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy ID'}
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Activation Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputKey}
                    onChange={(e) => {
                      setInputKey(e.target.value);
                      setActivateMsg(null);
                    }}
                    placeholder="POS-LIFE-XXXXXX-XXXXXXXX"
                    className="flex-1 font-mono uppercase border rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleActivateLicense}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
                  >
                    Activate
                  </button>
                </div>
                {activateMsg && (
                  <p className={`text-xs mt-2 font-medium ${activateMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                    {activateMsg.text}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* 4. Cloud Sync Section */}
          <section className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Wifi size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-gray-800 text-base">Cloud Sync (Supabase)</h2>
                  <p className="text-xs text-gray-400">Offline-first cloud backup & mobile app sync</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleManualSync}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg border transition-colors"
              >
                <RefreshCw size={13} className={syncing ? 'animate-spin text-blue-600' : ''} />
                {syncing ? 'Syncing...' : 'Sync'}
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                  Supabase URL
                </label>
                <input
                  type="text"
                  value={formData.supabase_url || ''}
                  onChange={(e) => handleChange('supabase_url', e.target.value)}
                  placeholder="https://xxx.supabase.co"
                  className="w-full border rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                  Supabase Anon Key
                </label>
                <input
                  type="password"
                  value={formData.supabase_key || ''}
                  onChange={(e) => handleChange('supabase_key', e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5c..."
                  className="w-full border rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Live 80mm Receipt Paper Studio (5 cols) */}
        <div className="lg:col-span-5 sticky top-6">
          <div className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 mb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                <Sparkles size={15} className="text-amber-500" />
                Live 80mm Receipt Preview
              </div>
              <button
                type="button"
                onClick={handleTestPrint}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-95"
              >
                <Printer size={13} />
                Test Print
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mb-3">
              This preview updates live as you type your shop details on the left.
            </p>

            {/* Thermal Receipt Paper Card */}
            <div className="relative bg-[#fcfbf9] border border-gray-300/80 rounded-sm p-5 shadow-lg font-mono text-[11px] leading-tight text-black max-w-[320px] mx-auto select-none">
              {/* Paper zigzag top simulation */}
              <div className="text-center mb-3">
                {formData.shop_logo && (
                  <img
                    src={formData.shop_logo}
                    alt="Logo"
                    className="max-h-12 max-w-[140px] mx-auto mb-2 grayscale"
                  />
                )}
                <p className="text-sm font-black uppercase tracking-tight">
                  {formData.shop_name || 'MY SHOP NAME'}
                </p>
                {formData.shop_subtitle && (
                  <p className="text-[10px] text-gray-700 mt-0.5">{formData.shop_subtitle}</p>
                )}
                {formData.shop_address && (
                  <p className="text-[10px] text-gray-600 mt-0.5">{formData.shop_address}</p>
                )}
                {formData.shop_phone && (
                  <p className="text-[10px] text-gray-600">Tel: {formData.shop_phone}</p>
                )}
                {formData.shop_br_number && (
                  <p className="text-[9px] text-gray-500 mt-0.5">{formData.shop_br_number}</p>
                )}
                {formData.receipt_header && (
                  <p className="text-[10px] italic mt-1 text-gray-700">{formData.receipt_header}</p>
                )}
              </div>

              <div className="border-t border-dashed border-gray-400 my-2" />

              <div className="text-[10px] space-y-0.5 text-gray-600">
                <div className="flex justify-between">
                  <span>Date: {new Date().toLocaleDateString()}</span>
                  <span>Time: 14:32</span>
                </div>
                <div className="flex justify-between">
                  <span>Invoice: INV-20260923-0142</span>
                  <span>Cashier: Admin</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-400 my-2" />

              {/* Sample Items Table */}
              <table className="w-full text-[10px] my-1">
                <thead>
                  <tr className="border-b border-gray-400 text-gray-600">
                    <th className="text-left pb-1">Item</th>
                    <th className="text-center pb-1">Qty</th>
                    <th className="text-right pb-1">Price</th>
                    <th className="text-right pb-1">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="py-1">Munchee Cracker</td>
                    <td className="text-center py-1">2</td>
                    <td className="text-right py-1">360.00</td>
                    <td className="text-right py-1 font-bold">720.00</td>
                  </tr>
                  <tr>
                    <td className="py-1">Highland Milk 1L</td>
                    <td className="text-center py-1">1</td>
                    <td className="text-right py-1">480.00</td>
                    <td className="text-right py-1 font-bold">480.00</td>
                  </tr>
                </tbody>
              </table>

              <div className="border-t border-dashed border-gray-400 my-2" />

              {/* Totals */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>LKR 1,200.00</span>
                </div>
                <div className="flex justify-between font-black text-xs pt-1 border-t border-gray-800">
                  <span>TOTAL</span>
                  <span>LKR 1,200.00</span>
                </div>
                <div className="flex justify-between text-gray-600 text-[10px] pt-0.5">
                  <span>Paid (Cash)</span>
                  <span>LKR 1,500.00</span>
                </div>
                <div className="flex justify-between text-gray-700 font-bold text-[10px]">
                  <span>Change</span>
                  <span>LKR 300.00</span>
                </div>
              </div>

              <div className="border-t-2 border-gray-800 my-2.5" />

              {/* Footer message */}
              <div className="text-center space-y-1 text-[10px] text-gray-700">
                <p>{formData.receipt_footer || 'Thank you for shopping with us! Please come again.'}</p>
                <p className="text-[8px] text-gray-400 font-mono tracking-widest pt-1">
                  ||| | || ||||| || |||| |
                </p>
                <p className="text-[8px] text-gray-400">Powered by POS System</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
