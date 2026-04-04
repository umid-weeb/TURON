import type { FastifyInstance } from 'fastify';
import { UserRoleEnum } from '@turon/shared';
import {
  AdminCreateCourierSchema,
  AdminUpdateCourierSchema,
  IdParamSchema,
  UpdateCourierProfileSchema,
} from '../../utils/schemas.js';
import {
  createCourierByAdmin,
  getAdminCourierDirectory,
  getMyCourierHistory,
  getMyCourierProfile,
  updateCourierByAdmin,
  updateMyCourierProfile,
} from './couriers.controller.js';

export default async function couriersRoutes(fastify: FastifyInstance) {
  fastify.register(async (courierSelf) => {
    courierSelf.addHook('preHandler', courierSelf.authorize([UserRoleEnum.COURIER]));

    courierSelf.get('/me/profile', getMyCourierProfile);
    courierSelf.get('/me/history', getMyCourierHistory);
    courierSelf.patch(
      '/me/profile',
      {
        schema: {
          body: UpdateCourierProfileSchema,
        },
      },
      updateMyCourierProfile,
    );
  });

  fastify.register(async (admin) => {
    admin.addHook('preHandler', admin.authorize([UserRoleEnum.ADMIN]));

    admin.get('/admin', getAdminCourierDirectory);
    admin.post(
      '/admin',
      {
        schema: {
          body: AdminCreateCourierSchema,
        },
      },
      createCourierByAdmin,
    );
    admin.patch(
      '/admin/:id',
      {
        schema: {
          params: IdParamSchema,
          body: AdminUpdateCourierSchema,
        },
      },
      updateCourierByAdmin,
    );
  });
}
