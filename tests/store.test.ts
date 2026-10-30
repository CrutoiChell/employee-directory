import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configureStore, type Middleware } from '@reduxjs/toolkit';
import { authenticate, directoryApi } from '../client/src/App/apiSlice.js';

test('RTK Query: пароль вне Redux, инвалидация списка и очистка кэша', async function queryLifecycle() {
  const originalRequest = globalThis.Request;
  const originalFetch = globalThis.fetch;
  class TestRequest extends originalRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      super(
        typeof input === 'string' ? new URL(input, 'http://test.local') : input,
        init,
      );
    }
  }
  globalThis.Request = TestRequest;
  let signedIn = false;
  let employeeCount = 0;
  let employeeReads = 0;
  globalThis.fetch = async function mockFetch(input) {
    const req = input as Request;
    assert.equal(req.credentials, 'include');
    const pathname = new URL(req.url).pathname;
    let result: object;
    if (pathname === '/api/auth/login' || pathname === '/api/auth/register') {
      const credentials = (await req.json()) as { password: string };
      assert.equal(credentials.password, 'Secret-that-must-not-enter-redux');
      signedIn = true;
      result = { user: { id: 1, email: 'test@example.com' } };
    } else if (pathname === '/api/auth/logout') {
      signedIn = false;
      result = { ok: true };
    } else if (!signedIn) {
      return Response.json({ message: 'Сессия завершена.' }, { status: 401 });
    } else if (pathname === '/api/employees' && req.method === 'POST') {
      employeeCount++;
      result = { employee: { id: employeeCount, ...(await req.json()) } };
    } else if (pathname === '/api/employees') {
      employeeReads++;
      result = {
        employees: Array.from(
          { length: employeeCount },
          function employee(_, id) {
            return {
              id,
              fullName: 'Иван Иванов',
              position: 'Разработчик',
              department: 'ИТ',
            };
          },
        ),
        total: employeeCount,
        overall: employeeCount,
        page: 1,
        pages: 1,
        departments: ['ИТ'],
      };
    } else result = { user: { id: 1, email: 'test@example.com' } };
    return Response.json(result);
  };
  const actions: unknown[] = [];
  const record: Middleware = function record() {
    return function nextMiddleware(next) {
      return function action(action) {
        actions.push(action);
        return next(action);
      };
    };
  };
  const store = configureStore({
    reducer: { [directoryApi.reducerPath]: directoryApi.reducer },
    middleware: function middleware(defaultMiddleware) {
      return defaultMiddleware().concat(directoryApi.middleware, record);
    },
  });
  const args = { search: '', department: '', page: 1 };
  async function waitFor(predicate: () => boolean) {
    for (let i = 0; i < 100; i++) {
      if (predicate()) return;
      await new Promise(function tick(resolve) {
        setTimeout(resolve, 5);
      });
    }
    assert.fail('RTK Query did not reach expected state');
  }
  try {
    await authenticate(
      function register(id) {
        return store.dispatch(directoryApi.endpoints.register.initiate(id));
      },
      {
        email: 'test@example.com',
        password: 'Secret-that-must-not-enter-redux',
      },
    );
    await store
      .dispatch(
        directoryApi.endpoints.getMe.initiate(undefined, { subscribe: false }),
      )
      .unwrap();
    const subscription = store.dispatch(
      directoryApi.endpoints.getEmployees.initiate(args),
    );
    await subscription.unwrap();
    assert.equal(employeeReads, 1);
    await store
      .dispatch(
        directoryApi.endpoints.addEmployee.initiate({
          fullName: 'Иван Иванов',
          position: 'Разработчик',
          department: 'ИТ',
        }),
      )
      .unwrap();
    await waitFor(function updated() {
      return (
        directoryApi.endpoints.getEmployees.select(args)(store.getState()).data
          ?.total === 1
      );
    });
    assert.equal(employeeReads, 2);
    assert.ok(
      !JSON.stringify(actions).includes('Secret-that-must-not-enter-redux'),
    );
    assert.ok(
      !JSON.stringify(store.getState()).includes(
        'Secret-that-must-not-enter-redux',
      ),
    );
    assert.ok(!JSON.stringify(actions).includes('baseQueryMeta'));
    subscription.unsubscribe();
    await store.dispatch(directoryApi.endpoints.logout.initiate()).unwrap();
    assert.deepEqual(store.getState().directoryApi.queries, {});
    assert.deepEqual(store.getState().directoryApi.mutations, {});
    await authenticate(
      function login(id) {
        return store.dispatch(directoryApi.endpoints.login.initiate(id));
      },
      {
        email: 'test@example.com',
        password: 'Secret-that-must-not-enter-redux',
      },
    );
    signedIn = false;
    await store.dispatch(
      directoryApi.endpoints.getEmployees.initiate(args, { subscribe: false }),
    );
    assert.deepEqual(store.getState().directoryApi.queries, {});
  } finally {
    store.dispatch(directoryApi.util.resetApiState());
    globalThis.Request = originalRequest;
    globalThis.fetch = originalFetch;
  }
});
