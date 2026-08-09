import { z } from "zod";

export const streamQuerySchema = z.object({
  deviceId: z.string().min(8, "deviceId khong hop le"),
});

export type StreamQueryInput = z.infer<typeof streamQuerySchema>;

export const listAudiosQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["newest", "updated"]).default("newest"),
});

export const rankingQuerySchema = z.object({
  metric: z.enum(["listening", "listened"]).default("listening"),
  period: z.enum(["today", "month", "year", "all"]).default("today"),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const listenSessionBodySchema = z.object({
  deviceId: z.string().min(8, "deviceId khong hop le"),
});

export type ListenSessionBodyInput = z.infer<typeof listenSessionBodySchema>;
