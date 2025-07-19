# Estrutura de Análise para Patentes

## 1. Estrutura de Análise Completa

### 1.1 Informações Básicas
- **Título da Patente**: Nome oficial da invenção
- **Número/Código**: Número da patente ou aplicação
- **Jurisdição**: País/região de proteção
- **Data de Depósito**: Data de filing
- **Data de Prioridade**: Data de primeira prioridade
- **Status**: Pendente, concedida, rejeitada, expirada
- **Classificação**: IPC, CPC, US Class

### 1.2 Identificação dos Inventores
- **Inventores**: Nomes e afiliações
- **Requerente/Assignee**: Empresa ou pessoa física
- **Procurador**: Escritório de advocacia
- **Histórico de Cessões**: Transferências de propriedade

### 1.3 Análise Técnica
- **Campo Técnico**: Área de aplicação
- **Background**: Estado da técnica apresentado
- **Problema Técnico**: Questão que a invenção resolve
- **Solução Técnica**: Como o problema é resolvido
- **Vantagens Técnicas**: Benefícios sobre art anterior

### 1.4 Reivindicações (Claims)
- **Reivindicações Independentes**: Claims principais
- **Reivindicações Dependentes**: Claims secundárias
- **Escopo de Proteção**: Amplitude da proteção
- **Limitações**: Restrições nas reivindicações

### 1.5 Análise de Novidade
- **Arte Anterior Relevante**: Documentos citados
- **Diferenças sobre Arte Anterior**: Elementos novos
- **Atividade Inventiva**: Não obviedade da solução
- **Avaliação de Patenteabilidade**: Chances de concessão

### 1.6 Análise de Infração
- **Produtos/Processos Potencialmente Infratores**
- **Análise de Literalidade**: Infração literal
- **Análise de Equivalência**: Infração por equivalência
- **Defesas Possíveis**: Invalidade, não infração

### 1.7 Valor Comercial
- **Mercado Potencial**: Tamanho do mercado relacionado
- **Aplicações Comerciais**: Usos práticos da tecnologia
- **Licenciamento**: Potencial de licenciamento
- **Enforcement**: Facilidade de detectar infração

### 1.8 Análise de Portfólio
- **Patentes Relacionadas**: Família de patentes
- **Continuações**: Pedidos divisórios ou continuações
- **Proteção Internacional**: Outros países
- **Expiração**: Datas de expiração

### 1.9 Análise de Risco
- **Riscos de Invalidade**: Fragilidades identificadas
- **Riscos de Contorno**: Facilidade de design around
- **Riscos Legais**: Potencial de litígio
- **Riscos Comerciais**: Mudanças tecnológicas

### 1.10 Análise de Liberdade de Operação
- **FTO (Freedom to Operate)**: Risco de infração
- **Patentes Bloqueadoras**: Direitos de terceiros
- **Estratégias de Mitigação**: Licenciamento, invalidação
- **Alternativas Técnicas**: Design around options

## 2. Critérios de Avaliação

### 2.1 Novidade (Peso: 25%)
- **Diferenciação**: 0-10
- **Evidência de Novidade**: 0-10
- **Qualidade da Busca**: 0-10
- **Resistência a Contestação**: 0-10

### 2.2 Atividade Inventiva (Peso: 25%)
- **Não Obviedade**: 0-10
- **Salto Inventivo**: 0-10
- **Motivação para Combinar**: 0-10
- **Resultado Surpreendente**: 0-10

### 2.3 Aplicabilidade Industrial (Peso: 15%)
- **Utilidade Prática**: 0-10
- **Viabilidade Técnica**: 0-10
- **Reprodutibilidade**: 0-10
- **Aplicações Múltiplas**: 0-10

### 2.4 Escopo de Proteção (Peso: 15%)
- **Amplitude das Claims**: 0-10
- **Cobertura do Mercado**: 0-10
- **Dificuldade de Contorno**: 0-10
- **Proteção de Features Essenciais**: 0-10

