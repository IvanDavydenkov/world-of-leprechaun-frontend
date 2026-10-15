import { configureStore } from '@reduxjs/toolkit';

// Доменные reducers и RTK Query middleware добавляются вместе с функциональностью.
const initialState = {};

export const store = configureStore({
  reducer: (state = initialState) => state,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
