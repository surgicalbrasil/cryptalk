# Estrutura de Análise para Projeções Financeiras

## 1. Estrutura de Análise Completa

### 1.1 Informações Básicas
- **Período de Projeção**: Horizonte temporal analisado
- **Tipo de Negócio**: B2B, B2C, marketplace, SaaS, etc.
- **Moeda Base**: Moeda das projeções
- **Última Atualização**: Data da versão do modelo
- **Cenários**: Base, otimista, pessimista

### 1.2 Premissas Fundamentais
- **Premissas de Mercado**: Crescimento, penetração, share
- **Premissas Operacionais**: Capacidade, eficiência, produtividade
- **Premissas Macroeconômicas**: Inflação, juros, câmbio
- **Premissas Regulatórias**: Mudanças legais, compliance
- **Premissas Tecnológicas**: Inovação, obsolescência

### 1.3 Modelo de Receita
- **Streams de Receita**: Fontes identificadas
- **Modelo de Precificação**: Estratégia de preços
- **Sazonalidade**: Variações temporais
- **Recorrência**: Receitas recorrentes vs one-time
- **Churn e Retenção**: Taxas de cancelamento

### 1.4 Estrutura de Custos
- **Custos Variáveis**: Proporcionais à receita
- **Custos Fixos**: Independentes do volume
- **Custos Diretos**: Relacionados ao produto/serviço
- **Custos Indiretos**: Overhead e administrativos
- **Economias de Escala**: Diluição de custos fixos

### 1.5 Análise de Unit Economics
- **Customer Acquisition Cost (CAC)**: Custo de aquisição
- **Lifetime Value (LTV)**: Valor vitalício do cliente
- **Payback Period**: Tempo para recuperar CAC
- **Gross Margin**: Margem bruta por unidade
- **Contribution Margin**: Margem de contribuição

### 1.6 Projeções de Crescimento
- **Crescimento da Receita**: Taxas mensais/anuais
- **Crescimento de Clientes**: Aquisição líquida
- **Crescimento de Mercado**: Expansão do TAM
- **Crescimento de Equipe**: Plano de contratações
- **Crescimento de Capacidade**: Infraestrutura

### 1.7 Análise de Fluxo de Caixa
- **Fluxo de Caixa Operacional**: Geração de caixa
- **Fluxo de Caixa de Investimento**: Capex e investimentos
- **Fluxo de Caixa Financeiro**: Captação e pagamento
- **Working Capital**: Capital de giro necessário
- **Burn Rate**: Queima de caixa mensal

### 1.8 Análise de Investimentos
- **Capex**: Investimentos em ativos fixos
- **Opex**: Despesas operacionais
- **R&D**: Investimentos em pesquisa
- **Marketing**: Investimentos em aquisição
- **Tecnologia**: Investimentos em IT

### 1.9 Análise de Financiamento
- **Necessidade de Capital**: Funding requirements
- **Fontes de Financiamento**: Equity, debt, grants
- **Timing**: Quando captar recursos
- **Dilution**: Impacto na participação
- **Covenants**: Restrições financeiras

### 1.10 Análise de Sensibilidade
- **Variáveis Críticas**: Drivers principais
- **Cenários Alternativos**: Stress testing
- **Break-even Analysis**: Ponto de equilíbrio
- **Tornado Charts**: Sensibilidade a mudanças
- **Monte Carlo**: Simulações probabilísticas

## 2. Critérios de Avaliação

### 2.1 Realismo das Premissas (Peso: 30%)
- **Fundamentação**: 0-10
- **Benchmarking**: 0-10
- **Consistência**: 0-10
- **Atualização**: 0-10

### 2.2 Qualidade dos Dados (Peso: 25%)
- **Precisão**: 0-10
- **Completude**: 0-10
- **Granularidade**: 0-10
- **Rastreabilidade**: 0-10

### 2.3 Metodologia (Peso: 20%)
- **Abordagem**: 0-10
- **Sofisticação**: 0-10
- **Flexibilidade**: 0-10
- **Auditabilidade**: 0-10

### 2.4 Análise de Sensibilidade (Peso: 15%)
- **Cenários**: 0-10
- **Variáveis**: 0-10
- **Impactos**: 0-10
- **Mitigação**: 0-10

### 2.5 Apresentação (Peso: 10%)
- **Clareza**: 0-10
- **Visualização**: 0-10
- **Estrutura**: 0-10
- **Usabilidade**: 0-10

## 3. Prompts de Análise Estruturados

