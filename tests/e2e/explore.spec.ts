import { expect, type Locator, type Page } from '@playwright/test';
import { test } from './fixtures';
import { closeList, openAbout, openList, selectScenario } from './ui-helpers';

const names = [
  'Conjunto Hospitalar do Mandaqui',
  'Hospital das Clínicas da FMUSP',
  'Hospital Geral de Vila Nova Cachoeirinha',
  'Hospital Geral do Grajaú',
  'Hospital Municipal Dr. Arthur Ribeiro de Saboya (Jabaquara)',
  'Hospital Municipal Dr. Cármino Caricchio (Tatuapé)',
  'Hospital Municipal Dr. Fernando Mauro Pires da Rocha (Campo Limpo)',
  'Hospital Municipal Prof. Mário Degni (Jardim Sarah)',
  'Hospital Municipal Tide Setúbal',
  'Hospital São Paulo (UNIFESP)',
  'UBS Butantã (Vila Gomes)',
  'UBS Casa Verde',
  'UBS Indianópolis (Sigmund Freud)',
  'UBS Jardim Edite (Gerôncio Henrique Neto)',
  'UBS Jardim Sapopemba',
  'UBS Mooca I',
  'UBS São Vicente de Paula (AMA/UBS Integrada)',
  'UBS Sé',
  'UBS Vila Guilherme (AMA/UBS Integrada)',
  'UBS Vila Prudente',
  'UPA Carrão (Masataka Ota)',
  'UPA City Jaraguá',
  'UPA Itaquera (26 de Agosto)',
  'UPA Jaçanã',
  'UPA Júlio Tupy',
  'UPA Lapa (Prof. João Catarin Mezomo)',
  'UPA Pirituba',
  'UPA Santo Amaro',
  'UPA Vera Cruz',
  'UPA Vergueiro',
];
const clinicalWarning = 'A prioridade clínica e a unidade adequada dependem da avaliação da equipe de saúde.';
const map = (page: Page) => page.getByRole('group', { name: 'Unidades de saúde no mapa de São Paulo' });
const search = (page: Page) => page.getByRole('searchbox', { name: 'Buscar unidade por nome ou bairro' });
const scenario = (page: Page) => page.getByLabel('Simular estado de carregamento');
const card = (page: Page, name: string) => page.getByRole('article', { name, exact: true });
const details = (page: Page, name: string) => page.getByRole('button', { name: `Ver detalhes de ${name}`, exact: true });
const marker = (page: Page, name: string) => map(page).getByRole('button', {
  name: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
});