### 2.5 Valor Comercial (Peso: 10%)
- **Tamanho do Mercado**: 0-10
- **Potencial de Licenciamento**: 0-10
- **Importância Estratégica**: 0-10
- **Geração de Royalties**: 0-10

### 2.6 Qualidade da Redação (Peso: 10%)
- **Clareza das Claims**: 0-10
- **Suporte na Descrição**: 0-10
- **Consistência**: 0-10
- **Estratégia de Claiming**: 0-10

## 3. Prompts de Análise Estruturados

### 3.1 Análise de Patenteabilidade
```
Para avaliar a patenteabilidade:
1. A invenção resolve um problema técnico real?
2. A solução é nova em relação ao estado da técnica?
3. A invenção seria óbvia para um técnico no assunto?
4. A invenção tem aplicação industrial clara?
5. A descrição permite reprodução por terceiros?
```

### 3.2 Análise de Arte Anterior
```
Ao examinar o estado da técnica:
1. Todos os documentos relevantes foram considerados?
2. As diferenças sobre a arte anterior são significativas?
3. Existem combinações óbvias que antecipam a invenção?
4. A busca foi abrangente em todas as jurisdições?
5. Há arte anterior não documentada (uso público)?
```

### 3.3 Análise de Infração
```
Para avaliar potencial de infração:
1. Quais produtos/processos podem infringir?
2. A infração seria literal ou por equivalência?
3. Existem elementos limitantes nas claims?
4. Como seria detectada a infração?
5. Quais defesas o infrator poderia usar?
```

### 3.4 Análise de Valor
```
Para determinar o valor comercial:
1. Qual é o tamanho do mercado relacionado?
2. A tecnologia é essencial para o mercado?
3. Existem alternativas técnicas viáveis?
4. Qual é o potencial de licensing?
5. Como a patente se encaixa na estratégia de IP?
```

## 4. Template de Resposta

### 4.1 Resumo Executivo
```markdown
## Análise de Patente: [Título da Patente]

### Informações Básicas
- **Número**: [Número da patente]
- **Jurisdição**: [País/região]
- **Status**: [Pendente/Concedida/etc]
- **Classificação**: [IPC/CPC]
- **Score Geral**: [X/10]

### Avaliação Geral
- **Patenteabilidade**: [Forte/Média/Fraca]
- **Valor Comercial**: [Alto/Médio/Baixo]
- **Risco de Infração**: [Alto/Médio/Baixo]
- **Qualidade da Redação**: [Excelente/Boa/Regular]

### Recomendações
1. [Ação sugerida principal]
2. [Ação sugerida secundária]
3. [Ação sugerida terciária]
```

### 4.2 Análise Detalhada
```markdown
## Análise Detalhada

### 1. Análise de Novidade
**Score: X/10**
- **Arte Anterior**: [Documentos relevantes identificados]
- **Diferenças**: [Elementos novos da invenção]
- **Gaps**: [Lacunas no estado da técnica]
- **Riscos**: [Potencial arte anterior não encontrada]

### 2. Atividade Inventiva
**Score: X/10**
- **Não Obviedade**: [Avaliação da inventividade]
- **Motivação**: [Razões para combinar referências]
- **Resultado**: [Efeito técnico alcançado]
- **Ensinamentos**: [Direcionamento contrário na arte]

### 3. Escopo de Proteção
**Score: X/10**
- **Claims Independentes**: [Análise das principais]
- **Claims Dependentes**: [Análise das secundárias]
- **Amplitude**: [Cobertura do mercado]
- **Limitações**: [Restrições identificadas]

### 4. Valor Comercial
**Score: X/10**
- **Mercado**: [Tamanho e crescimento]
- **Aplicações**: [Usos comerciais identificados]
- **Essencialidade**: [Importância para o mercado]
- **Licensing**: [Potencial de monetização]

### 5. Riscos e Oportunidades
**Score: X/10**
- **Invalidade**: [Riscos de contestação]
- **Contorno**: [Facilidade de design around]
- **Enforcement**: [Dificuldade de fazer valer]
- **Estratégicos**: [Valor defensivo/ofensivo]
```