### 3.1 Análise de Premissas
```
Para avaliar as premissas:
1. As premissas são baseadas em dados históricos?
2. Há benchmarking com empresas similares?
3. As premissas são consistentes entre si?
4. Como as premissas se comparam ao mercado?
5. Há premissas que parecem otimistas demais?
```

### 3.2 Análise de Unit Economics
```
Para examinar unit economics:
1. O CAC é sustentável e tem tendência de redução?
2. O LTV é realista considerando churn?
3. A razão LTV/CAC é saudável (>3)?
4. O payback period é aceitável (<24 meses)?
5. As margens melhoram com escala?
```

### 3.3 Análise de Crescimento
```
Para avaliar o crescimento:
1. As taxas de crescimento são sustentáveis?
2. Há capacidade operacional para o crescimento?
3. O crescimento é orgânico ou depende de M&A?
4. Como o crescimento se compara aos peers?
5. Há sazonalidade considerada?
```

### 3.4 Análise de Fluxo de Caixa
```
Para análise de caixa:
1. O negócio gera caixa operacional positivo?
2. Quando é esperado o break-even de caixa?
3. Há necessidade de capital de giro significativo?
4. O timing de recebimentos está correto?
5. Há reservas adequadas para imprevistos?
```

## 4. Template de Resposta

### 4.1 Resumo Executivo
```markdown
## Análise de Projeções Financeiras: [Nome da Empresa]

### Informações Básicas
- **Período**: [Horizonte temporal]
- **Tipo**: [Modelo de negócio]
- **Cenário**: [Base/Otimista/Pessimista]
- **Score Geral**: [X/10]

### Métricas Principais
- **Receita Ano 5**: [Valor projetado]
- **EBITDA Ano 5**: [Valor e margem]
- **Break-even**: [Mês/Ano esperado]
- **Funding Need**: [Capital necessário]

### Avaliação Geral
- **Realismo**: [Alto/Médio/Baixo]
- **Qualidade**: [Excelente/Boa/Regular]
- **Sustentabilidade**: [Forte/Média/Fraca]
- **Risco**: [Baixo/Médio/Alto]

### Recomendações
1. [Ação prioritária]
2. [Ação secundária]
3. [Ação terciária]
```

### 4.2 Análise Detalhada
```markdown
## Análise Detalhada

### 1. Análise de Receita
**Score: X/10**
- **Crescimento**: [Taxa anual composta]
- **Drivers**: [Principais fatores de crescimento]
- **Sazonalidade**: [Variações identificadas]
- **Recorrência**: [% de receita recorrente]
- **Riscos**: [Principais ameaças à receita]

### 2. Análise de Custos
**Score: X/10**
- **Estrutura**: [Fixos vs variáveis]
- **Escalabilidade**: [Economia de escala]
- **Eficiência**: [Tendência de margens]
- **Benchmarking**: [Comparação com mercado]
- **Controle**: [Previsibilidade dos custos]

### 3. Unit Economics
**Score: X/10**
- **CAC**: [Valor atual e tendência]
- **LTV**: [Valor e fundamentação]
- **LTV/CAC**: [Razão e benchmark]
- **Payback**: [Período de recuperação]
- **Margem**: [Contribuição por unidade]

### 4. Fluxo de Caixa
**Score: X/10**
- **Operacional**: [Geração de caixa]
- **Investimento**: [Necessidades de capex]
- **Financiamento**: [Funding requirements]
- **Break-even**: [Timing e drivers]
- **Burn Rate**: [Queima mensal]

### 5. Análise de Sensibilidade
**Score: X/10**
- **Cenários**: [Variações consideradas]
- **Variáveis**: [Fatores críticos]
- **Impactos**: [Magnitude das mudanças]
- **Mitigação**: [Estratégias de risco]
- **Flexibilidade**: [Adaptabilidade do modelo]
```

## 5. Perguntas Sugeridas para Aprofundamento

### 5.1 Sobre Premissas
- "Como foram validadas as premissas de crescimento de mercado?"
- "Quais são as principais incertezas nas premissas?"
- "Com que frequência as premissas são revisadas?"
- "Há premissas que dependem de fatores externos?"

### 5.2 Sobre Unit Economics
- "Como o CAC tem evoluído historicamente?"
- "Qual é a metodologia para calcular LTV?"
- "Como o churn rate varia por segmento de cliente?"
- "Há diferenças de unit economics por canal?"

### 5.3 Sobre Crescimento
- "Qual é a capacidade máxima de crescimento orgânico?"
- "Como será financiado o crescimento projetado?"
- "Há gargalos operacionais que limitam o crescimento?"
- "Qual é o plano de expansão geográfica?"

