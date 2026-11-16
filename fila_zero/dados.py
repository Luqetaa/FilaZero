"""Leitura e validação da cidade fictícia; montagem do grafo de ruas."""

from dataclasses import dataclass, field
from datetime import datetime
import json
from math import isfinite
from pathlib import Path

from .algoritmos import Grafo, Unidade, numero_nao_negativo, validar_espera

ARQUIVO_PADRAO = Path(__file__).parent / "dados" / "cidade.json"


@dataclass(frozen=True)
class Rua:
    id: str
    origem: str
    destino: str
    minutos: float
    mao_dupla: bool


@dataclass(frozen=True)
class Cenario:
    pontos: dict[str, str]
    ruas: tuple[Rua, ...]
    unidades: tuple[Unidade, ...]
    origem_padrao: str
    referencia: str
    fonte: str
    coordenadas: dict[str, tuple[float, float]] = field(default_factory=dict)


def texto(valor: object) -> str:
    if not isinstance(valor, str) or not valor.strip():
        raise ValueError("Identificadores, nomes e fonte devem ser textos não vazios.")
    return valor


def horario(valor: object) -> str:
    valor = texto(valor)
    if datetime.fromisoformat(valor).tzinfo is None:
        raise ValueError("Datas devem incluir o fuso horário.")
    return valor


def carregar_cenario(caminho: str | Path = ARQUIVO_PADRAO) -> Cenario:
    """Erros de arquivo são OSError; conteúdo inválido gera ValueError."""
    with Path(caminho).open(encoding="utf-8") as arquivo:
        dados = json.load(arquivo)
    try:
        if dados["simulado"] is not True:
            raise ValueError("Este módulo aceita apenas cenários explicitamente simulados.")
        referencia = horario(dados["referencia"])
        fonte = texto(dados["fonte"])
        pontos = dados["pontos"]
        if not isinstance(pontos, dict) or not pontos:
            raise ValueError("Informe um dicionário de pontos.")
        pontos = {texto(chave): texto(nome) for chave, nome in pontos.items()}
        coordenadas = dados.get("coordenadas", {})
        if not isinstance(coordenadas, dict):
            raise ValueError("Coordenadas devem ser um dicionário de pontos.")
        if coordenadas and set(coordenadas) != set(pontos):
            raise ValueError("Informe coordenadas para todos os pontos, sem IDs extras.")
        for localizacao in coordenadas.values():
            if (
                not isinstance(localizacao, list) or len(localizacao) != 2
                or any(not isinstance(v, (int, float)) or isinstance(v, bool) or not isfinite(v) for v in localizacao)
                or not -90 <= localizacao[0] <= 90 or not -180 <= localizacao[1] <= 180
            ):
                raise ValueError("Coordenada inválida: use [latitude, longitude].")
        coordenadas = {chave: tuple(valor) for chave, valor in coordenadas.items()}
        origem = texto(dados["origem_padrao"])
        if origem not in pontos:
            raise ValueError("A origem padrão não existe.")
        ruas = []
        ids_ruas = set()
        for item in dados["ruas"]:
            rua = Rua(
                texto(item["id"]), texto(item["origem"]), texto(item["destino"]),
                item["minutos"], item["mao_dupla"],
            )
            if rua.id in ids_ruas or rua.origem not in pontos or rua.destino not in pontos:
                raise ValueError("Rua repetida ou com ponto inexistente.")
            if not numero_nao_negativo(rua.minutos) or not isinstance(rua.mao_dupla, bool):
                raise ValueError("Tempo ou sentido de rua inválido.")
            ids_ruas.add(rua.id)
            ruas.append(rua)
        unidades = []
        ids_unidades = set()
        for item in dados["unidades"]:
            unidade = Unidade(
                texto(item["id"]), texto(item["nome"]), texto(item["vertice"]),
                texto(item["status"]), validar_espera(item["espera"]),
                horario(item["atualizado_em"]) if item["atualizado_em"] is not None else None,
            )
            if unidade.id in ids_unidades or unidade.vertice not in pontos:
                raise ValueError("Unidade repetida ou com ponto inexistente.")
            if unidade.status not in {"disponivel", "desatualizado", "indisponivel"}:
                raise ValueError("Estado de dados desconhecido.")
            if unidade.status == "disponivel":
                if unidade.espera is None or unidade.atualizado_em is None:
                    raise ValueError("Unidade disponível exige espera e atualização.")
            elif unidade.espera is not None:
                raise ValueError("Dados antigos ou indisponíveis devem ter espera nula.")
            if unidade.atualizado_em is not None and datetime.fromisoformat(unidade.atualizado_em) > datetime.fromisoformat(referencia):
                raise ValueError("A atualização não pode ser posterior ao relógio simulado.")
            ids_unidades.add(unidade.id)
            unidades.append(unidade)
        if not unidades:
            raise ValueError("Informe pelo menos uma UPA.")
        cenario = Cenario(pontos, tuple(ruas), tuple(unidades), origem, referencia, fonte, coordenadas)
        construir_grafo(cenario)
        return cenario
    except (KeyError, TypeError, AttributeError, ValueError) as erro:
        raise ValueError(f"Cenário inválido: {erro}") from erro


def construir_grafo(cenario: Cenario, bloqueadas: set[str] | None = None) -> Grafo:
    """Novo grafo por consulta: bloquear não altera a cidade original."""
    bloqueadas = bloqueadas or set()
    if bloqueadas - {rua.id for rua in cenario.ruas}:
        raise ValueError("Há identificadores de ruas bloqueadas que não existem.")
    grafo: Grafo = {ponto: {} for ponto in cenario.pontos}
    conexoes = set()
    for rua in cenario.ruas:
        sentidos = [(rua.origem, rua.destino)]
        if rua.mao_dupla:
            sentidos.append((rua.destino, rua.origem))
        for origem, destino in sentidos:
            if (origem, destino) in conexoes:
                raise ValueError("Use uma única rua por par de pontos em cada sentido.")
            conexoes.add((origem, destino))
            if rua.id not in bloqueadas:
                grafo[origem][destino] = float(rua.minutos)
    return grafo
