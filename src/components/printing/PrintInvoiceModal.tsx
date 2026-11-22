import React, { useState } from 'react';
import { Order, Restaurant } from '../../types';
import { CloseIcon, PrintIcon } from '../common/Icons';

interface PrintInvoiceModalProps {
  order: Order;
  restaurant: Restaurant;
  onClose: () => void;
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({ order, restaurant, onClose }) => {
  const [activeCopy, setActiveCopy] = useState<'customer' | 'kitchen' | 'restaurant' | 'all'>('customer');
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded border border-surfaceBorder shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-charcoal-900">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-surfaceBorder">
          <div className="flex items-center gap-2">
            <PrintIcon className="w-4 h-4 text-forest-800" />
            <h3 className="font-bold text-xs text-forest-900">
              Print Invoices & KOT &bull; Order #{order.orderNumber}
            </h3>
          </div>
          <button onClick={onClose} className="text-charcoal-500 hover:text-charcoal-900">
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls & Tab Selection */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-neutralBg border-b border-surfaceBorder text-xs">
          <div className="flex items-center gap-1 bg-surface p-0.5 rounded border border-surfaceBorder">
            <button
              onClick={() => setActiveCopy('customer')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                activeCopy === 'customer' ? 'bg-forest-800 text-white shadow-xs' : 'text-charcoal-700 hover:text-charcoal-900'
              }`}
            >
              Customer Copy
            </button>
            <button
              onClick={() => setActiveCopy('kitchen')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                activeCopy === 'kitchen' ? 'bg-forest-800 text-white shadow-xs' : 'text-charcoal-700 hover:text-charcoal-900'
              }`}
            >
              Kitchen KOT
            </button>
            <button
              onClick={() => setActiveCopy('restaurant')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                activeCopy === 'restaurant' ? 'bg-forest-800 text-white shadow-xs' : 'text-charcoal-700 hover:text-charcoal-900'
              }`}
            >
              Restaurant Copy
            </button>
            <button
              onClick={() => setActiveCopy('all')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                activeCopy === 'all' ? 'bg-forest-800 text-white shadow-xs' : 'text-charcoal-700 hover:text-charcoal-900'
              }`}
            >
              Print All (3-in-1)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={paperWidth}
              onChange={(e) => setPaperWidth(e.target.value as any)}
              className="bg-white border border-surfaceBorder rounded px-2 py-1 text-xs"
            >
              <option value="80mm">Thermal 80mm Roll</option>
              <option value="58mm">Thermal 58mm Roll</option>
            </select>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-forest-800 hover:bg-forest-900 text-white px-3 py-1 rounded font-semibold text-xs shadow-xs"
            >
              <PrintIcon className="w-3.5 h-3.5" />
              <span>Print Now</span>
            </button>
          </div>
        </div>

        {/* Printable Preview Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-surface/40 flex justify-center">
          <div
            id="thermal-print-area"
            style={{ width: paperWidth === '80mm' ? '300px' : '220px' }}
            className="bg-white border border-dashed border-charcoal-300 p-4 font-mono text-[11px] leading-tight text-black"
          >
            {/* 1. CUSTOMER COPY */}
            {(activeCopy === 'customer' || activeCopy === 'all') && (
              <div className="pb-4">
                <div className="text-center font-bold text-xs uppercase">{restaurant.name}</div>
                <div className="text-center text-[10px] text-gray-700 mt-0.5">{restaurant.address}</div>
                <div className="text-center text-[10px] text-gray-700">Ph: {restaurant.phone}</div>
                {restaurant.gstNumber && <div className="text-center text-[10px] text-gray-700">GSTIN: {restaurant.gstNumber}</div>}
                {restaurant.fssaiNumber && <div className="text-center text-[10px] text-gray-700">FSSAI: {restaurant.fssaiNumber}</div>}

                <div className="text-center font-bold text-[10px] my-1.5 border-t border-b border-black py-0.5">
                  CUSTOMER TAX INVOICE
                </div>

                <div className="flex justify-between text-[10px] my-1">
                  <span>Inv: {order.invoiceNumber}</span>
                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span>Type: {order.orderType.toUpperCase()}</span>
                  <span>{order.tableNumber ? `Table: ${order.tableNumber}` : 'Counter Takeaway'}</span>
                </div>
                {order.customerName && (
                  <div className="text-[10px] text-gray-800 border-b border-gray-300 pb-1 mb-1">
                    Customer: {order.customerName} {order.customerPhone ? `(${order.customerPhone})` : ''}
                  </div>
                )}

                {/* Items */}
                <table className="w-full text-left my-2 border-collapse text-[10px]">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="py-1">Item</th>
                      <th className="py-1 text-center">Qty</th>
                      <th className="py-1 text-right">Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="py-1 align-top">
                          <div className="font-semibold">{item.name}</div>
                          {item.selectedVariant && (
                            <div className="text-[9px] text-gray-600 pl-1">&bull; {item.selectedVariant.name}</div>
                          )}
                          {item.selectedAddOns?.map((a, aIdx) => (
                            <div key={aIdx} className="text-[9px] text-gray-600 pl-1">+ {a.name}</div>
                          ))}
                        </td>
                        <td className="py-1 text-center align-top">{item.quantity}</td>
                        <td className="py-1 text-right align-top font-bold">₹{item.totalPrice}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="space-y-0.5 text-[10px] border-t border-black pt-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{order.subtotal.toFixed(2)}</span>
                  </div>
                  {order.discountAmount > 0 && (
                    <div className="flex justify-between text-gray-700">
                      <span>Discount:</span>
                      <span>-₹{order.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>GST ({order.taxRatePercent}%):</span>
                    <span>₹{order.taxAmount.toFixed(2)}</span>
                  </div>
                  {order.serviceChargeAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Service Charge ({order.serviceChargePercent}%):</span>
                      <span>₹{order.serviceChargeAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-xs border-t border-b border-black py-1 mt-1">
                    <span>TOTAL AMOUNT:</span>
                    <span>₹{order.finalTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-2 text-[10px] text-center">
                  <div>Paid via: <span className="font-bold uppercase">{order.paymentMethod || 'CASH'}</span></div>
                  <div className="mt-2 text-[9px] italic">Thank you for dining with us! Please visit again.</div>
                </div>
              </div>
            )}

            {/* 2. KITCHEN COPY (KOT) */}
            {(activeCopy === 'kitchen' || activeCopy === 'all') && (
              <div className={`receipt-section ${activeCopy === 'all' ? 'border-t-2 border-dashed border-black pt-4 mt-4' : ''}`}>
                <div className="text-center font-bold text-xs border-b-2 border-black pb-0.5">
                  *** KITCHEN ORDER TICKET (KOT) ***
                </div>
                <div className="text-center font-semibold text-[10px] uppercase mt-0.5">{restaurant.name}</div>
                <div className="flex justify-between text-xs font-bold my-1">
                  <span>KOT #{order.orderNumber}</span>
                  <span>{order.tableNumber ? `TABLE: ${order.tableNumber}` : order.orderType.toUpperCase()}</span>
                </div>
                <div className="text-[10px] text-gray-600 mb-2">
                  Time: {new Date(order.createdAt).toLocaleTimeString()} &bull; Server: {order.cashierName}
                </div>

                <table className="w-full text-left my-2 border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="py-1">QTY</th>
                      <th className="py-1">FOOD ITEM & PREP INSTRUCTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-300">
                        <td className="py-1.5 font-bold align-top text-sm">{item.quantity} x</td>
                        <td className="py-1.5 align-top">
                          <div className="font-bold text-xs">{item.name}</div>
                          {item.selectedVariant && (
                            <div className="text-[10px] font-semibold text-gray-800 pl-1">&bull; {item.selectedVariant.name}</div>
                          )}
                          {item.selectedAddOns?.map((a, aIdx) => (
                            <div key={aIdx} className="text-[10px] text-gray-800 pl-1">+ {a.name}</div>
                          ))}
                          {item.notes && (
                            <div className="text-[10px] font-bold text-red-700 bg-red-50 p-0.5 mt-0.5 border border-red-200">
                              NOTE: {item.notes}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {order.specialInstructions && (
                  <div className="text-[10px] font-bold text-red-700 p-1 border border-red-300 bg-red-50 mt-1">
                    SPECIAL ORDER NOTE: {order.specialInstructions}
                  </div>
                )}
                <div className="text-[10px] text-center font-bold mt-2 pt-1 border-t border-black">
                  --- END OF KOT #{order.orderNumber} ---
                </div>
              </div>
            )}

            {/* 3. RESTAURANT AUDIT COPY */}
            {(activeCopy === 'restaurant' || activeCopy === 'all') && (
              <div className={`receipt-section ${activeCopy === 'all' ? 'border-t-2 border-dashed border-black pt-4 mt-4' : ''}`}>
                <div className="text-center font-bold text-xs border-b border-black pb-0.5">
                  RESTAURANT AUDIT COPY
                </div>
                <div className="flex justify-between text-[10px] my-1">
                  <span>Inv: {order.invoiceNumber}</span>
                  <span>Order: {order.orderNumber}</span>
                </div>
                <div className="text-[10px]">
                  Table: {order.tableNumber || 'Takeaway'} &bull; Cashier: {order.cashierName}
                </div>
                <div className="text-[10px]">
                  Time: {new Date(order.createdAt).toLocaleString()}
                </div>

                <div className="my-2 border-t border-b border-gray-300 py-1 text-[10px]">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{item.quantity}x {item.name}</span>
                      <span>₹{item.totalPrice}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span>Tax Collected:</span>
                    <span>₹{order.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount Allowed:</span>
                    <span>₹{order.discountAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-xs border-t border-black pt-1">
                    <span>Final Settled Total:</span>
                    <span>₹{order.finalTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Settled Tender:</span>
                    <span className="uppercase font-semibold">{order.paymentMethod || 'CASH'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-surface border-t border-surfaceBorder text-xs">
          <span className="text-charcoal-500">Thermal ESC/POS Compatible</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-neutralBg text-charcoal-900 border border-surfaceBorder rounded font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
