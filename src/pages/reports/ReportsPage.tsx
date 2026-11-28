import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { backend } from '../../db/backendService';
import { Order } from '../../types';

export const ReportsPage: React.FC = () => {
  const { currentRestaurant, currentUser } = useAuth();
  const { showToast } = useToast();
  const restId = currentRestaurant?.id || '';
  const currency = currentRestaurant?.currencySymbol || '₹';

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

  const validOrders = filteredOrders.filter(o => o.orderStatus !== 'cancelled' && o.paymentStatus === 'paid');
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
    <div className="flex-1 flex flex-col p-4 md:p-6 max-w-6xl mx-auto w-full bg-[#F5F6F5] text-[#171B18]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#E7EBE8] gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#171B18] tracking-tight">Sales & Tax Reports</h1>
          <p className="text-xs text-[#59615B] font-medium mt-0.5">Audited financial sales, GST ledger, product volumes and voided bills</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="bg-white border border-[#E7EBE8] rounded-xl px-3 py-2 text-xs font-bold text-[#171B18] shadow-2xs focus:outline-none"
          >
            <option value="all">All Historical Records</option>
            <option value="today">Today's Transactions</option>
            <option value="7days">Trailing 7 Days</option>
            <option value="30days">Trailing 30 Days</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="bg-[#078F36] hover:bg-[#087A32] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-[#078F36]/20 transition-all"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mt-4 pb-1 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${activeTab === 'sales'
            ? 'bg-[#078F36] text-white shadow-2xs'
            : 'bg-white border border-[#E7EBE8] text-[#171B18] hover:bg-gray-50'
            }`}
        >
          Sales Summary
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${activeTab === 'products'
            ? 'bg-[#078F36] text-white shadow-2xs'
            : 'bg-white border border-[#E7EBE8] text-[#171B18] hover:bg-gray-50'
            }`}
        >
          Product Breakdown
        </button>
        <button
          onClick={() => setActiveTab('tax')}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${activeTab === 'tax'
            ? 'bg-[#078F36] text-white shadow-2xs'
            : 'bg-white border border-[#E7EBE8] text-[#171B18] hover:bg-gray-50'
            }`}
        >
          GST Tax Report
        </button>
        <button
          onClick={() => setActiveTab('cancelled')}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${activeTab === 'cancelled'
            ? 'bg-[#078F36] text-white shadow-2xs'
            : 'bg-white border border-[#E7EBE8] text-[#171B18] hover:bg-gray-50'
            }`}
        >
          Cancelled Bills ({cancelledOrders.length})
        </button>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-4 text-xs">
        <div className="bg-white border border-[#E7EBE8] rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] text-[#59615B] uppercase font-extrabold tracking-wider">Gross Sales</span>
          <span className="text-xl font-extrabold text-[#078F36] font-mono block mt-1">{currency}{totalGross}</span>
        </div>
        <div className="bg-white border border-[#E7EBE8] rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] text-[#59615B] uppercase font-extrabold tracking-wider">Subtotal</span>
          <span className="text-xl font-extrabold text-[#171B18] font-mono block mt-1">{currency}{totalSubtotal.toFixed(0)}</span>
        </div>
        <div className="bg-white border border-[#E7EBE8] rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] text-[#59615B] uppercase font-extrabold tracking-wider">GST Tax</span>
          <span className="text-xl font-extrabold text-[#171B18] font-mono block mt-1">{currency}{totalTax.toFixed(2)}</span>
        </div>
        <div className="bg-white border border-[#E7EBE8] rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] text-[#59615B] uppercase font-extrabold tracking-wider">Bills Settled</span>
          <span className="text-xl font-extrabold text-[#171B18] font-mono block mt-1">{validOrders.length}</span>
        </div>
      </div>

      {/* Report Tables */}
      <div className="bg-white border border-[#E7EBE8] rounded-2xl shadow-sm mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'sales' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F5F6F5] border-b border-[#E7EBE8] text-[#171B18] font-extrabold select-none">
                  <th className="py-3 px-3.5">Order / Inv #</th>
                  <th className="py-3 px-3.5">Date</th>
                  <th className="py-3 px-3.5">Type</th>
                  <th className="py-3 px-3.5 text-right">Subtotal</th>
                  <th className="py-3 px-3.5 text-right">Tax</th>
                  <th className="py-3 px-3.5 text-right">Total</th>
                  <th className="py-3 px-3.5">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7EBE8]">
                {validOrders.map(o => (
                  <tr key={o.id} className="hover:bg-[#F0F8F3]/60 transition-colors">
                    <td className="py-3 px-3.5 font-mono font-bold text-[#171B18]">
                      {o.orderNumber}
                      <span className="text-[10px] text-[#59615B] block font-normal">{o.invoiceNumber}</span>
                    </td>
                    <td className="py-3 px-3.5 text-[#171B18] font-bold font-mono">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-3.5 capitalize font-bold text-[#171B18]">{o.orderType.replace('_', ' ')}</td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-[#171B18]">{currency}{o.subtotal}</td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-[#171B18]">{currency}{o.taxAmount.toFixed(2)}</td>
                    <td className="py-3 px-3.5 text-right font-mono font-extrabold text-[#078F36]">{currency}{o.finalTotal}</td>
                    <td className="py-3 px-3.5 uppercase text-[10px] font-extrabold text-[#171B18]">{o.paymentMethod || 'CASH'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'products' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F5F6F5] border-b border-[#E7EBE8] text-[#171B18] font-extrabold select-none">
                  <th className="py-3 px-3.5">Menu Product</th>
                  <th className="py-3 px-3.5 text-right">Units Sold</th>
                  <th className="py-3 px-3.5 text-right">Gross Sales</th>
                  <th className="py-3 px-3.5 text-right">Share %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7EBE8]">
                {productReports.map((p, idx) => {
                  const share = totalGross > 0 ? ((p.revenue / totalGross) * 100).toFixed(1) : '0';
                  return (
                    <tr key={idx} className="hover:bg-[#F0F8F3]/60 transition-colors">
                      <td className="py-3 px-3.5 font-bold text-[#171B18]">{p.name}</td>
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-[#171B18]">{p.qty}</td>
                      <td className="py-3 px-3.5 text-right font-mono font-extrabold text-[#078F36]">{currency}{p.revenue}</td>
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-[#59615B]">{share}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeTab === 'tax' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F5F6F5] border-b border-[#E7EBE8] text-[#171B18] font-extrabold select-none">
                  <th className="py-3 px-3.5">Invoice #</th>
                  <th className="py-3 px-3.5">Date</th>
                  <th className="py-3 px-3.5 text-right">Taxable Value</th>
                  <th className="py-3 px-3.5 text-right">GST Rate</th>
                  <th className="py-3 px-3.5 text-right">GST Output Tax</th>
                  <th className="py-3 px-3.5 text-right">Invoice Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7EBE8]">
                {validOrders.map(o => (
                  <tr key={o.id} className="hover:bg-[#F0F8F3]/60 transition-colors">
                    <td className="py-3 px-3.5 font-mono font-bold text-[#171B18]">{o.invoiceNumber || o.orderNumber}</td>
                    <td className="py-3 px-3.5 text-[#171B18] font-mono font-bold">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-[#171B18]">{currency}{(o.subtotal - o.discountAmount).toFixed(2)}</td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-[#59615B]">{o.taxRatePercent}%</td>
                    <td className="py-3 px-3.5 text-right font-mono font-extrabold text-[#171B18]">{currency}{o.taxAmount.toFixed(2)}</td>
                    <td className="py-3 px-3.5 text-right font-mono font-extrabold text-[#078F36]">{currency}{o.finalTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'cancelled' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F5F6F5] border-b border-[#E7EBE8] text-[#171B18] font-extrabold select-none">
                  <th className="py-3 px-3.5">Order / Inv #</th>
                  <th className="py-3 px-3.5">Date & Time</th>
                  <th className="py-3 px-3.5 text-right">Voided Amount</th>
                  <th className="py-3 px-3.5">Audit Reason</th>
                  <th className="py-3 px-3.5">Staff Cashier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7EBE8]">
                {cancelledOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#59615B] font-medium">
                      No voided or cancelled orders on file.
                    </td>
                  </tr>
                ) : (
                  cancelledOrders.map(o => (
                    <tr key={o.id} className="hover:bg-red-50/50 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-[#D94A43]">
                        {o.orderNumber}
                        <span className="text-[10px] text-[#59615B] block font-normal">{o.invoiceNumber}</span>
                      </td>
                      <td className="py-3 px-3.5 text-[#171B18] font-bold">{new Date(o.createdAt).toLocaleString()}</td>
                      <td className="py-3 px-3.5 text-right font-mono font-extrabold text-[#D94A43]">{currency}{o.finalTotal}</td>
                      <td className="py-3 px-3.5 text-[#171B18] font-medium italic">{o.cancellationReason || 'No reason provided'}</td>
                      <td className="py-3 px-3.5 font-bold text-[#171B18]">{o.cashierName || 'Staff'}</td>
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
