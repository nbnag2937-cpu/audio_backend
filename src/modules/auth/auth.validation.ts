import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email khong hop le"),
  password: z.string().min(1, "Password khong duoc de trong"),
});

export type LoginInput = z.infer<typeof loginSchema>;
