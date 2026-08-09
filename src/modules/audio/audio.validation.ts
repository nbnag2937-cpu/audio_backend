import { z } from "zod";

export const createAudioSchema = z.object({
  title: z.string().min(1, "title khong duoc de trong").max(255),
  description: z.string().max(2000).optional(),
});

export const updateAudioSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
});

export type CreateAudioInput = z.infer<typeof createAudioSchema>;
export type UpdateAudioInput = z.infer<typeof updateAudioSchema>;
