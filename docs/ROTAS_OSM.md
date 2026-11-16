# Trajetos reais do Fila Zero

O mapa principal (`/`) e a tela `/simulador.html` usam ruas reais, topologia real e geometria real do OpenStreetMap, com o mesmo catálogo de 30 unidades. Somente as esperas são fictícias. Os bloqueios opcionais são alterações manuais de cenário e não alertas de trânsito real.

## Executar

Na raiz do projeto, com as dependências npm já instaladas:

```powershell
npm.cmd run build
python -m fila_zero.servidor
```

Abra `http://127.0.0.1:8000/`, autorize a localização no navegador e use **Ver trajeto no mapa** na unidade desejada. O catálogo calcula os 30 trajetos e mostra o total quando a espera está disponível. A comparação também está em `/simulador.html`, com o botão **Usar minha localização**. O Python serve os arquivos compilados em `dist/` e a API.

Para editar o frontend com atualização automática, mantenha o Python aberto e execute `npm.cmd run dev` em outro terminal. Abra `http://127.0.0.1:5173/simulador.html`. `vite.config.ts` encaminha `/api` para o backend local da porta 8000. `npm run preview` isoladamente não inicia a API.

## Origem dos dados

- **Ruas e nós:** OpenStreetMap, extraídos com Overpass e complementos locais da API OSM. A consulta, o servidor, a data da base, o retângulo geográfico e o hash SHA-256 constam em `fila_zero/dados/osm_fonte.json`.
- **Cópia incluída:** `fila_zero/dados/sao_paulo.osm.json.gz`, aproximadamente 15,3 MB. Une recortes por classe de via e complementos geográficos locais, preservando coordenadas, IDs e referências das ruas. Não é uma exportação integral de todos os objetos do município. Os detalhes de cada consulta e complemento estão nos metadados; não há geometria fabricada.
- **Grafo admitido para carros:** 781.370 nós e 1.440.201 conexões dirigidas, nesta extração. A cópia inclui nós de geometria, não apenas cruzamentos.
- **Área de consulta:** sul -23,755; oeste -46,805; norte -23,42; leste -46,39. Algumas vias selecionadas pela consulta podem continuar além do retângulo; outras alternativas externas não estão na cópia.
- **Destinos e esperas:** as 30 unidades já existentes no site: 10 UBS, 10 UPAs e 10 hospitais. O arquivo `fila_zero/dados/unidades.json` é a fonte única compartilhada com o TypeScript. IDs, tipos, nomes, endereços, coordenadas e esperas são iguais nos dois fluxos. Os estados disponíveis, desatualizados e indisponíveis são preservados; espera desconhecida não é convertida em zero.
- **Posição de partida:** obtida pelo navegador mediante a permissão de geolocalização, enviada no corpo de um POST à API local e usada apenas em memória durante o cálculo. Não é colocada na URL, em arquivos, em localStorage ou no catálogo. A origem manual continua disponível na tela de comparação.


