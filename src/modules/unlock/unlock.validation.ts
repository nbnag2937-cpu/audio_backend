import { z } from "zod";

export const unlockClickSchema = z.object({
  deviceId: z.string().min(8, "deviceId khong hop le"),
});

export type UnlockClickInput = z.infer<typeof unlockClickSchema>;
