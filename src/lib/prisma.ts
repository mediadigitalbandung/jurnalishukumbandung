import { PrismaClient } from "@prisma/client";

// BigInt serialization fix — Prisma returns BigInt for some fields (e.g.
// LiveSession.recordingSize) yang tidak bisa di-JSON.stringify default.
// Polyfill toJSON supaya NextResponse.json() auto-convert ke string.
if (typeof (BigInt.prototype as unknown as { toJSON?: () => string }).toJSON === "undefined") {
  (BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
    return this.toString();
  };
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
