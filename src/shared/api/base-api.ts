import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const baseApi = createApi({
  reducerPath: "api",
  tagTypes: ["Users", "Session", "MyConfigs"],
  baseQuery: fetchBaseQuery({
    baseUrl: `${window.location.origin}/`,
    credentials: "same-origin",
    timeout: 10000,
  }),
  endpoints: () => ({}),
});
