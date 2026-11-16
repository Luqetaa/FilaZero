import './styles.css';
import {
  listUnits,
  filterUnits,
  distanceKm,
  formatDistance,
  sortByNearest,
  formatTotalDurationRange,
  formatWait,
  formatUpdatedAt,
  queueLabel,
  mapReference,
} from './data/units.ts';
import type { Coordinates } from './data/units.ts';
import type { HealthUnit, QueueLevel, UnitType } from './types.ts';
import type { CityMap, MapPoint, MapStatus } from './ui/map.ts';
import { fetchRouteJson, type Comparison, type RouteResult } from './data/routes.ts';

const officialSource = 'https://www.gov.br/saude/pt-br/composicao/saes/samu-192/samu-192';
const clinicalWarning = 'A prioridade clínica e a unidade adequada dependem da avaliação da equipe de saúde.';
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

const ringCircumference = 2 * Math.PI * 13;

function waitMinutes(unit: HealthUnit): number | null {
  if (unit.data.status !== 'available' || !unit.data.estimatedWait) return null;
  return (unit.data.estimatedWait.min + unit.data.estimatedWait.max) / 2;
}

function statusRing(level: QueueLevel, size: 'sm' | 'md' = 'md', minutes: number | null = null) {
  if (level === 'unknown') {
    return `<svg class="status-ring status-ring--${size} unknown" viewBox="0 0 36 36" aria-hidden="true"><circle class="ring-track" cx="18" cy="18" r="13"/></svg>`;
  }
  const referenceMinutes: Record<Exclude<QueueLevel, 'unknown'>, number> = {
    low: 15,
    moderate: 30,
    high: 75,
  };
  const progress = Math.min(1, Math.max(0.06, (minutes ?? referenceMinutes[level]) / 100));
  const filled = (ringCircumference * progress).toFixed(2);
  return `<svg class="status-ring status-ring--${size} ${level}" viewBox="0 0 36 36" aria-hidden="true"><circle class="ring-track" cx="18" cy="18" r="13"/><circle class="ring-arc" cx="18" cy="18" r="13" stroke-dasharray="${filled} ${ringCircumference.toFixed(2)}"/></svg>`;
}

