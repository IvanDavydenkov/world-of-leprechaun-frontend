import { expect, it } from "vitest";
import { commandSchema, intentSchema, isPollingOperation, isTerminalOperation, itemPageSchema, operationSchema, routingSchema } from "./migration-schema";

const operation = {
  operation_id: "op-1", kind: "switch", status: "running", phase: "processing", target_server_id: "srv-b", server_id: null, routing_revision: 2,
  counts: { requested_count: 3, succeeded_count: 1, failed_count: 0, pending_count: 2, skipped_count: 0 }, steps: [], details: null,
  error_code: null, retryable: false, created_at: "2026-11-02T10:00:00Z", updated_at: "2026-11-02T10:00:01Z",
};

it("проверяет инвариант счётчиков и не превращает план null в нули", () => {
  expect(operationSchema.parse(operation).counts?.requested_count).toBe(3);
  expect(operationSchema.parse({ ...operation, counts: null, phase: "planning" }).counts).toBeNull();
  expect(operationSchema.safeParse({ ...operation, counts: { ...operation.counts, pending_count: 1 } }).success).toBe(false);
  expect(operationSchema.safeParse({ ...operation, counts: { ...operation.counts, requested_count: -1 } }).success).toBe(false);
  expect(operationSchema.safeParse({ ...operation, status: "unknown" }).success).toBe(false);
});

it("202/running не успех, needs_input не polling и не terminal", () => {
  const parsed = operationSchema.parse(operation);
  expect(isPollingOperation(parsed)).toBe(true);
  expect(isTerminalOperation(parsed)).toBe(false);
  expect(isPollingOperation({ ...parsed, status: "needs_input" })).toBe(false);
  expect(isTerminalOperation({ ...parsed, status: "needs_input" })).toBe(false);
  for (const status of ["partial", "failed", "succeeded"] as const) expect(isTerminalOperation({ ...parsed, status })).toBe(true);
});

it("удаляет секреты и сырые SSH-логи из DTO операции и её шагов", () => {
  const parsed = operationSchema.parse({ ...operation, password: "synthetic-password", stderr: "raw-ssh-stderr", steps: [{ name: "verify_host_key", status: "succeeded", password: "synthetic-password", stdout: "raw-stdout" }], details: { candidates: [{ candidate_id: "candidate-1", container: "awg", interface: "awg0", published_udp_ports: [39977], private_key: "synthetic-private" }], required_fields: ["candidate_id"], stderr: "raw-ssh-stderr" } });
  const serialized = JSON.stringify(parsed);
  for (const secret of ["synthetic-password", "raw-ssh-stderr", "raw-stdout", "synthetic-private"]) expect(serialized).not.toContain(secret);
  expect(parsed.details?.candidates?.[0].published_udp_ports).toEqual([39977]);
});

it("проверяет страничные items и удаляет приватные данные", () => {
  const item = { item_id: "item-1", config_id: "cfg-1", user_id: "user-1", source_server_id: null, target_server_id: "srv-b", status: "succeeded", action: "reused", error_code: null, attempts: 1, file: "synthetic-private-file" };
  const parsed = itemPageSchema.parse({ items: [item], next_cursor: "opaque-next" });
  expect(parsed.items[0].action).toBe("reused");
  expect(JSON.stringify(parsed)).not.toContain("synthetic-private-file");
  expect(itemPageSchema.safeParse({ items: [{ ...item, attempts: -1 }], next_cursor: null }).success).toBe(false);
});

it("строгий intent запрещает секреты, source и неявный отзыв в switch", () => {
  const key = "640ae54c-dee2-4bee-9f2b-7f7ec932549d";
  const command = { kind: "switch", body: { target_server_id: "srv-b", expected_routing_revision: 3 } };
  expect(intentSchema.safeParse({ key, command }).success).toBe(true);
  expect(intentSchema.safeParse({ key, command, password: "synthetic-password" }).success).toBe(false);
  for (const extra of [{ password: "synthetic-password" }, { source_server_id: "srv-a" }, { cleanup: true }, { revoke_old: true }]) {
    expect(commandSchema.safeParse({ ...command, body: { ...command.body, ...extra } }).success).toBe(false);
  }
  expect(intentSchema.safeParse({ key: "not-a-uuid", command }).success).toBe(false);
});

it("не придумывает routing capabilities при их отсутствии", () => {
  expect(routingSchema.safeParse({ default_server_id: "srv-a", revision: 3, active_switch_operation_id: null }).success).toBe(false);
  expect(routingSchema.parse({ default_server_id: null, revision: 0, active_switch_operation_id: null, features: { prepare: false, switch: false, revoke: false } }).features.switch).toBe(false);
});
