import {
  User,
  Restaurant,
  MenuCategory,
  MenuItem,
  Order,
  RestaurantTable,
  InventoryItem,
  StockMovement,
  Customer,
  PlatformAuditLog,
  Role,
  RestaurantType
} from '../types';
import { supabaseService } from './supabaseService';
import { isSupabaseConfigured } from './supabaseClient';

// SHA-256 Password Hash Helper using browser standard Web Crypto API
export async function hashPassword(plainText: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText + '_dineflow_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const STORAGE_KEY = 'dineflow_storage_v2';

interface DatabaseSchema {
  users: User[];
  restaurants: Restaurant[];
  categories: MenuCategory[];
  menuItems: MenuItem[];
  orders: Order[];
  tables: RestaurantTable[];
  inventory: InventoryItem[];
  stockMovements: StockMovement[];
  customers: Customer[];
  auditLogs: PlatformAuditLog[];
}

// Initial Seed Data
const INITIAL_RESTAURANTS: Restaurant[] = [
  {
    id: 'rest_grand_oak',
    name: 'The Grand Oak Tavern',
    ownerName: 'Subhashish Roy',
    email: 'owner@grandoak.com',
    phone: '+91 98765 43210',
    address: 'Plot 18, Heritage Avenue, Indiranagar, Bengaluru, KA 560038',
    restaurantType: 'Restaurant',
    gstNumber: '29ABCDE1234F1Z5',
    fssaiNumber: '11223344556677',
    currency: 'INR',
    currencySymbol: '₹',
    taxRatePercent: 5.0,
    serviceChargePercent: 2.5,
    invoicePrefix: 'GOT-',
    upiId: 'grandoak@icici',
    status: 'active',
    createdAt: '2026-01-15T09:00:00Z'
  }
];

// SHA-256 pre-computed for "password123"
const DEFAULT_PASSWORD_HASH = '1f82c80c2f821e2e4b370e7e7a5a8a18388484fcf138b39446343542eb6be963';

const INITIAL_USERS: User[] = [
  {
    id: 'usr_superadmin',
    email: 'admin@dineflow.internal',
    passwordHash: DEFAULT_PASSWORD_HASH,
    name: 'Platform Super Administrator',
    phone: '+91 99999 00000',
    role: 'superadmin',
    restaurantId: 'platform_system',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'usr_owner_oak',
    email: 'owner@grandoak.com',
    passwordHash: DEFAULT_PASSWORD_HASH,
    name: 'Subhashish Roy',
    phone: '+91 98765 43210',
    role: 'owner',
    restaurantId: 'rest_grand_oak',
    isActive: true,
    createdAt: '2026-01-15T09:00:00Z'
  },
  {
    id: 'usr_cashier_oak',
    email: 'cashier@grandoak.com',
    passwordHash: DEFAULT_PASSWORD_HASH,
    name: 'Kavita Deshmukh',
    phone: '+91 98765 22222',
    role: 'cashier',
    restaurantId: 'rest_grand_oak',
    isActive: true,
    createdAt: '2026-01-20T10:00:00Z'
  },
  {
    id: 'usr_kitchen_oak',
    email: 'kitchen@grandoak.com',
    passwordHash: DEFAULT_PASSWORD_HASH,
    name: 'Chef Anand K',
    phone: '+91 98765 33333',
    role: 'kitchen',
    restaurantId: 'rest_grand_oak',
    isActive: true,
    createdAt: '2026-01-20T10:00:00Z'
  }
];

const INITIAL_CATEGORIES: MenuCategory[] = [
  { id: 'cat_starters', restaurantId: 'rest_grand_oak', name: 'Starters & Small Plates', slug: 'starters', displayOrder: 1, isActive: true },
  { id: 'cat_pizzas', restaurantId: 'rest_grand_oak', name: 'Woodfired Pizzas', slug: 'woodfired-pizzas', displayOrder: 2, isActive: true },
  { id: 'cat_burgers', restaurantId: 'rest_grand_oak', name: 'Artisan Burgers', slug: 'artisan-burgers', displayOrder: 3, isActive: true },
  { id: 'cat_beverages', restaurantId: 'rest_grand_oak', name: 'Beverages & Brews', slug: 'beverages', displayOrder: 4, isActive: true }
];

const INITIAL_ITEMS: MenuItem[] = [
  {
    id: 'item_truffle_fries',
    restaurantId: 'rest_grand_oak',
    categoryId: 'cat_starters',
    name: 'Parmesan Truffle Fries',
    price: 240,
    description: 'Crispy skin-on russet potatoes, aged parmesan, rosemary and black truffle essence.',
    itemType: 'veg',
    isAvailable: true,
    taxPercent: 5.0,
    prepTimeMinutes: 10,
    variants: [],
    addOns: [{ id: 'ao_aioli', name: 'Garlic Herb Aioli Dip', price: 40 }],
    createdAt: '2026-01-16T10:00:00Z'
  },
  {
    id: 'item_smokey_wings',
    restaurantId: 'rest_grand_oak',
    categoryId: 'cat_starters',
    name: 'Smoked Hickory Chicken Wings',
    price: 360,
    description: 'Slow-smoked chicken wings tossed in fiery molasses BBQ glaze with blue cheese dip.',
    itemType: 'non_veg',
    isAvailable: true,
    taxPercent: 5.0,
    prepTimeMinutes: 14,
    variants: [
      { id: 'v_6pc', name: '6 Pieces', priceDelta: 0 },
      { id: 'v_12pc', name: '12 Pieces (Sharing)', priceDelta: 240 }
    ],
    addOns: [],
    createdAt: '2026-01-16T10:00:00Z'
  },
  {
    id: 'item_margherita',
    restaurantId: 'rest_grand_oak',
    categoryId: 'cat_pizzas',
    name: 'Classic Margherita Napoletana',
    price: 395,
    description: 'San Marzano tomato sauce, fior di latte mozzarella, fresh basil and extra virgin olive oil.',
    itemType: 'veg',
    isAvailable: true,
    taxPercent: 5.0,
    prepTimeMinutes: 12,
    variants: [
      { id: 'v_10in', name: '10 Inch Regular', priceDelta: 0 },
      { id: 'v_12in', name: '12 Inch Large', priceDelta: 130 }
    ],
    addOns: [
      { id: 'ao_mozz', name: 'Extra Buffalo Mozzarella', price: 70 },
      { id: 'ao_jalapeno', name: 'Pickled Jalapenos', price: 35 }
    ],
    createdAt: '2026-01-16T10:00:00Z'
  },
  {
    id: 'item_pepperoni_pizza',
    restaurantId: 'rest_grand_oak',
    categoryId: 'cat_pizzas',
    name: 'Woodfired Pepperoni Rustica',
    price: 520,
    description: 'Spicy artisanal lamb pepperoni, mozzarella, roasted red peppers and chili blossom honey.',
    itemType: 'non_veg',
    isAvailable: true,
    taxPercent: 5.0,
    prepTimeMinutes: 14,
    variants: [
      { id: 'v_10in_pep', name: '10 Inch Regular', priceDelta: 0 },
      { id: 'v_12in_pep', name: '12 Inch Large', priceDelta: 150 }
    ],
    addOns: [{ id: 'ao_crust', name: 'Cheese Burst Crust', price: 90 }],
    createdAt: '2026-01-16T10:00:00Z'
  },
  {
    id: 'item_classic_burger',
    restaurantId: 'rest_grand_oak',
    categoryId: 'cat_burgers',
    name: 'Signature Double Smash Burger',
    price: 430,
    description: 'Double seared patties, aged English cheddar, caramelized onions, house pickle on brioche.',
    itemType: 'non_veg',
    isAvailable: true,
    taxPercent: 5.0,
    prepTimeMinutes: 12,
    variants: [],
    addOns: [{ id: 'ao_bacon', name: 'Crispy Bacon Rasher', price: 80 }],
    createdAt: '2026-01-16T10:00:00Z'
  },
  {
    id: 'item_iced_latte',
    restaurantId: 'rest_grand_oak',
    categoryId: 'cat_beverages',
    name: 'Single Origin Cold Brew Latte',
    price: 220,
    description: '18-hour slow extracted Arabica beans, Madagascar vanilla bean syrup and chilled milk.',
    itemType: 'veg',
    isAvailable: true,
    taxPercent: 5.0,
    prepTimeMinutes: 4,
    variants: [],
    addOns: [],
    createdAt: '2026-01-16T10:00:00Z'
  }
];

const INITIAL_TABLES: RestaurantTable[] = [
  { id: 'tbl_1', restaurantId: 'rest_grand_oak', tableNumber: 'T-01', capacity: 2, status: 'available' },
  { id: 'tbl_2', restaurantId: 'rest_grand_oak', tableNumber: 'T-02', capacity: 4, status: 'occupied', currentOrderId: 'ord_201' },
  { id: 'tbl_3', restaurantId: 'rest_grand_oak', tableNumber: 'T-03', capacity: 4, status: 'available' },
  { id: 'tbl_4', restaurantId: 'rest_grand_oak', tableNumber: 'T-04', capacity: 6, status: 'billing', currentOrderId: 'ord_202' },
  { id: 'tbl_5', restaurantId: 'rest_grand_oak', tableNumber: 'T-05', capacity: 2, status: 'reserved' },
  { id: 'tbl_6', restaurantId: 'rest_grand_oak', tableNumber: 'T-06', capacity: 8, status: 'available' }
];

const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord_201',
    orderNumber: 'ORD-201',
    invoiceNumber: 'GOT-2026-1001',
    restaurantId: 'rest_grand_oak',
    orderType: 'dine_in',
    tableId: 'tbl_2',
    tableNumber: 'T-02',
    customerName: 'Vikram Seth',
    customerPhone: '+91 98860 11223',
    items: [
      {
        id: 'oi_1',
        menuItemId: 'item_margherita',
        name: 'Classic Margherita Napoletana',
        itemType: 'veg',
        basePrice: 395,
        selectedVariant: { id: 'v_10in', name: '10 Inch Regular', priceDelta: 0 },
        quantity: 1,
        unitPrice: 395,
        totalPrice: 395,
        notes: 'Extra crispy crust'
      },
      {
        id: 'oi_2',
        menuItemId: 'item_truffle_fries',
        name: 'Parmesan Truffle Fries',
        itemType: 'veg',
        basePrice: 240,
        quantity: 1,
        unitPrice: 240,
        totalPrice: 240
      }
    ],
    subtotal: 635,
    discountAmount: 0,
    taxRatePercent: 5.0,
    taxAmount: 31.75,
    serviceChargePercent: 2.5,
    serviceChargeAmount: 15.88,
    finalTotal: 683,
    paymentStatus: 'pending',
    orderStatus: 'preparing',
    cashierId: 'usr_cashier_oak',
    cashierName: 'Kavita Deshmukh',
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString()
  },
  {
    id: 'ord_202',
    orderNumber: 'ORD-202',
    invoiceNumber: 'GOT-2026-1002',
    restaurantId: 'rest_grand_oak',
    orderType: 'dine_in',
    tableId: 'tbl_4',
    tableNumber: 'T-04',
    customerName: 'Pooja Hegde',
    customerPhone: '+91 97412 55667',
    items: [
      {
        id: 'oi_3',
        menuItemId: 'item_pepperoni_pizza',
        name: 'Woodfired Pepperoni Rustica',
        itemType: 'non_veg',
        basePrice: 520,
        selectedVariant: { id: 'v_12in_pep', name: '12 Inch Large', priceDelta: 150 },
        quantity: 1,
        unitPrice: 670,
        totalPrice: 670
      },
      {
        id: 'oi_4',
        menuItemId: 'item_iced_latte',
        name: 'Single Origin Cold Brew Latte',
        itemType: 'veg',
        basePrice: 220,
        quantity: 2,
        unitPrice: 220,
        totalPrice: 440
      }
    ],
    subtotal: 1110,
    discountAmount: 50,
    taxRatePercent: 5.0,
    taxAmount: 53.0,
    serviceChargePercent: 2.5,
    serviceChargeAmount: 26.5,
    finalTotal: 1140,
    paymentStatus: 'pending',
    orderStatus: 'ready',
    cashierId: 'usr_cashier_oak',
    cashierName: 'Kavita Deshmukh',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString()
  },
  {
    id: 'ord_200',
    orderNumber: 'ORD-200',
    invoiceNumber: 'GOT-2026-1000',
    restaurantId: 'rest_grand_oak',
    orderType: 'takeaway',
    customerName: 'Rohit Sharma',
    customerPhone: '+91 94480 99887',
    items: [
      {
        id: 'oi_5',
        menuItemId: 'item_classic_burger',
        name: 'Signature Double Smash Burger',
        itemType: 'non_veg',
        basePrice: 430,
        quantity: 2,
        unitPrice: 430,
        totalPrice: 860
      }
    ],
    subtotal: 860,
    discountAmount: 0,
    taxRatePercent: 5.0,
    taxAmount: 43.0,
    serviceChargePercent: 0,
    serviceChargeAmount: 0,
    finalTotal: 903,
    paymentMethod: 'upi',
    paymentStatus: 'paid',
    orderStatus: 'completed',
    cashierId: 'usr_cashier_oak',
    cashierName: 'Kavita Deshmukh',
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 72 * 60 * 1000).toISOString()
  }
];

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 'inv_flour', restaurantId: 'rest_grand_oak', name: 'Italian Tipo 00 Sourdough Flour', unit: 'kg', currentStock: 48, minimumStock: 30, costPerUnit: 95 },
  { id: 'inv_mozz', restaurantId: 'rest_grand_oak', name: 'Fresh Fior Di Latte Mozzarella', unit: 'kg', currentStock: 5.5, minimumStock: 10, costPerUnit: 480 },
  { id: 'inv_pep', restaurantId: 'rest_grand_oak', name: 'Smoked Lamb Pepperoni', unit: 'kg', currentStock: 8.2, minimumStock: 6, costPerUnit: 880 },
  { id: 'inv_beans', restaurantId: 'rest_grand_oak', name: 'Single Origin Arabica Beans', unit: 'kg', currentStock: 12, minimumStock: 8, costPerUnit: 1100 }
];

