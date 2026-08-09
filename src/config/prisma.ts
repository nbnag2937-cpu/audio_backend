import { PrismaClient } from "@prisma/client";

// Dung 1 instance PrismaClient duy nhat cho toan bo app (tranh mo qua nhieu connection)
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
