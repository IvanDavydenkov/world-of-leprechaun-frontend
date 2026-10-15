import { z } from "zod";

export const personalConfigSchema = z
  .object({
    id: z.string().min(1).max(128),
    name: z.string(),
    status: z.literal("active"),
    version: z.number().int().positive(),
    created_at: z.iso.datetime({ offset: true }),
    download_available: z.boolean(),
    download_url: z.string().nullable(),
  })
  .refine(
    (config) =>
      !config.download_available ||
      config.download_url ===
        `/me/configs/${encodeURIComponent(config.id)}/download`,
    { message: "Некорректный адрес скачивания" },
  );

export const personalConfigsSchema = z.array(personalConfigSchema);
export type PersonalConfig = z.infer<typeof personalConfigSchema>;
