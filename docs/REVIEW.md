# Revisão e testes — Fila Zero

Status em 14/11/2026: **validação final MAPA REAL suspensa por novo pedido visual; aguardando INTEGRADO LAYOUT NOVO**. O aviso de integração do mapa foi recebido e a fonte conectada lida, mas nenhum navegador ou suíte foi executado antes da suspensão. Não há achado anterior confirmado dessa migração. Os resultados e pareceres históricos abaixo se referem ao mapa esquemático. Nenhum deploy ou publicação realizado.

## Critérios atuais — sidebar desktop, mapa integral mobile e folha de lista

A referência visual local enviada pelo usuário foi aberta e examinada. A solicitação atual governa a revisão: desktop com sidebar à esquerda e mapa à direita ocupando o viewport; mobile com mapa em100dvh e largura integral, controles flutuantes com vidro e folha inferior de lista expansível/recolhível. O efeito de vidro está autorizado pelo usuário e prevalece sobre a restrição visual anterior do guia Markdown. A referência não autoriza copiar GPS, rotas, distâncias, ordenação por menor espera ou outros controles fora do pedido.

O contrato Leaflet/OSM, os dados fictícios e o isolamento de rede da preparação abaixo permanecem. `tests/e2e/fixtures.ts` continua instalado no contexto antes de páginas/reloads, incluindo o teste de fuso. Nenhum tile real será acessado por teste/smoke. A adaptação dos seletores e da fixture visual aguarda a nova fonte; nenhuma alteração na implementação foi feita por este revisor.

Atualização de preparação após gravação do novo `main.ts`: `tests/e2e/ui-helpers.ts` agora abre a folha apenas quando `#sheet-content` está hidden/inert, recolhe-a antes de interagir com marcadores em mobile e abre `details#about` antes de selecionar o cenário. Os fluxos existentes passaram a usar esses helpers, o novo warning literal e o grupo `Unidades fictícias no mapa real`. Reloads, inclusive no caso de fuso, reabrem a lista quando necessário e continuam sob a mesma fixture OSM. Não foram executados runner, smoke ou navegador; CSS, verificações geométricas finais e novos cenários Leaflet/folha continuam aguardando fonte concluída e **INTEGRADO LAYOUT NOVO**.

| Risco / fluxo | Verificação planejada após o próximo aviso |
| --- | --- |
| Mapa mobile integral | Em320/390 px, bounding box do mapa cobre largura e altura do viewport dinâmico; controles ficam sobre o mapa sem criar rolagem horizontal ou empurrá-lo para baixo. A antiga meta de início até y=500 deixa de ser o critério desse layout. |
| Folha expandir/recolher | Acionador com nome e estado acessível; abrir a folha antes dos fluxos de busca/lista/detalhes em mobile. Lista rola nativamente, sem arrastar o mapa por baixo; recolher devolve o acesso ao mapa e preserva busca, filtro e seleção. |
| Foco da folha e do diálogo | Ações funcionam por teclado; conteúdo recolhido não mantém controles invisíveis na ordem de Tab. Escape/fechamento do diálogo retorna ao acionador ainda presente na folha; expandir/recolher não perde foco em elemento oculto. Não exigir armadilha de foco para folha não modal. |
| Sobreposições críticas | DEMO, aviso de fictícios e SAMU acessíveis nos estados de folha aberta/fechada, erro/carga do mapa e diálogo. Atribuição OSM visível e clicável, sem cobertura pela folha, alertas ou controles, incluindo teste geométrico/hit test. |
| Zoom e texto | Em320/390 e aumento de texto a200%, folha e controles continuam legíveis e operáveis; sem cortes de avisos ou ações essenciais. Distinguir zoom do mapa de aumento de texto/navegador. Movimento reduzido também vale para transição da folha e pan/zoom. |
| Vidro e contraste | Inspecionar contraste e legibilidade sobre raster local determinístico, incluindo áreas claras/escuras quando o teste for adaptado. Não inferir contraste de todos os mapas reais a partir de um único raster; registrar transparência/blur e limites da medição. Alvos confortáveis e foco visível continuam obrigatórios. |
| Sidebar e scroller desktop | Sidebar à esquerda e mapa à direita dentro do viewport; lista rola internamente e permite alcançar o último card sem aumentar o painel à altura dos oito cards. A regressão de altura2914 deve falhar, mas o valor832 do layout anterior não é mais um alvo exato. |
| Independência do mapa | Sucesso, abort total/parcial, timeout e repetição com raster local; falha de módulo/inicialização não impede lista, expansão da folha ou detalhes. Busca/filtro mantêm os mesmos IDs no mapa/lista e não baixam novos tiles a cada tecla. |

