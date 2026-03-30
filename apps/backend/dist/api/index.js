import {
  DeliveryStageEnum,
  OrderStatusEnum,
  PaymentMethodEnum,
  PromoDiscountTypeEnum,
  env
} from "../chunk-X57UHOE3.js";

// src/api/index.ts
import fastify from "fastify";

// src/api/app.ts
import fp4 from "fastify-plugin";
import cors from "@fastify/cors";

// src/api/plugins/auth.ts
import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
var auth_default = fp(async function authPlugin(fastify2) {
  fastify2.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || "super-secret-key"
  });
  fastify2.decorate("authenticate", async function(request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });
  fastify2.decorate("authorize", function(allowedRoles) {
    return async (request, reply) => {
      const user = request.user;
      if (!user || !allowedRoles.includes(user.role)) {
        return reply.status(403).send({ error: "Forbidden: Insufficient permissions" });
      }
    };
  });
});

// src/api/plugins/security.ts
import fp2 from "fastify-plugin";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
var security_default = fp2(async function securityPlugin(fastify2) {
  await fastify2.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === "production" ? void 0 : false
  });
  await fastify2.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: "1 minute",
    errorResponseBuilder: (request, context) => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: `Sekundiga so'rovlar soni oshib ketdi. Iltimos ${context.after} kutib turing.`
    })
  });
});

// src/api/plugins/validation.ts
import fp3 from "fastify-plugin";
import {
  validatorCompiler,
  serializerCompiler
} from "fastify-type-provider-zod";
var validation_default = fp3(async function validationPlugin(fastify2) {
  fastify2.setValidatorCompiler(validatorCompiler);
  fastify2.setSerializerCompiler(serializerCompiler);
});

// src/api/modules/auth/auth.controller.ts
import { PrismaClient as PrismaClient2 } from "@prisma/client";

// src/api/utils/telegram.ts
import crypto from "crypto";
function verifyTelegramWebAppData(initData, botToken) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");
  urlParams.delete("hash");
  const dataCheckString = Array.from(urlParams.entries()).map(([key, value]) => `${key}=${value}`).sort().join("\n");
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const hmac = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  return hmac === hash;
}
function parseTelegramInitData(initData) {
  const urlParams = new URLSearchParams(initData);
  const userString = urlParams.get("user");
  if (!userString) return null;
  try {
    return JSON.parse(userString);
  } catch (e) {
    return null;
  }
}

// src/services/audit.service.ts
import { PrismaClient } from "@prisma/client";
var prisma = new PrismaClient();
var AuditService = class {
  /**
   * Records a data mutation in the audit log.
   */
  static async record(params) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          oldValue: params.oldValue,
          newValue: params.newValue
        }
      });
    } catch (error) {
      console.error("\u274C Audit log failure:", error);
    }
  }
  static async recordStatusChange(params) {
    return this.record({
      ...params,
      action: "STATUS_CHANGE",
      oldValue: { status: params.from },
      newValue: { status: params.to }
    });
  }
};

// src/api/modules/auth/auth.controller.ts
var prisma2 = new PrismaClient2();
async function telegramAuthHandler(request, reply) {
  const { initData } = request.body;
  const botToken = env.BOT_TOKEN;
  if (!verifyTelegramWebAppData(initData, botToken)) {
    return reply.status(401).send({ error: "Invalid Telegram signature" });
  }
  const tgUser = parseTelegramInitData(initData);
  if (!tgUser || !tgUser.id) {
    return reply.status(400).send({ error: "Could not parse Telegram user" });
  }
  const telegramId = tgUser.id.toString();
  let user = await prisma2.user.findUnique({
    where: { telegramId },
    include: { roles: true }
  });
  if (!user) {
    user = await prisma2.user.create({
      data: {
        telegramId,
        firstName: tgUser.first_name || "User",
        lastName: tgUser.last_name,
        username: tgUser.username,
        roles: { create: { role: "CUSTOMER" /* CUSTOMER */ } }
      },
      include: { roles: true }
    });
  }
  const roleNames = user.roles.map((r) => r.role);
  let primaryRole = "CUSTOMER" /* CUSTOMER */;
  if (roleNames.includes("ADMIN" /* ADMIN */)) primaryRole = "ADMIN" /* ADMIN */;
  else if (roleNames.includes("COURIER" /* COURIER */)) primaryRole = "COURIER" /* COURIER */;
  await AuditService.record({
    userId: user.id,
    action: "LOGIN",
    entity: "User",
    entityId: user.id,
    newValue: { role: primaryRole, timestamp: /* @__PURE__ */ new Date() }
  });
  const token = await reply.jwtSign({ id: user.id, role: primaryRole });
  return reply.send({
    user: {
      id: user.id,
      telegramId: user.telegramId,
      fullName: `${user.firstName} ${user.lastName || ""}`.trim(),
      phoneNumber: user.phoneNumber,
      role: primaryRole,
      language: user.language
    },
    token
  });
}

