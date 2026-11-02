import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { ThemeProvider } from "@mui/material";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createAppStore } from "../../../app/store";
import { theme } from "../../../app/theme";
import { baseApi } from "../../../shared/api";
import { testServer } from "../testing/server-fixture";
import { ManageVpnServers } from "./manage-vpn-servers";

let store: ReturnType<typeof createAppStore>;
let routingStatus: number;
let postFailure: boolean;
let operationStatus: "running" | "needs_input" | "partial" | "succeeded";
let operationKind: "switch" | "prepare" | "revoke";
let history: boolean;
const calls: { path: string; method: string; body?: Record<string, unknown>; key?: string | null }[] = [];
const servers = ["a", "b"].map((suffix) => ({ ...testServer, id: `srv-${suffix}`, name: `Сервер ${suffix.toUpperCase()}`, preparation_status: "ready", prepared_revision: 1, checked_at: "2026-11-02T10:00:00Z", helper: { version: "1.0", sha256: "digest" }, is_default: suffix === "a", bindings_counts: { active: 2, revoked: 0, pending: 0 } }));
function operation() {
  return {
    operation_id: "op-1", kind: operationKind, status: operationStatus,
    phase: operationStatus === "needs_input" ? "waiting_input" : operationStatus === "partial" || operationStatus === "succeeded" ? "finished" : "processing",
    target_server_id: operationKind === "switch" ? "srv-b" : null, server_id: operationKind === "prepare" || operationKind === "revoke" ? "srv-b" : null,
    routing_revision: operationKind === "switch" ? 4 : null,
    counts: operationKind === "prepare" ? null : { requested_count: 2, succeeded_count: operationStatus === "partial" ? 1 : 0, failed_count: operationStatus === "partial" ? 1 : 0, pending_count: operationStatus === "partial" ? 0 : 2, skipped_count: 0 },
    steps: operationKind === "prepare" ? [{ name: "discover_awg", status: operationStatus === "needs_input" ? "pending" : "running", error_code: null }] : [],
    details: operationStatus === "needs_input" ? { candidates: [{ candidate_id: "candidate-b", container: "amnezia-awg2", interface: "awg0", published_udp_ports: [48892] }], required_fields: ["candidate_id", "udp_port"] } : null,
    error_code: null, retryable: operationStatus === "partial", created_at: "2026-11-02T10:00:00Z", updated_at: `2026-11-02T10:00:${operationStatus === "partial" ? "20" : "10"}Z`,
  };
}
beforeEach(() => {
  sessionStorage.clear();
  store = createAppStore();
  routingStatus = 200;
  postFailure = history = false;
  operationStatus = "running";
  operationKind = "switch";
  calls.length = 0;
  vi.stubGlobal("fetch", vi.fn(async (request: Request) => {
    const path = new URL(request.url).pathname;
    const body = request.method === "POST" ? await request.json() : undefined;
    calls.push({ path, method: request.method, body, key: request.headers.get("Idempotency-Key") });
    const respond = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
    if (path === "/me") return respond({ id: "admin-migration", yandex_id: "admin-yandex", display_name: "Админ", role: "admin" });
    if (path === "/admin/vpn-servers") return respond(servers);
    if (path === "/admin/vpn-routing") return routingStatus === 200 ? respond({ default_server_id: "srv-a", revision: 3, active_switch_operation_id: null, features: { prepare: true, switch: true, revoke: true } }) : respond({ error: "not_found" }, routingStatus);
    if (request.method === "POST") {
      if (postFailure) throw new TypeError("Synthetic lost response");
      if (path.endsWith("/prepare")) operationKind = "prepare";
      if (path === "/admin/vpn-revocations") operationKind = "revoke";
      return respond(operation(), 202);
    }
    if (path === "/admin/vpn-server-operations") return respond({ items: history ? [operation()] : [], next_cursor: null });
    if (path.endsWith("/items")) return respond({ items: [{ item_id: "item-1", config_id: "cfg-1", user_id: "user-1", source_server_id: "srv-a", target_server_id: "srv-b", status: operationStatus === "partial" ? "succeeded" : "pending", action: operationStatus === "partial" ? "reused" : null, error_code: null, attempts: 1 }], next_cursor: null });
    if (path === "/admin/vpn-server-operations/op-1") return respond(operation());
    return respond({ error: "not_found" }, 404);
  }));
});
afterEach(() => { store.dispatch(baseApi.util.resetApiState()); vi.unstubAllGlobals(); sessionStorage.clear(); });
function show() {
  return render(<Provider store={store}><ThemeProvider theme={theme}><ManageVpnServers onClose={vi.fn()} /></ThemeProvider></Provider>);
}
const posts = () => calls.filter((call) => call.method === "POST");
async function targetSwitch() {
  const buttons = await screen.findAllByRole("button", { name: "Переключить пользователей сюда" });
  await waitFor(() => expect(buttons[1]).toBeEnabled());
  return buttons[1];
}

