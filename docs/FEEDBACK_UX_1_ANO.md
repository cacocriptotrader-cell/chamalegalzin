# Relatório de Feedback UX - 1 Ano de DocFin V2.0

**Período analisado:** 12 meses de uso contínuo em produção  
**Escopo:** médicos usuários finais, rotinas de fechamento, backoffice contábil e atrito operacional com o contador Vinícius  
**Natureza do relatório:** post-mortem de produto com feedback simulado, porém realista, para priorização da V3.0

---

## 1. Sumário Executivo

Depois de um ano em produção, o DocFin V2.0 confirmou uma tese importante: médicos não querem um software contábil completo; eles querem uma camada operacional simples que transforme plantões, repasses, glosas e despesas em material confiável para o contador.

O maior valor percebido veio de três pontos:

- Clareza sobre o Fator R e risco de Anexo V.
- Separação entre rascunhos, registros consolidados e recebimentos.
- Dossiê fiscal e CSV contábil com deduções estruturadas.

O maior atrito também ficou claro: o médico aceita registrar informação mínima, mas resiste a manter disciplina contábil semanal. O contador, por outro lado, ama dados estruturados, mas sofre quando datas de pagamento, competência, glosas e recebíveis não batem com o extrato bancário.

**Conclusão de produto:** a V3.0 deve reduzir entrada manual, criar uma experiência própria para o contador e transformar recorrências em automações. O próximo salto do DocFin não é adicionar mais campos; é diminuir a quantidade de decisões que o médico precisa tomar.

---

## 2. Feedback por Personas Médicas

### Persona 1: Residente de Cirurgia, 26 anos

**Perfil operacional**

- Alto volume de plantões.
- Alta familiaridade com tecnologia.
- Pouca maturidade fiscal.
- Usa o celular como principal dispositivo.
- Renda variável e ainda em fase de descoberta financeira.

**Como usou o DocFin durante o ano**

O residente usou muito a captura rápida, principalmente após plantões longos. Ele registrava hospital, duração e valor bruto com boa frequência, mas raramente completava a consolidação no mesmo dia. O Inbox acumulava facilmente 15 a 30 rascunhos.

**O que funcionou bem**

- Captura rápida foi percebida como "baixa fricção".
- Consolidação em lote salvou o usuário quando acumulava muitos rascunhos.
- Calendário ajudou a lembrar plantões feitos e recebíveis esperados.
- O app virou uma memória financeira básica, melhor que planilha e conversa perdida no WhatsApp.

**O que gerou atrito**

- Baixa compreensão sobre regime fiscal.
- Pouca paciência para campos como data esperada de recebimento.
- Deduções estruturadas foram pouco usadas; quando havia desconto, ele tendia a lançar como "Outro".
- Muitos registros ficavam pendentes até o contador cobrar.

**Frase representativa**

> "Eu quero só jogar o plantão ali e resolver depois. Se depender de eu classificar tudo certinho, vai atrasar."

**Leitura de produto**

Esse perfil precisa de automação, presets e educação contextual mínima. O DocFin deve presumir padrões por hospital, especialidade e histórico, deixando o usuário apenas confirmar.

---

### Persona 2: Anestesiologista, 32 anos, PJ multi-hospital

**Perfil operacional**

- Trabalha em múltiplos hospitais.
- Recebe por plantão, procedimento e repasse.
- Tem medo de malha fina, Anexo V e erro no Fator R.
- Usa o app semanalmente.
- Perfil semelhante ao caso "Thais".

**Como usou o DocFin durante o ano**

Foi uma das personas com maior aderência. Ela usou o DocFin como painel de controle mensal, acompanhou Fator R, marcou recebíveis e exportou dossiês para o contador. A funcionalidade de deduções estruturadas foi valorizada, especialmente para ISS retido, IRRF, glosas e taxas administrativas.

**O que funcionou bem**

- Fator R em janela de 12 meses gerou confiança.
- Dossiê fiscal reduziu ansiedade antes do fechamento.
- Badges de pagamento ajudaram a enxergar o que estava pendente.
- CSV contábil estruturado reduziu idas e voltas com o escritório.
- A separação entre competência e caixa fez sentido para o perfil mais organizado.

