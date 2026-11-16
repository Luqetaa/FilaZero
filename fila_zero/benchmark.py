"""Medição reproduzível de Dijkstra; geração e impressão fora do cronômetro."""

import argparse
import random
from statistics import median
import sys
from time import perf_counter

from .algoritmos import Grafo, dijkstra, reconstruir_caminho


def gerar_grafo(quantidade: int, semente: int = 42) -> Grafo:
    if quantidade < 2:
        raise ValueError("Use pelo menos dois vértices.")
    sorteio = random.Random(semente)
    pontos = [f"p{i}" for i in range(quantidade)]
    grafo: Grafo = {ponto: {} for ponto in pontos}
    # A cadeia garante conectividade; as demais conexões mantêm E proporcional a V.
    for indice in range(quantidade - 1):
        a, b = pontos[indice], pontos[indice + 1]
        peso = sorteio.randint(1, 20)
        grafo[a][b] = peso
        grafo[b][a] = peso
    for _ in range(2 * quantidade):
        a, b = sorteio.sample(pontos, 2)
        if b not in grafo[a]:
            peso = sorteio.randint(1, 20)
            grafo[a][b] = peso
            grafo[b][a] = peso
    return grafo


def medir(tamanhos: list[int], repeticoes: int = 5) -> list[dict[str, int | float]]:
    if repeticoes < 1 or not tamanhos or any(tamanho < 2 for tamanho in tamanhos):
        raise ValueError("Informe tamanhos >= 2 e pelo menos uma repetição.")
    resultados = []
    for tamanho in tamanhos:
        grafo = gerar_grafo(tamanho)
        dijkstra(grafo, "p0")  # Aquecimento fora da medição.
        tempos = []
        for _ in range(repeticoes):
            inicio = perf_counter()
            distancias, anteriores = dijkstra(grafo, "p0")
            tempos.append((perf_counter() - inicio) * 1000)
        # Verificação funcional fora da medição, além dos testes unitários.
        destino = f"p{tamanho - 1}"
        caminho = reconstruir_caminho(anteriores, "p0", destino)
        soma = sum(grafo[a][b] for a, b in zip(caminho, caminho[1:]))
        if not caminho or soma != distancias[destino]:
            raise RuntimeError("O custo do caminho não corresponde à distância calculada.")
        resultados.append({
            "vertices": tamanho,
            "arestas": sum(len(vizinhos) for vizinhos in grafo.values()),
            "mediana_ms": median(tempos),
            "minimo_ms": min(tempos),
            "maximo_ms": max(tempos),
        })
    return resultados


def imprimir_medicao(tamanhos: list[int], repeticoes: int = 5) -> None:
    resultados = medir(tamanhos, repeticoes)
    print(f"\nDijkstra com heapq | semente 42 | {repeticoes} repetições")
    print("Inclui validação do grafo; exclui geração, caminhos e impressão.")
    print(f"{'Vértices':>10} {'Arestas*':>10} {'Mediana ms':>12} {'Mínimo ms':>12} {'Máximo ms':>12}")
    for item in resultados:
        print(f"{item['vertices']:>10} {item['arestas']:>10} {item['mediana_ms']:>12.3f} {item['minimo_ms']:>12.3f} {item['maximo_ms']:>12.3f}")
    print("*Conexões dirigidas: uma rua de mão dupla conta como duas arestas.")
    print("Tempos dependem da máquina; estas medições não provam a complexidade teórica.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tamanhos", type=int, nargs="+", default=[100, 1000, 10000])
    parser.add_argument("--repeticoes", type=int, default=5)
    argumentos = parser.parse_args()
    try:
        imprimir_medicao(argumentos.tamanhos, argumentos.repeticoes)
    except ValueError as erro:
        parser.error(str(erro))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
