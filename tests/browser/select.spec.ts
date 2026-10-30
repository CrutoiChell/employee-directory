import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function openDirectory(page: Page, departments: string[]) {
  await page.route('**/api/employees?**', async function list(route) {
    await route.fulfill({
      json: {
        employees: [],
        total: 0,
        overall: 0,
        page: 1,
        pages: 1,
        departments,
      },
    });
  });
  await page.goto('/registration');
  await page
    .locator('#email')
    .fill(`select-${crypto.randomUUID()}@example.com`);
  await page.locator('#password').fill('Select-test-password');
  await page
    .getByRole('button', { name: 'Зарегистрироваться', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Сотрудники' })).toBeVisible();
  await expect(page.locator('.employees')).toHaveAttribute(
    'aria-busy',
    'false',
  );
}

for (const width of [375, 768, 1440]) {
  test(`Select: мышь, клавиатура, геометрия и axe — ${width}px`, async function selectInteraction({
    page,
  }) {
    await page.setViewportSize({ width, height: 900 });
    await openDirectory(page, ['Дизайн', 'Инженерия', 'Персонал']);
    const trigger = page.locator('#department-filter');
    await expect(trigger).toHaveRole('combobox');
    await expect(trigger).toHaveAccessibleName('Фильтр по отделу');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    const menu = page.getByRole('listbox', { name: 'Фильтр по отделу' });
    await expect(trigger).toHaveText('Все отделы');
    await trigger.click();
    await expect(menu).toBeVisible();
    const triggerBounds = await trigger.boundingBox();
    const menuBounds = await menu.boundingBox();
    expect(
      Math.abs(menuBounds!.width - triggerBounds!.width),
    ).toBeLessThanOrEqual(1);
    expect(Math.abs(menuBounds!.x - triggerBounds!.x)).toBeLessThanOrEqual(1);
    expect(menuBounds!.x).toBeGreaterThanOrEqual(0);
    expect(menuBounds!.x + menuBounds!.width).toBeLessThanOrEqual(width);
    expect(
      await menu.evaluate(function portal(element) {
        return element.closest('.directory__panel') === null;
      }),
    ).toBe(true);
    await expect(
      page.getByRole('option', { name: 'Все отделы', exact: true }),
    ).toHaveAttribute('data-state', 'checked');
    await expect(
      page
        .getByRole('option', { name: 'Все отделы', exact: true })
        .locator('.select__indicator'),
    ).toBeVisible();
    const design = page.getByRole('option', { name: 'Дизайн', exact: true });
    await design.hover();
    await expect(design).toHaveAttribute('data-highlighted', '');
    // Radix makes the background aria-hidden and traps focus while open.
    // Audit the active popup as a component, and the whole page while closed.
    expect(
      (await new AxeBuilder({ page }).include('.select__content').analyze())
        .violations,
    ).toEqual([]);
    await page.keyboard.press('Tab');
    await expect(design).toBeFocused();
    await design.click();
    await expect(menu).not.toBeVisible();
    await expect(trigger).toHaveText('Дизайн');
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(menu).toBeVisible();
    await expect(design).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(
      page.getByRole('option', { name: 'Инженерия', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveText('Инженерия');
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Space');
    await expect(menu).toBeVisible();
    await expect(
      page.getByRole('option', { name: 'Инженерия', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(design).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveText('Инженерия');
    await page.keyboard.press('Space');
    await expect(menu).toBeVisible();
    await expect(
      page.getByRole('option', { name: 'Инженерия', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Home');
    await expect(
      page.getByRole('option', { name: 'Все отделы', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveText('Все отделы');
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(menu).toBeVisible();
    await page.screenshot({
      path: `test-results/select-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    await page.keyboard.press('Escape');
  });
}

test('Select: длинные отделы, прокрутка, край экрана и reduced-motion', async function selectOverflow({
  page,
}) {
  await page.setViewportSize({ width: 375, height: 500 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const departments = Array.from({ length: 40 }, function department(_, index) {
    return `Отдел ${String(index).padStart(2, '0')} — исследование и разработка корпоративных продуктов`;
  });
  await openDirectory(page, departments);
  const trigger = page.getByRole('combobox', { name: 'Фильтр по отделу' });
  await trigger.click();
  const menu = page.getByRole('listbox', { name: 'Фильтр по отделу' });
  await expect(menu).toBeVisible();
  const bounds = await menu.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(500);
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(375);
  expect(bounds!.height).toBeLessThanOrEqual(320);
  const viewport = page.locator('.select__viewport');
  expect(
    await viewport.evaluate(function scroll(element) {
      return element.scrollHeight > element.clientHeight;
    }),
  ).toBe(true);
  expect(
    await menu.evaluate(function motion(element) {
      return getComputedStyle(element).animationName;
    }),
  ).toBe('none');
  expect(
    (await new AxeBuilder({ page }).include('.select__content').analyze())
      .violations,
  ).toEqual([]);
  await page.keyboard.press('End');
  await expect(
    page.getByRole('option', { name: departments[39], exact: true }),
  ).toBeFocused();
  expect(
    await viewport.evaluate(function scroll(element) {
      return element.scrollTop;
    }),
  ).toBeGreaterThan(0);
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveText(departments[39]);
  const dimensions = await page.evaluate(function width() {
    return {
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    };
  });
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
  await trigger.click();
  await expect(menu).toBeVisible();
  await expect(
    page.getByRole('option', { name: departments[39], exact: true }),
  ).toBeFocused();
  await page.screenshot({
    path: 'test-results/select-overflow-375.png',
    fullPage: false,
    animations: 'disabled',
  });
});

test('Select: выбор отдела касанием на мобильном экране', async function touchSelect({
  browser,
}) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  });
  try {
    const page = await context.newPage();
    await openDirectory(page, ['Дизайн', 'Инженерия']);
    const trigger = page.locator('#department-filter');
    await trigger.tap();
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.getByRole('option', { name: 'Инженерия', exact: true }).tap();
    await expect(page.getByRole('listbox')).not.toBeVisible();
    await expect(trigger).toHaveText('Инженерия');
  } finally {
    await context.close();
  }
});

test('Select: обычный scrollbar не сдвигает страницу при открытии и закрытии', async function stableScrollbar({
  playwright,
  baseURL,
}) {
  const browser = await playwright.chromium.launch({
    ignoreDefaultArgs: ['--hide-scrollbars'],
    args: ['--disable-features=OverlayScrollbar'],
  });
  try {
    for (const width of [375, 768, 1440]) {
      for (const count of [0, 10]) {
        const page = await browser.newPage({
          baseURL,
          viewport: { width, height: count ? 700 : 1000 },
        });
        await page.route('**/api/auth/me', async function session(route) {
          await route.fulfill({
            json: { user: { id: 999, email: 'geometry@example.com' } },
          });
        });
        await page.route(
          '**/api/employees?**',
          async function employees(route) {
            await route.fulfill({
              json: {
                employees: Array.from(
                  { length: count },
                  function employee(_, id) {
                    return {
                      id,
                      fullName: `Сотрудник ${id}`,
                      position: 'Разработчик',
                      department: 'Разработка',
                    };
                  },
                ),
                total: count,
                overall: count,
                page: 1,
                pages: 1,
                departments: ['Дизайн', 'Разработка'],
              },
            });
          },
        );
        await page.goto('/employees');
        await expect(page.locator('.employees')).toHaveAttribute(
          'aria-busy',
          'false',
        );
        if (count)
          await page.evaluate(function scroll() {
            window.scrollTo(0, 100);
          });
        async function geometry() {
          return page.evaluate(function measure() {
            return {
              scrollY: window.scrollY,
              positions: [
                '.topbar__inner',
                '.directory',
                '.filters__search',
                '#department-filter',
              ].map(function bounds(selector) {
                const rect = document
                  .querySelector(selector)!
                  .getBoundingClientRect();
                return {
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height,
                };
              }),
            };
          });
        }
        const before = await geometry();
        const trigger = page.locator('#department-filter');
        await trigger.click();
        await expect(page.locator('.select__content')).toBeVisible();
        expect(await geometry()).toEqual(before);
        const menu = await page.locator('.select__content').boundingBox();
        const field = await trigger.boundingBox();
        expect(Math.abs(menu!.x - field!.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(menu!.width - field!.width)).toBeLessThanOrEqual(1);
        await page.keyboard.press('Escape');
        await expect(trigger).toBeFocused();
        expect(await geometry()).toEqual(before);
        await page.keyboard.press('Enter');
        await expect(page.locator('.select__content')).toBeVisible();
        expect(await geometry()).toEqual(before);
        await page.getByRole('option', { name: 'Дизайн', exact: true }).click();
        await expect(trigger).toHaveText('Дизайн');
        await expect(trigger).toBeFocused();
        expect(await geometry()).toEqual(before);
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
});
