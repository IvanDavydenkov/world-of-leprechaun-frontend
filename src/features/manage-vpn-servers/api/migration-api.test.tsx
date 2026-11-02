import { act, renderHook, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createAppStore } from "../../../app/store";
import { baseApi } from "../../../shared/api";
import { safeMigrationError, useGetServerOperationItemsQuery, useGetVpnRoutingQuery, useRunServerCommandMutation } from "./migration-api";
import type { MigrationIntent } from "../model/migration-schema";

const operation = { operation_id: "op-1", kind: "switch", status: "running", phase: "processing", target_server_id: "srv-b", server_id: null, routing_revision: 4, counts: { requested_count: 1, succeeded_count: 0, failed_count: 0, pending_count: 1, skipped_count: 0 }, steps: [], details: null, error_code: null, retryable: false, created_at: "2026-11-02T10:00:00Z", updated_at: "2026-11-02T10:00:01Z" };
const intent: MigrationIntent = { key: "640ae54c-dee2-4bee-9f2b-7f7ec932549d", command: { kind: "switch", body: { target_server_id: "srv-b", expected_routing_revision: 3 } } };
let store: ReturnType<typeof createAppStore>;
beforeEach(() => { store = createAppStore(); });
afterEach(() => { store.dispatch(baseApi.util.resetApiState()); vi.unstubAllGlobals(); });
const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;

it("POST switch использует один key и payload без source/revoke; 202 running не завершение", async () => {
  const requests: { path: string; key: string | null; body: unknown; method: string }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (request: Request) => {
    requests.push({ path: new URL(request.url).pathname, method: request.method, key: request.headers.get("Idempotency-Key"), body: await request.json() });
    return new Response(JSON.stringify({ ...operation, password: "synthetic-password", stderr: "raw-stderr" }), { status: 202, headers: { "Content-Type": "application/json" } });
  }));
  const { result, unmount } = renderHook(() => useRunServerCommandMutation(), { wrapper });
  await act(async () => { await result.current[0](intent).unwrap(); });
  expect(requests[0]).toEqual({ path: "/admin/vpn-switches", method: "POST", key: intent.key, body: { target_server_id: "srv-b", expected_routing_revision: 3 } });
  expect(result.current[1].data?.status).toBe("running");
  expect(JSON.stringify(store.getState())).not.toContain("synthetic-password");
  expect(JSON.stringify(store.getState())).not.toContain("raw-stderr");
  await act(async () => { await result.current[0](intent).unwrap(); });
  expect(requests[1]).toEqual(requests[0]);
  unmount();
});

it("404 routing остаётся ошибкой старого backend без вымышленного default", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response('{"error":"not_found"}', { status: 404, headers: { "Content-Type": "application/json" } })));
  const { result, unmount } = renderHook(() => useGetVpnRoutingQuery(), { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.data).toBeUndefined();
  expect(result.current.error).toMatchObject({ status: 404, data: { error: "not_found" } });
  unmount();
});

it("items запрашиваются страницей с непрозрачным cursor и лимитом 50", async () => {
  const requests: URL[] = [];
  vi.stubGlobal("fetch", vi.fn(async (request: Request) => {
    requests.push(new URL(request.url));
    return new Response('{"items":[],"next_cursor":"next-page"}', { headers: { "Content-Type": "application/json" } });
  }));
  const { result, unmount } = renderHook(() => useGetServerOperationItemsQuery({ id: "op-1", after: "opaque /?cursor" }), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(requests[0].pathname).toBe("/admin/vpn-server-operations/op-1/items");
  expect(requests[0].searchParams.get("after")).toBe("opaque /?cursor");
  expect(requests[0].searchParams.get("limit")).toBe("50");
  expect(result.current.data?.next_cursor).toBe("next-page");
  unmount();
});

it("сохраняет безопасные коды конфликтов и убирает raw SSH error", () => {
  expect(safeMigrationError({ status: 409, data: { error: "switch_superseded", stderr: "secret" } })).toEqual({ status: 409, data: { error: "switch_superseded" } });
  expect(safeMigrationError({ status: 503, data: { error: "SSH stderr: secret" } })).toEqual({ status: 503, data: { error: "request_failed" } });
  expect(safeMigrationError({ status: "FETCH_ERROR", error: "secret network detail" })).toEqual({ status: "CUSTOM_ERROR", error: "Не удалось получить подтверждение сервера" });
});
