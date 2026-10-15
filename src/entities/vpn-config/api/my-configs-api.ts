import { baseApi } from "../../../shared/api";
import { personalConfigsSchema } from "../model/personal-config-schema";
import type { PersonalConfig } from "../model/personal-config-schema";

const myConfigsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyConfigs: builder.query<PersonalConfig[], void>({
      async queryFn(_arg, _api, _extra, request) {
        const response = await request("me/configs");
        if (response.error) return { error: response.error };
        const result = personalConfigsSchema.safeParse(response.data);
        return result.success
          ? { data: result.data }
          : {
              error: {
                status: "CUSTOM_ERROR",
                error: "Некорректный список конфигов",
              },
            };
      },
      providesTags: ["MyConfigs"],
      keepUnusedDataFor: 0,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch (failure) {
          if (
            failure &&
            typeof failure === "object" &&
            "error" in failure &&
            failure.error &&
            typeof failure.error === "object" &&
            "status" in failure.error &&
            failure.error.status === 401
          )
            dispatch(baseApi.util.invalidateTags(["Session"]));
        }
      },
    }),
  }),
});

export const { useGetMyConfigsQuery } = myConfigsApi;
