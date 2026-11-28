import { supabase, isSupabaseConfigured, createEphemeralAuthClient } from './supabaseClient';
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

function assertSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
    );
  }
  return supabase;
}

// --- Row Mappers (DB snake_case <-> App camelCase) ---

export function mapRestaurantRow(row: any): Restaurant {
  return {
    id: row.id,
    name: row.name,
    ownerName: row.owner_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    restaurantType: row.restaurant_type || 'Restaurant',
    logoUrl: row.logo_url || undefined,
    gstNumber: row.gst_number || undefined,
    fssaiNumber: row.fssai_number || undefined,
    currency: row.currency || 'INR',
    currencySymbol: row.currency_symbol || '₹',
    taxRatePercent: Number(row.tax_rate_percent ?? 5),
    serviceChargePercent: Number(row.service_charge_percent ?? 0),
    invoicePrefix: row.invoice_prefix || 'INV-',
    upiId: row.upi_id || undefined,
    status: row.status === 'pending' ? 'pending_approval' : row.status,
    createdAt: row.created_at,
  };
}

export function mapUserRow(row: any): User {
  return {
    id: row.id,
    authUserId: row.auth_user_id || undefined,
    email: row.email,
    name: row.name,
    phone: row.phone || undefined,
    role: row.role as Role,
    restaurantId: row.restaurant_id || '',
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  };
}

export function mapCategoryRow(row: any): MenuCategory {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    slug: row.slug || row.name.toLowerCase().replace(/\s+/g, '-'),
    displayOrder: Number(row.display_order ?? row.sort_order ?? 0),
    isActive: Boolean(row.is_active ?? true),
  };
}

export function mapMenuItemRow(row: any): MenuItem {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    categoryId: row.category_id,
    name: row.name,
    price: Number(row.price),
    description: row.description || undefined,
    itemType: row.item_type || (row.is_veg === false ? 'non_veg' : 'veg'),
    isAvailable: Boolean(row.is_available ?? true),
    taxPercent: Number(row.tax_percent ?? 5),
    prepTimeMinutes: row.prep_time_minutes != null ? Number(row.prep_time_minutes) : 10,
    variants: Array.isArray(row.variants) ? row.variants : [],
    addOns: Array.isArray(row.add_ons) ? row.add_ons : [],
    createdAt: row.created_at,
  };
}

export function mapTableRow(row: any): RestaurantTable {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    tableNumber: row.table_number,
    capacity: Number(row.capacity),
    status: row.status,
    currentOrderId: row.current_order_id || undefined,
  };
}

export function mapOrderRow(row: any): Order {
  return {
    id: row.id,
    orderNumber: row.order_number || `ORD-${String(row.invoice_number || '').slice(-4)}`,
    invoiceNumber: row.invoice_number,
    restaurantId: row.restaurant_id,
    orderType: row.order_type,
    tableId: row.table_id || undefined,
    tableNumber: row.table_number || undefined,
    customerName: row.customer_name || undefined,
    customerPhone: row.customer_phone || undefined,
    items: Array.isArray(row.items) ? row.items : [],
    subtotal: Number(row.subtotal),
    discountAmount: Number(row.discount_amount ?? 0),
    taxRatePercent: Number(row.tax_rate_percent ?? 5),
    taxAmount: Number(row.tax_amount ?? 0),
    serviceChargePercent: Number(row.service_charge_percent ?? 0),
    serviceChargeAmount: Number(row.service_charge_amount ?? 0),
    finalTotal: Number(row.total_amount),
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    orderStatus: row.status,
    cancellationReason: row.cancellation_reason || undefined,
    specialInstructions: row.special_instructions || undefined,
    cashierId: row.cashier_id || '',
    cashierName: row.created_by || 'Staff',
    clientOperationId: row.client_operation_id || undefined,
    createdAt: row.created_at,
    completedAt: row.completed_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

export function mapPaymentTxRow(row: any): PaymentTransaction {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    orderId: row.order_id,
    amount: Number(row.amount),
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    referenceNumber: row.reference_number || undefined,
    confirmedBy: row.confirmed_by,
    notes: row.notes || undefined,
    idempotencyKey: row.idempotency_key || undefined,
    createdAt: row.created_at,
  };
}

export function mapInventoryRow(row: any): InventoryItem {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    category: row.category || undefined,
    unit: row.unit,
    currentStock: Number(row.current_stock),
    minimumStock: Number(row.min_threshold),
    costPerUnit: Number(row.cost_per_unit),
  };
}