// src/api/utils/schemas.ts
import { z } from "zod";
var UuidSchema = z.string().uuid();
var IdParamSchema = z.object({ id: UuidSchema });
var TelegramAuthSchema = z.object({
  initData: z.string().min(1)
});
var CategorySchema = z.object({
  nameUz: z.string().min(2),
  nameRu: z.string().min(2),
  nameEn: z.string().min(2),
  sortOrder: z.number().int().optional()
});
var MenuItemSchema = z.object({
  categoryId: UuidSchema,
  nameUz: z.string().min(2),
  nameRu: z.string().min(2),
  nameEn: z.string().min(2),
  price: z.number().positive(),
  stockQuantity: z.number().int().min(0)
});
var AddressSchema = z.object({
  title: z.string().optional(),
  address: z.string().min(5),
  latitude: z.number(),
  longitude: z.number()
});
var CreateOrderSchema = z.object({
  items: z.array(z.object({
    menuItemId: UuidSchema,
    quantity: z.number().int().positive()
  })).min(1),
  deliveryAddressId: UuidSchema,
  paymentMethod: z.nativeEnum(PaymentMethodEnum),
  promoCode: z.string().optional(),
  note: z.string().optional()
});
var UpdateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatusEnum)
});
var UpdateDeliveryStageSchema = z.object({
  stage: z.nativeEnum(DeliveryStageEnum)
});
var PromoCodeSchema = z.object({
  code: z.string().min(3).transform((val) => val.toUpperCase()),
  discountType: z.nativeEnum(PromoDiscountTypeEnum),
  discountValue: z.number().positive(),
  minOrderValue: z.number().min(0).default(0),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  usageLimit: z.number().int().positive().optional()
});
var ValidatePromoSchema = z.object({
  code: z.string().min(1).transform((val) => val.toUpperCase())
});

// src/api/modules/auth/auth.routes.ts
async function authRoutes(fastify2) {
  fastify2.post("/telegram", {
    schema: {
      body: TelegramAuthSchema
    }
  }, telegramAuthHandler);
}

// src/api/modules/courier/courier.controller.ts
import { PrismaClient as PrismaClient3 } from "@prisma/client";

// src/services/status.service.ts
var StatusService = class {
  /**
   * Validates if the order status transition is permissible.
   */
  static validateOrderStatusTransition(from, to) {
    if (from === to) return true;
    const allowedTransitions = {
      ["PENDING" /* PENDING */]: ["PREPARING" /* PREPARING */, "CANCELLED" /* CANCELLED */],
      ["PREPARING" /* PREPARING */]: ["READY_FOR_PICKUP" /* READY_FOR_PICKUP */, "CANCELLED" /* CANCELLED */],
      ["READY_FOR_PICKUP" /* READY_FOR_PICKUP */]: ["DELIVERING" /* DELIVERING */, "CANCELLED" /* CANCELLED */],
      ["DELIVERING" /* DELIVERING */]: ["DELIVERED" /* DELIVERED */, "CANCELLED" /* CANCELLED */],
      ["DELIVERED" /* DELIVERED */]: [],
      // Terminal state
      ["CANCELLED" /* CANCELLED */]: []
      // Terminal state
    };
    return allowedTransitions[from]?.includes(to) ?? false;
  }
  /**
   * Validates if the delivery stage transition is permissible.
   */
  static validateDeliveryStageTransition(from, to) {
    if (from === to) return true;
    const sequence = [
      "IDLE" /* IDLE */,
      "GOING_TO_RESTAURANT" /* GOING_TO_RESTAURANT */,
      "ARRIVED_AT_RESTAURANT" /* ARRIVED_AT_RESTAURANT */,
      "PICKED_UP" /* PICKED_UP */,
      "DELIVERING" /* DELIVERING */,
      "ARRIVED_AT_DESTINATION" /* ARRIVED_AT_DESTINATION */,
      "DELIVERED" /* DELIVERED */
    ];
    const fromIndex = sequence.indexOf(from);
    const toIndex = sequence.indexOf(to);
    return toIndex === fromIndex + 1;
  }
  /**
   * Maps a DeliveryStage update to a potential OrderStatus update.
   */
  static mapStageToOrderStatus(stage) {
    switch (stage) {
      case "PICKED_UP" /* PICKED_UP */:
      case "DELIVERING" /* DELIVERING */:
      case "ARRIVED_AT_DESTINATION" /* ARRIVED_AT_DESTINATION */:
        return "DELIVERING" /* DELIVERING */;
      case "DELIVERED" /* DELIVERED */:
        return "DELIVERED" /* DELIVERED */;
      default:
        return null;
    }
  }
};