**O que gerou atrito**

- Ainda havia dúvida sobre quando marcar algo como recebido.
- Em hospitais com repasse irregular, a data real de pagamento era esquecida.
- Quando recebia vários repasses no mesmo dia, tinha dificuldade de conciliar manualmente.
- Queria alertas automáticos de pagamento atrasado com base no histórico do hospital.

**Frase representativa**

> "Eu amo saber que o Fator R está sob controle, mas ainda tenho medo de colocar a data errada e o contador reclamar."

**Leitura de produto**

Essa é a persona ideal da V2.0. A V3.0 deve aprofundar integração bancária, memória por hospital e compartilhamento direto com o contador.

---

### Persona 3: Cirurgião Plástico, 45 anos

**Perfil operacional**

- Alto ticket médio.
- Receita concentrada em procedimentos.
- Delegação para secretária ou assistente.
- Lida com inadimplência, parcelamentos e sinal.
- Valoriza relatórios executivos, não operação diária.

**Como usou o DocFin durante o ano**

O cirurgião raramente operou o DocFin diretamente. A secretária registrava procedimentos, recebíveis, sinais, glosas e inadimplências. O médico olhava o resumo mensal e cobrava clareza sobre o que estava pago, atrasado ou em aberto.

**O que funcionou bem**

- Status de pagamento foi muito útil para diferenciar pago, a receber, atrasado e inadimplente.
- Dossiê fiscal ajudou a separar receita clínica, repasse e custos associados.
- Visão de alto nível reduziu dependência de planilhas internas.
- O conceito de "inadimplente" foi percebido como essencial.

**O que gerou atrito**

- Falta de múltiplos usuários com permissões.
- Secretária precisava usar o login do médico.
- Ausência de trilha de quem alterou cada registro.
- Necessidade de anexar comprovantes, contratos ou recibos por procedimento.
- Fluxo de parcelamento ainda não era natural.

**Frase representativa**

> "Eu não quero lançar nada. Quero que minha secretária lance e eu veja o que está pendente, pago e problemático."

**Leitura de produto**

Para médicos de alto ticket, o DocFin deixa de ser ferramenta individual e vira ferramenta de equipe. A V3.0 precisa considerar permissões, auditoria e comprovantes.

---

### Persona 4: Coordenador de UTI, 55 anos

**Perfil operacional**

- Baixa paciência para tecnologia.
- Prefere Excel impresso.
- Valoriza clareza, resumo executivo e previsibilidade.
- Usa desktop mais que celular.
- Quer saber "quanto entrou, quanto saiu e o que mando para o contador".

**Como usou o DocFin durante o ano**

O coordenador usou pouco a interface diária, mas valorizou o fechamento mensal. Ele gostava de exportar, imprimir e conferir. A experiência funcionava melhor quando alguém da contabilidade ou da família ajudava a manter os dados atualizados.

**O que funcionou bem**

- Dossiê mensal foi o recurso mais valorizado.
- Resumo por regime tributário ajudou na conversa com o contador.
- Exportação CSV foi entendida como "o arquivo oficial".
- Relatórios simples geraram confiança.

**O que gerou atrito**

- Interface ainda parecia densa em algumas telas.
- Muitos badges e termos técnicos competiam por atenção.
- Inputs pequenos e múltiplos campos causavam abandono.
- O usuário queria um botão claro: "Fechar mês".

**Frase representativa**

> "Se eu conseguir imprimir uma folha e entender se está certo, já resolveu metade do meu problema."

**Leitura de produto**

Esse perfil pede modo executivo, menos interação e mais legibilidade. A V3.0 deve oferecer um fechamento guiado em etapas, com versão de impressão mais forte.

---

### Persona 5: Diretor Clínico, 68 anos

**Perfil operacional**

- Restrição visual.
- Pouca tolerância a elementos pequenos.
- Alto patrimônio e baixa disposição para operação manual.
- Confia mais em pessoas do que em sistemas.
- Valoriza segurança, resumo e assistência.

**Como usou o DocFin durante o ano**

