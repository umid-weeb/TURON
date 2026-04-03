import { FastifyInstance } from 'fastify';
import { 
  getCategories, 
  getAdminCategories,
  getProducts, 
  getAdminProducts,
  getProductById, 
  handleCreateCategory, 
  handleUpdateCategory,
  handleSetCategoryActive,
  handleDeleteCategory,
  handleCreateProduct,
  handleUpdateProduct,
  handleSetProductActive,
  handleDeleteProduct,
} from './menu.controller.js';
import { 
  IdParamSchema, 
  CategorySchema, 
  MenuItemSchema,
  ToggleActiveSchema,
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
    admin.addHook('preHandler', admin.authenticate);
    admin.addHook('preHandler', admin.authorize([UserRoleEnum.ADMIN]));

    admin.get('/admin/categories', getAdminCategories);
    admin.get('/admin/products', getAdminProducts);

    admin.post('/categories', {
      schema: { body: CategorySchema }
    }, handleCreateCategory);

    admin.put('/categories/:id', {
      schema: { params: IdParamSchema, body: CategorySchema }
    }, handleUpdateCategory);

    admin.patch('/categories/:id/active', {
      schema: { params: IdParamSchema, body: ToggleActiveSchema }
    }, handleSetCategoryActive);

    admin.delete('/categories/:id', {
      schema: { params: IdParamSchema }
    }, handleDeleteCategory);

    admin.post('/products', {
      schema: { body: MenuItemSchema }
    }, handleCreateProduct);

    admin.put('/products/:id', {
      schema: { params: IdParamSchema, body: MenuItemSchema }
    }, handleUpdateProduct);

    admin.patch('/products/:id/active', {
      schema: { params: IdParamSchema, body: ToggleActiveSchema }
    }, handleSetProductActive);

    admin.delete('/products/:id', {
      schema: { params: IdParamSchema }
    }, handleDeleteProduct);
  });
}