// src/api/modules/courier/courier.controller.ts
var prisma3 = new PrismaClient3();
async function getCourierOrders(request, reply) {
  const user = request.user;
  const courierId = user.id;
  const assignments = await prisma3.courierAssignment.findMany({
    where: {
      courierId,
      status: { in: ["ASSIGNED" /* ASSIGNED */, "REJECTED" /* REJECTED */] }
    },
    include: {
      order: {
        include: {
          user: true,
          deliveryAddress: true
        }
      }
    },
    orderBy: { assignedAt: "desc" }
  });
  const formattedOrders = assignments.map((a) => ({
    id: a.order.id,
    orderNumber: a.order.orderNumber,
    status: a.order.status,
    deliveryStage: a.order.deliveryStage,
    totalAmount: a.order.totalAmount,
    paymentMethod: a.order.paymentMethod,
    customerName: `${a.order.user.firstName} ${a.order.user.lastName || ""}`.trim(),
    destinationAddress: a.order.deliveryAddress.address,
    createdAt: a.order.createdAt
  }));
  return reply.send(formattedOrders);
}
async function getCourierOrderDetail(request, reply) {
  const { id } = request.params;
  const user = request.user;
  const courierId = user.id;
  const order = await prisma3.order.findUnique({
    where: { id },
    include: {
      user: true,
      deliveryAddress: true,
      courierAssignments: {
        where: { courierId }
      }
    }
  });
  if (!order || order.courierAssignments.length === 0) {
    return reply.status(403).send({ error: "Ruxsat etilmadi: Bu buyurtma sizga tegishli emas." });
  }
  return reply.send({
    ...order,
    customerName: `${order.user.firstName} ${order.user.lastName || ""}`,
    customerPhone: order.user.phoneNumber,
    destinationAddress: order.deliveryAddress.address,
    pickupLat: order.pickupLat || 41.311081,
    pickupLng: order.pickupLng || 69.240562,
    destinationLat: order.deliveryAddress.latitude,
    destinationLng: order.deliveryAddress.longitude
  });
}
async function updateOrderStage(request, reply) {
  const { id } = request.params;
  const { stage } = request.body;
  const user = request.user;
  const courierId = user.id;
  const order = await prisma3.order.findUnique({
    where: { id },
    include: { courierAssignments: { where: { courierId } } }
  });
  if (!order || order.courierAssignments.length === 0) {
    return reply.status(403).send({ error: "Ruxsat etilmadi." });
  }
  const currentStage = order.deliveryStage;
  const isValidTransition = StatusService.validateDeliveryStageTransition(currentStage, stage);
  if (!isValidTransition) {
    return reply.status(400).send({
      error: `Bosqichni o'zgartirib bo'lmaydi: ${currentStage} -> ${stage}`
    });
  }
  const updateData = {
    deliveryStage: stage
  };
  const newStatus = StatusService.mapStageToOrderStatus(stage);
  if (newStatus) {
    updateData.status = newStatus;
  }
  const now = /* @__PURE__ */ new Date();
  if (stage === "PICKED_UP" /* PICKED_UP */) updateData.pickupAt = now;
  if (stage === "DELIVERED" /* DELIVERED */) updateData.deliveredAt = now;
  const updatedOrder = await prisma3.order.update({
    where: { id },
    data: updateData
  });
  await AuditService.record({
    userId: courierId,
    action: "UPDATE_DELIVERY_STAGE",
    entity: "Order",
    entityId: id,
    oldValue: { stage: currentStage },
    newValue: { stage }
  });
  return reply.send(updatedOrder);
}

