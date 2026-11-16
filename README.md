# Fila Zero

MVP web responsivo em **glassmorphism** para localizar UBS, UPAs e hospitais públicos de São Paulo em mapa e lista, exibindo nível de fila e tempo estimado de espera.

## Trajetos reais com Dijkstra em Python

O mapa principal e a tela **Simular trajetos** usam uma extração real de ruas do OpenStreetMap, processada pelo Dijkstra com `heapq` em Python. Usa a localização do navegador e calcula trajetos para as **30 unidades do mesmo catálogo do mapa** (10 UBS, 10 UPAs e 10 hospitais), somando deslocamento e espera quando houver estimativa disponível. O percurso desenhado usa os nós originais das ruas, respeitando sentidos e permissões de acesso por carro.

Para executar o site completo com a API, na raiz do projeto:

```sh
npm.cmd run build
python -m fila_zero.servidor
```

Abra `http://127.0.0.1:8000/` e autorize a localização no navegador. O botão **Usar minha localização** permite tentar novamente. A comparação também está em `http://127.0.0.1:8000/simulador.html`. O mesmo servidor disponibiliza o catálogo em `/`. Em desenvolvimento, mantenha esse Python aberto e execute `npm.cmd run dev` em outro terminal; o Vite encaminha `/api` para a porta 8000.

O cadastro em `fila_zero/dados/unidades.json` é compartilhado pelo TypeScript e pelo Python. A posição é enviada no corpo do pedido à API local e não é salva pelo aplicativo. Permissão negada e origem fora da cobertura geram mensagens claras; não há fallback automático para a Sé.

A cópia OSM incluída cobre parte de São Paulo e funciona offline para calcular rotas; somente o fundo cartográfico necessita de internet. O tempo de carro usa a extensão dos trechos e velocidades de referência, sem trânsito ao vivo. O modelo não interpreta restrições de conversão ou regras condicionais e termina no acesso viário próximo da unidade.

Consulte [a documentação das rotas OSM](docs/ROTAS_OSM.md), [a ficha e o guia Python](fila_zero/README.md) e [os prompts usados](prompts.md). O exemplo de terminal `python -m fila_zero` continua disponível como exercício didático separado, com dados sintéticos; ele não fornece os dados da tela web.

## Executar localmente

Requer Node.js 22.18+ e npm. No diretório do projeto:

```sh
npm install
npm run dev
```

Abra a URL local impressa pelo Vite, normalmente `http://127.0.0.1:5173`. No PowerShell, se a política bloquear `npm.ps1`, use `npm.cmd` nos comandos.

```sh
npm test
npm run build
npm run preview
```

O build gera `dist/`. `preview` serve esse resultado localmente. Nada é publicado automaticamente.

No mobile, o mapa ocupa a tela e a lista fica em uma folha inferior: use **Expandir lista** ou **Recolher lista**. No desktop, a barra lateral e o cabeçalho flutuam sobre o mapa em vidro fosco, com filtros por tipo (`UBS`, `UPA`, `Hospital`), ícones dedicados, cartões com anel indicador de espera e marcadores em balão no mapa. O painel **Sobre os dados** explica a interface e permite testar estados de carregamento e falha.

Para os testes de navegador neste ambiente Windows com Microsoft Edge instalado:

```sh
npm run test:e2e
```

Os testes usam Playwright com o canal `msedge`, em modo headless, nos tamanhos desktop e mobile. Não realizam ligações telefônicas. Em outros ambientes, selecione um navegador disponível na configuração Playwright e adapte o comando `npm.cmd` do servidor para `npm`.

O histórico de validação e os retestes estão em `docs/REVIEW.md`. A versão anterior com mapa esquemático teve build, 9 testes de dados e 20 cenários de navegador aprovados. A validação da migração para Leaflet será registrada separadamente; resultados antigos não comprovam o comportamento do mapa real. Não houve teste em aparelho físico ou com leitor de tela.

## Arquitetura e dados

