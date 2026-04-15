import { FastifyInstance } from 'fastify';
import {
  validatePromoCode,
  handleCreatePromo,
  getAllPromos,
  handleUpdatePromo,
  handleDeletePromo,
} from './promos.controller.js';
import { 
  IdParamSchema,
  PromoCodeSchema, 
  ValidatePromoSchema 
} from '../../utils/schemas.js';
import { UserRoleEnum } from '@turon/shared';

export default async function promoRoutes(fastify: FastifyInstance) {
  // Public validation
  fastify.post('/validate', {
    schema: { body: ValidatePromoSchema }
  }, validatePromoCode);

  // Admin management (JWT-verified + ADMIN role required)
  fastify.register(async (admin) => {
    admin.addHook('preHandler', admin.authenticate);
    admin.addHook('preHandler', admin.authorize([UserRoleEnum.ADMIN]));

    admin.get('/', getAllPromos);

    admin.post('/', {
      schema: { body: PromoCodeSchema }
    }, handleCreatePromo);

    admin.put('/:id', {
      schema: {
        params: IdParamSchema,
        body: PromoCodeSchema,
      }
    }, handleUpdatePromo);

    admin.delete('/:id', {
      schema: { params: IdParamSchema }
    }, handleDeletePromo);
  });
}
