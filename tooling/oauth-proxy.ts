import type { IncomingMessage } from "node:http";

// Callback backend возвращает /me (JSON); браузер должен попасть в React-приложение.
export function adaptOAuthResponse(response: IncomingMessage) {
  if ((response.statusCode ?? 500) >= 400) {
    response.statusCode = 303;
    response.headers.location = "/login?auth_error=1";
    response.headers["cache-control"] = "no-store";
  } else if (response.headers.location === "/me") {
    response.headers.location = "/";
  }
}