// src/api/modules/courier/courier.routes.ts
async function courierRoutes(fastify2) {
  fastify2.addHook("preHandler", fastify2.authorize(["COURIER" /* COURIER */, "ADMIN" /* ADMIN */]));
  fastify2.get("/orders", getCourierOrders);
  fastify2.get("/order/:id", {
    schema: {
      params: IdParamSchema
    }
  }, getCourierOrderDetail);
  fastify2.patch("/order/:id/stage", {
    schema: {
      params: IdParamSchema,
      body: UpdateDeliveryStageSchema
    }
  }, updateOrderStage);
}

// src/api/modules/menu/menu.controller.ts
import { PrismaClient as PrismaClient4 } from "@prisma/client";
var prisma4 = new PrismaClient4();
async function getCategories(request, reply) {
  const categories = await prisma4.menuCategory.findMany({
    where: { isActive: true },
    include: { items: { include: { images: true } } },
    orderBy: { sortOrder: "asc" }
  });
  return reply.send(categories);
}
async function getProducts(request, reply) {
  const products = await prisma4.menuItem.findMany({
    where: { isActive: true },
    include: { images: true, category: true }
  });
  return reply.send(products);
}
async function getProductById(request, reply) {
  const product = await prisma4.menuItem.findUnique({
    where: { id: request.params.id },
    include: { images: true, category: true }
  });
  if (!product) return reply.status(404).send({ error: "Maxsulot topilmadi" });
  return reply.send(product);
}
async function handleCreateCategory(request, reply) {
  const user = request.user;
  const data = request.body;
  const category = await prisma4.menuCategory.create({
    data: {
      nameUz: data.nameUz,
      nameRu: data.nameRu,
      nameEn: data.nameEn,
      sortOrder: data.sortOrder || 0
    }
  });
  await AuditService.record({
    userId: user.id,
    action: "CREATE_CATEGORY",
    entity: "MenuCategory",
    entityId: category.id,
    newValue: category
  });
  return reply.status(201).send(category);
}
async function handleCreateProduct(request, reply) {
  const user = request.user;
  const data = request.body;
  const product = await prisma4.menuItem.create({
    data: {
      categoryId: data.categoryId,
      nameUz: data.nameUz,
      nameRu: data.nameRu,
      nameEn: data.nameEn,
      price: data.price,
      stockQuantity: data.stockQuantity || 0
    }
  });
  await AuditService.record({
    userId: user.id,
    action: "CREATE_PRODUCT",
    entity: "MenuItem",
    entityId: product.id,
    newValue: product
  });
  return reply.status(201).send(product);
}

// src/api/modules/menu/menu.routes.ts
async function menuRoutes(fastify2) {
  fastify2.get("/categories", getCategories);
  fastify2.get("/products", getProducts);
  fastify2.get("/products/:id", {
    schema: { params: IdParamSchema }
  }, getProductById);
  fastify2.register(async (admin) => {
    admin.addHook("preHandler", admin.authorize(["ADMIN" /* ADMIN */]));
    admin.post("/categories", {
      schema: { body: CategorySchema }
    }, handleCreateCategory);
    admin.post("/products", {
      schema: { body: MenuItemSchema }
    }, handleCreateProduct);
  });
}

