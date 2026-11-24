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
  const currency = currentRestaurant?.currencySymbol || '₹';

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
    <div className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full space-y-6 bg-[#F5F6F5] text-[#171B18]">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#E7EBE8] gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#171B18] tracking-tight">Restaurant Dashboard</h1>
          <p className="text-xs text-[#59615B] mt-0.5 font-medium">
            Operational summary for <span className="font-bold text-[#078F36]">{currentRestaurant?.name}</span>
          </p>
        </div>

        <button
          onClick={() => onNavigate('pos')}
          className="flex items-center gap-1.5 bg-[#078F36] hover:bg-[#087A32] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-[#078F36]/20 transition-all self-start"
        >
          <span>Open POS Billing &rarr;</span>
        </button>
      </div>

      {orders.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-[#E7EBE8] rounded-2xl p-8 text-center text-xs space-y-2 shadow-sm">
          <h3 className="font-extrabold text-sm text-[#171B18]">No Sales Recorded Yet</h3>
          <p className="text-[#59615B] max-w-sm mx-auto font-medium">
            Sales, order metrics and revenue breakdowns will automatically compute as soon as your cashier creates the first bill.
          </p>
          <button
            onClick={() => onNavigate('pos')}
            className="mt-3 px-5 py-2 bg-[#078F36] hover:bg-[#087A32] text-white rounded-xl font-bold transition-colors"
          >
            Create First Order in POS
          </button>
        </div>
      ) : (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white border border-[#E7EBE8] rounded-2xl p-3.5 shadow-sm">
              <span className="text-[10px] font-bold text-[#59615B] block uppercase tracking-wider">Today's Sales</span>
              <span className="text-xl font-extrabold text-[#078F36] font-mono mt-1 block">{currency}{todaySales}</span>
              <span className="text-[10px] text-[#777F79] font-medium mt-0.5 block">{todayOrders.length} bills settled</span>
            </div>

            <div className="bg-white border border-[#E7EBE8] rounded-2xl p-3.5 shadow-sm">
              <span className="text-[10px] font-bold text-[#59615B] block uppercase tracking-wider">Today's Orders</span>
              <span className="text-xl font-extrabold text-[#171B18] font-mono mt-1 block">{todayOrders.length}</span>
              <span className="text-[10px] text-[#777F79] font-medium mt-0.5 block">Total tickets</span>
            </div>

            <div className="bg-white border border-[#E7EBE8] rounded-2xl p-3.5 shadow-sm">
              <span className="text-[10px] font-bold text-[#59615B] block uppercase tracking-wider">Average Bill</span>
              <span className="text-xl font-extrabold text-[#171B18] font-mono mt-1 block">{currency}{avgBill}</span>
              <span className="text-[10px] text-[#777F79] font-medium mt-0.5 block">Per order average</span>
            </div>

            <div className="bg-white border border-[#E7EBE8] rounded-2xl p-3.5 shadow-sm">
              <span className="text-[10px] font-bold text-[#59615B] block uppercase tracking-wider">Pending Orders</span>
              <span className="text-xl font-extrabold text-[#F5BD3D] font-mono mt-1 block">{pendingOrders.length}</span>
              <span className="text-[10px] text-[#777F79] font-medium mt-0.5 block">In kitchen</span>
            </div>

            <div className="bg-white border border-[#E7EBE8] rounded-2xl p-3.5 shadow-sm">
              <span className="text-[10px] font-bold text-[#59615B] block uppercase tracking-wider">Completed</span>
              <span className="text-xl font-extrabold text-[#078F36] font-mono mt-1 block">{completedOrders.length}</span>
              <span className="text-[10px] text-[#777F79] font-medium mt-0.5 block">Fulfilled orders</span>
            </div>

            <div className="bg-white border border-[#E7EBE8] rounded-2xl p-3.5 shadow-sm">
              <span className="text-[10px] font-bold text-[#59615B] block uppercase tracking-wider">Cancelled</span>
              <span className="text-xl font-extrabold text-[#D94A43] font-mono mt-1 block">{cancelledOrders.length}</span>
              <span className="text-[10px] text-[#777F79] font-medium mt-0.5 block">Voided bills</span>
            </div>
          </div>

          {/* Sales Comparison & Payment Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Chart Card */}
            <div className="lg:col-span-2 bg-white border border-[#E7EBE8] rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7EBE8]">
                <div>
                  <h2 className="font-extrabold text-sm text-[#171B18]">Sales Overview</h2>
                  <span className="text-xs text-[#59615B] font-medium">Real transaction revenue</span>
                </div>

                <div className="flex items-center bg-[#F5F6F5] p-1 rounded-xl border border-[#E7EBE8] text-xs font-semibold">
                  <button
                    onClick={() => setChartView('daily')}
                    className={`px-3 py-1 rounded-lg transition-colors ${chartView === 'daily' ? 'bg-[#078F36] text-white font-bold' : 'text-[#777F79] hover:text-[#171B18]'}`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setChartView('weekly')}
                    className={`px-3 py-1 rounded-lg transition-colors ${chartView === 'weekly' ? 'bg-[#078F36] text-white font-bold' : 'text-[#777F79] hover:text-[#171B18]'}`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setChartView('monthly')}
                    className={`px-3 py-1 rounded-lg transition-colors ${chartView === 'monthly' ? 'bg-[#078F36] text-white font-bold' : 'text-[#777F79] hover:text-[#171B18]'}`}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-[#171B18] font-mono">
                    {currency}{chartView === 'daily' ? todaySales : chartView === 'weekly' ? weeklySales : monthlySales}
                  </span>
                  <span className="text-xs text-[#59615B] font-medium">settled revenue</span>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-[#171B18] mb-1 font-semibold">
                      <span>Dine-In Revenue:</span>
                      <span className="font-mono font-bold">
                        {currency}{orders.filter(o => o.orderType === 'dine_in' && o.orderStatus !== 'cancelled').reduce((acc, o) => acc + o.finalTotal, 0)}
                      </span>
                    </div>
                    <div className="w-full bg-[#F5F6F5] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#078F36] h-2.5 rounded-full"
                        style={{
                          width: totalBreakdown > 0 ? `${(orders.filter(o => o.orderType === 'dine_in' && o.orderStatus !== 'cancelled').reduce((acc, o) => acc + o.finalTotal, 0) / totalBreakdown) * 100}%` : '0%'
                        }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[#171B18] mb-1 font-semibold">
                      <span>Takeaway & Delivery:</span>
                      <span className="font-mono font-bold">
                        {currency}{orders.filter(o => (o.orderType === 'takeaway' || o.orderType === 'delivery') && o.orderStatus !== 'cancelled').reduce((acc, o) => acc + o.finalTotal, 0)}
                      </span>
                    </div>
                    <div className="w-full bg-[#F5F6F5] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#F5BD3D] h-2.5 rounded-full"
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
            <div className="bg-white border border-[#E7EBE8] rounded-2xl p-5 shadow-sm text-xs">
              <div className="pb-3 border-b border-[#E7EBE8]">
                <h2 className="font-extrabold text-sm text-[#171B18]">Payment Breakdown</h2>
                <span className="text-xs text-[#59615B] font-medium">Settled tender methods</span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-[#171B18]">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#078F36]"></span>
                    <span>UPI / QR</span>
                  </span>
                  <span className="font-mono font-bold">{currency}{paymentBreakdown.upi}</span>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold text-[#171B18]">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F5BD3D]"></span>
                    <span>Cash</span>
                  </span>
                  <span className="font-mono font-bold">{currency}{paymentBreakdown.cash}</span>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold text-[#171B18]">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    <span>Card</span>
                  </span>
                  <span className="font-mono font-bold">{currency}{paymentBreakdown.card}</span>
                </div>

                <div className="pt-3 border-t border-[#E7EBE8] flex justify-between font-extrabold text-[#171B18]">
                  <span>Total Settled:</span>
                  <span className="font-mono text-sm text-[#078F36]">{currency}{totalBreakdown}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Low Stock & Top Selling Products */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Low Stock Alerts */}
            <div className="bg-white border border-[#E7EBE8] rounded-2xl p-5 shadow-sm text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7EBE8]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F5BD3D]"></span>
                  <h2 className="font-extrabold text-sm text-[#171B18]">Low Stock Alerts</h2>
                </div>
                <button
                  onClick={() => onNavigate('inventory')}
                  className="text-[#078F36] font-bold hover:underline"
                >
                  Manage Inventory &rarr;
                </button>
              </div>

              <div className="mt-3 divide-y divide-[#E7EBE8]">
                {lowStockItems.length === 0 ? (
                  <p className="text-[#59615B] font-medium italic py-3 text-center">All stock levels are adequate.</p>
                ) : (
                  lowStockItems.map(item => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-[#171B18]">{item.name}</span>
                        <div className="text-[11px] text-[#59615B] font-medium">
                          Current: <span className="text-[#D94A43] font-bold font-mono">{item.currentStock} {item.unit}</span> (Min: {item.minimumStock} {item.unit})
                        </div>
                      </div>
                      <button
                        onClick={() => onNavigate('inventory')}
                        className="px-3 py-1 bg-[#FEF9EE] text-[#F5BD3D] border border-[#FDE68A] rounded-lg text-[11px] font-bold"
                      >
                        Add Stock
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Selling Products */}
            <div className="bg-white border border-[#E7EBE8] rounded-2xl p-5 shadow-sm text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7EBE8]">
                <h2 className="font-extrabold text-sm text-[#171B18]">Top Selling Products</h2>
                <button
                  onClick={() => onNavigate('reports')}
                  className="text-[#078F36] font-bold hover:underline"
                >
                  View Reports &rarr;
                </button>
              </div>

              <div className="mt-3 divide-y divide-[#E7EBE8]">
                {topSellingProducts.length === 0 ? (
                  <p className="text-[#59615B] font-medium italic py-3 text-center">No sales yet.</p>
                ) : (
                  topSellingProducts.map((p, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-center font-bold text-[#777F79] font-mono">#{idx + 1}</span>
                        <span className="font-bold text-[#171B18] text-xs">{p.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-[#171B18] font-mono">{p.qty} Sold</span>
                        <span className="text-[11px] text-[#59615B] font-semibold block">{currency}{p.sales}</span>
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
