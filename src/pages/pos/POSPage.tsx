import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { backend } from '../../db/backendService';
import { 
  MenuItem, 
  MenuCategory, 
  OrderItem, 
  OrderType, 
  RestaurantTable, 
  PaymentMethod,
  Order,
  MenuItemVariant,
  MenuItemAddOn
} from '../../types';
import { 
  SearchIcon, 
  PlusIcon, 
  CloseIcon, 
  CheckIcon, 
  PrintIcon 
} from '../../components/common/Icons';
import { PrintInvoiceModal } from '../../components/printing/PrintInvoiceModal';

export const POSPage: React.FC = () => {
  const { currentRestaurant, currentUser } = useAuth();
  const { showToast } = useToast();
  const restId = currentRestaurant?.id || '';

  const caller = {
    restaurantId: restId,
    role: currentUser?.role || 'cashier',
    userId: currentUser?.id || '',
    name: currentUser?.name || 'Cashier'
  };

  // Database states
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non_veg'>('all');

  // Active Billing Cart
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Held Bills queue
  const [heldBills, setHeldBills] = useState<{ id: string; label: string; time: string; cart: OrderItem[]; orderType: OrderType; tableId?: string }[]>([]);

  // Item Variant / Addon Customizer Modal
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | undefined>(undefined);
  const [selectedAddOns, setSelectedAddOns] = useState<MenuItemAddOn[]>([]);
  const [itemNoteInput, setItemNoteInput] = useState('');

  // Payment Settlement Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string>('');

  // Three-copy print trigger after order
  const [confirmedOrderToPrint, setConfirmedOrderToPrint] = useState<Order | null>(null);

  const loadData = () => {
    if (!restId) return;
    try {
      setCategories(backend.getCategories(caller, restId));
      setMenuItems(backend.getMenuItems(caller, restId));
      setTables(backend.getTables(caller, restId));
    } catch (e: any) {
      console.error(e.message);
    }
  };

  useEffect(() => {
    loadData();
    return backend.subscribe(loadData);
  }, [restId]);

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxRate = currentRestaurant?.taxRatePercent || 5.0;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableAmount * taxRate) / 100;
  const serviceChargeRate = orderType === 'dine_in' ? (currentRestaurant?.serviceChargePercent || 0) : 0;
  const serviceChargeAmount = (taxableAmount * serviceChargeRate) / 100;
  const grandTotal = Math.round(taxableAmount + taxAmount + serviceChargeAmount);

  // Filter items
  const filteredItems = menuItems.filter(item => {
    if (!item.isAvailable) return false;
    const matchCat = selectedCategory === 'all' || item.categoryId === selectedCategory;
    const matchDiet = dietaryFilter === 'all' || item.itemType === dietaryFilter;
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchDiet && matchSearch;
  });

  // Handle clicking product
  const handleItemClick = (item: MenuItem) => {
    const hasVariants = item.variants && item.variants.length > 0;
    const hasAddOns = item.addOns && item.addOns.length > 0;

    if (hasVariants || hasAddOns) {
      setCustomizingItem(item);
      setSelectedVariant(hasVariants ? item.variants[0] : undefined);
      setSelectedAddOns([]);
      setItemNoteInput('');
    } else {
      addItemToCart(item, undefined, [], 1, '');
    }
  };

  const addItemToCart = (
    item: MenuItem,
    variant?: MenuItemVariant,
    addOns: MenuItemAddOn[] = [],
    qty: number = 1,
    notes: string = ''
  ) => {
    const varDelta = variant ? variant.priceDelta : 0;
    const addOnTotal = addOns.reduce((sum, a) => sum + a.price, 0);
    const unitPrice = item.price + varDelta + addOnTotal;

    const existingIndex = cart.findIndex(c =>
      c.menuItemId === item.id &&
      c.selectedVariant?.id === variant?.id &&
      JSON.stringify(c.selectedAddOns || []) === JSON.stringify(addOns) &&
      (c.notes || '') === notes
    );

    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].quantity += qty;
      updated[existingIndex].totalPrice = updated[existingIndex].quantity * unitPrice;
      setCart(updated);
    } else {
      const newOrderItem: OrderItem = {
        id: 'oi_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        menuItemId: item.id,
        name: item.name,
        itemType: item.itemType,
        basePrice: item.price,
        selectedVariant: variant,
        selectedAddOns: addOns,
        quantity: qty,
        unitPrice,
        totalPrice: unitPrice * qty,
        notes: notes || undefined
      };
      setCart([...cart, newOrderItem]);
    }
    showToast(`Added ${item.name} to order`);
  };

  const updateCartQty = (idx: number, delta: number) => {
    const updated = [...cart];
    const newQty = updated[idx].quantity + delta;
    if (newQty <= 0) {
      updated.splice(idx, 1);
    } else {
      updated[idx].quantity = newQty;
      updated[idx].totalPrice = newQty * updated[idx].unitPrice;
    }
    setCart(updated);
  };

  // Hold Bill
  const handleHoldBill = () => {
    if (cart.length === 0) return;
    const label = orderType === 'dine_in' && selectedTableId
      ? `Table ${tables.find(t => t.id === selectedTableId)?.tableNumber || ''}`
      : customerName || `Order #${heldBills.length + 1}`;

    setHeldBills([...heldBills, {
      id: 'hold_' + Date.now(),
      label,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cart,
      orderType,
      tableId: selectedTableId
    }]);

    setCart([]);
    setSelectedTableId('');
    setCustomerName('');
    showToast(`Bill placed on hold: ${label}`, 'info');
  };

  // Resume Bill
  const handleResumeBill = (holdId: string) => {
    const hold = heldBills.find(h => h.id === holdId);
    if (!hold) return;

    if (cart.length > 0 && !window.confirm('Current order will be replaced by the held bill. Continue?')) {
      return;
    }

    setCart(hold.cart);
    setOrderType(hold.orderType);
    setSelectedTableId(hold.tableId || '');
    setHeldBills(heldBills.filter(h => h.id !== holdId));
    showToast(`Resumed bill: ${hold.label}`, 'success');
  };

  // Open Payment Modal & generate real UPI QR
  const handleOpenPayment = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty. Select items to bill.', 'warning');
      return;
    }
    if (orderType === 'dine_in' && !selectedTableId) {
      showToast('Please select a dining table for Dine-in orders', 'warning');
      return;
    }

    setCashTendered(grandTotal);

    // Format real UPI payload
    const upiId = currentRestaurant?.upiId || 'payment@bank';
    const upiPayload = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(currentRestaurant?.name || 'Restaurant')}&am=${grandTotal}&cu=INR&tn=DineFlow Order`;

    try {
      const qrData = await QRCode.toDataURL(upiPayload, { width: 220, margin: 1 });
      setUpiQrDataUrl(qrData);
    } catch (e) {
      console.error('Error generating UPI QR code:', e);
    }

    setIsPaymentModalOpen(true);
  };

  // Confirm order execution
  const handleFinalizeOrder = () => {
    const table = tables.find(t => t.id === selectedTableId);
    const orderNumber = 'ORD-' + Math.floor(100 + Math.random() * 900);

    const newOrder: Order = {
      id: 'ord_' + Date.now(),
      orderNumber,
      invoiceNumber: '', // Backend service generates sequential invoice number
      restaurantId: restId,
      orderType,
      tableId: selectedTableId || undefined,
      tableNumber: table?.tableNumber,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      items: cart,
      subtotal,
      discountAmount,
      taxRatePercent: taxRate,
      taxAmount,
      serviceChargePercent: serviceChargeRate,
      serviceChargeAmount,
      finalTotal: grandTotal,
      paymentMethod,
      paymentStatus: 'paid',
      orderStatus: 'new',
      specialInstructions: specialInstructions.trim() || undefined,
      cashierId: currentUser?.id || 'usr_cashier',
      cashierName: currentUser?.name || 'Cashier',
      createdAt: new Date().toISOString()
    };

    const saved = backend.createOrder(caller, newOrder);

    // Reset state
    setCart([]);
    setSelectedTableId('');
    setCustomerName('');
    setCustomerPhone('');
    setSpecialInstructions('');
    setDiscountAmount(0);
    setIsPaymentModalOpen(false);

    showToast(`Order #${saved.orderNumber} confirmed & billed!`, 'success');
    setConfirmedOrderToPrint(saved);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden select-none">
      {/* LEFT PANEL: Categories & Menu Items */}
      <div className="flex-1 flex flex-col bg-neutralBg overflow-hidden border-r border-surfaceBorder">
        {/* Top Search & Filter Bar */}
        <div className="p-3 bg-surface border-b border-surfaceBorder flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-charcoal-500">
                <SearchIcon className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search menu by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-surfaceBorder rounded text-xs focus:border-forest-800 focus:outline-none"
              />
            </div>

            {/* Veg / Non-Veg Toggle Filter */}
            <div className="flex items-center bg-white p-0.5 rounded border border-surfaceBorder text-[11px]">
              <button
                onClick={() => setDietaryFilter('all')}
                className={`px-2 py-1 rounded font-medium ${dietaryFilter === 'all' ? 'bg-forest-800 text-white font-bold' : 'text-charcoal-700'}`}
              >
                All
              </button>
              <button
                onClick={() => setDietaryFilter('veg')}
                className={`px-2 py-1 rounded font-medium text-forest-700 ${dietaryFilter === 'veg' ? 'bg-forest-100 font-bold' : ''}`}
              >
                Veg
              </button>
              <button
                onClick={() => setDietaryFilter('non_veg')}
                className={`px-2 py-1 rounded font-medium text-earthRed ${dietaryFilter === 'non_veg' ? 'bg-earthRed-light font-bold' : ''}`}
              >
                Non-Veg
              </button>
            </div>
          </div>

          {/* Held Bills Badges */}
          {heldBills.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              <span className="text-[11px] font-bold text-forest-800">Held ({heldBills.length}):</span>
              {heldBills.map(hold => (
                <button
                  key={hold.id}
                  onClick={() => handleResumeBill(hold.id)}
                  className="px-2 py-1 bg-earthAmber-light border border-earthAmber-border text-earthAmber font-bold rounded text-[11px] hover:bg-earthAmber hover:text-white transition-colors"
                >
                  {hold.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Categories Horizontal Tabs */}
        <div className="px-3 py-2 bg-neutralBg border-b border-surfaceBorder flex items-center gap-1.5 overflow-x-auto text-xs flex-shrink-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded whitespace-nowrap font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-forest-800 text-white shadow-xs'
                : 'bg-surface text-charcoal-700 hover:bg-white'
            }`}
          >
            All Items
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded whitespace-nowrap font-medium transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-forest-800 text-white shadow-xs'
                  : 'bg-surface text-charcoal-700 hover:bg-white'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto p-3.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
            {filteredItems.map(item => {
              const hasCustom = (item.variants && item.variants.length > 0) || (item.addOns && item.addOns.length > 0);

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="bg-white border border-surfaceBorder rounded p-2.5 flex flex-col justify-between hover:border-forest-700 hover:shadow-xs transition-all cursor-pointer group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="font-semibold text-xs text-charcoal-900 line-clamp-2 leading-snug">
                        {item.name}
                      </span>
                      {item.itemType === 'veg' && (
                        <span className="w-2.5 h-2.5 rounded-full bg-forest-700 flex-shrink-0 mt-0.5" title="Veg"></span>
                      )}
                      {item.itemType === 'non_veg' && (
                        <span className="w-2.5 h-2.5 rounded-full bg-earthRed flex-shrink-0 mt-0.5" title="Non-Veg"></span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-[10px] text-charcoal-500 line-clamp-1">{item.description}</p>
                    )}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-surfaceBorder flex items-center justify-between">
                    <span className="font-bold text-xs text-forest-900 font-mono">
                      ₹{item.price}
                    </span>
                    {hasCustom ? (
                      <span className="text-[10px] text-forest-700 bg-forest-100 px-1.5 py-0.5 rounded font-semibold">
                        Custom
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded bg-surface group-hover:bg-forest-800 group-hover:text-white flex items-center justify-center text-charcoal-700 text-xs transition-colors">
                        +
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Current Order, Cart & Billing Summary */}
      <div className="w-full lg:w-96 bg-white flex flex-col h-full border-t lg:border-t-0 flex-shrink-0 shadow-xs">
        {/* Order Setup Header */}
        <div className="p-3 bg-surface border-b border-surfaceBorder space-y-2">
          {/* Order Type Buttons */}
          <div className="grid grid-cols-3 gap-1 text-[11px] font-medium bg-neutralBg p-0.5 rounded border border-surfaceBorder">
            {(['dine_in', 'takeaway', 'delivery'] as const).map(type => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`py-1 rounded text-center capitalize transition-colors ${
                  orderType === type ? 'bg-forest-800 text-white font-bold' : 'text-charcoal-700 hover:text-charcoal-900'
                }`}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Table Selector (If Dine-in) */}
          {orderType === 'dine_in' && (
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-bold text-charcoal-700 whitespace-nowrap">Table:</label>
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="flex-1 bg-white border border-surfaceBorder rounded px-2 py-1 text-xs focus:outline-none focus:border-forest-800 font-semibold"
              >
                <option value="">Select Table...</option>
                {tables.map(tbl => (
                  <option key={tbl.id} value={tbl.id}>
                    {tbl.tableNumber} ({tbl.capacity} Pax) - {tbl.status.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Customer Details (Optional) */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <input
              type="text"
              placeholder="Guest Name (optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="bg-white border border-surfaceBorder rounded px-2 py-1 text-[11px] focus:outline-none"
            />
            <input
              type="tel"
              placeholder="Phone (optional)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="bg-white border border-surfaceBorder rounded px-2 py-1 text-[11px] focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 divide-y divide-surfaceBorder">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-charcoal-500">
              <span className="text-2xl mb-1">&bull; &bull; &bull;</span>
              <p className="text-xs font-semibold text-charcoal-700">Order is empty</p>
              <p className="text-[11px] text-charcoal-500 mt-0.5">Click menu items on the left to add dishes</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={item.id} className="py-2 flex flex-col gap-1 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <span className="font-semibold text-charcoal-900">{item.name}</span>
                    {item.selectedVariant && (
                      <span className="text-[10px] text-forest-700 block">&bull; {item.selectedVariant.name}</span>
                    )}
                    {item.selectedAddOns?.map((a, aIdx) => (
                      <span key={aIdx} className="text-[10px] text-charcoal-500 block">+ {a.name}</span>
                    ))}
                    {item.notes && (
                      <span className="text-[10px] italic text-charcoal-500 block">Note: {item.notes}</span>
                    )}
                  </div>
                  <span className="font-bold text-xs text-charcoal-900 font-mono">
                    ₹{item.totalPrice}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-charcoal-500">₹{item.unitPrice} each</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCartQty(idx, -1)}
                      className="w-5 h-5 rounded bg-surface hover:bg-surfaceBorder text-charcoal-900 flex items-center justify-center font-bold text-xs"
                    >
                      -
                    </button>
                    <span className="w-5 text-center font-mono font-bold text-xs">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQty(idx, 1)}
                      className="w-5 h-5 rounded bg-surface hover:bg-surfaceBorder text-charcoal-900 flex items-center justify-center font-bold text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Calculations & Checkout */}
        <div className="p-3 bg-surface border-t border-surfaceBorder space-y-2 text-xs">
          {/* Quick Discount Entry */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-charcoal-700 font-medium">Flat Discount (₹):</span>
            <input
              type="number"
              min="0"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
              className="w-24 px-2 py-0.5 bg-white border border-surfaceBorder rounded text-right font-mono"
            />
          </div>

          <div className="space-y-1 pt-1 border-t border-surfaceBorder text-xs">
            <div className="flex justify-between text-charcoal-700">
              <span>Subtotal:</span>
              <span className="font-mono">₹{subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-forest-700 font-medium">
                <span>Discount:</span>
                <span className="font-mono">-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-charcoal-700">
              <span>GST ({taxRate}%):</span>
              <span className="font-mono">₹{taxAmount.toFixed(2)}</span>
            </div>
            {serviceChargeAmount > 0 && (
              <div className="flex justify-between text-charcoal-700">
                <span>Service Charge ({serviceChargeRate}%):</span>
                <span className="font-mono">₹{serviceChargeAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-forest-900 pt-1 border-t border-surfaceBorder">
              <span>Payable Total:</span>
              <span className="font-mono text-base">₹{grandTotal}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleHoldBill}
              disabled={cart.length === 0}
              className="py-1.5 bg-white border border-surfaceBorder hover:bg-neutralBg disabled:opacity-50 text-charcoal-900 rounded font-semibold text-xs"
            >
              Hold Bill
            </button>
            <button
              onClick={() => {
                if (cart.length > 0 && window.confirm('Clear current order items?')) {
                  setCart([]);
                  setDiscountAmount(0);
                }
              }}
              disabled={cart.length === 0}
              className="py-1.5 bg-white border border-surfaceBorder hover:bg-earthRed-light hover:text-earthRed disabled:opacity-50 text-charcoal-700 rounded font-medium text-xs"
            >
              Clear Cart
            </button>
          </div>

          {/* Primary Charge Button */}
          <button
            onClick={handleOpenPayment}
            disabled={cart.length === 0}
            className="w-full py-2 bg-forest-800 hover:bg-forest-900 disabled:opacity-50 text-white rounded font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <span>Charge ₹{grandTotal}</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>

      {/* Item Customizer Modal */}
      {customizingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded border border-surfaceBorder shadow-xl w-full max-w-sm text-charcoal-900 p-4">
            <div className="flex items-start justify-between pb-2 border-b border-surfaceBorder">
              <div>
                <h3 className="font-bold text-xs text-forest-900">{customizingItem.name}</h3>
                <span className="text-[11px] text-charcoal-500 font-mono">Base: ₹{customizingItem.price}</span>
              </div>
              <button onClick={() => setCustomizingItem(null)} className="text-charcoal-500 hover:text-charcoal-900">
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3 space-y-3 max-h-80 overflow-y-auto text-xs">
              {/* Variants */}
              {customizingItem.variants && customizingItem.variants.length > 0 && (
                <div>
                  <label className="block font-bold text-charcoal-800 mb-1">Portion Size</label>
                  <div className="grid grid-cols-2 gap-2">
                    {customizingItem.variants.map(v => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        className={`p-2 rounded border text-left flex justify-between ${
                          selectedVariant?.id === v.id
                            ? 'border-forest-800 bg-forest-100 font-bold text-forest-900'
                            : 'border-surfaceBorder'
                        }`}
                      >
                        <span>{v.name}</span>
                        <span>{v.priceDelta > 0 ? `+₹${v.priceDelta}` : 'Default'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Addons */}
              {customizingItem.addOns && customizingItem.addOns.length > 0 && (
                <div>
                  <label className="block font-bold text-charcoal-800 mb-1">Add-ons & Toppings</label>
                  <div className="space-y-1">
                    {customizingItem.addOns.map(addon => {
                      const isSelected = selectedAddOns.some(a => a.id === addon.id);
                      return (
                        <button
                          key={addon.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedAddOns(selectedAddOns.filter(a => a.id !== addon.id));
                            } else {
                              setSelectedAddOns([...selectedAddOns, addon]);
                            }
                          }}
                          className={`w-full p-2 rounded border text-left flex justify-between ${
                            isSelected ? 'border-forest-800 bg-forest-100 font-bold text-forest-900' : 'border-surfaceBorder'
                          }`}
                        >
                          <span>{addon.name}</span>
                          <span>+₹{addon.price}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-charcoal-800 mb-1">Special Instruction</label>
                <input
                  type="text"
                  placeholder="e.g. Less spicy, dressing on side"
                  value={itemNoteInput}
                  onChange={(e) => setItemNoteInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-surfaceBorder flex justify-end gap-2 text-xs">
              <button
                onClick={() => setCustomizingItem(null)}
                className="px-3 py-1.5 border border-surfaceBorder rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  addItemToCart(customizingItem, selectedVariant, selectedAddOns, 1, itemNoteInput);
                  setCustomizingItem(null);
                }}
                className="px-4 py-1.5 bg-forest-800 hover:bg-forest-900 text-white rounded font-bold"
              >
                Add to Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Processing Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded border border-surfaceBorder shadow-xl w-full max-w-md text-charcoal-900 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-surfaceBorder">
              <h3 className="font-bold text-xs text-forest-900">
                Settle Payment &bull; Total: ₹{grandTotal}
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-charcoal-500 hover:text-charcoal-900">
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs">
              {/* Payment Methods */}
              <div className="grid grid-cols-4 gap-2">
                {(['cash', 'upi', 'card', 'other'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`py-2 rounded border text-center font-bold uppercase transition-colors ${
                      paymentMethod === m
                        ? 'border-forest-800 bg-forest-100 text-forest-900'
                        : 'border-surfaceBorder text-charcoal-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Method Detail View */}
              {paymentMethod === 'cash' && (
                <div className="bg-surface p-3 rounded border border-surfaceBorder space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Cash Tendered by Guest:</span>
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                      className="w-32 px-2 py-1 bg-white border border-surfaceBorder rounded font-mono font-bold text-right text-sm"
                    />
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-forest-900 pt-2 border-t border-surfaceBorder">
                    <span>Change to Return:</span>
                    <span className="font-mono text-forest-700">
                      ₹{Math.max(0, cashTendered - grandTotal)}
                    </span>
                  </div>
                </div>
              )}

              {paymentMethod === 'upi' && (
                <div className="flex flex-col items-center justify-center p-3 bg-surface rounded border border-surfaceBorder">
                  <span className="text-[11px] font-semibold text-charcoal-700 mb-2">Scan with Any UPI App (GPay, PhonePe, Paytm)</span>
                  {upiQrDataUrl ? (
                    <img src={upiQrDataUrl} alt="UPI QR" className="w-40 h-40 rounded border border-surfaceBorder" />
                  ) : (
                    <div className="w-40 h-40 bg-white flex items-center justify-center text-charcoal-400">Loading QR...</div>
                  )}
                  <span className="text-[10px] text-charcoal-500 mt-2 font-mono">VPA: {currentRestaurant?.upiId || 'configured@bank'}</span>
                </div>
              )}

              {paymentMethod === 'card' && (
                <div className="bg-surface p-4 rounded border border-surfaceBorder text-center">
                  <p className="font-bold text-xs text-charcoal-800">Swipe, Dip or Tap Card on Counter POS Device</p>
                  <p className="text-[11px] text-charcoal-500 mt-1">Confirm payment after bank authorization approval</p>
                </div>
              )}

              {paymentMethod === 'other' && (
                <div className="bg-surface p-4 rounded border border-surfaceBorder text-center">
                  <p className="font-semibold text-xs text-charcoal-800">Other Tender (Cheque, Food Coupon, House Account)</p>
                </div>
              )}
            </div>

            <div className="p-3 bg-surface border-t border-surfaceBorder flex justify-between items-center text-xs">
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-3 py-1.5 border border-surfaceBorder rounded bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalizeOrder}
                className="px-4 py-1.5 bg-forest-800 hover:bg-forest-900 text-white rounded font-bold shadow-xs flex items-center gap-1.5"
              >
                <CheckIcon className="w-4 h-4" />
                <span>Confirm & Print Bill</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Three-Copy Printing Modal */}
      {confirmedOrderToPrint && currentRestaurant && (
        <PrintInvoiceModal
          order={confirmedOrderToPrint}
          restaurant={currentRestaurant}
          onClose={() => setConfirmedOrderToPrint(null)}
        />
      )}
    </div>
  );
};
