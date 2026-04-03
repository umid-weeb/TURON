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
} from './orders.controller.js';
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
