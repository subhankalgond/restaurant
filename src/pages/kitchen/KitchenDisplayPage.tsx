import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { backend } from '../../db/backendService';
import { Order, OrderStatus } from '../../types';
import { CheckIcon } from '../../components/common/Icons';

export const KitchenDisplayPage: React.FC = () => {
  const { currentRestaurant, currentUser } = useAuth();
  const { showToast } = useToast();
  const restId = currentRestaurant?.id || '';

  const caller = {
    restaurantId: restId,
    role: currentUser?.role || 'kitchen'
  };

  const [orders, setOrders] = useState<Order[]>([]);

  const loadData = () => {
    if (!restId) return;
    try {
      // Don't show cancelled orders in kitchen
      setOrders(backend.getOrders(caller, restId).filter(o => o.orderStatus !== 'cancelled'));
    } catch (e: any) {
      console.error(e.message);
    }
  };

  useEffect(() => {
    loadData();
    return backend.subscribe(loadData);
  }, [restId]);

  const handleUpdateStatus = (order: Order, nextStatus: OrderStatus) => {
    backend.updateOrderStatus(caller, restId, order.id, nextStatus);
    showToast(`Order #${order.orderNumber} updated to ${nextStatus.toUpperCase()}`, 'success');
  };

  const getTimeElapsed = (createdAt: string) => {
    const elapsedMinutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60));
    if (elapsedMinutes < 1) return 'Just now';
    return `${elapsedMinutes}m ago`;
  };

  const columns: { id: OrderStatus; label: string; countBadge: string }[] = [
    { id: 'new', label: 'Incoming Orders', countBadge: 'bg-blue-600' },
    { id: 'preparing', label: 'In Preparation', countBadge: 'bg-earthAmber' },
    { id: 'ready', label: 'Ready for Service', countBadge: 'bg-purple-700' },
    { id: 'completed', label: 'Completed', countBadge: 'bg-forest-700' }
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#161B18] text-[#EDEFEA] h-full overflow-hidden select-none">
      {/* KDS Top Bar */}
      <div className="h-12 bg-[#202722] border-b border-[#313B34] px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-forest-600 animate-pulse"></span>
          <span className="font-bold text-sm tracking-wide text-white">Kitchen Display System (KDS)</span>
          <span className="text-xs text-charcoal-300">&bull; {currentRestaurant?.name}</span>
        </div>
        <div className="text-xs text-charcoal-300">
          Active Prep Queue: <span className="font-bold text-white font-mono">{orders.filter(o => o.orderStatus !== 'completed').length}</span> tickets
        </div>
      </div>

      {/* 4 Column Workflow Grid */}
      <div className="flex-1 p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 overflow-y-auto">
        {columns.map(col => {
          const colOrders = orders.filter(o => o.orderStatus === col.id);

          return (
            <div key={col.id} className="bg-[#1F2621] border border-[#313C34] rounded flex flex-col overflow-hidden max-h-full">
              {/* Column Title */}
              <div className="p-2.5 bg-[#262F29] border-b border-[#313C34] flex items-center justify-between text-xs font-bold">
                <span className="text-white uppercase tracking-wider">{col.label}</span>
                <span className={`px-2 py-0.5 rounded text-white font-mono text-[11px] ${col.countBadge}`}>
                  {colOrders.length}
                </span>
              </div>

              {/* Order Tickets */}
              <div className="flex-1 p-2 space-y-2.5 overflow-y-auto">
                {colOrders.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-xs text-charcoal-500 italic">
                    No tickets
                  </div>
                ) : (
                  colOrders.map(order => {
                    const elapsed = getTimeElapsed(order.createdAt);
                    return (
                      <div
                        key={order.id}
                        className="bg-[#29332D] border border-[#3B4940] rounded p-2.5 flex flex-col justify-between shadow-xs"
                      >
                        <div>
                          {/* Ticket Header */}
                          <div className="flex items-start justify-between pb-1.5 border-b border-[#38463D]">
                            <div>
                              <span className="font-bold text-sm text-white font-mono">{order.orderNumber}</span>
                              <div className="text-[11px] font-semibold text-forest-100">
                                {order.tableNumber ? `TABLE ${order.tableNumber}` : order.orderType.toUpperCase()}
                              </div>
                            </div>
                            <span className="text-[10px] text-charcoal-300 bg-[#1A211C] px-1.5 py-0.5 rounded font-mono">
                              {elapsed}
                            </span>
                          </div>

                          {/* Food Items */}
                          <div className="py-2 space-y-1.5 text-xs">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex items-start gap-1.5">
                                <span className="font-bold text-forest-100 w-5 text-right font-mono flex-shrink-0">
                                  {item.quantity}x
                                </span>
                                <div className="flex-1 leading-snug">
                                  <span className="font-semibold text-white">{item.name}</span>
                                  {item.selectedVariant && (
                                    <div className="text-[10px] text-charcoal-300 pl-1">&bull; {item.selectedVariant.name}</div>
                                  )}
                                  {item.selectedAddOns?.map((a, aIdx) => (
                                    <div key={aIdx} className="text-[10px] text-charcoal-300 pl-1">+ {a.name}</div>
                                  ))}
                                  {item.notes && (
                                    <div className="text-[10px] font-bold text-earthRed bg-earthRed/20 p-0.5 rounded mt-0.5">
                                      {item.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {order.specialInstructions && (
                            <div className="text-[10px] bg-[#362A22] border border-[#523E32] text-earthAmber-light p-1 rounded font-medium mb-2">
                              Note: {order.specialInstructions}
                            </div>
                          )}
                        </div>

                        {/* Transitions */}
                        <div className="pt-2 border-t border-[#38463D] flex items-center justify-between text-xs">
                          {order.orderStatus === 'new' && (
                            <button
                              onClick={() => handleUpdateStatus(order, 'preparing')}
                              className="w-full py-1.5 bg-earthAmber hover:bg-amber-600 text-white rounded font-bold transition-colors"
                            >
                              Start Cooking &rarr;
                            </button>
                          )}
                          {order.orderStatus === 'preparing' && (
                            <button
                              onClick={() => handleUpdateStatus(order, 'ready')}
                              className="w-full py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded font-bold transition-colors"
                            >
                              Mark Ready &rarr;
                            </button>
                          )}
                          {order.orderStatus === 'ready' && (
                            <button
                              onClick={() => handleUpdateStatus(order, 'completed')}
                              className="w-full py-1.5 bg-forest-700 hover:bg-forest-600 text-white rounded font-bold transition-colors flex items-center justify-center gap-1"
                            >
                              <CheckIcon className="w-3.5 h-3.5" />
                              <span>Mark Served</span>
                            </button>
                          )}
                          {order.orderStatus === 'completed' && (
                            <span className="text-[10px] text-charcoal-400 italic w-full text-center">
                              Order finalized
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
