import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { backend } from '../../db/backendService';
import { Order } from '../../types';

export const ReportsPage: React.FC = () => {
  const { currentRestaurant, currentUser } = useAuth();
  const { showToast } = useToast();
  const restId = currentRestaurant?.id || '';

  const caller = {
    restaurantId: restId,
    role: currentUser?.role || 'owner'
  };

  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'sales' | 'products' | 'tax' | 'cancelled'>('sales');
  const [timeframe, setTimeframe] = useState<'all' | 'today' | '7days' | '30days'>('all');

  const loadData = () => {
    if (!restId) return;
    try {
      setOrders(backend.getOrders(caller, restId));
    } catch (e: any) {
      console.error(e.message);
    }
  };

  useEffect(() => {
    loadData();
    return backend.subscribe(loadData);
  }, [restId]);

  // Date filtering
  const filteredOrders = orders.filter(o => {
    if (timeframe === 'all') return true;
    const orderDate = new Date(o.createdAt);
    const now = new Date();
    if (timeframe === 'today') {
      return orderDate.toDateString() === now.toDateString();
    } else if (timeframe === '7days') {
      return orderDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === '30days') {
      return orderDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    return true;
  });

  const validOrders = filteredOrders.filter(o => o.orderStatus !== 'cancelled');
  const cancelledOrders = filteredOrders.filter(o => o.orderStatus === 'cancelled');

  const totalGross = validOrders.reduce((sum, o) => sum + o.finalTotal, 0);
  const totalSubtotal = validOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const totalTax = validOrders.reduce((sum, o) => sum + o.taxAmount, 0);
  const totalDiscount = validOrders.reduce((sum, o) => sum + o.discountAmount, 0);

  // Product sales aggregation
  const productSalesMap: { [name: string]: { qty: number; revenue: number } } = {};
  validOrders.forEach(o => {
    o.items.forEach(i => {
      if (!productSalesMap[i.name]) productSalesMap[i.name] = { qty: 0, revenue: 0 };
      productSalesMap[i.name].qty += i.quantity;
      productSalesMap[i.name].revenue += i.totalPrice;
    });
  });

  const productReports = Object.entries(productSalesMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue);

  // CSV Export
  const handleExportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    if (activeTab === 'sales') {
      csv += 'Order Number,Invoice Number,Date,Type,Payment Method,Subtotal,Discount,Tax,Final Total\n';
      validOrders.forEach(o => {
        csv += `"${o.orderNumber}","${o.invoiceNumber}","${new Date(o.createdAt).toLocaleString()}","${o.orderType}","${o.paymentMethod || 'N/A'}",${o.subtotal},${o.discountAmount},${o.taxAmount},${o.finalTotal}\n`;
      });
    } else if (activeTab === 'products') {
      csv += 'Product Name,Quantity Sold,Gross Sales (INR)\n';
      productReports.forEach(p => {
        csv += `"${p.name}",${p.qty},${p.revenue}\n`;
      });
    } else if (activeTab === 'tax') {
      csv += 'Invoice Number,Date,Taxable Amount,GST Tax (INR),Total Bill\n';
      validOrders.forEach(o => {
        csv += `"${o.invoiceNumber}","${new Date(o.createdAt).toLocaleDateString()}",${o.subtotal - o.discountAmount},${o.taxAmount},${o.finalTotal}\n`;
      });
    } else if (activeTab === 'cancelled') {
      csv += 'Order Number,Invoice Number,Date,Total Amount,Cancellation Reason,Cashier\n';
      cancelledOrders.forEach(o => {
        csv += `"${o.orderNumber}","${o.invoiceNumber}","${new Date(o.createdAt).toLocaleString()}",${o.finalTotal},"${o.cancellationReason || 'N/A'}","${o.cashierName}"\n`;
      });
    }

    const encoded = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `report_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Report CSV exported successfully', 'success');
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 max-w-6xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-surfaceBorder gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-charcoal-900 tracking-tight">Sales & Tax Reports</h1>
          <p className="text-xs text-charcoal-500 mt-0.5">Audited financial sales, GST ledger, product volumes and voided bills</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="bg-white border border-surfaceBorder rounded px-2.5 py-1.5 text-xs font-semibold text-charcoal-900"
          >
            <option value="all">All Historical Records</option>
            <option value="today">Today's Transactions</option>
            <option value="7days">Trailing 7 Days</option>
            <option value="30days">Trailing 30 Days</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="bg-forest-800 hover:bg-forest-900 text-white px-3.5 py-1.5 rounded text-xs font-semibold shadow-xs"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 mt-4 border-b border-surfaceBorder pb-2 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-3 py-1.5 rounded font-bold transition-colors ${
            activeTab === 'sales' ? 'bg-forest-800 text-white' : 'bg-surface text-charcoal-700 hover:bg-white'
          }`}
        >
          Sales Summary
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-3 py-1.5 rounded font-bold transition-colors ${
            activeTab === 'products' ? 'bg-forest-800 text-white' : 'bg-surface text-charcoal-700 hover:bg-white'
          }`}
        >
          Product Breakdown
        </button>
        <button
          onClick={() => setActiveTab('tax')}
          className={`px-3 py-1.5 rounded font-bold transition-colors ${
            activeTab === 'tax' ? 'bg-forest-800 text-white' : 'bg-surface text-charcoal-700 hover:bg-white'
          }`}
        >
          GST Tax Report
        </button>
        <button
          onClick={() => setActiveTab('cancelled')}
          className={`px-3 py-1.5 rounded font-bold transition-colors ${
            activeTab === 'cancelled' ? 'bg-forest-800 text-white' : 'bg-surface text-charcoal-700 hover:bg-white'
          }`}
        >
          Cancelled Bills ({cancelledOrders.length})
        </button>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
        <div className="bg-white border border-surfaceBorder rounded p-3 shadow-xs">
          <span className="text-[11px] text-charcoal-500 uppercase font-semibold">Gross Sales</span>
          <span className="text-lg font-bold text-forest-900 font-mono block mt-1">₹{totalGross}</span>
        </div>
        <div className="bg-white border border-surfaceBorder rounded p-3 shadow-xs">
          <span className="text-[11px] text-charcoal-500 uppercase font-semibold">Subtotal</span>
          <span className="text-lg font-bold text-charcoal-900 font-mono block mt-1">₹{totalSubtotal.toFixed(0)}</span>
        </div>
        <div className="bg-white border border-surfaceBorder rounded p-3 shadow-xs">
          <span className="text-[11px] text-charcoal-500 uppercase font-semibold">GST Tax</span>
          <span className="text-lg font-bold text-charcoal-900 font-mono block mt-1">₹{totalTax.toFixed(2)}</span>
        </div>
        <div className="bg-white border border-surfaceBorder rounded p-3 shadow-xs">
          <span className="text-[11px] text-charcoal-500 uppercase font-semibold">Bills Settled</span>
          <span className="text-lg font-bold text-charcoal-900 font-mono block mt-1">{validOrders.length}</span>
        </div>
      </div>

      {/* Report Tables */}
      <div className="bg-white border border-surfaceBorder rounded shadow-xs mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'sales' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface border-b border-surfaceBorder text-charcoal-700 font-semibold select-none">
                  <th className="py-2.5 px-3">Order / Inv #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Subtotal</th>
                  <th className="py-2.5 px-3 text-right">Tax</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surfaceBorder">
                {validOrders.map(o => (
                  <tr key={o.id} className="hover:bg-neutralBg/70">
                    <td className="py-2.5 px-3 font-mono font-bold text-charcoal-900">
                      {o.orderNumber}
                      <span className="text-[10px] text-charcoal-500 block font-normal">{o.invoiceNumber}</span>
                    </td>
                    <td className="py-2.5 px-3 text-charcoal-600 font-mono">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="py-2.5 px-3 capitalize font-semibold">{o.orderType.replace('_', ' ')}</td>
                    <td className="py-2.5 px-3 text-right font-mono">₹{o.subtotal}</td>
                    <td className="py-2.5 px-3 text-right font-mono">₹{o.taxAmount.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-forest-900">₹{o.finalTotal}</td>
                    <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-charcoal-700">{o.paymentMethod || 'CASH'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'products' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface border-b border-surfaceBorder text-charcoal-700 font-semibold select-none">
                  <th className="py-2.5 px-3">Menu Product</th>
                  <th className="py-2.5 px-3 text-right">Units Sold</th>
                  <th className="py-2.5 px-3 text-right">Gross Sales</th>
                  <th className="py-2.5 px-3 text-right">Share %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surfaceBorder">
                {productReports.map((p, idx) => {
                  const share = totalGross > 0 ? ((p.revenue / totalGross) * 100).toFixed(1) : '0';
                  return (
                    <tr key={idx} className="hover:bg-neutralBg/70">
                      <td className="py-2.5 px-3 font-semibold text-charcoal-900">{p.name}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">{p.qty}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-forest-900">₹{p.revenue}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-charcoal-600">{share}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeTab === 'tax' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface border-b border-surfaceBorder text-charcoal-700 font-semibold select-none">
                  <th className="py-2.5 px-3">Invoice Number</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Taxable Amount</th>
                  <th className="py-2.5 px-3 text-right">GST Rate</th>
                  <th className="py-2.5 px-3 text-right">GST Collected</th>
                  <th className="py-2.5 px-3 text-right">Total Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surfaceBorder">
                {validOrders.map(o => (
                  <tr key={o.id} className="hover:bg-neutralBg/70">
                    <td className="py-2.5 px-3 font-mono font-bold text-charcoal-900">{o.invoiceNumber}</td>
                    <td className="py-2.5 px-3 text-charcoal-600 font-mono">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono">₹{(o.subtotal - o.discountAmount).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{o.taxRatePercent}%</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-charcoal-900">₹{o.taxAmount.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-forest-900">₹{o.finalTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'cancelled' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface border-b border-surfaceBorder text-charcoal-700 font-semibold select-none">
                  <th className="py-2.5 px-3">Order / Inv #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Voided Amount</th>
                  <th className="py-2.5 px-3">Reason for Void / Cancellation</th>
                  <th className="py-2.5 px-3">Cashier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surfaceBorder">
                {cancelledOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-charcoal-500 italic">
                      Zero bills cancelled. Excellent cashier billing integrity!
                    </td>
                  </tr>
                ) : (
                  cancelledOrders.map(o => (
                    <tr key={o.id} className="hover:bg-neutralBg/70">
                      <td className="py-2.5 px-3 font-mono font-bold text-charcoal-900">{o.orderNumber} ({o.invoiceNumber})</td>
                      <td className="py-2.5 px-3 text-charcoal-600 font-mono">{new Date(o.createdAt).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-earthRed">₹{o.finalTotal}</td>
                      <td className="py-2.5 px-3 text-earthRed font-medium">{o.cancellationReason || 'Unspecified'}</td>
                      <td className="py-2.5 px-3 text-charcoal-700">{o.cashierName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
