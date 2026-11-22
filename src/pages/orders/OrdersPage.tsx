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
    <div className="flex-1 flex flex-col p-4 md:p-6 max-w-6xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-surfaceBorder gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-charcoal-900 tracking-tight">Order Management</h1>
          <p className="text-xs text-charcoal-500 mt-0.5">Order audit feed, bill reprints, cancellation tracking and kitchen coordination</p>
        </div>

        <span className="text-xs text-charcoal-700 font-semibold bg-surface px-3 py-1.5 rounded border border-surfaceBorder self-start">
          Total Orders: {orders.length}
        </span>
      </div>

      {/* Filter Strip */}
      <div className="bg-white p-3 rounded border border-surfaceBorder shadow-xs mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[220px]">
          <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-charcoal-500">
            <SearchIcon className="w-3.5 h-3.5" />
          </span>
          <input
            type="text"
            placeholder="Search by Order #, Invoice #, or Guest..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-neutralBg border border-surfaceBorder rounded focus:border-forest-800 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-neutralBg border border-surfaceBorder rounded px-2.5 py-1.5 focus:outline-none"
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
            className="bg-neutralBg border border-surfaceBorder rounded px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="dine_in">Dine-in</option>
            <option value="takeaway">Takeaway</option>
            <option value="delivery">Delivery</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-surfaceBorder rounded shadow-xs mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface border-b border-surfaceBorder text-charcoal-700 font-semibold select-none">
                <th className="py-2.5 px-3">Order / Inv #</th>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Type & Table</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3 text-right">Total</th>
                <th className="py-2.5 px-3 text-center">Payment</th>
                <th className="py-2.5 px-3 text-center">Order Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surfaceBorder">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-charcoal-500">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  let statusBadge = 'bg-surface text-charcoal-700';
                  if (order.orderStatus === 'new') statusBadge = 'bg-blue-50 text-blue-800 border border-blue-200';
                  if (order.orderStatus === 'preparing') statusBadge = 'bg-earthAmber-light text-earthAmber border border-earthAmber-border';
                  if (order.orderStatus === 'ready') statusBadge = 'bg-purple-50 text-purple-800 border border-purple-200';
                  if (order.orderStatus === 'completed') statusBadge = 'bg-forest-100 text-forest-700 border border-forest-600/30';
                  if (order.orderStatus === 'cancelled') statusBadge = 'bg-earthRed-light text-earthRed border border-earthRed-border';

                  return (
                    <tr key={order.id} className="hover:bg-neutralBg/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-charcoal-900">
                        {order.orderNumber}
                        <div className="text-[10px] text-charcoal-500 font-normal">{order.invoiceNumber}</div>
                      </td>
                      <td className="py-2.5 px-3 text-charcoal-600 font-mono whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <div className="text-[10px] text-charcoal-400">{new Date(order.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-semibold capitalize text-charcoal-800">{order.orderType.replace('_', ' ')}</span>
                        {order.tableNumber && (
                          <div className="text-[11px] text-charcoal-500 font-medium">Table: {order.tableNumber}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-charcoal-900">{order.customerName || 'Walk-in'}</div>
                        {order.customerPhone && <div className="text-[10px] text-charcoal-500 font-mono">{order.customerPhone}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-forest-900 font-mono whitespace-nowrap">
                        ₹{order.finalTotal}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          order.paymentStatus === 'paid' ? 'bg-forest-100 text-forest-700 border border-forest-600/30' :
                          order.paymentStatus === 'cancelled' ? 'bg-earthRed-light text-earthRed border border-earthRed-border' :
                          'bg-earthAmber-light text-earthAmber border border-earthAmber-border'
                        }`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusBadge}`}>
                          {order.orderStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingOrder(order)}
                            className="px-2 py-1 bg-surface hover:bg-surfaceBorder text-charcoal-900 rounded font-medium"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => setPrintingOrder(order)}
                            className="p-1 bg-surface hover:bg-surfaceBorder text-forest-800 rounded"
                            title="Reprint Receipt"
                          >
                            <PrintIcon className="w-3.5 h-3.5" />
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

      {/* Order Details Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded border border-surfaceBorder shadow-xl w-full max-w-lg text-charcoal-900 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-surfaceBorder">
              <h3 className="font-bold text-xs text-forest-900">
                Order #{viewingOrder.orderNumber} ({viewingOrder.invoiceNumber})
              </h3>
              <button onClick={() => setViewingOrder(null)} className="text-charcoal-500 hover:text-charcoal-900">
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 bg-neutralBg p-2.5 rounded border border-surfaceBorder">
                <div>
                  <span className="text-charcoal-500 block">Order Type:</span>
                  <span className="font-bold capitalize">{viewingOrder.orderType.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-charcoal-500 block">Table:</span>
                  <span className="font-bold">{viewingOrder.tableNumber || 'N/A (Takeaway)'}</span>
                </div>
                <div>
                  <span className="text-charcoal-500 block">Guest Name:</span>
                  <span className="font-bold">{viewingOrder.customerName || 'Walk-in'}</span>
                </div>
                <div>
                  <span className="text-charcoal-500 block">Cashier:</span>
                  <span className="font-bold">{viewingOrder.cashierName}</span>
                </div>
              </div>

              {viewingOrder.cancellationReason && (
                <div className="p-2.5 bg-earthRed-light border border-earthRed-border text-earthRed rounded">
                  <span className="font-bold block">Order Cancellation Reason:</span>
                  <span>{viewingOrder.cancellationReason}</span>
                </div>
              )}

              {/* Items List */}
              <div className="border border-surfaceBorder rounded overflow-hidden">
                <div className="bg-surface font-bold px-3 py-1.5 border-b border-surfaceBorder">Food Items</div>
                <div className="divide-y divide-surfaceBorder p-2 space-y-1">
                  {viewingOrder.items.map((item, idx) => (
                    <div key={idx} className="pt-1 flex justify-between">
                      <div>
                        <span className="font-semibold">{item.quantity}x {item.name}</span>
                        {item.selectedVariant && (
                          <div className="text-[10px] text-charcoal-500 pl-2">&bull; {item.selectedVariant.name}</div>
                        )}
                        {item.selectedAddOns?.map((a, aIdx) => (
                          <div key={aIdx} className="text-[10px] text-charcoal-500 pl-2">+ {a.name}</div>
                        ))}
                      </div>
                      <span className="font-mono font-bold">₹{item.totalPrice}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-1 pt-2 border-t border-surfaceBorder">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{viewingOrder.subtotal.toFixed(2)}</span>
                </div>
                {viewingOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-forest-700">
                    <span>Discount:</span>
                    <span className="font-mono">-₹{viewingOrder.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>GST ({viewingOrder.taxRatePercent}%):</span>
                  <span className="font-mono">₹{viewingOrder.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-forest-900 pt-1 border-t border-surfaceBorder">
                  <span>Final Total:</span>
                  <span className="font-mono">₹{viewingOrder.finalTotal}</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-surface border-t border-surfaceBorder flex items-center justify-between text-xs">
              <div>
                {viewingOrder.orderStatus !== 'cancelled' && (
                  <button
                    onClick={() => {
                      setCancellingOrder(viewingOrder);
                    }}
                    className="px-3 py-1.5 bg-earthRed-light text-earthRed border border-earthRed-border rounded font-bold hover:bg-earthRed hover:text-white transition-colors"
                  >
                    Cancel Bill
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPrintingOrder(viewingOrder);
                    setViewingOrder(null);
                  }}
                  className="px-3 py-1.5 bg-forest-800 hover:bg-forest-900 text-white rounded font-bold flex items-center gap-1 shadow-xs"
                >
                  <PrintIcon className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setViewingOrder(null)}
                  className="px-3 py-1.5 border border-surfaceBorder rounded bg-white font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Reason Modal */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded border border-surfaceBorder shadow-xl w-full max-w-sm text-charcoal-900 p-4">
            <h3 className="font-bold text-xs text-earthRed mb-2">
              Cancel Order #{cancellingOrder.orderNumber}
            </h3>
            <p className="text-[11px] text-charcoal-600 mb-3">
              Cancelled bills are permanently audited and cannot be deleted. Please state reason:
            </p>
            <form onSubmit={handleConfirmCancel} className="space-y-3 text-xs">
              <textarea
                required
                rows={3}
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="e.g. Guest left before food prep / Duplicate bill entry"
                className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none"
              />
              <div className="flex justify-end gap-2 pt-1 border-t border-surfaceBorder">
                <button
                  type="button"
                  onClick={() => setCancellingOrder(null)}
                  className="px-3 py-1.5 border border-surfaceBorder rounded"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-earthRed hover:bg-red-700 text-white rounded font-bold"
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printing Modal */}
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
