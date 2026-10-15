import { baseApi } from "../../../shared/api";
import { operationSchema, isTerminal } from "../model/config-operation";
import type { ConfigRequest, ConfigOperation } from "../model/config-operation";

const configManagementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    changeConfigs: builder.mutation<ConfigOperation, ConfigRequest>({
      async queryFn({ userId, key, action }, _api, _extra, request) {
        const path = `admin/users/${encodeURIComponent(userId)}/configs`;
        const response = await request({
          url:
            action.kind === "single"
              ? `${path}/${encodeURIComponent(action.configId)}`
              : action.kind === "selected"
                ? `${path}/bulk-delete`
                : path,
          method:
            action.kind === "create" || action.kind === "selected"
              ? "POST"
              : "DELETE",
          headers: { "Idempotency-Key": key },
          ...(action.kind === "create"
            ? { body: { count: action.count } }
            : action.kind === "selected"
              ? { body: { config_ids: action.configIds } }
              : {}),
        });
        if (response.error) return { error: response.error };
        const result = operationSchema.safeParse(response.data);
        return result.success
          ? { data: result.data }
          : {
              error: {
                status: "CUSTOM_ERROR",
                error: "Некорректный ответ операции",
              },
            };
      },
      invalidatesTags: ["Users"],
    }),
    getConfigOperation: builder.query<
      ConfigOperation,
      { userId: string; operationId: string }
    >({
      async queryFn({ userId, operationId }, _api, _extra, request) {
        const response = await request(
          `admin/users/${encodeURIComponent(userId)}/config-operations/${encodeURIComponent(operationId)}`,
        );
        if (response.error) return { error: response.error };
        const result = operationSchema.safeParse(response.data);
        return result.success
          ? { data: result.data }
          : {
              error: {
                status: "CUSTOM_ERROR",
                error: "Некорректный статус операции",
              },
            };
      },
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (isTerminal(data.status))
            dispatch(baseApi.util.invalidateTags(["Users"]));
        } catch {
          /* Ошибка остаётся доступна через хук запроса. */
        }
      },
      keepUnusedDataFor: 0,
    }),
  }),
});

export const { useChangeConfigsMutation, useGetConfigOperationQuery } =
  configManagementApi;
