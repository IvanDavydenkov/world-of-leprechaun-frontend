import { expect, it } from "vitest";
import type { IncomingMessage } from "node:http";
import { adaptOAuthResponse } from "./oauth-proxy";

it("возвращает успешный callback в приложение вместо JSON /me", () => {
  const response = {
    statusCode: 303,
    headers: { location: "/me" },
  } as IncomingMessage;
  adaptOAuthResponse(response);
  expect(response.headers.location).toBe("/");
});

it.each([400, 403, 404, 429, 500, 502, 503, 504])(
  "возвращает ошибку %s на страницу повторного входа",
  (statusCode) => {
    const response = { statusCode, headers: {} } as IncomingMessage;
    adaptOAuthResponse(response);
    expect(response.statusCode).toBe(303);
    expect(response.headers.location).toBe("/login?auth_error=1");
    expect(response.headers["cache-control"]).toBe("no-store");
  },
);

it("сохраняет переход к провайдеру и cookies", () => {
  const response = {
    statusCode: 302,
    headers: {
      location: "https://oauth.yandex.ru/authorize",
      "set-cookie": ["state=example; HttpOnly"],
    },
  } as IncomingMessage;
  adaptOAuthResponse(response);
  expect(response.headers.location).toBe("https://oauth.yandex.ru/authorize");
  expect(response.headers["set-cookie"]).toHaveLength(1);
});
