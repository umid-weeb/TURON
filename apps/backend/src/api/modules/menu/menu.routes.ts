import { FastifyInstance } from 'fastify';
import { 
  getCategories, 
  getProducts, 
  getProductById, 
  handleCreateCategory, 
  handleCreateProduct 
} from './menu.controller.js';
import { 
  IdParamSchema, 
  CategorySchema, 
  MenuItemSchema 
} from '../../utils/schemas.js';
import { UserRoleEnum } from '@turon/shared';

export default async function menuRoutes(fastify: FastifyInstance) {
  // Public routes
  fastify.get('/categories', getCategories);
  fastify.get('/products', getProducts);
  fastify.get('/products/:id', {
    schema: { params: IdParamSchema }
  }, getProductById);

  // Admin and store management routes
  fastify.register(async (admin) => {
    admin.addHook('preHandler', admin.authorize([UserRoleEnum.ADMIN]));

    admin.post('/categories', {
      schema: { body: CategorySchema }
    }, handleCreateCategory);

    admin.post('/products', {
      schema: { body: MenuItemSchema }
    }, handleCreateProduct);
  });
}
