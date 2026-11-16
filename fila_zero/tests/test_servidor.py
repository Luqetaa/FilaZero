from http import HTTPStatus
import json
from pathlib import Path
import tempfile
from threading import Thread
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from fila_zero.algoritmos import dijkstra
from fila_zero.rotas import calcular_comparacao, carregar_cenario_viario
from fila_zero.servidor import criar_servidor


class TestIntegracaoWeb(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cenario = carregar_cenario_viario()
        cls.pasta = tempfile.TemporaryDirectory()
        diretorio = Path(cls.pasta.name)
        (diretorio / "index.html").write_text("<h1>Fila Zero</h1>", encoding="utf-8")
        cls.servidor = criar_servidor(cls.cenario, 0, diretorio)
        cls.thread = Thread(target=cls.servidor.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f"http://127.0.0.1:{cls.servidor.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.servidor.shutdown()
        cls.servidor.server_close()
        cls.thread.join(timeout=3)
        cls.pasta.cleanup()

    def pedir(self, caminho, dados=None):
        pedido = Request(self.url + caminho, data=json.dumps(dados).encode() if dados is not None else None, headers={"Content-Type": "application/json"})
        with urlopen(pedido, timeout=30) as resposta:
            self.assertIn("no-store", resposta.headers["Cache-Control"])
            return json.load(resposta)

    def test_cenario_real_e_geometria_exata_dos_nos_osm(self):
        cenario = self.pedir("/api/cenario")
        self.assertTrue(cenario["viario_real"])
        self.assertTrue(cenario["esperas_simuladas"])
        self.assertGreater(cenario["vertices"], 100000)
        resposta = self.pedir("/api/comparar", {"origem": self.cenario.origem_padrao})
        catalogo = json.loads((Path(__file__).parents[1] / "dados" / "unidades.json").read_text(encoding="utf-8"))
        self.assertEqual({r["id"] for r in resposta["resultados"]}, {u["id"] for u in catalogo})
        self.assertEqual(len(resposta["resultados"]), 30)
        for resultado in resposta["resultados"]:
            caminho = resultado["caminho"]
            self.assertGreater(len(caminho), 1, resultado["id"])
            self.assertEqual(resultado["geometria"], [list(self.cenario.rede.coordenadas[no]) for no in caminho])
            tempo = sum(self.cenario.rede.grafo[a][b] for a, b in zip(caminho, caminho[1:]))
            self.assertAlmostEqual(tempo, resultado["deslocamento"])
            if resultado["status"] == "disponivel":
                self.assertAlmostEqual(resultado["total"][0], tempo + resultado["espera"][0])
            else:
                self.assertIsNone(resultado["total"])

    def test_esperas_e_bloqueios_sao_independentes_entre_pedidos(self):
        normal = self.pedir("/api/comparar", {})
        bloqueada = normal["ruas"][0]["id"]
        alterado = self.pedir("/api/comparar", {"bloqueadas": [bloqueada], "esperas": {"upa-lapa": [0, 0], "upa-vergueiro": None}})
        por_id = {r["id"]: r for r in alterado["resultados"]}
        self.assertEqual(por_id["upa-lapa"]["espera"], [0, 0])
        self.assertIsNone(por_id["upa-vergueiro"]["total"])
        for resultado in alterado["resultados"]:
            for a, b in zip(resultado["caminho"], resultado["caminho"][1:]):
                self.assertTrue(any(t.way != bloqueada for t in self.cenario.rede.arestas[a, b]))
        restaurado = self.pedir("/api/comparar", {})
        self.assertEqual(restaurado["resultados"], normal["resultados"])

    def test_rejeita_entradas_invalidas(self):
        for dados in [[], {"origem": []}, {"origem": "ausente"}, {"bloqueadas": [1]}, {"bloqueadas": ["ausente"]}, {"esperas": {"ausente": [1, 2]}}, {"esperas": {"upa-lapa": [-1, 2]}}, {"esperas": {"upa-lapa": [0, float("nan")]}}]:
            with self.subTest(dados=dados), self.assertRaises(HTTPError) as erro:
                self.pedir("/api/comparar", dados)
            self.assertEqual(erro.exception.code, HTTPStatus.BAD_REQUEST)

    def test_http_estatico_e_limites(self):
        with urlopen(self.url + "/", timeout=3) as resposta:
            self.assertIn(b"Fila Zero", resposta.read())
        for caminho, dados, tipo, codigo in [
            ("/api/ausente", None, "application/json", 404),
            ("/api/comparar", b"x" * 16385, "application/json", 413),
            ("/api/comparar", b"{}", "text/plain", 415),
            ("/api/comparar", b"{", "application/json", 400),
        ]:
            pedido = Request(self.url + caminho, data=dados, headers={"Content-Type": tipo})
            with self.assertRaises(HTTPError) as erro:
                urlopen(pedido, timeout=3)
            self.assertEqual(erro.exception.code, codigo)

    def test_uma_execucao_de_dijkstra_por_comparacao(self):
        with patch("fila_zero.osm.dijkstra", wraps=dijkstra) as calcular:
            resposta = calcular_comparacao(self.cenario, {"origem": {"lat": -23.5501, "lng": -46.6329}})
        self.assertEqual(calcular.call_count, 1)
        self.assertEqual(len(resposta["resultados"]), 30)
        self.assertIn(resposta["origem"], self.cenario.rede.grafo)
        self.assertLess(resposta["acesso_origem_metros"], 200)

    def test_gps_invalido_ou_fora_da_cobertura_nao_usa_origem_padrao(self):
        for origem in [{"lat": 0, "lng": 0}, {"lat": True, "lng": -46.6}, {"lat": float('nan'), "lng": -46.6}, {"lat": 91, "lng": 0}, {"lat": -23.5}, {"lat": "-23.5", "lng": -46.6}]:
            with self.subTest(origem=origem), self.assertRaises(HTTPError) as erro:
                self.pedir('/api/comparar', {"origem": origem})
            self.assertEqual(erro.exception.code, 400)


if __name__ == "__main__":
    unittest.main()
