import { FastifyInstance } from 'fastify';
import {
  acceptCourierOrder,
  arriveAtRestaurant,
  deliverCourierOrder,
  getCourierOrders,
  getCourierOrderDetail,
  getCourierStatus,
  getCourierTodayStats,
  pickupCourierOrder,
  reportCourierProblem,
  startCourierDelivery,
  updateCourierLocation,
  updateCourierStatus,
  updateOrderStage,
} from './courier.controller.js';
import {
  CourierProblemSchema,
  IdParamSchema,
  TrackingLocationSchema,
  UpdateCourierOperationalStatusSchema,
  UpdateDeliveryStageSchema,
} from '../../utils/schemas.js';
import { UserRoleEnum } from '@turon/shared';

export default async function courierRoutes(fastify: FastifyInstance) {
  // All routes in this module require COURIER role
  fastify.addHook('preHandler', fastify.authorize([UserRoleEnum.COURIER]));

  fastify.get('/me/status', getCourierStatus);
  fastify.get('/stats/today', getCourierTodayStats);

  fastify.patch('/me/status', {
    schema: {
      body: UpdateCourierOperationalStatusSchema,
    },
  }, updateCourierStatus);

  fastify.get('/orders', getCourierOrders);
  
  fastify.get('/order/:id', {
    schema: {
      params: IdParamSchema
    }
  }, getCourierOrderDetail);

  fastify.post('/order/:id/accept', {
    schema: {
      params: IdParamSchema,
    }
  }, acceptCourierOrder);

  fastify.post('/order/:id/arrived-restaurant', {
    schema: {
      params: IdParamSchema,
    }
  }, arriveAtRestaurant);

  fastify.post('/order/:id/pickup', {
    schema: {
      params: IdParamSchema,
    }
  }, pickupCourierOrder);

  fastify.post('/order/:id/start-delivery', {
    schema: {
      params: IdParamSchema,
    }
  }, startCourierDelivery);

  fastify.post('/order/:id/deliver', {
    schema: {
      params: IdParamSchema,
    }
  }, deliverCourierOrder);

  fastify.post('/order/:id/problem', {
    schema: {
      params: IdParamSchema,
      body: CourierProblemSchema,
    }
  }, reportCourierProblem);
  
  fastify.patch('/order/:id/stage', {
    schema: {
      params: IdParamSchema,
      body: UpdateDeliveryStageSchema
    }
  }, updateOrderStage);

  fastify.patch('/order/:id/location', {
    schema: {
      params: IdParamSchema,
      body: TrackingLocationSchema,
    }
  }, updateCourierLocation);
}
