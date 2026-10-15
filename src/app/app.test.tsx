import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { App } from "./app";
import { store } from "./store";
import { baseApi } from "../shared/api";

const profile = {
  id: "test-user",
  yandex_id: "test-yandex",
  display_name: "Тестовый пользователь",
  role: "user",
};
let sessionStatus: number;
let logoutStatus: number;
let malformedProfile: boolean;
let offline: boolean;
const requests: Request[] = [];
let usersStatus: number;
let malformedUsers: boolean;
let nextCursor: string | null;
let listedUsers: { id: string; display_name: string; role: string }[];

beforeEach(() => {
  store.dispatch(baseApi.util.resetApiState());
  sessionStatus = 200;
  logoutStatus = 200;
  malformedProfile = false;
  offline = false;
  profile.role = "user";
  usersStatus = 200;
  malformedUsers = false;
  nextCursor = null;
  listedUsers = [
    { id: "listed-user-001", display_name: "Иван", role: "user" },
    { id: "listed-admin-002", display_name: "Администратор", role: "admin" },
  ];
  requests.length = 0;
  window.history.replaceState(null, "", "/");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      requests.push(request);
      if (offline) throw new TypeError("Network unavailable");
      const url = new URL(request.url);
      if (url.pathname === "/me/configs")
        return new Response("[]", {
          headers: { "Content-Type": "application/json" },
        });
      if (url.pathname === "/admin/vpn-servers")
        return new Response("[]", { headers: { "Content-Type": "application/json" } });
      if (url.pathname === "/admin/users") {
        if (usersStatus === 401) sessionStatus = 401;
        return new Response(
          JSON.stringify(
            usersStatus === 200
              ? malformedUsers
                ? {}
                : url.searchParams.has("after")
                  ? []
                  : listedUsers
              : {
                  error:
                    usersStatus === 403
                      ? "admin_required"
                      : "authentication_required",
                },
          ),
          {
            status: usersStatus,
            headers: {
              "Content-Type": "application/json",
              ...(nextCursor && !url.searchParams.has("after")
                ? { "X-Next-Cursor": nextCursor }
                : {}),
            },
          },
        );
      }
      if (request.url.endsWith("/auth/logout")) {
        if (logoutStatus === 200) sessionStatus = 401;
        return new Response(
          logoutStatus === 200
            ? "<html></html>"
            : '{"error":"auth_storage_unavailable"}',
          { status: logoutStatus },
        );
      }
      return new Response(
        JSON.stringify(
          sessionStatus === 200
            ? malformedProfile
              ? {}
              : profile
            : { error: "authentication_required" },
        ),
        {
          status: sessionStatus,
          headers: { "Content-Type": "application/json" },
        },
      );
    }),
  );
});

afterEach(() => {
  store.dispatch(baseApi.util.resetApiState());
  vi.unstubAllGlobals();
});

it("показывает кабинет и имя после серверной проверки сессии", async () => {
  render(<App />);
  expect(
    await screen.findByRole("heading", { level: 1, name: "Личный кабинет." }),
  ).toBeInTheDocument();
  expect(screen.getByRole("banner")).toHaveTextContent(profile.display_name);
  expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  expect(requests[0].credentials).toBe("include");
});

it("направляет гостя на вход и предоставляет OAuth-ссылку", async () => {
  sessionStatus = 401;
  render(<App />);
  expect(
    await screen.findByRole("link", { name: "Войти через Яндекс" }),
  ).toHaveAttribute("href", "/auth/yandex/login");
  expect(window.location.pathname).toBe("/login");
  expect(
    screen.queryByRole("region", { name: "Конфигурации" }),
  ).not.toBeInTheDocument();
});