## 5. Perguntas Sugeridas para Aprofundamento

### 5.1 Sobre Novidade
- "Foram consideradas todas as bases de dados relevantes na busca?"
- "Existe potencial arte anterior não documentada?"
- "Como a invenção se diferencia especificamente das referências citadas?"
- "Há divulgações públicas anteriores pelos próprios inventores?"

### 5.2 Sobre Atividade Inventiva
- "Qual é o nível de conhecimento do técnico no assunto?"
- "Existem preconceitos técnicos que desencorajam a solução?"
- "A invenção resolve um problema de longa data?"
- "Há evidências de aceitação comercial da invenção?"

### 5.3 Sobre Escopo de Proteção
- "As claims cobrem adequadamente as realizações comerciais?"
- "Existem aspectos importantes não protegidos?"
- "Como um concorrente poderia contornar as claims?"
- "As claims dependentes adicionam valor defensivo?"

### 5.4 Sobre Valor Comercial
- "Qual é o mercado total endereçável para esta tecnologia?"
- "Quem são os principais players que poderiam licenciar?"
- "A tecnologia é essencial para algum padrão da indústria?"
- "Como esta patente se encaixa no portfólio existente?"

### 5.5 Sobre Infração
- "Quais produtos no mercado podem estar infringindo?"
- "Como seria detectada a infração desta patente?"
- "Existem marcadores que facilitam a identificação?"
- "Qual seria a estratégia de enforcement mais eficaz?"

### 5.6 Sobre Estratégia
- "Esta patente é defensiva ou ofensiva?"
- "Como se relaciona com outras patentes do portfólio?"
- "Há oportunidades de continuação ou divisional?"
- "Que países são prioritários para proteção?"

## 6. Red Flags Comuns

### 6.1 Problemas de Novidade
- Arte anterior muito próxima não citada
- Divulgações públicas anteriores
- Pedidos anteriores do mesmo inventor
- Conhecimento comum não considerado

### 6.2 Problemas de Atividade Inventiva
- Combinação óbvia de referências
- Motivação clara para combinar
- Resultado previsível
- Falta de efeito técnico surpreendente

### 6.3 Problemas de Redação
- Claims muito amplas ou vagas
- Falta de suporte na descrição
- Inconsistências terminológicas
- Estratégia de claiming inadequada

### 6.4 Problemas Comerciais
- Mercado muito pequeno
- Tecnologia rapidamente obsoleta
- Facilidade de contorno
- Dificuldade de detecção de infração

## 7. Análise de Portfólio

### 7.1 Mapeamento da Família
- **Prioridades**: Pedidos de prioridade relacionados
- **Continuações**: Pedidos divisórios e continuações
- **Proteção Internacional**: Status em outros países
- **Relacionamento**: Como as patentes se complementam

### 7.2 Análise de Cobertura
- **Gaps de Proteção**: Áreas não cobertas
- **Sobreposições**: Redundâncias no portfólio
- **Pontos Fortes**: Tecnologias bem protegidas
- **Evolução**: Direção do desenvolvimento

### 7.3 Estratégia de Manutenção
- **Anuidades**: Custos de manutenção
- **Pruning**: Patentes a abandonar
- **Fortalecimento**: Áreas a reforçar
- **Timing**: Cronograma de decisões

## 8. Checklist Final

- [ ] Novidade adequadamente demonstrada
- [ ] Atividade inventiva bem fundamentada
- [ ] Aplicabilidade industrial clara
- [ ] Claims bem redigidas e suportadas
- [ ] Escopo de proteção adequado
- [ ] Valor comercial identificado
- [ ] Riscos de invalidade avaliados
- [ ] Estratégia de enforcement definida
- [ ] Proteção internacional considerada
- [ ] Integração com portfólio analisada