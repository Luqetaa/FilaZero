import gzip
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from fila_zero.osm import DADOS, RedeOSM, acesso_carro, velocidade
from fila_zero import importar_osm


class TestImportacaoOSM(unittest.TestCase):
    def rede(self):
        elementos = [{"type": "node", "id": n, "lat": -23.5 + n * .001, "lon": -46.6 + n * .002} for n in range(1, 7)]
        for identificador, nos, tags in [
            (11, [1, 2, 3], {"oneway": "yes"}),
            (12, [3, 4], {"oneway": "-1"}),
            (13, [4, 5], {"access": "private"}),
            (14, [1, 2], {}),
            (15, [5, 6], {"junction": "roundabout"}),
        ]:
            elementos.append({"type": "way", "id": identificador, "nodes": nos, "tags": {"highway": "residential", "name": f"Rua {identificador}", **tags}})
        return RedeOSM({"elements": elementos}, {})

    def test_sentido_invertido_rotatoria_e_acesso(self):
        rede = self.rede()
        self.assertIn("3", rede.grafo["2"])
        self.assertNotIn("2", rede.grafo["3"])
        self.assertIn("3", rede.grafo["4"])
        self.assertNotIn("4", rede.grafo["3"])
        self.assertNotIn(("4", "5"), rede.arestas)
        self.assertIn("6", rede.grafo["5"])
        self.assertNotIn("5", rede.grafo["6"])
        self.assertFalse(acesso_carro({"highway": "footway"}))
        self.assertTrue(acesso_carro({"highway": "service", "access": "private", "motorcar": "yes"}))

    def test_bloquear_via_paralela_preserva_alternativa_real(self):
        rede = self.rede()
        self.assertIn("2", rede.construir_grafo({"11"})["1"])
        self.assertNotIn("2", rede.construir_grafo({"11", "14"})["1"])
        self.assertIn("2", rede.grafo["1"])

    def test_associacao_de_gps_a_no_real_e_rejeicao_de_distancias_grandes(self):
        rede = self.rede()
        no, metros = rede.no_proximo(rede.coordenadas['1'])
        self.assertEqual((no, metros), ('1', 0))
        for localizacao in [(0, 0), (True, 0), (float('nan'), 0), (91, 0)]:
            with self.subTest(localizacao=localizacao), self.assertRaises(ValueError):
                rede.no_proximo(localizacao)

    def test_geometria_e_custo_ate_origem_ou_destino_inacessivel(self):
        rede = self.rede()
        resultados, _, _ = rede.caminhos("1", {"destino": "3", "mesmo": "1", "isolado": "6"}, set())
        self.assertEqual(resultados["destino"]["geometria"], [rede.coordenadas[n] for n in ["1", "2", "3"]])
        self.assertIsNone(resultados["isolado"]["deslocamento"])
        self.assertEqual(resultados["mesmo"]["deslocamento"], 0)
        self.assertEqual(velocidade({"highway": "residential", "maxspeed": "10"}), 10)
        self.assertLessEqual(velocidade({"highway": "primary", "maxspeed": "20 mph"}), 32.19)

    def test_copia_original_tem_hash_documentado(self):
        fonte = json.loads((DADOS / "osm_fonte.json").read_text(encoding="utf-8"))
        with gzip.open(DADOS / "sao_paulo.osm.json.gz", "rb") as arquivo:
            conteudo = arquivo.read()
        self.assertEqual(hashlib.sha256(conteudo).hexdigest(), fonte["sha256_json_descompactado"])

    def test_uniao_de_extracoes_deduplica_ids_e_xml_nao_copia_dados_do_editor(self):
        xml = '<osm><node id="1" lat="-23.5" lon="-46.6" user="editor" uid="99"/><node id="2" lat="-23.51" lon="-46.61"/><way id="7"><nd ref="1"/><nd ref="2"/><tag k="highway" v="residential"/></way></osm>'
        a = importar_osm.ler_extrato_xml(xml, '2026-11-15T10:00:00Z')
        b = {"osm3s": {"timestamp_osm_base": '2026-11-15T11:00:00Z'}, "elements": [{"type": "node", "id": 1, "lat": -23.5001, "lon": -46.6001}]}
        unido = importar_osm.fundir_respostas([a, b])
        self.assertEqual(len(unido['elements']), 3)
        no = next(e for e in unido['elements'] if e['type'] == 'node' and e['id'] == 1)
        self.assertEqual(no['lat'], -23.5001)
        self.assertNotIn('user', no)
        self.assertNotIn('uid', no)

    def test_importador_preserva_copia_quando_overpass_retorna_erro(self):
        with tempfile.TemporaryDirectory() as pasta:
            destino = Path(pasta)
            (destino / 'osm_fonte.json').write_text(json.dumps({'consulta': 'consulta', 'endpoint': 'https://example.invalid'}), encoding='utf-8')
            cache = destino / 'sao_paulo.osm.json.gz'
            cache.write_bytes(b'copia-anterior')
            def resposta(comando, **kwargs):
                Path(comando[-1]).write_text(json.dumps({'remark': 'timeout', 'elements': []}), encoding='utf-8')
            with patch.object(importar_osm, 'DADOS', destino), patch.object(importar_osm.shutil, 'which', return_value='curl'), patch.object(importar_osm.subprocess, 'run', side_effect=resposta) as requisicao:
                with self.assertRaises(ValueError):
                    importar_osm.main()
            self.assertEqual(cache.read_bytes(), b'copia-anterior')
            self.assertEqual(requisicao.call_count, 1)


if __name__ == "__main__":
    unittest.main()
