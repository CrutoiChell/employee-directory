import {
  createApi,
  fetchBaseQuery,
  type BaseQueryApi,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { Employee, EmployeeInput, User, DirectoryData } from '../types';

type Credentials = { email: string; password: string };
type AuthResult = { user: User };

// Endpoint arguments appear in Redux actions. A single-use reference keeps
// credentials out of actions, state, cache and DevTools.
const pendingCredentials = new Map<string, Credentials>();

function consumeCredentials(requestId: string) {
  const credentials = pendingCredentials.get(requestId);
  pendingCredentials.delete(requestId);
  if (!credentials)
    throw new Error('Запрос авторизации больше недоступен. Повторите попытку.');
  return credentials;
}

export async function authenticate(
  trigger: (requestId: string) => { unwrap: () => Promise<AuthResult> },
  credentials: Credentials,
) {
  const requestId = crypto.randomUUID();
  pendingCredentials.set(requestId, credentials);
  try {
    return await trigger(requestId).unwrap();
  } finally {
    pendingCredentials.delete(requestId);
  }
}

const fetchQuery = fetchBaseQuery({
  baseUrl: '/api',
  credentials: 'include',
  timeout: 15000,
});

async function sessionBaseQuery(
  args: string | FetchArgs,
  api: BaseQueryApi,
  extraOptions: object,
): Promise<{ error: FetchBaseQueryError } | { data: unknown }> {
  const result = await fetchQuery(args, api, extraOptions);
  const url = typeof args === 'string' ? args : args.url;
  if (result.error?.status === 401 && url.startsWith('/employees')) {
    api.dispatch(directoryApi.util.resetApiState());
  }
  // fetchBaseQuery metadata contains Request objects with request bodies.
  // Keep even this metadata out of Redux, especially for authentication calls.
  return result.error ? { error: result.error } : { data: result.data };
}

export const directoryApi = createApi({
  reducerPath: 'directoryApi',
  baseQuery: sessionBaseQuery,
  tagTypes: ['Employee', 'Session'],
  endpoints: function endpoints(builder) {
    return {
      register: builder.mutation<AuthResult, string>({
        query: function register(requestId) {
          return {
            url: '/auth/register',
            method: 'POST',
            body: consumeCredentials(requestId),
          };
        },
        async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
          try {
            const { data } = await queryFulfilled;
            await dispatch(
              directoryApi.util.upsertQueryData('getMe', undefined, data),
            );
          } catch {
            /* Form owns authentication errors. */
          }
        },
      }),
      login: builder.mutation<AuthResult, string>({
        query: function login(requestId) {
          return {
            url: '/auth/login',
            method: 'POST',
            body: consumeCredentials(requestId),
          };
        },
        async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
          try {
            const { data } = await queryFulfilled;
            await dispatch(
              directoryApi.util.upsertQueryData('getMe', undefined, data),
            );
          } catch {
            /* Form owns authentication errors. */
          }
        },
      }),
      logout: builder.mutation<{ ok: boolean }, void>({
        query: function logout() {
          return { url: '/auth/logout', method: 'POST', body: {} };
        },
        async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
          try {
            await queryFulfilled;
            dispatch(directoryApi.util.resetApiState());
          } catch {
            /* Keep the session UI available for retry. */
          }
        },
      }),
      getMe: builder.query<AuthResult, void>({
        query: function getMe() {
          return '/auth/me';
        },
        providesTags: ['Session'],
      }),
      getEmployees: builder.query<
        DirectoryData,
        { search: string; department: string; page: number }
      >({
        query: function getEmployees(params) {
          return { url: '/employees', params };
        },
        providesTags: ['Employee'],
        keepUnusedDataFor: 30,
      }),
      addEmployee: builder.mutation<{ employee: Employee }, EmployeeInput>({
        query: function addEmployee(body) {
          return { url: '/employees', method: 'POST', body };
        },
        invalidatesTags: function invalidate(result) {
          return result ? ['Employee'] : [];
        },
      }),
    };
  },
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useLogoutMutation,
  useGetMeQuery,
  useGetEmployeesQuery,
  useAddEmployeeMutation,
} = directoryApi;

export function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    if (
      'data' in error &&
      typeof error.data === 'object' &&
      error.data !== null &&
      'message' in error.data &&
      typeof error.data.message === 'string'
    )
      return error.data.message;
    return 'Нет ответа от сервера. Проверьте соединение и повторите попытку.';
  }
  return error instanceof Error
    ? error.message
    : 'Не удалось выполнить запрос. Повторите попытку.';
}
