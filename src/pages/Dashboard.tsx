import { useEffect, useState } from 'react';
import { ShoppingCart, Package, Users, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

interface DailySummary {
  total_transactions: number;
  total_revenue: number;
  total_discounts: number;
  avg_transaction: number;
}

export default function Dashboard() {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const load = async () => {
      if (!window.api) return;
      const [sum, lowStock] = await Promise.all([
        window.api.getdailySummary(today),
        window.api.getLowStockProducts(),
      ]);
      setSummary(sum);
      setLowStockItems(lowStock?.slice(0, 5) || []);
      setLowStockCount(lowStock?.length || 0);
    };
    load();
  }, [today]);

  const formatLKR = (amount: number) =>
    `LKR ${(amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

  const statCards = [
    {
      title: "Today's Revenue",
      value: formatLKR(summary?.total_revenue || 0),
      icon: TrendingUp,
      color: 'bg-blue-500',
      link: '/reports',
    },
    {
      title: "Transactions Today",
      value: summary?.total_transactions || 0,
      icon: ShoppingCart,
      color: 'bg-green-500',
      link: '/pos',
    },
    {
      title: 'Avg. Transaction',
      value: formatLKR(summary?.avg_transaction || 0),
      icon: TrendingUp,
      color: 'bg-purple-500',
      link: '/reports',
    },
    {
      title: 'Low Stock Items',
      value: lowStockCount,
      icon: AlertTriangle,
      color: lowStockCount > 0 ? 'bg-red-500' : 'bg-gray-400',
      link: '/inventory',
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => (
          <Link key={card.title} to={card.link} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center mb-3`}>
              <card.icon size={20} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{card.value}</p>
            <p className="text-sm text-gray-500 mt-1">{card.title}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-3">Quick Actions</h2>
          <div className="flex flex-col gap-2">
            {[
              { to: '/pos', icon: ShoppingCart, label: 'New Sale', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
              { to: '/inventory', icon: Package, label: 'Add Product', color: 'bg-green-50 text-green-700 hover:bg-green-100' },
              { to: '/customers', icon: Users, label: 'Add Customer', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
              { to: '/reports', icon: TrendingUp, label: 'View Reports', color: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
            ].map(({ to, icon: Icon, label, color }) => (
              <Link key={to} to={to} className={`flex items-center justify-between p-3 rounded-lg ${color} transition-colors`}>
                <div className="flex items-center gap-2">
                  <Icon size={16} />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <ArrowRight size={14} />
              </Link>
            ))}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700">Low Stock Alert</h2>
            <Link to="/inventory" className="text-xs text-blue-500 hover:underline">View all →</Link>
          </div>
          {lowStockItems.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">✅ All items well stocked</p>
          ) : (
            <div className="flex flex-col gap-2">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                  <span className="text-sm text-gray-700 truncate">{item.name}</span>
                  <span className="text-xs font-bold text-red-600 ml-2 shrink-0">
                    {item.stock} {item.unit} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
