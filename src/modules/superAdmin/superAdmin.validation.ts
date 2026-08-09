import { z } from "zod";

export const createAdminSchema = z.object({
  email: z.string().email("Email khong hop le"),
  password: z.string().min(6, "Password toi thieu 6 ky tu"),
  name: z.string().min(1, "name khong duoc de trong"),
});

export type CreateAdminInput = z.infer<typeof createAdminSchema>;
