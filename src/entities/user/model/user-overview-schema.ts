import { z } from "zod";

const bytesSchema = z.number().int().nonnegative().nullable();
const timestampSchema = z.iso.datetime({ offset: true }).nullable();

export const userOverviewSchema = z.object({
  id: z.string().min(1),
  display_name: z.string(),
  role: z.enum(["user", "admin"]),
  yandex_id: z.string().optional(),
  created_at: z.iso.datetime({ offset: true }).optional(),
  // Расширение backend admin-user-overview. Отсутствие поля поддерживает старый API.
  vpn: z
    .object({
      availability: z.enum(["available", "unavailable"]),
      counts: z
        .object({
          total: z.number().int().nonnegative(),
          active: z.number().int().nonnegative(),
          disabled: z.number().int().nonnegative(),
          pending: z.number().int().nonnegative(),
        })
        .nullable(),
      configs: z
        .array(
          z.object({
            id: z.string().min(1),
            name: z.string(),
            status: z.enum([
              "active",
              "deleted",
              "creating",
              "deleting",
              "reactivating",
            ]),
            version: z.number().int().positive(),
            source: z.enum(["managed", "discovered"]).optional(),
            file_available: z.boolean().optional(),
          }),
        )
        .nullable(),
      traffic: z
        .object({
          upload_bytes: bytesSchema,
          download_bytes: bytesSchema,
          total_bytes: bytesSchema,
          freshness: z.enum(["fresh", "stale", "unavailable"]),
          coverage: z.enum(["complete", "partial", "unknown"]),
          observed_since: timestampSchema,
          updated_at: timestampSchema,
        })
        .nullable(),
    })
    .optional(),
});

export type UserOverview = z.infer<typeof userOverviewSchema>;
