import { expect, type Route } from '@playwright/test';
import { test } from './fixtures';
import { openList } from './ui-helpers';

test.describe('localização autorizada', () => {
  test.use({ gpsPosition: { lat: -23.5501, lng: -46.6329 } });

  test('mostra carregamento inicial até os trajetos estarem prontos', async ({ page }) => {
    let pending: Route | undefined;
    await page.route('**/api/comparar', route => { pending = route; });
    await page.goto('/');
    await expect(page.locator('#initial-route-loading')).toBeVisible();
    await expect(page.locator('#initial-route-loading')).toContainText('Preparando os trajetos');
    await expect.poll(() => !!pending).toBe(true);
    await pending!.continue();
    await expect(page.locator('#initial-route-loading')).toBeHidden();
    await openList(page);
    await expect(page.locator('#route-api-status')).toContainText('30 de 30 unidades');
  });

  test('remove o carregamento inicial se a API falhar', async ({ page }) => {
    let pending: Route | undefined;
    await page.route('**/api/comparar', route => { pending = route; });
    await page.goto('/');
    await expect(page.locator('#initial-route-loading')).toBeVisible();
    await expect.poll(() => !!pending).toBe(true);
    await pending!.fulfill({ status: 503, contentType: 'application/json', body: '{"erro":"Serviço indisponível"}' });
    await expect(page.locator('#initial-route-loading')).toBeHidden();
    await openList(page);
    await expect(page.locator('#route-api-status')).toContainText('Serviço indisponível');
    await expect(page.getByRole('button', { name: 'Recalcular trajetos' })).toBeVisible();
  });

  test('catálogo usa GPS e calcula rotas para todas as unidades', async ({ page, isMobile }) => {
    const response = page.waitForResponse(r => r.url().endsWith('/api/comparar') && r.request().method() === 'POST');
    await page.goto('/');
    const api = await response;
    const body = await api.json();
    expect(api.request().postDataJSON().origem).toEqual({ lat: -23.5501, lng: -46.6329 });
    expect(body.resultados).toHaveLength(30);
    expect(body.resultados.every((u: { deslocamento: number | null }) => u.deslocamento !== null)).toBe(true);
    await openList(page);
    await expect(page.locator('#route-api-status')).toContainText('30 de 30 unidades');
    await expect(page.locator('#unit-list [data-card]')).toHaveCount(30);
    const available = page.locator('[data-card="upa-lapa"]');
    await expect(available.locator('.total-time')).toContainText('Total');
    await expect(page.locator('[data-card="ubs-jardim-edite"] .total-time')).toContainText('Total indisponível');
    await available.getByRole('button', { name: 'Ver trajeto para UPA Lapa (Prof. João Catarin Mezomo)' }).click();
    await expect(page.locator('#city-map .simulation-route')).toHaveCount(1);
    await expect(page.locator('#city-map .user-location-marker')).toHaveCount(1);
    const marker = await page.locator('#city-map [data-unit="upa-lapa"]').boundingBox();
    const user = await page.locator('#city-map .user-location-marker').boundingBox();
    const viewport = page.viewportSize()!;
    expect(marker!.x).toBeGreaterThan(isMobile ? 10 : 404);
    expect(user!.x).toBeGreaterThan(10);
    expect(user!.x + user!.width).toBeLessThan(viewport.width - 10);
    expect(page.url()).not.toContain('23.5501');
    expect(page.url()).not.toContain('46.6329');
  });

  test('corrige origem no mapa e recalcula os trajetos', async ({ page }) => {
    await page.goto('/');
    await openList(page);
    await expect(page.locator('#route-api-status')).toContainText('30 de 30 unidades');
    await page.getByRole('button', { name: 'Corrigir localização no mapa' }).click();
    await expect(page.locator('#origin-hint')).toContainText('Clique no ponto correto');
    const response = page.waitForResponse(r => r.url().endsWith('/api/comparar') && r.request().method() === 'POST');
    const map = page.locator('#city-map');
    const box = (await map.boundingBox())!;
    await map.click({ position: { x: box.width - 100, y: box.height / 2 }, force: true });
    const body = (await response).request().postDataJSON();
    expect(body.origem).not.toEqual({ lat: -23.5501, lng: -46.6329 });
    await expect(page.locator('#origin-hint')).toContainText('Origem escolhida no mapa');
    await expect(page.locator('#city-map .user-location-marker')).toHaveAttribute('aria-label', 'Origem escolhida no mapa');
    await openList(page);
    await expect(page.locator('#sort-label')).toHaveText('Mais próximas da origem escolhida');
    await expect(page.locator('#route-api-status')).toContainText('30 de 30 unidades');
  });

  test('ignora leitura pior e recalcula ao receber posição mais precisa', async ({ page }) => {
    await page.goto('/');
    await openList(page);
    await expect(page.locator('#route-api-status')).toContainText('30 de 30 unidades');
    await expect(page.locator('#city-map .location-accuracy')).toHaveCount(1);
    await page.evaluate(() => {
      const send = (window as typeof window & { __e2eWatchSuccess: PositionCallback }).__e2eWatchSuccess;
      send({ coords: { latitude: -23.54, longitude: -46.6329, accuracy: 2000 }, timestamp: Date.now() + 100 } as GeolocationPosition);
    });
    await expect(page.locator('#route-api-status')).toContainText('~15 m');
    const response = page.waitForResponse(r => r.url().endsWith('/api/comparar') && r.request().method() === 'POST');
    await page.evaluate(() => {
      const send = (window as typeof window & { __e2eWatchSuccess: PositionCallback }).__e2eWatchSuccess;
      send({ coords: { latitude: -23.5503, longitude: -46.6329, accuracy: 5 }, timestamp: Date.now() + 200 } as GeolocationPosition);
    });
    expect((await response).request().postDataJSON().origem).toEqual({ lat: -23.5503, lng: -46.6329 });
    await expect(page.locator('#route-api-status')).toContainText('~5 m');
  });

  test.describe('comparação', () => {
    test.use({ gpsCalls: 1 });
    test('posição atrasada não substitui uma origem manual escolhida depois', async ({ page }) => {
      await page.goto('/simulador.html');
      await expect(page.locator('#sim-results [data-result]')).toHaveCount(30);
      await page.evaluate(() => {
        const original = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
        Object.defineProperty(navigator.geolocation, 'getCurrentPosition', {
          configurable: true,
          value: (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => original(position => {
            setTimeout(() => {
              success(position);
              (window as typeof window & { __gpsDelivered: boolean }).__gpsDelivered = true;
            }, 500);
          }, error, options),
        });
      });
      await page.getByRole('button', { name: 'Usar minha localização', exact: true }).click();
      await page.getByLabel('De onde você sai?').selectOption('9025376418');
      await expect.poll(() => page.evaluate(() => (window as typeof window & { __gpsDelivered: boolean }).__gpsDelivered)).toBe(true);
      await expect(page.locator('#sim-location-status')).toHaveText('Origem escolhida na lista.');
      await expect(page.locator('#sim-origin')).toHaveValue('9025376418');
      await expect(page.locator('#sim-results [data-result]')).toHaveCount(30);
    });

    test('botão de localização calcula os mesmos 30 destinos e mostra o percurso', async ({ page }) => {
      await page.goto('/simulador.html');
      await expect(page.locator('#sim-results [data-result]')).toHaveCount(30);
      const response = page.waitForResponse(r => r.url().endsWith('/api/comparar') && typeof r.request().postDataJSON()?.origem === 'object');
      await page.getByRole('button', { name: 'Usar minha localização', exact: true }).click();
      const api = await response;
      expect(api.request().postDataJSON().origem).toEqual({ lat: -23.5501, lng: -46.6329 });
      await expect(page.locator('#sim-location-status')).toContainText('Origem: sua localização');
      await expect(page.locator('#sim-results [data-result]')).toHaveCount(30);
      await expect(page.locator('#sim-map .simulation-route')).toHaveCount(1);
      await expect(page.locator('#sim-map .user-location-marker')).toHaveCount(1);
      await page.getByLabel('De onde você sai?').selectOption('9025376418');
      await expect(page.locator('#sim-location-status')).toHaveText('Origem escolhida na lista.');
      await expect(page.locator('#sim-map .user-location-marker')).toHaveCount(0);
    });
  });
});

test.describe('falha de localização', () => {
  test.use({ gpsCalls: 1 });
  test('permissão negada mantém a origem manual e explica como continuar', async ({ page }) => {
    await page.goto('/simulador.html');
    await expect(page.locator('#sim-results [data-result]')).toHaveCount(30);
    await page.getByRole('button', { name: 'Usar minha localização', exact: true }).click();
    await expect(page.locator('#sim-location-status')).toContainText('Permissão de localização negada');
    await expect(page.locator('#sim-origin')).toHaveValue('3713156708');
    await expect(page.locator('#sim-results [data-result]')).toHaveCount(30);
  });

  test.describe('fora da área', () => {
    test.use({ gpsPosition: { lat: 0, lng: 0 } });
    test('localização fora da cobertura remove a comparação e não usa a Sé como fallback', async ({ page }) => {
      await page.goto('/simulador.html');
      await expect(page.locator('#sim-results [data-result]')).toHaveCount(30);
      await page.getByRole('button', { name: 'Usar minha localização', exact: true }).click();
      await expect(page.locator('#sim-error')).toContainText('fora da cobertura');
      await expect(page.locator('#sim-results [data-result]')).toHaveCount(0);
      await expect(page.locator('#sim-map .simulation-route')).toHaveCount(0);
    });
  });
});
