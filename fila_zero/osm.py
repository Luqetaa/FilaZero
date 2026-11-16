"""Grafo viário real do OpenStreetMap. Nenhum serviço externo calcula a rota."""

from dataclasses import dataclass
import gzip
import json
from math import asin, cos, radians, sin, sqrt, floor, isfinite
from pathlib import Path
import re

from .algoritmos import Grafo, dijkstra, reconstruir_caminho

DADOS = Path(__file__).parent / "dados"
VELOCIDADES = {
    "motorway": 60, "trunk": 50, "primary": 40, "secondary": 35,
    "tertiary": 30, "unclassified": 25, "residential": 25, "living_street": 10, "service": 15,
}


def distancia_metros(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1, lat2, lon2 = map(radians, (*a, *b))
    h = sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin((lon2 - lon1) / 2) ** 2
    return 6371008.8 * 2 * asin(min(1, sqrt(h)))


def velocidade(tags: dict) -> float:
    classe = tags["highway"].removesuffix("_link")
    referencia = VELOCIDADES[classe]
    limite = re.fullmatch(r"(\d+(?:\.\d+)?)\s*(mph|km/h)?", tags.get("maxspeed", ""))
    if limite and float(limite[1]) > 0:
        return min(referencia, float(limite[1]) * (1.609344 if limite[2] == "mph" else 1))
    return referencia


def acesso_carro(tags: dict) -> bool:
    if tags.get("highway", "").removesuffix("_link") not in VELOCIDADES:
        return False
    for chave in ("motorcar", "motor_vehicle", "vehicle", "access"):
        if chave in tags:
            return tags[chave] in {"yes", "permissive", "designated"}
    return True


@dataclass(frozen=True)
class Trecho:
    way: str
    nome: str
    metros: float
    minutos: float


class RedeOSM:
    def __init__(self, dados: dict, metadados: dict):
        self.metadados = metadados
        self.coordenadas = {
            str(e["id"]): (e["lat"], e["lon"]) for e in dados["elements"] if e["type"] == "node"
        }
        self.vias = {}
        self.arestas: dict[tuple[str, str], list[Trecho]] = {}
        self.grafo: Grafo = {}
        for elemento in dados["elements"]:
            tags = elemento.get("tags", {})
            if elemento["type"] != "way" or not acesso_carro(tags):
                continue
            way = str(elemento["id"])
            nos = [str(no) for no in elemento["nodes"]]
            if any(no not in self.coordenadas for no in nos):
                raise ValueError(f"Geometria incompleta na via OSM {way}.")
            self.vias[way] = {"id": way, "nome": tags.get("name", f"Via OSM {way}"), "nos": nos}
            sentido = tags.get("oneway:motorcar", tags.get("oneway:motor_vehicle", tags.get("oneway")))
            if sentido is None:
                sentido = "yes" if tags.get("junction") in {"roundabout", "circular"} or tags["highway"] == "motorway" else "no"
            metros_por_minuto = velocidade(tags) * 1000 / 60
            for a, b in zip(nos, nos[1:]):
                if a == b:
                    continue
                metros = distancia_metros(self.coordenadas[a], self.coordenadas[b])
                trecho = Trecho(way, self.vias[way]["nome"], metros, metros / metros_por_minuto)
                if sentido not in {"-1", "reverse"}:
                    self.arestas.setdefault((a, b), []).append(trecho)
                if sentido not in {"yes", "1", "true"}:
                    self.arestas.setdefault((b, a), []).append(trecho)
                self.grafo.setdefault(a, {})
                self.grafo.setdefault(b, {})
        if not self.arestas:
            raise ValueError("A extração OSM não contém ruas para automóveis.")
        self.grafo = self.construir_grafo(set())
        self.celulas = {}
        for no in self.grafo:
            lat, lng = self.coordenadas[no]
            self.celulas.setdefault((floor(lat / .005), floor(lng / .005)), []).append(no)

    @classmethod
    def carregar(cls, pasta: Path = DADOS):
        with gzip.open(pasta / "sao_paulo.osm.json.gz", "rt", encoding="utf-8") as arquivo:
            dados = json.load(arquivo)
        metadados = json.loads((pasta / "osm_fonte.json").read_text(encoding="utf-8"))
        return cls(dados, metadados)

    def construir_grafo(self, bloqueadas: set[str]) -> Grafo:
        if bloqueadas - self.vias.keys():
            raise ValueError("Via OSM bloqueada não existe nesta extração.")
        grafo: Grafo = {no: {} for no in self.grafo}
        for (a, b), trechos in self.arestas.items():
            disponiveis = [t.minutos for t in trechos if t.way not in bloqueadas]
            if disponiveis:
                grafo[a][b] = min(disponiveis)
        return grafo

    def no_proximo(self, localizacao: tuple[float, float]) -> tuple[str, float]:
        if len(localizacao) != 2 or any(isinstance(v, bool) or not isinstance(v, (int, float)) or not isfinite(v) for v in localizacao):
            raise ValueError("Coordenadas inválidas.")
        lat, lng = localizacao
        if not -90 <= lat <= 90 or not -180 <= lng <= 180:
            raise ValueError("Coordenadas inválidas.")
        bbox = self.metadados.get("bbox")
        if bbox and not (bbox[0] <= lat <= bbox[2] and bbox[1] <= lng <= bbox[3]):
            raise ValueError("Localização fora da cobertura viária de São Paulo disponível no projeto.")
        # Apenas nós de vias admitidas; nunca conecta ruas que se cruzam sem um nó OSM comum.
        # Células de ~500 m em São Paulo limitam a busca aos vizinhos do raio de 200 m.
        celula = (floor(lat / .005), floor(lng / .005))
        candidatos = [no for a in range(celula[0] - 1, celula[0] + 2) for b in range(celula[1] - 1, celula[1] + 2) for no in self.celulas.get((a, b), [])]
        if not candidatos:
            raise ValueError("Sem acesso viário a até 200 m da localização informada.")
        no = min(candidatos, key=lambda chave: distancia_metros(localizacao, self.coordenadas[chave]))
        distancia = distancia_metros(localizacao, self.coordenadas[no])
        if distancia > 200:
            raise ValueError("O ponto está a mais de 200 m da rede viária desta extração.")
        return no, distancia

    def via_publica(self, way: str) -> dict:
        via = self.vias[way]
        return {"id": way, "nome": via["nome"], "geometria": [self.coordenadas[no] for no in via["nos"]]}

    def caminhos(self, origem: str, destinos: dict[str, str], bloqueadas: set[str]) -> tuple[dict, dict, list]:
        grafo = self.construir_grafo(bloqueadas) if bloqueadas else self.grafo
        distancias, anteriores = dijkstra(grafo, origem)
        resultados = {}
        vias_usadas = set(bloqueadas)
        for identificador, destino in destinos.items():
            caminho = reconstruir_caminho(anteriores, origem, destino)
            trechos = [
                min((t for t in self.arestas[a, b] if t.way not in bloqueadas), key=lambda t: t.minutos)
                for a, b in zip(caminho, caminho[1:])
            ]
            vias_usadas.update(t.way for t in trechos)
            nomes = []
            for trecho in trechos:
                if not nomes or nomes[-1] != trecho.nome:
                    nomes.append(trecho.nome)
            resultados[identificador] = {
                "caminho": caminho,
                "geometria": [self.coordenadas[no] for no in caminho],
                "vias": nomes,
                "trechos_osm": list(dict.fromkeys(t.way for t in trechos)),
                "distancia_metros": sum(t.metros for t in trechos) if caminho else None,
                "deslocamento": distancias[destino] if caminho else None,
            }
        vias = [self.via_publica(way) for way in sorted(vias_usadas)]
        return resultados, distancias, vias
