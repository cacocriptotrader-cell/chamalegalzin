# AUDIT_CRITIQUE_V2.md

# Auditoria Quadrilateral DocFin V2

Data da auditoria: 17/05/2026  
Base analisada: `DOCFIN_INSTITUTIONAL_NAVY_2026-05-17-19_WORK`  
Escopo: tributação médica no Brasil, uso real por médicos, QA técnico e heurística UX/UI.  
Natureza: diagnóstico de risco e priorização de produto. Este documento não altera código e não substitui parecer contábil formal.

## Evidências de Código Revisadas

- `src/lib/store.tsx`: tipos fiscais, `Shift`, `Surgery`, `Receivable`, `Invoice`, `computeShift`, Fator R, `recordStatus`, `settlementAdjustment`.
- `src/components/QuickCaptureModal.tsx`: captura rápida e fluxo de repetição de plantão.
- `src/routes/dashboard.tsx`: Cockpit, Inbox, consolidação de drafts e cálculo de "Dinheiro no Bolso".
- `src/routes/fechamento.tsx`: Dossiê Fiscal, CSV contábil, Collapsible do Fator R e lista de plantões consolidados.
- `src/lib/accountingCsv.ts`: exportação CSV institucional.
- `src/routes/calendario.tsx`: timeline financeira, filtros, eventos de pagamento e botão Repetir.
- `src/styles.css`: tokens do tema Institutional Navy.