// src/api/modules/orders/orders.controller.ts
import { PrismaClient as PrismaClient5 } from "@prisma/client";
var prisma5 = new PrismaClient5();
async function handleCreateOrder(request, reply) {
  const user = request.user;
  const { items, deliveryAddressId, paymentMethod, promoCode } = request.body;
  const dbItems = await prisma5.menuItem.findMany({
    where: { id: { in: items.map((i) => i.menuItemId) }, isActive: true }
  });
  if (dbItems.length !== items.length) {
    return reply.status(400).send({ error: "Ba`zi taomlar ochirilgan yoki topilmadi" });
  }
  let subtotal = 0;
  const orderItemsData = items.map((i) => {
    const dbItem = dbItems.find((d) => d.id === i.menuItemId);
    const price = Number(dbItem.price);
    subtotal += price * i.quantity;
    return {
      menuItemId: i.menuItemId,
      quantity: i.quantity,
      priceAtOrder: dbItem.price
    };
  });
  let discountAmount = 0;
  let promoId = null;
  if (promoCode) {
    const promo = await prisma5.promoCode.findUnique({
      where: { code: promoCode.toUpperCase(), isActive: true }
    });
    if (promo && /* @__PURE__ */ new Date() <= promo.endDate && subtotal >= Number(promo.minOrderValue)) {
      promoId = promo.id;
      if (promo.discountType === "PERCENTAGE") {
        discountAmount = subtotal * Number(promo.discountValue) / 100;
      } else {
        discountAmount = Number(promo.discountValue);
      }
    }
  }
  const deliveryFee = 15e3;
  const totalAmount = subtotal - discountAmount + deliveryFee;
  const order = await prisma5.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        userId: user.id,
        status: "PENDING" /* PENDING */,
        deliveryStage: "IDLE" /* IDLE */,
        subtotal,
        discountAmount,
        deliveryFee,
        totalAmount,
        paymentMethod,
        paymentStatus: "PENDING" /* PENDING */,
        deliveryAddressId,
        promoCodeId: promoId,
        items: { create: orderItemsData }
      }
    });
    await tx.cartItem.deleteMany({
      where: { cart: { userId: user.id } }
    });
    return newOrder;
  });
  await AuditService.record({
    userId: user.id,
    action: "CREATE_ORDER",
    entity: "Order",
    entityId: order.id,
    newValue: order
  });
  return reply.status(201).send(order);
}
async function getMyOrders(request, reply) {
  const user = request.user;
  const orders = await prisma5.order.findMany({
    where: { userId: user.id },
    include: { items: { include: { menuItem: true } } },
    orderBy: { createdAt: "desc" }
  });
  return reply.send(orders);
}
async function getOrderDetail(request, reply) {
  const order = await prisma5.order.findUnique({
    where: { id: request.params.id },
    include: {
      user: true,
      items: { include: { menuItem: true } },
      deliveryAddress: true,
      courierAssignments: { include: { courier: true } }
    }
  });
  if (!order) return reply.status(404).send({ error: "Buyurtma topilmadi" });
  return reply.send(order);
}
async function handleUpdateStatus(request, reply) {
  const admin = request.user;
  const { status } = request.body;
  const order = await prisma5.order.findUnique({ where: { id: request.params.id } });
  if (!order) return reply.status(404).send({ error: "Buyurtma topilmadi" });
  if (!StatusService.validateOrderStatusTransition(order.status, status)) {
    return reply.status(400).send({
      error: `Statusni ozgartirib bolmaydi: ${order.status} -> ${status}`
    });
  }
  const updatedOrder = await prisma5.order.update({
    where: { id: order.id },
    data: { status }
  });
  await AuditService.recordStatusChange({
    userId: admin.id,
    entity: "Order",
    entityId: order.id,
    from: order.status,
    to: status
  });
  return reply.send(updatedOrder);
}
async function handleAssignCourier(request, reply) {
  const admin = request.user;
  const { courierId } = request.body;
  const assignment = await prisma5.courierAssignment.create({
    data: {
      orderId: request.params.id,
      courierId,
      status: "ASSIGNED" /* ASSIGNED */
    }
  });
  await AuditService.record({
    userId: admin.id,
    action: "ASSIGN_COURIER",
    entity: "CourierAssignment",
    entityId: assignment.id,
    newValue: assignment
  });
  return reply.send(assignment);
}

// src/api/modules/orders/orders.routes.ts
async function orderRoutes(fastify2) {
  fastify2.get("/my", getMyOrders);
  fastify2.get("/:id", {
    schema: { params: IdParamSchema }
  }, getOrderDetail);
  fastify2.post("/", {
    schema: { body: CreateOrderSchema }
  }, handleCreateOrder);
  fastify2.register(async (admin) => {
    admin.addHook("preHandler", admin.authorize(["ADMIN" /* ADMIN */]));
    admin.patch("/:id/status", {
      schema: { params: IdParamSchema, body: UpdateOrderStatusSchema }
    }, handleUpdateStatus);
    admin.patch("/:id/assign-courier", {
      schema: {
        params: IdParamSchema,
        body: { type: "object", required: ["courierId"], properties: { courierId: { type: "string" } } }
      }
    }, handleAssignCourier);
  });
}

