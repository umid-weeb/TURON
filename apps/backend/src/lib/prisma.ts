import { PrismaClient } from '@prisma/client';
import { env } from '../config.js';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
  });

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
