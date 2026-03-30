import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../../lib/prisma.js';
import { AuditService } from '../../../services/audit.service.js';

export async function getCategories(request: FastifyRequest, reply: FastifyReply) {
  const categories = await prisma.menuCategory.findMany({
    where: { isActive: true },
    include: { items: { include: { images: true } } },
    orderBy: { sortOrder: 'asc' }
  });
  return reply.send(categories);
}

export async function getProducts(request: FastifyRequest, reply: FastifyReply) {
  const products = await prisma.menuItem.findMany({
    where: { isActive: true },
    include: { images: true, category: true }
  });
  return reply.send(products);
}

export async function getProductById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const product = await prisma.menuItem.findUnique({
    where: { id: request.params.id },
    include: { images: true, category: true }
  });
  if (!product) return reply.status(404).send({ error: 'Maxsulot topilmadi' });
  return reply.send(product);
}

export async function handleCreateCategory(
  request: FastifyRequest<{ Body: any }>,
  reply: FastifyReply
) {
  const user = request.user as any;
  const data = request.body as any;
  const category = await prisma.menuCategory.create({
    data: {
      nameUz: data.nameUz,
      nameRu: data.nameRu,
      nameEn: data.nameEn,
      sortOrder: data.sortOrder || 0
    }
  });

  await AuditService.record({
    userId: user.id,
    action: 'CREATE_CATEGORY',
    entity: 'MenuCategory',
    entityId: category.id,
    newValue: category
  });

  return reply.status(201).send(category);
}

export async function handleCreateProduct(
  request: FastifyRequest<{ Body: any }>,
  reply: FastifyReply
) {
  const user = request.user as any;
  const data = request.body as any;
  const product = await prisma.menuItem.create({
    data: {
      categoryId: data.categoryId,
      nameUz: data.nameUz,
      nameRu: data.nameRu,
      nameEn: data.nameEn,
      price: data.price,
      stockQuantity: data.stockQuantity || 0
    }
  });

  await AuditService.record({
    userId: user.id,
    action: 'CREATE_PRODUCT',
    entity: 'MenuItem',
    entityId: product.id,
    newValue: product
  });

  return reply.status(201).send(product);
}
