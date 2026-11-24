import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { backend } from '../../db/backendService';
import { Order, OrderStatus } from '../../types';
import { SearchIcon, PrintIcon, CloseIcon } from '../../components/common/Icons';
import { PrintInvoiceModal } from '../../components/printing/PrintInvoiceModal';

export const OrdersPage: React.FC = () => {
  const { currentRestaurant, currentUser } = useAuth();
  const { showToast } = useToast();
  const restId = currentRestaurant?.id || '';
  const currency = currentRestaurant?.currencySymbol || '₹';

  const caller = {
    restaurantId: restId,
    role: currentUser?.role || 'cashier',
    name: currentUser?.name || 'Staff'
  };

  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);

  // Cancellation modal
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

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

  const filteredOrders = orders.filter(o => {
    const matchQuery = o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       o.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (o.customerName && o.customerName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchStatus = statusFilter === 'all' || o.orderStatus === statusFilter;
    const matchType = typeFilter === 'all' || o.orderType === typeFilter;
    return matchQuery && matchStatus && matchType;
  });

  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingOrder || !cancellationReason.trim()) return;

    try {
      backend.cancelOrder(caller, restId, cancellingOrder.id, cancellationReason.trim());
      showToast(`Order #${cancellingOrder.orderNumber} cancelled with audit trail recorded.`, 'info');
      setCancellingOrder(null);
      setCancellationReason('');
      if (viewingOrder?.id === cancellingOrder.id) setViewingOrder(null);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 max-w-6xl mx-auto w-full bg-[#F5F6F5] text-[#171B18]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#E7EBE8] gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#171B18] tracking-tight">Order Management</h1>
          <p className="text-xs text-[#59615B] font-medium mt-0.5">Order audit feed, bill reprints, cancellation tracking and kitchen coordination</p>
        </div>

        <span className="text-xs text-[#171B18] font-bold bg-white px-3.5 py-1.5 rounded-xl border border-[#E7EBE8] shadow-2xs self-start">
          Total Orders: {orders.length}
        </span>
      </div>

      {/* Filter Strip */}
      <div className="bg-white p-3.5 rounded-2xl border border-[#E7EBE8] shadow-sm mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[220px]">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#777F79]">
            <SearchIcon className="w-4 h-4 text-[#777F79]" />
          </span>
          <input
            type="text"
            placeholder="Search by Order #, Invoice #, or Guest..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#F5F6F5] border border-[#E7EBE8] rounded-xl text-xs font-semibold text-[#171B18] placeholder-[#777F79] focus:outline-none focus:border-[#078F36]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#F5F6F5] border border-[#E7EBE8] rounded-xl px-3 py-2 text-xs font-bold text-[#171B18] focus:outline-none focus:border-[#078F36]"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#F5F6F5] border border-[#E7EBE8] rounded-xl px-3 py-2 text-xs font-bold text-[#171B18] focus:outline-none focus:border-[#078F36]"
          >
            <option value="all">All Types</option>
            <option value="dine_in">Dine-in</option>
            <option value="takeaway">Takeaway</option>
            <option value="delivery">Delivery</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E7EBE8] rounded-2xl shadow-sm mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F5F6F5] border-b border-[#E7EBE8] text-[#171B18] font-extrabold select-none">
                <th className="py-3 px-3.5">Order / Inv #</th>
                <th className="py-3 px-3.5">Time</th>
                <th className="py-3 px-3.5">Type & Table</th>
                <th className="py-3 px-3.5">Customer</th>
                <th className="py-3 px-3.5 text-right">Total</th>
                <th className="py-3 px-3.5 text-center">Payment</th>
                <th className="py-3 px-3.5 text-center">Order Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EBE8]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#59615B] font-medium">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  let statusBadge = 'bg-[#F5F6F5] text-[#171B18] border-[#E7EBE8]';
                  if (order.orderStatus === 'new') statusBadge = 'bg-blue-50 text-blue-700 border-blue-200';
                  if (order.orderStatus === 'preparing') statusBadge = 'bg-amber-50 text-[#F5BD3D] border-amber-200';
                  if (order.orderStatus === 'ready') statusBadge = 'bg-purple-50 text-purple-700 border-purple-200';
                  if (order.orderStatus === 'completed') statusBadge = 'bg-[#F0F8F3] text-[#078F36] border-[#D8EFDF]';
                  if (order.orderStatus === 'cancelled') statusBadge = 'bg-red-50 text-[#D94A43] border-red-200';

                  return (
                    <tr key={order.id} className="hover:bg-[#F0F8F3]/60 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-[#171B18]">
                        {order.orderNumber}
                        <div className="text-[10px] text-[#59615B] font-normal">{order.invoiceNumber}</div>
                      </td>
                      <td className="py-3 px-3.5 text-[#171B18] font-mono whitespace-nowrap">
                        <span className="font-bold">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <div className="text-[10px] text-[#59615B] font-normal">{new Date(order.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-bold capitalize text-[#171B18]">{order.orderType.replace('_', ' ')}</span>
                        {order.tableNumber && (
                          <div className="text-[11px] text-[#59615B] font-semibold">Table {order.tableNumber}</div>
                        )}
                      </td>
                      <td className="py-3 px-3.5 font-bold text-[#171B18]">
                        {order.customerName || 'Walk-in'}
                      </td>
                      <td className="py-3 px-3.5 text-right font-extrabold text-[#171B18] font-mono">
                        {currency}{order.finalTotal}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[#F0F8F3] text-[#078F36] border border-[#D8EFDF]">
                          {order.paymentStatus || 'PAID'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${statusBadge}`}>
                          {order.orderStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingOrder(order)}
                            className="px-2.5 py-1 bg-[#F5F6F5] hover:bg-gray-200 text-[#171B18] rounded-lg font-bold text-[11px] border border-[#E7EBE8]"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => setPrintingOrder(order)}
                            className="p-1 text-[#777F79] hover:text-[#078F36]"
                            title="Print Invoice"
                          >
                            <PrintIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Drawer Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl border border-[#E7EBE8] shadow-2xl w-full max-w-lg text-[#171B18] p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-[#E7EBE8]">
              <div>
                <h3 className="font-extrabold text-base text-[#171B18]">Order #{viewingOrder.orderNumber}</h3>
                <span className="text-xs text-[#59615B] font-mono">{viewingOrder.invoiceNumber}</span>
              </div>
              <button onClick={() => setViewingOrder(null)} className="text-[#777F79] hover:text-[#171B18]">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-[#F5F6F5] p-3 rounded-xl border border-[#E7EBE8]">
                <div>
                  <span className="text-[#59615B] block font-bold text-[10px] uppercase">Order Type</span>
                  <span className="font-bold capitalize text-[#171B18]">{viewingOrder.orderType.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-[#59615B] block font-bold text-[10px] uppercase">Table</span>
                  <span className="font-bold text-[#171B18]">{viewingOrder.tableNumber ? `Table ${viewingOrder.tableNumber}` : 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[#59615B] block font-bold text-[10px] uppercase">Guest</span>
                  <span className="font-bold text-[#171B18]">{viewingOrder.customerName || 'Walk-in'}</span>
                </div>
                <div>
                  <span className="text-[#59615B] block font-bold text-[10px] uppercase">Payment</span>
                  <span className="font-bold uppercase text-[#078F36]">{viewingOrder.paymentMethod} &bull; {viewingOrder.paymentStatus}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-xs text-[#171B18] mb-2 uppercase tracking-wider">Ordered Items</h4>
                <div className="divide-y divide-[#E7EBE8] border border-[#E7EBE8] rounded-xl overflow-hidden">
                  {viewingOrder.items.map((i, idx) => (
                    <div key={idx} className="p-2.5 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-[#171B18]">{i.quantity}x {i.name}</span>
                        {i.selectedVariant && (
                          <span className="text-[10px] text-[#078F36] block">&bull; {i.selectedVariant.name}</span>
                        )}
                        {i.selectedAddOns?.map((a, aIdx) => (
                          <span key={aIdx} className="text-[10px] text-[#59615B] block">+ {a.name}</span>
                        ))}
                      </div>
                      <span className="font-extrabold text-[#171B18] font-mono">{currency}{i.totalPrice}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#F5F6F5] p-3 rounded-xl border border-[#E7EBE8] space-y-1 font-semibold text-[#171B18]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono">{currency}{viewingOrder.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({viewingOrder.taxRatePercent}%):</span>
                  <span className="font-mono">{currency}{viewingOrder.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm pt-2 border-t border-[#E7EBE8]">
                  <span>Grand Total:</span>
                  <span className="font-mono text-[#078F36]">{currency}{viewingOrder.finalTotal}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E7EBE8] flex justify-between items-center">
              {viewingOrder.orderStatus !== 'cancelled' && (
                <button
                  onClick={() => setCancellingOrder(viewingOrder)}
                  className="px-4 py-2 border border-red-200 bg-red-50 text-[#D94A43] rounded-xl text-xs font-bold hover:bg-red-100"
                >
                  Void / Cancel Bill
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => {
                    setPrintingOrder(viewingOrder);
                    setViewingOrder(null);
                  }}
                  className="px-4 py-2 bg-[#078F36] hover:bg-[#087A32] text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <PrintIcon className="w-3.5 h-3.5" />
                  <span>Print Bill</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl border border-[#E7EBE8] shadow-2xl w-full max-w-sm text-[#171B18] p-5">
            <h3 className="font-extrabold text-sm text-[#D94A43] mb-2">Void Order #{cancellingOrder.orderNumber}</h3>
            <p className="text-xs text-[#59615B] mb-3">Please specify an audit reason for voiding this bill.</p>
            <form onSubmit={handleConfirmCancel} className="space-y-3 text-xs">
              <textarea
                required
                rows={3}
                placeholder="Reason e.g. Customer changed mind, wrong items keyed..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full p-2.5 border border-[#E7EBE8] rounded-xl text-xs text-[#171B18] focus:outline-none focus:border-[#D94A43]"
              />
              <div className="flex justify-end gap-2 pt-2 border-t border-[#E7EBE8]">
                <button
                  type="button"
                  onClick={() => setCancellingOrder(null)}
                  className="px-3.5 py-1.5 border border-[#E7EBE8] rounded-xl text-xs font-semibold text-[#59615B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#D94A43] hover:bg-red-700 text-white rounded-xl text-xs font-bold"
                >
                  Confirm Void
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Invoice Modal */}
      {printingOrder && currentRestaurant && (
        <PrintInvoiceModal
          order={printingOrder}
          restaurant={currentRestaurant}
          onClose={() => setPrintingOrder(null)}
        />
      )}
    </div>
  );
};
