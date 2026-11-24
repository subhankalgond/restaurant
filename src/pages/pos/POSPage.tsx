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
  FilterSlidersIcon,
  CloseIcon, 
  CheckIcon, 
  TrashIcon,
  PlusIcon,
  MinusIcon,
  EditPencilIcon,
  CategoryAllIcon,
  BreakfastIcon,
  SoupIcon,
  PastaIcon,
  MainCourseIcon,
  BurgerIcon,
  DrinkIcon,
  DessertIcon,
  CashBillIcon,
  CardPaymentIcon,
  QrCodeIcon
} from '../../components/common/Icons';
import { PrintInvoiceModal } from '../../components/printing/PrintInvoiceModal';

// High quality food photos matching CHILI POS dishes
const FOOD_PHOTOS: { [key: string]: string } = {
  salad: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=500&q=80',
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80',
  taco: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=500&q=80',
  sushi: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=500&q=80',
  juice: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=500&q=80',
  orange: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=500&q=80',
  pasta: 'https://images.unsplash.com/photo-1621996346565-e3d5d628169e?auto=format&fit=crop&w=500&q=80',
  pizza: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=500&q=80',
  soup: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=500&q=80',
  breakfast: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=500&q=80',
  dessert: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=500&q=80',
  cake: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=500&q=80',
  drink: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80',
  coffee: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=500&q=80',
  curry: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=500&q=80',
  rice: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=500&q=80',
  french: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=500&q=80',
  fries: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=500&q=80',
  sandwich: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=500&q=80',
  meat: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=500&q=80',
  chicken: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=500&q=80',
  default: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80'
};

const getFoodImageUrl = (name: string, description?: string): string => {
  const text = (name + ' ' + (description || '')).toLowerCase();
  for (const key of Object.keys(FOOD_PHOTOS)) {
    if (key !== 'default' && text.includes(key)) {
      return FOOD_PHOTOS[key];
    }
  }
  return FOOD_PHOTOS.default;
};

// Map category name to icon component
const getCategoryIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('all')) return CategoryAllIcon;
  if (n.includes('breakfast')) return BreakfastIcon;
  if (n.includes('soup')) return SoupIcon;
  if (n.includes('pasta') || n.includes('noodle')) return PastaIcon;
  if (n.includes('main') || n.includes('course') || n.includes('dinner')) return MainCourseIcon;
  if (n.includes('burger') || n.includes('sandwich')) return BurgerIcon;
  if (n.includes('drink') || n.includes('beverage') || n.includes('juice') || n.includes('bar')) return DrinkIcon;
  if (n.includes('dessert') || n.includes('sweet') || n.includes('ice')) return DessertIcon;
  return CategoryAllIcon;
};

