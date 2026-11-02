import { z } from "zod";
import { baseApi } from "../../../shared/api";
import { intentSchema, itemPageSchema, operationPageSchema, operationSchema, routingSchema } from "../model/migration-schema";
import type { MigrationIntent, Routing, ServerOperation } from "../model/migration-schema";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

export function safeMigrationError(error: FetchBaseQueryError): FetchBaseQueryError {
  if (typeof error.status !== "number") return { status: "CUSTOM_ERROR", error: "Не удалось получить подтверждение сервера" };
  const body = z.object({ error: z.string().regex(/^[a-z_]{1,80}$/) }).safeParse(error.data);
  return { status: error.status, data: { error: body.success ? body.data.error : "request_failed" } };
}
export const migrationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getVpnRouting: builder.query<Routing, void>({
      async queryFn(_arg, api, _extra, request) {
        const response = await request({ url: "admin/vpn-routing", cache: "no-store" });
        if (response.error) {
          if (response.error.status === 401) api.dispatch(baseApi.util.invalidateTags(["Session"]));
          return { error: safeMigrationError(response.error) };
        }
        const parsed = routingSchema.safeParse(response.data);
        return parsed.success ? { data: parsed.data } : { error: { status: "CUSTOM_ERROR", error: "Некорректный routing" } };
      },
      providesTags: ["VpnRouting"], keepUnusedDataFor: 0,
    }),
    getServerOperations: builder.query<z.infer<typeof operationPageSchema>, string | null>({
      async queryFn(after, api, _extra, request) {
        const response = await request({ url: "admin/vpn-server-operations", params: { limit: 20, ...(after ? { after } : {}) }, cache: "no-store" });
        if (response.error) {
          if (response.error.status === 401) api.dispatch(baseApi.util.invalidateTags(["Session"]));
          return { error: safeMigrationError(response.error) };
        }
        const result = operationPageSchema.safeParse(response.data);
        return result.success ? { data: result.data } : { error: { status: "CUSTOM_ERROR", error: "Некорректный список операций" } };
      }, providesTags: ["ServerOperations"], keepUnusedDataFor: 0,
    }),
    getServerOperation: builder.query<ServerOperation, string>({
      async queryFn(id, api, _extra, request) {
        const response = await request({ url: `admin/vpn-server-operations/${encodeURIComponent(id)}`, cache: "no-store" });
        if (response.error) {
          if (response.error.status === 401) api.dispatch(baseApi.util.invalidateTags(["Session"]));
          return { error: safeMigrationError(response.error) };
        }
        const result = operationSchema.safeParse(response.data);
        return result.success ? { data: result.data } : { error: { status: "CUSTOM_ERROR", error: "Некорректная операция" } };
      }, keepUnusedDataFor: 0,
    }),
    getServerOperationItems: builder.query<z.infer<typeof itemPageSchema>, { id: string; after: string | null; version?: string }>({
      async queryFn({ id, after }, api, _extra, request) {
        const response = await request({ url: `admin/vpn-server-operations/${encodeURIComponent(id)}/items`, params: { limit: 50, ...(after ? { after } : {}) }, cache: "no-store" });
        if (response.error) {
          if (response.error.status === 401) api.dispatch(baseApi.util.invalidateTags(["Session"]));
          return { error: safeMigrationError(response.error) };
        }
        const result = itemPageSchema.safeParse(response.data);
        return result.success ? { data: result.data } : { error: { status: "CUSTOM_ERROR", error: "Некорректные элементы операции" } };
      }, keepUnusedDataFor: 0,
    }),
    runServerCommand: builder.mutation<ServerOperation, MigrationIntent>({
      async queryFn({ key, command }, api, _extra, request) {
        if (!intentSchema.safeParse({ key, command }).success) return { error: { status: "CUSTOM_ERROR", error: "Некорректное намерение операции" } };
        let url: string;
        switch (command.kind) {
          case "prepare": url = `admin/vpn-servers/${encodeURIComponent(command.serverId)}/prepare`; break;
          case "switch": url = "admin/vpn-switches"; break;
          case "revoke": url = "admin/vpn-revocations"; break;
          default: url = `admin/vpn-server-operations/${encodeURIComponent(command.operationId)}/${command.kind}`;
        }
        const response = await request({ url, method: "POST", body: command.body, headers: { "Idempotency-Key": key }, cache: "no-store" });
        if (response.error) {
          if (response.error.status === 401) api.dispatch(baseApi.util.invalidateTags(["Session"]));
          return { error: safeMigrationError(response.error) };
        }
        const parsed = operationSchema.safeParse(response.data);
        return parsed.success ? { data: parsed.data } : { error: { status: "CUSTOM_ERROR", error: "Ответ не подтверждает операцию" } };
      },
      invalidatesTags: ["VpnRouting", "VpnServers", "ServerOperations"],
    }),
  }),
});
export const { useGetVpnRoutingQuery, useGetServerOperationsQuery, useGetServerOperationQuery, useGetServerOperationItemsQuery, useRunServerCommandMutation } = migrationApi;
