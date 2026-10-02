import { useEffect, useState } from 'react';
import {
  BarChart3, TrendingUp, Package, DollarSign, Download,
  Calendar, Layers, Percent
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import { format, subDays, startOfMonth } from 'date-fns';

export default function Reports() {
  const [salesData, setSalesData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [profitData, setProfitData] = useState<any[]>([]);
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activePreset, setActivePreset] = useState<'today' | '7days' | '30days' | 'month'>('30days');

  const load = async () => {
    if (!window.api) return;
    const filters = { from_date: fromDate, to_date: toDate };
    const [sales, top, profit] = await Promise.all([
      window.api.getSalesReport(filters),
      window.api.getTopProducts(filters),
      window.api.getProfitReport(filters),
    ]);
    setSalesData(sales || []);
    setTopProducts(top || []);
    setProfitData(profit || []);
  };

  useEffect(() => {
    load();
  }, [fromDate, toDate]);

  const setPreset = (preset: 'today' | '7days' | '30days' | 'month') => {
    setActivePreset(preset);
    const today = new Date();
    if (preset === 'today') {
      const d = format(today, 'yyyy-MM-dd');
      setFromDate(d);
      setToDate(d);
    } else if (preset === '7days') {
      setFromDate(format(subDays(today, 7), 'yyyy-MM-dd'));
      setToDate(format(today, 'yyyy-MM-dd'));
    } else if (preset === '30days') {
      setFromDate(format(subDays(today, 30), 'yyyy-MM-dd'));
      setToDate(format(today, 'yyyy-MM-dd'));
    } else if (preset === 'month') {
      setFromDate(format(startOfMonth(today), 'yyyy-MM-dd'));
      setToDate(format(today, 'yyyy-MM-dd'));
    }
  };

  const totalRevenue = salesData.reduce((s, d) => s + (d.revenue || 0), 0);
  const totalTransactions = salesData.reduce((s, d) => s + (d.transactions || 0), 0);
  const totalProfit = profitData.reduce((s, d) => s + (d.profit || 0), 0);
  const totalCost = profitData.reduce((s, d) => s + (d.cost || 0), 0);
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

  const formatLKR = (v: number) => `LKR ${(v || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

  const handleExportCSV = () => {
    if (salesData.length === 0 && topProducts.length === 0) {
      alert('No data available to export');
      return;
    }

    let csv = '=== DAILY SALES SUMMARY ===\n';
    csv += 'Date,Transactions,Revenue (LKR),Discount (LKR),Tax (LKR)\n';
    salesData.forEach((row) => {
      csv += `"${row.date}",${row.transactions},${row.revenue},${row.discounts || 0},${row.tax || 0}\n`;
    });

    csv += '\n=== TOP SELLING PRODUCTS ===\n';
    csv += 'Product Name,Total Qty Sold,Revenue (LKR)\n';
    topProducts.forEach((row) => {
      csv += `"${row.product_name}",${row.total_quantity},${row.total_revenue}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `POS-Report-${fromDate}-to-${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Sales & Business Analytics</h1>
          <p className="text-sm text-gray-500">Track revenue, estimated profit margins, and best-sellers</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Presets */}
          <div className="flex bg-gray-200/80 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'today', label: 'Today' },
              { id: '7days', label: '7 Days' },
              { id: '30days', label: '30 Days' },
              { id: 'month', label: 'This Month' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPreset(p.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activePreset === p.id
                    ? 'bg-white text-gray-800 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs shadow-2xs">
            <Calendar size={13} className="text-gray-400" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="focus:outline-none text-gray-700 bg-transparent"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="focus:outline-none text-gray-700 bg-transparent"
            />
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
            title="Download CSV for Excel"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 flex flex-col justify-between">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{formatLKR(totalRevenue)}</p>
            <p className="text-xs font-medium text-gray-400 mt-0.5">Total Revenue</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 flex flex-col justify-between">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600">{formatLKR(totalProfit)}</p>
            <p className="text-xs font-medium text-gray-400 mt-0.5">
              Gross Profit <span className="text-emerald-600 font-semibold">({profitMargin}% margin)</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 flex flex-col justify-between">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3">
            <BarChart3 size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{totalTransactions}</p>
            <p className="text-xs font-medium text-gray-400 mt-0.5">Invoices Completed</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 flex flex-col justify-between">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-3">
            <Package size={20} />
          </div>
          <div>
            <p className="text-base font-bold text-gray-800 truncate" title={topProducts[0]?.product_name || 'No Sales'}>
              {topProducts[0]?.product_name || '—'}
            </p>
            <p className="text-xs font-medium text-gray-400 mt-0.5">
              Top Seller {topProducts[0] ? `(${topProducts[0].total_quantity} sold)` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Daily Revenue Chart */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 text-sm">Revenue Over Time</h2>
            <span className="text-xs text-gray-400">{salesData.length} active sales days</span>
          </div>
          <div className="h-64">
            {salesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                    tickFormatter={(v) => {
                      try { return format(new Date(v), 'MMM d'); } catch { return v; }
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: any) => [formatLKR(Number(v)), 'Revenue']}
                    labelFormatter={(l) => {
                      try { return format(new Date(l), 'MMMM d, yyyy'); } catch { return l; }
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ fill: '#2563eb', r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-300 text-sm">
                No revenue records in selected date range
              </div>
            )}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 text-sm">Top Products by Revenue</h2>
            <span className="text-xs text-gray-400">Top {Math.min(topProducts.length, 6)}</span>
          </div>
          <div className="h-64">
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="product_name"
                    tick={{ fontSize: 11 }}
                    stroke="#4b5563"
                    width={110}
                  />
                  <Tooltip formatter={(v: any) => [formatLKR(Number(v)), 'Revenue']} />
                  <Bar dataKey="total_revenue" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-300 text-sm">
                No product sales records in selected date range
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
