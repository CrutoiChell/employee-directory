import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function signUp(page: Page) {
  await page.goto('/registration');
  await page
    .getByLabel('Email', { exact: false })
    .fill(`test-${crypto.randomUUID()}@example.com`);
  await page
    .getByLabel('Пароль', { exact: false })
    .first()
    .fill('Browser-test-password-123');
  await page
    .getByRole('button', { name: 'Зарегистрироваться', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Сотрудники' })).toBeVisible();
  await expect(page.locator('.employees')).toHaveAttribute(
    'aria-busy',
    'false',
  );
}

async function addEmployee(page: Page, fullName: string, department: string) {
  await page
    .getByRole('button', { name: 'Добавить сотрудника', exact: true })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('ФИО').fill(fullName);
  await dialog.getByLabel('Должность').fill('Ведущий специалист');
  await dialog.getByLabel('Отдел', { exact: false }).fill(department);
  await dialog.getByRole('button', { name: 'Добавить', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText(fullName, { exact: true })).toBeVisible();
}

test('регистрация, формы, RTK-инвалидация, поиск, фильтр, выход и вход', async function workflow({
  page,
}) {
  const errors: string[] = [];
  page.on('pageerror', function collect(error) {
    errors.push(error.message);
  });
  await page.goto('/employees');
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole('heading', { name: 'Добро пожаловать' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.locator('#email')).toBeFocused();
  await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
  const email = `workflow-${crypto.randomUUID()}@example.com`;
  await page
    .getByRole('link', { name: 'Зарегистрироваться', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Создайте аккаунт' }),
  ).toBeVisible();
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('Browser-test-password-123');
  await page.getByRole('button', { name: 'Показать пароль' }).click();
  await expect(page.locator('#password')).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Скрыть пароль' }).click();
  await page
    .getByRole('button', { name: 'Зарегистрироваться', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Сотрудники' })).toBeVisible();
  const addButton = page
    .getByRole('button', { name: 'Добавить сотрудника', exact: true })
    .first();
  await addButton.click();
  await expect(page.locator('#fullName')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(addButton).toBeFocused();
  await addButton.click();
  await page.getByRole('button', { name: 'Добавить', exact: true }).click();
  await expect(page.locator('#fullName')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.locator('#fullName')).toBeFocused();
  await page.getByRole('button', { name: 'Отмена' }).click();
  await addEmployee(page, 'Иван Иванов', 'Инженерия');
  await expect(
    page.getByText('Сотрудник добавлен в справочник.'),
  ).toBeVisible();
  await addEmployee(page, 'Анна Петрова', 'Дизайн');
  await page.getByLabel('Поиск по ФИО', { exact: true }).fill('ИВАН');
  await expect(page.getByText('Иван Иванов', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Анна Петрова', { exact: true }),
  ).not.toBeVisible();
  await page.getByRole('combobox', { name: 'Фильтр по отделу' }).click();
  await page.getByRole('option', { name: 'Дизайн', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Ничего не найдено' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Очистить поиск' }).click();
  await expect(page.locator('#search')).toBeFocused();
  await expect(page.getByText('Анна Петрова', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Фильтр по отделу' }).click();
  await page.getByRole('option', { name: 'Все отделы', exact: true }).click();
  await expect(page.getByText('Иван Иванов', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Сотрудники' })).toBeVisible();
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Добро пожаловать' }),
  ).toBeVisible();
  await expect(
    page.getByText('Иван Иванов', { exact: true }),
  ).not.toBeVisible();
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('wrong-password');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Неверный email или пароль.',
  );
  await page.locator('#password').fill('Browser-test-password-123');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Сотрудники' })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const width of [375, 768, 1440]) {
  test(`адаптивность и доступность: ${width}px`, async function responsive({
    page,
  }) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Добро пожаловать' }),
    ).toBeVisible();
    await page.locator('#email').focus();
    await expect(page.locator('#email')).toHaveCSS(
      'border-color',
      'rgb(0, 113, 227)',
    );
    await expect(page.locator('#email')).toHaveCSS(
      'box-shadow',
      /0px 0px 0px 3px/,
    );
    const fieldFocus = await page
      .locator('#email')
      .evaluate(function measure(input) {
        const style = getComputedStyle(input);
        const bounds = input.getBoundingClientRect();
        const control = input.parentElement!.getBoundingClientRect();
        return {
          border: style.borderColor,
          shadow: style.boxShadow,
          top: bounds.top - control.top,
          height: bounds.height - control.height,
        };
      });
    expect(fieldFocus.border).toBe('rgb(0, 113, 227)');
    expect(fieldFocus.shadow).toContain('0px 0px 0px 3px');
    expect(fieldFocus.top).toBe(0);
    expect(fieldFocus.height).toBe(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: `test-results/auth-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole('link', { name: 'Зарегистрироваться', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Создайте аккаунт' }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Зарегистрироваться', exact: true })
      .click();
    await expect(page.locator('#email')).toBeFocused();
    await expect(page.locator('#email')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: `test-results/registration-errors-${width}.png`,
      fullPage: true,
    });
    await signUp(page);
    await addEmployee(
      page,
      `Александрова-Соколовская Александра Константиновна ${width}`,
      'Исследования и разработка продуктов',
    );
    const search = page.getByLabel('Поиск по ФИО', { exact: true });
    await search.fill(String(width));
    await expect(page.locator('.employees__table tbody tr')).toHaveCount(1);
    const dimensions = await page.evaluate(function measure() {
      return {
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      };
    });
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: `test-results/directory-${width}.png`,
      fullPage: true,
    });
    expect(
      await page
        .locator('.filters__search')
        .evaluate(function outline(element) {
          return getComputedStyle(element).boxShadow;
        }),
    ).toContain('0px 0px 0px 3px');
    await page.getByRole('button', { name: 'Очистить поиск' }).focus();
    await expect(
      page.getByRole('button', { name: 'Очистить поиск' }),
    ).toBeFocused();
    expect(
      await page
        .locator('.filters__search')
        .evaluate(function outline(element) {
          return getComputedStyle(element).outlineStyle;
        }),
    ).toBe('none');
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('combobox', { name: 'Фильтр по отделу' }),
    ).toBeFocused();
    await expect(
      page.getByRole('combobox', { name: 'Фильтр по отделу' }),
    ).toHaveCSS('box-shadow', /0px 0px 0px 3px/);
    expect(
      await page
        .getByLabel('Фильтр по отделу')
        .evaluate(function outline(element) {
          return getComputedStyle(element).boxShadow;
        }),
    ).toContain('0px 0px 0px 3px');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    await page
      .getByRole('button', { name: 'Добавить сотрудника', exact: true })
      .first()
      .click();
    await expect(page.locator('#fullName')).toBeFocused();
    const dialog = page.getByRole('dialog');
    await dialog.focus();
    expect(
      await dialog.evaluate(function outline(element) {
        return getComputedStyle(element).outlineStyle;
      }),
    ).toBe('none');
    await page.locator('#fullName').focus();
    await expect(dialog).toHaveCSS('opacity', '1');
    await expect(dialog).toHaveCSS('transform', 'none');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: `test-results/dialog-${width}.png`,
      fullPage: true,
    });
    const bounds = await page.getByRole('dialog').boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await page.keyboard.press('Shift+Tab');
    await expect(
      page.getByRole('button', { name: 'Закрыть форму' }),
    ).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(
      dialog.getByRole('button', { name: 'Добавить', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      dialog.getByRole('button', { name: 'Закрыть форму' }),
    ).toBeFocused();
    await dialog.locator('label[for="position"]').click();
    await expect(page.locator('#position')).toBeFocused();
    await dialog.getByRole('button', { name: 'Добавить', exact: true }).click();
    await expect(page.locator('#fullName')).toBeFocused();
    await expect(page.locator('#fullName')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    if (width === 375) {
      await page.setViewportSize({ width, height: 480 });
      await dialog
        .getByRole('button', { name: 'Добавить', exact: true })
        .focus();
      const submit = await dialog
        .getByRole('button', { name: 'Добавить', exact: true })
        .boundingBox();
      expect(submit!.y).toBeGreaterThanOrEqual(0);
      expect(submit!.y + submit!.height).toBeLessThanOrEqual(480);
      await page.screenshot({
        path: 'test-results/dialog-short-375.png',
        fullPage: true,
      });
    }
    await page.keyboard.press('Escape');
  });
}

test('ошибки сервера, загрузка и истёкшая сессия', async function failureStates({
  page,
}) {
  await signUp(page);
  await page.route('**/api/employees?**', async function fail(route) {
    await route.fulfill({
      status: 500,
      json: { message: 'Сервис временно недоступен.' },
    });
  });
  await page.getByLabel('Поиск по ФИО', { exact: true }).fill('ошибка');
  await expect(
    page.getByRole('heading', { name: 'Не удалось загрузить список' }),
  ).toBeVisible();
  await page.unroute('**/api/employees?**');
  await page.getByRole('button', { name: 'Попробовать снова' }).click();
  await expect(
    page.getByRole('heading', { name: 'Ничего не найдено' }),
  ).toBeVisible();
  await page.route('**/api/employees?**', async function slow(route) {
    await new Promise(function wait(resolve) {
      setTimeout(resolve, 700);
    });
    await route.continue();
  });
  await page
    .getByLabel('Поиск по ФИО', { exact: true })
    .fill('медленный запрос');
  await expect(page.getByText('Обновление…', { exact: true })).toBeVisible();
  await expect(page.locator('.employees')).toHaveAttribute(
    'aria-busy',
    'false',
  );
  await page.unroute('**/api/employees?**');
  await page.context().clearCookies();
  await page.getByLabel('Поиск по ФИО', { exact: true }).fill('сессия');
  await expect(
    page.getByRole('heading', { name: 'Добро пожаловать' }),
  ).toBeVisible();
  await expect(page.locator('.employees')).not.toBeVisible();
});

test('ошибка сохранения сохраняет поля; повторная отправка блокируется', async function saveRecovery({
  page,
}) {
  await signUp(page);
  await page
    .getByRole('button', { name: 'Добавить сотрудника', exact: true })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('ФИО').fill('Тест восстановления формы');
  await dialog.getByLabel('Должность').fill('Специалист');
  await dialog.getByLabel('Отдел', { exact: false }).fill('Тестирование');
  await page.route('**/api/employees', async function fail(route) {
    await route.fulfill({
      status: 500,
      json: { message: 'Сохранение временно недоступно.' },
    });
  });
  await dialog.getByRole('button', { name: 'Добавить', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText(
    'Сохранение временно недоступно.',
  );
  await expect(dialog.getByLabel('ФИО')).toHaveValue(
    'Тест восстановления формы',
  );
  await page.unroute('**/api/employees');
  let submissions = 0;
  await page.route('**/api/employees', async function slowSave(route) {
    submissions++;
    await new Promise(function wait(resolve) {
      setTimeout(resolve, 700);
    });
    await route.continue();
  });
  await dialog.getByRole('button', { name: 'Добавить', exact: true }).click();
  await expect(
    dialog.getByRole('button', { name: 'Сохранение…', exact: true }),
  ).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Отмена' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByText('Тест восстановления формы', { exact: true }),
  ).toBeVisible();
  expect(submissions).toBe(1);
});