TypeScript, Vite, HTML semântico, CSS e Leaflet 1.9.4. O catálogo é estático. A tela de trajetos usa a API Python local em `fila_zero/servidor.py`; não há banco, autenticação ou dados de pacientes. A malha OSM é local; o fundo do mapa vem de um serviço externo.

- `src/types.ts`: contrato das unidades e dos estados dos dados.
- `src/data/units.ts`: catálogo de 30 unidades reais em São Paulo (10 UBS, 10 UPA e 10 Hospitais), consulta, busca e apresentação dos dados.
- `src/main.ts`, `src/styles.css`, `src/ui/`: interface e interações.
- `docs/MVP_PLAN.md`: decisões, contrato e limites originais do MVP.
- `tests/data.test.ts`: testes do contrato e comportamentos dos dados.
- `tests/e2e/`: testes dos principais fluxos no navegador.
- `docs/REVIEW.md`: histórico de revisão e validação.

Os dados locais do MVP distribuem tempos de espera entre `low` (`≤ 15 min`), `moderate` (`15 – 45 min`), `high` (`> 45 min`), além de unidades com status `'stale'` (desatualizado) e `'unavailable'` (indisponível). Os formatadores preservam a distinção clínica de cada estado e `estimatedWait: null` nunca é convertido em zero.

`location.lat/lng` trazem as coordenadas verificadas das unidades em São Paulo. O módulo `src/data/units.ts` fica separado da interface e exporta `mapReference` (`São Paulo`, zoom `12`).

## Mapa de ruas

Base vetorial minimalista em tons de branco via OpenFreeMap (`https://tiles.openfreemap.org/planet`), renderizada no Leaflet com MapLibre GL (`maplibre-gl` e `@maplibre/maplibre-gl-leaflet`), com estilo customizado em `src/ui/mapStyle.ts` destacando rios/água em azul, parques/áreas verdes em verde, ruas nítidas, sem ícones desnecessários e com atribuição visível (`© OpenStreetMap contributors · © OpenFreeMap · © OpenMapTiles`). Leaflet, MapLibre GL e CSS são empacotados localmente. É necessária conexão para carregar os tiles vetoriais do mapa; a lista e seus detalhes continuam disponíveis se os tiles falharem.

A licença BSD do Leaflet está preservada em `public/leaflet-license.txt` e é copiada para o build como `/leaflet-license.txt`.

O navegador usa cache e Referer normais. Não há download offline, varredura, prefetch em massa ou proxy. O serviço público não oferece garantia de disponibilidade; antes de publicar ou aumentar o volume, revise a [política de tiles](https://operations.osmfoundation.org/policies/tiles/) e escolha um provedor adequado. Não adicione headers que omitam o Referer ou desativem o cache.

Os testes de navegador interceptam o TileJSON e os blocos vetoriais `.pbf` do OpenFreeMap com respostas locais de teste, incluindo falhas e recuperação, para não sobrecarregar o serviço. Capturas de testes com tiles interceptados não comprovam ruas reais: a inspeção pontual da base real é feita separadamente no portal visível.

## Avisos de uso e emergência

A prioridade clínica e a unidade adequada dependem da avaliação da equipe de saúde; confirme o atendimento na unidade antes de se deslocar. O acesso ao SAMU pelo telefone **192 é real**; não o utilize para testar a interface. A orientação é baseada no [Ministério da Saúde](https://www.gov.br/saude/pt-br/composicao/saes/samu-192/samu-192).

## Limites desta versão

Sem integração operacional com unidades, esperas reais, trânsito ao vivo, previsão, pré-check-in, painel administrativo ou autenticação. O cálculo de deslocamento está disponível na tela de trajetos, dentro da área da extração OSM. Acessibilidade é verificada por testes e inspeção, sem alegar certificação WCAG ou substituir avaliação com usuários e tecnologias assistivas reais.

Os documentos originais de visão e identidade recebidos foram preservados na raiz do projeto.
