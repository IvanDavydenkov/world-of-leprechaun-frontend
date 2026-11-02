import { z } from "zod";

const id = z.string().min(1).max(256);
const count = z.number().int().nonnegative();
export const routingSchema = z.object({
  default_server_id: id.nullable(), revision: z.number().int().nonnegative(), active_switch_operation_id: id.nullable(),
  features: z.object({ prepare: z.boolean(), switch: z.boolean(), revoke: z.boolean() }),
});
const candidateSchema = z.object({ candidate_id: id, container: z.string(), interface: z.string(), published_udp_ports: z.array(z.number().int().min(1).max(65535)) });
export const operationSchema = z.object({
  operation_id: id, kind: z.enum(["prepare", "switch", "revoke"]),
  status: z.enum(["queued", "running", "needs_input", "succeeded", "partial", "failed"]),
  phase: z.enum(["planning", "processing", "waiting_input", "finished"]),
  target_server_id: id.nullable(), server_id: id.nullable(), routing_revision: count.nullable(),
  counts: z.object({ requested_count: count, succeeded_count: count, failed_count: count, pending_count: count, skipped_count: count }).refine((c) => c.requested_count === c.succeeded_count + c.failed_count + c.pending_count + c.skipped_count).nullable(),
  steps: z.array(z.object({ name: z.string().optional(), step: z.string().optional(), status: z.enum(["pending", "running", "succeeded", "failed", "skipped"]), error_code: z.string().nullable().optional() })),
  details: z.object({ candidates: z.array(candidateSchema).optional(), required_fields: z.array(z.string()).optional() }).nullable(),
  error_code: z.string().nullable(), retryable: z.boolean(), created_at: z.iso.datetime(), updated_at: z.iso.datetime(),
});
export const operationPageSchema = z.object({ items: z.array(operationSchema), next_cursor: z.string().nullable() });
export const itemPageSchema = z.object({ items: z.array(z.object({
  item_id: id, config_id: id, user_id: id, source_server_id: id.nullable(), target_server_id: id.nullable(),
  status: z.enum(["pending", "running", "succeeded", "failed", "skipped"]), action: z.enum(["created", "reused", "already_selected"]).nullable(), error_code: z.string().nullable(), attempts: count,
})), next_cursor: z.string().nullable() });
export const commandSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("prepare"), serverId: id, body: z.object({ expected_revision: z.number().int().positive() }).strict() }).strict(),
  z.object({ kind: z.literal("switch"), body: z.object({ target_server_id: id, expected_routing_revision: count }).strict() }).strict(),
  z.object({ kind: z.literal("revoke"), body: z.object({ scope: z.literal("server"), server_id: id, all_configs: z.literal(true) }).strict() }).strict(),
  z.object({ kind: z.literal("retry"), operationId: id, body: z.object({}).strict() }).strict(),
  z.object({ kind: z.literal("resume"), operationId: id, body: z.object({ expected_revision: z.number().int().positive(), selection: z.object({ candidate_id: id.optional(), udp_port: z.number().int().min(1).max(65535).optional(), public_host: z.string().min(1).optional() }).strict() }).strict() }).strict(),
]);
export const intentSchema = z.object({ key: z.string().uuid(), command: commandSchema, operationId: id.optional() }).strict();
export type Routing = z.infer<typeof routingSchema>;
export type ServerOperation = z.infer<typeof operationSchema>;
export type OperationItem = z.infer<typeof itemPageSchema>["items"][number];
export type MigrationCommand = z.infer<typeof commandSchema>;
export type MigrationIntent = z.infer<typeof intentSchema>;
export const isPollingOperation = (operation?: ServerOperation) => operation?.status === "queued" || operation?.status === "running";
export const isTerminalOperation = (operation?: ServerOperation) => !!operation && ["succeeded", "partial", "failed"].includes(operation.status);
