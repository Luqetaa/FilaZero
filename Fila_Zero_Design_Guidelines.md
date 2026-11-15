# Fila Zero — Guia de Identidade Visual e Regras de Design

**Versão:** 1.0  
**Direção aprovada:** 01 — Geolocalização  
**Aplicação:** marca, site, aplicativo, apresentações e comunicação digital

> **Conceito central:** o **zero** da marca se transforma em um **marcador de localização**. A Fila Zero ajuda pessoas a encontrar UBS, UPAs e hospitais públicos e a consultar informações sobre filas e espera em um mapa.

Este documento define uma **proposta de sistema visual** para dar consistência aos próximos materiais. As especificações podem ser ajustadas após testes de legibilidade, acessibilidade e implementação.

---

## 1. Essência da marca

### Personalidade

- **Clara:** a informação mais importante aparece primeiro.
- **Ágil:** a navegação reduz etapas desnecessárias.
- **Confiável:** distingue dados confirmados, estimativas e informações indisponíveis.
- **Humana:** usa linguagem simples e respeitosa.
- **Urbana e contemporânea:** combina tipografia forte e formas geométricas simples.

### Posicionamento

A Fila Zero é uma plataforma digital de **orientação sobre atendimento na saúde pública**, que reúne localização de unidades e informações de filas e espera para facilitar a decisão sobre onde procurar atendimento.

**Assinatura descritiva preferencial:** `Filas da saúde pública no mapa.`

**Chamada principal de campanha:** `Saiba onde esperar menos.`

**Importante:** “Fila Zero” é um nome de marca — **não** uma promessa de ausência de filas, de atendimento imediato ou de diminuição garantida da espera.

---

## 2. Princípios visuais

1. **Tipografia em primeiro lugar.** A mensagem deve funcionar mesmo sem fotografia ou ilustração.
2. **Poucas cores, usadas com intenção.** Azul, off-white e quase preto compõem a identidade institucional.
3. **Geometria com significado.** Pinos, círculos, linhas de rota e pontos devem remeter a localização, orientação ou status.
4. **Contraste alto.** Priorizar combinações legíveis e espaços bem definidos.
5. **Espaço vazio é parte do design.** Não preencher uma composição só para parecer completa.
6. **Interface não é cartaz.** A expressão tipográfica ousada cabe na marca e na comunicação; no produto, a legibilidade e a utilidade vêm primeiro.
7. **Sem ornamentos gratuitos.** Cada elemento deve apoiar identidade, navegação ou compreensão.

### Evitar

- Gradientes e efeitos de brilho.
- Sombras grandes, glassmorphism e 3D decorativo.
- Ícones clichês de saúde como cruzes genéricas, corações e estetoscópios na marca.
- Excesso de elementos, fundos estampados ou muitas fontes.
- Cantos arredondados em todo elemento indiscriminadamente.
- Usar vermelho/verde como únicas pistas de status.

---

## 3. Logotipo — direção 01 (Geolocalização)

### Conceito

O **“o” final de “zero”** pode ser estilizado como um **pin de mapa**: corpo arredondado, centro vazado e pequena ponta inferior. É o ativo visual mais reconhecível da Fila Zero.

### Assinaturas oficiais propostas

1. **Principal, empilhada:** `fila` na primeira linha e `zero` na segunda, com o último **o** substituído pelo símbolo de localização.
2. **Horizontal:** `fila zero` na mesma linha, com o **o** final transformado em marcador.
3. **Wordmark simples:** `fila zero` escrito sem alteração, para contextos que exigem leitura impecável.
4. **Símbolo isolado:** pin-zero; versão para ícone do app, favicon e avatar.

### Regras de construção

- Letras em **caixa baixa**, com peso **bold/extra-bold** e formas arredondadas de maneira controlada.
- Espaçamento entre letras compacto, mas sem encostar ou prejudicar a leitura.
- O símbolo deve se encaixar na altura visual do **o** e preservar a leitura de **zero**.
- A abertura central do pin deve continuar distinguível em tamanhos pequenos.
- Não inclinar, distorcer, rotacionar ou redesenhar o logotipo de maneira improvisada.
- Não combinar a logo com ícones de cruz, batimento cardíaco ou outros elementos concorrentes.

