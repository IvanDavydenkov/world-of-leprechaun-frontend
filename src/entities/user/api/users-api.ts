import { z } from "zod";
import { baseApi } from "../../../shared/api";
import { userOverviewSchema } from "../model/user-overview-schema";

const usersSchema = z.array(userOverviewSchema);

const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<
      {
        users: z.infer<typeof usersSchema>;
        nextCursor: string | null;
        hasNextPage: boolean;
      },
      { after?: string; limit: number }
    >({
      async queryFn(params, _api, _extra, request) {
        const response = await request({ url: "admin/users", params });
        if (response.error) return { error: response.error };
        const result = usersSchema.safeParse(response.data);
        const nextCursor =
          response.meta?.response?.headers.get("X-Next-Cursor") || null;
        return result.success
          ? {
              data: {
                users: result.data,
                nextCursor,
                hasNextPage:
                  !!nextCursor ||
                  (result.data.length === params.limit &&
                    result.data.every((user) => user.vpn === undefined)),
              },
            }
          : {
              error: {
                status: "CUSTOM_ERROR",
                error: "Некорректный ответ каталога пользователей",
              },
            };
      },
      keepUnusedDataFor: 0,
      providesTags: ["Users"],
    }),
  }),
});

export const { useGetUsersQuery } = usersApi;
