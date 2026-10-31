import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createApp } from '../server/app.js';

test('пять демонстрационных сотрудников добавляются только один раз', function seedPersistence() {
  const directory = mkdtempSync(path.join(tmpdir(), 'directory-seed-test-'));
  const databasePath = path.join(directory, 'seed.sqlite');
  const first = createApp(databasePath);
  const initial = first.db.prepare('SELECT * FROM employees ORDER BY id').all();
  assert.equal(initial.length, 5);
  for (const employee of initial)
    assert.equal(String(employee.fullName).trim().split(/\s+/u).length, 3);
  first.db
    .prepare(
      'INSERT INTO employees (fullName, position, department) VALUES (?, ?, ?)',
    )
    .run('Новый сотрудник', 'Разработчик', 'ИТ');
  first.db.close();
  const second = createApp(databasePath);
  assert.equal(
    (
      second.db.prepare('SELECT COUNT(*) AS count FROM employees').get() as {
        count: number;
      }
    ).count,
    6,
  );
  assert.deepEqual(
    second.db.prepare('SELECT * FROM employees ORDER BY id LIMIT 5').all(),
    initial,
  );
  second.db.close();
  rmSync(directory, { recursive: true, force: true });
});

test('существующая база со старым seed не изменяется и не получает дубли', function legacySeed() {
  const directory = mkdtempSync(path.join(tmpdir(), 'directory-legacy-test-'));
  const databasePath = path.join(directory, 'legacy.sqlite');
  const legacy = createApp(databasePath, { seed: false });
  const insert = legacy.db.prepare(
    'INSERT INTO employees (fullName, position, department) VALUES (?, ?, ?)',
  );
  for (const name of [
    'Алексей Морозов',
    'Мария Волкова',
    'Дмитрий Соколов',
    'Елена Кузнецова',
    'Никита Орлов',
    'Пользовательская запись',
  ])
    insert.run(name, 'Специалист', 'Отдел');
  legacy.db
    .prepare('INSERT INTO migrations (name) VALUES (?)')
    .run('demo-employees-v1');
  const before = legacy.db.prepare('SELECT * FROM employees ORDER BY id').all();
  legacy.db.close();
  const reopened = createApp(databasePath);
  assert.deepEqual(
    reopened.db.prepare('SELECT * FROM employees ORDER BY id').all(),
    before,
  );
  reopened.db.close();
  rmSync(directory, { recursive: true, force: true });
});

