import { expect, type Page } from '@playwright/test';
import { test } from './fixtures';

const result = (page: Page, id: string) => page.locator(`[data-result="${id}"]`);
const route = (page: Page) => page.locator('#sim-map .simulation-route');
const comparisonResponse = (page: Page) => page.waitForResponse(response => response.url().endsWith('/api/comparar') && response.request().method() === 'POST');

test.beforeEach(async ({ page }) => {
  await page.goto('/simulador.html');
  await expect(page.locator('#sim-results [data-result]')).toHaveCount(30);
});

test('desenha ruas reais e compara espera com o percurso calculado no Python', async ({ page }) => {
  await expect(page.locator('#sim-results h3')).toHaveCount(30);
  await result(page, 'upa-lapa').getByRole('button').click();
  await expect(page.locator('.sim-kicker')).toHaveText('Ruas reais · esperas simuladas');
  await expect(result(page, 'upa-lapa')).toContainText('Av. Queiroz Filho, 313');
  await expect(result(page, 'upa-lapa')).toContainText('13–13 min');
  await expect(route(page)).toHaveCount(1);
  await expect(page.locator('#sim-route-path')).toContainText('Rua Irmã Simpliciana');
  // O percurso possui curvas e muitos nós OSM, em vez de segmentos entre POIs.
  const d = await route(page).getAttribute('d');
  expect(d!.match(/[ML]/g)!.length).toBeGreaterThan(20);
  await result(page, 'upa-vergueiro').getByRole('button').click();
  await expect(page.locator('#sim-route-title')).toHaveText('UPA Vergueiro');
  await expect(page.locator('#sim-route-path')).toContainText('Rua Vergueiro');
  await expect(page.locator('#sim-map .map-marker')).toHaveCount(30);
});

test('bloquear um trecho OSM recalcula a geometria; restaurar recupera a rota', async ({ page }) => {
  const normal = await page.request.post('/api/comparar', { data: {} }).then(r => r.json());
  await page.getByText('Ajustar cenário', { exact: false }).click();
  const response = comparisonResponse(page);
  await page.locator('[data-road]').first().check();
  const alterado = await (await response).json();
  await expect(page.locator('#sim-status')).toContainText('1 ruas bloqueadas');
  await expect(page.locator('.simulation-road.is-blocked')).toHaveCount(1);
  expect(alterado.bloqueadas).toHaveLength(1);
  expect(alterado.resultados.map((r: { geometria: unknown }) => r.geometria)).not.toEqual(normal.resultados.map((r: { geometria: unknown }) => r.geometria));
  await page.getByRole('button', { name: 'Restaurar cenário inicial' }).click();
  await expect(page.locator('#sim-status')).toContainText('0 ruas bloqueadas');
  await expect(page.locator('.simulation-road.is-blocked')).toHaveCount(0);
  await expect(route(page)).toHaveCount(1);
});

test('origem no acesso da unidade tem deslocamento zero', async ({ page }) => {
  const cenario = await page.request.get('/api/cenario').then(r => r.json());
  const acesso = cenario.unidades.find((u: { id: string }) => u.id === 'upa-vergueiro').vertice;
  await page.getByLabel('De onde você sai?').selectOption(acesso);
  await expect(result(page, 'upa-vergueiro').locator('dd').first()).toHaveText('0 min');
  await result(page, 'upa-vergueiro').getByRole('button').click();
  await expect(page.locator('#sim-route-path')).toHaveText('A origem já está no acesso viário desta unidade.');
  await expect(route(page)).toHaveCount(0);
});

test('espera fictícia altera ordenação; ausência não vira zero', async ({ page }) => {
  await page.getByText('Ajustar cenário', { exact: false }).click();
  await page.getByLabel('Unidade', { exact: true }).selectOption('upa-lapa');
  await page.getByLabel('Mínimo (min)').fill('200');
  await page.getByLabel('Máximo (min)').fill('220');
  await page.getByRole('button', { name: 'Aplicar espera' }).click();
  await expect(result(page, 'upa-lapa')).toContainText('200–220 min');
  await page.getByLabel('Sem estimativa disponível').check();
  await page.getByRole('button', { name: 'Aplicar espera' }).click();
  await expect(result(page, 'upa-lapa')).toContainText('Espera indisponível');
  await expect(result(page, 'upa-lapa')).toContainText('Totalindisponível');
  await page.reload();
  await expect(result(page, 'upa-lapa')).toContainText('13–13 min');
});

test('falha da API limpa a rota e repetir recupera os resultados', async ({ page }) => {
  await page.route('**/api/comparar', route => route.fulfill({ status: 503, body: '{}' }));
  await page.getByLabel('De onde você sai?').selectOption('9025376418');
  await expect(page.locator('#sim-error')).toBeVisible();
  await expect(result(page, 'upa-lapa')).toHaveCount(0);
  await expect(route(page)).toHaveCount(0);
  await page.unroute('**/api/comparar');
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.locator('#sim-error')).toBeHidden();
  await expect(result(page, 'upa-lapa')).toBeAttached();
  await expect(route(page)).toHaveCount(1);
});

test('falha dos tiles preserva a geometria real e o itinerário', async ({ page, tiles }) => {
  tiles.mode = 'abort';
  await page.reload();
  await expect(page.locator('#sim-map-status')).toContainText('indisponível');
  await expect(page.locator('#sim-results [data-result]')).toHaveCount(30);
  await expect(route(page)).toHaveCount(1);
  await expect(page.locator('#sim-route-path')).toContainText('Rua Irmã Simpliciana');
});

test('navegação do site funciona e a tela cabe no desktop e no celular', async ({ page, isMobile }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Simular trajetos' }).click();
  await expect(page).toHaveURL(/simulador.html/);
  await expect(page.locator('#sim-results [data-result]')).toHaveCount(30);
  for (const width of isMobile ? [390, 320] : [1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.getByLabel('De onde você sai?').focus();
  await expect(page.getByLabel('De onde você sai?')).toBeFocused();
});
