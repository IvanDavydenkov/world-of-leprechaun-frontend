import { baseApi, clearPrivateSessionState } from "../../../shared/api";

const signOutApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    signOut: builder.mutation<void, void>({
      query: () => ({
        url: "auth/logout",
        method: "POST",
        headers: { Accept: "application/json" },
        responseHandler: "text",
      }),
      transformResponse: () => { clearPrivateSessionState(); return undefined; },
    }),
  }),
});

export const { useSignOutMutation } = signOutApi;