### 5.4 Sobre Custos
- "Como os custos se comportam em diferentes volumes?"
- "Quais custos são mais difíceis de prever?"
- "Há oportunidades de redução de custos identificadas?"
- "Como a inflação impacta a estrutura de custos?"

### 5.5 Sobre Financiamento
- "Quando será necessário o próximo funding?"
- "Quais são as opções de financiamento disponíveis?"
- "Como seria o impacto de um funding atrasado?"
- "Há alternativas de financiamento não dilutivo?"

### 5.6 Sobre Riscos
- "Quais são os principais riscos às projeções?"
- "Como seria o impacto de uma recessão?"
- "Há dependências críticas de fornecedores?"
- "Como mudanças regulatórias afetariam o modelo?"

## 6. Red Flags Comuns

### 6.1 Problemas de Premissas
- Crescimento hockey stick sem justificativa
- Premissas internas inconsistentes
- Falta de benchmarking com mercado
- Premissas estáticas que não evoluem

### 6.2 Problemas de Unit Economics
- CAC crescendo mais rápido que LTV
- Payback period muito longo
- Margens deteriorando com escala
- Churn rate subestimado

### 6.3 Problemas de Modelagem
- Falta de granularidade nos drivers
- Modelos muito simplificados
- Ausência de análise de sensibilidade
- Projeções lineares irrealistas

### 6.4 Problemas de Apresentação
- Falta de transparência nas premissas
- Ausência de cenários alternativos
- Métricas inconsistentes
- Visualizações confusas

## 7. Análise de Benchmarking

### 7.1 Métricas de Mercado
- **Crescimento de Receita**: vs peers do setor
- **Margens**: comparação com benchmarks
- **Eficiência**: métricas de produtividade
- **Valorização**: múltiplos aplicados

### 7.2 Análise de Peers
- **Empresas Similares**: mesmo estágio/setor
- **Métricas Comparáveis**: KPIs relevantes
- **Performance**: relativa ao mercado
- **Melhores Práticas**: aprendizados

### 7.3 Análise Setorial
- **Tendências**: direção do setor
- **Ciclos**: sazonalidade e ciclos
- **Disrupção**: ameaças e oportunidades
- **Regulação**: impactos esperados

## 8. Análise de Viabilidade

### 8.1 Viabilidade Técnica
- **Capacidade Operacional**: pode entregar?
- **Recursos Humanos**: tem o time necessário?
- **Tecnologia**: infraestrutura adequada?
- **Processos**: sistemas suportam crescimento?

### 8.2 Viabilidade Comercial
- **Mercado**: existe demanda suficiente?
- **Competição**: pode competir efetivamente?
- **Posicionamento**: tem diferencial sustentável?
- **Execução**: pode implementar a estratégia?

### 8.3 Viabilidade Financeira
- **Funding**: pode captar recursos necessários?
- **Retorno**: oferece retorno adequado?
- **Risco**: risco compatível com retorno?
- **Liquidez**: pode manter operação?

## 9. Checklist Final

- [ ] Premissas fundamentadas e consistentes
- [ ] Unit economics saudáveis e sustentáveis
- [ ] Crescimento realista e factível
- [ ] Estrutura de custos otimizada
- [ ] Fluxo de caixa bem modelado
- [ ] Necessidades de funding claras
- [ ] Análise de sensibilidade robusta
- [ ] Benchmarking com mercado
- [ ] Apresentação clara e transparente
- [ ] Riscos identificados e mitigados

## 10. Métricas Essenciais por Tipo de Negócio

### 10.1 SaaS
- **MRR/ARR**: Receita recorrente
- **Churn Rate**: Taxa de cancelamento
- **ARPU**: Receita por usuário
- **CAC Payback**: Tempo de recuperação
- **Net Revenue Retention**: Retenção líquida

### 10.2 E-commerce
- **GMV**: Volume bruto de mercadorias
- **Take Rate**: Taxa de comissão
- **AOV**: Valor médio do pedido
- **Conversion Rate**: Taxa de conversão
- **Customer Frequency**: Frequência de compra

### 10.3 Marketplace
- **Network Effects**: Efeitos de rede
- **Liquidity**: Liquidez do mercado
- **Density**: Densidade de transações
- **Multi-homing**: Uso de múltiplas plataformas
- **Engagement**: Engajamento dos usuários

### 10.4 Hardware
- **Gross Margin**: Margem bruta por unidade
- **Inventory Turns**: Giro de estoque
- **Manufacturing Efficiency**: Eficiência produtiva
- **Warranty Costs**: Custos de garantia
- **Product Lifecycle**: Ciclo de vida do produto