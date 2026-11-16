import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import { setWorkerUrl } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import { minimalMapStyle } from './mapStyle.ts';

setWorkerUrl(maplibreWorkerUrl);

export type MapStatus = 'loading' | 'ready' | 'partial' | 'error';
export interface MapPoint {
  id: string;
  location: { lat: number; lng: number };
  number: string;
  type: string;
  tone: string;
  statusText: string;
  label: string;
  opensDialog?: boolean;
}
export interface SimulationNetwork {
  pontos: { id: string; nome: string; lat: number; lng: number }[];
  ruas: { id: string; nome: string; geometria: [number, number][] }[];
  bloqueadas: string[];
  origem: string;
  caminho: [number, number][];
}
export interface CityMap {
  update(points: MapPoint[], selectedId: string | null): void;
  select(id: string | null): void;
  retry(): void;
  getCenter(): { lat: number; lng: number };
  setUserLocation(location: { lat: number; lng: number } | null, options?: { center?: boolean; manual?: boolean; accuracy?: number | null }): void;
  setSimulation(network: SimulationNetwork, fit?: boolean): void;
}

export function initMap(
  container: HTMLElement,
  reference: { center: { lat: number; lng: number }; zoom: number; overlayControls?: boolean; name?: string },
  onStatus: (status: MapStatus) => void,
  onSelect: (id: string, trigger: HTMLButtonElement) => void,
  onMove?: (center: { lat: number; lng: number }) => void,
  onUserPan?: () => void,
  onMapClick?: (location: { lat: number; lng: number }) => void,
): CityMap {
  const map = L.map(container, {
    attributionControl: false,
    zoomControl: false,
    minZoom: 1,
    maxZoom: 19,
    scrollWheelZoom: false,
    zoomAnimation: false,
    fadeAnimation: false,
    markerZoomAnimation: false,
    inertia: false,
  });
  let tiles: L.MaplibreGL | null = null;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let attempt = 0;
  let userMarker: L.Marker | null = null;
  let accuracyCircle: L.Circle | null = null;
  const simulationLayer = L.layerGroup().addTo(map);
  const markers = new Map<string, { marker: L.Marker; button: HTMLButtonElement }>();

  function centerAt(location: { lat: number; lng: number }, zoom = map.getZoom()) {
    map.setView([location.lat, location.lng], zoom, { animate: false });
    if (reference.overlayControls !== false && container.clientWidth > 900) {
      map.panBy([-Math.min(200, Math.round(container.clientWidth * 0.14)), -30], { animate: false });
    }
  }

  function setUserLocation(location: { lat: number; lng: number } | null, options?: { center?: boolean; manual?: boolean; accuracy?: number | null }) {
    if (!location) {
      userMarker?.remove();
      userMarker = null;
      accuracyCircle?.remove();
      accuracyCircle = null;
      return;
    }
    if (options?.manual) {
      accuracyCircle?.remove();
      accuracyCircle = null;
    } else if (options?.accuracy != null && Number.isFinite(options.accuracy) && options.accuracy > 0) {
      if (!accuracyCircle) accuracyCircle = L.circle([location.lat, location.lng], { radius: options.accuracy, color: '#1355ff', weight: 1, fillOpacity: 0.1, interactive: false, className: 'location-accuracy' }).addTo(map);
      else accuracyCircle.setLatLng([location.lat, location.lng]).setRadius(options.accuracy);
    }
    if (!userMarker) {
      const markerEl = document.createElement('div');
      markerEl.className = 'user-location-marker';
      markerEl.setAttribute('role', 'img');
      markerEl.setAttribute('aria-label', 'Sua localização atual');
      markerEl.innerHTML = '<span class="user-location-halo" aria-hidden="true"></span><span class="user-location-core" aria-hidden="true"></span>';
      userMarker = L.marker([location.lat, location.lng], {
        pane: 'userLocationPane',
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          html: markerEl,
          className: 'user-location-icon',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        }),
      }).addTo(map);
    } else {
      userMarker.setLatLng([location.lat, location.lng]);
    }
    userMarker.getElement()?.querySelector('.user-location-marker')?.setAttribute('aria-label', options?.manual ? 'Origem escolhida no mapa' : 'Sua localização atual');
    if (options?.center) {
      centerAt(location, Math.max(map.getZoom(), 13));
    }
  }

  function ensureMarkerVisible(marker: L.Marker) {
    const size = map.getSize();
    if (!size.x || !size.y) return;
    if (reference.overlayControls === false) return;
    const desktop = size.x > 900;
    const left = desktop ? 420 : 28;
    const top = desktop ? 116 : 150;
    const right = size.x - 56;
    const bottom = desktop ? size.y - 96 : size.y - 180;
    if (left >= right || top >= bottom) return;
    const pos = map.latLngToContainerPoint(marker.getLatLng());
    const dx = pos.x < left ? pos.x - left : pos.x > right ? pos.x - right : 0;
    const dy = pos.y < top ? pos.y - top : pos.y > bottom ? pos.y - bottom : 0;
    if (dx || dy) map.panBy([dx, dy], { animate: false });
  }

  function select(id: string | null) {
    for (const [key, { marker, button }] of markers) {
      const selected = key === id;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
      marker.setZIndexOffset(selected ? 1000 : 0);
      if (selected) ensureMarkerVisible(marker);
    }
  }

  function retry() {
    const currentAttempt = ++attempt;
    clearTimeout(timeout);
    tiles?.remove();
    tiles = null;
    let loaded = 0;
    let failed = 0;
    let ready = false;
    const reportFailure = () => onStatus(loaded ? 'partial' : 'error');
    const armTimeout = () => {
      clearTimeout(timeout);
      if (ready) return;
      timeout = setTimeout(() => {
        if (currentAttempt !== attempt) return;
        if (loaded) {
          onStatus('partial');
          return;
        }
        ++attempt;
        tiles?.remove();
        tiles = null;
        onStatus('error');
      }, 20_000);
    };

    onStatus('loading');
    armTimeout();

    try {
      tiles = maplibreGL({
        style: minimalMapStyle,
        interactive: false,
      });
      tiles.addTo(map);
    } catch {
      clearTimeout(timeout);
      tiles = null;
      onStatus('error');
      return;
    }

    const glMap = tiles.getMaplibreMap();
    glMap.on('dataloading', () => {
      if (currentAttempt !== attempt) return;
      if (failed) reportFailure();
      else if (!ready) {
        onStatus('loading');
        armTimeout();
      }
    });
    glMap.on('sourcedata', event => {
      if (currentAttempt !== attempt) return;
      if (event.tile) {
        ++loaded;
        if (failed) reportFailure();
      }
    });
    glMap.on('error', () => {
      if (currentAttempt !== attempt) return;
      ++failed;
      reportFailure();
    });
    glMap.on('idle', () => {
      if (currentAttempt !== attempt) return;
      clearTimeout(timeout);
      if (failed) reportFailure();
      else {
        ready = true;
        onStatus('ready');
      }
    });
  }

  try {
    L.control.zoom({ position: 'topright', zoomInTitle: 'Aumentar zoom', zoomOutTitle: 'Diminuir zoom' }).addTo(map);
    const pane = map.getPane('markerPane')!;
    pane.setAttribute('role', 'group');
    pane.setAttribute('aria-label', `Unidades de saúde no mapa de ${reference.name ?? 'São Paulo'}`);
    const userPane = map.createPane('userLocationPane');
    userPane.style.zIndex = '610';
    userPane.style.pointerEvents = 'none';
    centerAt(reference.center, reference.zoom);
    retry();
    map.on('dragstart', () => onUserPan?.());
    map.on('click', event => onMapClick?.({ lat: event.latlng.lat, lng: event.latlng.lng }));
    map.on('moveend', () => {
      const center = map.getCenter();
      onMove?.({ lat: center.lat, lng: center.lng });
    });

    return {
      retry,
      select,
      setUserLocation,
      getCenter() {
        const center = map.getCenter();
        return { lat: center.lat, lng: center.lng };
      },
      setSimulation(network, fit = false) {
        simulationLayer.clearLayers();
        const points = new Map(network.pontos.map(point => [point.id, point]));
        const coordinates = (id: string): L.LatLngTuple => {
          const point = points.get(id)!;
          return [point.lat, point.lng];
        };
        for (const road of network.ruas.filter(road => network.bloqueadas.includes(road.id))) {
          const line = L.polyline(road.geometria, {
            color: '#a52b39', weight: 4, opacity: 1, dashArray: '5 7',
            className: 'simulation-road is-blocked',
          }).addTo(simulationLayer);
          const label = document.createElement('span');
          label.textContent = `${road.nome} · trecho OSM ${road.id} · bloqueio simulado`;
          line.bindTooltip(label);
        }
        for (const point of network.pontos.filter(point => point.id === network.origem)) {
          const origin = point.id === network.origem;
          L.circleMarker(coordinates(point.id), {
            radius: origin ? 9 : 4, color: origin ? '#0A3CFF' : '#536479',
            fillColor: origin ? '#0A3CFF' : '#fff', fillOpacity: 1, weight: origin ? 3 : 2,
          }).addTo(simulationLayer);
        }
        const route = network.caminho;
        if (route.length > 1) {
          L.polyline(route, { color: '#fff', weight: 10, interactive: false }).addTo(simulationLayer);
          L.polyline(route, {
            color: '#0A3CFF', weight: 6, opacity: 1, interactive: false, className: 'simulation-route',
          }).addTo(simulationLayer);
        }
        if (fit) {
          const bounds = route.length > 1 ? route : network.pontos.map(point => coordinates(point.id));
          const desktop = container.clientWidth > 900;
          const padding: L.FitBoundsOptions = reference.overlayControls === false
            ? { padding: [52, 84] }
            : { paddingTopLeft: [desktop ? 460 : 64, desktop ? 170 : 190], paddingBottomRight: [84, desktop ? 120 : 180] };
          if (bounds.length) map.fitBounds(L.latLngBounds(bounds), { ...padding, maxZoom: 14, animate: false });
        }
      },
      update(points, selectedId) {
        const visibleIds = new Set(points.map(point => point.id));
        for (const [id, entry] of markers) {
          if (!visibleIds.has(id)) {
            entry.marker.remove();
            markers.delete(id);
          }
        }
        for (const point of points) {
          let entry = markers.get(point.id);
          if (!entry) {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.unit = point.id;
            button.innerHTML = '<span class="marker-pill"><i class="dot"></i><span class="marker-number"></span><span class="marker-type sr-only"></span><span class="marker-sep" aria-hidden="true">·</span><span class="marker-status-text"></span></span>';
            L.DomEvent.disableClickPropagation(button);
            L.DomEvent.on(button, 'keydown keyup', L.DomEvent.stopPropagation);
            button.addEventListener('click', () => onSelect(point.id, button));
            const marker = L.marker([point.location.lat, point.location.lng], {
              keyboard: false,
              autoPanOnFocus: false,
              icon: L.divIcon({ html: button, className: 'unit-map-icon', iconSize: [104, 44], iconAnchor: [52, 41] }),
            }).addTo(map);
            entry = { marker, button };
            markers.set(point.id, entry);
          }
          const { marker, button } = entry;
          marker.setLatLng([point.location.lat, point.location.lng]);
          button.className = `map-marker ${point.tone}`;
          button.setAttribute('aria-label', point.label);
          if (point.opensDialog) button.setAttribute('aria-haspopup', 'dialog');
          else button.removeAttribute('aria-haspopup');
          button.querySelector('.marker-number')!.textContent = point.number;
          button.querySelector('.marker-type')!.textContent = point.type;
          button.querySelector('.dot')!.className = `dot ${point.tone}`;
          button.querySelector('.marker-status-text')!.textContent = point.statusText;
        }
        select(selectedId);
      },
    };
  } catch (error) {
    ++attempt;
    clearTimeout(timeout);
    map.remove();
    throw error;
  }
}
