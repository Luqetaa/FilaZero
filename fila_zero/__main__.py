"""Interface de terminal: python -m fila_zero."""

import argparse
from dataclasses import replace
from datetime import datetime
import sys

from .algoritmos import Resultado, comparar_unidades, dijkstra, reconstruir_caminho, validar_espera
from .benchmark import imprimir_medicao
from .dados import ARQUIVO_PADRAO, Cenario, carregar_cenario, construir_grafo


def faixa(valor: tuple[float, float] | None) -> str:
    return f"{valor[0]:g}-{valor[1]:g} min" if valor is not None else "indisponível"


def mostrar_comparacao(
    cenario: Cenario, origem: str, bloqueadas: set[str]
) -> tuple[list[Resultado], dict[str, float], dict[str, str | None]]:
    grafo = construir_grafo(cenario, bloqueadas)
    distancias, anteriores = dijkstra(grafo, origem)
    resultados = comparar_unidades(list(cenario.unidades), distancias)
    print(f"\nOrigem: {cenario.pontos[origem]} | Ruas bloqueadas: {len(bloqueadas)}")
    print("Ordem pelo ponto médio do total simulado; não determina adequação clínica.")
    print(f"{'Unidade':<16} {'Trajeto':<13} {'Espera':<16} {'Total':<16} Situação")
    for item in resultados:
        unidade = item.unidade
        trajeto = f"{item.deslocamento:g} min" if item.deslocamento is not None else "sem caminho"
        situacao = {
            "disponivel": "estimativa simulada",
            "desatualizado": "dados desatualizados; fora da comparação de total",
            "indisponivel": "espera indisponível; fora da comparação de total",
        }[unidade.status]
        if item.deslocamento is None:
            situacao += "; unidade inalcançável"
        print(f"{unidade.nome:<16} {trajeto:<13} {faixa(unidade.espera):<16} {faixa(item.total):<16} {situacao}")
        atualizacao = datetime.fromisoformat(unidade.atualizado_em).strftime("%d/%m/%Y %H:%M %z") if unidade.atualizado_em else "indisponível"
        print(f"  ID: {unidade.id} | Atualização no cenário: {atualizacao}")
    return resultados, distancias, anteriores


def mostrar_caminho(
    cenario: Cenario, origem: str, destino: str,
    distancias: dict[str, float], anteriores: dict[str, str | None],
) -> None:
    caminho = reconstruir_caminho(anteriores, origem, destino)
    if not caminho:
        print("Não há caminho até esse ponto com as ruas disponíveis.")
        return
    print("\n" + " -> ".join(cenario.pontos[ponto] for ponto in caminho))
    for a, b in zip(caminho, caminho[1:]):
        print(f"  {cenario.pontos[a]} -> {cenario.pontos[b]}: {distancias[b] - distancias[a]:g} min")
    print(f"Deslocamento total simulado: {distancias[destino]:g} min.")


def listar_pontos(cenario: Cenario) -> None:
    for identificador, nome in cenario.pontos.items():
        print(f"  {identificador:<14} {nome}")


