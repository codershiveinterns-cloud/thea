import { PrismaClient } from "@prisma/client";

// Singleton so `next dev` hot reloads don't open a new connection each time.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export type { PostStatus, GeneratedBy, KeywordSource, KeywordStatus } from "@prisma/client";
