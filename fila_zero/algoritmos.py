"""Cálculos puros: sem input, impressão, arquivos ou alteração dos argumentos."""

from dataclasses import dataclass
import heapq
from math import inf, isfinite

Grafo = dict[str, dict[str, float]]


def numero_nao_negativo(valor: object) -> bool:
    return (
        isinstance(valor, (int, float))
        and not isinstance(valor, bool)
        and isfinite(valor)
        and valor >= 0
    )


def validar_espera(valor: object) -> tuple[float, float] | None:
    if valor is None:
        return None
    if (
        not isinstance(valor, (list, tuple))
        or len(valor) != 2
        or not all(numero_nao_negativo(item) for item in valor)
        or valor[0] > valor[1]
    ):
        raise ValueError("A espera deve ser [mínimo, máximo], em minutos não negativos.")
    return (float(valor[0]), float(valor[1]))


def validar_grafo(grafo: Grafo) -> None:
    if not isinstance(grafo, dict) or not grafo:
        raise ValueError("O grafo deve conter pelo menos um ponto.")
    for origem, vizinhos in grafo.items():
        if not isinstance(origem, str) or not origem or not isinstance(vizinhos, dict):
            raise ValueError("Use identificadores de texto e dicionários de vizinhos.")
        for destino, minutos in vizinhos.items():
            if destino not in grafo:
                raise ValueError(f"Destino inexistente: {destino}.")
            if not numero_nao_negativo(minutos):
                raise ValueError("Dijkstra exige tempos finitos e não negativos.")


def dijkstra(grafo: Grafo, origem: str) -> tuple[dict[str, float], dict[str, str | None]]:
    """Uma execução encontra os menores tempos da origem para todos os pontos."""
    validar_grafo(grafo)
    if origem not in grafo:
        raise ValueError(f"Origem inexistente: {origem}.")
    distancias = dict.fromkeys(grafo, inf)
    anteriores: dict[str, str | None] = dict.fromkeys(grafo, None)
    distancias[origem] = 0.0
    fila = [(0.0, origem)]
    while fila:
        tempo, atual = heapq.heappop(fila)
        # Uma melhora pode deixar entradas antigas no heap; não as expanda novamente.
        if tempo != distancias[atual]:
            continue
        for vizinho, minutos in grafo[atual].items():
            candidato = tempo + minutos
            if candidato < distancias[vizinho]:
                distancias[vizinho] = candidato
                anteriores[vizinho] = atual
                heapq.heappush(fila, (candidato, vizinho))
    return distancias, anteriores


def reconstruir_caminho(
    anteriores: dict[str, str | None], origem: str, destino: str
) -> list[str]:
    """Retorna [] se o destino não puder ser alcançado a partir da origem."""
    if origem not in anteriores or destino not in anteriores:
        raise ValueError("Origem ou destino inexistente.")
    caminho = []
    visitados = set()
    atual: str | None = destino
    while atual is not None:
        if atual in visitados or atual not in anteriores:
            raise ValueError("Mapa de predecessores inválido.")
        visitados.add(atual)
        caminho.append(atual)
        if atual == origem:
            return caminho[::-1]
        atual = anteriores[atual]
    return []


@dataclass(frozen=True)
class Unidade:
    id: str
    nome: str
    vertice: str
    status: str
    espera: tuple[float, float] | None
    atualizado_em: str | None


@dataclass(frozen=True)
class Resultado:
    unidade: Unidade
    deslocamento: float | None
    total: tuple[float, float] | None

    @property
    def pontuacao(self) -> float:
        return sum(self.total) / 2 if self.total is not None else inf


def comparar_unidades(unidades: list[Unidade], distancias: dict[str, float]) -> list[Resultado]:
    """Ordena pelo ponto médio do total; ausência de dados nunca significa zero."""
    resultados = []
    for unidade in unidades:
        if unidade.vertice not in distancias:
            raise ValueError(f"Ponto da unidade não existe: {unidade.vertice}.")
        tempo = distancias[unidade.vertice]
        deslocamento = tempo if isfinite(tempo) else None
        espera = validar_espera(unidade.espera)
        total = None
        if deslocamento is not None and unidade.status == "disponivel" and espera is not None:
            total = (deslocamento + espera[0], deslocamento + espera[1])
        resultados.append(Resultado(unidade, deslocamento, total))
    return sorted(resultados, key=lambda item: (item.pontuacao, item.unidade.nome, item.unidade.id))