### Cores aprovadas para a logo

| Situação | Logo | Fundo |
|---|---|---|
| Principal | Preto + pin azul | Off-white |
| Invertida | Branco | Azul |
| Monocromática escura | Preto | Off-white/branco |
| Monocromática clara | Branco | Preto/azul |

**Não aplicar** efeitos 3D, sombra, contorno decorativo, gradiente nem várias cores dentro do pin.

### Área de proteção e redução

- Definir uma unidade **X** equivalente ao diâmetro do miolo vazado do pin.
- Manter **pelo menos 2X** de área livre ao redor da assinatura.
- Como ponto de partida, testar logo horizontal em **largura ≥ 120 px** e símbolo isolado em **≥ 20 px**; validar os limites definitivos em telas reais.
- Em tamanhos muito pequenos, priorizar o símbolo simplificado ou o wordmark sem substituição de letra.

---

## 4. Paleta cromática

### Cores institucionais

| Token | Cor | HEX | Função |
|---|---|---|---|
| `brand.blue` | Azul Fila Zero | `#0A3CFF` | Marca, botões primários, elementos de destaque |
| `brand.offwhite` | Off-white | `#F9F7F1` | Fundos claros e materiais editoriais |
| `brand.ink` | Quase preto | `#0B0B0D` | Texto, logo monocromático, contraste |
| `base.white` | Branco | `#FFFFFF` | Superfícies de UI, texto em fundo escuro |

### Distribuição sugerida

- **Comunicação institucional:** grandes áreas off-white ou azul com tipografia contrastante.
- **Interface do produto:** fundo neutro e cartões claros; azul reservado a navegação, ações e marca.
- **Campanhas:** permitido usar azul como fundo predominante com texto branco.

### Cores de dados (não fazem parte da assinatura da marca)

- **Espera baixa:** verde.
- **Espera moderada:** amarelo/âmbar.
- **Espera alta:** vermelho.
- **Sem dados:** cinza neutro, acompanhado de texto explícito.

**Regra:** as cores de status são semânticas, não decorativas. Definir seus valores finais com testes de contraste e legibilidade. **Não fixar faixas de minutos arbitrárias**: os limites devem depender da fonte, do serviço e do modelo de estimativa. Sempre mostrar o rótulo textual, mesmo quando houver cor.

---

## 5. Tipografia

### Famílias propostas

- **Display / marca / títulos:** **Space Grotesk Bold** ou uma tipografia geométrica de impacto equivalente. O logotipo final pode exigir ajustes e desenho personalizados.
- **Interface / textos / dados:** **Inter** (Regular, Medium, Semibold e Bold).

### Hierarquia sugerida

| Uso | Estilo | Diretriz |
|---|---|---|
| Hero de landing page | Display Bold | Grande, dominante, entrelinha compacta |
| Títulos de seção | Display Bold/Semibold | Poucas palavras, forte contraste |
| Títulos de cards | Inter Semibold | Leitura rápida |
| Textos corridos | Inter Regular | Leitura confortável |
| Números de espera | Inter Bold/Semibold | Destaque e alinhamento consistente |
| Labels técnicos | Inter Medium | Pequenos, mas sempre legíveis |

### Regras

- Priorizar **sentence case** em títulos de produto e interface; caixa alta pode ser usada em pequenos rótulos editoriais.
- Evitar mais de **dois tipos de fonte** no mesmo material.
- Títulos podem quebrar em linhas curtas e deliberadas; não quebrar palavras em interfaces.
- Não comprimir ou esticar artificialmente as fontes.
- Usar números tabulares quando alinhar tempos e métricas em listas/tabelas.
- Não depender exclusivamente de tamanho ou peso para transmitir hierarquia.

---

## 6. Formas e linguagem gráfica

O sistema visual deriva de três elementos:

