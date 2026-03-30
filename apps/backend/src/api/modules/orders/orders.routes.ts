import { FastifyInstance } from 'fastify';
import { 
  handleCreateOrder, 
  getMyOrders, 
  getOrderDetail, 
  handleUpdateStatus, 
  handleAssignCourier 
} from './orders.controller.js';
import { 
  CreateOrderSchema, 
  IdParamSchema, 
  UpdateOrderStatusSchema 
} from '../../utils/schemas.js';
import { UserRoleEnum } from '@turon/shared';

export default async function orderRoutes(fastify: FastifyInstance) {
  // Routes for all roles (Authenticated)
  fastify.get('/my', getMyOrders);
  fastify.get('/:id', {
    schema: { params: IdParamSchema }
  }, getOrderDetail);
  fastify.post('/', {
    schema: { body: CreateOrderSchema }
  }, handleCreateOrder);

  // Admin operational routes
  fastify.register(async (admin) => {
    admin.addHook('preHandler', admin.authorize([UserRoleEnum.ADMIN]));

    admin.patch('/:id/status', {
      schema: { params: IdParamSchema, body: UpdateOrderStatusSchema }
    }, handleUpdateStatus);

    admin.patch('/:id/assign-courier', {
      schema: { 
        params: IdParamSchema, 
        body: { type: 'object', required: ['courierId'], properties: { courierId: { type: 'string' } } } 
      }
    }, handleAssignCourier);
  });
}