O diretor clínico acessava pouco. Quando acessava, buscava entender patrimônio, receita mensal e pendências grandes. A operação diária era feita por terceiros. O principal problema foi ergonomia: fontes pequenas, botões discretos e muitos detalhes por tela.

**O que funcionou bem**

- Estética premium aumentou confiança.
- Resumos executivos foram bem recebidos.
- Conceito de "dossiê" transmitiu segurança.
- Cores de status ajudaram, quando acompanhadas de texto claro.

**O que gerou atrito**

- Dificuldade com textos pequenos.
- Botões secundários pareciam pouco óbvios.
- Calendário exigia precisão visual demais.
- Preferência por fluxo assistido, quase concierge.

**Frase representativa**

> "Eu gosto da ideia, mas preciso que isso fale comigo em letras maiores e com menos coisa na tela."

**Leitura de produto**

Para esse perfil, acessibilidade não é refinamento; é requisito comercial. A V3.0 deve incluir modo de alta legibilidade e relatórios executivos com menos densidade.

---

## 3. O Choque Entre Médicos e Contadores

### O que os médicos amaram

- Ter um lugar único para registrar plantões, repasses e recebíveis.
- Visualizar o Fator R sem depender de pergunta solta no WhatsApp.
- Enviar um dossiê mais organizado para o contador.
- Enxergar valores a receber e atrasados.
- Usar a consolidação em lote quando o Inbox ficava acumulado.
- Parar de depender exclusivamente de memória, prints e planilhas soltas.

### O que os médicos odiaram

- Preencher datas manuais, especialmente data real de pagamento.
- Classificar deduções quando não sabiam se era ISS, IRRF, taxa ou glosa.
- Lembrar de exportar CSV todo mês.
- Ter que voltar em registros antigos para corrigir recebimento.
- Entender diferença entre competência e caixa.
- Repetir o mesmo padrão de hospital, regime e prazo de pagamento diversas vezes.

### O que Vinícius, o contador, amou

- Deduções estruturadas por tipo.
- Separação entre registros rascunho e consolidados.
- Fator R com janela móvel de 12 meses.
- CSV com colunas específicas para retenções, glosas, repasses e taxas.
- Dossiê mensal com base mais consistente que mensagens de WhatsApp.
- Histórico centralizado por hospital e competência.

### O que Vinícius odiou

- Médicos esqueciam de marcar registros como pagos.
- Quando marcavam como pagos, muitas vezes usavam a data aproximada, não a data bancária.
- Recebimentos agrupados no extrato não batiam com plantões individuais.
- Alguns usuários exportavam CSV antes de terminar a consolidação.
- Glosas eram percebidas tarde, depois do fechamento.
- Registros retroativos eram editados sem aviso claro ao contador.
- Ausência de login contábil obrigava o médico a enviar arquivo manualmente.

### Fricção crítica na temporada IRPF/DIRF/DEFIS

Durante o período de declarações, o conflito principal não foi falta de dados; foi falta de reconciliação. O DocFin ajudava a organizar a competência, mas a contabilidade precisava provar o caixa com extratos, informes e datas bancárias.

O ponto de maior tensão foi a diferença entre:

- "Trabalhei naquele mês."
- "Emiti nota naquele mês."
- "Recebi no banco naquele mês."
- "O hospital descontou taxa ou glosa depois."
- "O contador precisa fechar isso com evidência documental."

Em resumo, médicos pensam em evento clínico; contadores pensam em competência, documento, caixa e obrigação acessória.

---

## 4. Principais Aprendizados de Produto

### 1. O Inbox é o coração operacional, mas também o maior risco

Quando o Inbox passa de 15 rascunhos, o usuário começa a perder confiança. A consolidação em lote ajudou, mas ainda depende de disciplina.

### 2. Fator R é altamente valioso, mas precisa de confiança contábil

O usuário gosta do indicador, mas só confia plenamente quando Vinícius valida. Isso indica que o recurso deve ser compartilhável, auditável e comentável.

### 3. Deduções estruturadas melhoram o CSV, mas exigem memória operacional

Quando o médico sabe a dedução, o dado fica excelente. Quando não sabe, tudo cai em "Outros". A ferramenta precisa aprender padrões por hospital e pagador.