it("при 503 скрывает кабинет и позволяет повторить проверку", async () => {
  sessionStatus = 503;
  const user = userEvent.setup();
  render(<App />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Не удалось проверить сессию",
  );
  expect(
    screen.queryByRole("heading", { name: "Конфигурации" }),
  ).not.toBeInTheDocument();
  sessionStatus = 200;
  await user.click(screen.getByRole("button", { name: "Повторить проверку" }));
  expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
    "Личный кабинет",
  );
});

it("показывает ошибку сети без ложного выхода", async () => {
  offline = true;
  render(<App />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Не удалось проверить сессию",
  );
  expect(window.location.pathname).toBe("/");
});

it("при истечении сессии скрывает уже открытый кабинет", async () => {
  render(<App />);
  await screen.findByRole("heading", { name: "Личный кабинет." });
  sessionStatus = 401;
  window.dispatchEvent(new Event("focus"));
  expect(
    await screen.findByRole("link", { name: "Войти через Яндекс" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Конфигурации" }),
  ).not.toBeInTheDocument();
});

it("отклоняет некорректный профиль через Zod", async () => {
  malformedProfile = true;
  render(<App />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Не удалось проверить сессию",
  );
});

it("объясняет отказ или прерывание OAuth и разрешает повторный вход", async () => {
  sessionStatus = 401;
  window.history.replaceState(null, "", "/login?auth_error=1");
  render(<App />);
  expect(
    await screen.findByRole("link", { name: "Войти через Яндекс" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "отказаться или прервать процесс",
  );
});

it("открывает и закрывает мобильное меню администратора", async () => {
  profile.role = 'admin';
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole("heading", { level: 1 });
  await user.click(screen.getByRole("button", { name: "Открыть меню" }));
  expect(
    screen.getByRole("navigation", { name: "Мобильная навигация" }),
  ).toHaveTextContent(profile.display_name);
  await user.click(screen.getByRole("button", { name: "Закрыть меню" }));
  expect(
    await screen.findByRole("button", { name: "Открыть меню" }),
  ).toHaveAttribute("aria-expanded", "false");
});

it('обычному пользователю оставляет выход без навигации и бургера', async () => {
  render(<App />);
  await screen.findByRole('heading', { level: 1 });
  expect(screen.queryByRole('button', { name: 'Открыть меню' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Серверы' })).not.toBeInTheDocument();
  expect(requests.some((request) => request.url.includes('/admin/vpn-servers'))).toBe(false);
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Выйти' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Конфигурации' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Подключение' })).not.toBeInTheDocument();
});

it("администратор открывает управление серверами из шапки без предварительного запроса", async () => {
  profile.role = "admin";
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole("heading", { level: 1 });
  expect(requests.some((request) => request.url.includes('/admin/vpn-servers'))).toBe(false);
  await user.click(screen.getByRole("button", { name: "Серверы" }));
  expect(await screen.findByRole("dialog", { name: "Серверы VPN" })).toBeInTheDocument();
  expect(await screen.findByText("Серверы ещё не добавлены.")).toBeInTheDocument();
});

it("выходит через RTK mutation и очищает приватный кеш", async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole("heading", { level: 1 });
  await user.click(screen.getByRole("button", { name: "Выйти" }));
  expect(
    await screen.findByRole("link", { name: "Войти через Яндекс" }),
  ).toBeInTheDocument();
  expect(
    requests.some(
      (request) =>
        request.url.endsWith("/auth/logout") && request.method === "POST",
    ),
  ).toBe(true);
  expect(JSON.stringify(store.getState())).not.toContain(profile.display_name);
});

it("при ошибке выхода сохраняет сессию и даёт повторить", async () => {
  logoutStatus = 503;
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole("heading", { level: 1 });
  await user.click(screen.getByRole("button", { name: "Выйти" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Не удалось выйти",
  );
  expect(window.location.pathname).toBe("/");
  logoutStatus = 200;
  await user.click(screen.getByRole("button", { name: "Выйти" }));
  expect(
    await screen.findByRole("link", { name: "Войти через Яндекс" }),
  ).toBeInTheDocument();
});

it("не показывает admin-пункт обычному пользователю и закрывает прямой переход", async () => {
  window.history.replaceState(null, "", "/admin/users-list");
  render(<App />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "только администратору",
  );
  expect(
    screen.queryByRole("link", { name: "Пользователи" }),
  ).not.toBeInTheDocument();
  expect(
    requests.some(
      (request) => new URL(request.url).pathname === "/admin/users",
    ),
  ).toBe(false);
});

it("показывает администратору каталог из endpoint и пункт в мобильном меню", async () => {
  profile.role = "admin";
  window.history.replaceState(null, "", "/admin/users-list");
  const user = userEvent.setup();
  render(<App />);
  expect(await screen.findByText("listed-user-001")).toBeInTheDocument();
  expect(screen.getByRole("rowheader", { name: /Иван/ })).toBeInTheDocument();
  expect(
    screen.getByRole("table", { name: "Пользователи" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Пользователи" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await user.click(screen.getByRole("button", { name: "Открыть меню" }));
  expect(
    screen.getByRole("navigation", { name: "Мобильная навигация" }),
  ).toHaveTextContent("Пользователи");
});

it("показывает пустой каталог без фиктивных строк", async () => {
  profile.role = "admin";
  listedUsers = [];
  window.history.replaceState(null, "", "/admin/users-list");
  render(<App />);
  expect(
    await screen.findByText("На этой странице пока нет пользователей."),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Далее" })).toBeDisabled();
});

it("использует X-Next-Cursor нового API вместо последнего ID", async () => {
  profile.role = "admin";
  nextCursor = "next-server-cursor";
  window.history.replaceState(null, "", "/admin/users-list");
  const events = userEvent.setup();
  render(<App />);
  await screen.findByText("listed-user-001");
  await events.click(screen.getByRole("button", { name: "Далее" }));
  await screen.findByText("На этой странице пока нет пользователей.");
  expect(
    requests.some(
      (request) =>
        new URL(request.url).searchParams.get("after") === "next-server-cursor",
    ),
  ).toBe(true);
  expect(screen.getByRole("button", { name: "Далее" })).toBeDisabled();
});

it("передаёт cursor последней записи и возвращается на предыдущую страницу", async () => {
  profile.role = "admin";
  listedUsers = Array.from({ length: 50 }, (_, i) => ({
    id: `id-${i}`,
    display_name: `Пользователь ${i}`,
    role: "user",
  }));
  window.history.replaceState(null, "", "/admin/users-list");
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText("id-49");
  await user.click(screen.getByRole("button", { name: "Далее" }));
  await screen.findByText("На этой странице пока нет пользователей.");
  expect(
    requests.some(
      (request) => new URL(request.url).searchParams.get("after") === "id-49",
    ),
  ).toBe(true);
  await user.click(screen.getByRole("button", { name: "Назад" }));
  expect(await screen.findByText("id-49")).toBeInTheDocument();
});

it.each([503, 403])(
  "обрабатывает ошибку каталога %s без отображения строк",
  async (status) => {
    profile.role = "admin";
    usersStatus = status;
    window.history.replaceState(null, "", "/admin/users-list");
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      status === 403 ? "Нет доступа" : "Не удалось загрузить пользователей",
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  },
);

it("отклоняет некорректный DTO каталога", async () => {
  profile.role = "admin";
  malformedUsers = true;
  window.history.replaceState(null, "", "/admin/users-list");
  render(<App />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Не удалось загрузить пользователей",
  );
});

it("при истечении сессии во время запроса каталога возвращает на вход", async () => {
  profile.role = "admin";
  usersStatus = 401;
  window.history.replaceState(null, "", "/admin/users-list");
  render(<App />);
  expect(
    await screen.findByRole("link", { name: "Войти через Яндекс" }),
  ).toBeInTheDocument();
  expect(window.location.pathname).toBe("/login");
});
