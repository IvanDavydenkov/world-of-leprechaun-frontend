import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { apiBaseUrl } from "./api-config";

export const baseApi = createApi({
  reducerPath: "api",
  tagTypes: ["Users", "Session", "MyConfigs", "VpnServers"],
  baseQuery: fetchBaseQuery({
    baseUrl: apiBaseUrl,
    credentials: "include",
    timeout: 10000,
  }),
  endpoints: () => ({}),
});
