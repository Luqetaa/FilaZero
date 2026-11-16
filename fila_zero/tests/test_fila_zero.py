"""Execute na raiz: python -m unittest discover -s fila_zero/tests -v."""

from contextlib import redirect_stdout
from dataclasses import replace
import io
import json
from math import inf
from pathlib import Path
import random
import tempfile
import unittest
from unittest.mock import patch

from fila_zero.__main__ import main
from fila_zero.algoritmos import comparar_unidades, dijkstra, reconstruir_caminho, validar_espera
from fila_zero.benchmark import gerar_grafo, medir
from fila_zero.dados import ARQUIVO_PADRAO, carregar_cenario, construir_grafo


class TestDijkstra(unittest.TestCase):
    def test_caminho_indireto_mais_rapido_e_destino_isolado(self):
        grafo = {"a": {"b": 10, "c": 1}, "b": {"d": 1}, "c": {"b": 2}, "d": {}, "ilha": {}}
        distancias, anteriores = dijkstra(grafo, "a")
        self.assertEqual(distancias["d"], 4)
        self.assertEqual(reconstruir_caminho(anteriores, "a", "d"), ["a", "c", "b", "d"])
        self.assertEqual(distancias["ilha"], inf)
        self.assertEqual(reconstruir_caminho(anteriores, "a", "ilha"), [])
        self.assertEqual(reconstruir_caminho(anteriores, "a", "a"), ["a"])

    def test_mao_unica_e_ciclo_de_custo_zero(self):
        grafo = {"a": {"b": 0}, "b": {"a": 0, "c": 2}, "c": {}}
        distancias, anteriores = dijkstra(grafo, "a")
        self.assertEqual(distancias["c"], 2)
        self.assertEqual(reconstruir_caminho(anteriores, "a", "c"), ["a", "b", "c"])
        self.assertEqual(dijkstra(grafo, "c")[0]["a"], inf)

    def test_rejeita_pesos_invalidos_inclusive_em_componente_isolada(self):
        for peso in [-1, float("nan"), inf, True, "3"]:
            with self.subTest(peso=peso), self.assertRaises(ValueError):
                dijkstra({"a": {}, "b": {"c": peso}, "c": {}}, "a")
        with self.assertRaises(ValueError):
            dijkstra({"a": {}}, "ausente")
        with self.assertRaises(ValueError):
            dijkstra({"a": {"ausente": 1}}, "a")

    def test_confere_com_oraculo_floyd_warshall_em_grafos_pequenos(self):
        # Um algoritmo independente verifica todos os pares, inclusive sem caminho.
        for semente in range(8):
            sorteio = random.Random(semente)
            pontos = [str(i) for i in range(7)]
            grafo = {a: {b: sorteio.randint(0, 12) for b in pontos if a != b and sorteio.random() < 0.25} for a in pontos}
            esperado = {(a, b): (0 if a == b else grafo[a].get(b, inf)) for a in pontos for b in pontos}
            for k in pontos:
                for a in pontos:
                    for b in pontos:
                        esperado[a, b] = min(esperado[a, b], esperado[a, k] + esperado[k, b])
            for origem in pontos:
                distancias, anteriores = dijkstra(grafo, origem)
                for destino in pontos:
                    with self.subTest(semente=semente, origem=origem, destino=destino):
                        self.assertEqual(distancias[destino], esperado[origem, destino])
                        caminho = reconstruir_caminho(anteriores, origem, destino)
                        if distancias[destino] == inf:
                            self.assertEqual(caminho, [])
                        else:
                            self.assertEqual((caminho[0], caminho[-1]), (origem, destino))
                            self.assertEqual(sum(grafo[a][b] for a, b in zip(caminho, caminho[1:])), distancias[destino])


