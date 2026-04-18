import { FastifyInstance } from 'fastify';
import { deleteUserPhone, saveUserPhone } from './users.controller.js';

export default async function usersRoutes(fastify: FastifyInstance) {
  // PATCH /users/me/phone — save / update caller's phone number
  fastify.patch('/me/phone', saveUserPhone);
  fastify.delete('/me/phone', deleteUserPhone);
}
