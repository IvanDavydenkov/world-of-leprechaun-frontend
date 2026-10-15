import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Provider } from "react-redux";
import { createAppStore } from "../../../app/store";
import { baseApi } from "../../../shared/api";
import type { UserOverview } from "../../../entities/user";
import { ManageUserConfigs } from "./manage-user-configs";

const profile: UserOverview = {
  id: "test-owner",
  display_name: "Иван",
  role: "user",
  vpn: {
    availability: "available",
    counts: { total: 2, active: 2, disabled: 0, pending: 0 },
    traffic: null,
    configs: [
      { id: "phone", name: "Телефон", status: "active", version: 1 },
      { id: "laptop", name: "Ноутбук", status: "active", version: 1 },
    ],
  },
};
let appStore: ReturnType<typeof createAppStore>;
let failFirst: boolean;
let partial: boolean;
const writes: {
  url: string;
  method: string;
  body: unknown;
  key: string | null;
}[] = [];

beforeEach(() => {
  appStore = createAppStore();
  failFirst = false;
  partial = false;
  writes.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      const result = {
        operation_id: "operation-1",
        kind: "create",
        status: partial ? "partial" : "succeeded",
        requested_count: 2,
        succeeded_count: partial ? 1 : 2,
        pending_count: 0,
        failed_count: partial ? 1 : 0,
        items: [
          { config_id: "config-1", status: "succeeded", error_code: null },
          ...(partial
            ? [
                {
                  config_id: "config-2",
                  status: "failed",
                  error_code: "host_operation_unconfirmed",
                },
              ]
            : []),
        ],
      };
      if (request.method !== "GET") {
        const body = await request.text();
        writes.push({
          url: new URL(request.url).pathname,
          method: request.method,
          body: body ? JSON.parse(body) : null,
          key: request.headers.get("Idempotency-Key"),
        });
        if (failFirst && writes.length === 1)
          throw new TypeError("Network failure");
        return new Response(JSON.stringify({ ...result, status: "pending" }), {
          status: 202,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
});

afterEach(() => {
  appStore.dispatch(baseApi.util.resetApiState());
  vi.unstubAllGlobals();
});

async function open() {
  const user = userEvent.setup();
  render(
    <Provider store={appStore}>
      <ManageUserConfigs user={profile} />
    </Provider>,
  );
  await user.click(screen.getByRole("button", { name: "Управлять" }));
  return user;
}

it("открывает окно выбранного пользователя и валидирует count через Zod", async () => {
  const user = await open();
  expect(screen.getByRole("dialog")).toHaveTextContent("Иван");
  const input = screen.getByRole("spinbutton", { name: "Добавить конфигов" });
  await user.clear(input);
  await user.type(input, "21");
  await user.click(screen.getByRole("button", { name: "Выписать конфиги" }));
  expect(screen.getByText("Максимум 20 конфигов за раз")).toBeInTheDocument();
  expect(writes).toHaveLength(0);
});

it("передаёт count и Idempotency-Key, затем проверяет статус операции", async () => {
  const user = await open();
  const input = screen.getByRole("spinbutton");
  await user.clear(input);
  await user.type(input, "2");
  await user.click(screen.getByRole("button", { name: "Выписать конфиги" }));
  expect(await screen.findByText("Выполнено")).toBeInTheDocument();
  expect(writes[0]).toMatchObject({
    method: "POST",
    url: "/admin/users/test-owner/configs",
    body: { count: 2 },
  });
  expect(writes[0].key).toBeTruthy();
  expect(
    vi
      .mocked(fetch)
      .mock.calls.some(([request]) =>
        (request as Request).url.endsWith("/config-operations/operation-1"),
      ),
  ).toBe(true);
});

it("при потере ответа повторяет тот же payload с прежним ключом", async () => {
  failFirst = true;
  const user = await open();
  await user.click(screen.getByRole("button", { name: "Выписать конфиги" }));
  await user.click(
    await screen.findByRole("button", { name: "Повторить тот же запрос" }),
  );
  await screen.findByText("Выполнено");
  expect(writes).toHaveLength(2);
  expect(writes[1]).toEqual(writes[0]);
});

it("частичный результат не считает полным успехом и повторяет исходную операцию", async () => {
  partial = true;
  const user = await open();
  await user.click(screen.getByRole("button", { name: "Выписать конфиги" }));
  expect(await screen.findByText("Выполнено частично")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Выписать конфиги" }),
  ).toBeDisabled();
  partial = false;
  await user.click(
    screen.getByRole("button", { name: "Повторить тот же запрос" }),
  );
  expect(await screen.findByText("Выполнено")).toBeInTheDocument();
  expect(writes[1].key).toBe(writes[0].key);
});

it("отключает все только после подтверждения и без тела DELETE", async () => {
  const user = await open();
  await user.click(screen.getByRole("button", { name: "Отключить все" }));
  expect(writes).toHaveLength(0);
  await user.click(
    screen.getByRole("button", { name: "Подтвердить отключение" }),
  );
  await waitFor(() => expect(writes).toHaveLength(1));
  expect(writes[0]).toMatchObject({
    method: "DELETE",
    url: "/admin/users/test-owner/configs",
    body: null,
  });
});

it("отключает выбранные через bulk-delete", async () => {
  const user = await open();
  await user.click(screen.getByRole("checkbox", { name: /Телефон/ }));
  await user.click(
    screen.getByRole("button", { name: "Отключить выбранные (1)" }),
  );
  await user.click(
    screen.getByRole("button", { name: "Подтвердить отключение" }),
  );
  await waitFor(() => expect(writes).toHaveLength(1));
  expect(writes[0]).toMatchObject({
    method: "POST",
    url: "/admin/users/test-owner/configs/bulk-delete",
    body: { config_ids: ["phone"] },
  });
});

it("отключает один конфиг отдельным DELETE", async () => {
  const user = await open();
  await user.click(
    screen.getAllByRole("button", { name: "Отключить конфиг" })[0],
  );
  await user.click(
    screen.getByRole("button", { name: "Подтвердить отключение" }),
  );
  await waitFor(() => expect(writes).toHaveLength(1));
  expect(writes[0]).toMatchObject({
    method: "DELETE",
    url: "/admin/users/test-owner/configs/phone",
    body: null,
  });
});