const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'cust_1', restaurantId: 'rest_grand_oak', name: 'Vikram Seth', phone: '+91 98860 11223', totalSpent: 4250, totalVisits: 5, lastVisit: '2026-11-21' },
  { id: 'cust_2', restaurantId: 'rest_grand_oak', name: 'Pooja Hegde', phone: '+91 97412 55667', totalSpent: 6890, totalVisits: 7, lastVisit: '2026-11-21' },
  { id: 'cust_3', restaurantId: 'rest_grand_oak', name: 'Rohit Sharma', phone: '+91 94480 99887', totalSpent: 2850, totalVisits: 3, lastVisit: '2026-11-21' }
];

class BackendService {
  private listeners: Set<() => void> = new Set();
  private failedLoginAttempts: Map<string, { count: number; lastFailed: number }> = new Map();

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    this.listeners.forEach(fn => fn());
  }

  private loadDB(): DatabaseSchema {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const initData: DatabaseSchema = {
          users: INITIAL_USERS,
          restaurants: INITIAL_RESTAURANTS,
          categories: INITIAL_CATEGORIES,
          menuItems: INITIAL_ITEMS,
          orders: INITIAL_ORDERS,
          tables: INITIAL_TABLES,
          inventory: INITIAL_INVENTORY,
          stockMovements: [],
          customers: INITIAL_CUSTOMERS,
          auditLogs: []
        };
        this.saveDB(initData);
        return initData;
      }
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse database, resetting store:', e);
      return {
        users: INITIAL_USERS,
        restaurants: INITIAL_RESTAURANTS,
        categories: INITIAL_CATEGORIES,
        menuItems: INITIAL_ITEMS,
        orders: INITIAL_ORDERS,
        tables: INITIAL_TABLES,
        inventory: INITIAL_INVENTORY,
        stockMovements: [],
        customers: INITIAL_CUSTOMERS,
        auditLogs: []
      };
    }
  }

  private saveDB(db: DatabaseSchema): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      this.notify();
    } catch (e) {
      console.error('Database write error:', e);
    }
  }

  // --- TENANT SECURITY VALIDATION ---
  private verifyTenantAccess(caller: { restaurantId: string; role: Role }, targetRestaurantId: string): void {
    if (caller.role === 'superadmin') return; // Super admin has global oversight
    if (caller.restaurantId !== targetRestaurantId) {
      throw new Error(`Security Violation: Cross-tenant access denied. Caller from ${caller.restaurantId} cannot access data of ${targetRestaurantId}`);
    }
  }

  // --- AUTHENTICATION & LOGIN ---
  public async login(email: string, plainTextPassword: string): Promise<User> {
    const key = email.toLowerCase().trim();

    // Check rate limiting (brute force protection)
    const rateInfo = this.failedLoginAttempts.get(key);
    if (rateInfo && rateInfo.count >= 5 && Date.now() - rateInfo.lastFailed < 60000) {
      const waitSeconds = Math.ceil((60000 - (Date.now() - rateInfo.lastFailed)) / 1000);
      throw new Error(`Too many failed login attempts. Please wait ${waitSeconds} seconds before trying again.`);
    }

    const db = this.loadDB();
    const user = db.users.find(u => u.email.toLowerCase() === key && u.isActive);

    if (!user) {
      this.recordFailedAttempt(key);
      throw new Error('Invalid email or password.');
    }

    // Verify restaurant is active (unless superadmin)
    if (user.role !== 'superadmin') {
      const rest = db.restaurants.find(r => r.id === user.restaurantId);
      if (!rest || rest.status === 'suspended') {
        throw new Error('This restaurant account is currently suspended. Please contact platform support.');
      }
      if (rest.status === 'pending_approval') {
        throw new Error('Restaurant account registration is awaiting platform administrator approval.');
      }
    }

    // Verify password hash
    const inputHash = await hashPassword(plainTextPassword);
    if (user.passwordHash !== inputHash) {
      this.recordFailedAttempt(key);
      throw new Error('Invalid email or password.');
    }

    // Reset rate limiter on successful authentication
    this.failedLoginAttempts.delete(key);
    return user;
  }

  private recordFailedAttempt(key: string): void {
    const current = this.failedLoginAttempts.get(key) || { count: 0, lastFailed: 0 };
    this.failedLoginAttempts.set(key, { count: current.count + 1, lastFailed: Date.now() });
  }

  // --- RESTAURANT REGISTRATION (ONBOARDING) ---
  public async registerRestaurant(data: {
    restaurantName: string;
    ownerName: string;
    email: string;
    phone: string;
    password: string;
    address: string;
    restaurantType: RestaurantType;
    gstNumber?: string;
    fssaiNumber?: string;
  }): Promise<{ user: User; restaurant: Restaurant }> {
    const db = this.loadDB();
    const emailKey = data.email.toLowerCase().trim();

    // Check email uniqueness
    if (db.users.some(u => u.email.toLowerCase() === emailKey)) {
      throw new Error('An account with this email address already exists.');
    }

    const restaurantId = 'rest_' + Date.now();
    const userId = 'usr_' + Date.now();
    const passwordHash = await hashPassword(data.password);

    const newRestaurant: Restaurant = {
      id: restaurantId,
      name: data.restaurantName.trim(),
      ownerName: data.ownerName.trim(),
      email: emailKey,
      phone: data.phone.trim(),
      address: data.address.trim(),
      restaurantType: data.restaurantType,
      gstNumber: data.gstNumber?.trim() || undefined,
      fssaiNumber: data.fssaiNumber?.trim() || undefined,
      currency: 'INR',
      currencySymbol: '₹',
      taxRatePercent: 5.0,
      serviceChargePercent: 0,
      invoicePrefix: data.restaurantName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() + '-',
      status: 'active',
      createdAt: new Date().toISOString()
    };

    const newOwner: User = {
      id: userId,
      email: emailKey,
      passwordHash,
      name: data.ownerName.trim(),
      phone: data.phone.trim(),
      role: 'owner',
      restaurantId,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    // Initialize default starter categories and tables
    const defaultCategories: MenuCategory[] = [
      { id: 'cat_' + Date.now() + '_1', restaurantId, name: 'Main Courses', slug: 'mains', displayOrder: 1, isActive: true },
      { id: 'cat_' + Date.now() + '_2', restaurantId, name: 'Beverages', slug: 'beverages', displayOrder: 2, isActive: true }
    ];

    const defaultTables: RestaurantTable[] = [
      { id: 'tbl_' + Date.now() + '_1', restaurantId, tableNumber: 'T-01', capacity: 2, status: 'available' },
      { id: 'tbl_' + Date.now() + '_2', restaurantId, tableNumber: 'T-02', capacity: 4, status: 'available' },
      { id: 'tbl_' + Date.now() + '_3', restaurantId, tableNumber: 'T-03', capacity: 4, status: 'available' }
    ];

    db.restaurants.push(newRestaurant);
    db.users.push(newOwner);
    db.categories.push(...defaultCategories);
    db.tables.push(...defaultTables);

    this.saveDB(db);
    return { user: newOwner, restaurant: newRestaurant };
  }

  // --- RESTAURANTS ---
  public getRestaurant(caller: { restaurantId: string; role: Role }, restaurantId: string): Restaurant {
    this.verifyTenantAccess(caller, restaurantId);
    const db = this.loadDB();
    const r = db.restaurants.find(rest => rest.id === restaurantId);
    if (!r) throw new Error('Restaurant not found');
    return r;
  }

  public updateRestaurantSettings(caller: { restaurantId: string; role: Role }, restaurant: Restaurant): void {
    if (caller.role !== 'owner' && caller.role !== 'superadmin') {
      throw new Error('Only the restaurant owner or super admin can modify restaurant settings.');
    }
    this.verifyTenantAccess(caller, restaurant.id);
    const db = this.loadDB();
    const idx = db.restaurants.findIndex(r => r.id === restaurant.id);
    if (idx >= 0) {
      db.restaurants[idx] = restaurant;
      this.saveDB(db);
    }
  }

  // --- MENU CATEGORIES ---
  public getCategories(caller: { restaurantId: string; role: Role }, restaurantId: string): MenuCategory[] {
    this.verifyTenantAccess(caller, restaurantId);
    const db = this.loadDB();
    return db.categories
      .filter(c => c.restaurantId === restaurantId && c.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  public saveCategory(caller: { restaurantId: string; role: Role }, category: MenuCategory): void {
    if (caller.role !== 'owner' && caller.role !== 'superadmin') {
      throw new Error('Unauthorized: Only owner can manage menu categories.');
    }
    this.verifyTenantAccess(caller, category.restaurantId);
    const db = this.loadDB();
    const idx = db.categories.findIndex(c => c.id === category.id);
    if (idx >= 0) db.categories[idx] = category;
    else db.categories.push(category);
    this.saveDB(db);
  }

  public deleteCategory(caller: { restaurantId: string; role: Role }, restaurantId: string, categoryId: string): void {
    if (caller.role !== 'owner' && caller.role !== 'superadmin') {
      throw new Error('Unauthorized');
    }
    this.verifyTenantAccess(caller, restaurantId);
    const db = this.loadDB();
    // Verify no menu items are under this category
    const count = db.menuItems.filter(i => i.restaurantId === restaurantId && i.categoryId === categoryId).length;
    if (count > 0) {
      throw new Error(`Cannot delete category because it contains ${count} menu item(s). Reassign them first.`);
    }
    db.categories = db.categories.filter(c => c.id !== categoryId);
    this.saveDB(db);
  }

  // --- MENU ITEMS ---
  public getMenuItems(caller: { restaurantId: string; role: Role }, restaurantId: string): MenuItem[] {
    this.verifyTenantAccess(caller, restaurantId);
    const db = this.loadDB();
    return db.menuItems.filter(i => i.restaurantId === restaurantId);
  }

  public saveMenuItem(caller: { restaurantId: string; role: Role }, item: MenuItem): void {
    if (caller.role !== 'owner' && caller.role !== 'superadmin') {
      throw new Error('Unauthorized: Only restaurant owner can add or edit menu items.');
    }
    this.verifyTenantAccess(caller, item.restaurantId);
    const db = this.loadDB();
    const idx = db.menuItems.findIndex(i => i.id === item.id);
    if (idx >= 0) db.menuItems[idx] = item;
    else db.menuItems.push(item);
    this.saveDB(db);
  }

  public deleteMenuItem(caller: { restaurantId: string; role: Role }, restaurantId: string, itemId: string): void {
    if (caller.role !== 'owner' && caller.role !== 'superadmin') {
      throw new Error('Unauthorized');
    }
    this.verifyTenantAccess(caller, restaurantId);
    const db = this.loadDB();
    db.menuItems = db.menuItems.filter(i => i.id !== itemId);
    this.saveDB(db);
  }

  // --- TABLES ---
  public getTables(caller: { restaurantId: string; role: Role }, restaurantId: string): RestaurantTable[] {
    this.verifyTenantAccess(caller, restaurantId);
    const db = this.loadDB();
    return db.tables.filter(t => t.restaurantId === restaurantId);
  }

  public saveTable(caller: { restaurantId: string; role: Role }, table: RestaurantTable): void {
    if (caller.role !== 'owner' && caller.role !== 'superadmin') {
      throw new Error('Unauthorized: Only owner can configure tables.');
    }
    this.verifyTenantAccess(caller, table.restaurantId);
    const db = this.loadDB();
    const idx = db.tables.findIndex(t => t.id === table.id);
    if (idx >= 0) db.tables[idx] = table;
    else db.tables.push(table);
    this.saveDB(db);
  }

  public deleteTable(caller: { restaurantId: string; role: Role }, restaurantId: string, tableId: string): void {
    if (caller.role !== 'owner' && caller.role !== 'superadmin') {
      throw new Error('Unauthorized');
    }
    this.verifyTenantAccess(caller, restaurantId);
    const db = this.loadDB();
    db.tables = db.tables.filter(t => t.id !== tableId);
    this.saveDB(db);
  }

  // --- ORDERS & TRANSACTIONS ---
  public getOrders(caller: { restaurantId: string; role: Role }, restaurantId: string): Order[] {
    this.verifyTenantAccess(caller, restaurantId);
    const db = this.loadDB();
    return db.orders
      .filter(o => o.restaurantId === restaurantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getOrderById(caller: { restaurantId: string; role: Role }, restaurantId: string, orderId: string): Order | undefined {
    this.verifyTenantAccess(caller, restaurantId);
    const db = this.loadDB();
    return db.orders.find(o => o.id === orderId && o.restaurantId === restaurantId);
  }

  // Atomic Order Confirmation Transaction
  public createOrder(caller: { restaurantId: string; role: Role; userId: string; name: string }, order: Order): Order {
    this.verifyTenantAccess(caller, order.restaurantId);
    const db = this.loadDB();

    // Generate safe sequential invoice number
    const rest = db.restaurants.find(r => r.id === order.restaurantId);
    const prefix = rest?.invoicePrefix || 'INV-';
    const year = new Date().getFullYear();
    const count = db.orders.filter(o => o.restaurantId === order.restaurantId).length + 1001;
    const invoiceNumber = `${prefix}${year}-${count}`;

    const finalOrder: Order = {
      ...order,
      invoiceNumber,
      cashierId: caller.userId,
      cashierName: caller.name,
      createdAt: new Date().toISOString()
    };

    db.orders.unshift(finalOrder);

    // Update table status if table is assigned
    if (finalOrder.tableId) {
      const table = db.tables.find(t => t.id === finalOrder.tableId && t.restaurantId === finalOrder.restaurantId);
      if (table) {
        table.status = finalOrder.paymentStatus === 'paid' ? 'available' : 'occupied';
        table.currentOrderId = finalOrder.paymentStatus === 'paid' ? undefined : finalOrder.id;
      }
    }

    // Record customer visit if phone is provided
    if (finalOrder.customerPhone && finalOrder.customerPhone.trim()) {
      const phone = finalOrder.customerPhone.trim();
      const cust = db.customers.find(c => c.phone === phone && c.restaurantId === finalOrder.restaurantId);
      if (cust) {
        cust.totalSpent += finalOrder.finalTotal;
        cust.totalVisits += 1;
        cust.lastVisit = new Date().toISOString().split('T')[0];
        if (finalOrder.customerName) cust.name = finalOrder.customerName;
      } else {
        db.customers.push({
          id: 'cust_' + Date.now(),
          restaurantId: finalOrder.restaurantId,
          name: finalOrder.customerName || 'Guest Customer',
          phone,
          totalSpent: finalOrder.finalTotal,
          totalVisits: 1,
          lastVisit: new Date().toISOString().split('T')[0]
        });
      }
    }

    this.saveDB(db);

    // Sync to Supabase cloud in background if configured
    if (isSupabaseConfigured) {
      supabaseService.pushOrder(finalOrder);
      if (finalOrder.tableId) {
        supabaseService.updateTableStatus(
          finalOrder.tableId,
          finalOrder.restaurantId,
          finalOrder.paymentStatus === 'paid' ? 'available' : 'occupied',
          finalOrder.paymentStatus === 'paid' ? undefined : finalOrder.id
        );
      }
    }

    return finalOrder;
  }

  public updateOrderStatus(caller: { restaurantId: string; role: Role }, restaurantId: string, orderId: string, status: Order['orderStatus']): void {
    this.verifyTenantAccess(caller, restaurantId);
    const db = this.loadDB();
    const order = db.orders.find(o => o.id === orderId && o.restaurantId === restaurantId);
    if (!order) throw new Error('Order not found');

    order.orderStatus = status;
    if (status === 'completed') {
      order.completedAt = new Date().toISOString();
      if (order.tableId) {
        const table = db.tables.find(t => t.id === order.tableId);
        if (table && table.currentOrderId === order.id) {
          table.status = 'available';
          table.currentOrderId = undefined;
        }
      }
    }
    this.saveDB(db);

    // Sync status update to Supabase cloud
    if (isSupabaseConfigured) {
      supabaseService.updateOrderStatus(orderId, restaurantId, status);
    }
  }

  public cancelOrder(caller: { restaurantId: string; role: Role; name: string }, restaurantId: string, orderId: string, reason: string): void {
    // Only owner or cashier can cancel
    if (caller.role !== 'owner' && caller.role !== 'cashier') {
      throw new Error('Unauthorized: Permission required to cancel bills.');
    }
    this.verifyTenantAccess(caller, restaurantId);
    const db = this.loadDB();
    const order = db.orders.find(o => o.id === orderId && o.restaurantId === restaurantId);
    if (!order) throw new Error('Order not found');

    order.orderStatus = 'cancelled';
    order.paymentStatus = 'cancelled';
    order.cancellationReason = reason;

    // Free up table if occupied
    if (order.tableId) {
      const table = db.tables.find(t => t.id === order.tableId);
      if (table && table.currentOrderId === order.id) {
        table.status = 'available';
        table.currentOrderId = undefined;
      }
    }

    // Add immutable platform audit log
    db.auditLogs.unshift({
      id: 'aud_' + Date.now(),
      targetRestaurantId: restaurantId,
      actorId: caller.restaurantId,
      actorName: caller.name,
      actorRole: caller.role,
      action: 'BILL_CANCELLED',
      details: `Invoice #${order.invoiceNumber} (Order #${order.orderNumber}) for ₹${order.finalTotal} was cancelled. Reason: ${reason}`,
      timestamp: new Date().toISOString()
    });

    this.saveDB(db);

    // Sync cancelled status to Supabase cloud
    if (isSupabaseConfigured) {
      supabaseService.updateOrderStatus(orderId, restaurantId, 'cancelled');
    }
  }

  // --- BASIC INVENTORY ---
  public getInventory(caller: { restaurantId: string; role: Role }, restaurantId: string): InventoryItem[] {
    this.verifyTenantAccess(caller, restaurantId);
    const db = this.loadDB();
    return db.inventory.filter(i => i.restaurantId === restaurantId);
  }

  public saveInventoryItem(caller: { restaurantId: string; role: Role }, item: InventoryItem): void {
    if (caller.role !== 'owner') throw new Error('Unauthorized');
    this.verifyTenantAccess(caller, item.restaurantId);
    const db = this.loadDB();
    const idx = db.inventory.findIndex(i => i.id === item.id);
    if (idx >= 0) db.inventory[idx] = item;
    else db.inventory.push(item);
    this.saveDB(db);
  }

  public adjustStock(
    caller: { restaurantId: string; role: Role; name: string },
    restaurantId: string,
    itemId: string,
    type: 'in' | 'out' | 'adjustment',
    quantity: number,
    reason: string
  ): void {
    this.verifyTenantAccess(caller, restaurantId);
    const db = this.loadDB();
    const item = db.inventory.find(i => i.id === itemId && i.restaurantId === restaurantId);
    if (!item) throw new Error('Inventory item not found');

    const previousStock = item.currentStock;
    let newStock = previousStock;

    if (type === 'in') newStock = previousStock + quantity;
    else if (type === 'out') newStock = Math.max(0, previousStock - quantity);
    else if (type === 'adjustment') newStock = quantity;

    item.currentStock = newStock;

    db.stockMovements.unshift({
      id: 'sm_' + Date.now(),
      restaurantId,
      inventoryItemId: item.id,
      itemName: item.name,
      type,
      quantity,
      previousStock,
      newStock,
      reason,
      recordedBy: caller.name,
      createdAt: new Date().toISOString()
    });

    this.saveDB(db);
  }

  public getStockMovements(caller: { restaurantId: string; role: Role }, restaurantId: string): StockMovement[] {
    this.verifyTenantAccess(caller, restaurantId);
    const db = this.loadDB();
    return db.stockMovements.filter(m => m.restaurantId === restaurantId);
  }

  // --- STAFF MANAGEMENT ---
  public getStaff(caller: { restaurantId: string; role: Role }, restaurantId: string): User[] {
    if (caller.role !== 'owner' && caller.role !== 'superadmin') {
      throw new Error('Unauthorized');
    }
    this.verifyTenantAccess(caller, restaurantId);
    const db = this.loadDB();
    return db.users.filter(u => u.restaurantId === restaurantId);
  }

  public async createStaff(
    caller: { restaurantId: string; role: Role },
    restaurantId: string,
    data: { name: string; email: string; phone?: string; role: 'cashier' | 'kitchen'; password: string }
  ): Promise<User> {
    if (caller.role !== 'owner' && caller.role !== 'superadmin') {
      throw new Error('Unauthorized: Only restaurant owners can create staff.');
    }
    this.verifyTenantAccess(caller, restaurantId);
    const db = this.loadDB();
    const emailKey = data.email.toLowerCase().trim();

    if (db.users.some(u => u.email.toLowerCase() === emailKey)) {
      throw new Error('A user with this email already exists.');
    }

    const passwordHash = await hashPassword(data.password);
    const newUser: User = {
      id: 'usr_' + Date.now(),
      email: emailKey,
      passwordHash,
      name: data.name.trim(),
      phone: data.phone?.trim(),
      role: data.role,
      restaurantId,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    this.saveDB(db);
    return newUser;
  }

  public toggleStaffStatus(caller: { restaurantId: string; role: Role; userId: string }, restaurantId: string, targetUserId: string): void {
    if (caller.role !== 'owner' && caller.role !== 'superadmin') {
      throw new Error('Unauthorized');
    }
    this.verifyTenantAccess(caller, restaurantId);
    if (caller.userId === targetUserId) {
      throw new Error('Cannot deactivate your own logged-in account.');
    }
    const db = this.loadDB();
    const staff = db.users.find(u => u.id === targetUserId && u.restaurantId === restaurantId);
    if (!staff) throw new Error('Staff member not found');
    staff.isActive = !staff.isActive;
    this.saveDB(db);
  }

  // --- CUSTOMERS ---
  public getCustomers(caller: { restaurantId: string; role: Role }, restaurantId: string): Customer[] {
    this.verifyTenantAccess(caller, restaurantId);
    const db = this.loadDB();
    return db.customers.filter(c => c.restaurantId === restaurantId);
  }

  // --- SUPER ADMIN MASTER METHODS ---
  public getAllRestaurants(caller: { role: Role }): Restaurant[] {
    if (caller.role !== 'superadmin') throw new Error('Unauthorized: Super Admin access required.');
    const db = this.loadDB();
    return db.restaurants;
  }

  public setRestaurantStatus(caller: { role: Role; name: string }, restaurantId: string, status: Restaurant['status']): void {
    if (caller.role !== 'superadmin') throw new Error('Unauthorized: Super Admin access required.');
    const db = this.loadDB();
    const rest = db.restaurants.find(r => r.id === restaurantId);
    if (!rest) throw new Error('Restaurant not found');
    const oldStatus = rest.status;
    rest.status = status;

    db.auditLogs.unshift({
      id: 'aud_' + Date.now(),
      targetRestaurantId: restaurantId,
      actorId: 'usr_superadmin',
      actorName: caller.name,
      actorRole: 'superadmin',
      action: 'RESTAURANT_STATUS_CHANGED',
      details: `Restaurant ${rest.name} (${restaurantId}) changed from ${oldStatus} to ${status}`,
      timestamp: new Date().toISOString()
    });

    this.saveDB(db);
  }

  public getPlatformAuditLogs(caller: { role: Role }): PlatformAuditLog[] {
    if (caller.role !== 'superadmin') throw new Error('Unauthorized: Super Admin access required.');
    const db = this.loadDB();
    return db.auditLogs;
  }
}

export const backend = new BackendService();
