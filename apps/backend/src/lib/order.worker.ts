import { Worker, Job } from 'bullmq';
import { redis } from '../lib/redis.js';
import { prisma } from '../lib/prisma.js';

export interface OrderJobPayload {
  idempotencyKey: string;
  userId: string;
  items: any[];
  deliveryAddressId: string;
  paymentMethod: string;
  note?: string;
  receiptImageBase64?: string;
}

/**
 * Order Worker — Navbatga tushgan buyurtmalarni xavfsiz, birin-ketin DB ga yozadi.
 */
export const orderWorker = new Worker<OrderJobPayload>(
  'order-processing',
  async (job: Job) => {
    const { idempotencyKey, userId, items, deliveryAddressId, paymentMethod, note } = job.data;

    // 1. IDEMPOTENCY CHECK (Tarmoq qotishida 2 marta pul yechilmasligi uchun)
    const existingKey = await prisma.idempotencyKey.findUnique({
      where: { key: idempotencyKey }
    });

    if (existingKey) {
      console.log(`[OrderWorker] Duplicate request ignored for key: ${idempotencyKey}`);
      return JSON.parse(existingKey.responseJson); // Eski natijani qaytarish
    }

    // 2. HEAVY DATABASE TRANSACTION (Transaction yordamida DB ga yozish)
    const result = await prisma.$transaction(async (tx) => {
      
      // Bu yerga asl Order yaratish logikasi tushadi (Cart hisoblash, OrderItem qo'shish)
      // Hozirgi kod strukturangizga qarab moslaysiz
      const newOrder = await tx.order.create({
        data: {
          userId,
          orderNumber: Math.floor(100000 + Math.random() * 900000).toString(),
          status: 'PENDING',
          paymentMethod: paymentMethod as any,
          total: 0, // Placeholder
          deliveryFee: 5000,
          // qolgan maydonlar...
        }
      });

      // Idempotency kalitini saqlab qo'yamiz
      await tx.idempotencyKey.create({
        data: {
          key: idempotencyKey,
          orderId: newOrder.id,
          responseJson: JSON.stringify({ id: newOrder.id, status: 'CREATED', orderNumber: newOrder.orderNumber })
        }
      });

      return newOrder;
    });

    console.log(`[OrderWorker] Order #${result.orderNumber} successfully processed`);
    return result;
  },
  {
    connection: redis,
    concurrency: 50, // Tizim qotmasligi uchun bir vaqtda max 50 ta buyurtma yoziladi
  }
);

orderWorker.on('failed', (job, err) => {
  console.error(`[OrderWorker] Order Job ${job?.id} failed:`, err.message);
});
