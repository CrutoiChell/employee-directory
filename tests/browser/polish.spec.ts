import { test, expect, type Page } from '@playwright/test';

async function register(page: Page) {
  await page.goto('/registration');
  await page
    .locator('#email')
    .fill(`polish-${crypto.randomUUID()}@example.com`);
  await page.locator('#password').fill('Polish-test-password');
  await page
    .getByRole('button', { name: 'Зарегистрироваться', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Сотрудники', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.employees')).toHaveAttribute(
    'aria-busy',
    'false',
  );
}

test('debounce 300ms: мгновенный ввод, видимые прежние строки, очистка и cleanup', async function liveSearch({
  page,
}) {
  const searches: string[] = [];
  const employees = [
    {
      id: 1,
      fullName: 'Анна Петрова',
      position: 'Дизайнер',
      department: 'Дизайн',
    },
    {
      id: 2,
      fullName: 'Пётр Иванов',
      position: 'Разработчик',
      department: 'Разработка',
    },
  ];
  let release = function release() {};
  const responseGate = new Promise<void>(function gate(resolve) {
    release = resolve;
  });
  await page.route('**/api/employees?**', async function list(route) {
    const search =
      new URL(route.request().url()).searchParams.get('search') || '';
    searches.push(search);
    if (search) await responseGate;
    const rows = employees.filter(function match(employee) {
      return employee.fullName.includes(search);
    });
    await route.fulfill({
      json: {
        employees: rows,
        overall: 2,
        total: rows.length,
        page: 1,
        pages: 1,
        departments: ['Дизайн', 'Разработка'],
      },
    });
  });
  try {
    await register(page);
    searches.length = 0;
    await page.clock.install({ time: new Date('2026-10-31T10:00:00Z') });
    await page.clock.pauseAt(new Date('2026-10-31T10:00:01Z'));
    const input = page.getByRole('textbox', { name: 'Поиск по ФИО' });
    const previousHeight = (await page.locator('.employees').boundingBox())!
      .height;
    await input.fill('А');
    await expect(input).toHaveValue('А');
    await page.clock.fastForward(100);
    await input.fill('Ан');
    await page.clock.fastForward(100);
    await input.fill('Анна');
    await expect(input).toHaveValue('Анна');
    await page.clock.fastForward(299);
    expect(searches).toEqual([]);
    await expect(page.getByText('Пётр Иванов', { exact: true })).toBeVisible();
    await page.clock.fastForward(1);
    await expect
      .poll(function calls() {
        return searches;
      })
      .toEqual(['Анна']);
    await expect(page.getByText('Обновление…', { exact: true })).toBeVisible();
    await expect(page.getByText('Пётр Иванов', { exact: true })).toBeVisible();
    await expect(page.locator('.employees .spinner')).toHaveCount(0);
    expect((await page.locator('.employees').boundingBox())!.height).toBe(
      previousHeight,
    );
    release();
    await expect(page.getByText('Анна Петрова', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Пётр Иванов', { exact: true }),
    ).not.toBeVisible();
    await page.getByRole('button', { name: 'Очистить поиск' }).click();
    await expect(input).toHaveValue('');
    await expect(page.getByText('Пётр Иванов', { exact: true })).toBeVisible();
    await page.locator('.employees__content').evaluate(function mark(element) {
      element.setAttribute('data-stable-result', 'yes');
    });
    await page
      .getByRole('button', { name: 'Добавить сотрудника', exact: true })
      .first()
      .click();
    await expect(page.locator('.employees__content')).toHaveAttribute(
      'data-stable-result',
      'yes',
    );
    await page.keyboard.press('Escape');
    await input.fill('не отправлять');
    await page.getByRole('button', { name: 'Выйти', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Добро пожаловать' }),
    ).toBeVisible();
    await page.clock.fastForward(1000);
    expect(searches).not.toContain('не отправлять');
  } finally {
    release();
  }
});

test('hover/focus полей и reduced-motion', async function controls({ page }) {
  await page.goto('/login');
  const email = page.locator('#email');
  await email.hover();
  await expect(email).toHaveCSS('border-color', 'rgb(0, 113, 227)');
  const bounds = await email.boundingBox();
  await email.focus();
  await expect(email).toHaveCSS('box-shadow', /0px 0px 0px 3px/);
  expect(await email.boundingBox()).toEqual(bounds);
  await register(page);
  const search = page.locator('.filters__search');
  await search.hover();
  await expect(search).toHaveCSS('border-color', 'rgb(0, 113, 227)');
  await page.locator('#search').focus();
  await expect(search).toHaveCSS('box-shadow', /0px 0px 0px 3px/);
  const select = page.locator('#department-filter');
  await select.hover();
  await expect(select).toHaveCSS('border-color', 'rgb(0, 113, 227)');
  await select.click();
  await expect(select).toHaveCSS('box-shadow', /0px 0px 0px 3px/);
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page
    .getByRole('button', { name: 'Добавить сотрудника', exact: true })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveCSS('animation-name', 'none');
  expect(
    await dialog.evaluate(function backdrop(element) {
      return getComputedStyle(element, '::backdrop').animationName;
    }),
  ).toBe('none');
  await page.locator('#position').hover();
  await expect(page.locator('#position')).toHaveCSS(
    'border-color',
    'rgb(0, 113, 227)',
  );
  await page.locator('#position').focus();
  await expect(page.locator('#position')).toHaveCSS(
    'box-shadow',
    /0px 0px 0px 3px/,
  );
  await expect(page.locator('.employees__content')).toHaveCSS(
    'animation-name',
    'none',
  );
  await expect(page.locator('#position')).toHaveCSS(
    'transition-duration',
    '0s',
  );
});

test('динамическое количество и склонения без повторяющихся слоганов', async function employeeCount({
  page,
}) {
  let overall = 0;
  await page.route('**/api/employees?**', async function list(route) {
    await route.fulfill({
      json: {
        employees: [],
        overall,
        total: 0,
        page: 1,
        pages: 1,
        departments: [],
      },
    });
  });
  await register(page);
  for (const [count, label] of [
    [1, '1 сотрудник'],
    [2, '2 сотрудника'],
    [5, '5 сотрудников'],
    [21, '21 сотрудник'],
    [22, '22 сотрудника'],
    [111, '111 сотрудников'],
  ] as const) {
    overall = count;
    await page.locator('#search').fill(`проверка ${count}`);
    await page.locator('#search').press('Enter');
    await expect(page.locator('.directory__summary')).toHaveText(label);
  }
  await expect(
    page.getByText('Единый справочник для всей команды'),
  ).toHaveCount(0);
  await expect(
    page.getByText('Ваша команда и её экспертиза — всегда под рукой.'),
  ).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Сотрудники', exact: true }),
  ).toHaveCount(1);
});
