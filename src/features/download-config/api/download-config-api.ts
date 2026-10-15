import { baseApi } from "../../../shared/api";
import { saveConfigFile } from "../lib/save-config-file";

const downloadConfigApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    downloadConfig: builder.mutation<void, string>({
      async queryFn(id, _api, _extra, request) {
        const response = await request({
          url: `me/configs/${encodeURIComponent(id)}/download`,
          cache: "no-store",
          responseHandler: async (result) =>
            result.ok ? result.blob() : result.json().catch(() => null),
        });
        if (response.error) return { error: response.error };
        if (_api.signal.aborted)
          return {
            error: { status: "FETCH_ERROR", error: "Загрузка отменена" },
          };
        // Blob остаётся только в локальном scope и не попадает в Redux/cache/actions.
        const type = response.meta?.response?.headers
          .get("Content-Type")
          ?.split(";")[0]
          .trim()
          .toLowerCase();
        if (
          !(response.data instanceof Blob) ||
          !response.data.size ||
          type !== "application/octet-stream"
        ) {
          return {
            error: {
              status: "CUSTOM_ERROR",
              error: "Сервер не вернул файл конфигурации",
            },
          };
        }
        try {
          saveConfigFile(response.data, id);
        } catch {
          return {
            error: {
              status: "CUSTOM_ERROR",
              error: "Браузер не смог сохранить файл",
            },
          };
        }
        return { data: undefined };
      },
      invalidatesTags: (_result, error) =>
        error && error.status === 401
          ? ["Session"]
          : error && error.status === 404
            ? ["MyConfigs"]
            : [],
    }),
  }),
});

export const { useDownloadConfigMutation } = downloadConfigApi;
