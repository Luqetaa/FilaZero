import type { HealthUnit, QueueLevel, UnitType } from '../types.ts';

const source = 'Cadastro SMS-SP / SES-SP';
const city = 'São Paulo';
const sim = (queueLevel: Exclude<QueueLevel, 'unknown'>, minutes: number, updatedAt: string): HealthUnit['data'] => ({
  status: 'available',
  queueLevel,
  estimatedWait: { min: minutes, max: minutes },
  updatedAt,
  source,
  simulated: true,
});
const staleData = (updatedAt: string): HealthUnit['data'] => ({
  status: 'stale',
  queueLevel: 'unknown',
  estimatedWait: null,
  updatedAt,
  source,
  simulated: true,
});
const unavailableData = (): HealthUnit['data'] => ({
  status: 'unavailable',
  queueLevel: 'unknown',
  estimatedWait: null,
  updatedAt: null,
  source,
  simulated: true,
});

export const mapReference = {
  name: 'São Paulo',
  center: { lat: -23.56, lng: -46.62 },
  zoom: 12,
};

const units: HealthUnit[] = [
  {
    id: 'conjunto-hospitalar-mandaqui',
    name: 'Conjunto Hospitalar do Mandaqui',
    type: 'Hospital',
    address: 'Rua Voluntários da Pátria, 4301',
    neighborhood: 'Mandaqui',
    city,
    location: { lat: -23.48498, lng: -46.63144 },
    description: 'Hospital geral e de ensino da rede estadual (SES-SP), referência em urgência, emergência e trauma na Zona Norte.',
    openingHours: 'Pronto-socorro 24 horas',
    data: sim('moderate', 32, '2026-11-14T22:48:00-03:00'),
  },
  {
    id: 'hospital-campo-limpo',
    name: 'Hospital Municipal Dr. Fernando Mauro Pires da Rocha (Campo Limpo)',
    type: 'Hospital',
    address: 'Estrada de Itapecerica da Serra, 1661',
    neighborhood: 'Campo Limpo',
    city,
    location: { lat: -23.6491, lng: -46.749 },
    description: 'Hospital geral municipal (SMS-SP) com pronto-socorro 24 horas, maternidade e atendimento de urgência na Zona Sul.',
    openingHours: 'Pronto-socorro 24 horas',
    data: sim('high', 65, '2026-11-14T22:41:00-03:00'),
  },
  {
    id: 'hospital-das-clinicas',
    name: 'Hospital das Clínicas da FMUSP',
    type: 'Hospital',
    address: 'Av. Dr. Enéas Carvalho de Aguiar, 255',
    neighborhood: 'Cerqueira César',
    city,
    location: { lat: -23.55707, lng: -46.66885 },
    description: 'Complexo hospitalar universitário estadual de alta complexidade; o pronto-socorro atende prioritariamente casos graves e referenciados.',
    openingHours: '24 horas (urgência referenciada)',
    data: sim('high', 80, '2026-11-14T22:50:00-03:00'),
  },
  {
    id: 'hospital-grajau',
    name: 'Hospital Geral do Grajaú',
    type: 'Hospital',
    address: 'Rua Francisco Octávio Pacca, 180',
    neighborhood: 'Grajaú',
    city,
    location: { lat: -23.72903, lng: -46.69085 },
    description: 'Hospital geral estadual (SES-SP) com pronto-socorro 24 horas e maternidade no extremo sul de São Paulo.',
    openingHours: 'Pronto-socorro 24 horas',
    data: sim('high', 55, '2026-11-14T22:36:00-03:00'),
  },
  {
    id: 'hospital-jabaquara',
    name: 'Hospital Municipal Dr. Arthur Ribeiro de Saboya (Jabaquara)',
    type: 'Hospital',
    address: 'Av. Francisco de Paula Quintanilha Ribeiro, 860',
    neighborhood: 'Jabaquara',
    city,
    location: { lat: -23.65334, lng: -46.64568 },
    description: 'Hospital geral municipal (SMS-SP) com pronto-socorro 24 horas na região do Jabaquara, Zona Sul.',
    openingHours: 'Pronto-socorro 24 horas',
    data: sim('moderate', 28, '2026-11-14T22:44:00-03:00'),
  },
  {
    id: 'hospital-mario-degni',
    name: 'Hospital Municipal Prof. Mário Degni (Jardim Sarah)',
    type: 'Hospital',
    address: 'Rua Lucas de Leyde, 257',
    neighborhood: 'Rio Pequeno',
    city,
    location: { lat: -23.57775, lng: -46.76484 },
    description: 'Hospital geral e maternidade municipal (SMS-SP) com pronto-socorro 24 horas na Zona Oeste.',
    openingHours: 'Pronto-socorro 24 horas',
    data: sim('low', 14, '2026-11-14T22:51:00-03:00'),
  },
  {
    id: 'hospital-sao-paulo',
    name: 'Hospital São Paulo (UNIFESP)',
    type: 'Hospital',
    address: 'Rua Napoleão de Barros, 715',
    neighborhood: 'Vila Clementino',
    city,
    location: { lat: -23.59778, lng: -46.64353 },
    description: 'Hospital universitário com atendimento pelo SUS; a Unidade de Emergência Referenciada prioriza casos graves e encaminhamentos regulados.',
    openingHours: '24 horas (urgência referenciada)',
    data: staleData('2026-11-14T16:15:00-03:00'),
  },
  {
    id: 'hospital-tatuape',
    name: 'Hospital Municipal Dr. Cármino Caricchio (Tatuapé)',
    type: 'Hospital',
    address: 'Av. Celso Garcia, 4815',
    neighborhood: 'Tatuapé',
    city,
    location: { lat: -23.53295, lng: -46.56644 },
    description: 'Hospital geral municipal (SMS-SP) com pronto-socorro 24 horas, referência em trauma, ortopedia e queimados na Zona Leste.',
    openingHours: 'Pronto-socorro 24 horas',
    data: sim('high', 70, '2026-11-14T22:47:00-03:00'),
  },
  {
    id: 'hospital-tide-setubal',
    name: 'Hospital Municipal Tide Setúbal',
    type: 'Hospital',
    address: 'Rua Dr. José Guilherme Eiras, 123',
    neighborhood: 'São Miguel Paulista',
    city,
    location: { lat: -23.49718, lng: -46.44008 },
    description: 'Hospital geral municipal (SMS-SP) com pronto-socorro adulto e infantil 24 horas na Zona Leste.',
    openingHours: 'Pronto-socorro 24 horas',
    data: sim('moderate', 38, '2026-11-14T22:39:00-03:00'),
  },
  {
    id: 'hospital-vila-nova-cachoeirinha',
    name: 'Hospital Geral de Vila Nova Cachoeirinha',
    type: 'Hospital',
    address: 'Av. Deputado Emílio Carlos, 3000',
    neighborhood: 'Vila Nova Cachoeirinha',
    city,
    location: { lat: -23.48135, lng: -46.67179 },
    description: 'Hospital geral estadual (SES-SP) com pronto-socorro 24 horas adulto e infantil na Zona Norte.',
    openingHours: 'Pronto-socorro 24 horas',
    data: sim('low', 15, '2026-11-14T22:52:00-03:00'),
  },
  {
    id: 'ubs-butanta',
    name: 'UBS Butantã (Vila Gomes)',
    type: 'UBS',
    address: 'Rua Cabral de Menezes, 51',
    neighborhood: 'Vila Gomes',
    city,
    location: { lat: -23.57705, lng: -46.73399 },
    description: 'Unidade Básica de Saúde da rede municipal (SMS-SP) com atenção primária, vacinação e acompanhamento clínico no Butantã.',
    openingHours: 'Segunda a sexta-feira, 7h às 19h',
    data: sim('low', 10, '2026-11-14T22:49:00-03:00'),
  },
  {
    id: 'ubs-casa-verde',
    name: 'UBS Casa Verde',
    type: 'UBS',
    address: 'Rua Vichy, 468',
    neighborhood: 'Casa Verde',
    city,
    location: { lat: -23.50446, lng: -46.65994 },
    description: 'Unidade Básica de Saúde da rede municipal (SMS-SP) na Zona Norte, com consultas agendadas, vacinação e farmácia.',
    openingHours: 'Segunda a sexta-feira, 7h às 19h',
    data: sim('low', 8, '2026-11-14T22:45:00-03:00'),
  },
  {
    id: 'ubs-indianopolis',
    name: 'UBS Indianópolis (Sigmund Freud)',
    type: 'UBS',
    address: 'Av. dos Carinás, 525',
    neighborhood: 'Indianópolis',
    city,
    location: { lat: -23.61406, lng: -46.66526 },
    description: 'Unidade Básica de Saúde da rede municipal (SMS-SP) na região de Moema e Indianópolis.',
    openingHours: 'Segunda a sexta-feira, 7h às 19h',
    data: sim('low', 12, '2026-11-14T22:53:00-03:00'),
  },
  {
    id: 'ubs-jardim-edite',
    name: 'UBS Jardim Edite (Gerôncio Henrique Neto)',
    type: 'UBS',
    address: 'Rua Charles Coulomb, 80',
    neighborhood: 'Cidade Monções',
    city,
    location: { lat: -23.61322, lng: -46.69424 },
    description: 'Unidade Básica de Saúde da rede municipal (SMS-SP) na região do Brooklin e Itaim Bibi.',
    openingHours: 'Segunda a sexta-feira, 7h às 19h',
    data: unavailableData(),
  },
  {
    id: 'ubs-jardim-sapopemba',
    name: 'UBS Jardim Sapopemba',
    type: 'UBS',
    address: 'Rua João Lopes de Lima, 1151',
    neighborhood: 'Jardim Sapopemba',
    city,
    location: { lat: -23.61147, lng: -46.49332 },
    description: 'Unidade Básica de Saúde da rede municipal (SMS-SP) em complexo que também abriga a AMA Sapopemba 24h.',
    openingHours: 'Segunda a sexta-feira, 7h às 19h (AMA 24h no complexo)',
    data: sim('moderate', 24, '2026-11-14T22:40:00-03:00'),
  },
  {
    id: 'ubs-mooca',
    name: 'UBS Mooca I',
    type: 'UBS',
    address: 'Rua Taquari, 549',
    neighborhood: 'Mooca',
    city,
    location: { lat: -23.55043, lng: -46.59961 },
    description: 'Unidade Básica de Saúde da rede municipal (SMS-SP) na Mooca, com atenção primária, vacinação e farmácia.',
    openingHours: 'Segunda a sexta-feira, 7h às 19h',
    data: sim('low', 9, '2026-11-14T22:50:00-03:00'),
  },
  {
    id: 'ubs-sao-vicente-paula',
    name: 'UBS São Vicente de Paula (AMA/UBS Integrada)',
    type: 'UBS',
    address: 'Rua Vicente da Costa, 289',
    neighborhood: 'Ipiranga',
    city,
    location: { lat: -23.59009, lng: -46.60929 },
    description: 'Unidade integrada de atenção básica e pronto atendimento ambulatorial (AMA/UBS) da rede municipal no Ipiranga.',
    openingHours: 'Segunda a sexta-feira, 7h às 19h (AMA até sábado)',
    data: sim('moderate', 22, '2026-11-14T22:43:00-03:00'),
  },
  {
    id: 'ubs-se',
    name: 'UBS Sé',
    type: 'UBS',
    address: 'Rua Frederico Alvarenga, 259',
    neighborhood: 'Sé',
    city,
    location: { lat: -23.55121, lng: -46.62833 },
    description: 'Unidade Básica de Saúde da rede municipal (SMS-SP) na região central, próxima ao Parque Dom Pedro II.',
    openingHours: 'Segunda a sexta-feira, 7h às 19h',
    data: sim('moderate', 19, '2026-11-14T22:46:00-03:00'),
  },
  {
    id: 'ubs-vila-guilherme',
    name: 'UBS Vila Guilherme (AMA/UBS Integrada)',
    type: 'UBS',
    address: 'Rua João Ventura Batista, 615',
    neighborhood: 'Vila Guilherme',
    city,
    location: { lat: -23.51623, lng: -46.60539 },
    description: 'Unidade Básica de Saúde integrada à AMA da rede municipal (SMS-SP) na Vila Guilherme, Zona Norte.',
    openingHours: 'Segunda a sábado, 7h às 19h',
    data: sim('low', 11, '2026-11-14T22:42:00-03:00'),
  },
  {
    id: 'ubs-vila-prudente',
    name: 'UBS Vila Prudente',
    type: 'UBS',
    address: 'Praça Centenário de Vila Prudente, 108',
    neighborhood: 'Vila Prudente',
    city,
    location: { lat: -23.58213, lng: -46.58283 },
    description: 'Unidade Básica de Saúde da rede municipal (SMS-SP) na Vila Prudente, Zona Leste.',
    openingHours: 'Segunda a sexta-feira, 7h às 19h',
    data: staleData('2026-11-14T15:40:00-03:00'),
  },
  {
    id: 'upa-carrao',
    name: 'UPA Carrão (Masataka Ota)',
    type: 'UPA',
    address: 'Av. Conselheiro Carrão, 2893',
    neighborhood: 'Carrão',
    city,
    location: { lat: -23.54992, lng: -46.53398 },
    description: 'Unidade de Pronto Atendimento 24 horas (SMS-SP) para urgências e emergências de média complexidade na Zona Leste.',
    openingHours: '24 horas',
    data: sim('moderate', 35, '2026-11-14T22:48:00-03:00'),
  },
  {
    id: 'upa-city-jaragua',
    name: 'UPA City Jaraguá',
    type: 'UPA',
    address: 'Estrada das Taipas, 1650',
    neighborhood: 'Jaraguá',
    city,
    location: { lat: -23.44155, lng: -46.73374 },
    description: 'Unidade de Pronto Atendimento 24 horas (SMS-SP) na região do Jaraguá, Zona Norte.',
    openingHours: '24 horas',
    data: sim('low', 12, '2026-11-14T22:51:00-03:00'),
  },
  {
    id: 'upa-itaquera',
    name: 'UPA Itaquera (26 de Agosto)',
    type: 'UPA',
    address: 'Av. Miguel Ignácio Curi, 44',
    neighborhood: 'Itaquera',
    city,
    location: { lat: -23.54431, lng: -46.46402 },
    description: 'Unidade de Pronto Atendimento 24 horas (SMS-SP) para atendimento de urgências clínicas e pediátricas em Itaquera.',
    openingHours: '24 horas',
    data: sim('high', 58, '2026-11-14T22:44:00-03:00'),
  },
  {
    id: 'upa-jacana',
    name: 'UPA Jaçanã',
    type: 'UPA',
    address: 'Rua Ester Elisa, 229',
    neighborhood: 'Jaçanã',
    city,
    location: { lat: -23.45936, lng: -46.57979 },
    description: 'Unidade de Pronto Atendimento 24 horas (SMS-SP) na região do Jaçanã, Zona Norte.',
    openingHours: '24 horas',
    data: sim('moderate', 27, '2026-11-14T22:47:00-03:00'),
  },
  {
    id: 'upa-julio-tupy',
    name: 'UPA Júlio Tupy',
    type: 'UPA',
    address: 'Rua Serra da Queimada, 800',
    neighborhood: 'Guaianases',
    city,
    location: { lat: -23.53019, lng: -46.41269 },
    description: 'Unidade de Pronto Atendimento 24 horas (SMS-SP) no extremo leste de São Paulo.',
    openingHours: '24 horas',
    data: sim('high', 62, '2026-11-14T22:38:00-03:00'),
  },
  {
    id: 'upa-lapa',
    name: 'UPA Lapa (Prof. João Catarin Mezomo)',
    type: 'UPA',
    address: 'Av. Queiroz Filho, 313',
    neighborhood: 'Vila Hamburguesa',
    city,
    location: { lat: -23.53726, lng: -46.72252 },
    description: 'Unidade de Pronto Atendimento 24 horas (SMS-SP) na região da Lapa, Zona Oeste.',
    openingHours: '24 horas',
    data: sim('low', 13, '2026-11-14T22:52:00-03:00'),
  },
  {
    id: 'upa-pirituba',
    name: 'UPA Pirituba',
    type: 'UPA',
    address: 'Av. Menotti Laudísio, 100',
    neighborhood: 'Pirituba',
    city,
    location: { lat: -23.48453, lng: -46.72752 },
    description: 'Unidade de Pronto Atendimento 24 horas (SMS-SP) junto ao complexo hospitalar de Pirituba.',
    openingHours: '24 horas',
    data: sim('moderate', 26, '2026-11-14T22:41:00-03:00'),
  },
  {
    id: 'upa-santo-amaro',
    name: 'UPA Santo Amaro',
    type: 'UPA',
    address: 'Rua Carlos Gomes, 661',
    neighborhood: 'Santo Amaro',
    city,
    location: { lat: -23.65378, lng: -46.70136 },
    description: 'Unidade de Pronto Atendimento 24 horas (SMS-SP) na região de Santo Amaro, Zona Sul.',
    openingHours: '24 horas',
    data: sim('high', 48, '2026-11-14T22:49:00-03:00'),
  },
  {
    id: 'upa-vera-cruz',
    name: 'UPA Vera Cruz',
    type: 'UPA',
    address: 'Av. dos Funcionários Públicos, 379',
    neighborhood: 'Jardim Ângela',
    city,
    location: { lat: -23.73497, lng: -46.7815 },
    description: 'Unidade de Pronto Atendimento 24 horas (SMS-SP) na região do Jardim Ângela e M’Boi Mirim, Zona Sul.',
    openingHours: '24 horas',
    data: unavailableData(),
  },
  {
    id: 'upa-vergueiro',
    name: 'UPA Vergueiro',
    type: 'UPA',
    address: 'Rua Vergueiro, 613',
    neighborhood: 'Liberdade',
    city,
    location: { lat: -23.56743, lng: -46.63965 },
    description: 'Unidade de Pronto Atendimento 24 horas (SMS-SP) na região central de São Paulo.',
    openingHours: '24 horas',
    data: sim('moderate', 18, '2026-11-14T22:53:00-03:00'),
  },
];

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
  const rounded = Math.max(1, Math.round(minutes));
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
