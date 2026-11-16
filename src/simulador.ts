import './styles.css';
import './simulador.css';
import { initMap, type CityMap, type MapStatus } from './ui/map.ts';
import { fetchRouteJson as fetchJson, getBrowserLocation, type Range, type Road, type RouteScenario as Scenario, type Comparison, type Coordinates } from './data/routes.ts';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const duration = (minutes: number) => `${Number(minutes.toFixed(1))} min`;
const range = (value: Range | null) => value ? `${Number(value[0].toFixed(1))}–${Number(value[1].toFixed(1))} min` : 'Indisponível';
const date = (value: string | null) => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value)) : 'Sem atualização';

document.querySelector('#app')!.innerHTML = `
  <a class="skip-link" href="#comparison">Pular para a comparação</a>
  <header class="sim-header">
    <a class="wordmark" href="/" aria-label="Fila Zero, início">fila zer<span class="sim-pin" aria-hidden="true">o</span></a>
    <nav aria-label="Navegação principal"><a href="/">Explorar unidades</a><a href="/simulador.html" aria-current="page">Simular trajetos</a></nav>
    <span class="sim-header-tag">Demonstração acadêmica</span>
  </header>
  <main class="sim-workspace">
    <aside class="sim-sidebar" aria-labelledby="simulation-title">
      <div class="sim-intro"><span class="sim-kicker"><span aria-hidden="true"></span>Ruas reais · esperas simuladas</span><h1 id="simulation-title">Seu trajeto,<br>no mapa.</h1><p>Compare o percurso de carro e a espera nas mesmas unidades do mapa: UBS, UPAs e hospitais.</p></div>
      <section class="sim-controls" aria-label="Configurar simulação">
        <label class="sim-label" for="sim-origin">De onde você sai?</label>
        <select id="sim-origin" disabled><option>Carregando pontos…</option></select>
        <button id="sim-locate" class="button primary sim-locate" type="button" disabled>Usar minha localização</button>
        <p id="sim-location-status" class="sim-location-status" role="status" aria-live="polite"></p>
        <p class="sim-location-note">Sua posição é usada para calcular os trajetos. O aplicativo não salva as coordenadas.</p>
        <details class="sim-adjustments"><summary>Ajustar cenário <span aria-hidden="true">+</span></summary>
          <div class="sim-adjustments-body"><h2>Trechos dos percursos</h2><p>Marque um trecho OSM para simular seu bloqueio. A lista acompanha os percursos calculados.</p><div id="sim-roads"></div>
          <form id="sim-wait-form"><h2>Espera na unidade</h2><label for="sim-wait-unit">Unidade</label><select id="sim-wait-unit" disabled></select>
            <div class="sim-wait-fields"><label for="sim-min">Mínimo (min)<input id="sim-min" type="number" min="0" step="any" required></label><label for="sim-max">Máximo (min)<input id="sim-max" type="number" min="0" step="any" required></label></div>
            <label class="sim-checkbox"><input id="sim-no-wait" type="checkbox"> Sem estimativa disponível</label>
            <p id="sim-edit-status" role="status"></p><button class="button primary" id="sim-apply" type="submit" disabled>Aplicar espera</button>
          </form><button id="sim-reset" class="sim-reset" type="button" disabled>Restaurar cenário inicial</button></div>
        </details>
      </section>
      <section id="comparison" class="sim-comparison" aria-labelledby="comparison-title" tabindex="-1">
        <div class="sim-section-heading"><h2 id="comparison-title">Comparar unidades</h2><span id="sim-count"></span></div>
        <p class="sim-order">Ordem pelo ponto médio do tempo total estimado.</p>
        <p id="sim-status" class="sim-status" role="status" aria-live="polite">Carregando cenário…</p>
        <div id="sim-error" class="sim-error" role="alert" hidden><p id="sim-error-message">Não foi possível atualizar os trajetos.</p><button id="sim-retry" class="button" type="button">Tentar novamente</button></div>
        <div id="sim-results" aria-busy="true"></div>
      </section>
      <footer class="sim-data-note"><p id="sim-reference"></p><p>Somente as esperas são fictícias. Deslocamento estimado por extensão e velocidade de referência das vias, sem trânsito ao vivo. Menor tempo não determina adequação clínica.</p><details><summary>Sobre os dados</summary><p id="sim-source"></p><p id="sim-osm-meta"></p><p>O percurso termina no nó viário mais próximo da unidade; o acesso interno não está incluído. A extração cobre parte de São Paulo e pode não conter a melhor alternativa fora dessa área. O modelo acadêmico respeita sentidos e acesso por carro; não interpreta restrições de conversão ou regras condicionais.</p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">Dados viários © OpenStreetMap contributors · ODbL</a></details><a href="tel:192">Em uma emergência real, ligue SAMU 192 ↗</a></footer>
    </aside>
    <section class="sim-map-section" aria-labelledby="sim-map-title" tabindex="-1">
      <div class="sim-map-heading"><div><span class="eyebrow">Ruas de São Paulo</span><h2 id="sim-map-title">Trajetos pelo OpenStreetMap</h2></div><button id="sim-fit" class="button" type="button" disabled>Ver todas as unidades</button></div>
      <div id="sim-map" role="region" aria-label="Mapa de trajetos em ruas reais de São Paulo" aria-describedby="sim-map-notice"></div>
      <div class="sim-map-caption"><p id="sim-map-notice">Percurso por ruas do OpenStreetMap · carro · sem trânsito ao vivo.</p><div><span><i class="sim-line route"></i>Trajeto calculado</span><span><i class="sim-line blocked"></i>Bloqueio simulado</span></div></div>
      <div class="sim-route-panel" aria-live="polite"><p class="eyebrow">Trajeto selecionado</p><h3 id="sim-route-title">Escolha uma unidade</h3><details class="sim-itinerary"><summary>Ver ruas do trajeto</summary><p id="sim-route-path">O caminho aparecerá aqui e no mapa.</p></details><p id="sim-route-total"></p></div>
      <p id="sim-map-status" class="sim-map-feedback" role="status"></p><button id="sim-map-retry" class="button" type="button" hidden>Tentar carregar mapa</button>
      <p class="sim-attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a> · © OpenFreeMap · © OpenMapTiles</p>
    </section>
  </main>`;

