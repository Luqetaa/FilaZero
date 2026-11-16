import catalogue from '../../fila_zero/dados/unidades.json' with { type: 'json' };
import type { HealthUnit, QueueLevel, UnitType } from '../types.ts';

export const mapReference = {
  name: 'São Paulo',
  center: { lat: -23.56, lng: -46.62 },
  zoom: 12,
};

const units = catalogue as HealthUnit[];

export async function listUnits(): Promise<HealthUnit[]> {
  return filterUnits(structuredClone(units), '', 'all');
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export interface Coordinates {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;
const toRadians = (deg: number) => (deg * Math.PI) / 180;

export function filterUnits(units: HealthUnit[], query: string, type: UnitType | 'all'): HealthUnit[] {
  const search = normalize(query);
  return units
    .filter(unit => (type === 'all' || unit.type === type)
      && (normalize(unit.name).includes(search) || normalize(unit.neighborhood).includes(search)))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
}

export function distanceKm(from: Coordinates, to: Coordinates): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  if (km < 0.05) return '< 50 m';
  if (km < 1) {
    const meters = Math.round((km * 1000) / 50) * 50;
    return meters >= 1000 ? '1,0 km' : `${meters} m`;
  }
  return `${km.toFixed(1).replace('.', ',')} km`;
}

export function sortByNearest(list: HealthUnit[], origin: Coordinates): HealthUnit[] {
  return [...list].sort((a, b) => {
    const diff = distanceKm(origin, a.location) - distanceKm(origin, b.location);
    return Math.abs(diff) > 1e-6
      ? diff
      : a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
  });
}

export function estimateTravelMinutes(km: number): number {
  if (!Number.isFinite(km) || km <= 0) return 1;
  if (km <= 0.8) return Math.max(1, Math.round((km / 4.8) * 60));
  return Math.round(10 + ((km - 0.8) / 24) * 60);
}

export function formatDuration(minutes: number): string {
  const rounded = Math.max(0, Math.round(minutes));
  if (rounded < 60) return `${rounded} min`;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest} min`;
}

export interface UnitJourneyEstimate {
  distanceKm: number;
  travelMinutes: number;
  totalMinutes: { min: number; max: number } | null;
}

export function estimateUnitJourney(unit: HealthUnit, origin: Coordinates): UnitJourneyEstimate {
  const km = distanceKm(origin, unit.location);
  const travelMinutes = estimateTravelMinutes(km);
  if (unit.data.status !== 'available' || !unit.data.estimatedWait) {
    return { distanceKm: km, travelMinutes, totalMinutes: null };
  }
  return {
    distanceKm: km,
    travelMinutes,
    totalMinutes: {
      min: unit.data.estimatedWait.min + travelMinutes,
      max: unit.data.estimatedWait.max + travelMinutes,
    },
  };
}

export function formatTotalDurationRange(range: { min: number; max: number }): string {
  return range.min === range.max
    ? formatDuration(range.min)
    : `${formatDuration(range.min)} a ${formatDuration(range.max)}`;
}

export function formatWait(unit: HealthUnit): string {
  if (unit.data.status === 'stale') return 'Dados desatualizados; tempo de espera indisponível';
  if (unit.data.status === 'unavailable') {
    return unit.data.simulated
      ? 'Dados indisponíveis; tempo de espera indisponível'
      : 'Tempo de espera indisponível';
  }
  const wait = unit.data.estimatedWait;
  if (!wait) return 'Tempo de espera indisponível';
  return wait.min === wait.max
    ? `Espera estimada: ${wait.min} min`
    : `Espera estimada: ${wait.min} a ${wait.max} minutos`;
}

export function formatUpdatedAt(unit: HealthUnit): string {
  if (!unit.data.simulated && unit.data.status === 'unavailable' && !unit.data.updatedAt) {
    return 'Sem dados de fila em tempo real';
  }
  const prefix = unit.data.status === 'stale' ? 'Dados desatualizados. '
    : unit.data.status === 'unavailable' ? 'Dados indisponíveis. ' : '';
  if (!unit.data.updatedAt) return `${prefix}Horário de atualização não informado`;
  const date = new Date(unit.data.updatedAt);
  const day = date.toLocaleDateString('pt-BR', { timeZone: 'Etc/GMT+3' });
  const time = date.toLocaleTimeString('pt-BR', {
    timeZone: 'Etc/GMT+3', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  return `${prefix}Última atualização: ${day} às ${time} (UTC-03:00)`;
}

export function queueLabel(unit: HealthUnit): string {
  if (unit.data.status === 'stale') return 'Fila desconhecida — dados desatualizados';
  if (unit.data.status === 'unavailable') {
    return unit.data.simulated
      ? 'Fila desconhecida — dados indisponíveis'
      : 'Sem dados de fila em tempo real';
  }
  return {
    low: 'Fila baixa', moderate: 'Fila média', high: 'Fila alta', unknown: 'Fila desconhecida',
  }[unit.data.queueLevel];
}
