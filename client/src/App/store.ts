import { configureStore } from '@reduxjs/toolkit';
import { directoryApi } from './apiSlice';

export const store = configureStore({
  reducer: { [directoryApi.reducerPath]: directoryApi.reducer },
  middleware: function middleware(getDefaultMiddleware) {
    return getDefaultMiddleware().concat(directoryApi.middleware);
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
