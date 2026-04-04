import type { FastifyInstance } from 'fastify';
import { IdParamSchema } from '../../utils/schemas.js';
import {
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from './notifications.controller.js';

export default async function notificationsRoutes(fastify: FastifyInstance) {
  fastify.get('/my', getMyNotifications);
  fastify.patch(
    '/:id/read',
    {
      schema: {
        params: IdParamSchema,
      },
    },
    markNotificationAsRead,
  );
  fastify.post('/read-all', markAllNotificationsAsRead);
}