### 4. Competência e caixa precisam coexistir visualmente

O Dashboard atual ainda é interpretado por alguns como "dinheiro recebido", mesmo quando o valor é por competência. A V3.0 deve deixar essa distinção mais explícita sem complicar a tela.

### 5. A contabilidade precisa deixar de ser destinatária e virar usuária

Enquanto Vinícius depender de exportação manual enviada pelo médico, haverá atraso, retrabalho e reconciliação incompleta.

---

## 5. Roadmap V3.0 Sugerido

### 1. Portal do Contador com acesso somente leitura

**Problema resolvido:** Vinícius depende do médico para exportar CSV, enviar dossiê e avisar alterações.

**Descrição**

Criar um acesso específico para contador, com permissão somente leitura, filtro por cliente, mês, regime e status de fechamento.

**Impacto esperado**

- Redução de cobranças por WhatsApp.
- Menos exportações manuais.
- Maior confiança no Fator R.
- Conferência preventiva antes do fechamento.

**Prioridade:** Muito alta.

---

### 2. Integração bancária ou importação OFX/Open Finance

**Problema resolvido:** datas reais de pagamento e conciliação manual.

**Descrição**

Permitir importação de extrato OFX inicialmente e, em etapa posterior, conexão Open Finance. O sistema sugeriria correspondência entre recebimentos bancários e plantões consolidados.

**Impacto esperado**

- Menos erro de data bancária.
- Redução de retrabalho contábil.
- Melhor visão de caixa.
- Identificação automática de atrasos e inadimplência.

**Prioridade:** Muito alta.

---

### 3. Memória recorrente por hospital, pagador e especialidade

**Problema resolvido:** repetição manual de regime, prazo, deduções e padrões de recebimento.

**Descrição**

O DocFin deve aprender padrões:

- Hospital costuma pagar em D+30.
- Determinado pagador retém ISS.
- Uma taxa administrativa aparece todo mês.
- Um tipo de plantão tem valor padrão.

Na consolidação, o sistema sugeriria dados com base no histórico.

**Impacto esperado**

- Menos campos manuais.
- Mais consistência contábil.
- Redução do uso de "Outros" em deduções.
- Consolidação em lote mais segura.

**Prioridade:** Alta.

---

### 4. Fechamento mensal guiado

**Problema resolvido:** médicos esquecem etapas antes de exportar ou enviar ao contador.

**Descrição**

Criar um fluxo "Fechar mês" com checklist:

- Rascunhos pendentes.
- Recebíveis sem status.
- Pagamentos vencidos.
- Deduções em "Outros".
- Fator R abaixo do alvo.
- CSV e dossiê prontos.

**Impacto esperado**

- Menos exportações prematuras.
- Melhor experiência para usuários menos técnicos.
- Mais clareza para coordenadores e diretores.

**Prioridade:** Alta.

---

### 5. Modo alta legibilidade e relatório executivo

**Problema resolvido:** usuários mais velhos ou menos técnicos sofrem com densidade visual.

**Descrição**

Criar uma camada de apresentação com:

- Fontes maiores.
- Menos métricas por tela.
- Botões mais explícitos.
- Resumo mensal imprimível.
- Linguagem menos técnica.

**Impacto esperado**

- Maior adoção em médicos acima de 50 anos.
- Melhor uso em desktop.
- Menos necessidade de suporte humano.

**Prioridade:** Média-alta.

---

## 6. Recomendação Final

A V2.0 provou que o DocFin tem valor real como ponte entre vida financeira médica e backoffice contábil. A V3.0 deve abandonar a ideia de que o médico será um operador disciplinado de dados. O produto deve assumir o máximo possível da carga operacional.

As próximas decisões devem seguir três princípios:

1. **O médico confirma; o sistema sugere.**
2. **O contador acessa; não espera arquivo.**
3. **O banco reconcilia; o usuário não digita data manualmente.**

Se esses três princípios forem bem executados, o DocFin deixa de ser apenas um painel financeiro e se torna infraestrutura operacional para médicos PJ e seus contadores.