Referência fiscal externa usada para calibrar o diagnóstico: Perguntão Simples Nacional da Receita Federal, item 5.11, que define o Fator R como a razão entre folha de salários dos 12 meses anteriores e receita bruta acumulada dos 12 meses anteriores ao período de apuração: [Receita Federal - Perguntão Simples Nacional](https://www8.receita.fazenda.gov.br/SimplesNacional/Arquivos/manual/PerguntaoSN.pdf?.=).

---

## Sumário Executivo

O DocFin chegou a uma arquitetura de produto muito mais madura: separação PF/PJ, Quick Capture assíncrono, Inbox de consolidação, Dossiê Fiscal com CSV e Landing Page institucional. O sistema já transmite seriedade e resolve uma dor operacional real.

O principal risco antes do lançamento não é visual. É de confiança financeira. O app apresenta números muito convincentes, mas alguns ainda são gerenciais e não fiscais definitivos. A maior vulnerabilidade está em três frentes:

1. O Fator R ainda é um MVP mensal, mas a regra fiscal real usa janela de 12 meses.
2. O "Resultado Líquido do Mês" mistura caixa gerencial e disponibilidade econômica sem travas de distribuição isenta.
3. Glosas, inadimplência, nota fiscal e retenções ainda não possuem cadeia contábil própria, embora os tipos `Receivable` e `Invoice` já existam como fundação.

Do ponto de vista de UX, o app resolveu a captura em baixa fricção, mas ainda falta fricção positiva: confirmação clara após salvar, proteção contra clique duplo e modo de leitura menos denso para médicos cansados.

---

# 1. Parecer do Expert Fiscal

## 1.1 Omissões de Retenção

### Diagnóstico

O sistema trata deduções pontuais principalmente por `settlementAdjustment` em `Shift`. Esse campo é útil como "ajuste operacional", mas é insuficiente para conciliação fiscal.

Hoje, o app não diferencia de forma estruturada:

- ISS retido na fonte.
- IRRF.
- CRF, incluindo PIS, COFINS e CSLL quando aplicável.
- Taxa administrativa do hospital ou marketplace.
- Glosa de convênio.
- Repasse a colega.
- Desconto financeiro por atraso ou divergência.

No CSV contábil, a coluna `Deduções/Ajustes (settlementAdjustment)` concentra tudo em um único número. Isso poupa tempo no MVP, mas esconde a natureza jurídica da dedução.

### Impacto

O contador recebe um valor líquido, mas não sabe se aquilo é:

- imposto já retido;
- custo operacional;
- glosa;
- repasse;
- diferença de pagamento;
- ajuste manual sem documento.

Isso pode gerar surpresa no caixa, retrabalho no fechamento e divergência entre extrato bancário, nota fiscal e DAS.

### Recomendação acionável

Criar um ledger de retenções por registro consolidado, com pelo menos:

- `type`: `ISS_RETIDO`, `IRRF`, `CRF`, `GLOSA`, `TAXA_ADMINISTRATIVA`, `REPASSE`, `OUTRO`.
- `amount`.
- `documentReference`.
- `notes`.
- impacto contábil: `tax`, `operationalDeduction`, `cashAdjustment`.

Manter `settlementAdjustment` apenas como fallback legado ou soma visual.

## 1.2 Fator R: Indicador Gerencial, Não Cálculo Fiscal Final

### Diagnóstico

O código calcula o Fator R a partir do faturamento PJ Simples do mês selecionado e do maior valor entre pró-labore manual e automático. A função `computedProLaboreMonthly(...)` usa o mês corrente e aplica 28%.

A regra oficial, contudo, usa FS12/RBT12, ou seja, folha de salários e receita bruta acumuladas nos 12 meses anteriores ao período de apuração. Isso está documentado no Perguntão Simples Nacional da Receita Federal.

### Impacto

O monitor atual é excelente como alerta de comportamento:

> "Se você mantiver pró-labore perto de 28% do faturamento, reduz risco de cair no Anexo V."

Mas ele não deve ser vendido como cálculo fiscal definitivo. Em meses de crescimento rápido, queda de receita, início de atividade ou sazonalidade, o resultado mensal pode divergir materialmente do cálculo contábil.

### Recomendação acionável

Alterar a comunicação do produto:

- Trocar "Fator R Atingido" por "Projeção gerencial do Fator R".
- Adicionar no Collapsible: "Validação final depende de FS12/RBT12 no fechamento contábil."
- Criar cálculo v2 com janela móvel de 12 meses, incluindo:
  - pró-labore;
  - INSS patronal se aplicável;
  - FGTS quando aplicável;
  - salários e encargos admissíveis na regra.

## 1.3 Distribuição de Lucros

### Diagnóstico

O Dashboard foca em "Dinheiro no Bolso" e calcula resultado consolidado somando PJ líquido e PF líquido. A simplificação é boa para a médica, mas existe risco de leitura indevida:

- `pjNet = pjRevenue - pjTax - pjCosts`.
- `pfNet` inclui pró-labore líquido e receitas PF.
- O pró-labore bruto não aparece claramente como saída econômica da PJ no card principal.

Assim, o número pode ser útil para sensação gerencial de caixa, mas não garante que o valor possa ser distribuído como lucro isento.

### Impacto

Sem travas contábeis, a médica pode interpretar "Resultado Líquido do Mês" como valor livre para saque, quando ainda podem existir:

- pró-labore a pagar;
- tributos ainda não recolhidos;
- contabilidade;
- reserva de DAS;
- despesas PJ obrigatórias;
- inadimplência;
- notas emitidas e não recebidas;
- necessidade de escrituração para distribuição isenta.

### Recomendação acionável

Separar dois números:

- "Dinheiro no Bolso Gerencial": visão simplificada da médica.
- "Lucro Distribuível Seguro": exibido apenas no Dossiê ou área contábil, com regras mais conservadoras.

O segundo deve depender de:

- registros pagos;
- tributos provisionados;
- pró-labore provisionado;
- despesas PJ obrigatórias;
- retenções classificadas;
- fechamento mensal consolidado.

## 1.4 Glosas e Inadimplência

### Diagnóstico

Plantões consolidados entram no Dossiê e no CSV se `recordStatus === "consolidated"`, independentemente do recebimento real. Para cirurgias existem flags como `receivedFromHospital` e `isReceived`, mas para plantões o modelo ainda depende principalmente de `expectedPaymentDate`, `projectedPaymentDate` e status operacional como `CONFIRMADO` ou `REPASSADO`.

Os tipos `Receivable` e `Invoice` existem, mas estão vazios e não foram ativados no fluxo.

### Impacto

Se um plantão nunca for pago, o sistema pode continuar tratando esse evento como receita operacional consolidada. Isso afeta:

- percepção de caixa;
- exportação contábil;
- planejamento de impostos;
- cobrança;
- conciliação com extrato;
- confiança no Dossiê Fiscal.

### Recomendação acionável

Ativar a cadeia `Receivable/Invoice` como fonte oficial de fluxo financeiro:

- `PREVISTO`: registro executado, ainda sem nota.
- `NF_EMITIDA`: documento fiscal emitido.
- `PAGO`: conciliado.
- `GLOSADO`: valor negado ou cortado.
- `INADIMPLENTE`: prazo vencido sem pagamento.
- `CANCELADO`: registro removido do fechamento.

O Dossiê Fiscal deve conseguir separar competência médica, competência fiscal e caixa efetivo.

---

# 2. Teste de Usabilidade: Focus Group Médico

## 2.1 Perfil A: Residente, 26 anos

### Cenário

Médica R3, múltiplos hospitais, plantões noturnos, transporte privado pós-plantão, pouco tempo entre sala cirúrgica e repouso.

### O que funcionou

O Quick Capture global é o maior acerto operacional do produto. Ele respeita o contexto real:

- não exige regime fiscal na hora;
- não exige nota;
- não exige data de repasse;
- permite registrar hospital, duração e transporte rapidamente.

O botão "Repetir" também resolve uma dor frequente: plantões parecidos em hospitais repetidos. Para o dia a dia, isso é muito mais útil que uma recorrência complexa mal desenhada.

### Atrito observado

Depois de salvar uma pendência, não há feedback visual global forte. O modal fecha, mas a usuária cansada pode não ter certeza de que salvou. Isso cria risco de duplo clique e duplicidade.

Além disso, a consolidação posterior exige vários campos. A exigência é correta para compliance, mas pode gerar backlog no Inbox se a médica deixar acumular 20 ou 30 drafts.

### Recomendação acionável

Adicionar toast imediato:

> "Rascunho salvo no Inbox"

Com ação secundária:

> "Ver pendência"

E criar consolidação em lote para drafts com mesmo hospital, duração e regime.

## 2.2 Perfil B: Médico Sênior, 55 anos

### Cenário

Médico com menos paciência para software, usa óculos para leitura, quer saber quanto entrou, quanto falta receber e o que mandar ao contador.

### O que funcionou

O tema Institutional Navy transmite mais confiança que o dark genérico. O AppShell agrupado e o Dashboard com "Dinheiro no Bolso" reduzem o ruído fiscal.

O Collapsible do Fator R também é um acerto: a matemática pesada fica oculta e acessível.

### Atrito observado

O Calendário mensal continua exigindo interpretação visual. Mini-eventos, filtros e opacidade ajudam, mas em tela pequena ou baixa luminosidade ainda pode parecer "uma planilha com pele bonita".

O médico sênior provavelmente vai preferir:

- hoje;
- próximos 7 dias;
- pendências;
- dinheiro a receber;
- botão para contador.

### Recomendação acionável

Criar modo de calendário simplificado:

- "Semana atual" como opção default para telas pequenas;
- lista vertical por prioridade;
- calendário mensal como modo secundário.

## 2.3 Casos Reais: Repetição e Escalas Móveis

### Diagnóstico

O botão Repetir cobre bem:

- mesmo hospital;
- mesma duração;
- mesmo transporte;
- procedimento parecido;
- nova data manual.

Mas não cobre naturalmente:

- todo terceiro sábado;
- escala quinzenal irregular;
- troca de plantão com colega;
- sobreaviso não acionado;
- sobreaviso acionado parcialmente;
- permuta que nunca foi paga;
- plantão originalmente de um colega assumido em cima da hora.

### Recomendação acionável

Não implementar recorrência complexa ainda. O próximo passo mais útil é "modelo de plantão":

- salvar modelo a partir de um plantão consolidado;
- aplicar modelo em múltiplas datas;
- gerar drafts, não registros consolidados.

Isso preserva a arquitetura de triagem e evita automatizar erro fiscal.

## 2.4 Fricção Silenciosa no Inbox

### Diagnóstico

O Inbox é correto do ponto de vista contábil, mas pode virar uma fila mentalmente pesada. O usuário captura rápido e paga a conta depois.

### Recomendação acionável

Criar grupos automáticos:

- "8 plantões no mesmo hospital".
- "4 transportes privados sem valor".
- "3 registros sem regime fiscal".

E permitir triagem assistida:

- aplicar mesmo regime;
- aplicar mesma previsão de recebimento;
- revisar item a item antes de consolidar.

---

# 3. Relatório Técnico do QA Engineer

## 3.1 Edge Case: Clique Duplo no Quick Capture

### Evidência

Em `QuickCaptureModal`, `saveDraft()` chama `store.addShift(...)`, reseta estados e fecha o modal. Não existe flag `submitting`, idempotency key ou desabilitação imediata após o primeiro clique.

### Risco

Em dispositivo lento, trackpad sensível ou usuário inseguro, dois cliques rápidos podem gerar dois drafts iguais.

### Severidade

P0 antes do lançamento.

### Recomendação acionável

Adicionar:

- `const [submitting, setSubmitting] = useState(false)`.
- retornar se `submitting`.
- desabilitar botão no primeiro clique.
- gerar `clientDraftKey` opcional para idempotência local.

## 3.2 Dados Incompletos e Valores Zerados

### Evidência

Quick Capture calcula `gross` como `hourlyRate * hours`. Se o hospital estiver com `hourlyRate = 0`, o draft pode ser salvo com bruto zero porque `canSave` exige apenas `workplaceId` e `hours > 0`.

Na consolidação do Dashboard, `isValid` bloqueia `gross <= 0`. Isso protege o caminho ideal.

### Risco

Rotas legadas como `novo-registro` e `novo-plantao` ainda podem criar dados fora do fluxo do Inbox. O CSV em si não quebra com zero, porque usa fallback numérico, mas pode exportar uma linha economicamente inválida se ela entrar como consolidada.

### Severidade

P1.

### Recomendação acionável

Padronizar validação mínima para todos os pontos de criação:

- `gross > 0` para consolidação fiscal;
- `hours > 0`;
- hospital obrigatório;
- regime obrigatório para qualquer registro consolidado;
- permitir bruto zero somente com categoria explícita como `SOBREAVISO_NAO_ACIONADO`, fora do Dossiê Fiscal padrão.

## 3.3 Fechamento Mobile: Overflow Horizontal

### Evidência

Em `fechamento.tsx`, a tabela detalhada está dentro de:

```tsx
<div className="glass-card rounded-2xl overflow-hidden">
  <table className="w-full text-sm">
```

Não há `overflow-x-auto`.

### Risco

Em iPhone SE ou telas estreitas, as colunas `Hospital / Pagador`, `Regime`, `Plantões`, `Cirurgias` e `Bruto` podem ser comprimidas ou cortadas. Como o container usa `overflow-hidden`, o conteúdo pode ficar inacessível.

### Severidade

P0.

### Recomendação acionável

Envolver a tabela com:

```tsx
<div className="overflow-x-auto">
  <table className="min-w-[720px] ...">
```

E manter o card externo com borda.

## 3.4 Calendário Mobile

### Evidência

O calendário usa grid mensal de 7 colunas e células `min-h-[112px]`.

### Risco

O layout deve caber horizontalmente, mas a legibilidade cai muito em telas pequenas. Eventos de 9px e 10px podem virar ruído visual. O problema principal não é quebra técnica, é degradação de compreensão.

### Severidade

P1.

### Recomendação acionável

Para `max-width: 430px`, priorizar:

- faixa "Foco da semana";
- lista vertical do dia;
- botão para abrir mês completo.

## 3.5 CSV Contábil

### Pontos fortes

O CSV:

- exclui drafts com `isConsolidatedRecord`;
- usa BOM UTF-8;
- escapa aspas, vírgulas e quebras de linha;
- usa schema fixo;
- inclui `settlementAdjustment`;
- gera header mesmo sem linhas.

### Limitações

Ainda faltam:

- número de NF;
- status de NF;
- status de recebimento;
- data de pagamento real;
- tipo de retenção;
- competência fiscal versus competência de caixa;
- glosa;
- inadimplência;
- referência bancária.

### Severidade

P1 fiscal.

### Recomendação acionável

Criar CSV v2 com base em `Invoice` e `Receivable`, não diretamente em `Shift` e `Surgery`.

---

# 4. Avaliação Heurística do Lead UX Architect

## 4.1 Contraste e Acessibilidade do Institutional Navy

### Diagnóstico

Os tokens principais melhoraram muito:

- fundo `#051024`;
- card `#0F1A30`;
- borda `#1E2A45`;
- texto primário branco;
- texto secundário `#CBD5E1`.

Isso é coerente com uma estética de private bank.

O risco está no uso de `text-primary` para texto pequeno. O azul `#0047BB` é institucional como fundo de CTA, mas pode ficar pouco legível como texto sobre navy profundo, especialmente em repouso de bloco operatório, brilho baixo ou tela com película.

### Recomendação acionável

Definir dois tokens:

- `primary`: `#0047BB` para botões e superfícies ativas.
- `primary-readable`: `#60A5FA` ou `#93C5FD` para texto e ícones pequenos.

Evitar `text-primary` em fontes abaixo de 12px.

## 4.2 Progressive Disclosure do Fator R

### Diagnóstico

O Collapsible em `fechamento.tsx` está fechado por padrão e usa:

- label "Mostrar Cálculo do Fator R";
- chevron;
- descrição curta;
- conteúdo fiscal apenas após clique.

Isso atende ao princípio de disclosure progressivo.

### Risco

O label ainda pode parecer técnico demais para a médica. A frase "A matemática tributária fica recolhida" é boa, mas poderia posicionar melhor o público do detalhe.

### Recomendação acionável

Trocar ou complementar o gatilho:

> "Mostrar cálculo do contador"

Microcopy:

> "Abra apenas se quiser revisar a base do Fator R ou enviar dúvidas ao escritório contábil."

## 4.3 Prevenção de Erros e Feedback

### Diagnóstico

O sistema tem fricção positiva na consolidação: não deixa consolidar sem regime, data, bruto e duração válidos.

Mas Quick Capture e Repetir Plantão não têm feedback pós-salvamento. O modal fecha, e o usuário precisa confiar que o item entrou no Inbox.

### Risco

Em contexto hospitalar, ausência de feedback equivale a incerteza. Incerteza gera clique repetido.

### Recomendação acionável

Adicionar toast global:

> "Rascunho salvo no Inbox."

Com ação:

> "Abrir Dashboard"

Se o usuário estiver no Dashboard, destacar a linha recém-criada por 2 segundos.

## 4.4 Densidade Visual

### Diagnóstico

O Dashboard está no caminho certo: bruto, impostos/despesas e líquido. O Dossiê reduziu ruído ao esconder Fator R.

O Calendário ainda é o ponto com maior chance de ansiedade cognitiva. Os filtros são bons, mas a visão mensal continua competindo com a realidade do usuário cansado.

### Recomendação acionável

Definir uma hierarquia:

1. Hoje.
2. Próximos 7 dias.
3. Pendências.
4. A receber.
5. Histórico mensal.

O mês completo deve ser exploratório, não a primeira leitura em telas pequenas.

---

# Recomendações Priorizadas

## P0 - Antes do Lançamento

1. **Impedir double-submit no Quick Capture.**  
   Adicionar lock de submissão e desabilitar botão imediatamente após clique.

2. **Adicionar toast de confirmação para Quick Capture e Repetir Plantão.**  
   Mensagem: "Rascunho salvo no Inbox."

3. **Corrigir overflow da tabela do Fechamento no mobile.**  
   Usar `overflow-x-auto` e `min-w` seguro para tabela.

4. **Reclassificar Fator R como projeção gerencial.**  
   A UI deve deixar claro que o cálculo definitivo depende de FS12/RBT12 e validação contábil.

## P1 - Sprint Fiscal e Confiança Contábil

1. **Ativar `Receivable` e `Invoice` como fluxo oficial.**  
   Status mínimos: `PREVISTO`, `NF_EMITIDA`, `PAGO`, `GLOSADO`, `INADIMPLENTE`, `CANCELADO`.

2. **Separar retenções por tipo.**  
   ISS, IRRF, CRF, glosa, taxa administrativa, repasse e outros.

3. **Recalcular Fator R com janela de 12 meses.**  
   Usar FS12/RBT12 conforme referência da Receita Federal.

4. **Separar "Dinheiro no Bolso" de "Lucro Distribuível Seguro".**  
   O primeiro é gerencial; o segundo é contábil.

## P1 - Sprint UX Operacional

1. **Criar modo "Próximos 7 dias" no Calendário.**
2. **Criar triagem em lote para drafts semelhantes.**
3. **Destacar visualmente draft recém-salvo.**
4. **Criar modelos de plantão em vez de recorrência complexa imediata.**

## P2 - Contabilidade Zero-Touch V2

1. **CSV institucional v2 baseado em `Receivable/Invoice`.**
2. **Adicionar número de NF, status de NF, data real de pagamento e retenções.**
3. **Exportar competência fiscal e competência caixa separadamente.**
4. **Adicionar observações de glosa e inadimplência.**

---

# Conclusão

O DocFin já tem um núcleo de produto forte. A decisão de esconder a matemática fiscal, focar no "Dinheiro no Bolso" e manter registros rápidos como drafts é correta. O app respeita a realidade médica melhor que uma ferramenta contábil tradicional.

O lançamento, porém, deve evitar prometer precisão fiscal absoluta onde ainda existe estimativa gerencial. A próxima evolução não deve ser mais tela. Deve ser confiança de dados:

- status financeiro real;
- retenções estruturadas;
- Fator R em 12 meses;
- prevenção de duplicidade;
- feedback claro no momento de captura.

Se esses pontos P0 forem resolvidos antes do beta público, o produto deixa de parecer apenas bonito e passa a se comportar como infraestrutura financeira confiável.

