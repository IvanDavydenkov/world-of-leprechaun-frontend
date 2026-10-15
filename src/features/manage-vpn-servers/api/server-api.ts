import { baseApi } from "../../../shared/api";
import { serverSchema } from "../model/server-schema";
import type { SaveServerRequest, VpnServer } from "../model/server-schema";

// Одноразовый мост: body с паролем не передаётся в Redux originalArgs/actions.
// Запись удаляется синхронно при старте queryFn и повторно в finally hook.
const pendingRequests = new Map<string, SaveServerRequest>();
const invalidResponse = { status: "CUSTOM_ERROR" as const, error: "Некорректный ответ реестра серверов" };

const serverApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getVpnServers: builder.query<VpnServer[], void>({
      async queryFn(_arg, _api, _extra, request) {
        const response = await request({ url: "admin/vpn-servers", cache: "no-store" });
        if (response.error) {
          if (response.error.status === 401) _api.dispatch(baseApi.util.invalidateTags(["Session"]));
          return { error: response.error };
        }
        const parsed = serverSchema.array().safeParse(response.data);
        return parsed.success ? { data: parsed.data } : { error: invalidResponse };
      },
      providesTags: ["VpnServers"],
      keepUnusedDataFor: 0,
    }),
    getVpnServer: builder.query<VpnServer, string>({
      async queryFn(id, _api, _extra, request) {
        const response = await request({ url: `admin/vpn-servers/${encodeURIComponent(id)}`, cache: "no-store" });
        if (response.error) {
          if (response.error.status === 401) _api.dispatch(baseApi.util.invalidateTags(["Session"]));
          return { error: response.error };
        }
        const parsed = serverSchema.safeParse(response.data);
        return parsed.success ? { data: parsed.data } : { error: invalidResponse };
      },
      keepUnusedDataFor: 0,
    }),
    saveVpnServerRequest: builder.mutation<VpnServer, string>({
      async queryFn(key, _api, _extra, request) {
        const input = pendingRequests.get(key);
        pendingRequests.delete(key);
        if (!input) return { error: invalidResponse };
        const response = await request({
          url: input.id ? `admin/vpn-servers/${encodeURIComponent(input.id)}` : "admin/vpn-servers",
          method: input.id ? "PATCH" : "POST",
          body: input.body,
          cache: "no-store",
        });
        // Не возвращаем meta/произвольное тело ошибки: оно может содержать ввод.
        if (response.error) {
          const status = response.error.status;
          return typeof status === "number"
            ? { error: { status, data: null } }
            : { error: { status: "CUSTOM_ERROR", error: "Не удалось подтвердить сохранение" } };
        }
        const parsed = serverSchema.safeParse(response.data);
        return parsed.success ? { data: parsed.data } : { error: invalidResponse };
      },
      invalidatesTags: (result, error) => result ? ["VpnServers"] : error?.status === 401 ? ["Session"] : [],
    }),
  }),
});

export const { useGetVpnServersQuery, useGetVpnServerQuery, useLazyGetVpnServerQuery } = serverApi;
export function useSaveVpnServerMutation() {
  const [trigger, state] = serverApi.useSaveVpnServerRequestMutation();
  const save = async (input: SaveServerRequest) => {
    const key = crypto.randomUUID();
    pendingRequests.set(key, input);
    try { return await trigger(key).unwrap(); }
    finally { pendingRequests.delete(key); }
  };
  return [save, state] as const;
}
