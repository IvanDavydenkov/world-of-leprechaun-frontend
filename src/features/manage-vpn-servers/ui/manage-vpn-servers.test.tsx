import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
let listStatus: number;
let saveStatus: number;
let revision: number;
let empty: boolean;
const calls: { path: string; method: string; body?: Record<string, unknown> }[] = [];

beforeEach(() => {
  store = createAppStore();
  listStatus = saveStatus = 200;
  revision = 1;
  empty = false;
  calls.length = 0;
  vi.stubGlobal("fetch", vi.fn(async (request: Request) => {
    const path = new URL(request.url).pathname;
    const body = request.method === "GET" ? undefined : await request.json();
    calls.push({ path, method: request.method, body });
    const status = request.method === "GET" ? listStatus : saveStatus;
    const result = request.method === "GET" && path === "/admin/vpn-servers" ? empty ? [] : [{ ...testServer, revision }] : { ...testServer, revision };
    return new Response(JSON.stringify(status === 200 ? result : { error: "failure" }), { status, headers: { "Content-Type": "application/json" } });
  }));
});
afterEach(() => { store.dispatch(baseApi.util.resetApiState()); vi.unstubAllGlobals(); });
function show(onClose = vi.fn()) {
  return render(<Provider store={store}><ThemeProvider theme={theme}><ManageVpnServers onClose={onClose} /></ThemeProvider></Provider>);
}

it("читает актуальную запись перед редактированием и отправляет PATCH без пустого пароля", async () => {
  const user = userEvent.setup();
  show();
  await user.click(await screen.findByRole("button", { name: "Настроить Основной" }));
  expect(await screen.findByLabelText("Название сервера", { exact: false })).toHaveValue("Основной");
  expect(calls.some((call) => call.path === "/admin/vpn-servers/server-1")).toBe(true);
  fireEvent.change(screen.getByLabelText("Название сервера", { exact: false }), { target: { value: "Резервный" } });
  await user.click(screen.getByRole("button", { name: "Сохранить" }));
  expect(await screen.findByText("Настройки сохранены в реестре.")).toBeInTheDocument();
  expect(calls.find((call) => call.method === "PATCH")?.body).toEqual({ name: "Резервный", expected_revision: 1 });
});

it("409 блокирует повтор, явная загрузка обновляет revision и очищает пароль", async () => {
  const user = userEvent.setup();
  show();
  await user.click(await screen.findByRole("button", { name: "Настроить Основной" }));
  fireEvent.change(await screen.findByLabelText("Пароль SSH", { exact: false }), { target: { value: "synthetic-password" } });
  saveStatus = 409;
  await user.click(screen.getByRole("button", { name: "Сохранить" }));
  expect(await screen.findByText(/Сервер уже изменён/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
  expect(screen.getByLabelText("Пароль SSH", { exact: false })).toHaveValue("");
  revision = 2;
  await user.click(screen.getByRole("button", { name: "Загрузить актуальную запись" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Сохранить" })).toBeEnabled());
  fireEvent.change(screen.getByLabelText("Название сервера", { exact: false }), { target: { value: "Новое имя" } });
  saveStatus = 200;
  await user.click(screen.getByRole("button", { name: "Сохранить" }));
  await screen.findByText("Настройки сохранены в реестре.");
  expect(calls.filter((call) => call.method === "PATCH").at(-1)?.body).toEqual({ name: "Новое имя", expected_revision: 2 });
});

it("валидирует обязательные поля новой записи и создаёт через POST", async () => {
  const user = userEvent.setup();
  empty = true;
  show();
  await screen.findByText("Серверы ещё не добавлены.");
  await user.click(screen.getByRole("button", { name: "Добавить сервер" }));
  await user.click(screen.getByRole("button", { name: "Сохранить" }));
  expect(screen.getByText("Укажите пароль SSH")).toBeInTheDocument();
  expect(calls.filter((call) => call.method === "POST")).toHaveLength(0);
  for (const [label, value] of [
    ["Название сервера", testServer.name], ["Адрес SSH", testServer.ssh_address], ["Пользователь SSH", testServer.ssh_username],
    ["Пароль SSH", "synthetic-password"], ["Публичный VPN-адрес", testServer.public_endpoint], ["Публичный SSH-ключ сервера", testServer.ssh_host_key],
  ]) fireEvent.change(screen.getByLabelText(label, { exact: false }), { target: { value } });
  await user.click(screen.getByRole("button", { name: "Сохранить" }));
  await screen.findByText("Настройки сохранены в реестре.");
  expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
});

it.each([401, 403, 503])("ошибка списка %s не выглядит как пустой успешный список", async (status) => {
  listStatus = status;
  show();
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  expect(screen.queryByText("Серверы ещё не добавлены.")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Добавить сервер" })).toBeDisabled();
});

it("блокирует повтор и закрытие на время запроса, очищает пароль после ошибки", async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  show(onClose);
  await user.click(await screen.findByRole("button", { name: "Настроить Основной" }));
  fireEvent.change(await screen.findByLabelText("Пароль SSH", { exact: false }), { target: { value: "synthetic-password" } });
  const priorFetch = vi.mocked(fetch).getMockImplementation()!;
  let release: (response: Response) => void = () => {};
  vi.mocked(fetch).mockImplementation((input, init) => {
    if ((input as Request).method === "PATCH") return new Promise<Response>((resolve) => { release = resolve; });
    return priorFetch(input, init);
  });
  await user.click(screen.getByRole("button", { name: "Сохранить" }));
  expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Закрыть" })).toBeDisabled();
  await user.keyboard("{Escape}");
  expect(onClose).not.toHaveBeenCalled();
  await act(async () => release(new Response('{"error":"invalid_request"}', { status: 400, headers: { "Content-Type": "application/json" } })));
  expect(await screen.findByText(/Сервер отклонил данные/)).toBeInTheDocument();
  expect(screen.getByLabelText("Пароль SSH", { exact: false })).toHaveValue("");
  expect(screen.getByRole("button", { name: "Сохранить" })).toBeEnabled();
});
