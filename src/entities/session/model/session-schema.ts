import { z } from "zod";

export const sessionSchema = z.object({
  id: z.string().min(1),
  yandex_id: z.string().min(1),
  display_name: z.string(),
  role: z.enum(["user", "admin"]),
});

export type Session = z.infer<typeof sessionSchema>;