function unitTypeIcon(unitType: UnitType) {
  if (unitType === 'Hospital') {
    return '<svg class="type-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 8.5v7M8.5 12h7"/></svg>';
  }
  if (unitType === 'UPA') {
    return '<svg class="type-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6-5.7-6-10.5a6 6 0 1 1 12 0C18 15.3 12 21 12 21Z"/><circle cx="12" cy="10.5" r="2.6"/></svg>';
  }
  return '<svg class="type-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6-5.7-6-10.5a6 6 0 1 1 12 0C18 15.3 12 21 12 21Z"/><circle class="pin-dot" cx="12" cy="10.5" r="1.9"/></svg>';
}

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <a class="skip-link" href="#main">Pular para o conteúdo</a>
  <header class="site-header">
    <div class="header-main glass">
      <a class="wordmark" href="#main" aria-label="Fila Zero, início">Fila zer<svg viewBox="0 0 32 40" aria-hidden="true"><path d="M16 1C7 1 1 7 1 16c0 11 15 23 15 23s15-12 15-23C31 7 25 1 16 1Zm0 9a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z" fill="currentColor"/></svg></a>
      <div class="search-field"><label class="sr-only" for="search">Buscar unidade por nome ou bairro</label><div class="input-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><input id="search" type="search" placeholder="Buscar unidade" autocomplete="off" /></div></div>
      <a class="header-samu button glass-pill" href="tel:192" aria-label="Emergência · SAMU 192">SAMU 192 <span aria-hidden="true">↗</span></a>
    </div>
    <fieldset class="filters"><legend class="sr-only">Tipo de unidade</legend><div>${([['all', 'Todas', null], ['UBS', 'UBS', 'UBS'], ['UPA', 'UPA', 'UPA'], ['Hospital', 'Hospitais', 'Hospital']] as const).map(([value, label, iconType]) => `<button type="button" data-type="${value}" aria-pressed="${value === 'all'}">${iconType ? unitTypeIcon(iconType) : ''}<span>${label}</span></button>`).join('')}<a class="button simulation-entry" href="/simulador.html">Simular trajetos <span aria-hidden="true">→</span></a></div></fieldset>
  </header>
  <main id="main" class="workspace" tabindex="-1">
    <section class="list-panel glass" aria-labelledby="list-title" data-expanded="false">
      <div class="sheet-summary">
        <button id="toggle-list" class="sheet-handle" type="button" aria-expanded="false" aria-controls="sheet-content" aria-label="Expandir lista">
          <span class="sheet-handle-bar" aria-hidden="true"></span>
        </button>
        <div class="sheet-summary-text">
          <p class="eyebrow">São Paulo <span aria-hidden="true">/</span> Rede SUS</p>
          <h1 id="list-title">Unidades de Saúde</h1>
          <p id="result-count" role="status" aria-live="polite" aria-atomic="true">Carregando unidades…</p>
        </div>
      </div>
      <div id="sheet-content" class="sheet-content" tabindex="-1" role="region" aria-label="Lista de unidades de saúde">
        <div class="map-feedback"><p id="map-status" role="status" aria-live="polite">Carregando mapa de ruas… A lista pode ser consultada.</p><button id="retry-map" class="button glass-pill" type="button" hidden>Tentar carregar mapa</button></div>
        <p id="map-state" class="map-data-state" role="status" aria-live="polite"></p>
        <div class="list-tools"><span id="sort-label">Mais próximas</span><button id="locate-me" class="locate-button" type="button" aria-pressed="false">Usar minha localização</button></div>
        <details id="about" class="about"><summary>Sobre os dados</summary><div class="about-content"><h2>Unidades públicas de saúde em São Paulo.</h2><p>Consulte UBS, UPAs e hospitais da rede SUS em São Paulo com localização, horário de funcionamento e tempo estimado de espera no mapa e na lista.</p><p id="map-help">No mapa, use as setas para mover e +/− para ampliar ou reduzir. Selecione um marcador ou abra os detalhes na lista.</p><label for="scenario">Simular estado de carregamento</label><select id="scenario"><option value="normal">Carregamento normal</option><option value="error">Falha simulada (repetir recupera)</option><option value="slow">Carregamento lento (3 segundos)</option></select><p>Controle local da interface para testar carregamento e erro.</p><a class="official-link" href="${officialSource}" target="_blank" rel="noopener noreferrer">Orientação oficial do SAMU · Ministério da Saúde ↗<span class="sr-only"> (abre em nova aba)</span></a></div></details>
        <div id="unit-list" class="unit-list" aria-busy="true"></div>
        <p class="clinical-note">${clinicalWarning}</p>
      </div>
    </section>
    <section class="map-panel" aria-labelledby="map-title">
      <div id="city-map" class="map-canvas" role="region" aria-label="Mapa de ruas de ${escapeHtml(mapReference.name)}" aria-describedby="map-help"></div>
      <div class="map-place glass"><p class="eyebrow">Rede pública de saúde</p><h2 id="map-title">${escapeHtml(mapReference.name)}</h2><p>UBS, UPAs e Hospitais · Rede SUS</p></div>
      <div class="map-legend glass" aria-label="Legenda do mapa"><div class="legend-pills"><span class="legend-pill low">${statusRing('low', 'sm')}<span><strong>Fila baixa</strong><small>≤ 15 min</small></span></span><span class="legend-pill moderate">${statusRing('moderate', 'sm')}<span><strong>Fila média</strong><small>15 – 45 min</small></span></span><span class="legend-pill high">${statusRing('high', 'sm')}<span><strong>Fila alta</strong><small>&gt; 45 min</small></span></span><span class="legend-pill unknown">${statusRing('unknown', 'sm')}<span><strong>Sem dado</strong><small>Indisp. / desat.</small></span></span></div><p class="legend-note">Tempos de espera estimados · confirme na unidade</p></div>
      <div class="map-attribution glass"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors<span class="sr-only"> (abre em nova aba)</span></a><span>&nbsp;·&nbsp;</span><a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">© OpenFreeMap<span class="sr-only"> (abre em nova aba)</span></a><span>&nbsp;·&nbsp;</span><a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">© OpenMapTiles<span class="sr-only"> (abre em nova aba)</span></a></div>
    </section>
  </main>
