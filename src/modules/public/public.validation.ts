import { z } from "zod";

export const streamQuerySchema = z.object({
  deviceId: z.string().min(8, "deviceId khong hop le"),
});

export type StreamQueryInput = z.infer<typeof streamQuerySchema>;

export const listAudiosQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  // newest: audio moi dang gan day nhat (mac dinh) - updated: audio moi CHINH SUA gan day nhat
  sort: z.enum(["newest", "updated"]).default("newest"),
});

export const rankingQuerySchema = z.object({
  // listening: dang nghe nhieu (dua tren so lan bam phat) - listened: top luot nghe (dua tren so lan nghe het bai)
  metric: z.enum(["listening", "listened"]).default("listening"),
  period: z.enum(["today", "month", "year", "all"]).default("today"),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
