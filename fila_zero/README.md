# Fila Zero — trabalho Python de algoritmos complexos

## Ficha da CitizenTech

| Campo | Descrição |
|---|---|
| Nome | Fila Zero |
| Problema | Falta de informação para comparar deslocamento e espera nas unidades de saúde pública. |
| Proposta | Dar transparência à espera e permitir comparar unidades. Neste trabalho, demonstrar essa funcionalidade com uma cidade inteiramente fictícia. |
| Público | Cidadãos e acompanhantes; potencial apoio à gestão da rede. |
| Funcionalidade implementada | Menores trajetos, comparação de tempo total, bloqueios de ruas e simulação de mudanças de espera. |
| Conceito exigido escolhido | Grafos: Dijkstra implementado com fila de prioridade `heapq`. |
| Dados | Ruas reais OpenStreetMap e UPAs reais no site; esperas simuladas em `rotas_sp.json`. O exemplo de terminal separado usa `cidade.json` sintético. Sem dados de pacientes. |
| Limite | Ferramenta acadêmica, sem orientação clínica ou integração operacional. |

### Integrantes

**Preencher os nomes e RMs reais antes de entregar.** Adicione uma linha por integrante.

| Nome completo | RM |
|---|---|
| PREENCHER | PREENCHER |

## Aplicação web com ruas reais

A versão principal integrada ao site calcula as rotas sobre **781.370 nós e 1.440.201 conexões dirigidas** do OpenStreetMap, com topologia e geometria originais. O Python usa Dijkstra; o navegador apenas desenha a geometria retornada e apresenta os tempos. São calculados trajetos para as mesmas 30 unidades do mapa principal, usando a localização do navegador ou uma origem escolhida. O cadastro compartilhado é `fila_zero/dados/unidades.json`; as esperas permanecem fictícias, preservando estados sem dados ou desatualizados.

```sh
npm.cmd run build
python -m fila_zero.servidor
```

Abra `http://127.0.0.1:8000/`, autorize a localização no navegador e escolha **Ver trajeto no mapa** em uma unidade. A comparação está também em `http://127.0.0.1:8000/simulador.html`, com o botão **Usar minha localização**. Para desenvolvimento com Vite, execute também `npm.cmd run dev` em outro terminal e abra a porta 5173. O backend Python precisa permanecer aberto.

Os detalhes do grafo real, fonte/licença, velocidades, área, atualização e limites estão em [docs/ROTAS_OSM.md](../docs/ROTAS_OSM.md). O servidor usa apenas a biblioteca padrão do Python. O frontend usa as dependências Node já presentes no projeto. Os testes Python abrangem as rotas reais e os exemplos sintéticos abaixo.

## Exemplo didático de terminal (dados sintéticos)

As seções seguintes explicam o exemplo pequeno de terminal, preservado para estudo e testes. Ele é separado da malha real usada pelo site.

### Executar

Requer **Python 3.10 ou superior**. Não exige `pip install`, Node.js, servidor ou internet. Execute os comandos no diretório que contém a pasta `fila_zero`:

```sh
python -m fila_zero
```

No menu, escolha a origem, compare as UPAs, consulte um caminho, bloqueie/libere ruas, altere a espera ou execute o benchmark. Alterações ficam apenas na memória da sessão; o JSON original é preservado. Digite `0` para sair; EOF e Ctrl+C também encerram a sessão.

Demonstração automática:

```sh
python -m fila_zero --demo
python -m fila_zero --demo --origem escola
python -m fila_zero --demo --bloquear r02
python -m fila_zero --demo --bloquear r03
python -m fila_zero --dados fila_zero/dados/cidade.json --demo
```

IDs de origem são pontos do JSON (`casa`, `praca`, `escola`, `upa_centro` etc.). A opção de trajeto no menu lista os pontos. Os IDs das UPAs (`norte`, `centro` etc.) são usados na alteração da espera; o vértice correspondente (`upa_norte`, `upa_centro`) é usado como origem/destino de rota.

## Como o trajeto é calculado

O JSON descreve **20 vértices**, **23 ruas** e **6 UPAs**. Cada vértice representa um ponto; cada rua conecta dois pontos e tem um tempo fixo, não negativo, em minutos. Os pesos já são tempos de deslocamento fictícios: não são calculados por distância em linha reta, GPS ou trânsito real.

Por exemplo, a rua `r01` conecta `casa` a `praca`, em 3 minutos. `mao_dupla: true` gera duas arestas; `false` gera somente a conexão de `origem` para `destino`. A rua `r23` é de mão única. A UPA Ilha é propositalmente isolada, para demonstrar ausência de caminho.