def menu(cenario: Cenario, origem: str, bloqueadas: set[str]) -> None:
    while True:
        print(f"\nOrigem atual: {cenario.pontos[origem]}")
        print("1 Comparar UPAs | 2 Escolher origem | 3 Calcular trajeto")
        print("4 Bloquear/liberar rua | 5 Alterar espera simulada | 6 Medir desempenho | 0 Sair")
        opcao = input("Opção: ").strip()
        try:
            if opcao == "0":
                return
            if opcao == "1":
                mostrar_comparacao(cenario, origem, bloqueadas)
            elif opcao == "2":
                listar_pontos(cenario)
                nova_origem = input("ID do ponto: ").strip()
                if nova_origem not in cenario.pontos:
                    raise ValueError("Ponto inexistente; origem mantida.")
                origem = nova_origem
            elif opcao == "3":
                listar_pontos(cenario)
                destino = input("ID do destino: ").strip()
                distancias, anteriores = dijkstra(construir_grafo(cenario, bloqueadas), origem)
                mostrar_caminho(cenario, origem, destino, distancias, anteriores)
            elif opcao == "4":
                for rua in cenario.ruas:
                    sentido = "<->" if rua.mao_dupla else "->"
                    estado = "BLOQUEADA" if rua.id in bloqueadas else "liberada"
                    print(f"  {rua.id}: {cenario.pontos[rua.origem]} {sentido} {cenario.pontos[rua.destino]} | {rua.minutos:g} min | {estado}")
                identificador = input("ID da rua para alternar: ").strip()
                if identificador not in {rua.id for rua in cenario.ruas}:
                    raise ValueError("Rua inexistente.")
                if identificador in bloqueadas:
                    bloqueadas.remove(identificador)
                else:
                    bloqueadas.add(identificador)
                mostrar_comparacao(cenario, origem, bloqueadas)
            elif opcao == "5":
                print(", ".join(f"{u.id}: {u.nome}" for u in cenario.unidades))
                identificador = input("ID da UPA: ").strip()
                if identificador not in {u.id for u in cenario.unidades}:
                    raise ValueError("Unidade inexistente.")
                valor = input("Espera mínima e máxima (ex.: 20 30), ou 'sem': ").strip()
                espera = None if valor.lower() == "sem" else validar_espera([float(parte) for parte in valor.split()])
                unidades = tuple(
                    replace(u, espera=espera, status="disponivel" if espera is not None else "indisponivel", atualizado_em=cenario.referencia)
                    if u.id == identificador else u for u in cenario.unidades
                )
                cenario = replace(cenario, unidades=unidades)
                print("Espera alterada somente nesta sessão, no relógio simulado.")
                mostrar_comparacao(cenario, origem, bloqueadas)
            elif opcao == "6":
                imprimir_medicao([100, 1000, 10000])
            else:
                print("Opção inválida. Escolha um número do menu.")
        except ValueError as erro:
            print(f"Entrada inválida: {erro}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Fila Zero: grafos e espera em uma cidade fictícia.")
    parser.add_argument("--dados", default=str(ARQUIVO_PADRAO), help="Arquivo JSON do cenário")
    parser.add_argument("--origem", help="ID do ponto inicial (padrão do cenário)")
    parser.add_argument("--bloquear", nargs="*", default=[], metavar="RUA", help="IDs de ruas bloqueadas")
    parser.add_argument("--demo", action="store_true", help="Exibir comparação e caminho sem abrir o menu")
    argumentos = parser.parse_args()
    try:
        cenario = carregar_cenario(argumentos.dados)
        origem = argumentos.origem if argumentos.origem is not None else cenario.origem_padrao
        bloqueadas = set(argumentos.bloquear)
        grafo = construir_grafo(cenario, bloqueadas)
        if origem not in grafo:
            raise ValueError(f"Origem inexistente: {origem}.")
        print("FILA ZERO | DEMONSTRAÇÃO ACADÊMICA | DADOS FICTÍCIOS")
        print("Não use esta simulação para decisões reais de atendimento.")
        print(f"Relógio fixo do cenário: {cenario.referencia}")
        print(f"Fonte: {cenario.fonte}")
        print("Esperas são entradas fixas da simulação, sem previsão na chegada.")
        if argumentos.demo:
            resultados, distancias, anteriores = mostrar_comparacao(cenario, origem, bloqueadas)
            primeiro = next((item for item in resultados if item.total is not None), None)
            if primeiro is not None:
                print("\nCaminho para a primeira unidade na comparação:")
                mostrar_caminho(cenario, origem, primeiro.unidade.vertice, distancias, anteriores)
        else:
            menu(cenario, origem, bloqueadas)
    except (OSError, ValueError) as erro:
        print(f"Erro: {erro}")
        return 1
    except (EOFError, KeyboardInterrupt):
        print("\nSessão encerrada.")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(main())
