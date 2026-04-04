import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import authPlugin from './plugins/auth.js';
import securityPlugin from './plugins/security.js';
import validationPlugin from './plugins/validation.js';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

import authRoutes from './modules/auth/auth.routes.js';
import courierRoutes from './modules/courier/courier.routes.js';
import couriersRoutes from './modules/couriers/couriers.routes.js';
import menuRoutes from './modules/menu/menu.routes.js';
import orderRoutes from './modules/orders/orders.routes.js';
import addressRoutes from './modules/addresses/addresses.routes.js';
import promoRoutes from './modules/promos/promos.routes.js';
import mapRoutes from './modules/maps/maps.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import supportRoutes from './modules/support/support.routes.js';

export default fp(async function (fastify: FastifyInstance, opts: FastifyPluginOptions) {
  // 1. Core Plugins
  fastify.register(cors);
  fastify.register(securityPlugin);
  fastify.register(validationPlugin);
  
  // 2. Auth Plugin (JWT + Guards)
  fastify.register(authPlugin);

  const api = fastify.withTypeProvider<ZodTypeProvider>();

  // 3. Register Modules
  api.register(authRoutes, { prefix: '/auth' });
  api.register(menuRoutes, { prefix: '/menu' });
  api.register(promoRoutes, { prefix: '/promos' });
  
  // Authenticated Protected Modules
  api.register(async (authenticated) => {
    authenticated.addHook('preHandler', authenticated.authenticate);
    
    authenticated.register(courierRoutes, { prefix: '/courier' });
    authenticated.register(couriersRoutes, { prefix: '/couriers' });
    authenticated.register(orderRoutes, { prefix: '/orders' });
    authenticated.register(addressRoutes, { prefix: '/addresses' });
    authenticated.register(mapRoutes, { prefix: '/maps' });
    authenticated.register(notificationsRoutes, { prefix: '/notifications' });
    authenticated.register(supportRoutes, { prefix: '/support' });
  });

  // 4. Health Check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
});