`construir_grafo` converte essas ruas em uma lista de adjacência com dicionários. Ruas bloqueadas não entram no grafo. Um bloqueio de mão dupla remove os dois sentidos; a cidade original não é alterada.

`dijkstra` recebe o grafo e a origem. Inicializa a distância da origem em zero e as demais em infinito. Retira do heap o ponto com menor tempo acumulado e tenta melhorar os tempos dos vizinhos. Entradas antigas do heap são ignoradas. Cada melhoria guarda o predecessor, permitindo reconstruir o caminho no final. Uma execução encontra as distâncias para **todas as UPAs**, sem enumerar todos os caminhos possíveis. A demo reutiliza os mesmos resultados para mostrar o trajeto.

Exemplo conhecido, saindo de `casa`:

```text
Ponto de partida -> Escola do Bairro -> Mercado Municipal -> Terminal Norte -> UPA Norte
                    4 min              5 min                5 min          6 min
Deslocamento total: 4 + 5 + 5 + 6 = 20 min
```

Ao bloquear `r02`, o trajeto até a UPA Centro fica mais longo. Ao bloquear `r03`, essa UPA fica sem acesso viário. Liberar a rua restaura as conexões na próxima consulta.

## Comparação com a espera

Para cada unidade alcançável com dados disponíveis:

```text
total mínimo = deslocamento + espera mínima
total máximo = deslocamento + espera máxima
pontuação de ordenação = (total mínimo + total máximo) / 2
```

No cenário inicial:

| Unidade | Trajeto | Espera | Total | Ponto médio do total |
|---|---|---|---|---|
| UPA Norte | 20 min | 20–30 min | 40–50 min | 45 min |
| UPA Sul | 15 min | 50–70 min | 65–85 min | 75 min |
| UPA Centro | 8 min | 90–120 min | 98–128 min | 113 min |

A ordenação por ponto médio é uma regra didática, não uma expectativa estatística calibrada nem uma garantia. Empates são resolvidos por nome e ID para manter a saída determinística. Faixas sobrepostas podem não permitir concluir qual atendimento ocorrerá primeiro.

A UPA Leste está sem espera disponível, a Oeste tem dados antigos e a Ilha não tem caminho. Elas continuam visíveis, mas ficam fora da comparação por total. Ausência de informação nunca é convertida em `0 min`. Uma espera explicitamente informada como `[0, 0]` é um zero legítimo no cenário.

As esperas são **entradas fixas** do JSON ou do menu. Não são calculadas a partir de senhas ou número de pacientes e não mudam durante o deslocamento. O relógio da simulação é fixo em `2026-11-15T14:00:00-03:00`; a apresentação de atualizações e os estados de dados se referem a esse cenário, sem alegar atualização real. Alterar a espera no menu usa esse mesmo relógio.

Isso implementa um recorte da comparação prevista no documento de visão. Previsão na chegada, ingestão de eventos, classificação de risco e integração com unidades permanecem fora deste módulo. O algoritmo não decide qual unidade é clinicamente adequada e não muda a prioridade ou a fila de atendimento.

## Eficiência

Considere `V` vértices, `E` conexões dirigidas e `U` unidades.

- Montar ou validar a lista de adjacência custa `O(V + E)`.
- Dijkstra com o heap utilizado custa `O((V + E) log V)` para o grafo simples adotado. Com entradas repetidas no heap, uma formulação mais geral é `O(V + E log E)`; como não há arestas paralelas, `E <= V²`, e `log E = O(log V)`.
- Distâncias e predecessores ocupam `O(V)`; o heap pode ter `O(E)` entradas. Incluindo o grafo, o espaço é `O(V + E)`.
- A comparação ordena as unidades em `O(U log U)`.
- Reconstruir um caminho custa até `O(V)`; caminhos só são reconstruídos quando solicitados.
- Uma consulta que monta o grafo, calcula distâncias e compara unidades custa `O((V + E) log V + U log U)`, além da apresentação. Não há chamada a Dijkstra para cada UPA.

É usado Dijkstra porque as ruas têm tempos diferentes. BFS minimizaria o número de trechos, que não equivale ao menor tempo. Pesos negativos, infinitos e NaN são rejeitados, inclusive em componentes inacessíveis.

### Medição prática

```sh
python -m fila_zero.benchmark
python -m fila_zero.benchmark --tamanhos 100 1000 10000 --repeticoes 5
```