it("старый backend 404 сохраняет CRUD и не предлагает неработающие действия миграций", async () => {
  routingStatus = 404;
  const user = userEvent.setup();
  show();
  expect(await screen.findByText("Переключение серверов пока недоступно в этой версии backend")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Настроить Сервер A" })).toBeEnabled();
  expect(screen.queryByRole("button", { name: "Переключить пользователей сюда" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Проверить и подготовить" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Добавить сервер" }));
  expect(await screen.findByLabelText("Публичный SSH-ключ сервера", { exact: false })).toBeRequired();
  expect(screen.queryByLabelText("Доверенный ED25519 SHA256-отпечаток", { exact: false })).not.toBeInTheDocument();
  expect(posts()).toHaveLength(0);
});

it("switch отправляет один POST без source/revoke и не выдаёт 202 за успех", async () => {
  const user = userEvent.setup();
  show();
  await user.click(await targetSwitch());
  expect(await screen.findByText(/Выполняется · Обработка/)).toBeInTheDocument();
  expect(screen.queryByText(/Завершено ·/)).not.toBeInTheDocument();
  expect(posts()).toHaveLength(1);
  expect(posts()[0]).toMatchObject({ path: "/admin/vpn-switches", body: { target_server_id: "srv-b", expected_routing_revision: 3 } });
  expect(Object.keys(posts()[0].body || {}).sort()).toEqual(["expected_routing_revision", "target_server_id"]);
  expect(calls.some((call) => call.path.includes("revocations"))).toBe(false);
  expect(screen.getByText(/Старые конфиги останутся рабочими/)).toBeInTheDocument();
});

it("потерянный ответ восстанавливается после перезагрузки только явным повтором с прежним ключом", async () => {
  const user = userEvent.setup();
  postFailure = true;
  const view = show();
  await user.click(await targetSwitch());
  expect(await screen.findByText(/Результат запроса неизвестен/)).toBeInTheDocument();
  const first = posts()[0];
  expect(first.key).toBeTruthy();
  view.unmount();
  postFailure = false;
  show();
  await screen.findByRole("button", { name: "Повторить тот же запрос" });
  expect(posts()).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: "Повторить тот же запрос" }));
  await screen.findByText(/Выполняется · Обработка/);
  expect(posts()).toHaveLength(2);
  expect(posts()[1].key).toBe(first.key);
  expect(posts()[1].body).toEqual(first.body);
});

it("отзыв default запрещён, отзыв другого сервера требует отдельного подтверждения", async () => {
  const user = userEvent.setup();
  show();
  const buttons = await screen.findAllByRole("button", { name: "Отозвать выдачи этого сервера" });
  expect(buttons[0]).toBeDisabled();
  await user.click(buttons[1]);
  const dialog = await screen.findByRole("dialog", { name: "Отозвать выдачи сервера?" });
  expect(within(dialog).getByText(/Сервер: Сервер B/)).toBeInTheDocument();
  expect(posts()).toHaveLength(0);
  await user.click(within(dialog).getByRole("button", { name: "Подтвердить отзыв этого сервера" }));
  await waitFor(() => expect(posts()).toHaveLength(1));
  expect(posts()[0]).toMatchObject({ path: "/admin/vpn-revocations", body: { scope: "server", server_id: "srv-b", all_configs: true } });
  expect(posts().some((call) => call.path === "/admin/vpn-switches")).toBe(false);
});

it("needs_input не выбирает discovery автоматически; resume отправляет выбранные candidate/port", async () => {
  const user = userEvent.setup();
  operationKind = "prepare";
  operationStatus = "needs_input";
  show();
  const buttons = await screen.findAllByRole("button", { name: "Проверить и подготовить" });
  await user.click(buttons[1]);
  const resume = await screen.findByRole("button", { name: "Продолжить подготовку" });
  expect(resume).toBeDisabled();
  await user.click(screen.getByRole("combobox", { name: "Обнаруженная установка" }));
  await user.click(await screen.findByRole("option", { name: "amnezia-awg2 / awg0" }));
  expect(resume).toBeDisabled();
  await user.click(screen.getByRole("combobox", { name: "Опубликованный UDP-порт" }));
  await user.click(await screen.findByRole("option", { name: "48892" }));
  expect(resume).toBeEnabled();
  await user.click(resume);
  await waitFor(() => expect(posts()).toHaveLength(2));
  expect(posts()[1]).toMatchObject({ path: "/admin/vpn-server-operations/op-1/resume", body: { expected_revision: 1, selection: { candidate_id: "candidate-b", udp_port: 48892 } } });
  expect(posts()[1].key).not.toBe(posts()[0].key);
});

it("partial сохраняет успехи и предлагает retry с новым ключом вместо нового switch", async () => {
  const user = userEvent.setup();
  operationStatus = "partial";
  show();
  await user.click(await targetSwitch());
  expect(await screen.findByText(/Успешные элементы и выбранный сервер для новых выдач не откатились/)).toBeInTheDocument();
  expect(await screen.findByText(/Использована сохранённая выдача/)).toBeInTheDocument();
  const retry = screen.getByRole("button", { name: "Повторить неуспешные элементы" });
  await waitFor(() => expect(retry).toBeEnabled());
  await user.click(retry);
  await waitFor(() => expect(posts()).toHaveLength(2));
  expect(posts()[1]).toMatchObject({ path: "/admin/vpn-server-operations/op-1/retry", body: {} });
  expect(posts()[1].key).not.toBe(posts()[0].key);
});
