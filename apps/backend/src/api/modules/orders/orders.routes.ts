import { FastifyInstance } from 'fastify';
import {
  handleQuoteOrder,
  handleCreateOrder,
  getAllOrders,
  getAvailableCouriers,
  getMyOrders,
  getOrderDetail,
  streamOrders,
  streamOrderTracking,
  handleUpdateStatus,
  handleAssignCourier,
  handleApprovePayment,
  handleRejectPayment,
  rateOrder,
} from './orders.controller.js';
import { getOrderChat, sendOrderChat, getUnreadCount } from '../chat/chat.controller.js';
import { 
  AssignCourierSchema,
  CreateOrderSchema, 
  IdParamSchema, 
  QuoteOrderSchema,
  RejectPaymentSchema,
  UpdateOrderStatusSchema 
} from '../../utils/schemas.js';
import { UserRoleEnum } from '@turon/shared';

export default async function orderRoutes(fastify: FastifyInstance) {
  // Routes for all roles (Authenticated)
  fastify.get('/my', getMyOrders);
  fastify.get('/stream', streamOrders);
  fastify.get('/:id/tracking/stream', {
    schema: { params: IdParamSchema }
  }, streamOrderTracking);
  fastify.get('/:id', {
    schema: { params: IdParamSchema }
  }, getOrderDetail);

  // ── Customer rating ───────────────────────────────────────────────────────
  fastify.patch('/:id/rating', { schema: { params: IdParamSchema } }, rateOrder);

  // ── In-app chat (customer side) ───────────────────────────────────────────
  fastify.get('/:id/chat', { schema: { params: IdParamSchema } }, getOrderChat);
  fastify.post('/:id/chat', { schema: { params: IdParamSchema } }, sendOrderChat);
  fastify.get('/:id/chat/unread', { schema: { params: IdParamSchema } }, getUnreadCount);
  fastify.post('/quote', {
    schema: { body: QuoteOrderSchema }
  }, handleQuoteOrder);
  fastify.post('/', {
    schema: { body: CreateOrderSchema }
  }, handleCreateOrder);

  // Admin operational routes
  fastify.register(async (admin) => {
    admin.addHook('preHandler', admin.authorize([UserRoleEnum.ADMIN]));

    admin.get('/', getAllOrders);

    admin.get('/courier-options', getAvailableCouriers);

    admin.patch('/:id/status', {
      schema: { params: IdParamSchema, body: UpdateOrderStatusSchema }
    }, handleUpdateStatus);

    admin.patch('/:id/assign-courier', {
      schema: {
        params: IdParamSchema,
        body: AssignCourierSchema,
      }
    }, handleAssignCourier);

    admin.patch('/:id/payment/approve', {
      schema: {
        params: IdParamSchema,
      }
    }, handleApprovePayment);

    admin.patch('/:id/payment/reject', {
      schema: {
        params: IdParamSchema,
        body: RejectPaymentSchema,
      }
    }, handleRejectPayment);
  });
}
