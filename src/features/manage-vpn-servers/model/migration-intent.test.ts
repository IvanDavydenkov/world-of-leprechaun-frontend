import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { bindPrivateSessionState, clearPrivateSessionState } from "../../../shared/api";
import { readMigrationIntent, storeMigrationIntent } from "./migration-intent";
import type { MigrationIntent } from "./migration-schema";

const intent: MigrationIntent = { key: "640ae54c-dee2-4bee-9f2b-7f7ec932549d", command: { kind: "switch", body: { target_server_id: "srv-b", expected_routing_revision: 3 } } };
beforeEach(() => sessionStorage.clear());
afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear(); });

it("восстанавливает неизвестный запрос с прежними payload/key без запуска операции", () => {
  expect(storeMigrationIntent("admin-1", intent)).toBe(true);
  expect(readMigrationIntent("admin-1")).toEqual(intent);
  expect(readMigrationIntent("admin-2")).toBeNull();
  expect(storeMigrationIntent("admin-1", { ...intent, operationId: "op-1" })).toBe(true);
  expect(readMigrationIntent("admin-1")?.key).toBe(intent.key);
  expect(readMigrationIntent("admin-1")?.operationId).toBe("op-1");
});

it("logout очищает только приватное состояние, а смена actor не отдаёт чужой intent", () => {
  bindPrivateSessionState("admin-1");
  storeMigrationIntent("admin-1", intent);
  sessionStorage.setItem("public-preference", "keep");
  bindPrivateSessionState("admin-2");
  expect(readMigrationIntent("admin-1")).toBeNull();
  expect(sessionStorage.getItem("public-preference")).toBe("keep");
  storeMigrationIntent("admin-2", intent);
  clearPrivateSessionState();
  expect(readMigrationIntent("admin-2")).toBeNull();
  expect(sessionStorage.getItem("public-preference")).toBe("keep");
});

it("отклоняет повреждённое сохранение и intent с паролем", () => {
  sessionStorage.setItem("private:vpn-server-intent:admin-1", "{broken-json");
  expect(readMigrationIntent("admin-1")).toBeNull();
  expect(storeMigrationIntent("admin-1", { ...intent, password: "synthetic-password" } as MigrationIntent)).toBe(false);
  expect(sessionStorage.getItem("private:vpn-server-intent:admin-1")).not.toContain("synthetic-password");
  sessionStorage.setItem("private:vpn-server-intent:admin-1", JSON.stringify({ ...intent, command: { kind: "switch", body: { ...intent.command.body, password: "synthetic-password" } } }));
  expect(readMigrationIntent("admin-1")).toBeNull();
});

it("при отказе storage возвращает ошибку вместо ложного сохранения", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Denied"); });
  expect(storeMigrationIntent("admin-1", intent)).toBe(false);
  expect(readMigrationIntent("admin-1")).toBeNull();
});
