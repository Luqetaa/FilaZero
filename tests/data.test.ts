import test from 'node:test';
import assert from 'node:assert/strict';
import type { HealthUnit } from '../src/types.ts';
import { mapReference, listUnits, filterUnits, distanceKm, formatDistance, sortByNearest, estimateTravelMinutes, formatDuration, estimateUnitJourney, formatTotalDurationRange, formatWait, formatUpdatedAt, queueLabel } from '../src/data/units.ts';

test('o catálogo contém 30 unidades públicas reais de São Paulo com contrato válido', async () => {
  const units = await listUnits();
  assert.equal(units.length, 30);
  assert.equal(new Set(units.map(unit => unit.id)).size, 30);
  assert.equal(new Set(units.map(unit => unit.address)).size, 30);
  assert.deepEqual(new Set(units.map(unit => unit.type)), new Set(['UBS', 'UPA', 'Hospital']));
  assert.equal(units.filter(unit => unit.type === 'UBS').length, 10);
  assert.equal(units.filter(unit => unit.type === 'UPA').length, 10);
  assert.equal(units.filter(unit => unit.type === 'Hospital').length, 10);

  for (const unit of units) {
    assert.match(unit.id, /^[a-z0-9]+(?:-[a-z0-9]+)+$/);
    assert.doesNotMatch(unit.name, /fictíci|demo/i);
    assert.doesNotMatch(unit.address, /fictíci/i);
    assert.ok(unit.description.length > 20);
    assert.ok(unit.openingHours.length > 0);
    assert.ok(unit.neighborhood.length > 0);
    assert.equal(unit.city, 'São Paulo');
    assert.deepEqual(Object.keys(unit.location).sort(), ['lat', 'lng']);
    assert.ok(Number.isFinite(unit.location.lat) && unit.location.lat >= -23.85 && unit.location.lat <= -23.35);
    assert.ok(Number.isFinite(unit.location.lng) && unit.location.lng >= -46.83 && unit.location.lng <= -46.36);
    assert.equal(unit.data.simulated, true);
    assert.ok(['available', 'stale', 'unavailable'].includes(unit.data.status));
    if (unit.data.status === 'available') {
      assert.ok(['low', 'moderate', 'high'].includes(unit.data.queueLevel));
      assert.ok(unit.data.estimatedWait !== null && unit.data.estimatedWait.min >= 1 && unit.data.estimatedWait.max >= unit.data.estimatedWait.min);
      assert.ok(typeof unit.data.updatedAt === 'string' && !Number.isNaN(Date.parse(unit.data.updatedAt)));
    } else {
      assert.equal(unit.data.queueLevel, 'unknown');
      assert.equal(unit.data.estimatedWait, null);
      if (unit.data.status === 'stale') {
        assert.ok(typeof unit.data.updatedAt === 'string' && !Number.isNaN(Date.parse(unit.data.updatedAt)));
      } else {
        assert.equal(unit.data.updatedAt, null);
      }
    }
    assert.ok(unit.data.source.length > 0);
    assert.match(unit.data.source, /SMS-SP|SES-SP/i);
  }
});

test('referência São Paulo e unidades reais cobrem a cidade com espaçamento entre marcadores', async () => {
  assert.deepEqual(mapReference, {
    name: 'São Paulo', center: { lat: -23.56, lng: -46.62 }, zoom: 12,
  });
  const units = await listUnits();
  const latitudes = units.map(unit => unit.location.lat);
  const longitudes = units.map(unit => unit.location.lng);
  const kmPerDegreeLat = 111.32;
  const kmPerDegreeLng = kmPerDegreeLat * Math.cos(mapReference.center.lat * Math.PI / 180);
  const heightKm = (Math.max(...latitudes) - Math.min(...latitudes)) * kmPerDegreeLat;
  const widthKm = (Math.max(...longitudes) - Math.min(...longitudes)) * kmPerDegreeLng;
  assert.ok(heightKm >= 25, `altura esperada >= 25 km, recebeu ${heightKm.toFixed(1)}`);
  assert.ok(widthKm >= 25, `largura esperada >= 25 km, recebeu ${widthKm.toFixed(1)}`);
  for (let i = 0; i < units.length; i++) {
    const { lat, lng } = units[i].location;
    for (const other of units.slice(i + 1)) {
      const distanceKm = Math.hypot(
        (lat - other.location.lat) * kmPerDegreeLat,
        (lng - other.location.lng) * kmPerDegreeLng,
      );
      assert.ok(distanceKm >= 1.0, `${units[i].id} e ${other.id} estão muito próximos (${distanceKm.toFixed(2)} km)`);
    }
  }
});

