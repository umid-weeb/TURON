import { Worker, type Job } from 'bullmq';
import type { Prisma } from '@prisma/client';
import { redis } from '../../../lib/redis.js';
import { prisma } from '../../../lib/prisma.js';
import { StorageService } from '../../../services/storage.service.js';
import { AuditService } from '../../../services/audit.service.js';
import { InAppNotificationsService } from '../../../services/in-app-notifications.service.js';
import { NotificationTypeEnum, UserRoleEnum } from '@turon/shared';
import { sendOrderNotificationToAdmin } from '../../../services/telegram-bot.service.js';
import { orderTrackingService } from '../../../services/order-tracking.service.js';
import { serializeOrder, ORDER_INCLUDE } from './order-helpers.js';

export interface OrderJobPayload {
  idempotencyKey: string;
  userId: string;
  deliveryAddressId: string;
  paymentMethod: string;
  note?: string;
  receiptImageBase64?: string;
  receiptImageUrl?: string;
  
  // Backend Controller hisob-kitob qilib jo'natadigan tayyor ma'lumotlar
  quote: any;
  orderItemsData: any[];
  promoId?: string;
  destinationLat: number;
  destinationLng: number;
  restaurantSettings: any;
}

/**
 * Order Worker — Navbatga tushgan buyurtmalarni xavfsiz, birin-ketin DB ga yozadi.
 */
