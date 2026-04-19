// filepath: apps/miniapp/src/features/courier/offlineSync.ts
import { useEffect, useRef } from 'react';

/**
 * Offline Support & Sync Queue System
 * Queues location updates when offline, syncs when back online
 */

export interface QueuedLocationUpdate {
  orderId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
}

export interface SyncQueueStats {
  totalQueued: number;
  pendingCount: number;
  syncingCount: number;
  failedCount: number;
  syncedCount: number;
}

const QUEUE_DB_NAME = 'turon_courier_queue';
const QUEUE_STORE_NAME = 'location_updates';
const MAX_RETRY_ATTEMPTS = 3;

export class OfflineSyncManager {
  private db: IDBDatabase | null = null;
  private isOnline: boolean = navigator.onLine;
  private syncInterval: number | null = null;
  private stats: SyncQueueStats = {
    totalQueued: 0,
    pendingCount: 0,
    syncingCount: 0,
    failedCount: 0,
    syncedCount: 0,
  };

  constructor(private onSync?: (update: QueuedLocationUpdate) => Promise<void>) {
    this.initDB();
    this.setupNetworkListeners();
  }

  /**
   * Initialize IndexedDB for offline queue storage
   */
  private initDB() {
    const request = indexedDB.open(QUEUE_DB_NAME, 1);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(QUEUE_STORE_NAME)) {
        db.createObjectStore(QUEUE_STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => {
      this.db = request.result;
      this.loadStats();
      console.log('✅ Offline queue initialized');
    };
  }

  /**
   * Setup online/offline event listeners
   */
  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('📡 Back online! Starting sync...');
      this.syncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📵 Offline mode activated');
    });

    // Start periodic sync every 30 seconds
    this.syncInterval = window.setInterval(() => {
      if (this.isOnline && this.stats.pendingCount > 0) {
        this.syncQueue();
      }
    }, 30000);
  }

  /**
   * Queue a location update
   */
  async queueLocationUpdate(update: Omit<QueuedLocationUpdate, 'timestamp' | 'status' | 'retryCount'>) {
    if (!this.db) {
      console.warn('Database not ready');
      return;
    }

    const queuedUpdate: QueuedLocationUpdate = {
      ...update,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
    };

    try {
      const tx = this.db.transaction([QUEUE_STORE_NAME], 'readwrite');
      const store = tx.objectStore(QUEUE_STORE_NAME);
      await new Promise((resolve, reject) => {
        const request = store.add(queuedUpdate);
        request.onsuccess = resolve;
        request.onerror = reject;
      });

      this.stats.totalQueued++;
      this.stats.pendingCount++;

      console.log(`📤 Queued: ${update.orderId} (pending: ${this.stats.pendingCount})`);

      // If online, sync immediately
      if (this.isOnline) {
        this.syncQueue();
      }
    } catch (error) {
      console.error('Failed to queue update:', error);
    }
  }

  /**
   * Sync all pending updates
   */
  async syncQueue() {
    if (!this.db || !this.onSync) {
      return;
    }

    const tx = this.db.transaction([QUEUE_STORE_NAME], 'readonly');
    const store = tx.objectStore(QUEUE_STORE_NAME);

    const pending: QueuedLocationUpdate[] = [];

    await new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        pending.push(...(request.result.filter((u) => u.status === 'pending' || u.status === 'failed') as any));
        resolve(null);
      };
    });

    for (const update of pending) {
      await this.syncSingleUpdate(update);
    }
  }

  /**
   * Sync a single update
   */
  private async syncSingleUpdate(update: QueuedLocationUpdate) {
    if (!this.db || !this.onSync) {
      return;
    }

    // Mark as syncing
    await this.updateStatus(update, 'syncing');

    try {
      await this.onSync(update);

      // Mark as synced
      await this.updateStatus(update, 'synced');
      this.stats.syncedCount++;
      console.log(`✅ Synced: ${update.orderId}`);
    } catch (error) {
      update.retryCount++;

      if (update.retryCount >= MAX_RETRY_ATTEMPTS) {
        await this.updateStatus(update, 'failed');
        this.stats.failedCount++;
        console.error(`❌ Failed after ${MAX_RETRY_ATTEMPTS} retries:`, update.orderId);
      } else {
        await this.updateStatus(update, 'failed');
        console.warn(`⚠️ Retry ${update.retryCount}/${MAX_RETRY_ATTEMPTS}:`, update.orderId);
      }
    }
  }

  /**
   * Update status of a queued item
   */
  private async updateStatus(update: QueuedLocationUpdate, status: QueuedLocationUpdate['status']) {
    if (!this.db) return;

    const tx = this.db.transaction([QUEUE_STORE_NAME], 'readwrite');
    const store = tx.objectStore(QUEUE_STORE_NAME);

    await new Promise((resolve) => {
      const request = store.put({
        ...update,
        status,
      });
      request.onsuccess = resolve;
    });

    this.updateStats();
  }

  /**
   * Load statistics from database
   */
  private async loadStats() {
    if (!this.db) return;

    const tx = this.db.transaction([QUEUE_STORE_NAME], 'readonly');
    const store = tx.objectStore(QUEUE_STORE_NAME);

    await new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const updates = request.result as QueuedLocationUpdate[];
        this.stats = {
          totalQueued: updates.length,
          pendingCount: updates.filter((u) => u.status === 'pending').length,
          syncingCount: updates.filter((u) => u.status === 'syncing').length,
          failedCount: updates.filter((u) => u.status === 'failed').length,
          syncedCount: updates.filter((u) => u.status === 'synced').length,
        };
        resolve(null);
      };
    });
  }

  /**
   * Update statistics
   */
  private updateStats() {
    this.loadStats();
  }

  /**
   * Get sync statistics
   */
  getStats(): SyncQueueStats {
    return { ...this.stats };
  }

  /**
   * Clear all synced items to save space
   */
  async clearSyncedItems() {
    if (!this.db) return;

    const tx = this.db.transaction([QUEUE_STORE_NAME], 'readwrite');
    const store = tx.objectStore(QUEUE_STORE_NAME);

    await new Promise((resolve) => {
      const request = store.clear();
      request.onsuccess = resolve;
    });

    this.stats = {
      totalQueued: 0,
      pendingCount: 0,
      syncingCount: 0,
      failedCount: 0,
      syncedCount: 0,
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    if (this.db) {
      this.db.close();
    }
  }
}

/**
 * React hook for offline sync
 */
export function useOfflineSync(onSync: (update: QueuedLocationUpdate) => Promise<void>) {
  const managerRef = useRef<OfflineSyncManager | null>(null);

  useEffect(() => {
    managerRef.current = new OfflineSyncManager(onSync);
    return () => {
      managerRef.current?.destroy();
    };
  }, [onSync]);

  return {
    queue: async (update: Omit<QueuedLocationUpdate, 'timestamp' | 'status' | 'retryCount'>) => {
      await managerRef.current?.queueLocationUpdate(update);
    },
    sync: async () => {
      await managerRef.current?.syncQueue();
    },
    getStats: () => managerRef.current?.getStats(),
  };
}

