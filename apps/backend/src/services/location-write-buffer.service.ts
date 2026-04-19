/**
 * LocationWriteBuffer — kuryer lokatsiyasini DB ga batch yozish.
 *
 * Muammo: 10 000 kuryer × 1 heartbeat/sec = 10 000 PostgreSQL upsert/sec
 *         Bu Postgres ni to'yintiradi va barcha API ni sekinlashtiradi.
 *
 * Yechim:
 *   1. Kelgan har bir update ni in-memory Map ga yozamiz (O(1), instant).
 *   2. SSE ga DARHOL push qilamiz (in-memory EventEmitter, DB kutmaymiz).
 *   3. Har FLUSH_INTERVAL_MS da Map ni tozalab, DB ga batch upsert qilamiz.
 *
 * Natija: 10 000 writes/sec → ~10 000 / (FLUSH_INTERVAL_MS/1000) writes/interval.
 *   FLUSH_INTERVAL_MS=10_000 da:  10 000 / 10 = 1 000 writes/flush (100x kamayish).
 *   Har bir flush Promise.allSettled bilan parallel borladi — Postgres n_connections
 *   chegarasini hisobga olamiz.
 *
 * Trade-off: server to'satdan o'chsa ≤ FLUSH_INTERVAL_MS soniyalik lokatsiya
 *   yo'qoladi. Real delivery uchun bu qabul qilinadi — SSE real vaqtda ishlaydi.
 */

import { prisma } from '../lib/prisma.js';

export interface BufferedLocation {
  courierId: string;
  orderId: string | null;
  latitude: number;
  longitude: number;
  heading?: number | null;
  speedKmh?: number | null;
  remainingDistanceKm?: number | null;
  remainingEtaMinutes?: number | null;
  /** Client-side GPS reading time (ms since epoch). Used to prevent stale offline updates from overwriting current DB presence. */
  recordedAtMs?: number;
}

const FLUSH_INTERVAL_MS = 10_000;   // 10 soniya
const MAX_PARALLEL_WRITES = 50;     // Bir vaqtda max DB upsert

class LocationWriteBuffer {
  /** courierId → eng so'nggi update */
  private readonly buffer = new Map<string, BufferedLocation>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => { void this.flush(); }, FLUSH_INTERVAL_MS);
    // Jarayon tugashidan oldin ham yozib qo'yamiz
    process.once('SIGTERM', () => { void this.flush(); });
    process.once('SIGINT',  () => { void this.flush(); });
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Yangi lokatsiyani bufferga qo'shish (O(1)).
   * Bir courierdan bir vaqtda faqat eng so'nggi update saqlanadi.
   * Agar yangi update eski timestamp bilan kelsa (oflayn-sync) — e'tiborsiz qolinadi.
   */
  enqueue(data: BufferedLocation): void {
    if (data.recordedAtMs !== undefined) {
      const stored = this.buffer.get(data.courierId);
      if (stored?.recordedAtMs !== undefined && data.recordedAtMs <= stored.recordedAtMs) {
        return; // Stale offline update — don't overwrite current DB presence
      }
    }
    this.buffer.set(data.courierId, data);
  }

  /** Bufferda hech narsa yo'qligini tekshirish */
  get size(): number {
    return this.buffer.size;
  }

  /** Barcha bufferdagi ma'lumotlarni DB ga yozish */
  async flush(): Promise<void> {
    if (this.flushing || !this.buffer.size) return;
    this.flushing = true;

    // Darhol tozalab olamiz — flush davomida kelgan yangi updatelar yo'qolmasin
    const entries = Array.from(this.buffer.values());
    this.buffer.clear();

    try {
      // MAX_PARALLEL_WRITES ta parallel upsert — Postgres connection pool ni
      // to'ldirmaslik uchun
      for (let i = 0; i < entries.length; i += MAX_PARALLEL_WRITES) {
        const batch = entries.slice(i, i + MAX_PARALLEL_WRITES);
        await Promise.allSettled(
          batch.map((loc) =>
            prisma.courierPresence.upsert({
              where: { courierId: loc.courierId },
              create: {
                courierId: loc.courierId,
                orderId: loc.orderId ?? null,
                latitude: loc.latitude,
                longitude: loc.longitude,
                heading: loc.heading ?? null,
                speedKmh: loc.speedKmh ?? null,
                remainingDistanceKm: loc.remainingDistanceKm ?? null,
                remainingEtaMinutes: loc.remainingEtaMinutes ?? null,
              },
              update: {
                orderId: loc.orderId ?? null,
                latitude: loc.latitude,
                longitude: loc.longitude,
                heading: loc.heading ?? null,
                speedKmh: loc.speedKmh ?? null,
                remainingDistanceKm: loc.remainingDistanceKm ?? null,
                remainingEtaMinutes: loc.remainingEtaMinutes ?? null,
              },
            }),
          ),
        );
      }
    } catch (err) {
      console.error('[LocationWriteBuffer] flush error:', err);
      // entries ni qaytarib qo'shmaymiz — keyingi flush yangi holatni yozadi
    } finally {
      this.flushing = false;
    }
  }
}

export const locationWriteBuffer = new LocationWriteBuffer();
// API serveri ishga tushganida start() chaqirilishi kerak (index.ts da)
