export type OfflineOperationType =
  | 'create_order'
  | 'update_order_status'
  | 'cancel_order'
  | 'adjust_stock';

export interface OfflineOperation {
  operationId: string;
  type: OfflineOperationType;
  restaurantId: string;
  payload: any;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

const QUEUE_STORAGE_KEY = 'dineflow_offline_queue_v1';

class OfflineQueueManager {
  private listeners: Set<() => void> = new Set();

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  public getAll(restaurantId?: string): OfflineOperation[] {
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (!raw) return [];
      const parsed: OfflineOperation[] = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return restaurantId ? parsed.filter((op) => op.restaurantId === restaurantId) : parsed;
    } catch {
      return [];
    }
  }

  private saveAll(ops: OfflineOperation[]): void {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(ops));
    this.notify();
  }

  public enqueue(op: Omit<OfflineOperation, 'createdAt' | 'retryCount'>): OfflineOperation {
    const ops = this.getAll();
    const existing = ops.find((item) => item.operationId === op.operationId);
    if (existing) return existing;

    const record: OfflineOperation = {
      ...op,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    ops.push(record);
    this.saveAll(ops);
    return record;
  }

  public remove(operationId: string): void {
    const ops = this.getAll().filter((op) => op.operationId !== operationId);
    this.saveAll(ops);
  }

  public markError(operationId: string, errorMsg: string): void {
    const ops = this.getAll().map((op) =>
      op.operationId === operationId
        ? { ...op, retryCount: op.retryCount + 1, lastError: errorMsg }
        : op
    );
    this.saveAll(ops);
  }

  public getPendingCount(restaurantId?: string): number {
    return this.getAll(restaurantId).length;
  }

  public clearForRestaurant(restaurantId: string): void {
    const remaining = this.getAll().filter((op) => op.restaurantId !== restaurantId);
    this.saveAll(remaining);
  }
}

export const offlineQueue = new OfflineQueueManager();
