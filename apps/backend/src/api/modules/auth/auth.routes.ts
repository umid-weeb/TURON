import { FastifyInstance } from 'fastify';
import { telegramAuthHandler } from './auth.controller.js';
import { TelegramAuthSchema } from '../../utils/schemas.js';

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/telegram', {
    schema: {
      body: TelegramAuthSchema
    }
  }, telegramAuthHandler);
}
