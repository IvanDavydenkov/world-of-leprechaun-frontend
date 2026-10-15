import { configureStore } from "@reduxjs/toolkit";
import type { Middleware } from "@reduxjs/toolkit";
import { act, renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, expect, it, vi } from "vitest";
import { baseApi } from "../../../shared/api";
import { useSaveVpnServerMutation } from "./server-api";
import { testServer } from "../testing/server-fixture";

afterEach(() => vi.unstubAllGlobals());

it("POST передаёт пароль backend без помещения в Redux actions/state; PATCH использует версию", async () => {
  const actions: unknown[] = [];
  const captureActions: Middleware = () => (next) => (action) => { actions.push(action); return next(action); };
  const store = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (defaults) => defaults().concat(baseApi.middleware, captureActions),
  });
  const requests: { method: string; body: unknown }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (request: Request) => {
    requests.push({ method: request.method, body: await request.json() });
    return new Response(JSON.stringify({ ...testServer, password: "synthetic-password" }), { headers: { "Content-Type": "application/json" } });
  }));
  const { result, unmount } = renderHook(() => useSaveVpnServerMutation(), { wrapper: ({ children }) => <Provider store={store}>{children}</Provider> });
  const { id: _id, revision: _revision, password_set: _set, created_at: _created, updated_at: _updated, ...fields } = testServer;
  await act(async () => { await result.current[0]({ body: { ...fields, password: "synthetic-password" } }); });
  expect(requests[0]).toEqual({ method: "POST", body: { ...fields, password: "synthetic-password" } });
  expect(JSON.stringify(actions)).not.toContain("synthetic-password");
  expect(JSON.stringify(store.getState())).not.toContain("synthetic-password");
  await act(async () => { await result.current[0]({ id: testServer.id, body: { expected_revision: 1, name: "Изменён" } }); });
  expect(requests[1]).toEqual({ method: "PATCH", body: { expected_revision: 1, name: "Изменён" } });
  unmount();
  store.dispatch(baseApi.util.resetApiState());
});

it("не сохраняет тело ошибки с секретами в Redux", async () => {
  const store = configureStore({ reducer: { [baseApi.reducerPath]: baseApi.reducer }, middleware: (defaults) => defaults().concat(baseApi.middleware) });
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "synthetic-password" }), { status: 400, headers: { "Content-Type": "application/json" } })));
  const { result, unmount } = renderHook(() => useSaveVpnServerMutation(), { wrapper: ({ children }) => <Provider store={store}>{children}</Provider> });
  await act(async () => { await expect(result.current[0]({ body: { password: "synthetic-password" } })).rejects.toMatchObject({ status: 400 }); });
  expect(JSON.stringify(store.getState())).not.toContain("synthetic-password");
  unmount();
  store.dispatch(baseApi.util.resetApiState());
});
