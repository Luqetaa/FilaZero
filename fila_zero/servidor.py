"""API e site locais: python -m fila_zero.servidor (apenas biblioteca padrão)."""

import argparse
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
from urllib.parse import urlsplit

from .rotas import CenarioViario, calcular_comparacao, carregar_cenario_viario, cenario_publico

DIST = Path(__file__).resolve().parent.parent / "dist"



class Aplicacao(SimpleHTTPRequestHandler):
    def __init__(self, *args, cenario: CenarioViario, diretorio: Path, **kwargs):
        self.cenario = cenario
        self.diretorio = diretorio
        super().__init__(*args, directory=str(diretorio), **kwargs)

    def responder_json(self, dados: dict, status: int = 200) -> None:
        corpo = json.dumps(dados, ensure_ascii=False, allow_nan=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corpo)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(corpo)

    def do_GET(self):
        caminho = urlsplit(self.path).path
        if caminho == "/api/cenario":
            self.responder_json(cenario_publico(self.cenario))
        elif caminho.startswith("/api/"):
            self.responder_json({"erro": "Endpoint inexistente."}, HTTPStatus.NOT_FOUND)
        elif not (self.diretorio / "index.html").exists():
            self.responder_json({"erro": "Compile o site com npm run build ou use o Vite na porta 5173."}, HTTPStatus.SERVICE_UNAVAILABLE)
        else:
            super().do_GET()

    def do_POST(self):
        if urlsplit(self.path).path != "/api/comparar":
            self.responder_json({"erro": "Endpoint inexistente."}, HTTPStatus.NOT_FOUND)
            return
        try:
            tamanho = int(self.headers.get("Content-Length", "0"))
            if tamanho < 1 or tamanho > 16384:
                self.responder_json({"erro": "Corpo deve ter de 1 a 16384 bytes."}, HTTPStatus.REQUEST_ENTITY_TOO_LARGE)
                return
            if self.headers.get_content_type() != "application/json":
                self.responder_json({"erro": "Use Content-Type application/json."}, HTTPStatus.UNSUPPORTED_MEDIA_TYPE)
                return
            pedido = json.loads(self.rfile.read(tamanho))
            self.responder_json(calcular_comparacao(self.cenario, pedido))
        except (ValueError, UnicodeError, OverflowError) as erro:
            self.responder_json({"erro": str(erro)}, HTTPStatus.BAD_REQUEST)


def criar_servidor(cenario: CenarioViario, porta: int = 8000, diretorio: Path = DIST) -> ThreadingHTTPServer:
    cenario_publico(cenario)
    handler = partial(Aplicacao, cenario=cenario, diretorio=diretorio)
    return ThreadingHTTPServer(("127.0.0.1", porta), handler)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--porta", type=int, default=8000)
    args = parser.parse_args()
    try:
        with criar_servidor(carregar_cenario_viario(), args.porta) as servidor:
            print(f"Fila Zero local: http://127.0.0.1:{servidor.server_port}/simulador.html", flush=True)
            print("Ruas reais do OpenStreetMap; somente esperas simuladas. Ctrl+C para encerrar.", flush=True)
            servidor.serve_forever()
    except KeyboardInterrupt:
        pass
    except (OSError, ValueError, OverflowError) as erro:
        parser.exit(1, f"Erro ao iniciar: {erro}\n")


if __name__ == "__main__":
    main()