test('авторизация, валидация, справочник и персистентность SQLite', async function apiFlow() {
  const directory = mkdtempSync(path.join(tmpdir(), 'directory-test-'));
  const databasePath = path.join(directory, 'test.sqlite');
  const { app, db } = createApp(databasePath, { seed: false });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  let cookie = '';
  async function request(
    route: string,
    method = 'GET',
    body?: unknown,
    authenticated = true,
    origin = base,
  ) {
    return fetch(`${base}/api${route}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        ...(authenticated && cookie ? { Cookie: cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }
  try {
    assert.equal((await request('/employees')).status, 401);
    assert.equal(
      (
        await request('/employees', 'POST', {
          fullName: 'Иван Иванов',
          position: 'Разработчик',
          department: 'ИТ',
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await request('/auth/register', 'POST', {
          email: 'invalid',
          password: '123',
        })
      ).status,
      400,
    );
    const register = await request('/auth/register', 'POST', {
      email: ' Team@Example.com ',
      password: 'Test-password-123',
    });
    assert.equal(register.status, 201);
    const setCookie = register.headers.get('set-cookie');
    assert.ok(setCookie);
    assert.ok(setCookie.includes('HttpOnly'));
    assert.ok(setCookie.includes('SameSite=Lax'));
    cookie = setCookie.split(';')[0];
    assert.equal((await register.json()).user.email, 'team@example.com');
    const stored = db.prepare('SELECT password FROM users').get() as {
      password: string;
    };
    assert.notEqual(stored.password, 'Test-password-123');
    assert.match(stored.password, /^[a-f0-9]{32}:[a-f0-9]{128}$/);
    assert.equal(
      (
        await request('/auth/register', 'POST', {
          email: 'team@example.com',
          password: 'Test-password-123',
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await request('/auth/login', 'POST', {
          email: 'team@example.com',
          password: 'wrong-password',
        })
      ).status,
      401,
    );
    assert.equal((await request('/auth/me')).status, 200);
    assert.equal((await request('/employees')).status, 200);
    assert.equal((await (await request('/employees')).json()).total, 0);
    assert.equal(
      (
        await request('/employees', 'POST', {
          fullName: '',
          position: '  ',
          department: '',
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request(
          '/employees',
          'POST',
          {
            fullName: 'Иван Иванов',
            position: 'Разработчик',
            department: 'ИТ',
          },
          true,
          'https://foreign.example',
        )
      ).status,
      403,
    );
    const employee = {
      fullName: 'Иван Иванов',
      position: 'Разработчик',
      department: 'Инженерия',
    };
    for (const contentType of [
      'text/plain',
      'application/x-www-form-urlencoded',
    ]) {
      const blocked = await fetch(`${base}/api/employees`, {
        method: 'POST',
        headers: { Cookie: cookie, Origin: base, 'Content-Type': contentType },
        body: JSON.stringify(employee),
      });
      assert.equal(blocked.status, 403);
    }
    assert.equal(
      (await request('/employees', 'POST', employee, true, 'null')).status,
      403,
    );
    assert.equal((await (await request('/employees')).json()).total, 0);
    assert.equal((await request('/employees', 'POST', employee)).status, 201);
    assert.equal(
      (
        await request('/employees', 'POST', {
          fullName: 'Анна Петрова',
          position: 'Дизайнер',
          department: 'Дизайн',
        })
      ).status,
      201,
    );
    const found = await (
      await request('/employees?search=' + encodeURIComponent('ИВАН'))
    ).json();
    assert.equal(found.total, 1);
    assert.equal(found.employees[0].fullName, employee.fullName);
    assert.equal(
      (
        await (
          await request(
            '/employees?search=' +
              encodeURIComponent('иван') +
              '&department=' +
              encodeURIComponent('Дизайн'),
          )
        ).json()
      ).total,
      0,
    );
    assert.equal(
      (await (await request('/employees?search=%27%20OR%201%3D1--')).json())
        .total,
      0,
    );
    for (let i = 0; i < 10; i++)
      await request('/employees', 'POST', {
        ...employee,
        fullName: `Сотрудник ${i}`,
      });
    const first = await (await request('/employees')).json();
    assert.equal(first.total, 12);
    assert.equal(first.employees.length, 10);
    assert.equal(first.pages, 2);
    const last = await (await request('/employees?page=999')).json();
    assert.equal(last.page, 2);
    assert.equal(last.employees.length, 2);
    assert.equal((await request('/auth/logout', 'POST', {})).status, 200);
    assert.equal((await request('/employees')).status, 401);
    assert.equal((await request('/employees', 'POST', employee)).status, 401);
    const login = await request('/auth/login', 'POST', {
      email: 'team@example.com',
      password: 'Test-password-123',
    });
    assert.equal(login.status, 200);
    cookie = login.headers.get('set-cookie')!.split(';')[0];
    db.prepare('UPDATE sessions SET expires = 0').run();
    assert.equal((await request('/employees')).status, 401);
    assert.equal((await request('/unknown')).status, 404);
  } finally {
    await new Promise<void>(function close(resolve, reject) {
      server.close(function closed(error) {
        if (error) reject(error);
        else resolve();
      });
    });
    db.close();
  }
  const reopened = createApp(databasePath, { seed: false });
  assert.equal(
    (
      reopened.db.prepare('SELECT COUNT(*) AS count FROM employees').get() as {
        count: number;
      }
    ).count,
    12,
  );
  reopened.db.close();
  rmSync(directory, { recursive: true, force: true });
});
