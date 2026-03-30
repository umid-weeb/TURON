import { FastifyInstance } from 'fastify';
import { 
  validatePromoCode, 
  handleCreatePromo, 
  getAllPromos 
} from './promos.controller.js';
import { 
  PromoCodeSchema, 
  ValidatePromoSchema 
} from '../../utils/schemas.js';
import { UserRoleEnum } from '@turon/shared';

export default async function promoRoutes(fastify: FastifyInstance) {
  // Public validation
  fastify.post('/validate', {
    schema: { body: ValidatePromoSchema }
  }, validatePromoCode);

  // Admin management
  fastify.register(async (admin) => {
    admin.addHook('preHandler', admin.authorize([UserRoleEnum.ADMIN]));

    admin.get('/', getAllPromos);
    
    admin.post('/', {
      schema: { body: PromoCodeSchema }
    }, handleCreatePromo);
  });
}