const originSelect = document.querySelector<HTMLSelectElement>('#sim-origin')!;
const waitUnit = document.querySelector<HTMLSelectElement>('#sim-wait-unit')!;
const minInput = document.querySelector<HTMLInputElement>('#sim-min')!;
const maxInput = document.querySelector<HTMLInputElement>('#sim-max')!;
const noWait = document.querySelector<HTMLInputElement>('#sim-no-wait')!;
const status = document.querySelector<HTMLElement>('#sim-status')!;
const errorPanel = document.querySelector<HTMLElement>('#sim-error')!;
const resultList = document.querySelector<HTMLElement>('#sim-results')!;
const mapFeedback = document.querySelector<HTMLElement>('#sim-map-status')!;
const editStatus = document.querySelector<HTMLElement>('#sim-edit-status')!;
let scenario: Scenario | null = null;
let comparison: Comparison | null = null;
let cityMap: CityMap | null = null;
let origin = '';
let selectedId: string | null = null;
let blocked = new Set<string>();
let waits: Record<string, Range | null> = {};
let roads: Road[] = [];
let requestVersion = 0;
let controller: AbortController | null = null;
let gps: Coordinates | null = null;
let gpsAccuracy: number | null = null;
let locationVersion = 0;
const locationStatus = document.querySelector<HTMLElement>('#sim-location-status')!;
const locateButton = document.querySelector<HTMLButtonElement>('#sim-locate')!;

function showMapStatus(state: MapStatus) {
  mapFeedback.textContent = {
    loading: 'Carregando base do mapa…', ready: '',
    partial: 'Parte da base do mapa não carregou. O percurso OSM continua disponível.',
    error: 'Base do mapa indisponível. O percurso OSM e os cálculos continuam disponíveis.',
  }[state];
  document.querySelector<HTMLButtonElement>('#sim-map-retry')!.hidden = state !== 'partial' && state !== 'error';
}

function updateNetwork(fit = false, fullNetwork = false) {
  if (!scenario || !cityMap) return;
  const selected = comparison?.resultados.find(unit => unit.id === selectedId);
  cityMap.setSimulation({
    pontos: comparison ? [...scenario.pontos.filter(p => p.id !== comparison!.origem), comparison.origem_ponto] : scenario.pontos,
    ruas: roads, bloqueadas: [...blocked], origem: comparison?.origem ?? (gps ? '' : origin),
    caminho: fullNetwork ? [] : selected?.geometria ?? [],
  }, fit);
  if (fullNetwork && selected) updateNetwork();
}

