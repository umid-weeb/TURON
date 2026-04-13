import { EventEmitter } from 'node:events';
import { CourierPresenceService } from './courier-presence.service.js';

export interface CourierLocationSnapshot {
  latitude: number;
  longitude: number;
  heading?: number;
  speedKmh?: number;
  remainingDistanceKm?: number;
  remainingEtaMinutes?: number;
  updatedAt: string;
}

export interface OrderTrackingSnapshot {
  isLive: boolean;
  lastEventAt: string;
  courierLocation?: CourierLocationSnapshot;
}

export interface ChatMessagePayload {
  id: string;
  orderId: string;
  senderId: string;
  senderRole: 'COURIER' | 'CUSTOMER';
  senderName: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface OrderTrackingEvent {
  type: 'snapshot' | 'order.updated' | 'courier.location' | 'chat.message';
  orderId: string;
  order?: unknown;
  tracking?: OrderTrackingSnapshot;
  chatMessage?: ChatMessagePayload;
}

class OrderTrackingService {
  private readonly emitter = new EventEmitter();
  private readonly snapshots = new Map<string, CourierLocationSnapshot>();
  private readonly liveWindowMs = 45_000;
  private readonly globalEventName = 'order-tracking:all';

  constructor() {
    this.emitter.setMaxListeners(0);
  }

  subscribe(orderId: string, listener: (event: OrderTrackingEvent) => void) {
    const eventName = this.getEventName(orderId);
    this.emitter.on(eventName, listener);

    return () => {
      this.emitter.off(eventName, listener);
    };
  }

  subscribeAll(listener: (event: OrderTrackingEvent) => void) {
    this.emitter.on(this.globalEventName, listener);

    return () => {
      this.emitter.off(this.globalEventName, listener);
    };
  }

  publishSnapshot(orderId: string, order: unknown) {
    this.emit({
      type: 'snapshot',
      orderId,
      order,
      tracking: this.getCachedSnapshot(orderId),
    });
  }

  publishOrderUpdate(orderId: string, order: unknown) {
    this.emit({
      type: 'order.updated',
      orderId,
      order,
      tracking: this.getCachedSnapshot(orderId),
    });
  }

  publishCourierLocation(orderId: string, location: Omit<CourierLocationSnapshot, 'updatedAt'> & { updatedAt?: string }) {
    const snapshot: CourierLocationSnapshot = {
      ...location,
      updatedAt: location.updatedAt || new Date().toISOString(),
    };

    this.snapshots.set(orderId, snapshot);

    const tracking = this.getCachedSnapshot(orderId);
    this.emit({
      type: 'courier.location',
      orderId,
      tracking,
    });

    return tracking;
  }

  async getSnapshot(orderId: string): Promise<OrderTrackingSnapshot | undefined> {
    const cached = this.getCachedSnapshot(orderId);
    if (cached?.isLive) return cached;

    const persisted = await CourierPresenceService.getOrderTrackingSnapshot(orderId);
    if (persisted?.courierLocation) {
      this.snapshots.set(orderId, persisted.courierLocation);
      return persisted;
    }
    if (!persisted) this.snapshots.delete(orderId);
    return persisted;
  }

  // Batch-prefetch snapshots for multiple orders in a SINGLE DB query.
  // Call before looping over orders to avoid N individual DB round-trips.
  async prefetchSnapshots(orderIds: string[]): Promise<void> {
    if (!orderIds.length) return;
    const rows = await CourierPresenceService.getOrderTrackingSnapshotBatch(orderIds);
    for (const [orderId, snapshot] of rows) {
      if (snapshot.courierLocation) {
        this.snapshots.set(orderId, snapshot.courierLocation);
      }
    }
  }

  getCachedSnapshot(orderId: string): OrderTrackingSnapshot | undefined {
    const location = this.snapshots.get(orderId);

    if (!location) {
      return undefined;
    }

    const isLive = Date.now() - new Date(location.updatedAt).getTime() <= this.liveWindowMs;

    return {
      isLive,
      lastEventAt: location.updatedAt,
      courierLocation: location,
    };
  }

  private emit(event: OrderTrackingEvent) {
    this.emitter.emit(this.getEventName(event.orderId), event);
    this.emitter.emit(this.globalEventName, event);
  }

  publishChatMessage(orderId: string, message: ChatMessagePayload) {
    this.emit({
      type: 'chat.message',
      orderId,
      chatMessage: message,
    });
  }

  clearSnapshot(orderId: string) {
    this.snapshots.delete(orderId);
  }

  private getEventName(orderId: string) {
    return `order-tracking:${orderId}`;
  }
}

export const orderTrackingService = new OrderTrackingService();