export const POSPage: React.FC = () => {
  const { currentRestaurant, currentUser } = useAuth();
  const { showToast } = useToast();
  const restId = currentRestaurant?.id || '';
  const currency = currentRestaurant?.currencySymbol || '₹';

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
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);

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
  const [isEditingGuest, setIsEditingGuest] = useState(false);

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
      const loadedTables = backend.getTables(caller, restId);
      setTables(loadedTables);

      // Default select first available or occupied table if not set
      if (!selectedTableId && loadedTables.length > 0) {
        setSelectedTableId(loadedTables[0].id);
      }

      const allOrders = backend.getOrders(caller, restId);
      const active = allOrders.filter(o => o.orderStatus === 'new' || o.orderStatus === 'preparing' || o.orderStatus === 'ready');
      setActiveOrders(active);
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

  // Selected table helper
  const selectedTable = tables.find(t => t.id === selectedTableId);

  // Filter items
  const filteredItems = menuItems.filter(item => {
    if (!item.isAvailable) return false;
    const matchCat = selectedCategory === 'all' || item.categoryId === selectedCategory;
    const matchDiet = dietaryFilter === 'all' || item.itemType === dietaryFilter;
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchDiet && matchSearch;
  });

  // Calculate quantity of a product currently in cart
  const getItemCartQty = (itemId: string): number => {
    return cart
      .filter(c => c.menuItemId === itemId)
      .reduce((sum, c) => sum + c.quantity, 0);
  };

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
      invoiceNumber: '',
      restaurantId: restId,
      orderType,
      tableId: selectedTableId || undefined,
      tableNumber: table?.tableNumber,
      customerName: customerName.trim() || (table ? `Table ${table.tableNumber}` : 'Walk-in Guest'),
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

    // Reset cart
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setSpecialInstructions('');
    setDiscountAmount(0);
    setIsPaymentModalOpen(false);

    showToast(`Order #${saved.orderNumber} placed successfully!`, 'success');
    setConfirmedOrderToPrint(saved);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden select-none bg-[#F5F6F5]">
      {/* ---------------------------------------------------- */}
      {/* 1. CENTER WORKSPACE: Search, Categories, Dishes & Active Tables */}
      {/* ---------------------------------------------------- */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#F5F6F5] relative">
        {/* Top Search & Filter Bar */}
        <div className="p-4 pb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            {/* Search Input matching CHILI POS */}
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#777F79]">
                <SearchIcon className="w-4 h-4 text-[#777F79]" />
              </span>
              <input
                type="text"
                placeholder="Search Product here.."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E7EBE8] rounded-xl text-xs text-[#171B18] placeholder-[#777F79] focus:outline-none focus:border-[#078F36] shadow-2xs transition-colors"
              />
            </div>

            {/* Filter Slider Action */}
            <button
              onClick={() => {
                // Cycle dietary filter: all -> veg -> non_veg -> all
                if (dietaryFilter === 'all') setDietaryFilter('veg');
                else if (dietaryFilter === 'veg') setDietaryFilter('non_veg');
                else setDietaryFilter('all');
              }}
              title={`Filter: ${dietaryFilter.toUpperCase()}`}
              className={`p-2.5 rounded-xl border flex items-center justify-center transition-colors shadow-2xs ${
                dietaryFilter !== 'all'
                  ? 'bg-[#078F36] text-white border-[#078F36]'
                  : 'bg-white text-[#777F79] hover:text-[#171B18] border-[#E7EBE8]'
              }`}
            >
              <FilterSlidersIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Held Bills Quick Access */}
          {heldBills.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              <span className="text-[11px] font-bold text-[#078F36]">Held ({heldBills.length}):</span>
              {heldBills.map(hold => (
                <button
                  key={hold.id}
                  onClick={() => handleResumeBill(hold.id)}
                  className="px-2.5 py-1 bg-[#D8EFDF] text-[#078F36] font-bold rounded-lg text-[11px] hover:bg-[#078F36] hover:text-white transition-colors"
                >
                  {hold.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Categories Horizontal Cards Row */}
        <div className="px-4 pb-3 flex items-center gap-3 overflow-x-auto no-scrollbar flex-shrink-0">
          {/* "All" Category Card */}
          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex flex-col items-center justify-center min-w-[90px] h-[78px] px-3 rounded-2xl transition-all duration-150 flex-shrink-0 border ${
              selectedCategory === 'all'
                ? 'bg-[#D8EFDF] border-[#D8EFDF] shadow-xs'
                : 'bg-white border-[#E7EBE8] hover:border-gray-300'
            }`}
          >
            <CategoryAllIcon className={`w-5 h-5 mb-1 ${selectedCategory === 'all' ? 'text-[#078F36]' : 'text-[#777F79]'}`} />
            <span className={`text-xs font-bold ${selectedCategory === 'all' ? 'text-[#078F36]' : 'text-[#171B18]'}`}>
              All
            </span>
            <span className="text-[10px] text-[#777F79] font-medium leading-tight">
              {menuItems.length} Items
            </span>
          </button>

          {/* Dynamic Categories Cards */}
          {categories.map(cat => {
            const Icon = getCategoryIcon(cat.name);
            const isSelected = selectedCategory === cat.id;
            const count = menuItems.filter(i => i.categoryId === cat.id).length;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex flex-col items-center justify-center min-w-[90px] h-[78px] px-3 rounded-2xl transition-all duration-150 flex-shrink-0 border ${
                  isSelected
                    ? 'bg-[#D8EFDF] border-[#D8EFDF] shadow-xs'
                    : 'bg-white border-[#E7EBE8] hover:border-gray-300'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${isSelected ? 'text-[#078F36]' : 'text-[#777F79]'}`} />
                <span className={`text-xs font-bold truncate max-w-[80px] ${isSelected ? 'text-[#078F36]' : 'text-[#171B18]'}`}>
                  {cat.name}
                </span>
                <span className="text-[10px] text-[#777F79] font-medium leading-tight">
                  {count} Items
                </span>
              </button>
            );
          })}
        </div>

        {/* Product Cards 3-Column Grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredItems.map(item => {
              const currentQty = getItemCartQty(item.id);
              const isSelected = currentQty > 0;
              const imageUrl = getFoodImageUrl(item.name, item.description);
              const hasCustom = (item.variants && item.variants.length > 0) || (item.addOns && item.addOns.length > 0);

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl p-3 border transition-all duration-150 flex flex-col justify-between shadow-2xs hover:shadow-xs ${
                    isSelected ? 'border-[#078F36] ring-1 ring-[#078F36]' : 'border-[#E7EBE8]'
                  }`}
                >
                  <div>
                    {/* Food Photo Container */}
                    <div className="relative w-full h-36 rounded-xl overflow-hidden mb-3 bg-[#F5F6F5]">
                      <img
                        src={imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FOOD_PHOTOS.default;
                        }}
                      />
                      {/* Optional Discount Chip matching reference */}
                      {item.price > 150 && (
                        <span className="absolute top-2 left-2 bg-[#F5BD3D] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs">
                          20% Off
                        </span>
                      )}
                    </div>

                    {/* Dish Title */}
                    <h4 className="font-bold text-xs text-[#171B18] leading-snug line-clamp-2 mb-1 min-h-[32px]">
                      {item.name}
                    </h4>

                    {/* Price and Veg/Non-Veg Indicator */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-extrabold text-xs text-[#171B18]">
                        {currency}{item.price.toFixed(2)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.itemType === 'veg' ? 'bg-[#078F36]' : 'bg-[#D94A43]'
                          }`}
                        />
                        <span className="text-[10px] text-[#777F79] font-medium capitalize">
                          {item.itemType === 'veg' ? 'Veg' : 'Non Veg'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Add to Dish Button OR Stepper */}
                  {currentQty === 0 ? (
                    <button
                      onClick={() => handleItemClick(item)}
                      className="w-full py-2 bg-[#D8EFDF] hover:bg-[#078F36] text-[#078F36] hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>{hasCustom ? 'Customize & Add' : 'Add to Dish'}</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-between bg-[#F0F8F3] border border-[#D8EFDF] rounded-xl p-1">
                      <button
                        onClick={() => {
                          const cartIdx = cart.findIndex(c => c.menuItemId === item.id);
                          if (cartIdx >= 0) updateCartQty(cartIdx, -1);
                        }}
                        className="w-7 h-7 rounded-lg bg-[#078F36] text-white flex items-center justify-center font-bold hover:bg-[#087A32] transition-colors"
                      >
                        <MinusIcon className="w-3.5 h-3.5 text-white" />
                      </button>
                      <span className="font-bold text-xs text-[#171B18] px-2">
                        {currentQty}
                      </span>
                      <button
                        onClick={() => handleItemClick(item)}
                        className="w-7 h-7 rounded-lg bg-[#078F36] text-white flex items-center justify-center font-bold hover:bg-[#087A32] transition-colors"
                      >
                        <PlusIcon className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Active Orders Bar matching reference T1, T2, T3 */}
        <div className="absolute bottom-0 inset-x-0 bg-white border-t border-[#E7EBE8] px-4 py-2.5 flex items-center gap-3 overflow-x-auto shadow-sm z-10">
          {activeOrders.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-[#777F79]">
              <div className="w-7 h-7 rounded-full bg-[#F5BD3D] text-white font-bold flex items-center justify-center text-xs">
                T1
              </div>
              <span className="font-semibold text-[#171B18]">Jacob Jones</span>
              <span className="text-[11px] text-[#777F79]">No active kitchen orders</span>
            </div>
          ) : (
            activeOrders.map(order => {
              const tableNum = order.tableNumber || order.tableId?.slice(-2) || '1';
              const custName = order.customerName || `Guest ${order.orderNumber}`;
              const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);

              return (
                <div
                  key={order.id}
                  onClick={() => {
                    if (order.tableId) setSelectedTableId(order.tableId);
                    showToast(`Selected Table ${tableNum}`, 'info');
                  }}
                  className="flex items-center gap-2.5 bg-[#F5F6F5] hover:bg-[#F0F8F3] border border-[#E7EBE8] rounded-full px-3 py-1.5 cursor-pointer flex-shrink-0 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-[#F5BD3D] text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                    T{tableNum}
                  </div>
                  <div className="flex flex-col min-w-0 pr-1">
                    <span className="font-bold text-xs text-[#171B18] truncate max-w-[90px]">
                      {custName}
                    </span>
                    <span className="text-[10px] text-[#777F79] font-medium leading-none">
                      {itemCount} items &rarr; {order.orderStatus === 'new' ? 'Kitchen' : order.orderStatus}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#D8EFDF] text-[#078F36]">
                    Process
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. RIGHT DEDICATED BILLING PANEL                     */}
      {/* ---------------------------------------------------- */}
      <div className="w-full lg:w-[380px] bg-white flex flex-col h-full border-t lg:border-t-0 lg:border-l border-[#E7EBE8] flex-shrink-0 z-20 shadow-xs">
        {/* Billing Header */}
        <div className="p-4 border-b border-[#E7EBE8] flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-[#171B18]">
              {orderType === 'dine_in' 
                ? (selectedTable ? `Table ${selectedTable.tableNumber}` : 'Table 4')
                : (orderType === 'takeaway' ? 'Take Away' : 'Delivery')}
            </h3>
            <span className="text-xs text-[#777F79] font-medium">
              {customerName || 'Floyd Miles'}
            </span>
          </div>

          <button
            onClick={() => setIsEditingGuest(!isEditingGuest)}
            className="w-8 h-8 rounded-full border border-[#E7EBE8] flex items-center justify-center text-[#777F79] hover:text-[#078F36] hover:border-[#078F36] transition-colors"
            title="Edit Customer / Table"
          >
            <EditPencilIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Optional Guest / Table Editor dropdown */}
        {isEditingGuest && (
          <div className="p-3 bg-[#F0F8F3] border-b border-[#D8EFDF] space-y-2 text-xs">
            {orderType === 'dine_in' && (
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-bold text-[#171B18] whitespace-nowrap">Table:</label>
                <select
                  value={selectedTableId}
                  onChange={(e) => setSelectedTableId(e.target.value)}
                  className="flex-1 bg-white border border-[#E7EBE8] rounded-lg px-2 py-1 text-xs text-[#171B18] font-semibold focus:outline-none"
                >
                  <option value="">Select Table...</option>
                  {tables.map(tbl => (
                    <option key={tbl.id} value={tbl.id}>
                      Table {tbl.tableNumber} ({tbl.capacity} Pax) - {tbl.status.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Guest Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="bg-white border border-[#E7EBE8] rounded-lg px-2.5 py-1 text-xs text-[#171B18] focus:outline-none"
              />
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="bg-white border border-[#E7EBE8] rounded-lg px-2.5 py-1 text-xs text-[#171B18] focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Order Type Segmented Control */}
        <div className="p-4 pb-2">
          <div className="grid grid-cols-3 gap-1 bg-[#F5F6F5] p-1 rounded-xl border border-[#E7EBE8] text-xs font-semibold">
            <button
              onClick={() => setOrderType('dine_in')}
              className={`py-1.5 rounded-lg text-center transition-all ${
                orderType === 'dine_in'
                  ? 'bg-[#D8EFDF] text-[#078F36] font-bold shadow-2xs'
                  : 'text-[#777F79] hover:text-[#171B18]'
              }`}
            >
              Dine In
            </button>
            <button
              onClick={() => setOrderType('takeaway')}
              className={`py-1.5 rounded-lg text-center transition-all ${
                orderType === 'takeaway'
                  ? 'bg-[#D8EFDF] text-[#078F36] font-bold shadow-2xs'
                  : 'text-[#777F79] hover:text-[#171B18]'
              }`}
            >
              Take Away
            </button>
            <button
              onClick={() => setOrderType('delivery')}
              className={`py-1.5 rounded-lg text-center transition-all ${
                orderType === 'delivery'
                  ? 'bg-[#D8EFDF] text-[#078F36] font-bold shadow-2xs'
                  : 'text-[#777F79] hover:text-[#171B18]'
              }`}
            >
              Delivery
            </button>
          </div>
        </div>

        {/* Cart Item Rows */}
        <div className="flex-1 overflow-y-auto px-4 divide-y divide-[#E7EBE8]">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#777F79]">
              <div className="w-12 h-12 rounded-full bg-[#F5F6F5] flex items-center justify-center mb-2">
                <CategoryAllIcon className="w-6 h-6 text-[#777F79]" />
              </div>
              <p className="text-xs font-bold text-[#171B18]">Order is empty</p>
              <p className="text-[11px] text-[#777F79] mt-0.5">Select menu items on the left to add dishes</p>
            </div>
          ) : (
            cart.map((item, idx) => {
              const itemImg = getFoodImageUrl(item.name);

              return (
                <div key={item.id} className="py-3 flex items-center gap-3 text-xs">
                  {/* Food Thumbnail */}
                  <img
                    src={itemImg}
                    alt={item.name}
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0 bg-[#F5F6F5]"
                  />

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-xs text-[#171B18] truncate leading-tight">
                      {item.name} ({item.itemType === 'veg' ? 'Veg' : 'Non Veg'})
                    </h5>
                    {item.selectedVariant && (
                      <span className="text-[10px] text-[#078F36] block">&bull; {item.selectedVariant.name}</span>
                    )}
                    {item.selectedAddOns?.map((a, aIdx) => (
                      <span key={aIdx} className="text-[10px] text-[#777F79] block">+ {a.name}</span>
                    ))}
                    <div className="text-[11px] text-[#777F79] mt-0.5">
                      {currency}{item.unitPrice.toFixed(2)} &times; {item.quantity}
                    </div>
                  </div>

                  {/* Line total & controls */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="font-extrabold text-xs text-[#171B18]">
                      {currency}{item.totalPrice.toFixed(2)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateCartQty(idx, -1)}
                        className="w-5 h-5 rounded-md bg-[#F5F6F5] hover:bg-[#E7EBE8] text-[#171B18] flex items-center justify-center font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="text-[11px] font-bold text-[#171B18] px-0.5">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQty(idx, 1)}
                        className="w-5 h-5 rounded-md bg-[#F5F6F5] hover:bg-[#E7EBE8] text-[#171B18] flex items-center justify-center font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Billing Calculations & Payment Options */}
        <div className="p-4 bg-white border-t border-[#E7EBE8] space-y-3 text-xs">
          {/* Summary Breakdown matching reference */}
          <div className="space-y-1.5 text-xs text-[#777F79]">
            <div className="flex justify-between">
              <span>Sub Total</span>
              <span className="font-semibold text-[#171B18]">{currency}{subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-[#078F36]">
                <span>Discount</span>
                <span className="font-semibold">-{currency}{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Tax {taxRate}%</span>
              <span className="font-semibold text-[#171B18]">{currency}{taxAmount.toFixed(2)}</span>
            </div>
            {serviceChargeAmount > 0 && (
              <div className="flex justify-between">
                <span>Service Charge {serviceChargeRate}%</span>
                <span className="font-semibold text-[#171B18]">{currency}{serviceChargeAmount.toFixed(2)}</span>
              </div>
            )}
            
            {/* Dashed divider line */}
            <div className="border-t border-dashed border-[#E7EBE8] pt-2 flex justify-between items-center">
              <span className="font-extrabold text-sm text-[#171B18]">Total Amount</span>
              <span className="font-extrabold text-base text-[#171B18]">
                {currency}{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Method 3 Card Selectors matching screenshot */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                paymentMethod === 'cash'
                  ? 'bg-[#F0F8F3] border-[#078F36] text-[#078F36] font-bold'
                  : 'bg-white border-[#E7EBE8] text-[#777F79] hover:border-gray-300'
              }`}
            >
              <CashBillIcon className="w-5 h-5" />
              <span className="text-[10px]">Cash</span>
            </button>

            <button
              onClick={() => setPaymentMethod('card')}
              className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                paymentMethod === 'card'
                  ? 'bg-[#F0F8F3] border-[#078F36] text-[#078F36] font-bold'
                  : 'bg-white border-[#E7EBE8] text-[#777F79] hover:border-gray-300'
              }`}
            >
              <CardPaymentIcon className="w-5 h-5" />
              <span className="text-[10px] leading-tight text-center">Credit/Debit Card</span>
            </button>

            <button
              onClick={() => setPaymentMethod('upi')}
              className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                paymentMethod === 'upi'
                  ? 'bg-[#F0F8F3] border-[#078F36] text-[#078F36] font-bold'
                  : 'bg-white border-[#E7EBE8] text-[#777F79] hover:border-gray-300'
              }`}
            >
              <QrCodeIcon className="w-5 h-5" />
              <span className="text-[10px]">QR Code</span>
            </button>
          </div>

          {/* Hold Bill & Clear Cart Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleHoldBill}
              disabled={cart.length === 0}
              className="flex-1 py-1.5 rounded-lg border border-[#E7EBE8] bg-[#F5F6F5] hover:bg-gray-100 text-[#171B18] font-semibold text-xs disabled:opacity-40 transition-colors"
            >
              Hold Bill
            </button>
            <button
              onClick={() => {
                if (cart.length > 0 && window.confirm('Clear all dishes from order?')) {
                  setCart([]);
                  setDiscountAmount(0);
                }
              }}
              disabled={cart.length === 0}
              className="py-1.5 px-3 rounded-lg border border-[#E7EBE8] bg-white hover:bg-red-50 text-[#777F79] hover:text-[#D94A43] font-medium text-xs disabled:opacity-40 transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Full-width Solid Green Place Order Button matching screenshot */}
          <button
            onClick={handleOpenPayment}
            disabled={cart.length === 0}
            className="w-full py-3.5 bg-[#078F36] hover:bg-[#087A32] disabled:opacity-50 text-white rounded-xl font-extrabold text-sm shadow-md shadow-[#078F36]/20 transition-all flex items-center justify-center gap-2"
          >
            <span>Place Order</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. MODALS                                            */}
      {/* ---------------------------------------------------- */}

      {/* Item Customizer Modal */}
      {customizingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl border border-[#E7EBE8] shadow-2xl w-full max-w-sm text-[#171B18] p-5">
            <div className="flex items-start justify-between pb-3 border-b border-[#E7EBE8]">
              <div>
                <h3 className="font-extrabold text-sm text-[#171B18]">{customizingItem.name}</h3>
                <span className="text-xs text-[#078F36] font-bold">Base: {currency}{customizingItem.price}</span>
              </div>
              <button onClick={() => setCustomizingItem(null)} className="text-[#777F79] hover:text-[#171B18]">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 space-y-4 max-h-80 overflow-y-auto text-xs">
              {/* Variants */}
              {customizingItem.variants && customizingItem.variants.length > 0 && (
                <div>
                  <label className="block font-bold text-[#171B18] mb-1.5">Portion Size</label>
                  <div className="grid grid-cols-2 gap-2">
                    {customizingItem.variants.map(v => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        className={`p-2.5 rounded-xl border text-left flex justify-between ${
                          selectedVariant?.id === v.id
                            ? 'border-[#078F36] bg-[#F0F8F3] font-bold text-[#078F36]'
                            : 'border-[#E7EBE8] text-[#171B18]'
                        }`}
                      >
                        <span>{v.name}</span>
                        <span>{v.priceDelta > 0 ? `+${currency}${v.priceDelta}` : 'Default'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Addons */}
              {customizingItem.addOns && customizingItem.addOns.length > 0 && (
                <div>
                  <label className="block font-bold text-[#171B18] mb-1.5">Add-ons & Toppings</label>
                  <div className="space-y-1.5">
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
                          className={`w-full p-2.5 rounded-xl border text-left flex justify-between ${
                            isSelected
                              ? 'border-[#078F36] bg-[#F0F8F3] font-bold text-[#078F36]'
                              : 'border-[#E7EBE8] text-[#171B18]'
                          }`}
                        >
                          <span>{addon.name}</span>
                          <span>+{currency}{addon.price}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-[#171B18] mb-1.5">Special Instruction</label>
                <input
                  type="text"
                  placeholder="e.g. Less spicy, dressing on side"
                  value={itemNoteInput}
                  onChange={(e) => setItemNoteInput(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E7EBE8] rounded-xl text-xs focus:outline-none focus:border-[#078F36]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#E7EBE8] flex justify-end gap-2 text-xs">
              <button
                onClick={() => setCustomizingItem(null)}
                className="px-4 py-2 border border-[#E7EBE8] rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  addItemToCart(customizingItem, selectedVariant, selectedAddOns, 1, itemNoteInput);
                  setCustomizingItem(null);
                }}
                className="px-5 py-2 bg-[#078F36] hover:bg-[#087A32] text-white rounded-xl font-bold shadow-xs"
              >
                Add to Dish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Processing Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl border border-[#E7EBE8] shadow-2xl w-full max-w-md text-[#171B18] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-[#F5F6F5] border-b border-[#E7EBE8]">
              <div>
                <h3 className="font-extrabold text-sm text-[#171B18]">Settle Payment</h3>
                <span className="text-xs text-[#777F79]">Total: {currency}{grandTotal}</span>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-[#777F79] hover:text-[#171B18]">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Payment Methods */}
              <div className="grid grid-cols-4 gap-2">
                {(['cash', 'upi', 'card', 'other'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`py-2.5 rounded-xl border text-center font-bold uppercase transition-colors ${
                      paymentMethod === m
                        ? 'border-[#078F36] bg-[#F0F8F3] text-[#078F36]'
                        : 'border-[#E7EBE8] text-[#777F79]'
                    }`}
                  >
                    {m === 'upi' ? 'QR Code' : m}
                  </button>
                ))}
              </div>

              {/* Method Detail View */}
              {paymentMethod === 'cash' && (
                <div className="bg-[#F5F6F5] p-4 rounded-xl border border-[#E7EBE8] space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Cash Tendered:</span>
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                      className="w-32 px-3 py-1.5 bg-white border border-[#E7EBE8] rounded-lg font-bold text-right text-sm focus:outline-none focus:border-[#078F36]"
                    />
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-[#171B18] pt-2 border-t border-[#E7EBE8]">
                    <span>Change to Return:</span>
                    <span className="text-[#078F36]">
                      {currency}{Math.max(0, cashTendered - grandTotal)}
                    </span>
                  </div>
                </div>
              )}

              {paymentMethod === 'upi' && (
                <div className="flex flex-col items-center justify-center p-4 bg-[#F5F6F5] rounded-xl border border-[#E7EBE8]">
                  <span className="text-[11px] font-bold text-[#171B18] mb-2">Scan QR Code to Pay</span>
                  {upiQrDataUrl ? (
                    <img src={upiQrDataUrl} alt="UPI QR" className="w-44 h-44 rounded-xl border border-[#E7EBE8] bg-white p-2" />
                  ) : (
                    <div className="w-44 h-44 bg-white flex items-center justify-center text-[#777F79]">Loading QR...</div>
                  )}
                  <span className="text-[10px] text-[#777F79] mt-2 font-mono">UPI ID: {currentRestaurant?.upiId || 'payment@bank'}</span>
                </div>
              )}

              {paymentMethod === 'card' && (
                <div className="bg-[#F5F6F5] p-5 rounded-xl border border-[#E7EBE8] text-center">
                  <CardPaymentIcon className="w-8 h-8 text-[#078F36] mx-auto mb-2" />
                  <p className="font-bold text-xs text-[#171B18]">Swipe, Dip or Tap Card on Terminal</p>
                  <p className="text-[11px] text-[#777F79] mt-1">Confirm payment after authorization approval</p>
                </div>
              )}

              {paymentMethod === 'other' && (
                <div className="bg-[#F5F6F5] p-5 rounded-xl border border-[#E7EBE8] text-center">
                  <p className="font-semibold text-xs text-[#171B18]">Other Tender (Cheque, Food Coupon, House Account)</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-[#F5F6F5] border-t border-[#E7EBE8] flex justify-between items-center text-xs">
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 border border-[#E7EBE8] rounded-xl bg-white font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalizeOrder}
                className="px-5 py-2.5 bg-[#078F36] hover:bg-[#087A32] text-white rounded-xl font-bold shadow-md shadow-[#078F36]/20 flex items-center gap-1.5"
              >
                <CheckIcon className="w-4 h-4" />
                <span>Confirm & Print Bill</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Printing Modal */}
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
