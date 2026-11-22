export type Role = 'superadmin' | 'owner' | 'cashier' | 'kitchen';

export type RestaurantType = 
  | 'Restaurant' 
  | 'Cafe' 
  | 'Bakery' 
  | 'Fast Food' 
  | 'Hotel' 
  | 'Cloud Kitchen' 
  | 'Food Truck' 
  | 'Juice Shop' 
  | 'Ice Cream Shop' 
  | 'Multi-Cuisine Restaurant';

export type OrderType = 'dine_in' | 'takeaway' | 'delivery';
export type OrderStatus = 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'other';
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'billing';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  phone?: string;
  role: Role;
  restaurantId: string; // Tenant association
  isActive: boolean;
  createdAt: string;
}

export interface Restaurant {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  restaurantType: RestaurantType;
  logoUrl?: string;
  gstNumber?: string;
  fssaiNumber?: string;
  currency: string;
  currencySymbol: string;
  taxRatePercent: number;
  serviceChargePercent: number;
  invoicePrefix: string;
  upiId?: string;
  status: 'active' | 'suspended' | 'pending_approval';
  createdAt: string;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
}

export interface MenuItemVariant {
  id: string;
  name: string;
  priceDelta: number;
}

export interface MenuItemAddOn {
  id: string;
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  price: number;
  description?: string;
  itemType: 'veg' | 'non_veg' | 'egg' | 'vegan';
  isAvailable: boolean;
  taxPercent: number;
  prepTimeMinutes?: number;
  variants: MenuItemVariant[];
  addOns: MenuItemAddOn[];
  createdAt: string;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  itemType: 'veg' | 'non_veg' | 'egg' | 'vegan';
  basePrice: number;
  selectedVariant?: MenuItemVariant;
  selectedAddOns?: MenuItemAddOn[];
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  invoiceNumber: string;
  restaurantId: string;
  orderType: OrderType;
  tableId?: string;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  taxRatePercent: number;
  taxAmount: number;
  serviceChargePercent: number;
  serviceChargeAmount: number;
  finalTotal: number;
  paymentMethod?: PaymentMethod;
  paymentStatus: 'pending' | 'paid' | 'cancelled';
  orderStatus: OrderStatus;
  cancellationReason?: string;
  specialInstructions?: string;
  cashierId: string;
  cashierName: string;
  createdAt: string;
  completedAt?: string;
}

export interface RestaurantTable {
  id: string;
  restaurantId: string;
  tableNumber: string;
  capacity: number;
  status: TableStatus;
  currentOrderId?: string;
}

export interface InventoryItem {
  id: string;
  restaurantId: string;
  name: string;
  unit: string; // kg, g, l, pcs, packs
  currentStock: number;
  minimumStock: number;
  costPerUnit: number;
}

export interface StockMovement {
  id: string;
  restaurantId: string;
  inventoryItemId: string;
  itemName: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  recordedBy: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  restaurantId: string;
  name: string;
  phone: string;
  email?: string;
  totalSpent: number;
  totalVisits: number;
  lastVisit: string;
}

export interface PlatformAuditLog {
  id: string;
  targetRestaurantId?: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  details: string;
  timestamp: string;
}
