import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { backend } from '../../db/backendService';
import { Order, InventoryItem } from '../../types';
import { NavTab } from '../../components/layout/AppLayout';

interface DashboardPageProps {
  onNavigate: (tab: NavTab) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { currentRestaurant, currentUser } = useAuth();
  const restId = currentRestaurant?.id || '';

  const caller = {
    restaurantId: restId,
    role: currentUser?.role || 'owner'
  };

  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [chartView, setChartView] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const loadData = () => {
    if (!restId) return;
    try {
      setOrders(backend.getOrders(caller, restId));
      setInventory(backend.getInventory(caller, restId));
    } catch (e: any) {
      console.error(e.message);
    }
  };

  useEffect(() => {
    loadData();
    return backend.subscribe(loadData);
  }, [restId]);

  // Real Database Metrics
  const todayStr = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === todayStr);
  const todaySales = todayOrders
    .filter(o => o.orderStatus !== 'cancelled')
    .reduce((sum, o) => sum + o.finalTotal, 0);

  const pendingOrders = orders.filter(o => o.orderStatus === 'new' || o.orderStatus === 'preparing');
  const completedOrders = orders.filter(o => o.orderStatus === 'completed');
  const cancelledOrders = orders.filter(o => o.orderStatus === 'cancelled');
  const avgBill = todayOrders.length > 0 ? Math.round(todaySales / todayOrders.length) : 0;

  // Past 7 days sales
  const pastWeekDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weeklySales = orders
    .filter(o => new Date(o.createdAt) >= pastWeekDate && o.orderStatus !== 'cancelled')
    .reduce((sum, o) => sum + o.finalTotal, 0);

  // Past 30 days sales
  const pastMonthDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const monthlySales = orders
    .filter(o => new Date(o.createdAt) >= pastMonthDate && o.orderStatus !== 'cancelled')
    .reduce((sum, o) => sum + o.finalTotal, 0);

  // Payment Breakdown
  const paymentBreakdown = orders.reduce(
    (acc, o) => {
      if (o.orderStatus === 'cancelled') return acc;
      const m = o.paymentMethod || 'cash';
      if (m === 'cash') acc.cash += o.finalTotal;
      else if (m === 'upi') acc.upi += o.finalTotal;
      else if (m === 'card') acc.card += o.finalTotal;
      else acc.other += o.finalTotal;
      return acc;
    },
    { cash: 0, upi: 0, card: 0, other: 0 }
  );

  const totalBreakdown = paymentBreakdown.cash + paymentBreakdown.upi + paymentBreakdown.card + paymentBreakdown.other;

  // Low stock items
  const lowStockItems = inventory.filter(i => i.currentStock <= i.minimumStock);

  // Top selling products
  const productMap: { [name: string]: { qty: number; sales: number } } = {};
  orders.forEach(o => {
    if (o.orderStatus !== 'cancelled') {
      o.items.forEach(item => {
        if (!productMap[item.name]) productMap[item.name] = { qty: 0, sales: 0 };
        productMap[item.name].qty += item.quantity;
        productMap[item.name].sales += item.totalPrice;
      });
    }
  });

  const topSellingProducts = Object.entries(productMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return (
    <div className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-surfaceBorder gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-charcoal-900 tracking-tight">Restaurant Dashboard</h1>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Operational summary for <span className="font-semibold text-forest-800">{currentRestaurant?.name}</span>
          </p>
        </div>

        <button
          onClick={() => onNavigate('pos')}
          className="flex items-center gap-1.5 bg-forest-800 hover:bg-forest-900 text-white px-4 py-2 rounded text-xs font-bold shadow-xs transition-colors self-start"
        >
          <span>Open POS Billing &rarr;</span>
        </button>
      </div>

      {orders.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-surfaceBorder rounded p-8 text-center text-xs space-y-2">
          <h3 className="font-bold text-sm text-charcoal-800">No Sales Recorded Yet</h3>
          <p className="text-charcoal-500 max-w-sm mx-auto">
            Sales, order metrics and revenue breakdowns will automatically compute as soon as your cashier creates the first bill.
          </p>
          <button
            onClick={() => onNavigate('pos')}
            className="mt-3 px-4 py-1.5 bg-forest-800 text-white rounded font-bold"
          >
            Create First Order in POS
          </button>
        </div>
      ) : (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white border border-surfaceBorder rounded p-3 shadow-xs">
              <span className="text-[11px] font-semibold text-charcoal-500 block uppercase">Today's Sales</span>
              <span className="text-xl font-bold text-forest-900 font-mono mt-1 block">₹{todaySales}</span>
              <span className="text-[10px] text-charcoal-500 mt-0.5 block">{todayOrders.length} bills settled</span>
            </div>

            <div className="bg-white border border-surfaceBorder rounded p-3 shadow-xs">
              <span className="text-[11px] font-semibold text-charcoal-500 block uppercase">Today's Orders</span>
              <span className="text-xl font-bold text-charcoal-900 font-mono mt-1 block">{todayOrders.length}</span>
              <span className="text-[10px] text-charcoal-500 mt-0.5 block">Total tickets</span>
            </div>

            <div className="bg-white border border-surfaceBorder rounded p-3 shadow-xs">
              <span className="text-[11px] font-semibold text-charcoal-500 block uppercase">Average Bill</span>
              <span className="text-xl font-bold text-charcoal-900 font-mono mt-1 block">₹{avgBill}</span>
              <span className="text-[10px] text-charcoal-500 mt-0.5 block">Per order average</span>
            </div>

            <div className="bg-white border border-surfaceBorder rounded p-3 shadow-xs">
              <span className="text-[11px] font-semibold text-charcoal-500 block uppercase">Pending Orders</span>
              <span className="text-xl font-bold text-earthAmber font-mono mt-1 block">{pendingOrders.length}</span>
              <span className="text-[10px] text-charcoal-500 mt-0.5 block">In kitchen</span>
            </div>

            <div className="bg-white border border-surfaceBorder rounded p-3 shadow-xs">
              <span className="text-[11px] font-semibold text-charcoal-500 block uppercase">Completed</span>
              <span className="text-xl font-bold text-forest-700 font-mono mt-1 block">{completedOrders.length}</span>
              <span className="text-[10px] text-charcoal-500 mt-0.5 block">Fulfilled orders</span>
            </div>

            <div className="bg-white border border-surfaceBorder rounded p-3 shadow-xs">
              <span className="text-[11px] font-semibold text-charcoal-500 block uppercase">Cancelled</span>
              <span className="text-xl font-bold text-earthRed font-mono mt-1 block">{cancelledOrders.length}</span>
              <span className="text-[10px] text-charcoal-500 mt-0.5 block">Voided bills</span>
            </div>
          </div>

          {/* Sales Comparison & Payment Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Chart Card */}
            <div className="lg:col-span-2 bg-white border border-surfaceBorder rounded p-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-surfaceBorder">
                <div>
                  <h2 className="font-bold text-sm text-forest-900">Sales Overview</h2>
                  <span className="text-xs text-charcoal-500">Real transaction revenue</span>
                </div>

                <div className="flex items-center bg-surface p-0.5 rounded border border-surfaceBorder text-xs">
                  <button
                    onClick={() => setChartView('daily')}
                    className={`px-2.5 py-1 rounded font-medium ${chartView === 'daily' ? 'bg-forest-800 text-white' : 'text-charcoal-700'}`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setChartView('weekly')}
                    className={`px-2.5 py-1 rounded font-medium ${chartView === 'weekly' ? 'bg-forest-800 text-white' : 'text-charcoal-700'}`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setChartView('monthly')}
                    className={`px-2.5 py-1 rounded font-medium ${chartView === 'monthly' ? 'bg-forest-800 text-white' : 'text-charcoal-700'}`}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-forest-900 font-mono">
                    ₹{chartView === 'daily' ? todaySales : chartView === 'weekly' ? weeklySales : monthlySales}
                  </span>
                  <span className="text-xs text-charcoal-500">settled revenue</span>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-charcoal-700 mb-1">
                      <span>Dine-In Revenue:</span>
                      <span className="font-mono font-semibold">
                        ₹{orders.filter(o => o.orderType === 'dine_in' && o.orderStatus !== 'cancelled').reduce((acc, o) => acc + o.finalTotal, 0)}
                      </span>
                    </div>
                    <div className="w-full bg-surface h-2 rounded overflow-hidden">
                      <div
                        className="bg-forest-700 h-2 rounded"
                        style={{
                          width: totalBreakdown > 0 ? `${(orders.filter(o => o.orderType === 'dine_in' && o.orderStatus !== 'cancelled').reduce((acc, o) => acc + o.finalTotal, 0) / totalBreakdown) * 100}%` : '0%'
                        }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-charcoal-700 mb-1">
                      <span>Takeaway & Delivery:</span>
                      <span className="font-mono font-semibold">
                        ₹{orders.filter(o => (o.orderType === 'takeaway' || o.orderType === 'delivery') && o.orderStatus !== 'cancelled').reduce((acc, o) => acc + o.finalTotal, 0)}
                      </span>
                    </div>
                    <div className="w-full bg-surface h-2 rounded overflow-hidden">
                      <div
                        className="bg-earthAmber h-2 rounded"
                        style={{
                          width: totalBreakdown > 0 ? `${(orders.filter(o => (o.orderType === 'takeaway' || o.orderType === 'delivery') && o.orderStatus !== 'cancelled').reduce((acc, o) => acc + o.finalTotal, 0) / totalBreakdown) * 100}%` : '0%'
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="bg-white border border-surfaceBorder rounded p-4 shadow-xs text-xs">
              <div className="pb-3 border-b border-surfaceBorder">
                <h2 className="font-bold text-sm text-forest-900">Payment Breakdown</h2>
                <span className="text-charcoal-500">Settled tender methods</span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-forest-700"></span>
                    <span>UPI / QR</span>
                  </span>
                  <span className="font-mono font-bold">₹{paymentBreakdown.upi}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-earthAmber"></span>
                    <span>Cash</span>
                  </span>
                  <span className="font-mono font-bold">₹{paymentBreakdown.cash}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    <span>Card</span>
                  </span>
                  <span className="font-mono font-bold">₹{paymentBreakdown.card}</span>
                </div>

                <div className="pt-3 border-t border-surfaceBorder flex justify-between font-bold text-charcoal-900">
                  <span>Total Settled:</span>
                  <span className="font-mono text-sm">₹{totalBreakdown}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Low Stock & Top Selling Products */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Low Stock Alerts */}
            <div className="bg-white border border-surfaceBorder rounded p-4 shadow-xs text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-surfaceBorder">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-earthAmber"></span>
                  <h2 className="font-bold text-sm text-forest-900">Low Stock Alerts</h2>
                </div>
                <button
                  onClick={() => onNavigate('inventory')}
                  className="text-forest-700 font-semibold hover:underline"
                >
                  Manage Inventory &rarr;
                </button>
              </div>

              <div className="mt-3 divide-y divide-surfaceBorder">
                {lowStockItems.length === 0 ? (
                  <p className="text-charcoal-500 italic py-3 text-center">All stock levels are adequate.</p>
                ) : (
                  lowStockItems.map(item => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-charcoal-900">{item.name}</span>
                        <div className="text-[11px] text-charcoal-500">
                          Current: <span className="text-earthRed font-bold font-mono">{item.currentStock} {item.unit}</span> (Min: {item.minimumStock} {item.unit})
                        </div>
                      </div>
                      <button
                        onClick={() => onNavigate('inventory')}
                        className="px-2.5 py-1 bg-earthAmber-light text-earthAmber border border-earthAmber-border rounded text-[11px] font-semibold"
                      >
                        Add Stock
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Selling Products */}
            <div className="bg-white border border-surfaceBorder rounded p-4 shadow-xs text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-surfaceBorder">
                <h2 className="font-bold text-sm text-forest-900">Top Selling Products</h2>
                <button
                  onClick={() => onNavigate('reports')}
                  className="text-forest-700 font-semibold hover:underline"
                >
                  View Reports &rarr;
                </button>
              </div>

              <div className="mt-3 divide-y divide-surfaceBorder">
                {topSellingProducts.length === 0 ? (
                  <p className="text-charcoal-500 italic py-3 text-center">No sales yet.</p>
                ) : (
                  topSellingProducts.map((p, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-4 text-center font-bold text-charcoal-400 font-mono">#{idx + 1}</span>
                        <span className="font-semibold text-charcoal-900">{p.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-charcoal-900 font-mono">{p.qty} Sold</span>
                        <span className="text-[11px] text-charcoal-500 block">₹{p.sales}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