test('listUnits retorna uma Promise e cópias independentes, inclusive dos objetos internos', async () => {
  const promise = listUnits();
  assert.ok(promise instanceof Promise);
  const first = await promise;
  const expected = structuredClone(first);
  first[0].name = 'Alterado';
  first[0].location.lat = 0;
  first[0].data.status = 'available';
  first[0].data.estimatedWait = { min: 10, max: 20 };
  first.pop();
  assert.deepEqual(await listUnits(), expected);
});

test('busca por nome ou bairro ignora caixa, acentos e espaços externos', async () => {
  const units = await listUnits();
  for (const query of ['tatuape', '  TATUAPÉ  ', 'tatuape\u0301'.replace('e\u0301', 'é').normalize('NFD')]) {
    assert.deepEqual(filterUnits(units, query, 'all').map(unit => unit.id), ['hospital-tatuape']);
  }
  assert.deepEqual(filterUnits(units, 'indianopolis', 'all').map(unit => unit.id), ['ubs-indianopolis']);
  assert.deepEqual(filterUnits(units, 'vila mariana', 'all'), []);
});

test('busca combina tipo e texto e cobre resultados e entradas vazias', async () => {
  const units = await listUnits();
  assert.equal(filterUnits(units, 'tatuapé', 'Hospital').length, 1);
  assert.deepEqual(filterUnits(units, 'tatuapé', 'UPA'), []);
  for (const type of ['UBS', 'UPA', 'Hospital'] as const) {
    const filtered = filterUnits(units, '', type);
    assert.equal(filtered.length, 10);
    assert.ok(filtered.every(unit => unit.type === type));
  }
  assert.deepEqual(filterUnits(units, '', 'all'), units);
  assert.deepEqual(filterUnits(units, '   ', 'all'), units);
  assert.deepEqual(filterUnits(units, 'inexistente', 'all'), []);
  assert.deepEqual(filterUnits([], '', 'all'), []);
});

test('listagem e filtro ordenam alfabeticamente por nome sem mutar a entrada', async () => {
  const units = await listUnits();
  const reversed = [...units].reverse();
  const original = [...reversed];
  const result = filterUnits(reversed, '', 'all');
  assert.notEqual(result, reversed);
  assert.deepEqual(reversed, original);
  assert.deepEqual(result, units);
  for (let i = 1; i < result.length; i++) {
    assert.ok(result[i - 1].name.localeCompare(result[i].name, 'pt-BR', { sensitivity: 'base' }) <= 0);
  }
  assert.equal(result[0].id, 'conjunto-hospitalar-mandaqui');
});

test('unidades reais trazem tempos simulados variados e preservam estados desatualizados ou indisponíveis sem zero padrão', async () => {
  const units = await listUnits();
  const available = units.filter((u) => u.data.status === 'available');
  const stale = units.filter((u) => u.data.status === 'stale');
  const unavailable = units.filter((u) => u.data.status === 'unavailable');

  assert.ok(available.some((u) => u.data.queueLevel === 'low'));
  assert.ok(available.some((u) => u.data.queueLevel === 'moderate'));
  assert.ok(available.some((u) => u.data.queueLevel === 'high'));
  assert.ok(stale.length >= 1);
  assert.ok(unavailable.length >= 1);

  for (const unit of available) {
    assert.match(formatWait(unit), /^Espera estimada: \d+/);
    assert.match(formatUpdatedAt(unit), /^Última atualização: /);
  }
  for (const unit of stale) {
    assert.equal(queueLabel(unit), 'Fila desconhecida — dados desatualizados');
    assert.equal(formatWait(unit), 'Dados desatualizados; tempo de espera indisponível');
    assert.doesNotMatch(formatWait(unit), /\d|estimada/);
  }
  for (const unit of unavailable) {
    assert.equal(queueLabel(unit), 'Fila desconhecida — dados indisponíveis');
    assert.equal(formatWait(unit), 'Dados indisponíveis; tempo de espera indisponível');
    assert.doesNotMatch(formatWait(unit), /\d|minuto|estimada/);
  }
});

