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

export interface ChatReadPayload {
  orderId: string;
  /** Role that just read the messages (the OTHER role's messages are now read) */
  readerRole: 'COURIER' | 'CUSTOMER';
  readAt: string;
}

export interface ChatUnreadReminderPayload {
  orderId: string;
  /** Which side should see the "want to call?" reminder */
  forRole: 'COURIER' | 'CUSTOMER';
  messageId: string;
}

export interface OrderTrackingEvent {
  type: 'snapshot' | 'order.updated' | 'courier.location' | 'chat.message' | 'chat.read' | 'chat.unread_reminder';
  orderId: string;
  order?: unknown;
  tracking?: OrderTrackingSnapshot;
  chatMessage?: ChatMessagePayload;
  chatRead?: ChatReadPayload;
  chatUnreadReminder?: ChatUnreadReminderPayload;
}

class OrderTrackingService {
  private readonly emitter = new EventEmitter();
  private readonly snapshots = new Map<string, CourierLocationSnapshot>();
  /** Per-order: highest client-side GPS timestamp seen so far (ms). Guards against offline-sync teleportation. */
  private readonly lastClientTimestampMs = new Map<string, number>();
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

  publishCourierLocation(
    orderId: string,
    location: Omit<CourierLocationSnapshot, 'updatedAt'> & { updatedAt?: string },
    clientTimestampMs?: number,
  ): OrderTrackingSnapshot | undefined {
    // Stale check — offline-synced points must not teleport the live map marker.
    // If the incoming client timestamp is older than (or equal to) the last accepted one,
    // skip both the snapshot update and the SSE emit.
    if (clientTimestampMs !== undefined) {
      const lastMs = this.lastClientTimestampMs.get(orderId) ?? 0;
      if (clientTimestampMs <= lastMs) {
        return this.getCachedSnapshot(orderId);
      }
      this.lastClientTimestampMs.set(orderId, clientTimestampMs);
    }

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

  /**
   * Notify the sender that their messages have been read.
   * Emitted when the receiver opens the chat (markRead is called).
   */
  publishChatRead(orderId: string, readerRole: 'COURIER' | 'CUSTOMER') {
    this.emit({
      type: 'chat.read',
      orderId,
      chatRead: {
        orderId,
        readerRole,
        readAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Prompt the recipient to call the other party.
   * Emitted ~60 s after a message is sent if it is still unread.
   */
  publishChatUnreadReminder(
    orderId: string,
    forRole: 'COURIER' | 'CUSTOMER',
    messageId: string,
  ) {
    this.emit({
      type: 'chat.unread_reminder',
      orderId,
      chatUnreadReminder: { orderId, forRole, messageId },
    });
  }

  clearSnapshot(orderId: string) {
    this.snapshots.delete(orderId);
    this.lastClientTimestampMs.delete(orderId);
  }

  private getEventName(orderId: string) {
    return `order-tracking:${orderId}`;
  }
}

export const orderTrackingService = new OrderTrackingService();

/**
 * SseConnectionRegistry — foydalanuvchi boshqa qurilmada yoki tabda yangi SSE
 * ulanish ochganda avvalgisini yopadi.
 *
 * Muammo: Mijoz ilovani background/foreground qilsa EventSource qayta ulanadi.
 * Agar eski ulanish hali yoqilmagan bo'lsa, bir foydalanuvchida bir vaqtda
 * N ta listener ishlaydi → har bir event N marta yuboriladi.
 *
 * Yechim: Har bir (userId, streamType) juftligi uchun bitta aktiv cleanup fn
 * saqlaymiz. Yangi ulanish kelganda avvalgisi darhol yopiladi.
 *
 * Key format:
 *   `order:{orderId}:{userId}`  — streamOrderTracking uchun
 *   `orders:{userId}`           — streamOrders uchun
 */
class SseConnectionRegistry {
  private readonly active = new Map<string, () => void>();

  /**
   * Yangi SSE ulanishni ro'yxatga olish.
   * Agar bu key bo'yicha aktiv ulanish bo'lsa — darhol yopiladi.
   */
  register(key: string, cleanup: () => void): void {
    this.active.get(key)?.(); // avvalgi ulanishni yop
    this.active.set(key, cleanup);
  }

  /**
   * Ulanish tabiiy ravishda yopilganda ro'yxatdan chiqarish.
   * Double-cleanup oldini olish uchun `register` bilan parallel chaqirilmaydi.
   */
  deregister(key: string): void {
    this.active.delete(key);
  }
}

export const sseConnectionRegistry = new SseConnectionRegistry();