function updateRoute(fit = false) {
  const unit = comparison?.resultados.find(item => item.id === selectedId);
  document.querySelector('#sim-route-title')!.textContent = unit?.nome ?? 'Escolha uma unidade';
  document.querySelector('#sim-route-path')!.textContent = unit
    ? unit.caminho.length ? unit.vias.length ? unit.vias.join(' → ') : 'A origem já está no acesso viário desta unidade.' : 'Sem caminho disponível com os trechos atuais.'
    : 'O caminho aparecerá aqui e no mapa.';
  document.querySelector('#sim-route-total')!.textContent = unit
    ? `${unit.deslocamento === null ? 'Deslocamento indisponível' : `Carro: ${duration(unit.deslocamento)} · ${((unit.distancia_metros ?? 0) / 1000).toFixed(2)} km`} · Total: ${range(unit.total)}`
    : '';
  updateNetwork(fit);
}

function selectUnit(id: string, fit = true) {
  selectedId = id;
  for (const card of resultList.querySelectorAll<HTMLElement>('[data-result]')) {
    card.classList.toggle('is-selected', card.dataset.result === id);
    card.querySelector('button')?.setAttribute('aria-pressed', String(card.dataset.result === id));
  }
  cityMap?.select(id);
  updateRoute(fit);
  renderRoads();
  if (fit && matchMedia('(max-width: 900px)').matches) {
    const mapSection = document.querySelector<HTMLElement>('.sim-map-section')!;
    mapSection.focus({ preventScroll: true });
    mapSection.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
}

function renderResults() {
  if (!comparison || !scenario) return;
  document.querySelector('#sim-count')!.textContent = `${comparison.resultados.length} unidades`;
  resultList.innerHTML = comparison.resultados.map((unit, index) => {
    const comparable = unit.total !== null;
    const note = unit.deslocamento === null ? unit.motivo_rota ?? 'Sem caminho disponível' : unit.status === 'desatualizado' ? 'Dados desatualizados · total indisponível' : !comparable ? 'Espera indisponível · total indisponível' : 'Espera simulada';
    return `<article class="sim-card${unit.id === selectedId ? ' is-selected' : ''}" data-result="${escapeHtml(unit.id)}" aria-labelledby="sim-name-${escapeHtml(unit.id)}">
      <div class="sim-card-heading"><div><span class="sim-card-rank">${comparable ? `${String(index + 1).padStart(2, '0')} / Comparação` : 'Fora da comparação de total'}</span><h3 id="sim-name-${escapeHtml(unit.id)}">${escapeHtml(unit.nome)}</h3></div>${comparable ? `<strong class="sim-total">${range(unit.total)}<small>tempo total</small></strong>` : '<span class="sim-no-total">Total<br>indisponível</span>'}</div>
      <dl class="sim-metrics"><div><dt>Deslocamento</dt><dd>${unit.deslocamento !== null ? duration(unit.deslocamento) : 'Sem caminho'}</dd></div><div><dt>Espera</dt><dd>${range(unit.espera)}</dd></div></dl>
      <p class="sim-unit-note">${escapeHtml(unit.tipo)} · ${escapeHtml(note)}</p><p class="sim-updated">${escapeHtml(unit.endereco)}<br>${unit.acesso_metros === null ? 'Acesso viário indisponível na malha.' : `Até o acesso viário, a ${Math.round(unit.acesso_metros)} m da unidade.`}<br>Espera simulada: ${escapeHtml(date(unit.atualizado_em))}</p>
      <button class="sim-route-button" type="button" data-route="${escapeHtml(unit.id)}" aria-pressed="${unit.id === selectedId}" ${unit.deslocamento === null ? 'disabled' : ''}>${unit.deslocamento === null ? 'Sem trajeto disponível' : 'Ver trajeto no mapa'}<span aria-hidden="true">↗</span></button>
    </article>`;
  }).join('');
  cityMap?.update(comparison.resultados.map((unit, index) => {
    return {
      id: unit.id, location: { lat: unit.lat, lng: unit.lng }, number: String(index + 1).padStart(2, '0'),
      type: `${unit.tipo} real · espera simulada`, tone: unit.total === null ? 'unknown' : 'simulation', statusText: unit.total ? range(unit.total) : 'S/ total',
      label: `${unit.nome}. Espera simulada. ${unit.deslocamento === null ? 'Sem caminho disponível' : `Deslocamento ${duration(unit.deslocamento)}`}. Total ${range(unit.total)}. Ver trajeto.`,
      opensDialog: false,
    };
  }), selectedId);
}

function renderRoads() {
  const selected = comparison?.resultados.find(unit => unit.id === selectedId);
  const visible = roads.filter(road => blocked.has(road.id) || selected?.trechos_osm.includes(road.id));
  document.querySelector('#sim-roads')!.innerHTML = visible.map(road => `<label class="sim-checkbox"><input type="checkbox" value="${escapeHtml(road.id)}" data-road="${escapeHtml(road.id)}" ${blocked.has(road.id) ? 'checked' : ''}><span>${escapeHtml(road.nome)}<small>Trecho OSM ${escapeHtml(road.id)}</small></span></label>`).join('');
}

function fillWaitEditor() {
  const unit = scenario?.unidades.find(item => item.id === waitUnit.value);
  if (!unit) return;
  const wait = Object.hasOwn(waits, unit.id) ? waits[unit.id] : unit.espera;
  noWait.checked = wait === null;
  minInput.value = wait ? String(wait[0]) : '';
  maxInput.value = wait ? String(wait[1]) : '';
  minInput.disabled = maxInput.disabled = noWait.checked;
  editStatus.textContent = '';
}

async function refresh(loadScenario = false) {
  const version = ++requestVersion;
  controller?.abort();
  const currentController = controller = new AbortController();
  const timeout = setTimeout(() => currentController.abort(), 120_000);
  comparison = null;
  resultList.innerHTML = '';
  resultList.setAttribute('aria-busy', 'true');
  status.textContent = loadScenario ? 'Carregando cenário…' : 'Calculando trajetos e tempos totais…';
  errorPanel.hidden = true;
  document.querySelector<HTMLButtonElement>('#sim-fit')!.disabled = true;
  cityMap?.update([], null);
  updateRoute();
  try {
    if (loadScenario || !scenario) {
      scenario = await fetchJson<Scenario>('/api/cenario', currentController.signal);
      if (version !== requestVersion) return;
      origin = scenario.origem_padrao;
      originSelect.innerHTML = scenario.pontos.map(point => `<option value="${escapeHtml(point.id)}">${escapeHtml(point.nome)}</option>`).join('');
      originSelect.value = origin;
      originSelect.disabled = false;
      locateButton.disabled = false;
      waitUnit.innerHTML = scenario.unidades.map(unit => `<option value="${escapeHtml(unit.id)}">${escapeHtml(unit.nome)}</option>`).join('');
      waitUnit.disabled = false;
      fillWaitEditor();
      document.querySelector<HTMLButtonElement>('#sim-apply')!.disabled = false;
      document.querySelector<HTMLButtonElement>('#sim-reset')!.disabled = false;
      document.querySelector('#sim-reference')!.textContent = `Relógio fixo do cenário: ${date(scenario.referencia)} (Brasília).`;
      document.querySelector('#sim-source')!.textContent = scenario.fonte;
      document.querySelector('#sim-osm-meta')!.textContent = `Extração OSM: ${date(scenario.osm_atualizado_em)}. ${scenario.vertices.toLocaleString('pt-BR')} nós e ${scenario.arestas.toLocaleString('pt-BR')} conexões dirigidas.`;
      if (!cityMap) {
        try {
          cityMap = initMap(document.querySelector<HTMLElement>('#sim-map')!, {
            center: scenario.pontos[0], zoom: 12, overlayControls: false, name: 'São Paulo · ruas reais',
          }, showMapStatus, id => selectUnit(id));
        } catch {
          mapFeedback.textContent = 'O mapa não pôde ser iniciado. Consulte a comparação e o caminho em texto.';
        }
      }
    }
    const result = await fetchJson<Comparison>('/api/comparar', currentController.signal, { origem: gps ?? origin, bloqueadas: [...blocked], esperas: waits });
    if (version !== requestVersion) return;
    comparison = result;
    roads = result.ruas;
    selectedId = result.resultados.some(unit => unit.id === selectedId) ? selectedId : result.resultados.find(unit => unit.total !== null)?.id ?? result.resultados[0]?.id ?? null;
    renderResults();
    renderRoads();
    updateRoute(!loadScenario);
    if (loadScenario) updateNetwork(true, true);
    status.textContent = `${result.resultados.filter(unit => unit.total !== null).length} unidades com tempo total disponível · ${blocked.size} ruas bloqueadas.`;
    document.querySelector<HTMLButtonElement>('#sim-fit')!.disabled = !cityMap;
    if (gps) locationStatus.textContent = `Origem: sua localização · precisão aproximada de ${Math.round(gpsAccuracy ?? 0)} m. Ajuste até o acesso viário: ${Math.round(result.acesso_origem_metros)} m.`;
  } catch (error) {
    if (version !== requestVersion) return;
    status.textContent = 'Comparação indisponível. Os resultados anteriores foram removidos.';
    errorPanel.hidden = false;
    document.querySelector('#sim-error-message')!.textContent = currentController.signal.aborted ? 'O cálculo demorou mais que o esperado. Tente novamente.' : error instanceof Error ? error.message : 'Não foi possível calcular os trajetos.';
  } finally {
    clearTimeout(timeout);
    if (version === requestVersion) resultList.setAttribute('aria-busy', 'false');
  }
}

originSelect.addEventListener('change', () => { ++locationVersion; locateButton.disabled = false; origin = originSelect.value; gps = null; cityMap?.setUserLocation(null); locationStatus.textContent = 'Origem escolhida na lista.'; void refresh(); });
locateButton.addEventListener('click', async () => {
  const version = ++locationVersion;
  locateButton.disabled = true;
  locationStatus.textContent = 'Obtendo sua localização…';
  try {
    const position = await getBrowserLocation();
    if (version !== locationVersion) return;
    gps = { lat: position.lat, lng: position.lng };
    gpsAccuracy = position.accuracy;
    locationStatus.textContent = `Localização obtida · precisão aproximada de ${Math.round(position.accuracy)} m.`;
    cityMap?.setUserLocation(gps, { center: true, accuracy: gpsAccuracy });
    originSelect.selectedIndex = -1;
    await refresh();
  } catch (error) {
    if (version === locationVersion) locationStatus.textContent = error instanceof Error ? error.message : 'Localização indisponível.';
  } finally {
    if (version === locationVersion) locateButton.disabled = false;
  }
});
waitUnit.addEventListener('change', fillWaitEditor);
noWait.addEventListener('change', () => { minInput.disabled = maxInput.disabled = noWait.checked; });
resultList.addEventListener('click', event => {
  const button = (event.target as Element).closest<HTMLButtonElement>('[data-route]');
  if (button?.dataset.route) selectUnit(button.dataset.route);
});
document.querySelector('#sim-roads')!.addEventListener('change', event => {
  const checkbox = event.target as HTMLInputElement;
  if (!checkbox.dataset.road) return;
  if (checkbox.checked) blocked.add(checkbox.value); else blocked.delete(checkbox.value);
  void refresh();
});
document.querySelector('#sim-wait-form')!.addEventListener('submit', event => {
  event.preventDefault();
  const min = Number(minInput.value);
  const max = Number(maxInput.value);
  if (!noWait.checked && (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || min > max)) {
    editStatus.textContent = 'Informe um mínimo não negativo e um máximo maior ou igual ao mínimo.';
    return;
  }
  waits[waitUnit.value] = noWait.checked ? null : [min, max];
  editStatus.textContent = 'Espera alterada nesta sessão.';
  void refresh();
});
document.querySelector('#sim-reset')!.addEventListener('click', () => {
  if (!scenario) return;
  blocked = new Set(); waits = {}; selectedId = null; origin = scenario.origem_padrao; gps = null;
  ++locationVersion; locateButton.disabled = false;
  cityMap?.setUserLocation(null); locationStatus.textContent = '';
  originSelect.value = origin;
  document.querySelectorAll<HTMLInputElement>('[data-road]').forEach(input => { input.checked = false; });
  fillWaitEditor();
  void refresh();
});
document.querySelector('#sim-retry')!.addEventListener('click', () => { void refresh(!scenario); });
document.querySelector('#sim-fit')!.addEventListener('click', () => updateNetwork(true, true));
document.querySelector('#sim-map-retry')!.addEventListener('click', () => cityMap?.retry());
void refresh(true);
