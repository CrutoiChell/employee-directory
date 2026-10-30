import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'vite';
import { createApp } from '../server/app.js';
import viteConfig from '../vite.config.js';

test('Vite proxy preserves same-origin registration, login and session protection', async function developmentProxy() {
  const { app, db } = createApp(':memory:', { seed: false });
  const backend = app.listen(0, '127.0.0.1');
  await once(backend, 'listening');
  const backendAddress = backend.address();
  assert.ok(backendAddress && typeof backendAddress !== 'string');
  const proxy = viteConfig.server?.proxy?.['/api'];
  assert.ok(proxy && typeof proxy === 'object');
  const vite = await createServer({
    ...viteConfig,
    configFile: false,
    logLevel: 'silent',
    server: {
      ...viteConfig.server,
      host: '127.0.0.1',
      port: 0,
      proxy: {
        '/api': {
          ...proxy,
          target: `http://127.0.0.1:${backendAddress.port}`,
        },
      },
    },
  });
  try {
    await vite.listen();
    const address = vite.httpServer?.address();
    assert.ok(address && typeof address !== 'string');
    const origin = `http://127.0.0.1:${address.port}`;
    const stylesheet = await fetch(
      `${origin}/src/Components/EmployeeFilters/EmployeeFilters.css`,
    );
    assert.equal(stylesheet.status, 200);
    assert.ok(
      (await stylesheet.text()).includes('.filters__search'),
      'Vite must serve the search panel CSS, not an empty style module',
    );
    const credentials = {
      email: 'proxy-test@example.com',
      password: 'Proxy-test-password',
    };
    async function post(
      route: string,
      body: object,
      cookie = '',
      requestOrigin = origin,
    ) {
      return fetch(`${origin}/api${route}`, {
        method: 'POST',
        headers: {
          Origin: requestOrigin,
          'Content-Type': 'application/json',
          Cookie: cookie,
        },
        body: JSON.stringify(body),
      });
    }
    const registered = await post('/auth/register', credentials);
    assert.equal(registered.status, 201);
    const cookie = registered.headers.get('set-cookie')!.split(';')[0];
    assert.equal(
      (await fetch(`${origin}/api/auth/me`, { headers: { Cookie: cookie } }))
        .status,
      200,
    );
    const employee = {
      fullName: 'Проверка прокси',
      position: 'Разработчик',
      department: 'Разработка',
    };
    assert.equal((await post('/employees', employee, cookie)).status, 201);
    for (const foreignOrigin of [
      'https://foreign.example',
      'null',
      `${origin}.foreign.example`,
    ]) {
      assert.equal(
        (await post('/auth/register', credentials, '', foreignOrigin)).status,
        403,
      );
      assert.equal(
        (await post('/employees', employee, cookie, foreignOrigin)).status,
        403,
      );
    }
    assert.equal((await post('/auth/logout', {}, cookie)).status, 200);
    assert.equal(
      (await fetch(`${origin}/api/employees`, { headers: { Cookie: cookie } }))
        .status,
      401,
    );
    assert.equal((await post('/auth/login', credentials)).status, 200);
  } finally {
    await vite.close();
    await new Promise<void>(function close(resolve, reject) {
      backend.close(function closed(error) {
        if (error) reject(error);
        else resolve();
      });
    });
    db.close();
  }
});
