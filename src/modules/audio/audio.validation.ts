import { z } from "zod";

const optionalAdLinkUrl = z
  .string()
  .trim()
  .url("adLinkUrl phai la URL hop le (vd: https://...)")
  .max(500)
  .optional()
  .or(z.literal("").transform(() => undefined));

export const createAudioSchema = z.object({
  title: z
    .string()
    .trim()
    .max(255)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  description: z.string().max(2000).optional(),
  adLinkUrl: optionalAdLinkUrl,
});

export const updateAudioSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  adLinkUrl: optionalAdLinkUrl,
});

export type CreateAudioInput = z.infer<typeof createAudioSchema>;
export type UpdateAudioInput = z.infer<typeof updateAudioSchema>;