export function mapStockMovementRow(row: any): StockMovement {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    inventoryItemId: row.inventory_item_id,
    itemName: row.item_name,
    type: row.movement_type,
    quantity: Number(row.quantity),
    previousStock: Number(row.previous_stock),
    newStock: Number(row.new_stock),
    reason: row.reason,
    recordedBy: row.recorded_by,
    createdAt: row.created_at,
  };
}

export function mapCustomerRow(row: any): Customer {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    phone: row.phone,
    email: row.email || undefined,
    totalSpent: Number(row.total_spent ?? 0),
    totalVisits: Number(row.total_visits ?? 0),
    lastVisit: row.last_visit || '',
  };
}

export function mapAuditLogRow(row: any): PlatformAuditLog {
  return {
    id: row.id,
    targetRestaurantId: row.restaurant_id || undefined,
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    action: row.action,
    details: row.details,
    timestamp: row.created_at,
  };
}

export class SupabaseService {
  private activeChannels: any[] = [];

  public isReady(): boolean {
    return isSupabaseConfigured && supabase !== null;
  }

  public subscribeToRestaurantRealtime(
    restaurantId: string,
    onDataChange: (table: string, payload: any) => void
  ): void {
    if (!this.isReady() || !supabase) return;
    this.unsubscribe();

    const tables = [
      'orders',
      'restaurant_tables',
      'menu_items',
      'menu_categories',
      'inventory_items',
      'stock_movements',
      'payment_transactions',
    ];

    let channel = supabase.channel(`dineflow_realtime_${restaurantId}`);
    for (const table of tables) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => onDataChange(table, payload)
      );
    }

    channel.subscribe();
    this.activeChannels.push(channel);
  }

  public unsubscribe(): void {
    if (this.activeChannels.length && supabase) {
      this.activeChannels.forEach((ch) => supabase?.removeChannel(ch));
      this.activeChannels = [];
    }
  }

  // --- AUTH & PROFILE ---
  public async fetchCurrentUserProfile(authUserId: string): Promise<{ user: User; restaurant: Restaurant | null }> {
    const client = assertSupabase();
    const { data: userRow, error: userErr } = await client
      .from('users')
      .select('id, auth_user_id, restaurant_id, name, email, phone, role, is_active, created_at')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (userErr) throw new Error(userErr.message);
    if (!userRow) {
      throw new Error('User profile not found in workspace. Please contact your restaurant administrator.');
    }

    const user = mapUserRow(userRow);
    if (!user.isActive) {
      throw new Error('Your account has been deactivated by your restaurant owner.');
    }

    if (user.role === 'superadmin') {
      return { user, restaurant: null };
    }

    const { data: restRow, error: restErr } = await client
      .from('restaurants')
      .select('*')
      .eq('id', user.restaurantId)
      .single();

    if (restErr || !restRow) {
      throw new Error(restErr?.message || 'Associated restaurant workspace not found.');
    }

    const restaurant = mapRestaurantRow(restRow);
    if (restaurant.status === 'suspended') {
      throw new Error('This restaurant account is currently suspended. Please contact platform support.');
    }
    if (restaurant.status === 'pending_approval') {
      throw new Error('Restaurant account registration is awaiting platform administrator approval.');
    }

    return { user, restaurant };
  }

  public async registerRestaurantWorkspace(params: {
    restaurantName: string;
    ownerName: string;
    email: string;
    phone: string;
    password: string;
    address: string;
    restaurantType: string;
    gstNumber?: string;
    fssaiNumber?: string;
  }): Promise<{ user: User | null; restaurant: Restaurant | null; requiresEmailConfirmation: boolean }> {
    const client = assertSupabase();

    const { data: authData, error: signUpErr } = await client.auth.signUp({
      email: params.email.toLowerCase().trim(),
      password: params.password,
      options: {
        data: {
          name: params.ownerName.trim(),
          phone: params.phone.trim(),
        },
      },
    });

    if (signUpErr) throw new Error(signUpErr.message);
    if (!authData.user) throw new Error('Failed to create authentication account.');

    if (!authData.session) {
      return { user: null, restaurant: null, requiresEmailConfirmation: true };
    }

    const { data: rpcData, error: rpcErr } = await client.rpc('register_restaurant_workspace', {
      p_restaurant_name: params.restaurantName,
      p_owner_name: params.ownerName,
      p_email: params.email,
      p_phone: params.phone,
      p_address: params.address,
      p_restaurant_type: params.restaurantType,
      p_gst_number: params.gstNumber || null,
      p_fssai_number: params.fssaiNumber || null,
    });

    if (rpcErr) throw new Error(rpcErr.message);

    return {
      user: mapUserRow(rpcData.user),
      restaurant: mapRestaurantRow(rpcData.restaurant),
      requiresEmailConfirmation: false,
    };
  }

  // --- PULL ALL TENANT DATA ---
  public async pullRestaurantData(restaurantId: string) {
    const client = assertSupabase();
    const [
      ordersRes,
      tablesRes,
      menuRes,
      categoriesRes,
      inventoryRes,
      movementsRes,
      customersRes,
      paymentTxRes,
      restRes,
    ] = await Promise.all([
      client.from('orders').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }),
      client.from('restaurant_tables').select('*').eq('restaurant_id', restaurantId).order('table_number', { ascending: true }),
      client.from('menu_items').select('*').eq('restaurant_id', restaurantId).order('name', { ascending: true }),
      client.from('menu_categories').select('*').eq('restaurant_id', restaurantId).order('display_order', { ascending: true }),
      client.from('inventory_items').select('*').eq('restaurant_id', restaurantId).order('name', { ascending: true }),
      client.from('stock_movements').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(250),
      client.from('customers').select('*').eq('restaurant_id', restaurantId).order('total_spent', { ascending: false }),
      client.from('payment_transactions').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(250),
      client.from('restaurants').select('*').eq('id', restaurantId).single(),
    ]);

    const firstError =
      ordersRes.error ||
      tablesRes.error ||
      menuRes.error ||
      categoriesRes.error ||
      inventoryRes.error ||
      movementsRes.error ||
      customersRes.error ||
      paymentTxRes.error ||
      restRes.error;

    if (firstError) throw new Error(firstError.message);

    return {
      restaurant: restRes.data ? mapRestaurantRow(restRes.data) : null,
      orders: (ordersRes.data || []).map(mapOrderRow),
      tables: (tablesRes.data || []).map(mapTableRow),
      menuItems: (menuRes.data || []).map(mapMenuItemRow),
      categories: (categoriesRes.data || []).map(mapCategoryRow),
      inventory: (inventoryRes.data || []).map(mapInventoryRow),
      stockMovements: (movementsRes.data || []).map(mapStockMovementRow),
      customers: (customersRes.data || []).map(mapCustomerRow),
      paymentTransactions: (paymentTxRes.data || []).map(mapPaymentTxRow),
    };
  }

  // --- RESTAURANT SETTINGS ---
  public async updateRestaurantSettings(restaurant: Restaurant): Promise<Restaurant> {
    const client = assertSupabase();
    const { data, error } = await client
      .from('restaurants')
      .update({
        name: restaurant.name,
        owner_name: restaurant.ownerName,
        phone: restaurant.phone,
        email: restaurant.email,
        address: restaurant.address,
        restaurant_type: restaurant.restaurantType,
        gst_number: restaurant.gstNumber || null,
        fssai_number: restaurant.fssaiNumber || null,
        tax_rate_percent: restaurant.taxRatePercent,
        service_charge_percent: restaurant.serviceChargePercent,
        invoice_prefix: restaurant.invoicePrefix,
        upi_id: restaurant.upiId || null,
        currency_symbol: restaurant.currencySymbol,
        updated_at: new Date().toISOString(),
      })
      .eq('id', restaurant.id)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return mapRestaurantRow(data);
  }

  // --- CATEGORIES ---
  public async saveCategory(category: MenuCategory): Promise<MenuCategory> {
    const client = assertSupabase();
    const { data, error } = await client
      .from('menu_categories')
      .upsert({
        id: category.id,
        restaurant_id: category.restaurantId,
        name: category.name,
        slug: category.slug,
        display_order: category.displayOrder,
        is_active: category.isActive,
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return mapCategoryRow(data);
  }

  public async deleteCategory(restaurantId: string, categoryId: string): Promise<void> {
    const client = assertSupabase();
    const { count, error: countErr } = await client
      .from('menu_items')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('category_id', categoryId);

    if (countErr) throw new Error(countErr.message);
    if ((count || 0) > 0) {
      throw new Error(`Cannot delete category because it contains ${count} menu item(s). Reassign them first.`);
    }

    const { error } = await client
      .from('menu_categories')
      .delete()
      .match({ id: categoryId, restaurant_id: restaurantId });

    if (error) throw new Error(error.message);
  }

  // --- MENU ITEMS ---
  public async saveMenuItem(item: MenuItem): Promise<MenuItem> {
    const client = assertSupabase();
    const { data, error } = await client
      .from('menu_items')
      .upsert({
        id: item.id,
        restaurant_id: item.restaurantId,
        category_id: item.categoryId,
        name: item.name,
        description: item.description || null,
        price: item.price,
        item_type: item.itemType,
        is_available: item.isAvailable,
        tax_percent: item.taxPercent,
        prep_time_minutes: item.prepTimeMinutes ?? 10,
        variants: item.variants || [],
        add_ons: item.addOns || [],
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return mapMenuItemRow(data);
  }

  public async deleteMenuItem(restaurantId: string, itemId: string): Promise<void> {
    const client = assertSupabase();
    const { error } = await client
      .from('menu_items')
      .delete()
      .match({ id: itemId, restaurant_id: restaurantId });
    if (error) throw new Error(error.message);
  }

  // --- TABLES ---
  public async saveTable(table: RestaurantTable): Promise<RestaurantTable> {
    const client = assertSupabase();
    const { data, error } = await client
      .from('restaurant_tables')
      .upsert({
        id: table.id,
        restaurant_id: table.restaurantId,
        table_number: table.tableNumber,
        capacity: table.capacity,
        status: table.status,
        current_order_id: table.currentOrderId || null,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return mapTableRow(data);
  }

  public async deleteTable(restaurantId: string, tableId: string): Promise<void> {
    const client = assertSupabase();
    const { error } = await client
      .from('restaurant_tables')
      .delete()
      .match({ id: tableId, restaurant_id: restaurantId });
    if (error) throw new Error(error.message);
  }

  // --- ATOMIC ORDERS ---
  public async createOrderAtomic(order: Order): Promise<Order> {
    const client = assertSupabase();
    const { data, error } = await client.rpc('create_order_atomic', {
      p_restaurant_id: order.restaurantId,
      p_order_type: order.orderType,
      p_table_id: order.tableId || null,
      p_table_number: order.tableNumber || null,
      p_customer_name: order.customerName || null,
      p_customer_phone: order.customerPhone || null,
      p_items: order.items,
      p_subtotal: order.subtotal,
      p_discount_amount: order.discountAmount,
      p_tax_rate_percent: order.taxRatePercent,
      p_tax_amount: order.taxAmount,
      p_service_charge_percent: order.serviceChargePercent,
      p_service_charge_amount: order.serviceChargeAmount,
      p_total_amount: order.finalTotal,
      p_payment_method: order.paymentMethod || 'unpaid',
      p_payment_status: order.paymentStatus,
      p_special_instructions: order.specialInstructions || null,
      p_payment_reference: order.paymentReference || null,
      p_client_operation_id: order.clientOperationId || null,
    });

    if (error) throw new Error(error.message);
    return mapOrderRow(data);
  }

  public async updateOrderStatus(
    orderId: string,
    restaurantId: string,
    status: Order['orderStatus'],
    tableId?: string
  ): Promise<void> {
    const client = assertSupabase();
    const updatePayload: any = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === 'completed') {
      updatePayload.completed_at = new Date().toISOString();
    }

    const { error } = await client
      .from('orders')
      .update(updatePayload)
      .match({ id: orderId, restaurant_id: restaurantId });

    if (error) throw new Error(error.message);

    if (status === 'completed' && tableId) {
      const { error: tblErr } = await client
        .from('restaurant_tables')
        .update({
          status: 'available',
          current_order_id: null,
          updated_at: new Date().toISOString(),
        })
        .match({ id: tableId, restaurant_id: restaurantId, current_order_id: orderId });
      if (tblErr) throw new Error(tblErr.message);
    }
  }

  public async cancelOrder(
    restaurantId: string,
    order: Order,
    reason: string,
    actor: { id: string; name: string; role: Role }
  ): Promise<void> {
    const client = assertSupabase();
    const { error } = await client
      .from('orders')
      .update({
        status: 'cancelled',
        payment_status: order.paymentStatus === 'paid' ? 'refunded' : 'cancelled',
        cancellation_reason: reason,
        cancelled_by: actor.name,
        updated_at: new Date().toISOString(),
      })
      .match({ id: order.id, restaurant_id: restaurantId });

    if (error) throw new Error(error.message);

    if (order.tableId) {
      await client
        .from('restaurant_tables')
        .update({
          status: 'available',
          current_order_id: null,
          updated_at: new Date().toISOString(),
        })
        .match({ id: order.tableId, restaurant_id: restaurantId, current_order_id: order.id });
    }

    await client.from('platform_audit_logs').insert({
      restaurant_id: restaurantId,
      actor_id: actor.id,
      actor_name: actor.name,
      actor_role: actor.role,
      action: 'BILL_CANCELLED',
      details: `Invoice #${order.invoiceNumber} (Order #${order.orderNumber}) for ${order.finalTotal} was cancelled. Reason: ${reason}`,
    });
  }

  // --- INVENTORY ---
  public async saveInventoryItem(item: InventoryItem): Promise<InventoryItem> {
    const client = assertSupabase();
    const { data, error } = await client
      .from('inventory_items')
      .upsert({
        id: item.id,
        restaurant_id: item.restaurantId,
        name: item.name,
        category: item.category || 'General',
        current_stock: item.currentStock,
        unit: item.unit,
        min_threshold: item.minimumStock,
        cost_per_unit: item.costPerUnit,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return mapInventoryRow(data);
  }

  public async adjustStockAtomic(
    restaurantId: string,
    itemId: string,
    type: 'in' | 'out' | 'adjustment',
    quantity: number,
    reason: string,
    idempotencyKey?: string
  ): Promise<StockMovement> {
    const client = assertSupabase();
    const { data, error } = await client.rpc('adjust_inventory_stock_atomic', {
      p_restaurant_id: restaurantId,
      p_item_id: itemId,
      p_movement_type: type,
      p_quantity: quantity,
      p_reason: reason,
      p_idempotency_key: idempotencyKey || null,
    });

    if (error) throw new Error(error.message);
    return mapStockMovementRow(data);
  }

  // --- STAFF ---
  public async getStaff(restaurantId: string): Promise<User[]> {
    const client = assertSupabase();
    const { data, error } = await client
      .from('users')
      .select('id, auth_user_id, restaurant_id, name, email, phone, role, is_active, created_at')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map(mapUserRow);
  }

  public async createStaff(
    restaurantId: string,
    data: { name: string; email: string; phone?: string; role: 'cashier' | 'kitchen'; password: string }
  ): Promise<User> {
    const client = assertSupabase();
    const ephemeral = createEphemeralAuthClient();
    if (!ephemeral) throw new Error('Supabase Auth client unavailable.');

    const emailKey = data.email.toLowerCase().trim();
    const { data: signUpData, error: signUpErr } = await ephemeral.auth.signUp({
      email: emailKey,
      password: data.password,
      options: {
        data: {
          name: data.name.trim(),
          role: data.role,
          restaurant_id: restaurantId,
        },
      },
    });

    if (signUpErr) throw new Error(signUpErr.message);
    if (!signUpData.user) throw new Error('Failed to register staff user in Supabase Auth.');

    const newAuthUid = signUpData.user.id;
    const { data: inserted, error: insertErr } = await client
      .from('users')
      .insert({
        id: newAuthUid,
        auth_user_id: newAuthUid,
        restaurant_id: restaurantId,
        name: data.name.trim(),
        email: emailKey,
        phone: data.phone?.trim() || null,
        role: data.role,
        is_active: true,
      })
      .select('id, auth_user_id, restaurant_id, name, email, phone, role, is_active, created_at')
      .single();

    if (insertErr) throw new Error(insertErr.message);
    return mapUserRow(inserted);
  }

  public async toggleStaffStatus(restaurantId: string, targetUserId: string, nextActive: boolean): Promise<void> {
    const client = assertSupabase();
    const { error } = await client
      .from('users')
      .update({ is_active: nextActive, updated_at: new Date().toISOString() })
      .match({ id: targetUserId, restaurant_id: restaurantId });
    if (error) throw new Error(error.message);
  }

  // --- SUPERADMIN ---
  public async getAllRestaurants(): Promise<Restaurant[]> {
    const client = assertSupabase();
    const { data, error } = await client.from('restaurants').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(mapRestaurantRow);
  }

  public async setRestaurantStatus(
    restaurantId: string,
    restaurantName: string,
    oldStatus: string,
    newStatus: Restaurant['status'],
    actor: { id: string; name: string }
  ): Promise<void> {
    const client = assertSupabase();
    const { error } = await client
      .from('restaurants')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', restaurantId);
    if (error) throw new Error(error.message);

    await client.from('platform_audit_logs').insert({
      restaurant_id: restaurantId,
      restaurant_name: restaurantName,
      actor_id: actor.id,
      actor_name: actor.name,
      actor_role: 'superadmin',
      action: 'RESTAURANT_STATUS_CHANGED',
      details: `Restaurant ${restaurantName} (${restaurantId}) changed from ${oldStatus} to ${newStatus}`,
    });
  }

  public async getPlatformAuditLogs(): Promise<PlatformAuditLog[]> {
    const client = assertSupabase();
    const { data, error } = await client
      .from('platform_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data || []).map(mapAuditLogRow);
  }
}

export const supabaseService = new SupabaseService();
