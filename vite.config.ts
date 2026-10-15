import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import type { ProxyOptions } from "vite";
import { adaptOAuthResponse } from "./tooling/oauth-proxy.ts";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.USERS_API_ORIGIN || "http://127.0.0.1:8080";
  const oauthProxy: ProxyOptions = {
    target,
    proxyTimeout: 30000,
    timeout: 35000,
    configure(proxy) {
      proxy.on("proxyRes", adaptOAuthResponse);
      proxy.on("error", (_error, _request, response) => {
        if ("writeHead" in response && !response.headersSent) {
          response.writeHead(303, {
            Location: "/login?auth_error=1",
            "Cache-Control": "no-store",
          });
          response.end();
        }
      });
    },
  };
  return {
    plugins: [react()],
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      proxy: {
        "^/me(?:/|\\?|$)": { target },
        "^/admin/users(?:/|\\?|$)": { target },
        "/auth/logout": { target },
        "/auth/yandex/": oauthProxy,
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/app/testing/setup.ts"],
      clearMocks: true,
      restoreMocks: true,
    },
  };
});
