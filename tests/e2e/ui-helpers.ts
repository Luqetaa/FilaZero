import { expect, type Page } from '@playwright/test';

export async function openList(page: Page) {
  const content = page.locator('#sheet-content');
  if (await content.evaluate(element => (element as HTMLElement).hidden || (element as HTMLElement).inert)) {
    await page.getByRole('button', { name: 'Expandir lista', exact: true }).click();
  }
  await expect(content).toBeVisible();
  await expect(content).not.toHaveAttribute('inert');
}

export async function closeList(page: Page) {
  if (!await page.evaluate(() => matchMedia('(max-width: 900px)').matches)) return;
  const toggle = page.locator('#toggle-list');
  if (await toggle.getAttribute('aria-expanded') === 'true') await toggle.click();
  await expect(page.locator('#sheet-content')).toBeHidden();
  await expect(page.locator('#sheet-content')).toHaveAttribute('inert', '');
}

export async function openAbout(page: Page) {
  await openList(page);
  const about = page.locator('details#about');
  if (await about.getAttribute('open') === null) await about.locator('summary').click();
  await expect(about).toHaveAttribute('open', '');
}

export async function selectScenario(page: Page, mode: 'normal' | 'error' | 'slow') {
  await openAbout(page);
  await page.getByLabel('Simular estado de carregamento').selectOption(mode);
}
