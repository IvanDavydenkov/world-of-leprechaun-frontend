import { baseApi, bindPrivateSessionState, clearPrivateSessionState } from "../../../shared/api";
import { sessionSchema } from "../model/session-schema";
import type { Session } from "../model/session-schema";

const sessionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSession: builder.query<Session, void>({
      async queryFn(_arg, _api, _extra, request) {
        const response = await request("me");
        if (response.error) {
          if (response.error.status === 401) clearPrivateSessionState();
          return { error: response.error };
        }
        const result = sessionSchema.safeParse(response.data);
        if (result.success) bindPrivateSessionState(result.data.id);
        return result.success
          ? { data: result.data }
          : {
              error: {
                status: "CUSTOM_ERROR",
                error: "Некорректный ответ сервера",
              },
            };
      },
      keepUnusedDataFor: 0,
      providesTags: ["Session"],
    }),
  }),
});

export const { useGetSessionQuery } = sessionApi;