O gerador usa semente 42 e grafos conectados esparsos: uma cadeia e conexões adicionais, com `E` proporcional a `V`. Ele não representa uma cidade geográfica real. Há uma execução de aquecimento fora da medição. Cada amostra usa `time.perf_counter()`; a saída informa mediana, mínimo e máximo. Geração dos dados, reconstrução dos caminhos, verificações e impressão ficam fora do intervalo cronometrado; a validação de entrada do Dijkstra fica dentro.

Registro pontual em 15/11/2026, Python 3.13.5, cinco repetições nesta máquina:

| Vértices | Arestas dirigidas | Mediana (ms) |
|---|---|---|
| 100 | 586 | 0,228 |
| 1.000 | 5.968 | 2,689 |
| 10.000 | 59.976 | 35,112 |

Resultados variam com máquina e carga. Medir tempos não prova a complexidade; a explicação teórica acima justifica a eficiência do algoritmo. Cada rua de mão dupla conta como duas arestas na tabela.

## Validação

```sh
python -m unittest discover -s fila_zero/tests -v
```

Os testes verificam caminhos conhecidos, rota indireta mais rápida, mãos únicas, ciclo de peso zero, origem igual ao destino, pontos inalcançáveis, pesos inválidos, bloqueios e restauração, faixas de espera, distinção entre ausência e zero, JSON inválido, menu e benchmark. Também conferem todos os pares de oito grafos pequenos com um oráculo independente de Floyd-Warshall. Esse oráculo existe somente nos testes.

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `fila_zero/__main__.py` | Menu, argumentos, apresentação e tratamento de erros de entrada. |
| `fila_zero/algoritmos.py` | Funções puras: Dijkstra, caminho, comparação e validação de valores. |
| `fila_zero/dados.py` | Carregamento do JSON, validação do cenário e montagem do grafo. |
| `fila_zero/dados/cidade.json` | Rede e unidades totalmente fictícias, editáveis. |
| `fila_zero/benchmark.py` | Gerador de grafos e medição prática. |
| `fila_zero/tests/test_fila_zero.py` | Testes com biblioteca padrão `unittest`. |
| `prompts.md` | Registro do uso de IA nesta implementação. |

## Identidade e relação com o site

O nome definitivo é Fila Zero. A transparência sobre faixas, fonte, última atualização e dados indisponíveis segue o guia de identidade. A interface deste trabalho é textual; a paleta azul/off-white e o mapa podem orientar uma futura integração visual.

O exemplo sintético de terminal é separado. A integração web está implementada em `fila_zero/rotas.py`, `fila_zero/osm.py`, `fila_zero/servidor.py`, `src/simulador.ts` e `src/ui/map.ts`, com dados reais do OpenStreetMap. Veja a seção de aplicação web no início deste arquivo.

## Entrega em ZIP

Antes de entregar, complete os integrantes desta ficha e acrescente novos prompts ao registro quando houver. A instrução recebida determina um único ZIP, enviado por um integrante no Teams até 19/11 às 23h55.

Para montar um ZIP contendo só o trabalho Python (sem a interface web), execute na raiz do projeto, depois de preencher os integrantes. Para entregar também a interface integrada, inclua o código do site, os manifests npm e este guia, preservando a estrutura do repositório e excluindo `node_modules`, caches e artefatos de testes:

```powershell
$entregaFilaZero = Join-Path $env:TEMP ('fila-zero-gs-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $entregaFilaZero | Out-Null
Copy-Item -LiteralPath fila_zero -Destination $entregaFilaZero -Recurse
Copy-Item -LiteralPath fila_zero/README.md -Destination (Join-Path $entregaFilaZero 'README.md')
Copy-Item -LiteralPath prompts.md -Destination $entregaFilaZero
Compress-Archive -Path (Join-Path $entregaFilaZero '*') -DestinationPath FilaZero-Python.zip
```

O resultado contém `README.md` e `prompts.md` na raiz e o pacote `fila_zero/` completo, com código, JSON e testes. Extraia o ZIP, abra o terminal na pasta extraída e execute `python -m fila_zero --demo`. Não é necessário incluir `node_modules`, arquivos do site ou dados pessoais. `__pycache__`, se copiado por já ter executado Python, é apenas cache dispensável.

Referências conceituais do projeto: `Documento_de_Visao_UPA_Agora.pdf` e `Fila_Zero_Design_Guidelines.md`, na raiz do repositório. A implementação de Dijkstra é própria, usando apenas `heapq` da biblioteca padrão.
