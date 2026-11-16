"""Pontos reais de São Paulo e esperas simuladas para a interface web."""

from dataclasses import replace
from functools import lru_cache
import json
from math import inf

from .algoritmos import Unidade, comparar_unidades, validar_espera
from .osm import DADOS, RedeOSM


class CenarioViario:
    def __init__(self, rede: RedeOSM, configuracao: dict):
        self.rede = rede
        self.configuracao = configuracao
        self.origem_padrao = configuracao["origem_padrao"]
        self.referencia = configuracao["referencia"]
        self.pontos = []
        self.unidades = []
        self.locais = {}
        for ponto in configuracao["origens"]:
            no = ponto["no"]
            if no not in rede.grafo:
                raise ValueError("Origem fora da extração OSM.")
            lat, lng = rede.coordenadas[no]
            self.pontos.append({"id": no, "nome": ponto["nome"], "lat": lat, "lng": lng})
        self.sem_acesso = {}
        for local in configuracao["unidades"]:
            try:
                no, acesso_metros = rede.no_proximo((local["lat"], local["lng"]))
            except ValueError as erro:
                no, acesso_metros = f"fora:{local['id']}", None
                self.sem_acesso[local["id"]] = str(erro)
            unidade = Unidade(local["id"], local["nome"], no, local.get("status", "disponivel"), validar_espera(local["espera"]), local.get("atualizado_em", self.referencia))
            self.unidades.append(unidade)
            self.locais[unidade.id] = {**local, "acesso_metros": acesso_metros}
            if acesso_metros is not None:
                lat, lng = rede.coordenadas[no]
                self.pontos.append({"id": no, "nome": f"Acesso viário · {unidade.nome}", "lat": lat, "lng": lng})
        if self.origem_padrao not in {p["id"] for p in self.pontos}:
            raise ValueError("Origem padrão não cadastrada.")


def carregar_configuracao(pasta=DADOS) -> dict:
    configuracao = json.loads((pasta / "rotas_sp.json").read_text(encoding="utf-8"))
    catalogo = json.loads((pasta / "unidades.json").read_text(encoding="utf-8"))
    configuracao["unidades"] = [
        {"id": u["id"], "nome": u["name"], "tipo": u["type"], "endereco": u["address"],
         "bairro": u["neighborhood"], "lat": u["location"]["lat"], "lng": u["location"]["lng"],
         "status": {"available": "disponivel", "stale": "desatualizado", "unavailable": "indisponivel"}[u["data"]["status"]],
         "espera": [u["data"]["estimatedWait"]["min"], u["data"]["estimatedWait"]["max"]] if u["data"]["estimatedWait"] is not None and u["data"]["status"] == "available" else None,
         "atualizado_em": u["data"]["updatedAt"]}
        for u in catalogo
    ]
    return configuracao


@lru_cache(maxsize=1)
def carregar_cenario_viario() -> CenarioViario:
    return CenarioViario(RedeOSM.carregar(), carregar_configuracao())


def unidade_publica(cenario: CenarioViario, unidade: Unidade) -> dict:
    local = cenario.locais[unidade.id]
    return {
        "id": unidade.id, "nome": unidade.nome, "vertice": unidade.vertice,
        "status": unidade.status, "espera": unidade.espera, "atualizado_em": unidade.atualizado_em,
        "lat": local["lat"], "lng": local["lng"], "endereco": local["endereco"],
        "acesso_metros": round(local["acesso_metros"], 1) if local["acesso_metros"] is not None else None,
        "tipo": local.get("tipo", "UPA"), "bairro": local.get("bairro", ""),
        "motivo_rota": cenario.sem_acesso.get(unidade.id),
    }


def cenario_publico(cenario: CenarioViario) -> dict:
    return {
        "viario_real": True, "esperas_simuladas": True, "modo": "carro",
        "fonte": "Ruas e topologia: © OpenStreetMap contributors (ODbL). Unidades: cadastro SMS-SP / SES-SP compartilhado com o site. Esperas: simulação acadêmica.",
        "referencia": cenario.referencia, "origem_padrao": cenario.origem_padrao,
        "pontos": cenario.pontos, "ruas": [],
        "unidades": [unidade_publica(cenario, u) for u in cenario.unidades],
        "osm_atualizado_em": cenario.rede.metadados["timestamp_osm_base"],
        "vertices": len(cenario.rede.grafo),
        "arestas": sum(map(len, cenario.rede.grafo.values())),
        "bbox": cenario.rede.metadados["bbox"],
    }


def calcular_comparacao(cenario: CenarioViario, pedido: object) -> dict:
    if not isinstance(pedido, dict):
        raise ValueError("Envie um objeto JSON.")
    origem = pedido.get("origem", cenario.origem_padrao)
    bloqueadas = pedido.get("bloqueadas", [])
    esperas = pedido.get("esperas", {})
    acesso_origem = 0.0
    if isinstance(origem, dict):
        if set(origem) != {"lat", "lng"}:
            raise ValueError("A localização deve conter latitude e longitude.")
        origem, acesso_origem = cenario.rede.no_proximo((origem["lat"], origem["lng"]))
        lat, lng = cenario.rede.coordenadas[origem]
        origem_ponto = {"id": origem, "nome": "Acesso viário da sua localização", "lat": lat, "lng": lng}
    elif isinstance(origem, str) and origem in {p["id"] for p in cenario.pontos}:
        origem_ponto = next(p for p in cenario.pontos if p["id"] == origem)
    else:
        raise ValueError("Origem inexistente.")
    if not isinstance(bloqueadas, list) or any(not isinstance(via, str) for via in bloqueadas):
        raise ValueError("Bloqueios devem ser uma lista de IDs OSM.")
    if not isinstance(esperas, dict) or set(esperas) - {u.id for u in cenario.unidades}:
        raise ValueError("Alterações de espera contêm unidades desconhecidas.")
    unidades = []
    for unidade in cenario.unidades:
        if unidade.id in esperas:
            espera = validar_espera(esperas[unidade.id])
            unidade = replace(unidade, espera=espera, status="disponivel" if espera is not None else "indisponivel", atualizado_em=cenario.referencia)
        unidades.append(unidade)
    caminhos, distancias, vias = cenario.rede.caminhos(origem, {u.id: u.vertice for u in unidades if u.id not in cenario.sem_acesso}, set(bloqueadas))
    for unidade in unidades:
        if unidade.id in cenario.sem_acesso:
            distancias[unidade.vertice] = inf
            caminhos[unidade.id] = {"caminho": [], "geometria": [], "vias": [], "trechos_osm": [], "distancia_metros": None, "deslocamento": None}
    resultados = comparar_unidades(unidades, distancias)
    return {
        "origem": origem, "bloqueadas": sorted(set(bloqueadas)), "viario_real": True,
        "origem_ponto": origem_ponto, "acesso_origem_metros": round(acesso_origem, 1),
        "esperas_simuladas": True, "ruas": vias,
        "resultados": [
            {**unidade_publica(cenario, item.unidade), **caminhos[item.unidade.id],
             "total": item.total, "pontuacao": item.pontuacao if item.total is not None else None}
            for item in resultados
        ],
    }
