"""Atualização manual da extração local: python -m fila_zero.importar_osm."""

import gzip
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET

from .osm import DADOS, RedeOSM
from .rotas import CenarioViario, carregar_configuracao


def ler_extrato_xml(conteudo: str, timestamp: str) -> dict:
    """Lê geometria/topologia pública, sem copiar metadados de usuários editores."""
    raiz = ET.fromstring(conteudo)
    elementos = []
    for item in raiz:
        if item.tag not in {"node", "way"}:
            continue
        elemento = {"type": item.tag, "id": int(item.attrib["id"])}
        if item.tag == "node":
            elemento.update(lat=float(item.attrib["lat"]), lon=float(item.attrib["lon"]))
        else:
            elemento["nodes"] = [int(no.attrib["ref"]) for no in item.findall("nd")]
        tags = {tag.attrib["k"]: tag.attrib["v"] for tag in item.findall("tag")}
        if tags:
            elemento["tags"] = tags
        elementos.append(elemento)
    vias = [e for e in elementos if e["type"] == "way" and "highway" in e.get("tags", {})]
    necessarios = {no for via in vias for no in via["nodes"]}
    elementos = [e for e in elementos if e["type"] == "node" and e["id"] in necessarios] + vias
    return {"elements": elementos, "osm3s": {"timestamp_osm_base": timestamp}}


def fundir_respostas(respostas: list[dict]) -> dict:
    elementos = {}
    for resposta in respostas:
        if resposta.get("remark") or not resposta.get("elements"):
            raise ValueError("O Overpass retornou uma extração incompleta; arquivos preservados.")
        for elemento in resposta["elements"]:
            elementos[elemento["type"], elemento["id"]] = elemento
    timestamps = [r["osm3s"]["timestamp_osm_base"] for r in respostas]
    return {"version": 0.6, "generator": "Fila Zero: união de extrações Overpass, preservando elementos OSM",
            "osm3s": {"timestamp_osm_base": min(timestamps), "copyright": "© OpenStreetMap contributors, ODbL"},
            "elements": list(elementos.values())}


def main():
    metadados = json.loads((DADOS / "osm_fonte.json").read_text(encoding="utf-8"))
    curl = shutil.which("curl.exe") or shutil.which("curl")
    if curl is None:
        raise SystemExit("A atualização manual requer curl. A aplicação usa a extração já incluída.")
    with tempfile.TemporaryDirectory() as pasta:
        respostas = []
        for indice, texto_consulta in enumerate(metadados.get("consultas", [metadados.get("consulta")])):
            consulta = Path(pasta) / f"consulta-{indice}.txt"
            destino = Path(pasta) / f"resposta-{indice}.json"
            consulta.write_text(texto_consulta, encoding="utf-8")
            subprocess.run([
                curl, "--fail", "--silent", "--show-error", "--max-time", "120",
                "--max-filesize", "150000000", "-A", "FilaZero-Academic/1.0",
                "--data-urlencode", f"data@{consulta}", metadados["endpoint"], "-o", str(destino),
            ], check=True)
            resposta = json.loads(destino.read_text(encoding="utf-8"))
            if resposta.get("remark") or not resposta.get("elements"):
                raise ValueError("O Overpass retornou uma extração incompleta; arquivos preservados.")
            respostas.append(resposta)
        for indice, extrato in enumerate(metadados.get("extratos_api", [])):
            destino = Path(pasta) / f"extrato-{indice}.xml"
            subprocess.run([curl, "--fail", "--silent", "--show-error", "--max-time", "60", "-A", "FilaZero-Academic/1.0", extrato["url"], "-o", str(destino)], check=True)
            respostas.append(ler_extrato_xml(destino.read_text(encoding="utf-8"), extrato["obtido_em"]))
        dados = fundir_respostas(respostas)
        configuracao = carregar_configuracao(DADOS)
        CenarioViario(RedeOSM(dados, metadados), configuracao)
        conteudo = json.dumps(dados, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        metadados["timestamp_osm_base"] = dados["osm3s"]["timestamp_osm_base"]
        metadados["sha256_json_descompactado"] = hashlib.sha256(conteudo).hexdigest()
        # Valida toda a resposta antes de substituir a cópia usada pela aplicação.
        temporario = DADOS / "sao_paulo.osm.json.gz.tmp"
        temporario.write_bytes(gzip.compress(conteudo, mtime=0))
        temporario.replace(DADOS / "sao_paulo.osm.json.gz")
        (DADOS / "osm_fonte.json").write_text(json.dumps(metadados, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Extração atualizada. Reinicie o servidor Python para carregar os novos dados.")


if __name__ == "__main__":
    main()