export const orderWorker = new Worker<OrderJobPayload>(
  'order-processing',
  async (job: Job<OrderJobPayload>) => {
    const { 
      idempotencyKey, 
      userId, 
      deliveryAddressId, 
      paymentMethod, 
      note, 
      receiptImageBase64,
      receiptImageUrl,
      quote,
      orderItemsData,
      promoId,
      destinationLat,
      destinationLng,
      restaurantSettings
    } = job.data;

    // 1. IDEMPOTENCY CHECK (Tarmoq qotishida 2 marta pul yechilmasligi uchun)
    const existingKey = await prisma.idempotencyKey.findUnique({
      where: { key: idempotencyKey }
    });

    if (existingKey) {
      console.log(`[OrderWorker] Duplicate request ignored for key: ${idempotencyKey}`);
      return JSON.parse(existingKey.responseJson); // Eski natijani qaytarish
    }

    // Katta rasmni Supabase ga yuklash — BEST-EFFORT.
    // Order'ni storage upload xatosi tufayli rad etmaslik kerak: chek
    // baribir admin Telegram'iga inline yuboriladi (sendOrderNotification…
    // funksiyasi base64'ni qabul qiladi). Storage muvaffaqiyatsiz bo'lsa
    // faqat admin paneldagi thumbnail yo'qoladi, lekin buyurtma o'tib ketadi.
    let uploadedReceiptUrl = receiptImageUrl;
    if (paymentMethod === 'MANUAL_TRANSFER' && !receiptImageUrl && receiptImageBase64) {
      try {
        const uploadedUrl = await StorageService.uploadBase64(receiptImageBase64, 'receipts');
        if (uploadedUrl) {
          uploadedReceiptUrl = uploadedUrl;
        } else {
          console.warn('[OrderWorker] Receipt storage upload returned null — continuing without panel thumbnail.');
        }
      } catch (err) {
        console.warn('[OrderWorker] Receipt storage upload threw — continuing without panel thumbnail.', err);
      }
    }

    // 2. HEAVY DATABASE TRANSACTION (Transaction yordamida DB ga yozish)
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      
      // Agar promokod bo'lsa, limitlarni shu tranzaksiya ichida tekshiramiz va yangilaymiz
      if (promoId) {
        const updated = await tx.promoCode.update({
          where: { id: promoId },
          data: { timesUsed: { increment: 1 } },
        });

        if (typeof updated.usageLimit === 'number' && updated.usageLimit > 0 && updated.timesUsed > updated.usageLimit) {
          throw new Error('Promokod limiti tugagan');
        }

        const existingUserUsage = await tx.order.count({
          where: {
            userId,
            promoCodeId: promoId,
            status: { not: 'CANCELLED' as any },
          },
        });
        if (existingUserUsage > 0) {
          throw new Error('Siz bu promokoddan avval foydalangansiz');
        }
      }

      // Asil va to'liq Order yaratish logikasi (Chala kodlar to'ldirildi)
      const newOrder = await tx.order.create({
        data: {
          userId,
          deliveryAddressId,
          courierId: null,
          promoCodeId: promoId ?? null,
          status: 'PENDING',
          subtotal: quote.subtotal,
          discountAmount: quote.discountAmount,
          deliveryFee: quote.deliveryFee,
          deliveryDistanceMeters: quote.distanceMeters,
          deliveryEtaMinutes: quote.etaMinutes,
          deliveryFeeRuleCode: quote.feeRuleCode,
          deliveryFeeBaseAmount: quote.feeBaseAmount,
          deliveryFeeExtraAmount: quote.feeExtraAmount,
          totalAmount: quote.totalAmount,
          paymentMethod: paymentMethod as any,
          paymentStatus: 'PENDING',
          note: note?.trim() || null,
          destinationLat,
          destinationLng,
          restaurantName: restaurantSettings.name || null,
          restaurantPhone: restaurantSettings.phone || null,
          restaurantAddressText: restaurantSettings.addressText || null,
          restaurantLon: restaurantSettings.longitude,
          restaurantLat: restaurantSettings.latitude,
          items: {
            create: orderItemsData,
          },
          payment: {
            create: {
              method: paymentMethod as any,
              status: 'PENDING',
              amount: quote.totalAmount,
              provider:
                paymentMethod === 'MANUAL_TRANSFER'
                  ? 'Manual transfer'
                  : paymentMethod === 'EXTERNAL_PAYMENT'
                    ? 'External payment'
                    : null,
              receiptImageBase64: paymentMethod === 'MANUAL_TRANSFER' ? uploadedReceiptUrl : null,
              receiptUploadedAt: paymentMethod === 'MANUAL_TRANSFER' ? new Date() : null,
            },
          },
        },
        select: { id: true, orderNumber: true }
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

    // 3. REALTIME SSE, NOTIFICATIONS & AUDIT (Backend Architect qoidalari)
    // Controller'dan Queue'ga o'tganda (Bug 4) barcha xabarlar bevosita Worker'dan ketishi shart.
    const fullOrder = await prisma.order.findUnique({
      where: { id: result.id },
      include: ORDER_INCLUDE as any,
    });

    if (fullOrder) {
      const serializedOrder = serializeOrder(fullOrder);

      // Admin panelni jonli yangilash
      orderTrackingService.publishOrderUpdate(result.id, serializedOrder);

      await InAppNotificationsService.notifyAdmins({
        type: NotificationTypeEnum.ORDER_STATUS_UPDATE,
        title: 'Yangi buyurtma tushdi',
        message: `#${serializedOrder.orderNumber} buyurtma tasdiq kutmoqda`,
        relatedOrderId: result.id,
      });

      // Audit tarixiga muhrlash
      await AuditService.record({
        userId,
        actorRole: UserRoleEnum.CUSTOMER,
        action: 'CREATE_ORDER',
        entity: 'Order',
        entityId: result.id,
        newValue: serializedOrder,
        metadata: { source: 'worker', idempotencyKey }
      });

      // Telegram botga yuborish
      void sendOrderNotificationToAdmin({
        orderId: result.id,
        orderNumber: serializedOrder.orderNumber,
        createdAt: serializedOrder.createdAt,
        orderStatus: serializedOrder.orderStatus,
        customerName: serializedOrder.customerName || 'Mijoz',
        customerPhone: serializedOrder.customerPhone || null,
        customerAddress: serializedOrder.customerAddress?.addressText || "Manzil ko'rsatilmagan",
        customerAddressNote: serializedOrder.customerAddress?.note || null,
        deliveryDistanceMeters: Number(serializedOrder.deliveryDistanceMeters) || null,
        paymentMethod,
        items: serializedOrder.items.map((item: any) => ({
          name: item.name || item.itemName || 'Taom',
          quantity: item.quantity,
          totalPrice: item.totalPrice || (item.price * item.quantity),
        })),
        subtotal: Number(serializedOrder.subtotal),
        deliveryFee: Number(serializedOrder.deliveryFee),
        total: Number(serializedOrder.total),
        // DIQQAT: Telegram Buffer qulamaligi uchun unga Storage URL emas, Asl Base64 kodni uzatamiz!
        receiptImageBase64: paymentMethod === 'MANUAL_TRANSFER' ? receiptImageBase64 : undefined,
      });
    }

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
