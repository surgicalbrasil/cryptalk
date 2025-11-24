# Guia de Análise de Documentos para Agentes de IA

## 1. Visão Geral

Este guia fornece estruturas completas para análise de documentos pelos agentes de IA do Claude Code, permitindo análises profundas e insights valiosos através de conversação natural.

### 1.1 Tipos de Documento Suportados

#### Pitch Deck (PPT/PPTX/PDF)
- **Foco**: Storytelling, market analysis, traction, financials
- **Estrutura**: `/analysis-structures/pitch-deck-analysis.md`
- **Score**: Sistema de pontuação 0-10 por categoria

#### Patente (DOC/DOCX/PDF)
- **Foco**: Novidade, claims, prior art, commercial viability
- **Estrutura**: `/analysis-structures/patent-analysis.md`
- **Score**: Sistema de pontuação 0-10 por categoria

#### Projeção Financeira (XLS/XLSX/CSV)
- **Foco**: Assumptions, metrics, sensitivity analysis
- **Estrutura**: `/analysis-structures/financial-projection-analysis.md`
- **Score**: Sistema de pontuação 0-10 por categoria

## 2. Fluxo de Análise

### 2.1 Identificação do Documento
```
1. Extrair metadados do documento
2. Identificar tipo de documento
3. Selecionar estrutura de análise apropriada
4. Definir profundidade da análise
```

### 2.2 Análise Inicial
```
1. Scanning geral do conteúdo
2. Identificação de seções principais
3. Extração de informações básicas
4. Mapeamento contra estrutura de análise
```

### 2.3 Análise Detalhada
```
1. Aplicar critérios de avaliação específicos
2. Pontuar cada categoria (0-10)
3. Identificar pontos fortes e fracos
4. Gerar insights e recomendações
```

### 2.4 Síntese e Apresentação
```
1. Compilar análise usando template
2. Gerar score geral ponderado
3. Preparar perguntas para aprofundamento
4. Identificar próximos passos
```

## 3. Prompts Principais por Tipo

### 3.1 Pitch Deck
```
Analyze this pitch deck focusing on:
- Story clarity and market opportunity
- Business model and unit economics
- Team capability and traction
- Financial projections and use of funds
- Overall investment readiness

Use the structure from pitch-deck-analysis.md
```

### 3.2 Patente
```
Analyze this patent document focusing on:
- Novelty and inventive step
- Claim scope and protection
- Prior art and freedom to operate
- Commercial value and licensing potential
- Overall patent strength

Use the structure from patent-analysis.md
```

### 3.3 Projeção Financeira
```
Analyze this financial projection focusing on:
- Assumption validity and realism
- Unit economics and growth sustainability
- Cash flow and funding requirements
- Sensitivity analysis and risk assessment
- Overall financial viability

Use the structure from financial-projection-analysis.md
```

## 4. Critérios de Qualidade

### 4.1 Análise Completa
- [ ] Todas as seções da estrutura foram abordadas
- [ ] Pontuação consistente com critérios definidos
- [ ] Insights específicos e acionáveis
- [ ] Recomendações práticas e priorizadas

### 4.2 Conversação Natural
- [ ] Linguagem clara e acessível
- [ ] Evitar jargões desnecessários
- [ ] Explicar conceitos complexos
- [ ] Manter tom profissional mas amigável

### 4.3 Valor Agregado
- [ ] Ir além do óbvio
- [ ] Conectar diferentes aspectos
- [ ] Identificar riscos e oportunidades
- [ ] Sugerir próximos passos

## 5. Perguntas Padrão de Aprofundamento

### 5.1 Contexto e Background
- "Pode me contar mais sobre o contexto deste documento?"
- "Qual é o objetivo principal desta análise?"
- "Há informações adicionais que deveriam ser consideradas?"

### 5.2 Clarificação de Pontos
- "Poderia explicar melhor [aspecto específico]?"
- "Como isso se compara com [benchmark relevante]?"
- "Quais são as implicações práticas de [finding]?"

### 5.3 Próximos Passos
- "Quais são as prioridades após esta análise?"
- "Que ações específicas você recomendaria?"
- "Como podemos monitorar o progresso?"

## 6. Red Flags Universais

### 6.1 Qualidade dos Dados
- Informações inconsistentes
- Lacunas importantes
- Dados desatualizados
- Fontes não confiáveis

### 6.2 Análise Superficial
- Falta de profundidade
- Ausência de benchmarking
- Não consideração de riscos
- Conclusões precipitadas

### 6.3 Apresentação Problemática
- Estrutura confusa
- Visualizações inadequadas
- Linguagem imprecisa
- Falta de clareza

## 7. Integração com Outros Documentos

### 7.1 Análise Cruzada
- Pitch deck + projeções financeiras
- Patente + análise de mercado
- Múltiplas patentes relacionadas
- Evolução temporal de documentos

### 7.2 Síntese Integrada
- Visão holística do negócio
- Consistência entre documentos
- Identificação de gaps
- Recomendações integradas

## 8. Métricas de Sucesso

### 8.1 Qualidade da Análise
- Completude (% de seções analisadas)
- Profundidade (nível de insight)
- Precisão (alinhamento com especialistas)
- Utilidade (ações tomadas)

### 8.2 Experiência do Usuário
- Satisfação com análise
- Clareza das recomendações
- Facilidade de uso
- Valor percebido

## 9. Casos de Uso Específicos

### 9.1 Investor Due Diligence
- Análise completa de pitch deck
- Validação de projeções financeiras
- Avaliação de IP (patentes)
- Síntese de recomendação

### 9.2 Strategic Planning
- Análise de mercado (pitch deck)
- Modelagem financeira (projeções)
- Proteção IP (patentes)
- Plano de ação integrado

### 9.3 Product Development
- Análise de patentes (prior art)
- Modelagem de negócio (financeiro)
- Posicionamento (pitch deck)
- Roadmap de desenvolvimento

## 10. Limitações e Considerações

### 10.1 Limitações dos Documentos
- Informações podem estar desatualizadas
- Bias dos autores
- Contexto limitado
- Qualidade variável

### 10.2 Limitações da Análise
- Baseada apenas no documento
- Não substitui expertise humana
- Pode requerer validação externa
- Contexto de mercado pode mudar

### 10.3 Melhores Práticas
- Sempre questionar premissas
- Buscar validação externa
- Considerar múltiplas perspectivas
- Manter análise atualizada

## 11. Templates de Comunicação

### 11.1 Início da Análise
```
Vou analisar este [tipo de documento] usando nossa estrutura especializada. 
A análise cobrirá [aspectos principais] e fornecerá uma pontuação 
detalhada em cada categoria. Você gostaria de focar em algum aspecto específico?
```

### 11.2 Durante a Análise
```
Identifiquei [pontos importantes] que merecem atenção. 
Posso aprofundar em [aspecto específico] se você quiser mais detalhes.
```

### 11.3 Conclusão da Análise
```
Completei a análise com score geral de [X/10]. 
Os principais pontos são: [resumo]. 
Recomendo focar em [prioridades]. 
Tem perguntas sobre algum aspecto específico?
```

## 12. Evolução Contínua

### 12.1 Feedback Loop
- Coletar feedback dos usuários
- Ajustar critérios de avaliação
- Refinar estruturas de análise
- Atualizar benchmarks

### 12.2 Novos Tipos de Documento
- Identificar demanda
- Desenvolver estruturas
- Testar e validar
- Implementar e treinar

### 12.3 Melhoria de Qualidade
- Revisão periódica das estruturas
- Atualização de benchmarks
- Treinamento contínuo
- Monitoramento de qualidade