**Execução atual:** nenhuma suíte, smoke ou navegação headless da migração executada. Build e10/10 dados da integração do mapa foram informados pelo Maestro e não são apresentados como execução própria. A inspeção visível do Maestro confirmou12 tiles reais e8 marcadores DEMO em São Paulo; não capturou headers Referer nem comprovou cache real. Revisão da fonte encontrou importação local de Leaflet/CSS, `keepBuffer: 0`, atualização ao fim do movimento e ausência de configuração `no-cache`/política restritiva de Referer. A nova UI está em edição por Lume; review e testes finais aguardam **INTEGRADO LAYOUT NOVO**.

## Preparação — mapa real São Paulo

`docs/MVP_PLAN.md` atualizado foi lido. São Paulo é a referência geográfica real, enquanto unidades, posições fabricadas, filas, tempos e endereços de Vila Aurora continuam fictícios. O futuro contrato usa `location: { lat, lng }` e exporta `mapReference`; não haverá CNES, geocoder ou importação de unidades reais.

A [política oficial de tiles da OSMF](https://operations.osmfoundation.org/policies/tiles/) foi consultada nesta etapa: requer atribuição visível, Referer e cache adequados; proíbe coleta em massa e bots headless que forçam renderização por pan/zoom. A validação automatizada não acessará tiles reais. Ruas reais serão verificadas pelo Maestro em portal visível, em uma área pequena.

### Isolamento preparado antes de qualquer navegação

- `tests/e2e/fixtures.ts` substitui o contexto padrão dos testes: antes da página, instala roteamento que responde a `https://tile.openstreetmap.org/**` com PNG RGBA local de 1×1, base64 determinístico. A rota nunca usa `continue`, `fetch` ou fallback para o provedor. Os bytes foram gerados localmente com chunks PNG e CRC, sem download de raster.
- Modos disponíveis para os futuros cenários: sucesso, abort total, parcial alternado e requisições pendentes para timeout. Retentativa será provocada pela ação manual da UI; solicitações pendentes serão resolvidas/abortadas localmente no teste.
- Outras origens externas são abortadas e registradas como falha do teste; tentativas de geolocalização também são bloqueadas e verificadas. Requests locais de módulos/Leaflet/CSS continuam pelo Vite. Service workers estão bloqueados na configuração de testes.
- Todos os casos existentes agora importam a fixture comum. O teste de fuso usa `test.use` e o mesmo contexto protegido, sem `browser.newContext` avulso. A interceptação cobre `goto`, reloads e novas páginas desse contexto. Qualquer novo spec deve importar essa fixture, nunca criar contexto sem a proteção.
- O observador de requests aceita URLs de tiles somente porque são atendidas localmente pela fixture; continua rejeitando outras origens externas. Nenhum smoke ou script headless avulso está autorizado a acessar tiles reais.
- Limite técnico: roteamento Playwright desativa o cache HTTP do contexto de teste. Portanto, o mock não comprova cache real nem permite atribuir ao app headers produzidos pelo runner/interceptação. A ausência de `no-cache`/`no-referrer` será validada na fonte/configuração; o Referer normal será verificado nas requisições do navegador visível pelo Maestro. Essa observação será citada somente se houver evidência recebida, separada da execução deste revisor. Nenhum resultado mockado será apresentado como prova de cache real.

### Critérios novos e regressões planejadas

| Caso | Resultado a exigir após integração |
| --- | --- |
| Contrato de dados | Todas as posições são lat/lng finitos fabricados; `mapReference` aponta para São Paulo; `city` permanece Vila Aurora. Chamadores e testes de dados acompanham a substituição de x/y. |
| Conteúdo e segurança | Novo warning literal de Lume em página e diálogo; não afirmar que o mapa real é fictício ou que posições fabricadas são unidades existentes. Avisos e SAMU funcionam em sucesso, vazio, carga, erro de dados, erro de tiles e erro de módulo. |
| Sucesso de tiles | PNGs locais decodificados; marcadores acessíveis apontam aos mesmos dados da lista. Contar `.map-marker` separadamente de zoom/repetição. Grupo previsto: `Unidades fictícias no mapa real`. |
| Tiles abortados e parciais | Mensagem correta de mapa indisponível/incompleto e ação de repetição; lista, busca, filtros e detalhes seguem operáveis. Recuperação só após ação explícita, sem loop automático de requests. |
| Timeout e repetição | Segurar requests locais, avançar relógio após conhecer o prazo real da implementação, verificar aviso e recuperação manual; respostas antigas não derrubam a tentativa mais recente. |
| Falha de import/inicialização | Abortar apenas o módulo dinâmico do mapa ou fazê-lo falhar de modo restrito ao teste. A lista e seus detalhes funcionam, com aviso de mapa e sem rejeição não tratada. Falha de mapa não pode impedir a leitura de unidades. |
| Busca e identidade | Conjuntos explícitos por nome/tipo iguais em lista e marcadores; zero resíduos no vazio; seleção/restauração de foco ainda corretas depois de atualização dos marcadores. Endereço continua fictício no diálogo, ainda que o fundo seja São Paulo. |
| Requests por digitação | Após estabilizar os tiles iniciais mockados, digitar várias letras e filtrar sem alterar viewport; contador de URLs de tiles não aumenta a cada tecla. Seleção/zoom/pan não ordenam a lista pela espera. |
| Zoom/pan/teclado | Interações limitadas sobre raster local; controles com nome e foco, marcadores por teclado e Escape, foco restaurado; zoom/pan não modificam dados ou critérios de busca. |
| Atribuição e mobile | Link visível `© OpenStreetMap contributors` para `https://www.openstreetmap.org/copyright`, sem cobertura por marcadores/alertas/controles em320/390. Verificar geometria/hit test do link, zoom, alvos e movimento reduzido. |
| Política no código conectado | URL HTTPS correta, biblioteca/CSS locais, `keepBuffer: 0`, atualização ao fim do movimento, cache padrão e Referer preservado; sem SW, proxy, prefetch, download em massa ou chamada geográfica externa. |

Na leitura preparatória desta etapa, `src/ui/map.ts` ainda exportava o SVG e `src/main.ts` continha o warning antigo. Por isso os nomes/asserções específicos da nova UI e os casos de falha serão finalizados quando a implementação aparecer, sem adivinhar textos nem confirmar bugs em trabalho ainda em andamento.

**Execução desta etapa:** somente leitura de contrato/política e geração local do PNG. Fixture/restrições de rede preparadas, mas **ainda não carregadas pelo runner nem executadas em navegador**. Build, dados, E2E, review final das conexões e parecer para Leaflet aguardam **INTEGRADO MAPA REAL**. Nenhum achado bloqueante confirmado nesta preparação.

## Histórico da etapa anterior — mapa esquemático

**What this change does:** A demonstração permite buscar e filtrar oito unidades fictícias em mapa e lista, consultar detalhes e simular carregamento/falha. Os avisos distinguem a demonstração dos serviços reais e mantêm o acesso ao SAMU nos estados testados.

**Looks good. Ship.** Parecer restrito ao MVP de demonstração local e à carga descrita neste documento; não autoriza publicação nem uso real em saúde.

## Escopo e referências lidas

- Cwd confirmado: `C:\Users\USER\FilaZero`.
- `C:\Users\USER\.codex\skills\ponytail-review\SKILL.md`: disponível e lida antes da preparação. Aplicar casos concretos, rastrear conexões e relatar achados com consequência e menor correção.
- `docs/MVP_PLAN.md`, `src/types.ts` e `Fila_Zero_Design_Guidelines.md`: lidos integralmente. README, HTML, implementação, CSS e testes de dados também lidos; todos os chamadores das cinco exportações de dados estão em `src/main.ts` e `tests/data.test.ts`, ambos examinados. Não existe `.git` neste diretório; revisão feita sobre os arquivos completos, sem diff Git.
- Escrita restrita a `playwright.config.ts`, `tests/e2e/**` e este documento. Correções de implementação serão encaminhadas aos responsáveis, Cedro/Lume.
- Sem novos agentes, deploy ou publicação. Pacotes e demais configurações permanecem sob responsabilidade da implementação.
- Carga assumida: demonstração estática, dados locais fictícios, uma sessão de navegador; sem API, concorrência de escrita ou infraestrutura de produção.

## Ambiente preparado

`@playwright/test` local informou versão 1.65.1. O executável Chromium indicado pelo pacote não existe. Edge encontrado em `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`; configuração usa Chromium pelo canal `msedge`, headless. Navegador efetivamente iniciado: **Edge 157.0.4341.60**. Nenhum navegador foi instalado.

`playwright.config.ts` define desktop 1440 × 900 e mobile 390 × 844 com toque, idioma pt-BR e fuso America/Sao_Paulo. Servidor: `npm.cmd run dev -- --port 5173`, URL `http://127.0.0.1:5173`, `reuseExistingServer: true`. Uma execução por vez, sem repetição automática para ocultar instabilidade. Evidências de falhas ficam em `tests/e2e/.artifacts`.

Na leitura preparatória, `src` continha apenas `types.ts`. Após INTEGRADO, foram lidos `README.md`, `index.html`, `src/main.ts`, `src/ui/map.ts`, `src/styles.css`, `src/data/units.ts`, `src/types.ts` e `tests/data.test.ts`. O app mantém busca/tipo/seleção em memória, usa `filterUnits` para lista e mapa, abre um diálogo nativo com retorno de foco e recarrega dados pela fronteira `listUnits()`. `loadVersion` descarta respostas antigas; o seletor explícito da demonstração oferece `normal`, `slow` e `error`, e repetir retorna ao modo normal. Textos dos dados são escapados antes da inserção em HTML; as únicas coordenadas interpoladas vêm dos fixtures locais. Não há servidor/API nem entrada externa de unidades nesta versão.

`tests/e2e/explore.spec.ts` contém dez cenários, duplicados pelos projetos desktop/mobile. `npm.cmd run test:e2e -- --list` carregou a configuração e listou **20 testes**, saída 0. Seletores usam roles e nomes dos controles existentes; seletores CSS ficam restritos a dados/status e medições visuais. A meta solicitada após a primeira inspeção do Maestro, mapa iniciando até y=500 em mobile390, foi incluída como asserção e passou.

## Matriz de aceite e estratégia

Executar os fluxos centrais nos dois projetos. Usar resultados esperados explícitos dos cenários fictícios; não importar `filterUnits`, formatadores ou a própria saída da aplicação para calcular o resultado esperado.

| Área | Caso concreto | Critério observável |
| --- | --- | --- |
| Conteúdo inicial | Abrir a demonstração | UBS, UPA e Hospital fictícios presentes; cidade/mapa esquemáticos explícitos; ordenação alfabética sem ranking por espera. |
| Busca normalizada | Buscar nome/bairro com caixa trocada, acento removido e espaços externos | Mesmo conjunto esperado de unidades em lista e mapa; manter um resultado conhecido e excluir um controle negativo. Confirmar campos de busca no contrato integrado. |
| Filtros combinados | Aplicar cada tipo e combinar consulta que corresponda a outro tipo | Interseção correta; selecionar Todos não apaga a busca; limpar busca não perde o filtro ativo. |
| Vazio e recuperação | Consulta sem correspondência, depois limpar | Lista e mapa sem unidades residuais; mensagem explícita; contagem coerente; recuperação dos resultados esperados. |
| Sincronia | Abrir unidade pela lista, fechar e abrir seu marcador; depois filtrar a unidade | Mesmos nome, endereço, status, fonte e horário nos detalhes; seleção não aponta para unidade removida; filtrar nunca deixa marcadores antigos. Comparar identidades, não só contagens. |
| Dados disponíveis | Abrir cenário com faixa conhecida | Faixa em minutos, fonte simulada e horário fixo do cenário; nível de fila descrito em texto. |
| Dados antigos/ausentes | Abrir exemplos `stale` e `unavailable` pela lista e mapa | Indisponibilidade explícita; nenhum `0 min` ou faixa corrente substitui ausência; estado antigo não parece atual. Horário ausente não vira horário atual nem data inválida. |
| Detalhes por teclado | Abrir com Enter e Space onde aplicáveis, percorrer Tab/Shift+Tab, fechar com Escape e pelo botão | Nome acessível do diálogo, foco inicial interno, foco contido se modal, retorno ao acionador da lista e do mapa; nenhuma ação de fundo operável durante modal. |
| Segurança da demonstração | Em carregamento, sucesso, filtro ativo, vazio, erro, repetição e cada diálogo | Aviso de simulação e acesso à orientação de emergência visíveis e operáveis no contexto ativo. Texto atrás de modal/inert não satisfaz o critério. |
| Emergência | Acessar orientação pelo teclado e em mobile | Aviso de não usar a demo para decisões reais; telefone real claramente distinto das unidades fictícias; validar rótulo e destino sem realizar ligação. Sem recomendação clínica ou promessa. |
| Carregamento/falha | Atrasar a fronteira de dados, rejeitar uma leitura e repetir | Carregamento observável, erro compreensível, ação de repetição funcional e volta ao sucesso sem duplicar unidades/eventos. Avisos preservados durante toda a transição. |
| Mobile e acessibilidade | 390 px, checagem complementar em 320 px/zoom, conteúdo longo e movimento reduzido | Sem rolagem horizontal da página ou corte de dados essenciais; mapa e controles utilizáveis; alvos de 44 × 44 px; foco visível, rótulos, status além da cor e contraste AA. |

Para atraso e falha, os testes usam o seletor explícito `Simular estado da demonstração`. A carga lenta é observada antes de avançar o relógio controlado do Playwright; verificam-se sucesso, slow→error e slow→normal, incluindo a chegada posterior da carga antiga. Não há interceptação de módulos ou endpoint inventado.

## Riscos a transformar em regressão

Os itens abaixo são riscos derivados do contrato, **não bugs já observados**. Após INTEGRADO, cada defeito confirmado terá caso reproduzível e regressão que falhe pelo comportamento incorreto.

1. Lista e mapa usarem filtros diferentes: combinar busca normalizada + tipo, verificar os nomes esperados nos dois e repetir após limpar.
2. Ausência ou dado antigo virar zero ou estimativa atual: verificar card, nome acessível do marcador e diálogo das unidades correspondentes, além do formato numérico de uma unidade disponível.
3. Avisos existirem apenas fora do diálogo: testar visibilidade e operação dentro do contexto modal, incluindo possível diálogo de emergência.
4. Escape fechar detalhes sem restaurar foco, ou foco escapar para o fundo: regressão com acionadores de lista e mapa e Tab nas duas direções.
5. Repetição de leitura duplicar eventos, unidades ou deixar estado de erro: falha seguida de sucesso, nova filtragem e abertura única dos detalhes.
6. Horário fictício depender do relógio/fuso do usuário: comparar texto conhecido do cenário com relógio distante e outro fuso em teste específico; não usar o mesmo formatador como oráculo.
7. Recurso externo, geolocalização ou texto de tempo real transformar a demo em alegação real: rastrear dependências/requisições e revisar a comunicação em todos os estados; sem chamadas reais ou orientação clínica nos testes.

## Roteiro aplicado após INTEGRADO

1. Ler o diff disponível e o fluxo completo: entrada/estado em `src/main.ts`, componentes em `src/ui/**`, dados em `src/data/**`, CSS, HTML, contrato e testes existentes. Procurar todos os chamadores de funções/assinaturas alteradas; rastrear busca, seleção, erro, repetição e diálogos.
2. Identificar cenários reais e escrever testes em `tests/e2e/**`, priorizando riscos acima. Usar role/nome acessível e esperas de asserção; evitar sleeps, snapshots como único oráculo, asserções tautológicas ou tolerâncias que escondam defeitos.
3. Executar `npm.cmd run build`, `npm.cmd test` e `npm.cmd run test:e2e`. Confirmar que eventual servidor reutilizado em 5173 pertence a esta aplicação; não encerrar processos alheios.
4. Inspecionar visualmente desktop/mobile, foco, zoom, contraste e movimento reduzido. Separar evidência automatizada de inspeção manual; emulação não equivale a aparelho físico.
5. Registrar comandos, códigos de saída, quantidades aprovadas/falhas/ignoradas, navegador efetivamente iniciado, falhas e evidências. Reportar limites de cobertura sem inferir sucesso de testes não executados.
6. Relatar apenas achados confirmados, com arquivo/linha, caso concreto, impacto e menor correção; encaminhar implementação aos responsáveis. Sem aprovação antes das verificações necessárias.

## Registro de execução efetiva

Preparação: leitura de documentos/contrato, verificação de executáveis e consulta à versão/caminho do Playwright via Node. `rg` está indisponível; buscas locais usam PowerShell. Vite já ativo em 5173, pertencente ao projeto conforme confirmação do Maestro, foi reutilizado pelo Playwright.

| Comando / etapa | Resultado efetivo | Observação |
| --- | --- | --- |
| `npm.cmd run build` | Saída 0; TypeScript e Vite 7.3.8; seis módulos | Executado por este revisor antes do ajuste de layout. O Maestro informou build final aprovado após o ajuste; não foi repetido, conforme instrução de evitar repetição desnecessária. |
| `npm.cmd test` | Saída 0; 9 aprovados, 0 falhas, 0 ignorados | Dados, contrato e testes permaneceram iguais durante o ajuste visual. |
| `npm.cmd run test:e2e -- --list` | Saída 0; 20 casos descobertos | Apenas descoberta, antes do congelamento final. |
| `npm.cmd run test:e2e` | Saída 1; 16 aprovados, 4 falhas; 42,2 s | Suite completa executada após FINAL CONGELADO. Falhas em duas asserções dos testes, repetidas nos dois tamanhos; diagnóstico abaixo. |
| `npm.cmd run test:e2e -- --grep "todas as unidades\|teclado"` | Saída 1; 2 aprovados, 2 falhas; 17,9 s | Sincronia corrigida e aprovada nos dois tamanhos; restavam pressupostos incorretos do teste de teclado. |
| `npm.cmd run test:e2e -- --grep "teclado"` | Saída 0; 2 aprovados, 0 falhas; 4,6 s | Últimos dois casos aprovados após corrigir o teste. |

Resultado acumulado no primeiro congelamento, anterior à remoção da faixa: **20/20 cenários distintos aprovados**, sem ignorados nem retries automáticos. Não houve uma nova execução completa de 20 após os ajustes dos testes: somente os casos afetados foram repetidos, conforme solicitado. A implementação permaneceu congelada durante aquela execução E2E. O reteste da remoção da faixa está registrado separadamente abaixo.

As falhas iniciais não foram defeitos do produto:

- O card era lido com `innerText`, incluindo a quebra visual de `<br>`, e o diálogo comparado com `textContent`, que concatena os textos. A comparação agora usa `innerText` nos dois lados e continua exigindo igualdade de conteúdo.
- O teste exigia que Shift+Tab fosse diretamente do botão Fechar ao último link. O diálogo nativo do Edge também pode focar o próprio contêiner rolável e a interface do navegador. O diagnóstico observou esses passos e confirmou que o fundo nunca recebe foco. O teste agora permite apenas esses passos intermediários conhecidos, exige a ordem dos controles e tenta focar explicitamente a busca de fundo, que continua bloqueada pelo modal. Não se usa a descoberta por role do Playwright como prova de remoção da árvore acessível nativa.
- Uma tentativa de diagnóstico via pipeline PowerShell falhou por converter acentos em `?`; foi refeita com seletor sem acento. Isso não alterou o app ou o resultado de nenhum E2E.

Os retestes substituem a pasta de saída do Playwright. As contagens acima são o histórico real dos comandos, não uma inferência do `.last-run.json`; esse arquivo agora corresponde aos quatro casos do reteste sem faixa. Capturas atuais: [desktop1440 sem faixa](../tests/e2e/.artifacts/sem-faixa-desktop.png) e [mobile390 sem faixa](../tests/e2e/.artifacts/sem-faixa-mobile.png).

## Pontos confirmados no primeiro congelamento

- Busca ignora caixa, acentos compostos/decompostos e espaços externos; combina os três tipos e recupera o vazio. Lista e mapa mantêm identidades e contagens iguais.
- As oito unidades abrem por ambos os acionadores; o diálogo preserva endereço/espera e fonte simulada. Seleção é removida quando a unidade deixa o filtro.
- Estimativas conhecidas são exibidas em faixa. Os cinco exemplos sem estimativa, incluindo desatualização e indisponibilidade, mostram ausência explícita em cards e diálogo; sem zero padrão. Fila moderada sem estimativa continua moderada, conforme independência prevista no contrato.
- Aviso de simulação e link `tel:192` presentes, visíveis e focalizáveis nos estados inicial, filtrado/vazio, carregando, erro e nos oito diálogos. Não foi realizada ligação. O diálogo bloqueia foco no fundo e restaura o acionador de lista/mapa ao fechar por Escape ou botão.
- O seletor real de demonstração cobre carga lenta, erro, repetição e reentrada slow→error/normal. O resultado antigo não sobrescreve o estado recente; repetir mantém busca/tipo e restaura foco na busca.
- Busca com texto de elemento HTML/evento não injeta DOM. Na recarga observada, não houve erro JavaScript nem requisição externa. Leitura do código confirma escaping dos campos textuais, links externos constantes com `noopener noreferrer` e ausência de geolocalização/API/tiles.
- Horários continuam fixos mesmo com relógio em 2040 e navegador em Asia/Tokyo/en-US. Não são usados como estimativa de atualidade real.
- Medição anterior à remoção da faixa: mapa y=**476,19** em390×844, y=**439,22** em1440×900; fonte e rótulos de fila medidos em **12 px** nos dois tamanhos. Sem overflow horizontal nesses tamanhos, em320 px ou ao aumentar texto a200%; controles centrais medidos com pelo menos44×44 px; preferência de movimento reduzido aplicada.
- Cálculo pontual dos pares sólidos do CSS: texto institucional/off-white **18,36:1**; branco/azul **6,77:1**; metadados/off-white **6,37:1**; rótulos baixa/moderada/alta sobre branco **7,29 / 6,95 / 6,97:1**. Esses pares passam 4,5:1; não equivalem a uma auditoria de todas as combinações/estados.

## Reteste direcionado — faixa removida

Após o aviso **FAIXA REMOVIDA E CONGELADA**, foram relidos o cabeçalho/intro de `src/main.ts` e o CSS final. `aside.demo-banner` e as regras exclusivas `demo-banner`/`demo-label` foram removidos; o texto exato de `warning` passou para `p.demo-notice`, imediatamente depois do título. O aviso do diálogo continua próprio do modal. Nenhuma implementação foi editada por este revisor.

O caso inicial foi ampliado com regressão da retirada da faixa: exige o parágrafo junto ao título, texto exato, fonte 12 px, fundo transparente no aviso e no intro, ausência do banner antigo e persistência da segurança em erro, carga lenta e diálogo. Os demais casos de lógica permanecem intactos.

Comando efetivamente executado: `npm.cmd run test:e2e -- --grep "cenário inicial|layout preserva"`.

- **Saída 0: 4 aprovados, 0 falhas, 0 ignorados; 6,5 s**, Edge headless pelo canal `msedge`, Vite existente reutilizado.
- Desktop 1440×900: aviso 12 px, cor neutra `rgb(91, 91, 87)`, mapa iniciando em **y=416,81**.
- Mobile 390×844: aviso 12 px, mesma cor neutra, mapa iniciando em **y=465,69**, dentro da meta até y=500.
- Texto exato de simulação visível no início, na falha simulada, durante carga lenta e no diálogo de UBS Acácias; acesso a `tel:192` visível e focalizável nesses estados, sem realizar ligação. Aviso de página continua visível após fechar o diálogo; o banner antigo não reaparece.
- Layout sem overflow em desktop/mobile, complemento em320 px e texto a200%; alvos centrais de44×44 px e movimento reduzido aprovados pelos dois casos de layout.
- As duas capturas atuais foram abertas e inspecionadas por este revisor: topo sem faixa preta, aviso legível junto ao título e mapa preservado. Isso complementa a inspeção anterior do Maestro; não é teste em aparelho físico.
- Nenhum erro JavaScript ou requisição externa observado nos casos iniciais ampliados.

Os outros **16 cenários E2E**, os nove testes de dados e o build não foram repetidos: dados/contrato/lógica permanecem intactos e o Maestro informou novo build final aprovado. O histórico anterior foi preservado, sem declarar uma nova execução completa. A pasta de artefatos atual contém as capturas sem faixa e os resultados desse reteste direcionado.

Parecer mantido: **Verdict: Ship.** Ajuste visual aprovado dentro do escopo de demonstração local; nenhum achado novo.

## Achados e limites

Nenhum achado confirmado nas categorias Must fix, Should fix ou Nice to have. Não foram sugeridas abstrações, dependências ou otimizações para oito unidades locais. Correções feitas por este revisor ficaram exclusivamente nos testes; arquivos de implementação não foram editados.

A inspeção visual via portal ficou com o Maestro em paralelo; não é apresentada aqui como execução própria nem como certificação WCAG. Capturas e medições automatizadas não substituem inspeção com usuários.

**Verdict: Ship.** Para a demonstração local revisada, sem bloqueante confirmado.

**Not checked:** aparelhos físicos, Safari/Firefox, leitor de tela real, auditoria WCAG completa, todas as combinações de contraste, infraestrutura/integração real e uso clínico. Build final informado pelo Maestro; este revisor executou o build anterior ao ajuste visual. Sem deploy/publicação.
