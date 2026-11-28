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
  PaymentTransaction,
  Role,
} from '../types';
import { supabaseService } from './supabaseService';
import { isSupabaseConfigured } from './supabaseClient';
import { offlineQueue, OfflineOperation } from './offlineQueue';

interface TenantCache {
  restaurant: Restaurant | null;
  categories: MenuCategory[];
  menuItems: MenuItem[];
  orders: Order[];
  tables: RestaurantTable[];
  inventory: InventoryItem[];
  stockMovements: StockMovement[];
  customers: Customer[];
  paymentTransactions: PaymentTransaction[];
  staff: User[];
}

const emptyCache = (): TenantCache => ({
  restaurant: null,
  categories: [],
  menuItems: [],
  orders: [],
  tables: [],
  inventory: [],
  stockMovements: [],
  customers: [],
  paymentTransactions: [],
  staff: [],
});

function isLikelyNetworkError(err: any): boolean {
  if (!navigator.onLine) return true;
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('fetch') ||
    msg.includes('timeout')
  );
}

class BackendService {
  private listeners: Set<() => void> = new Set();
  private cache: TenantCache = emptyCache();
  private activeRestaurantId: string | null = null;
  private isSyncing = false;
  private lastSyncedAt: string | null = null;
  private lastSyncError: string | null = null;

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  private saveReadCache(restaurantId: string): void {
    try {
      localStorage.setItem(`dineflow_cache_${restaurantId}`, JSON.stringify(this.cache));
    } catch {
      // Ignore storage quota errors for read-only cache
    }
  }

  private loadReadCache(restaurantId: string): boolean {
    try {
      const raw = localStorage.getItem(`dineflow_cache_${restaurantId}`);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      this.cache = { ...emptyCache(), ...parsed };
      return true;
    } catch {
      return false;
    }
  }

  public clearSessionCache(): void {
    supabaseService.unsubscribe();
    this.cache = emptyCache();
    this.activeRestaurantId = null;
    this.lastSyncedAt = null;
    this.lastSyncError = null;
    this.notify();
  }

  public getSyncStatus(restaurantId?: string) {
    return {
      pendingCount: offlineQueue.getPendingCount(restaurantId),
      isSyncing: this.isSyncing,
      lastSyncedAt: this.lastSyncedAt,
      lastSyncError: this.lastSyncError,
      pendingOperations: offlineQueue.getAll(restaurantId),
    };
  }

  public async hydrateRestaurant(restaurantId: string): Promise<void> {
    if (!restaurantId || restaurantId === 'platform_system') return;
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.');
    }

    this.activeRestaurantId = restaurantId;

    // Load cached snapshot first if offline so UI remains usable during temporary outage
    if (!navigator.onLine) {
      this.loadReadCache(restaurantId);
      this.notify();
      return;
    }

