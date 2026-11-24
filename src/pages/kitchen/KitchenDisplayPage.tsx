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
    { id: 'preparing', label: 'In Preparation', countBadge: 'bg-[#F5BD3D]' },
    { id: 'ready', label: 'Ready for Service', countBadge: 'bg-purple-600' },
    { id: 'completed', label: 'Completed', countBadge: 'bg-[#078F36]' }
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#F5F6F5] text-[#171B18] h-full overflow-hidden select-none">
      {/* KDS Top Bar */}
      <div className="h-14 bg-white border-b border-[#E7EBE8] px-5 flex items-center justify-between flex-shrink-0 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#078F36] animate-pulse"></span>
          <span className="font-extrabold text-sm tracking-tight text-[#171B18]">Kitchen Display System (KDS)</span>
          <span className="text-xs text-[#59615B] font-semibold">&bull; {currentRestaurant?.name}</span>
        </div>
        <div className="text-xs text-[#59615B] font-semibold">
          Active Prep Queue: <span className="font-extrabold text-[#078F36] font-mono">{orders.filter(o => o.orderStatus !== 'completed').length}</span> tickets
        </div>
      </div>

      {/* 4 Column Workflow Grid */}
      <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto">
        {columns.map(col => {
          const colOrders = orders.filter(o => o.orderStatus === col.id);

          return (
            <div key={col.id} className="bg-white border border-[#E7EBE8] rounded-2xl flex flex-col overflow-hidden max-h-full shadow-sm">
              {/* Column Title */}
              <div className="p-3 bg-[#F5F6F5] border-b border-[#E7EBE8] flex items-center justify-between text-xs font-bold">
                <span className="text-[#171B18] font-extrabold uppercase tracking-wider">{col.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-white font-mono text-[11px] font-bold ${col.countBadge}`}>
                  {colOrders.length}
                </span>
              </div>

              {/* Order Tickets */}
              <div className="flex-1 p-3 space-y-3 overflow-y-auto bg-[#F5F6F5]/40">
                {colOrders.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-xs text-[#59615B] font-medium italic">
                    No tickets
                  </div>
                ) : (
                  colOrders.map(order => {
                    const elapsed = getTimeElapsed(order.createdAt);
                    return (
                      <div
                        key={order.id}
                        className="bg-white border border-[#E7EBE8] rounded-xl p-3.5 flex flex-col justify-between shadow-sm"
                      >
                        <div>
                          {/* Ticket Header */}
                          <div className="flex items-start justify-between pb-2 border-b border-[#E7EBE8]">
                            <div>
                              <span className="font-extrabold text-sm text-[#171B18] font-mono">{order.orderNumber}</span>
                              <div className="text-[11px] font-bold text-[#078F36]">
                                {order.tableNumber ? `TABLE ${order.tableNumber}` : order.orderType.toUpperCase()}
                              </div>
                            </div>
                            <span className="text-[10px] text-[#59615B] bg-[#F5F6F5] px-2 py-0.5 rounded-md font-mono font-bold border border-[#E7EBE8]">
                              {elapsed}
                            </span>
                          </div>

                          {/* Food Items */}
                          <div className="py-2.5 space-y-1.5 text-xs">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <span className="font-extrabold text-[#078F36] w-5 text-right font-mono flex-shrink-0">
                                  {item.quantity}x
                                </span>
                                <div className="flex-1 leading-snug">
                                  <span className="font-bold text-[#171B18]">{item.name}</span>
                                  {item.selectedVariant && (
                                    <div className="text-[10px] text-[#59615B] pl-1 font-semibold">&bull; {item.selectedVariant.name}</div>
                                  )}
                                  {item.selectedAddOns?.map((a, aIdx) => (
                                    <div key={aIdx} className="text-[10px] text-[#59615B] pl-1 font-semibold">+ {a.name}</div>
                                  ))}
                                  {item.notes && (
                                    <div className="text-[10px] font-bold text-[#D94A43] bg-red-50 p-1 rounded-md mt-1 border border-red-100">
                                      {item.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {order.specialInstructions && (
                            <div className="text-[10px] bg-amber-50 border border-amber-200 text-[#F5BD3D] p-2 rounded-lg font-bold mb-2">
                              Note: {order.specialInstructions}
                            </div>
                          )}
                        </div>

                        {/* Transitions */}
                        <div className="pt-2.5 border-t border-[#E7EBE8] flex items-center justify-between text-xs">
                          {order.orderStatus === 'new' && (
                            <button
                              onClick={() => handleUpdateStatus(order, 'preparing')}
                              className="w-full py-2 bg-[#F5BD3D] hover:bg-amber-600 text-white rounded-xl font-bold transition-colors shadow-2xs"
                            >
                              Start Cooking &rarr;
                            </button>
                          )}
                          {order.orderStatus === 'preparing' && (
                            <button
                              onClick={() => handleUpdateStatus(order, 'ready')}
                              className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors shadow-2xs"
                            >
                              Mark Ready &rarr;
                            </button>
                          )}
                          {order.orderStatus === 'ready' && (
                            <button
                              onClick={() => handleUpdateStatus(order, 'completed')}
                              className="w-full py-2 bg-[#078F36] hover:bg-[#087A32] text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-1 shadow-2xs"
                            >
                              <CheckIcon className="w-3.5 h-3.5 text-white" />
                              <span>Mark Served</span>
                            </button>
                          )}
                          {order.orderStatus === 'completed' && (
                            <span className="text-[10px] text-[#59615B] font-bold italic w-full text-center">
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
