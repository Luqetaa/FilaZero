import { Buffer } from 'node:buffer';
import { test as base, expect, type Request, type Route } from '@playwright/test';

// Buffer vazio usado para simular tiles vetoriais (.pbf) e fontes sem acesso externo.
const emptyPbf = Buffer.alloc(0);
const tileJson = JSON.stringify({
  tilejson: '3.0.0',
  tiles: ['https://tiles.openfreemap.org/planet/mock/{z}/{x}/{y}.pbf'],
  minzoom: 0,
  maxzoom: 14,
});

type TileMock = {
  mode: 'success' | 'abort' | 'partial' | 'timeout';
  requests: Request[];
  pending: Route[];
};

export const test = base.extend<{ tiles: TileMock }>({
  tiles: async ({}, use) => {
    const tiles: TileMock = { mode: 'success', requests: [], pending: [] };
    await use(tiles);
    await Promise.allSettled(tiles.pending.map(route => route.abort()));
  },
  context: async ({ context, tiles, baseURL }, use) => {
    const unexpected: string[] = [];
    const localOrigin = new URL(baseURL!).origin;
    // A fixture roda antes de criar qualquer página; a rota persiste nos reloads.
    await context.route('**/*', async route => {
      const request = route.request();
      const origin = new URL(request.url()).origin;
      if (origin === 'https://tiles.openfreemap.org') {
        tiles.requests.push(request);
        if (tiles.mode === 'timeout') {
          tiles.pending.push(route);
          return;
        }
        if (tiles.mode === 'abort' || (tiles.mode === 'partial' && tiles.requests.length % 2 === 0)) {
          await route.abort('failed');
          return;
        }
        const pathname = new URL(request.url()).pathname;
        if (pathname === '/planet') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: tileJson,
            headers: { 'cache-control': 'public, max-age=604800', 'access-control-allow-origin': '*' },
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/x-protobuf',
          body: emptyPbf,
          headers: { 'cache-control': 'public, max-age=604800', 'access-control-allow-origin': '*' },
        });
        return;
      }
      if (origin === localOrigin) {
        await route.continue();
        return;
      }
      unexpected.push(request.url());
      await route.abort('blockedbyclient');
    });
    await context.addInitScript(() => {
      const state = window as typeof window & { __e2eGeolocationCalls: number };
      state.__e2eGeolocationCalls = 0;
      const deny = (_success: PositionCallback, error?: PositionErrorCallback) => {
        state.__e2eGeolocationCalls++;
        error?.({ code: 1, message: 'Geolocalização bloqueada no teste', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
        return 0;
      };
      Object.defineProperty(navigator.geolocation, 'getCurrentPosition', { value: deny });
      Object.defineProperty(navigator.geolocation, 'watchPosition', { value: deny });
    });
    await use(context);
    expect(unexpected, 'Nenhuma API, CDN ou provedor externo além dos tiles simulados').toEqual([]);
    for (const page of context.pages()) {
      const calls = await page.evaluate(() => (window as typeof window & { __e2eGeolocationCalls: number }).__e2eGeolocationCalls);
      expect(calls, 'Nenhuma tentativa de geolocalização').toBe(0);
    }
  },
});
