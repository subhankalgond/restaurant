import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Order, RestaurantTable, MenuItem, InventoryItem } from '../types';

export class SupabaseService {
  private activeChannels: any[] = [];

  public isReady(): boolean {
    return isSupabaseConfigured && supabase !== null;
  }

  /**
   * Listen to real-time changes across orders, tables, and inventory.
   * When another device (e.g. Cashier, KDS, Manager) changes data,
   * this callback fires immediately.
   */
  public subscribeToRestaurantRealtime(
    restaurantId: string,
    onDataChange: (table: string, payload: any) => void
  ) {
    if (!this.isReady() || !supabase) return;

    // Clean up any existing channels
    this.unsubscribe();

    const channel = supabase
      .channel(`dineflow_realtime_${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          onDataChange('orders', payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'restaurant_tables',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          onDataChange('restaurant_tables', payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_items',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          onDataChange('inventory_items', payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Supabase Realtime] Connected for restaurant ${restaurantId}`);
        }
      });

    this.activeChannels.push(channel);
  }

  public unsubscribe() {
    const client = supabase;
    if (this.activeChannels.length && client) {
      this.activeChannels.forEach((ch) => client.removeChannel(ch));
      this.activeChannels = [];
    }
  }

  // --- ORDERS ---
  public async pushOrder(order: Order): Promise<void> {
    const client = supabase;
    if (!this.isReady() || !client) return;

    try {
      await client.from('orders').upsert({
        id: order.id,
        restaurant_id: order.restaurantId,
        invoice_number: order.invoiceNumber,
        order_type: order.orderType,
        table_id: order.tableId || null,
        table_number: order.tableNumber || null,
        customer_name: order.customerName || null,
        customer_phone: order.customerPhone || null,
        items: order.items,
        subtotal: order.subtotal,
        tax_amount: order.taxAmount,
        tax_rate_percent: order.taxRatePercent,
        service_charge_amount: order.serviceChargeAmount,
        discount_amount: order.discountAmount,
        total_amount: order.finalTotal,
        payment_method: order.paymentMethod,
        payment_status: order.paymentStatus,
        status: order.orderStatus,
        special_instructions: order.specialInstructions || null,
        cancellation_reason: order.cancellationReason || null,
        created_by: order.cashierName || 'Staff',
        created_at: order.createdAt,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[Supabase] Failed to push order:', err);
    }
  }

  public async updateOrderStatus(
    orderId: string,
    restaurantId: string,
    status: Order['orderStatus']
  ): Promise<void> {
    const client = supabase;
    if (!this.isReady() || !client) return;

    try {
      await client
        .from('orders')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .match({ id: orderId, restaurant_id: restaurantId });
    } catch (err) {
      console.warn('[Supabase] Failed to update order status:', err);
    }
  }

  // --- TABLES ---
  public async updateTableStatus(
    tableId: string,
    restaurantId: string,
    status: RestaurantTable['status'],
    currentOrderId?: string
  ): Promise<void> {
    const client = supabase;
    if (!this.isReady() || !client) return;

    try {
      await client
        .from('restaurant_tables')
        .update({
          status,
          current_order_id: currentOrderId || null,
          updated_at: new Date().toISOString(),
        })
        .match({ id: tableId, restaurant_id: restaurantId });
    } catch (err) {
      console.warn('[Supabase] Failed to update table status:', err);
    }
  }

  // --- PULL ALL DATA FROM SUPABASE ---
  public async pullRestaurantData(restaurantId: string) {
    const client = supabase;
    if (!this.isReady() || !client) return null;

    try {
      const [ordersRes, tablesRes, menuRes, categoriesRes, inventoryRes] = await Promise.all([
        client.from('orders').select('*').eq('restaurant_id', restaurantId),
        client.from('restaurant_tables').select('*').eq('restaurant_id', restaurantId),
        client.from('menu_items').select('*').eq('restaurant_id', restaurantId),
        client.from('menu_categories').select('*').eq('restaurant_id', restaurantId),
        client.from('inventory_items').select('*').eq('restaurant_id', restaurantId),
      ]);

      return {
        orders: ordersRes.data || [],
        tables: tablesRes.data || [],
        menuItems: menuRes.data || [],
        categories: categoriesRes.data || [],
        inventory: inventoryRes.data || [],
      };
    } catch (err) {
      console.warn('[Supabase] Error pulling restaurant data:', err);
      return null;
    }
  }
}

export const supabaseService = new SupabaseService();
