export function resolveApiOrigin(value: string | undefined): string {
  if (!value) return "";
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" || (url.protocol !== "https:" && !(url.protocol === "http:" && local))) {
    throw new Error("VITE_API_ORIGIN must be an HTTPS origin (HTTP allowed on localhost)");
  }
  return url.origin;
}
export const apiOrigin = resolveApiOrigin(import.meta.env.VITE_API_ORIGIN);
export const apiBaseUrl = `${apiOrigin || window.location.origin}/`;
export const oauthLoginUrl = `${apiOrigin}/auth/yandex/login`;