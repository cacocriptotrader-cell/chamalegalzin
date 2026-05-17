# 1 Year Discovery Report - DocFin

Data da simulacao: 17/05/2026  
Persona medica: Dra. Thais Azevedo, R3 de Anestesiologia  
Persona contador: escritorio especializado em PJ medica

## Parte A - Entrevista com a Medica, Thais

### 1. O Momento Aha

"Foi numa sexta-feira, umas 23h40, depois de um plantao de 24 horas que virou quase 30 porque uma sala atrasou e eu aceitei cobrir uma colega. Eu estava no Uber Black voltando para casa, completamente sem condicao de abrir planilha. O financeiro do hospital tinha pago um lote antigo, mas eu lembrava que uma artroscopia tinha sido glosada parcialmente e eu nao sabia se aquele dinheiro era meu, da equipe ou se ainda ia faltar repasse.

Abri o DocFin no celular e o Cockpit mostrou o que tinha entrado, o que ainda estava pendente e que aquele plantao novo estava no Inbox como rascunho, fora do calculo fiscal. Foi a primeira vez que eu senti que nao precisava confiar na minha memoria destruida de pos-plantao. Eu pensei: gracas a Deus eu tenho esse aplicativo, porque se dependesse do WhatsApp e do extrato do banco eu ia perder dinheiro ou mandar informacao errada para o contador."

### 2. Fadiga de Dados

"Depois de 12 meses, o Calendario ficou poderoso, mas tambem pesado mentalmente. Quando ele esta cheio de plantao, cirurgia, D+30, D+60, cor de hospital e status financeiro, eu entendo tudo, mas nao consigo olhar aquilo cansada. A tela que mais me deu ansiedade visual foi a combinacao de Calendario mensal com muitos eventos e o Ledger/Recebiveis quando acumulava muito pagamento futuro.

O Cockpit continuou sendo o melhor lugar para abrir rapido. O problema e que, quando tenho centenas de eventos, eu nao quero ver tudo. Quero ver: o que preciso fazer hoje, o que esta atrasado, o que esta em risco fiscal e o que mudou no dinheiro. O historico completo deveria ficar mais escondido ou com filtros muito agressivos."

### 3. A Friccao Silenciosa

"Glosa de convenio ainda e estranha de mapear. Na vida real, nao e so um desconto. As vezes o hospital paga parcial, depois reprocessa, depois o cirurgiao segura o repasse da equipe, depois alguem manda comprovante no WhatsApp. O campo de ajuste ajuda, mas eu ainda fico em duvida se coloco como retencao, repasse ou perda.

Outra coisa e permuta de plantao. Quando eu passo um plantao para alguem e depois pego outro em troca, isso nao e exatamente receita nem despesa, mas muda minha agenda, meu caixa futuro e minha energia. Hoje da para improvisar, mas nao parece natural. Eu queria marcar 'permuta' e o app entender que aquilo precisa de conciliacao, nao de imposto imediato."

## Parte B - Entrevista com o Contador

### 1. Auditoria de Confianca

"Eu nao confiaria cegamente no Fator R sem trilha de auditoria exportavel. O calculo visual esta coerente e e muito melhor do que receber prints soltos, mas para fechar livro e orientar pro-labore eu preciso ver base de calculo: faturamento por competencia, folha/pro-labore considerado, itens excluidos, drafts ignorados e ajustes manuais.

O ponto positivo e que o DocFin separa draft de consolidated. Isso e essencial. Se a medica capturou um plantao no corredor e ainda nao classificou PF/PJ, o sistema faz certo em nao jogar aquilo na matematica. Eu ainda refaria em planilha nos primeiros meses, mas com uma exportacao estruturada eu deixaria de refazer."

### 2. Reducao de Atrito

"Comparado ao envio por WhatsApp, o Dossie Fiscal economiza facil de 40 a 60 minutos por cliente por mes. O ganho nao e so tempo de digitacao. O ganho e parar de perguntar: 'esse valor e bruto ou liquido?', 'qual hospital pagou?', 'isso foi PF ou PJ?', 'esse Uber e pessoal ou do plantao?', 'essa nota ja foi emitida?'.

Quando a Thais usa o Inbox corretamente e consolida com regime, previsao de recebimento e ajuste, o fechamento vem quase pronto. O que ainda falta e eu conseguir baixar isso num formato que entre direto no meu processo, sem copiar tabela por tabela."

### 3. O Fator de Recomendacao

"A funcionalidade que faria eu exigir DocFin para todos os medicos seria exportacao CSV/Excel por competencia, com schema fixo e idempotente. Eu quero uma aba de receitas, uma de ajustes/repasses, uma de despesas PJ, uma de pro-labore/Fator R e uma de pendencias. Cada linha precisa ter ID unico, status, data de competencia, data de recebimento, hospital, regime, bruto, imposto estimado, ajuste e liquido.

API seria excelente no futuro, mas o primeiro passo e CSV estruturado impecavel. Contabilidade vive de importacao previsivel. PDF bonito ajuda o medico a confiar; CSV bem modelado faz o escritorio adotar."

## Insights Acionaveis Para a Proxima Sprint

1. Criar exportacao CSV/Excel do Dossie Fiscal com schema fixo para contador.
2. Adicionar trilha de auditoria do Fator R mostrando base, competencia, exclusoes e drafts ignorados.
3. Criar status especifico para glosa/contestacao, separado de ajuste generico.
4. Criar fluxo de permuta de plantao, sem impacto fiscal automatico ate conciliacao.
5. Reduzir densidade visual do Calendario em meses cheios com filtros de "Hoje", "Atrasados", "Recebimentos" e "Pendencias".
6. Manter o Cockpit como tela principal de baixa carga cognitiva; o historico denso deve ser exploratorio, nao o padrao.