Dados viários © OpenStreetMap contributors, sob [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). A atribuição é exibida no mapa e a licença acompanha a cópia em `fila_zero/dados/OSM-LICENSE.md`. Consulte os [termos do OSM](https://www.openstreetmap.org/copyright).

## Do OpenStreetMap ao caminho

1. `RedeOSM` lê a cópia compactada uma vez, ao iniciar o servidor. Seleciona vias próprias para automóveis e interpreta `motorcar`, `motor_vehicle`, `vehicle` e `access`, respeitando a prioridade das tags mais específicas. Vias privadas ou com acesso apenas ao destino são excluídas quando não há permissão explícita mais específica.
2. Cada par de nós consecutivos de uma via gera uma conexão. `oneway=yes` permite somente a ordem original, `oneway=-1` inverte o sentido e mão dupla gera as duas conexões. Rotatórias e autoestradas têm os padrões de sentido previstos no importador.
3. Nós próximos não são unidos por distância: duas ruas ou um viaduto que apenas se cruzam visualmente só se conectam quando compartilham o mesmo ID de nó OSM.
4. O comprimento é calculado por Haversine. O peso, em minutos, é `metros / (velocidade_km_h × 1000 / 60)`. O modelo usa velocidades de referência por classe: 60 km/h em autoestrada, 50 em troncal, 40 em primária, 35 em secundária, 30 em terciária, 25 em residencial/não classificada, 15 em serviço e 10 em rua de convivência. Um `maxspeed` numérico menor reduz essa velocidade; valores em mph são convertidos.
5. O backend executa **uma única chamada ao Dijkstra próprio com `heapq` por consulta**, obtendo as distâncias para os 30 destinos. Não há OSRM, Google Directions ou outro motor externo escolhendo o caminho.
6. Os predecessores reconstroem a sequência de IDs de nós. A resposta inclui cada coordenada original dessa sequência, a distância, o tempo e os nomes das ruas. O Leaflet desenha essa geometria; não liga apenas origem, cruzamentos escolhidos manualmente e destino.
7. A comparação soma o tempo estimado de carro a cada extremo da faixa de espera fictícia e ordena pelo ponto médio do total. Ausência de espera permanece `null`, nunca zero. Dados de uma sessão não são gravados nem afetam outra sessão.

Vias paralelas entre os mesmos nós são preservadas nos metadados. Para o Dijkstra, o menor custo das alternativas disponíveis ocupa a conexão correspondente. Bloquear uma via não apaga outra alternativa real entre o mesmo par de nós.

## Limites do modelo

- O resultado minimiza o tempo do **grafo e do perfil de velocidades disponíveis**, não o tempo real de trânsito. Não há congestionamento, semáforos ou tempo de estacionamento.
- O modelo é acadêmico e não interpreta relações de restrição de conversão, barreiras nos nós ou regras condicionais de circulação. Não equivale a um navegador veicular completo.
- A origem pode ser o GPS ou um ponto real cadastrado. GPS e destinos são associados a nós da rede viária a até 200 m, usando um índice de células geográficas para evitar percorrer a cidade inteira a cada associação. O percurso vai do acesso viário próximo da origem até o acesso próximo da unidade; não inclui deslocamentos internos ou de estacionamento. A precisão reportada pelo navegador e o ajuste da origem são informados na comparação.
- A extração cobre apenas parte de São Paulo. Uma alternativa fora da área pode ser melhor, mas não estará disponível para o algoritmo. Não há fallback para linhas retas ou ruas fictícias.
- A cópia é uma fotografia do OSM; pode divergir de mudanças recentes das vias. Esperas e classificação de risco não são previstas pelo programa.
- O modo de terminal pequeno (`python -m fila_zero`) continua como exemplo didático sintético separado; ele não alimenta a interface integrada.

## API e atualização

- `GET /api/cenario`: pontos, unidades, cobertura e metadados de origem dos dados.
- `POST /api/comparar`: aceita `origem` (ID cadastrado ou objeto `{ "lat": -23.5501, "lng": -46.6329 }`), `bloqueadas` (IDs de vias OSM) e `esperas` (faixas por ID de unidade ou `null`). Retorna os 30 resultados, geometrias, tempos, distâncias, totais, motivo de indisponibilidade quando aplicável, vias relevantes e o nó viário associado à origem. Coordenadas inválidas, fora da cobertura ou sem acesso próximo geram erro explícito; a API não troca uma posição inválida pela origem padrão.
- `python -m fila_zero.importar_osm`: atualização manual com as consultas Overpass e os complementos da API OSM registrados em `osm_fonte.json`, usando `curl` e validação antes de substituir a cópia. Os pedidos são sequenciais; falhas preservam a cópia anterior. Não é executada automaticamente. Reinicie o servidor após atualizar. Alterações do OSM que removam os nós de origem podem exigir atualizar `rotas_sp.json`.

## Verificações

```powershell
python -m unittest discover -s fila_zero/tests -v
npm.cmd test
npm.cmd run build
npx.cmd playwright test tests/e2e/simulador.spec.ts tests/e2e/localizacao.spec.ts
```

Os testes usam posições GPS simuladas; não comprovam a precisão física do GPS do usuário. Verificam permissão negada, posição fora da cobertura, igualdade dos 30 IDs do catálogo, soma do total apenas com espera válida, sentido único e inverso, rotatórias, acesso privado, vias paralelas, bloqueios, ausência de caminho, geometria igual aos nós OSM, soma de pesos, independência de pedidos, hash da fonte, erros HTTP e uma execução de Dijkstra por consulta. Os testes de navegador usam a API Python real e simulam somente os tiles de fundo e os erros intencionais; nenhuma consulta Overpass é feita durante os testes.

## Comportamento da localização

O catálogo solicita a posição ao abrir e permite tentar novamente pelo botão de localização. O navegador recebe uma solicitação de alta precisão sem aceitar posições em cache, mas pode retornar uma posição aproximada, inclusive em computadores sem GPS. Quando há atualizações de posição com deslocamento de pelo menos 80 m, recalcula os percursos. Para corrigir uma posição incorreta, use **Corrigir localização no mapa** e clique no ponto correto; também é possível mover o mapa e usar seu centro. A escolha manual interrompe o acompanhamento automático até solicitar a localização novamente. Na comparação, a posição é solicitada pelo botão **Usar minha localização**; escolher outra origem ou restaurar o cenário volta explicitamente ao modo manual. Respostas antigas são descartadas e o percurso anterior é removido durante novo cálculo ou erro.

O navegador pode negar a permissão, não ter sinal ou exigir um contexto seguro. Use localhost ou HTTPS. Consulte a [documentação da Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition). A aplicação não grava a posição; a API calcula localmente. O provedor cartográfico recebe os pedidos de tiles da área exibida no mapa, como já ocorre na navegação normal.
