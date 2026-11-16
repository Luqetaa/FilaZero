export type Coordinates = { lat: number; lng: number };
export type Range = [number, number];
export type RoutePoint = Coordinates & { id: string; nome: string };
export type Road = { id: string; nome: string; geometria: [number, number][] };
export type RouteUnit = Coordinates & {
  id: string; nome: string; vertice: string; tipo: 'UBS' | 'UPA' | 'Hospital'; bairro: string;
  status: 'disponivel' | 'desatualizado' | 'indisponivel'; espera: Range | null;
  atualizado_em: string | null; endereco: string; acesso_metros: number | null; motivo_rota: string | null;
};
export type RouteResult = RouteUnit & {
  deslocamento: number | null; total: Range | null; pontuacao: number | null;
  caminho: string[]; geometria: [number, number][]; vias: string[]; trechos_osm: string[]; distancia_metros: number | null;
};
export type RouteScenario = {
  pontos: RoutePoint[]; ruas: Road[]; unidades: RouteUnit[]; origem_padrao: string; fonte: string;
  referencia: string; osm_atualizado_em: string; vertices: number; arestas: number;
};
export type Comparison = {
  origem: string; origem_ponto: RoutePoint; acesso_origem_metros: number;
  bloqueadas: string[]; resultados: RouteResult[]; ruas: Road[];
};

export async function fetchRouteJson<T>(url: string, signal: AbortSignal, body?: object): Promise<T> {
  const response = await fetch(url, {
    signal, cache: 'no-store', method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { erro?: string } | null;
    throw new Error(error?.erro || 'Serviço de trajetos indisponível. Verifique o servidor Python.');
  }
  return response.json() as Promise<T>;
}

export function getBrowserLocation(): Promise<Coordinates & { accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation || !window.isSecureContext) {
      reject(new Error('Localização indisponível. Abra em localhost ou HTTPS.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => resolve({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy }),
      error => reject(new Error(error.code === 1 ? 'Permissão de localização negada. Autorize no navegador ou escolha uma origem da lista.' : error.code === 3 ? 'O navegador demorou para obter sua localização. Tente novamente.' : 'Não foi possível obter sua localização. Tente novamente ou escolha uma origem.')),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });
}