1. **Pin-zero:** localização e identidade.
2. **Linhas de rota:** orientação e deslocamento, preferencialmente com traços contínuos e simples.
3. **Anéis/círculos:** pontos de interesse, estados e indicadores.

### Uso

- Formas chapadas, sem gradientes.
- Espessuras de traço consistentes dentro da mesma peça.
- Geometria limpa, fácil de reconhecer em pequenos tamanhos.
- Ícones da mesma família visual (mesma lógica de cantos, traços e escala).
- O pin-zero pode ser ampliado, cortado pelas bordas e usado como elemento editorial em campanhas; **não** fazer isso quando for um elemento funcional de navegação.

---

## 7. Grid, espaçamento e composição

### Regra-base

Adotar escala de espaçamento em múltiplos de **4 px**, com preferência por passos de **8 px** em componentes maiores.

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
}
```

### Composição

- Usar alinhamentos consistentes e margens generosas.
- Priorizar seções com **um assunto principal**.
- Na landing page, permitir tipografia ocupando grande parte do espaço.
- No aplicativo, priorizar mapa, busca, filtros e informações de unidades.
- Usar linhas finas e blocos de cor para separar seções, em vez de excesso de cartões e sombras.
- Não adicionar elementos só para equilibrar visualmente a tela.

### Responsividade

- **Mobile-first** para o aplicativo.
- Em telas pequenas, não sacrificar botões, leitura ou mapa apenas para reproduzir composições editoriais de desktop.
- Estabelecer áreas de toque confortáveis, com alvo de pelo menos **44 × 44 px** como referência.
- Preservar nomes de unidades e estimativas sem cortes que causem interpretação errada.

---

## 8. Componentes e UI do aplicativo

### Hierarquia de informação de uma unidade

1. **Nome da unidade** (ex.: UBS / UPA / hospital).
2. **Situação da fila/espera** e sua fonte.
3. **Tempo estimado** (somente quando existir dado confiável).
4. **Horário da última atualização**.
5. **Localização, endereço e distância**.
6. **Ações:** ver detalhes, rotas, contato, quando disponíveis.

### Mapa

- O **mapa é o protagonista da interface**.
- Marcadores devem indicar unidades e, quando possível, estados de espera com **cor + forma/texto**, sem depender apenas de cor.
- Manter o pin-zero da marca distinto dos pins funcionais, evitando ambiguidade.
- Preferir busca persistente e filtros fáceis de acessar por tipo de unidade.
- Estados de interação (selecionado, foco, indisponível) devem ser perceptíveis.

### Cards

- Visual neutro e organizado, com bom contraste.
- Nome da unidade e status em destaque, mas sem disputar com o mapa.
- Tempo estimado acompanhado de unidade e explicação: `Espera estimada: 25 min`.
- Se o dado estiver indisponível, usar `Tempo de espera indisponível` — nunca mostrar `0 min` por padrão.
- Em caso de dado desatualizado, exibir claramente essa condição.

### Botões e controles

- **Primário:** azul sólido com texto de alto contraste.
- **Secundário:** fundo neutro ou borda discreta.
- **Destrutivo/alerta:** cores semânticas apenas quando realmente necessário.
- Estados: padrão, hover, pressionado, foco, desabilitado e carregando.
- Raio de borda moderado e consistente; evitar um visual excessivamente “pill” em todos os elementos.

---

## 9. Acessibilidade

- Buscar contraste mínimo **WCAG AA**: **4,5:1** para texto comum e **3:1** para texto grande e componentes gráficos relevantes.
- Verificar especificamente **branco sobre azul** e **azul sobre off-white** antes de aprovar tamanhos pequenos.
- Nunca usar apenas verde, amarelo ou vermelho para comunicar a situação de uma fila.
- Dar nomes acessíveis a botões, marcadores de mapa e ícones interativos.
- Garantir navegação por teclado e foco visível na versão web.
- Permitir zoom e aumento de fonte sem cortar informações importantes.
- Não esconder informações essenciais exclusivamente em animações, hover ou gestos.
- Respeitar preferências de redução de movimento.

---

## 10. Motion e microinterações

A marca pode usar animação, mas com moderação.

**Permitido:**

- Entrada sutil de títulos e blocos.
- Realce discreto de marcador selecionado.
- Transições rápidas de estado entre telas e filtros.
- Animações informativas de carregamento.

**Evitar:**

- Flashes, glitches constantes e movimentos exagerados.
- Animações que impedem a leitura do mapa ou dos tempos.
- Efeitos de parallax que prejudiquem o uso em dispositivos móveis.

Toda animação deve reforçar **orientação ou feedback** — nunca apenas “parecer tecnológica”.

---

## 11. Voz e comunicação

### Tom

**Direto, claro, humano, respeitoso e sem promessas absolutas.**

### Exemplos aprovados

- `Saiba onde esperar menos.`
- `Filas da saúde pública no mapa.`
- `Encontre UBS, UPAs e hospitais.`
- `Veja as informações disponíveis antes de sair.`
- `Última atualização: 14h30.`
- `Não há estimativa disponível para esta unidade.`

### Evitar

- `Atendimento imediato garantido.`
- `Nunca mais enfrente filas.`
- `Vá sempre para a menor fila.`
- `Filas em tempo real` quando os dados não forem realmente atualizados em tempo real.

**Atenção ao contexto clínico:** menor espera **não equivale** a atendimento mais adequado. A interface deve evitar incentivar deslocamentos com base somente no tamanho da fila, especialmente em situações de emergência.

---

## 12. Aplicações da identidade

| Canal | Aplicação recomendada |
|---|---|
| App icon | Pin-zero branco em fundo azul sólido |
| Favicon | Versão simplificada do pin-zero |
| Landing page | Título tipográfico grande, fundo azul ou off-white, chamada curta |
| Header do app | Wordmark horizontal reduzido, sem competir com busca/mapa |
| Splash / loading | Símbolo isolado, animação mínima |
| Redes sociais | Mensagens curtas, tipografia dominante, recortes geométricos |
| Apresentações | Fundo chapado, grande contraste, grids rígidos |
| Materiais informativos | Clareza acima de estilo experimental |

---

## 13. Tokens iniciais de implementação

Esses valores são um ponto de partida, não uma biblioteca de componentes fechada.

```css
:root {
  /* Identidade */
  --color-brand: #0A3CFF;
  --color-offwhite: #F9F7F1;
  --color-ink: #0B0B0D;
  --color-white: #FFFFFF;

  /* Tipografia */
  --font-display: "Space Grotesk", "Inter", sans-serif;
  --font-interface: "Inter", Arial, sans-serif;

  /* Layout */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
}
```

> **Nota técnica:** validar as combinações de cor pelo contraste efetivo; definir tokens semânticos de status separadamente após pesquisar a origem e confiabilidade dos dados.

---

## 14. Checklist de aprovação de design

Antes de aprovar uma tela, material ou componente, verificar:

- [ ] O conteúdo é compreendido rapidamente?
- [ ] A tipografia estabelece uma hierarquia clara?
- [ ] A paleta segue o sistema azul / off-white / preto?
- [ ] O elemento gráfico tem função ou significado?
- [ ] O logotipo e o pin-zero estão legíveis no tamanho usado?
- [ ] O layout preserva espaço vazio e alinhamento consistente?
- [ ] A interface funciona em mobile?
- [ ] Os status de fila incluem texto, não apenas cor?
- [ ] Há distinção entre estimativa, dado confirmado e dado indisponível?
- [ ] A fonte e a atualização dos dados estão claras?
- [ ] A comunicação evita promessas que o app não controla?
- [ ] O contraste, o foco e as áreas de toque são acessíveis?

---

## 15. Resumo em uma frase

**Fila Zero é uma marca azul, tipográfica e geométrica, cujo zero vira um ponto no mapa: forte na identidade, simples na interface e transparente ao informar.**

---

*Documento de direção criativa. Logotipo vetorial final, arquivos-fonte, testes de contraste e pesquisa de disponibilidade do nome ainda não fazem parte desta versão.*
