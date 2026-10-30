import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:net';
import { once } from 'node:events';

async function startServer(databasePath: string) {
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const address = reservation.address();
  assert.ok(address && typeof address !== 'string');
  const port = address.port;
  await new Promise<void>(function close(resolve) {
    reservation.close(function closed() {
      resolve();
    });
  });
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(
    process.execPath,
    ['--experimental-sqlite', 'dist-server/server/index.js'],
    {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DATABASE_PATH: databasePath,
        PORT: String(port),
        APP_ORIGIN: origin,
      },
    },
  );
  let stderr = '';
  child.stderr.on('data', function collect(chunk: Buffer) {
    stderr += chunk.toString();
  });
  try {
    await new Promise<void>(function ready(resolve, reject) {
      let stdout = '';
      const timeout = setTimeout(function expired() {
        reject(new Error(`Server startup timed out: ${stderr}`));
      }, 10000);
      child.stdout.on('data', function output(chunk: Buffer) {
        stdout += chunk.toString();
        if (stdout.includes(origin)) {
          clearTimeout(timeout);
          resolve();
        }
      });
      child.once('error', function failed(error) {
        clearTimeout(timeout);
        reject(error);
      });
      child.once('exit', function earlyExit(code) {
        clearTimeout(timeout);
        reject(new Error(`Server exited (${code}): ${stderr}`));
      });
    });
  } catch (error) {
    child.kill();
    throw error;
  }
  async function stop() {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, 'exit');
    child.kill();
    await exited;
  }
  return { origin, stop };
}

test(
  'собранный сервер: сотрудники, seed и сессия сохраняются после перезапуска процесса',
  { timeout: 25000 },
  async function processRestart() {
    const directory = mkdtempSync(path.join(tmpdir(), 'employee-restart-'));
    const databasePath = path.join(directory, 'directory.sqlite');
    let server: Awaited<ReturnType<typeof startServer>> | undefined;
    let cookie = '';
    async function request(route: string, body?: object) {
      assert.ok(server);
      return fetch(`${server.origin}/api${route}`, {
        method: body ? 'POST' : 'GET',
        headers: {
          Origin: server.origin,
          'Content-Type': 'application/json',
          Cookie: cookie,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    }
    try {
      server = await startServer(databasePath);
      const register = await request('/auth/register', {
        email: 'restart@example.com',
        password: 'Restart-test-password',
      });
      assert.equal(register.status, 201);
      cookie = register.headers.get('set-cookie')!.split(';')[0];
      const initial = (await (await request('/employees')).json()) as {
        total: number;
        employees: { id: number }[];
      };
      assert.equal(initial.total, 5);
      const created = await request('/employees', {
        fullName: 'Сотрудник после перезапуска',
        position: 'Разработчик',
        department: 'Разработка',
      });
      assert.equal(created.status, 201);
      const { employee } = (await created.json()) as {
        employee: { id: number; fullName: string };
      };
      await server.stop();
      server = await startServer(databasePath);
      assert.equal((await request('/auth/me')).status, 200);
      const restored = (await (await request('/employees')).json()) as {
        total: number;
        employees: { id: number; fullName: string }[];
      };
      assert.equal(restored.total, 6);
      assert.equal(
        new Set(
          restored.employees.map(function id(item) {
            return item.id;
          }),
        ).size,
        6,
      );
      assert.ok(
        restored.employees.some(function saved(item) {
          return item.id === employee.id && item.fullName === employee.fullName;
        }),
      );
      for (const demo of initial.employees)
        assert.ok(
          restored.employees.some(function existing(item) {
            return item.id === demo.id;
          }),
        );
      assert.equal((await request('/auth/logout', {})).status, 200);
      assert.equal((await request('/employees')).status, 401);
      assert.equal(
        (
          await request('/employees', {
            fullName: 'Нет доступа',
            position: 'Разработчик',
            department: 'Разработка',
          })
        ).status,
        401,
      );
    } finally {
      await server?.stop();
      assert.ok(
        path
          .resolve(directory)
          .startsWith(path.join(path.resolve(tmpdir()), 'employee-restart-')),
      );
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