    try {
      const data = await supabaseService.pullRestaurantData(restaurantId);
      this.cache = {
        ...this.cache,
        restaurant: data.restaurant || this.cache.restaurant,
        categories: data.categories,
        menuItems: data.menuItems,
        orders: data.orders,
        tables: data.tables,
        inventory: data.inventory,
        stockMovements: data.stockMovements,
        customers: data.customers,
        paymentTransactions: data.paymentTransactions,
      };
      this.lastSyncedAt = new Date().toISOString();
      this.lastSyncError = null;
      this.saveReadCache(restaurantId);
      this.notify();

      // Subscribe to cross-device realtime updates
      supabaseService.subscribeToRestaurantRealtime(restaurantId, () => {
        this.refreshFromSupabase(restaurantId);
      });

      // Replay any pending offline mutations
      if (offlineQueue.getPendingCount(restaurantId) > 0) {
        await this.syncOfflineQueue(restaurantId);
      }
    } catch (err: any) {
      if (isLikelyNetworkError(err) && this.loadReadCache(restaurantId)) {
        this.lastSyncError = 'Offline: showing last synced snapshot';
        this.notify();
        return;
      }
      throw err;
    }
  }

  public async refreshFromSupabase(restaurantId: string): Promise<void> {
    if (!restaurantId || !navigator.onLine || !isSupabaseConfigured) return;
    try {
      const data = await supabaseService.pullRestaurantData(restaurantId);
      this.cache = {
        ...this.cache,
        restaurant: data.restaurant || this.cache.restaurant,
        categories: data.categories,
        menuItems: data.menuItems,
        orders: data.orders,
        tables: data.tables,
        inventory: data.inventory,
        stockMovements: data.stockMovements,
        customers: data.customers,
        paymentTransactions: data.paymentTransactions,
      };
      this.lastSyncedAt = new Date().toISOString();
      this.lastSyncError = null;
      this.saveReadCache(restaurantId);
      this.notify();
    } catch (err: any) {
      this.lastSyncError = err.message || 'Failed to refresh from Supabase';
      this.notify();
    }
  }

  public async syncOfflineQueue(restaurantId: string): Promise<{ synced: number; failed: number }> {
    const ops = offlineQueue.getAll(restaurantId);
    if (ops.length === 0 || !navigator.onLine || this.isSyncing) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.notify();

    let synced = 0;
    let failed = 0;

    try {
      for (const op of ops) {
        try {
          await this.executeQueuedOperation(op);
          offlineQueue.remove(op.operationId);
          synced++;
        } catch (err: any) {
          failed++;
          offlineQueue.markError(op.operationId, err.message || 'Sync error');
          this.lastSyncError = err.message || 'Sync failed for pending operation';
          if (isLikelyNetworkError(err)) {
            break;
          }
        }
      }
      if (synced > 0) {
        await this.refreshFromSupabase(restaurantId);
      }
    } finally {
      this.isSyncing = false;
      this.notify();
    }

    return { synced, failed };
  }

  private async executeQueuedOperation(op: OfflineOperation): Promise<void> {
    switch (op.type) {
      case 'create_order':
        await supabaseService.createOrderAtomic(op.payload.order);
        break;
      case 'update_order_status':
        await supabaseService.updateOrderStatus(
          op.payload.orderId,
          op.restaurantId,
          op.payload.status,
          op.payload.tableId
        );
        break;
      case 'cancel_order':
        await supabaseService.cancelOrder(
          op.restaurantId,
          op.payload.order,
          op.payload.reason,
          op.payload.actor
        );
        break;
      case 'adjust_stock':
        await supabaseService.adjustStockAtomic(
          op.restaurantId,
          op.payload.itemId,
          op.payload.type,
          op.payload.quantity,
          op.payload.reason,
          op.operationId
        );
        break;
    }
  }

  // --- TENANT SECURITY VALIDATION ---
  private verifyTenantAccess(caller: { restaurantId: string; role: Role }, targetRestaurantId: string): void {
    if (caller.role === 'superadmin') return;
    if (!caller.restaurantId || caller.restaurantId !== targetRestaurantId) {
      throw new Error(
        `Security Violation: Cross-tenant access denied. Caller from ${caller.restaurantId} cannot access ${targetRestaurantId}.`
      );
    }
  }

  // --- RESTAURANTS ---
  public getRestaurant(caller: { restaurantId: string; role: Role }, restaurantId: string): Restaurant | null {
    this.verifyTenantAccess(caller, restaurantId);
    return this.cache.restaurant;
  }

  public async updateRestaurantSettings(
    caller: { restaurantId: string; role: Role },
    restaurant: Restaurant
  ): Promise<Restaurant> {
    if (caller.role !== 'owner' && caller.role !== 'superadmin') {
      throw new Error('Only the restaurant owner or super admin can modify restaurant settings.');
    }
    this.verifyTenantAccess(caller, restaurant.id);
    const updated = await supabaseService.updateRestaurantSettings(restaurant);
    this.cache.restaurant = updated;
    this.saveReadCache(restaurant.id);
    this.notify();
    return updated;
  }

  // --- MENU CATEGORIES ---
  public getCategories(caller: { restaurantId: string; role: Role }, restaurantId: string): MenuCategory[] {
    this.verifyTenantAccess(caller, restaurantId);
    return this.cache.categories
      .filter((c) => c.restaurantId === restaurantId && c.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  public async saveCategory(
    caller: { restaurantId: string; role: Role },
    category: MenuCategory
  ): Promise<MenuCategory> {
    if (caller.role !== 'owner' && caller.role !== 'superadmin') {
      throw new Error('Unauthorized: Only owner can manage menu categories.');
    }
    this.verifyTenantAccess(caller, category.restaurantId);
    const saved = await supabaseService.saveCategory(category);
    const idx = this.cache.categories.findIndex((c) => c.id === saved.id);
    if (idx >= 0) this.cache.categories[idx] = saved;
    else this.cache.categories.push(saved);
    this.saveReadCache(category.restaurantId);
    this.notify();
    return saved;
  }

  public async deleteCategory(
    caller: { restaurantId: string; role: Role },
    restaurantId: string,
    categoryId: string
  ): Promise<void> {
    if (caller.role !== 'owner' && caller.role !== 'superadmin') {
      throw new Error('Unauthorized');
    }
    this.verifyTenantAccess(caller, restaurantId);
    await supabaseService.deleteCategory(restaurantId, categoryId);
    this.cache.categories = this.cache.categories.filter((c) => c.id !== categoryId);
    this.saveReadCache(restaurantId);
    this.notify();
  }

  // --- MENU ITEMS ---
  public getMenuItems(caller: { restaurantId: string; role: Role }, restaurantId: string): MenuItem[] {
    this.verifyTenantAccess(caller, restaurantId);
    return this.cache.menuItems.filter((i) => i.restaurantId === restaurantId);
  }

  public async saveMenuItem(caller: { restaurantId: string; role: Role }, item: MenuItem): Promise<MenuItem> {
    if (caller.role !== 'owner' && caller.role !== 'superadmin') {
      throw new Error('Unauthorized: Only restaurant owner can add or edit menu items.');
    }
    this.verifyTenantAccess(caller, item.restaurantId);
    if (item.price < 0) throw new Error('Item price cannot be negative.');
    const saved = await supabaseService.saveMenuItem(item);
    const idx = this.cache.menuItems.findIndex((i) => i.id === saved.id);
    if (idx >= 0) this.cache.menuItems[idx] = saved;
    else this.cache.menuItems.push(saved);
    this.saveReadCache(item.restaurantId);
    this.notify();
    return saved;
  }

  public async deleteMenuItem(
    caller: { restaurantId: string; role: Role },
    restaurantId: string,
    itemId: string
  ): Promise<void> {
    if (caller.role !== 'owner' && caller.role !== 'superadmin') {
      throw new Error('Unauthorized');
    }
    this.verifyTenantAccess(caller, restaurantId);
    await supabaseService.deleteMenuItem(restaurantId, itemId);
    this.cache.menuItems = this.cache.menuItems.filter((i) => i.id !== itemId);
    this.saveReadCache(restaurantId);
    this.notify();
  }

  // --- TABLES ---
  public getTables(caller: { restaurantId: string; role: Role }, restaurantId: string): RestaurantTable[] {
    this.verifyTenantAccess(caller, restaurantId);
    return this.cache.tables.filter((t) => t.restaurantId === restaurantId);
  }

  public async saveTable(
    caller: { restaurantId: string; role: Role },
    table: RestaurantTable
  ): Promise<RestaurantTable> {
    if (caller.role !== 'owner' && caller.role !== 'cashier' && caller.role !== 'superadmin') {
      throw new Error('Unauthorized: Only owner or cashier can update tables.');
    }
    this.verifyTenantAccess(caller, table.restaurantId);
    const saved = await supabaseService.saveTable(table);
    const idx = this.cache.tables.findIndex((t) => t.id === saved.id);
    if (idx >= 0) this.cache.tables[idx] = saved;
    else this.cache.tables.push(saved);
    this.saveReadCache(table.restaurantId);
    this.notify();
    return saved;
  }

  public async deleteTable(
    caller: { restaurantId: string; role: Role },
    restaurantId: string,
    tableId: string
  ): Promise<void> {
    if (caller.role !== 'owner' && caller.role !== 'superadmin') {
      throw new Error('Unauthorized');
    }
    this.verifyTenantAccess(caller, restaurantId);
    await supabaseService.deleteTable(restaurantId, tableId);
    this.cache.tables = this.cache.tables.filter((t) => t.id !== tableId);
    this.saveReadCache(restaurantId);
    this.notify();
  }

  // --- ORDERS & TRANSACTIONS ---
  public getOrders(caller: { restaurantId: string; role: Role }, restaurantId: string): Order[] {
    this.verifyTenantAccess(caller, restaurantId);
    return [...this.cache.orders]
      .filter((o) => o.restaurantId === restaurantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getOrderById(
    caller: { restaurantId: string; role: Role },
    restaurantId: string,
    orderId: string
  ): Order | undefined {
    this.verifyTenantAccess(caller, restaurantId);
    return this.cache.orders.find((o) => o.id === orderId && o.restaurantId === restaurantId);
  }

  public getPaymentTransactions(
    caller: { restaurantId: string; role: Role },
    restaurantId: string
  ): PaymentTransaction[] {
    this.verifyTenantAccess(caller, restaurantId);
    return this.cache.paymentTransactions.filter((p) => p.restaurantId === restaurantId);
  }

  public async createOrder(
    caller: { restaurantId: string; role: Role; userId: string; name: string },
    order: Order
  ): Promise<{ order: Order; queuedOffline: boolean }> {
    if (caller.role !== 'owner' && caller.role !== 'cashier') {
      throw new Error('Unauthorized: Only owner or cashier can create orders.');
    }
    this.verifyTenantAccess(caller, order.restaurantId);

    if (!order.items || order.items.length === 0) {
      throw new Error('Order must contain at least one item.');
    }
    if (order.items.some((i) => i.quantity <= 0 || i.unitPrice < 0 || i.totalPrice < 0)) {
      throw new Error('Invalid item quantity or price.');
    }
    if (order.subtotal < 0 || order.discountAmount < 0 || order.finalTotal < 0) {
      throw new Error('Order amounts cannot be negative.');
    }

    const operationId =
      order.clientOperationId ||
      `op_ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const preparedOrder: Order = {
      ...order,
      clientOperationId: operationId,
      cashierId: caller.userId,
      cashierName: caller.name,
      createdAt: order.createdAt || new Date().toISOString(),
    };

    if (!navigator.onLine) {
      const offlineOrder: Order = {
        ...preparedOrder,
        invoiceNumber: `OFFLINE-${Date.now().toString().slice(-6)}`,
        orderNumber: `OFF-${Date.now().toString().slice(-4)}`,
      };
      offlineQueue.enqueue({
        operationId,
        type: 'create_order',
        restaurantId: order.restaurantId,
        payload: { order: preparedOrder },
      });
      this.cache.orders.unshift(offlineOrder);
      if (offlineOrder.tableId) {
        const tbl = this.cache.tables.find((t) => t.id === offlineOrder.tableId);
        if (tbl) {
          tbl.status = offlineOrder.paymentStatus === 'paid' ? 'available' : 'occupied';
          tbl.currentOrderId = offlineOrder.paymentStatus === 'paid' ? undefined : offlineOrder.id;
        }
      }
      this.saveReadCache(order.restaurantId);
      this.notify();
      return { order: offlineOrder, queuedOffline: true };
    }

    try {
      const saved = await supabaseService.createOrderAtomic(preparedOrder);
      this.cache.orders = [saved, ...this.cache.orders.filter((o) => o.id !== saved.id)];
      if (saved.tableId) {
        const tbl = this.cache.tables.find((t) => t.id === saved.tableId);
        if (tbl) {
          tbl.status = saved.paymentStatus === 'paid' ? 'available' : 'occupied';
          tbl.currentOrderId = saved.paymentStatus === 'paid' ? undefined : saved.id;
        }
      }
      this.saveReadCache(order.restaurantId);
      this.notify();
      return { order: saved, queuedOffline: false };
    } catch (err: any) {
      if (isLikelyNetworkError(err)) {
        const offlineOrder: Order = {
          ...preparedOrder,
          invoiceNumber: `OFFLINE-${Date.now().toString().slice(-6)}`,
          orderNumber: `OFF-${Date.now().toString().slice(-4)}`,
        };
        offlineQueue.enqueue({
          operationId,
          type: 'create_order',
          restaurantId: order.restaurantId,
          payload: { order: preparedOrder },
        });
        this.cache.orders.unshift(offlineOrder);
        this.saveReadCache(order.restaurantId);
        this.notify();
        return { order: offlineOrder, queuedOffline: true };
      }
      throw err;
    }
  }

  public async updateOrderStatus(
    caller: { restaurantId: string; role: Role },
    restaurantId: string,
    orderId: string,
    status: Order['orderStatus']
  ): Promise<void> {
    this.verifyTenantAccess(caller, restaurantId);
    const order = this.cache.orders.find((o) => o.id === orderId && o.restaurantId === restaurantId);
    if (!order) throw new Error('Order not found');
    if (order.orderStatus === 'cancelled') {
      throw new Error('Cannot change status of a cancelled order.');
    }

    const opId = `op_stat_${orderId}_${status}_${Date.now()}`;
    if (!navigator.onLine) {
      offlineQueue.enqueue({
        operationId: opId,
        type: 'update_order_status',
        restaurantId,
        payload: { orderId, status, tableId: order.tableId },
      });
    } else {
      await supabaseService.updateOrderStatus(orderId, restaurantId, status, order.tableId);
    }

    order.orderStatus = status;
    if (status === 'completed') {
      order.completedAt = new Date().toISOString();
      if (order.tableId) {
        const table = this.cache.tables.find((t) => t.id === order.tableId);
        if (table && table.currentOrderId === order.id) {
          table.status = 'available';
          table.currentOrderId = undefined;
        }
      }
    }
    this.saveReadCache(restaurantId);
    this.notify();
  }

  public async cancelOrder(
    caller: { restaurantId: string; role: Role; userId?: string; name: string },
    restaurantId: string,
    orderId: string,
    reason: string
  ): Promise<void> {
    if (caller.role !== 'owner' && caller.role !== 'cashier') {
      throw new Error('Unauthorized: Permission required to cancel bills.');
    }
    this.verifyTenantAccess(caller, restaurantId);
    const order = this.cache.orders.find((o) => o.id === orderId && o.restaurantId === restaurantId);
    if (!order) throw new Error('Order not found');

    const actor = { id: caller.userId || caller.restaurantId, name: caller.name, role: caller.role };
    if (!navigator.onLine) {
      offlineQueue.enqueue({
        operationId: `op_cancel_${orderId}_${Date.now()}`,
        type: 'cancel_order',
        restaurantId,
        payload: { order, reason, actor },
      });
    } else {
      await supabaseService.cancelOrder(restaurantId, order, reason, actor);
    }

    order.orderStatus = 'cancelled';
    order.paymentStatus = order.paymentStatus === 'paid' ? 'refunded' : 'cancelled';
    order.cancellationReason = reason;
    if (order.tableId) {
      const table = this.cache.tables.find((t) => t.id === order.tableId);
      if (table && table.currentOrderId === order.id) {
        table.status = 'available';
        table.currentOrderId = undefined;
      }
    }
    this.saveReadCache(restaurantId);
    this.notify();
  }

  // --- INVENTORY ---
  public getInventory(caller: { restaurantId: string; role: Role }, restaurantId: string): InventoryItem[] {
    this.verifyTenantAccess(caller, restaurantId);
    return this.cache.inventory.filter((i) => i.restaurantId === restaurantId);
  }

  public async saveInventoryItem(
    caller: { restaurantId: string; role: Role },
    item: InventoryItem
  ): Promise<InventoryItem> {
    if (caller.role !== 'owner') throw new Error('Unauthorized');
    this.verifyTenantAccess(caller, item.restaurantId);
    if (item.currentStock < 0 || item.minimumStock < 0 || item.costPerUnit < 0) {
      throw new Error('Inventory quantities and costs cannot be negative.');
    }
    const saved = await supabaseService.saveInventoryItem(item);
    const idx = this.cache.inventory.findIndex((i) => i.id === saved.id);
    if (idx >= 0) this.cache.inventory[idx] = saved;
    else this.cache.inventory.push(saved);
    this.saveReadCache(item.restaurantId);
    this.notify();
    return saved;
  }

  public async adjustStock(
    caller: { restaurantId: string; role: Role; name: string },
    restaurantId: string,
    itemId: string,
    type: 'in' | 'out' | 'adjustment',
    quantity: number,
    reason: string
  ): Promise<void> {
    if (caller.role !== 'owner') throw new Error('Unauthorized: Only owner can adjust stock.');
    this.verifyTenantAccess(caller, restaurantId);
    if (quantity < 0) throw new Error('Adjustment quantity cannot be negative.');

    const item = this.cache.inventory.find((i) => i.id === itemId && i.restaurantId === restaurantId);
    if (!item) throw new Error('Inventory item not found');

    const idempotencyKey = `stk_${itemId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    if (!navigator.onLine) {
      offlineQueue.enqueue({
        operationId: idempotencyKey,
        type: 'adjust_stock',
        restaurantId,
        payload: { itemId, type, quantity, reason },
      });
      const prev = item.currentStock;
      const next =
        type === 'in'
          ? prev + quantity
          : type === 'out'
          ? Math.max(0, prev - quantity)
          : quantity;
      item.currentStock = next;
      this.cache.stockMovements.unshift({
        id: idempotencyKey,
        restaurantId,
        inventoryItemId: item.id,
        itemName: item.name,
        type,
        quantity,
        previousStock: prev,
        newStock: next,
        reason,
        recordedBy: caller.name,
        createdAt: new Date().toISOString(),
      });
    } else {
      const movement = await supabaseService.adjustStockAtomic(
        restaurantId,
        itemId,
        type,
        quantity,
        reason,
        idempotencyKey
      );
      item.currentStock = movement.newStock;
      this.cache.stockMovements.unshift(movement);
    }

    this.saveReadCache(restaurantId);
    this.notify();
  }

  public getStockMovements(caller: { restaurantId: string; role: Role }, restaurantId: string): StockMovement[] {
    this.verifyTenantAccess(caller, restaurantId);
    return this.cache.stockMovements.filter((m) => m.restaurantId === restaurantId);
  }

  // --- STAFF MANAGEMENT ---
  public async fetchStaff(caller: { restaurantId: string; role: Role }, restaurantId: string): Promise<User[]> {
    if (caller.role !== 'owner' && caller.role !== 'superadmin') {
      throw new Error('Unauthorized');
    }
    this.verifyTenantAccess(caller, restaurantId);
    const list = await supabaseService.getStaff(restaurantId);
    this.cache.staff = list;
    this.notify();
    return list;
  }

  public getStaff(caller: { restaurantId: string; role: Role }, restaurantId: string): User[] {
    if (caller.role !== 'owner' && caller.role !== 'superadmin') {
      throw new Error('Unauthorized');
    }
    this.verifyTenantAccess(caller, restaurantId);
    return this.cache.staff.filter((u) => u.restaurantId === restaurantId);
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
    const created = await supabaseService.createStaff(restaurantId, data);
    this.cache.staff.push(created);
    this.notify();
    return created;
  }

  public async toggleStaffStatus(
    caller: { restaurantId: string; role: Role; userId: string },
    restaurantId: string,
    targetUserId: string
  ): Promise<void> {
    if (caller.role !== 'owner' && caller.role !== 'superadmin') {
      throw new Error('Unauthorized');
    }
    this.verifyTenantAccess(caller, restaurantId);
    if (caller.userId === targetUserId) {
      throw new Error('Cannot deactivate your own logged-in account.');
    }
    const staff = this.cache.staff.find((u) => u.id === targetUserId && u.restaurantId === restaurantId);
    if (!staff) throw new Error('Staff member not found');
    const nextActive = !staff.isActive;
    await supabaseService.toggleStaffStatus(restaurantId, targetUserId, nextActive);
    staff.isActive = nextActive;
    this.notify();
  }

  // --- CUSTOMERS ---
  public getCustomers(caller: { restaurantId: string; role: Role }, restaurantId: string): Customer[] {
    this.verifyTenantAccess(caller, restaurantId);
    return this.cache.customers.filter((c) => c.restaurantId === restaurantId);
  }

  // --- SUPER ADMIN MASTER METHODS ---
  public async getAllRestaurants(caller: { role: Role }): Promise<Restaurant[]> {
    if (caller.role !== 'superadmin') throw new Error('Unauthorized: Super Admin access required.');
    return supabaseService.getAllRestaurants();
  }

  public async setRestaurantStatus(
    caller: { role: Role; userId?: string; name: string },
    restaurantId: string,
    restaurantName: string,
    oldStatus: string,
    status: Restaurant['status']
  ): Promise<void> {
    if (caller.role !== 'superadmin') throw new Error('Unauthorized: Super Admin access required.');
    await supabaseService.setRestaurantStatus(restaurantId, restaurantName, oldStatus, status, {
      id: caller.userId || 'superadmin',
      name: caller.name,
    });
    this.notify();
  }

  public async getPlatformAuditLogs(caller: { role: Role }): Promise<PlatformAuditLog[]> {
    if (caller.role !== 'superadmin') throw new Error('Unauthorized: Super Admin access required.');
    return supabaseService.getPlatformAuditLogs();
  }
}

export const backend = new BackendService();
