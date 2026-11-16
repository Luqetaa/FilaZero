# Dados viários OpenStreetMap

`sao_paulo.osm.json.gz` é uma extração de dados reais de São Paulo, obtida por consultas Overpass e complementos locais da API OSM, unificada por ID e filtrada para objetos viários e seus nós. As coordenadas e a topologia das vias são preservadas; objetos não viários e metadados de usuários editores não são necessários à aplicação. Não contém tiles ou imagens do mapa.

© OpenStreetMap contributors. Dados distribuídos sob a [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Consulte os [créditos e termos do OpenStreetMap](https://www.openstreetmap.org/copyright).

`osm_fonte.json` registra endpoint, consulta, área, data da base e SHA-256 do JSON descompactado. `python -m fila_zero.importar_osm` permite atualizar manualmente a cópia, com as consultas e os complementos registrados nos metadados. Não há consultas ao Overpass durante a navegação ou os testes.

O código de roteamento é próprio do Fila Zero. Os dados importados e suas derivações permanecem sujeitos à ODbL. Os tempos de espera são dados fictícios separados, no catálogo compartilhado `unidades.json`.