`;

const search = document.querySelector<HTMLInputElement>('#search')!;
const list = document.querySelector<HTMLDivElement>('#unit-list')!;
const mapState = document.querySelector<HTMLParagraphElement>('#map-state')!;
const mapStatus = document.querySelector<HTMLParagraphElement>('#map-status')!;
const retryMap = document.querySelector<HTMLButtonElement>('#retry-map')!;
const count = document.querySelector<HTMLParagraphElement>('#result-count')!;
const scenario = document.querySelector<HTMLSelectElement>('#scenario')!;
const sheet = document.querySelector<HTMLElement>('.list-panel')!;
const sheetSummary = document.querySelector<HTMLElement>('.sheet-summary')!;
const sheetContent = document.querySelector<HTMLDivElement>('#sheet-content')!;
const toggleList = document.querySelector<HTMLButtonElement>('#toggle-list')!;
const sortLabel = document.querySelector<HTMLSpanElement>('#sort-label')!;
const locateMe = document.querySelector<HTMLButtonElement>('#locate-me')!;
const mobileLayout = matchMedia('(max-width: 900px)');
let listExpanded = false;
let units: HealthUnit[] = [];
let type: UnitType | 'all' = 'all';
let status: 'loading' | 'ready' | 'error' = 'loading';
let selectedId: string | null = null;
let loadVersion = 0;
let cityMap: CityMap | null = null;
let initializingMap = false;
let mapCenter: Coordinates = { ...mapReference.center };
let renderedCenter: Coordinates = { ...mapReference.center };
let userLocation: Coordinates | null = null;
let locating = false;
let locateError = '';
let hasManualPan = false;
let watchId: number | null = null;
const activeOrigin = (): Coordinates => userLocation ?? mapCenter;
let routeComparison: Comparison | null = null;
let journeys = new Map<string, RouteResult>();
let journeyState: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
let journeyError = '';
let journeyVersion = 0;
let journeyController: AbortController | null = null;
let locationAccuracy: number | null = null;
let locationTimestamp = 0;
let manualOrigin = false;
let choosingOrigin = false;
let locationVersion = 0;
document.querySelector('.list-tools')!.insertAdjacentHTML('afterend', '<div class="origin-controls"><button type="button" id="choose-origin" aria-pressed="false">Corrigir localização no mapa</button><button type="button" id="use-map-center" hidden>Usar centro do mapa</button></div><div class="route-api-status" id="route-api-status" role="status" aria-live="polite"></div>');
document.querySelector('.workspace')!.insertAdjacentHTML('beforeend', '<p class="origin-hint" id="origin-hint" role="status"></p>');
const chooseOrigin = document.querySelector<HTMLButtonElement>('#choose-origin')!;
const centerOrigin = document.querySelector<HTMLButtonElement>('#use-map-center')!;
const originHint = document.querySelector<HTMLElement>('#origin-hint')!;

function selectManualOrigin(location: Coordinates) {
  if (!choosingOrigin) return;
  choosingOrigin = false;
  manualOrigin = true;
  ++locationVersion;
  locating = false;
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  userLocation = location;
  locationAccuracy = null;
  chooseOrigin.setAttribute('aria-pressed', 'false');
  centerOrigin.hidden = true;
  originHint.textContent = 'Origem escolhida no mapa. Os trajetos serão recalculados.';
  cityMap?.setUserLocation(location, { manual: true });
  void loadJourneys();
}

chooseOrigin.addEventListener('click', () => {
  choosingOrigin = !choosingOrigin;
  if (choosingOrigin) { ++locationVersion; locating = false; updateSortStatus(); }
  chooseOrigin.setAttribute('aria-pressed', String(choosingOrigin));
  centerOrigin.hidden = !choosingOrigin;
  originHint.textContent = choosingOrigin ? 'Clique no ponto correto do mapa ou mova o mapa e use o centro.' : '';
  if (choosingOrigin && mobileLayout.matches) setSheetExpanded(false);
});
centerOrigin.addEventListener('click', () => { if (cityMap) selectManualOrigin(cityMap.getCenter()); });

function drawJourney(fit = false) {
  const selected = journeys.get(selectedId ?? '');
  cityMap?.setSimulation({
    pontos: routeComparison ? [routeComparison.origem_ponto] : [], ruas: [], bloqueadas: [],
    origem: routeComparison?.origem ?? '', caminho: selected?.geometria ?? [],
  }, fit && !!selected?.geometria.length);
}

async function loadJourneys() {
  if (!userLocation) return;
  const version = ++journeyVersion;
  journeyController?.abort();
  const controller = journeyController = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 75_000);
  journeyState = 'loading'; routeComparison = null; journeys = new Map();
  drawJourney(); render();
  try {
    const comparison = await fetchRouteJson<Comparison>('/api/comparar', controller.signal, { origem: userLocation });
    if (version !== journeyVersion) return;
    routeComparison = comparison;
    journeys = new Map(comparison.resultados.map(unit => [unit.id, unit]));
    journeyState = 'ready';
    drawJourney();
  } catch (error) {
    if (version !== journeyVersion) return;
    journeyState = 'error';
    journeyError = controller.signal.aborted ? 'O cálculo demorou mais que o esperado. Tente novamente.' : error instanceof Error ? error.message : 'Não foi possível calcular os trajetos.';
  } finally {
    clearTimeout(timeout);
    if (version === journeyVersion) {
      render();
    }
  }
}

function reportMapStatus(state: MapStatus) {
  const messages: Record<MapStatus, string> = {
    loading: 'Carregando mapa de ruas… A lista pode ser consultada.',
    ready: 'Mapa carregado com unidades públicas de saúde de São Paulo.',
    partial: 'Parte do mapa não carregou. Consulte as unidades na lista.',
    error: 'Mapa indisponível. Consulte as unidades na lista.',
  };
  if (mapStatus.textContent !== messages[state]) mapStatus.textContent = messages[state];
  mapStatus.parentElement!.dataset.state = state;
  retryMap.hidden = state !== 'error' && state !== 'partial';
  if (state === 'loading' && document.activeElement === retryMap) search.focus();
}

function setSheetExpanded(expanded: boolean, moveFocus = true) {
  listExpanded = expanded;
  const collapsed = mobileLayout.matches && !expanded;
  sheet.dataset.expanded = String(expanded);
  sheetContent.hidden = collapsed;
  sheetContent.inert = collapsed;
  toggleList.setAttribute('aria-expanded', String(expanded));
  toggleList.setAttribute('aria-label', expanded ? 'Recolher lista' : 'Expandir lista');
  if (moveFocus && mobileLayout.matches) {
    if (expanded) sheetContent.focus({ preventScroll: true });
    else toggleList.focus({ preventScroll: true });
  }
}

const layoutObserver = new ResizeObserver(() => {
  const root = document.documentElement;
  root.style.setProperty('--header-height', `${document.querySelector('.site-header')!.getBoundingClientRect().height}px`);
  root.style.setProperty('--sheet-height', `${sheet.getBoundingClientRect().height}px`);
});
layoutObserver.observe(sheet);
layoutObserver.observe(document.querySelector('.site-header')!);
mobileLayout.addEventListener('change', () => setSheetExpanded(listExpanded, false));

let dragStartY = 0;
let dragStartHeight = 0;
let dragging = false;
let movedDuringDrag = false;
let suppressNextToggleClick = false;
let activePointerId: number | null = null;
let collapsedDragHeight = 0;
let expandedDragHeight = 0;

sheetSummary.addEventListener('pointerdown', event => {
  if (!mobileLayout.matches || (event.pointerType === 'mouse' && event.button !== 0)) return;
  activePointerId = event.pointerId;
  dragStartY = event.clientY;
  dragStartHeight = sheet.getBoundingClientRect().height;
  collapsedDragHeight = sheetSummary.getBoundingClientRect().height;
  const headerBottom = document.querySelector('.site-header')!.getBoundingClientRect().bottom;
  expandedDragHeight = Math.max(collapsedDragHeight + 120, Math.round(window.innerHeight - headerBottom - 10));
  dragging = true;
  movedDuringDrag = false;
});

sheetSummary.addEventListener('pointermove', event => {
  if (!dragging || event.pointerId !== activePointerId) return;
  const deltaY = dragStartY - event.clientY;
  if (!movedDuringDrag) {
    if (Math.abs(deltaY) <= 6) return;
    movedDuringDrag = true;
    sheet.classList.add('is-dragging');
    sheetContent.hidden = false;
    sheetContent.inert = false;
    try { sheetSummary.setPointerCapture(event.pointerId); } catch { /* ignore unsupported capture */ }
  }
  const nextHeight = Math.min(expandedDragHeight, Math.max(collapsedDragHeight, dragStartHeight + deltaY));
  sheet.style.height = `${nextHeight}px`;
});

function finishSheetDrag(event: PointerEvent) {
  if (!dragging || event.pointerId !== activePointerId) return;
  dragging = false;
  activePointerId = null;
  const deltaY = dragStartY - event.clientY;
  sheet.classList.remove('is-dragging');
  sheet.style.height = '';
  if (!movedDuringDrag) return;
  movedDuringDrag = false;
  suppressNextToggleClick = true;
  queueMicrotask(() => { suppressNextToggleClick = false; });
  const nextExpanded = event.type === 'pointercancel'
    ? listExpanded
    : deltaY > 36 ? true : deltaY < -36 ? false : listExpanded;
  setSheetExpanded(nextExpanded, nextExpanded !== listExpanded);
}

sheetSummary.addEventListener('pointerup', finishSheetDrag);
sheetSummary.addEventListener('pointercancel', finishSheetDrag);
sheetSummary.addEventListener('click', event => {
  if (suppressNextToggleClick) {
    suppressNextToggleClick = false;
    return;
  }
  const target = event.target as Element;
  if (!mobileLayout.matches) return;
  if (target.closest('#toggle-list') || !target.closest('button, a, input, select')) {
    setSheetExpanded(!listExpanded);
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && mobileLayout.matches && listExpanded) {
    setSheetExpanded(false);
    event.preventDefault();
  }
});

async function startMap() {
  if (initializingMap) return;
  if (cityMap) {
    try { cityMap.retry(); } catch { reportMapStatus('error'); }
    return;
  }
  initializingMap = true;
  reportMapStatus('loading');
  let importTimeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const { initMap } = await Promise.race([
      import('./ui/map.ts'),
      new Promise<never>((_, reject) => { importTimeout = setTimeout(() => reject(new Error('Mapa demorou para iniciar')), 12_000); }),
    ]);
    const oldContainer = document.querySelector<HTMLDivElement>('#city-map')!;
    const container = oldContainer.cloneNode(false) as HTMLDivElement;
    oldContainer.replaceWith(container);
    cityMap = initMap(
      container,
      mapReference,
      reportMapStatus,
      showDetails,
      center => {
        mapCenter = center;
        if (userLocation || status !== 'ready') return;
        if (distanceKm(renderedCenter, center) < 0.08) return;
        render();
      },
      () => { hasManualPan = true; },
      selectManualOrigin,
    );
    if (userLocation) cityMap.setUserLocation(userLocation, { center: !hasManualPan, manual: manualOrigin, accuracy: locationAccuracy });
    syncMap();
    drawJourney();
  } catch {
    reportMapStatus('error');
  } finally {
    clearTimeout(importTimeout);
    initializingMap = false;
  }
}

function syncMap() {
  if (!cityMap) return;
  const visible = status === 'ready' ? filterUnits(units, search.value, type) : [];
  const points: MapPoint[] = visible.map(unit => ({
    id: unit.id,
    location: unit.location,
    number: unitNumber(unit),
    type: unit.type === 'Hospital' ? 'HOSP' : unit.type,
    tone: tone(unit),
    statusText: statusText(unit),
    label: `${unitNumber(unit)} · ${unit.name} · ${unit.neighborhood} · ${queueLabel(unit)} · ${formatWait(unit)}. Ver informações na lista`,
    opensDialog: false,
  }));
  try { cityMap.update(points, selectedId); } catch { reportMapStatus('error'); }
}

function tone(unit: HealthUnit): QueueLevel {
  return unit.data.status === 'available' ? unit.data.queueLevel : 'unknown';
}

function statusText(unit: HealthUnit) {
  if (unit.data.status !== 'available' || !unit.data.estimatedWait) return 'S/ dado';
  const { min, max } = unit.data.estimatedWait;
  if (min === max) return min >= 60 ? '1h+' : `${min} min`;
  return `${min}–${max}m`;
}

function unitNumber(unit: HealthUnit) {
  return String(units.findIndex(item => item.id === unit.id) + 1).padStart(2, '0');
}

function queueBadge(unit: HealthUnit) {
  return `<span class="queue-badge ${tone(unit)}">${escapeHtml(queueLabel(unit))}</span>`;
}

function updateSortStatus() {
  if (locating) {
    sortLabel.textContent = 'Obtendo sua localização…';
    locateMe.disabled = true;
    return;
  }
  locateMe.disabled = false;
  if (userLocation) {
    sortLabel.textContent = manualOrigin ? 'Mais próximas da origem escolhida' : 'Mais próximas de você';
    locateMe.textContent = manualOrigin ? 'Usar minha localização' : 'Atualizar localização';
    locateMe.setAttribute('aria-pressed', 'true');
  } else {
    sortLabel.textContent = locateError || 'Mais próximas da região';
    locateMe.textContent = 'Usar minha localização';
    locateMe.setAttribute('aria-pressed', 'false');
  }
}

function journeySummary(unit: HealthUnit) {
  const estimate = journeys.get(unit.id);
  const calculated = estimate?.deslocamento !== null && estimate?.deslocamento !== undefined;
  const distance = calculated ? formatDistance(estimate!.distancia_metros! / 1000) : `${formatDistance(distanceKm(activeOrigin(), unit.location))} em linha reta`;
  const arrival = calculated ? `${Number(estimate!.deslocamento!.toFixed(1))} min` : 'indisponível';
  const total = estimate?.total ? formatTotalDurationRange({ min: estimate.total[0], max: estimate.total[1] }) : null;
  const totalLine = total
    ? `Carro por ruas OSM: ~${escapeHtml(arrival)} · Total (espera + chegada): <strong>${escapeHtml(total)}</strong>`
    : calculated ? `Carro por ruas OSM: ~${escapeHtml(arrival)} · <strong>Total indisponível</strong>`
    : journeyState === 'loading' ? 'Calculando trajeto por ruas…' : `<strong>${escapeHtml(estimate?.motivo_rota ?? (userLocation ? 'Trajeto indisponível' : 'Use sua localização para calcular o trajeto'))}</strong>`;
  return { distance, arrival, total, totalLine, calculated };
}

function card(unit: HealthUnit, index: number) {
  const id = escapeHtml(unit.id);
  const level = tone(unit);
  const { distance, arrival, totalLine, calculated } = journeySummary(unit);
  return `<article class="unit-card${selectedId === unit.id ? ' is-selected' : ''}" data-card="${id}" aria-labelledby="name-${id}">
    <div class="card-head">
      <div class="card-heading">
        <h3 id="name-${id}">${escapeHtml(unit.name)}</h3>
        <p class="card-meta"><span class="unit-number">${unitNumber(unit)}</span><span class="unit-type">${unitTypeIcon(unit.type)}<span>${unit.type}</span></span><span aria-hidden="true">·</span><span class="unit-distance">${escapeHtml(distance)}${calculated ? ` (~${escapeHtml(arrival)})` : ''}</span><span aria-hidden="true">·</span><span>${escapeHtml(unit.neighborhood)}</span>${index === 0 ? '<span class="nearest-badge">Mais próxima em linha reta</span>' : ''}${unit.data.status === 'stale' ? '<strong class="stale-flag">Dados desatualizados</strong>' : ''}</p>
      </div>
      <span class="card-chevron" aria-hidden="true">›</span>
    </div>
    <div class="queue-panel ${level}">
      ${statusRing(level, 'md', waitMinutes(unit))}
      <div class="queue-panel-text">
        ${queueBadge(unit)}
        <p class="wait">${escapeHtml(formatWait(unit))}</p>
        <p class="total-time">${totalLine}</p>
      </div>
    </div>
    <p class="address">${escapeHtml(unit.address)}<br>${escapeHtml(unit.neighborhood)} · ${escapeHtml(unit.city)}</p>
    <p class="hours">${escapeHtml(unit.openingHours)}</p>
    <div class="data-source"><p>${escapeHtml(unit.data.source)}</p><p>${escapeHtml(formatUpdatedAt(unit))}</p></div>
    <div class="card-actions">
      <button class="details-button" type="button" data-unit="${id}" aria-expanded="${selectedId === unit.id}" aria-controls="info-${id}" aria-label="Ver detalhes de ${escapeHtml(unit.name)}">${selectedId === unit.id ? 'Ocultar detalhes' : 'Ver detalhes'}</button>
      <button class="route-link" type="button" data-route="${id}" ${calculated ? '' : 'disabled'} aria-label="Ver trajeto para ${escapeHtml(unit.name)}">Ver trajeto no mapa <span aria-hidden="true">↗</span></button>
    </div>
    <div class="inline-unit-info" id="info-${id}" ${selectedId === unit.id ? '' : 'hidden'}><p>${escapeHtml(unit.description)}</p></div>
  </article>`;
}

function render() {
  list.setAttribute('aria-busy', String(status === 'loading'));
  updateSortStatus();
  const routeStatus = document.querySelector('#route-api-status')!;
  routeStatus.innerHTML = journeyState === 'loading' ? 'Calculando os trajetos das 30 unidades com sua localização…'
    : journeyState === 'error' ? `${escapeHtml(journeyError)} <button type="button" id="retry-journeys">Recalcular trajetos</button>`
    : journeyState === 'ready' ? `Trajetos calculados: ${[...journeys.values()].filter(u => u.deslocamento !== null).length} de ${units.length} unidades. Carro sem trânsito ao vivo · esperas simuladas.${locationAccuracy !== null ? ` Precisão da localização: ~${Math.round(locationAccuracy)} m.${locationAccuracy > 200 ? ' Localização aproximada: corrija no mapa se necessário.' : ''}` : ''} Localização enviada ao serviço de trajetos e não salva pelo aplicativo.`
    : 'Use sua localização para calcular trajetos por ruas reais. A localização não é salva pelo aplicativo.';
  if (status !== 'ready') {
    const loading = status === 'loading';
    const title = loading ? 'Carregando unidades…' : 'Não foi possível carregar os dados.';
    count.textContent = title;
    syncMap();
    mapState.textContent = loading ? 'Carregando unidades de saúde…' : 'Dados das unidades indisponíveis. O mapa de ruas é independente.';
    list.innerHTML = `<div class="state-card" role="${loading ? 'status' : 'alert'}"><span class="state-symbol" aria-hidden="true">${loading ? '…' : '!'}</span><h3>${title}</h3><p>${loading ? 'Preparando a lista e os marcadores no mapa.' : 'Não foi possível carregar a lista de unidades. Você pode tentar novamente.'}</p>${loading ? '' : '<button type="button" class="button primary" id="retry">Tentar novamente</button>'}</div>`;
    return;
  }
  renderedCenter = { ...mapCenter };
  const visible = sortByNearest(filterUnits(units, search.value, type), activeOrigin());
  if (!visible.some(unit => unit.id === selectedId)) selectedId = null;
  drawJourney();
  count.textContent = `${visible.length} ${visible.length === 1 ? 'unidade encontrada' : 'unidades encontradas'}`;
  mapState.textContent = visible.length ? '' : 'Nenhuma unidade para estes filtros. Ajuste a busca ou limpe os filtros.';
  syncMap();
  list.innerHTML = visible.length ? visible.map((unit, index) => card(unit, index)).join('') : `<div class="state-card"><span class="state-symbol" aria-hidden="true">∅</span><h3>Nenhuma unidade encontrada</h3><p>Tente outro nome, bairro ou remova os filtros para explorar as ${units.length} unidades.</p><button type="button" class="button primary" id="clear-filters">Limpar busca e filtros</button></div>`;
}

async function loadUnits(mode = 'normal') {
  const version = ++loadVersion;
  status = 'loading';
  selectedId = null;
  render();
  try {
    if (mode === 'slow') await new Promise(resolve => setTimeout(resolve, 3000));
    if (mode === 'error') await Promise.reject(new Error('Falha simulada de carregamento'));
    const result = await listUnits();
    if (version !== loadVersion) return;
    units = result;
    status = 'ready';
  } catch {
    if (version !== loadVersion) return;
    status = 'error';
  }
  render();
}

function showDetails(id: string, trigger: HTMLElement) {
  if (!units.some(unit => unit.id === id)) return;
  const fromMap = !list.contains(trigger);
  selectedId = !fromMap && selectedId === id ? null : id;
  drawJourney();
  try { cityMap?.select(selectedId); } catch { reportMapStatus('error'); }
  for (const element of list.querySelectorAll<HTMLElement>('[data-card]')) {
    const selected = element.dataset.card === selectedId;
    element.classList.toggle('is-selected', selected);
    const button = element.querySelector<HTMLButtonElement>('.details-button')!;
    button.setAttribute('aria-expanded', String(selected));
    button.textContent = selected ? 'Ocultar detalhes' : 'Ver detalhes';
    element.querySelector<HTMLElement>('.inline-unit-info')!.hidden = !selected;
  }
  if (fromMap && selectedId) {
    if (mobileLayout.matches) setSheetExpanded(true, false);
    const selectedCard = [...list.querySelectorAll<HTMLElement>('[data-card]')].find(element => element.dataset.card === id);
    selectedCard?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
}

search.addEventListener('input', render);
document.querySelector('.filters')!.addEventListener('click', event => {
  const button = (event.target as Element).closest<HTMLButtonElement>('button[data-type]');
  if (!button) return;
  type = button.dataset.type as UnitType | 'all';
  document.querySelectorAll<HTMLButtonElement>('[data-type]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  render();
});
document.querySelector('.workspace')!.addEventListener('click', event => {
  const button = (event.target as Element).closest<HTMLButtonElement>('button');
  if (!button) return;
  if (button.dataset.unit) showDetails(button.dataset.unit, button);
  if (button.dataset.route) {
    selectedId = button.dataset.route;
    drawJourney(true);
    cityMap?.select(selectedId);
    if (mobileLayout.matches) setSheetExpanded(false);
    render();
  }
  if (button.id === 'retry-journeys') void loadJourneys();
  if (button.id === 'retry') {
    scenario.value = 'normal';
    void loadUnits().then(() => search.focus());
  }
  if (button.id === 'clear-filters') {
    search.value = '';
    type = 'all';
    document.querySelectorAll<HTMLButtonElement>('[data-type]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.type === 'all')));
    render();
    search.focus();
  }
});
function startWatchingUserLocation() {
  if (watchId !== null || !('geolocation' in navigator)) return;
  watchId = navigator.geolocation.watchPosition(
    pos => {
      if (manualOrigin || choosingOrigin) return;
      const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const accuracy = pos.coords.accuracy;
      if (!Number.isFinite(accuracy) || accuracy <= 0 || pos.timestamp < locationTimestamp) return;
      const distance = userLocation ? distanceKm(userLocation, next) * 1000 : Infinity;
      if (userLocation && locationAccuracy !== null && accuracy > locationAccuracy && distance <= accuracy + locationAccuracy && pos.timestamp - locationTimestamp < 60_000) return;
      if (distance < 20 && locationAccuracy !== null && accuracy >= locationAccuracy) return;
      userLocation = next;
      locationAccuracy = accuracy;
      locationTimestamp = pos.timestamp;
      cityMap?.setUserLocation(next, { accuracy });
      if (status === 'ready') {
        void loadJourneys();
        render();
      }
    },
    () => { /* mantém a última localização válida se o sinal oscilar */ },
    { enableHighAccuracy: true, maximumAge: 0 },
  );
}

function requestUserLocation(center = true, silent = false) {
  if (!('geolocation' in navigator)) {
    if (!silent) {
      locateError = 'Localização indisponível neste navegador';
      updateSortStatus();
    }
    return;
  }
  locating = true;
  const version = ++locationVersion;
  if (!silent) locateError = '';
  updateSortStatus();
  navigator.geolocation.getCurrentPosition(
    pos => {
      if (version !== locationVersion || choosingOrigin) return;
      locating = false;
      manualOrigin = false;
      locateError = '';
      userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      locationAccuracy = pos.coords.accuracy;
      locationTimestamp = pos.timestamp;
      cityMap?.setUserLocation(userLocation, { center: center && (!silent || !hasManualPan), accuracy: locationAccuracy });
      startWatchingUserLocation();
      void loadJourneys();
      render();
    },
    () => {
      if (version !== locationVersion || choosingOrigin) return;
      locating = false;
      locateError = silent ? '' : 'Não foi possível usar sua localização';
      updateSortStatus();
    },
    { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
  );
}

locateMe.addEventListener('click', () => {
  hasManualPan = false;
  if (userLocation) cityMap?.setUserLocation(userLocation, { center: true });
  requestUserLocation(true, false);
});
scenario.addEventListener('change', () => { void loadUnits(scenario.value); });
retryMap.addEventListener('click', () => { void startMap(); });
void loadUnits();
setSheetExpanded(false, false);
void startMap();
requestUserLocation(true, true);