class TestCenario(unittest.TestCase):
    def setUp(self):
        self.cenario = carregar_cenario()

    def test_cenario_tem_resultados_conhecidos(self):
        grafo = construir_grafo(self.cenario)
        distancias, _ = dijkstra(grafo, "casa")
        resultados = comparar_unidades(list(self.cenario.unidades), distancias)
        comparaveis = [item for item in resultados if item.total is not None]
        self.assertEqual([item.unidade.id for item in comparaveis], ["norte", "sul", "centro"])
        self.assertEqual([item.deslocamento for item in comparaveis], [20, 15, 8])
        self.assertEqual([item.total for item in comparaveis], [(40, 50), (65, 85), (98, 128)])
        por_id = {item.unidade.id: item for item in resultados}
        for identificador in ["leste", "oeste", "ilha"]:
            self.assertIsNone(por_id[identificador].total)
        self.assertIsNone(por_id["ilha"].deslocamento)
        self.assertIsNotNone(por_id["leste"].deslocamento)

    def test_bloqueio_remove_os_dois_sentidos_sem_mudar_o_original(self):
        original = construir_grafo(self.cenario)
        bloqueado = construir_grafo(self.cenario, {"r03"})
        self.assertIn("upa_centro", original["avenida"])
        self.assertNotIn("upa_centro", bloqueado["avenida"])
        self.assertNotIn("avenida", bloqueado["upa_centro"])
        self.assertEqual(dijkstra(bloqueado, "casa")[0]["upa_centro"], inf)
        desvio = construir_grafo(self.cenario, {"r02"})
        self.assertGreater(dijkstra(desvio, "casa")[0]["upa_centro"], 8)
        self.assertEqual(dijkstra(construir_grafo(self.cenario), "casa")[0]["upa_centro"], 8)
        self.assertIn("escola", original["avenida"])
        self.assertNotIn("avenida", original["escola"])
        with self.assertRaises(ValueError):
            construir_grafo(self.cenario, {"inexistente"})

    def test_zero_legitimo_nao_se_confunde_com_ausencia(self):
        unidade = replace(self.cenario.unidades[0], espera=(0, 0))
        self.assertEqual(comparar_unidades([unidade], {unidade.vertice: 0})[0].total, (0, 0))
        desatualizada = replace(unidade, status="desatualizado")
        self.assertIsNone(comparar_unidades([desatualizada], {unidade.vertice: 0})[0].total)
        for espera in [[20, 10], [-1, 5], [0, inf], [True, 2], [1], "sem"]:
            with self.subTest(espera=espera), self.assertRaises(ValueError):
                validar_espera(espera)

    def test_validacao_de_arquivo(self):
        original = json.loads(ARQUIVO_PADRAO.read_text(encoding="utf-8"))
        casos = []
        def caso():
            dados = json.loads(json.dumps(original))
            casos.append(dados)
            return dados
        caso()["simulado"] = False
        caso()["origem_padrao"] = "ausente"
        caso()["referencia"] = "2026-11-15T14:00:00"
        caso()["ruas"][0]["minutos"] = -5
        caso()["ruas"][0]["mao_dupla"] = "sim"
        caso()["ruas"][0]["destino"] = "ausente"
        caso()["ruas"].append(original["ruas"][0])
        caso()["unidades"][0]["espera"] = None
        caso()["unidades"][0]["atualizado_em"] = "2026-11-16T14:00:00-03:00"
        caso()["unidades"][0]["status"] = "desatualizado"
        caso()["unidades"][0]["vertice"] = "ausente"
        caso()["unidades"] = []
        with tempfile.TemporaryDirectory() as pasta:
            caminho = Path(pasta) / "cidade.json"
            for dados in casos:
                with self.subTest(dados=dados):
                    caminho.write_text(json.dumps(dados), encoding="utf-8")
                    with self.assertRaises(ValueError):
                        carregar_cenario(caminho)
            caminho.write_text("{", encoding="utf-8")
            with self.assertRaises(ValueError):
                carregar_cenario(caminho)


class TestInterfaceEBenchmark(unittest.TestCase):
    def executar(self, argumentos, entradas=()):
        saida = io.StringIO()
        with patch("sys.argv", ["fila_zero", *argumentos]), patch("builtins.input", side_effect=entradas), redirect_stdout(saida):
            codigo = main()
        return codigo, saida.getvalue()

    def test_demo_e_erros_de_argumentos(self):
        codigo, saida = self.executar(["--demo"])
        self.assertEqual(codigo, 0)
        self.assertIn("40-50 min", saida)
        self.assertIn("Ponto de partida -> Escola do Bairro", saida)
        codigo, saida = self.executar(["--demo", "--bloquear", "r03"])
        self.assertEqual(codigo, 0)
        self.assertIn("sem caminho", saida)
        for argumentos in [["--demo", "--origem", "ausente"], ["--demo", "--bloquear", "ausente"], ["--dados", "arquivo-inexistente.json"]]:
            with self.subTest(argumentos=argumentos):
                self.assertEqual(self.executar(argumentos)[0], 1)

    def test_menu_bloquear_liberar_alterar_espera_e_tratar_entrada(self):
        codigo, saida = self.executar([], [
            "2", "inexistente", "2", "casa", "3", "upa_centro",
            "4", "r03", "4", "r03", "5", "norte", "30 10",
            "5", "norte", "0 0", "5", "centro", "sem", "1", "0",
        ])
        self.assertEqual(codigo, 0)
        self.assertIn("origem mantida", saida)
        self.assertIn("8 min", saida)
        self.assertIn("sem caminho", saida)
        self.assertIn("20-20 min", saida)
        self.assertIn("Entrada inválida", saida)
        # Alterações de sessão não são gravadas no JSON.
        self.assertEqual(carregar_cenario().unidades[0].espera, (90, 120))

    def test_benchmark_reprodutivel_e_medicao_real(self):
        self.assertEqual(gerar_grafo(30), gerar_grafo(30))
        resultados = medir([10, 100], 2)
        self.assertEqual([item["vertices"] for item in resultados], [10, 100])
        for item in resultados:
            self.assertGreater(item["mediana_ms"], 0)
            self.assertLessEqual(item["arestas"], 6 * item["vertices"])
        with self.assertRaises(ValueError):
            medir([10], 0)


if __name__ == "__main__":
    unittest.main()
