import { PrismaClient } from '@prisma/client';

// Singleton pattern — reuse the same PrismaClient across hot-reloads (dev)
// and across module imports (prod). Prevents connection pool exhaustion.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Always store on globalThis — works in both dev and production
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
