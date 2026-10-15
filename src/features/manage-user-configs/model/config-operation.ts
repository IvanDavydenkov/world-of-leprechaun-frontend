import { z } from "zod";

export const countSchema = z.coerce
  .number()
  .int("Введите целое число")
  .min(1, "Минимум 1 конфиг")
  .max(20, "Максимум 20 конфигов за раз");
export const operationSchema = z.object({
  operation_id: z.string().min(1),
  kind: z.enum(["create", "revoke", "revoke_all"]),
  status: z.enum(["pending", "running", "succeeded", "partial", "failed"]),
  requested_count: z.number().int().nonnegative(),
  succeeded_count: z.number().int().nonnegative().optional(),
  pending_count: z.number().int().nonnegative().optional(),
  failed_count: z.number().int().nonnegative().optional(),
  items: z
    .array(
      z.object({
        config_id: z.string(),
        status: z.enum(["pending", "running", "succeeded", "failed"]),
        error_code: z.string().nullable(),
      }),
    )
    .nullable()
    .optional(),
});
export type ConfigOperation = z.infer<typeof operationSchema>;
export type ConfigAction =
  | { kind: "create"; count: number }
  | { kind: "single"; configId: string }
  | { kind: "selected"; configIds: string[] }
  | { kind: "all" };
export type ConfigRequest = {
  userId: string;
  key: string;
  action: ConfigAction;
};
export const isTerminal = (status: ConfigOperation["status"]) =>
  ["succeeded", "partial", "failed"].includes(status);
