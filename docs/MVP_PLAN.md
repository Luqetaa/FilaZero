# Fila Zero — plano e contrato do MVP

## Referências e limites
O guia Markdown na raiz governa nome e design. O PDF na raiz orienta a visão futura. Os documentos recebidos estão na raiz, não em `docs/`; foram preservados nos caminhos originais.
Atualização visual pedida pelo usuário: usar a referência de interface enviada, com sidebar à esquerda e mapa à direita no desktop; no mobile, mapa ocupando a viewport, controles flutuantes com glassmorphism e lista em folha inferior expansível. Essa preferência explícita substitui a proibição anterior de glassmorphism; manter contraste, legibilidade, avisos e atribuição. A imagem serve de referência de composição; não autoriza rotas, GPS ou ordenação por menor espera.
As unidades, endereços, posições de demonstração, filas e estimativas são fictícios. O mapa de ruas é real, com São Paulo como referência escolhida pelo usuário. Não há integração com unidades reais. Não oferece orientação clínica, classificação de risco, rotas, ranking de unidades ou garantia de atendimento.

## Arquitetura
Aplicação estática TypeScript + Vite, HTML semântico e CSS. Sem servidor de API, banco, autenticação ou infraestrutura de produção. Leaflet 1.9.4 com tiles raster de ruas OpenStreetMap; sem geolocalização. O módulo `src/data/units.ts` é a fronteira de leitura; sua implementação poderá ser substituída quando houver uma fonte real aprovada. Uma futura importação do CNES exige antes cidade definida, análise da disponibilidade/qualidade e coordenadas verificadas. Nenhuma unidade real será importada neste trabalho.

## Contrato definido antes da implementação paralela
`src/types.ts` define `HealthUnit`, `UnitType`, `DataStatus` e `QueueLevel`.
- Tipo de unidade: `UBS | UPA | Hospital`.
- Estado: `available | stale | unavailable`, independente do nível de fila.
- Nível: `low | moderate | high | unknown`, rótulos de cenário, sem derivação por limites arbitrários de minutos.
- Estimativa: `{ min, max } | null`. Somente `available` pode ter estimativa; `null` é ausência, nunca zero padrão.
- Data: ISO 8601 com fuso ou `null`. Horários são fixos do cenário, não relativos ao relógio real.
- Fonte sempre identificada como simulada; `simulated: true` obrigatório.
- `location: { lat, lng }` contém coordenadas geográficas de pontos fabricados para a demonstração; não representam unidades existentes ou seus endereços fictícios. `mapReference` é exportado pelos dados com `{ name, center: { lat, lng }, zoom }`, em São Paulo. O campo `city` dos endereços continua como cenário fictício Vila Aurora, explicitamente distinto da área do mapa de referência.
- Exportações do módulo: `listUnits(): Promise<HealthUnit[]>`, `filterUnits(units, query, type: UnitType | 'all'): HealthUnit[]`, `formatWait(unit): string`, `formatUpdatedAt(unit): string`, `queueLabel(unit): string`.
- Busca ignora caixa, acentos e espaços externos; filtro e busca são combinados, ordem alfabética por nome sem recomendar unidade.

## Divisão dos arquivos
- Maestro: configuração, `src/types.ts`, documentos e instalação de dependências.
- Backend e Dados: `src/data/**` e `tests/data.test.ts`.
- Frontend: `index.html`, `src/main.ts`, `src/styles.css`, `src/ui/**`, `public/**`.
- Revisão e Testes: leitura da implementação, `tests/e2e/**`, `playwright.config.ts`, `docs/REVIEW.md`; correções de implementação retornam ao responsável.

## Critérios de aceite
1. Mapa e lista exibem UBS, UPA e Hospital fictícios; busca/filtro atualizam ambos e permitem abrir os mesmos detalhes.
2. Cada unidade mostra nome, endereço fictício, fila, fonte simulada, horário ou sua ausência e faixa estimada ou indisponibilidade explícita.
3. Existem exemplos disponíveis, desatualizados e indisponíveis. Dados antigos não parecem atuais.
4. Aviso de dados simulados e acesso à orientação de emergência em todos os estados, inclusive detalhes, carregamento e erro; nunca usar a demo para decisões reais.
5. Sem ordenação por menor espera, promessa de atendimento ou alegação de tempo real. Menor fila não determina adequação; prioridade depende da avaliação da equipe.
6. Mobile-first, teclado, foco visível, rótulos acessíveis, contraste AA, texto além da cor, alvos de toque de pelo menos 44 px e respeito a movimento reduzido.
7. Estados de carregamento, falha com repetição e busca vazia funcionam. Build, testes de contrato e testes principais de navegador executados e resultados relatados sem inventar cobertura.
8. Mapa de ruas real com zoom/pan e atribuição OpenStreetMap visível. Busca/filtro/seleção refletem a mesma fonte na lista e nos marcadores. Falha total/parcial ou demora dos tiles mostra aviso e repetição manual sem bloquear a lista nem seus detalhes. Falha ao inicializar o mapa também é isolada da lista.
9. Mobile: mapa em toda a viewport disponível com controles de vidro legíveis e folha de lista expandível por botão; desktop: sidebar com rolagem e mapa no restante da tela. Créditos do mapa nunca ficam cobertos pela folha, e aviso DEMO e emergência permanecem acessíveis. Não adicionar controles sem função.

## Uso dos tiles
Provedor inicial: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, atribuição visível e clicável `© OpenStreetMap contributors` ligada a https://www.openstreetmap.org/copyright. Biblioteca e CSS são empacotados localmente. Usar navegador com Referer válido e cache HTTP padrão; não definir políticas que omitam o Referer. Sem proxy, offline, prefetch em massa ou service worker. Limitar solicitações ao viewport com `keepBuffer: 0` e atualização ao terminar movimento; não atualizar tiles em cada tecla de busca. Retentar somente sob ação do usuário. Provedor é best-effort, sem garantia de disponibilidade. Revisar provedor/termos antes de publicação ou maior volume.

Política oficial: https://operations.osmfoundation.org/policies/tiles/. Testes de navegador devem interceptar as requisições de tiles antes da navegação, com raster de teste determinístico, e simular falha/recuperação sem acessar o provedor. A inspeção visual real usa o portal visível em uma área pequena, sem varredura automática de zoom/pan.

## Futuro (fora desta versão)
Integração autorizada com sistemas de senhas, contrato canônico de eventos anônimos, reconciliação, estimativas calibradas, histórico e previsões. Painel de gestão e pré-check-in dependem de decisões posteriores, validação operacional e privacidade.

## Referência da orientação de emergência
Ministério da Saúde, SAMU 192: https://www.gov.br/saude/pt-br/composicao/saes/samu-192/samu-192
O acesso telefônico real deve ser rotulado explicitamente, distinto das unidades fictícias.
