# Uso de IA no trabalho Python Fila Zero

Foi utilizado o Codex para propor o recorte acadêmico e implementar/revisar o pacote Python, dados fictícios, testes e documentação. A equipe deve revisar o código e compreender os algoritmos antes da apresentação.

## Prompt 1 — definição da proposta

> leia o arquivo de visao geral upa agora pdf e fila zero design guide lines e me ajude a criar uma ideia para um trabalho de python sobre algoritmos complexos. o nome do projeto definido é fila zero. esses sao os requisitos

O usuário forneceu também o texto dos critérios do professor: escolha de pelo menos um entre memoização, tabulação e grafos; relação com a CitizenTech; algoritmo correto e eficiente; análise prática ou teórica; funções e separação da interface; entrega em ZIP com README, ficha, integrantes e este registro de prompts; uso de dados simulados ou públicos.

## Prompt 2 — implementação

> consegue implementar dentro do projeto, mesmo usando dados ficticios. como para calcular o trajeto e outras coisas?

## Resultado e limites do uso de IA

Foi implementado Dijkstra com `heapq`, reconstrução de caminhos, comparação de deslocamento e faixa de espera, bloqueios, menu de terminal, validação de JSON, benchmark e testes. A espera é uma entrada fixa do cenário; não há previsão clínica, integração real com UPAs ou roteamento geográfico. Os testes incluem comparação com Floyd-Warshall somente como oráculo independente de verificação; ele não é o algoritmo do produto.

Este registro cobre a conversa de criação do módulo Python. Não afirma documentar eventuais usos de IA anteriores no site. Acrescente aqui os próximos prompts efetivamente usados pela equipe.

## Prompt 3 — integração web

> consegue integrar esse modulo python com a interface do site para mostrar o trajeto no mapa e comparar deslocamento e espera, mesmo com dados ficticios?

## Prompt 4 — esclarecimento da geometria

> nao ta realmente usando o mapa e as ruas de verdade, pq nao? me responde primeiro de fazer qualquer mudanca

Foi explicado que a primeira integração usava uma rede fictícia sobre um mapa real, interpretação que não correspondia ao resultado esperado. Nenhuma alteração foi feita durante a resposta de esclarecimento.

## Prompt 5 — correção para ruas reais

> pode corrigir para usar as ruas reais do OpenStreetMap e calcular o trajeto com o Dijkstra em Python, mantendo só os dados de espera fictícios

A integração passou a importar uma cópia real do OSM e usar sua topologia e geometria com o Dijkstra próprio em Python. Os destinos web foram substituídos pelas UPAs reais Lapa e Vergueiro. As esperas permanecem fictícias. Limites de cobertura, acesso viário, velocidades de referência e ausência de restrições de conversão/trânsito ao vivo estão documentados em `docs/ROTAS_OSM.md`.

## Prompt 6 — localização e todas as unidades

> consegue usar minha localização como ponto de partida e calcular o trajeto e o tempo total para todas as unidades que já aparecem no mapa do site?

O catálogo foi unificado em `fila_zero/dados/unidades.json`, compartilhado pelo site e pelo backend, incluindo as 30 unidades existentes. Foi adicionada origem por geolocalização, com coordenadas validadas e uso transitório no servidor local. A malha OSM foi ampliada e complementada até haver trajetos para as 30 unidades no ponto de teste. O site principal passou a usar os resultados do Python em vez da estimativa por distância em linha reta. Espera indisponível ou desatualizada não gera total inventado; permissão negada, GPS inválido, origem fora da cobertura, erros e respostas antigas são tratados.

## Prompt 7 — localização imprecisa

> a minha localizacao utilizando o gps, nao ta precisa. esta proximo mas esta errado por mais de 2km

Foi desativado o uso de posições antigas em cache e adicionada a correção manual da origem no mapa. A precisão física continua dependendo do dispositivo e do navegador.