async function expectResults(page: Page, expected: string[]) {
  await openList(page);
  await expect(page.locator('#result-count')).toHaveText(`${expected.length} ${expected.length === 1 ? 'unidade encontrada' : 'unidades encontradas'}`);
  const headings = page.locator('#unit-list h3');
  if (expected.length === 0) {
    await expect(headings).toHaveText(['Nenhuma unidade encontrada']);
  } else {
    await expect(headings).toHaveCount(expected.length);
    const rendered = (await headings.allTextContents()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    expect(rendered).toEqual([...expected].sort((a, b) => a.localeCompare(b, 'pt-BR')));
  }
  await expect(map(page).locator('.map-marker')).toHaveCount(expected.length);
  for (const name of expected) await expect(marker(page, name)).toHaveCount(1);
}

async function expectSafety(root: Page | Locator, inDialog = false) {
  await expect(root.locator('.clinical-note').filter({ visible: true }).first()).toContainText(clinicalWarning);
  const call = root.getByRole('link', { name: /SAMU 192/ }).first();
  await expect(call).toBeVisible();
  await expect(call).toHaveAttribute('href', 'tel:192');
  await call.focus();
  await expect(call).toBeFocused();
  if (inDialog) await expect(root.getByText('Ligue para o SAMU 192 ou procure o pronto-socorro mais próximo.', { exact: true })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#result-count')).toHaveText('30 unidades encontradas');
  await expect(map(page).locator('.map-marker')).toHaveCount(30);
  await openList(page);
});

test('cenário inicial exibe unidades reais com filas simuladas para demonstração e sem erros de execução', async ({ page }) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (!request.url().startsWith('http://127.0.0.1:5173/')
      && !request.url().startsWith('https://tiles.openfreemap.org/')) external.push(request.url());
  });
  await page.reload();
  await expectResults(page, names);
  await expectSafety(page);
  const notice = page.locator('.clinical-note').first();
  await expect(notice).toContainText(clinicalWarning);
  await expect(notice).toBeVisible();
  await expect(page.locator('#map-title')).toHaveText('São Paulo');
  await openAbout(page);
  await expect(page.locator('#about')).toContainText('Consulte UBS, UPAs e hospitais da rede SUS em São Paulo');
  await expect(card(page, names[5])).toContainText('Av. Celso Garcia, 4815');
  await expect(card(page, names[5])).toContainText('Fila alta');
  await expect(card(page, names[5])).toContainText('Espera estimada: 70 min');
  await expect(notice).toContainText(clinicalWarning);

  await selectScenario(page, 'error');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(notice).toContainText(clinicalWarning);
  await expectSafety(page);
  await page.clock.install();
  await selectScenario(page, 'slow');
  await expect(page.locator('#unit-list')).toHaveAttribute('aria-busy', 'true');
  await expect(notice).toContainText(clinicalWarning);
  await expectSafety(page);
  await page.clock.fastForward(3000);
  await expect(page.locator('#result-count')).toHaveText('30 unidades encontradas');
  await details(page, names[17]).click();
  await expect(card(page, names[17]).locator('.inline-unit-info')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(notice).toBeVisible();
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('busca normaliza texto e combina tipos sem deixar marcadores residuais', async ({ page }) => {
  for (const query of ['  TATUAPE  ', 'tatuapé', 'tatuape\u0301'.replace('e\u0301', 'é').normalize('NFD')]) {
    await search(page).fill(query);
    await expectResults(page, [names[5]]);
  }
  await page.getByRole('button', { name: 'UPA', exact: true }).click();
  await expectResults(page, []);
  await expectSafety(page);
  await page.getByRole('button', { name: 'Todas', exact: true }).click();
  await expectResults(page, [names[5]]);
  await search(page).fill('');
  for (const [type, expected] of [
    ['Hospitais', names.slice(0, 10)], ['UBS', names.slice(10, 20)], ['UPA', names.slice(20)],
  ] as const) {
    const filter = page.getByRole('button', { name: type, exact: true });
    await filter.click();
    await expect(filter).toHaveAttribute('aria-pressed', 'true');
    await expectResults(page, [...expected]);
  }
  await search(page).fill('inexistente');
  await expectResults(page, []);
  await expect(page.locator('#map-state')).toContainText('Nenhuma unidade para estes filtros.');
  await page.getByRole('button', { name: 'Limpar busca e filtros', exact: true }).click();
  await expect(search(page)).toBeFocused();
  await expect(search(page)).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Todas', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expectResults(page, names);
});

test('seleção pela lista e pelo mapa mostra detalhes no cartão', async ({ page }) => {
  for (const name of [names[0], names[17], names[29]]) {
    await openList(page);
    const item = card(page, name);
    await details(page, name).click();
    await expect(item.locator('.inline-unit-info')).toBeVisible();
    await expect(details(page, name)).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await details(page, name).click();
    await expect(item.locator('.inline-unit-info')).toBeHidden();
    await closeList(page);
    await marker(page, name).click();
    await openList(page);
    await expect(item.locator('.inline-unit-info')).toBeVisible();
    await expect(marker(page, name)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await search(page).fill('tatuape');
  await expectResults(page, [names[5]]);
  await expect(map(page).getByRole('button', { pressed: true })).toHaveCount(0);
});

test('filas simuladas e ausência de dados exibem status explícito sem converter lacunas em zero', async ({ page }) => {
  await expect(card(page, names[0]).locator('.queue-badge')).toHaveText('Fila média');
  await expect(card(page, names[0]).locator('.wait')).toHaveText('Espera estimada: 32 min');

  const states = [
    {
      name: names[13],
      badge: 'Fila desconhecida — dados indisponíveis',
      wait: 'Dados indisponíveis; tempo de espera indisponível',
      aria: /Fila desconhecida — dados indisponíveis/
    },
    {
      name: names[9],
      badge: 'Fila desconhecida — dados desatualizados',
      wait: 'Dados desatualizados; tempo de espera indisponível',
      aria: /Fila desconhecida — dados desatualizados/
    }
  ];

  for (const state of states) {
    const item = card(page, state.name);
    await expect(item.locator('.wait')).toHaveText(state.wait);
    await expect(item.locator('.queue-badge')).toHaveText(state.badge);
    await expect(marker(page, state.name)).toHaveAttribute('aria-label', state.aria);
    await details(page, state.name).click();
    await expect(item.locator('.inline-unit-info')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
});

test('detalhes podem ser abertos e fechados pelo teclado', async ({ page }) => {
  const trigger = details(page, names[17]);
  await page.keyboard.press('Tab');
  await trigger.focus();
  await trigger.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(card(page, names[17]).locator('.inline-unit-info')).toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('falha simulada preserva segurança e repetir recupera sem perder filtros', async ({ page }) => {
  await search(page).fill('se');
  await page.getByRole('button', { name: 'UBS', exact: true }).click();
  await selectScenario(page, 'error');
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar os dados.');
  await expect(map(page).getByRole('button')).toHaveCount(0);
  await expect(page.getByRole('article')).toHaveCount(0);
  await expect(page.locator('#unit-list')).toHaveAttribute('aria-busy', 'false');
  await expectSafety(page);
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expectResults(page, [names[17]]);
  await expect(search(page)).toBeFocused();
  await expect(scenario(page)).toHaveValue('normal');
  await expect(page.getByRole('button', { name: 'UBS', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await details(page, names[17]).click();
  await expect(card(page, names[17]).locator('.inline-unit-info')).toBeVisible();
});

test('carga lenta é observável e leitura antiga não sobrescreve falha ou recuperação', async ({ page }) => {
  await page.clock.install();
  await selectScenario(page, 'slow');
  await expect(page.locator('#unit-list')).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('#result-count')).toHaveText('Carregando unidades…');
  await expect(map(page).getByRole('button')).toHaveCount(0);
  await expectSafety(page);
  await page.clock.fastForward(3000);
  await expectResults(page, names);
  await selectScenario(page, 'slow');
  await selectScenario(page, 'error');
  await expect(page.getByRole('alert')).toBeVisible();
  await page.clock.fastForward(3000);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(map(page).getByRole('button')).toHaveCount(0);
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expectResults(page, names);
  await selectScenario(page, 'slow');
  await selectScenario(page, 'normal');
  await expectResults(page, names);
  await page.clock.fastForward(3000);
  await expectResults(page, names);
});

test('texto de busca é tratado como texto e não injeta elementos executáveis', async ({ page }) => {
  await search(page).fill('<img src=x onerror="document.documentElement.dataset.injected=1">');
  await expectResults(page, []);
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveAttribute('data-injected', '1');
  await expectSafety(page);
  await page.getByRole('button', { name: 'Limpar busca e filtros' }).click();
  await expectResults(page, names);
});

test('layout preserva leitura, toque e movimento reduzido', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  if (isMobile) {
    await page.evaluate(() => window.scrollTo(0, 0));
    const position = await page.locator('.map-canvas').boundingBox();
    expect(position!.y).toBeLessThanOrEqual(500);
  }
  const controls = page.locator('.filters button, .map-marker, .details-button, #scenario');
  for (const control of await controls.all()) {
    const box = await control.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  for (const width of isMobile ? [390, 320] : [1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(search(page)).toBeVisible();
    await details(page, names[17]).click();
    const info = card(page, names[17]).locator('.inline-unit-info');
    await expect(info).toBeVisible();
    expect(await info.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await details(page, names[17]).click();
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