// src/api/modules/addresses/addresses.controller.ts
import { PrismaClient as PrismaClient6 } from "@prisma/client";
var prisma6 = new PrismaClient6();
async function getAddresses(request, reply) {
  const user = request.user;
  const addresses = await prisma6.deliveryAddress.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" }
  });
  return reply.send(addresses);
}
async function handleCreateAddress(request, reply) {
  const user = request.user;
  const data = request.body;
  const address = await prisma6.deliveryAddress.create({
    data: {
      userId: user.id,
      title: data.title || "Manzil",
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude
    }
  });
  await AuditService.record({
    userId: user.id,
    action: "CREATE_ADDRESS",
    entity: "DeliveryAddress",
    entityId: address.id,
    newValue: address
  });
  return reply.status(201).send(address);
}
async function handleDeleteAddress(request, reply) {
  const user = request.user;
  const { id } = request.params;
  const address = await prisma6.deliveryAddress.findUnique({
    where: { id }
  });
  if (!address || address.userId !== user.id) {
    return reply.status(403).send({ error: "Ruxsat etilmadi" });
  }
  await prisma6.deliveryAddress.delete({ where: { id } });
  await AuditService.record({
    userId: user.id,
    action: "DELETE_ADDRESS",
    entity: "DeliveryAddress",
    entityId: id,
    oldValue: address
  });
  return reply.status(204).send();
}

// src/api/modules/addresses/addresses.routes.ts
async function addressRoutes(fastify2) {
  fastify2.get("/", getAddresses);
  fastify2.post("/", {
    schema: { body: AddressSchema }
  }, handleCreateAddress);
  fastify2.delete("/:id", {
    schema: { params: IdParamSchema }
  }, handleDeleteAddress);
}

// src/api/modules/promos/promos.controller.ts
import { PrismaClient as PrismaClient7 } from "@prisma/client";
var prisma7 = new PrismaClient7();
async function validatePromoCode(request, reply) {
  const { code } = request.body;
  const promo = await prisma7.promoCode.findUnique({
    where: { code: code.toUpperCase(), isActive: true }
  });
  if (!promo) {
    return reply.status(404).send({ isValid: false, message: "Promokod topilmadi" });
  }
  const now = /* @__PURE__ */ new Date();
  if (now > promo.endDate) {
    return reply.status(400).send({ isValid: false, message: "Promokod muddati tugagan" });
  }
  if (promo.usageLimit && promo.timesUsed >= promo.usageLimit) {
    return reply.status(400).send({ isValid: false, message: "Promokod limiti tugagan" });
  }
  return reply.send({
    isValid: true,
    promo: {
      id: promo.id,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: Number(promo.discountValue),
      minOrderValue: Number(promo.minOrderValue)
    }
  });
}
async function getAllPromos(request, reply) {
  const promos = await prisma7.promoCode.findMany({
    orderBy: { createdAt: "desc" }
  });
  return reply.send(promos);
}
async function handleCreatePromo(request, reply) {
  const admin = request.user;
  const data = request.body;
  const promo = await prisma7.promoCode.create({
    data: {
      code: data.code,
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrderValue: data.minOrderValue,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      usageLimit: data.usageLimit
    }
  });
  await AuditService.record({
    userId: admin.id,
    action: "CREATE_PROMO",
    entity: "PromoCode",
    entityId: promo.id,
    newValue: promo
  });
  return reply.status(201).send(promo);
}

// src/api/modules/promos/promos.routes.ts
async function promoRoutes(fastify2) {
  fastify2.post("/validate", {
    schema: { body: ValidatePromoSchema }
  }, validatePromoCode);
  fastify2.register(async (admin) => {
    admin.addHook("preHandler", admin.authorize(["ADMIN" /* ADMIN */]));
    admin.get("/", getAllPromos);
    admin.post("/", {
      schema: { body: PromoCodeSchema }
    }, handleCreatePromo);
  });
}

// src/api/app.ts
var app_default = fp4(async function(fastify2, opts) {
  fastify2.register(cors);
  fastify2.register(security_default);
  fastify2.register(validation_default);
  fastify2.register(auth_default);
  const api = fastify2.withTypeProvider();
  api.register(authRoutes, { prefix: "/auth" });
  api.register(menuRoutes, { prefix: "/menu" });
  api.register(promoRoutes, { prefix: "/promos" });
  api.register(async (authenticated) => {
    authenticated.addHook("preHandler", authenticated.authenticate);
    authenticated.register(courierRoutes, { prefix: "/courier" });
    authenticated.register(orderRoutes, { prefix: "/orders" });
    authenticated.register(addressRoutes, { prefix: "/addresses" });
  });
  fastify2.get("/health", async () => {
    return { status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() };
  });
});

// src/api/index.ts
var server = fastify({
  logger: true
});
async function main() {
  try {
    await server.register(app_default);
    const port = Number(process.env.PORT) || 3e3;
    const host = process.env.API_HOST || "0.0.0.0";
    await server.listen({ port, host });
    console.log(`\u{1F680} Turon API is running at http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}
main();
