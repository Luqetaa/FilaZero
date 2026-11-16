from fila_zero.rotas import carregar_cenario_viario
from fila_zero.servidor import Aplicacao, DIST


class handler(Aplicacao):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, cenario=carregar_cenario_viario(), diretorio=DIST, **kwargs)