test('formatadores continuam tratando corretamente estados disponíveis, desatualizados e indisponíveis', async () => {
  const base = (await listUnits())[0];

  const available: HealthUnit = structuredClone(base);
  available.data = {
    status: 'available',
    queueLevel: 'low',
    estimatedWait: { min: 15, max: 30 },
    updatedAt: '2026-11-14T14:30:00-03:00',
    source: 'Integração oficial',
    simulated: false,
  };
  assert.equal(queueLabel(available), 'Fila baixa');
  assert.equal(formatWait(available), 'Espera estimada: 15 a 30 minutos');
  assert.equal(formatUpdatedAt(available), 'Última atualização: 14/11/2026 às 14:30 (UTC-03:00)');

  const exactWait = {
    ...available,
    data: { ...available.data, queueLevel: 'moderate' as const, estimatedWait: { min: 12, max: 12 } }
  };
  assert.equal(queueLabel(exactWait), 'Fila média');
  assert.equal(formatWait(exactWait), 'Espera estimada: 12 min');

  available.data.estimatedWait = null;
  assert.equal(formatWait(available), 'Tempo de espera indisponível');

  for (const status of ['stale', 'unavailable'] as const) {
    const changed: HealthUnit = structuredClone(base);
    changed.data = {
      status,
      queueLevel: 'low',
      estimatedWait: { min: 123, max: 456 },
      updatedAt: '2026-11-14T08:00:00-03:00',
      source: 'Fonte de teste',
      simulated: true,
    };
    assert.match(formatWait(changed), /tempo de espera indisponível/i);
    assert.doesNotMatch(formatWait(changed), /\d|minuto/);
    assert.match(queueLabel(changed), /Fila desconhecida/);
    const statusText = status === 'stale' ? /desatualizados/ : /indisponíveis/;
    for (const label of [formatWait(changed), queueLabel(changed), formatUpdatedAt(changed)]) {
      assert.match(label, statusText);
    }
    changed.data.updatedAt = null;
    assert.match(formatUpdatedAt(changed), statusText);
    assert.match(formatUpdatedAt(changed), /Horário de atualização não informado/);
  }
});

test('sortByNearest ordena por menor distância sem mutar a entrada e formata distâncias corretamente', async () => {
  const units = await listUnits();
  const originalIds = units.map(unit => unit.id);
  const origin = { lat: -23.5615, lng: -46.656 };

  const nearest = sortByNearest(units, origin);
  assert.deepEqual(units.map(unit => unit.id), originalIds);
  assert.equal(nearest.length, units.length);

  for (let i = 1; i < nearest.length; i++) {
    const prevDist = distanceKm(origin, nearest[i - 1].location);
    const currDist = distanceKm(origin, nearest[i].location);
    assert.ok(prevDist <= currDist + 1e-9);
  }

  assert.equal(distanceKm(origin, origin), 0);
  assert.equal(formatDistance(0), '< 50 m');
  assert.equal(formatDistance(0.03), '< 50 m');
  assert.equal(formatDistance(0.42), '400 m');
  assert.equal(formatDistance(0.98), '1,0 km');
  assert.equal(formatDistance(2.44), '2,4 km');
});

test('estimateUnitJourney soma tempo de espera ao deslocamento sem inventar espera quando indisponível', async () => {
  const base = (await listUnits())[0];
  const origin = base.location;

  const exact: HealthUnit = structuredClone(base);
  exact.data = {
    status: 'available',
    queueLevel: 'low',
    estimatedWait: { min: 15, max: 15 },
    updatedAt: '2026-11-14T14:30:00-03:00',
    source: 'Cadastro SMS-SP / SES-SP',
    simulated: true,
  };
  const sameSpot = estimateUnitJourney(exact, origin);
  assert.equal(sameSpot.travelMinutes, 1);
  assert.deepEqual(sameSpot.totalMinutes, { min: 16, max: 16 });
  assert.equal(formatTotalDurationRange(sameSpot.totalMinutes!), '16 min');

  const ranged: HealthUnit = structuredClone(base);
  ranged.location = { lat: base.location.lat + 0.04, lng: base.location.lng };
  ranged.data = {
    status: 'available',
    queueLevel: 'high',
    estimatedWait: { min: 45, max: 60 },
    updatedAt: '2026-11-14T14:30:00-03:00',
    source: 'Cadastro SMS-SP / SES-SP',
    simulated: true,
  };
  const farJourney = estimateUnitJourney(ranged, origin);
  const expectedTravel = estimateTravelMinutes(distanceKm(origin, ranged.location));
  assert.equal(farJourney.travelMinutes, expectedTravel);
  assert.deepEqual(farJourney.totalMinutes, { min: 45 + expectedTravel, max: 60 + expectedTravel });
  assert.equal(formatDuration(60), '1h');
  assert.equal(formatDuration(75), '1h 15 min');

  for (const status of ['stale', 'unavailable'] as const) {
    const missing: HealthUnit = structuredClone(base);
    missing.data = {
      status,
      queueLevel: 'unknown',
      estimatedWait: { min: 99, max: 99 },
      updatedAt: null,
      source: 'Cadastro SMS-SP / SES-SP',
      simulated: true,
    };
    const res = estimateUnitJourney(missing, origin);
    assert.equal(res.travelMinutes, 1);
    assert.equal(res.totalMinutes, null);
  }
});
