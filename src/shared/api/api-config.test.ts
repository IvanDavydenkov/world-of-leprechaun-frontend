import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveApiOrigin } from "./api-config";
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
describe("API origin configuration", () => {
  it("keeps the development proxy when unset", () => { expect(resolveApiOrigin("")).toBe(""); });
  it("accepts production HTTPS and local HTTP", () => {
    expect(resolveApiOrigin("https://api.worldofleprechauns.ru/")).toBe("https://api.worldofleprechauns.ru");
    expect(resolveApiOrigin("http://localhost:8080")).toBe("http://localhost:8080");
  });
  it("rejects insecure or credential-bearing origins", () => {
    for (const value of ["http://api.worldofleprechauns.ru", "https://user:pass@api.example", "https://api.example/path", "https://api.example?token=x"]) {
      expect(() => resolveApiOrigin(value)).toThrow();
    }
  });
  it("uses the API origin for transport and OAuth in production", async () => {
    vi.stubEnv("VITE_API_ORIGIN", "https://api.worldofleprechauns.ru");
    vi.resetModules();
    const config = await import("./api-config");
    expect(config.apiBaseUrl).toBe("https://api.worldofleprechauns.ru/");
    expect(config.oauthLoginUrl).toBe("https://api.worldofleprechauns.ru/auth/yandex/login");
  });
});