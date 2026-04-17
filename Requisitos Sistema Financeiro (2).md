# **Documento de Requisitos: Sistema de Gestão Financeira Pessoal (v2.0 \- SaaS Edition)**

## **1\. Visão Geral**

O sistema evoluiu de um "livro-caixa" local para uma plataforma SaaS na nuvem. O objetivo principal continua a ser atuar como um **Motor de Previsibilidade e Alívio de Ansiedade**, capaz de projetar o futuro financeiro, gerenciar complexidade de cartões de crédito e calcular faturamento dinâmico PJ.

Para suportar a comercialização (multi-tenancy) com máxima confiança arquitetural, o sistema transita para uma arquitetura baseada num **Backend Customizado (API REST \+ PostgreSQL)**, utilizando autenticação tradicional tratada diretamente na camada de código, incorporando estratégias de *Onboarding* avançadas para reter novos utilizadores e ferramentas visuais de categorização.

## **2\. Requisitos Funcionais (Módulos de Negócio)**

### **Módulo 1: Categorização Inteligente e Árvore de Gastos**

* \[x\] **RF1.1:** Suporte a categorias pai e subcategorias. *(Implementado em types/transaction.ts e data/categories.ts)*  
* \[x\] **RF1.2:** Sistema de *Tags* independentes para cruzamento de dados. *(Implementado em types/transaction.ts)*  
* \[ \] **RF1.3 (SaaS \- Analítico):** Card de Gastos por Categoria (Bento Grid) no Dashboard principal, exibindo a distribuição percentual das despesas ativas do mês num gráfico interativo (Donut/Pizza) com funcionalidade de *Drill-down* (clique para ver detalhes). *(Pendente: Utilitário echarts.ts existe, mas falta a visão consolidada de Drill-down)*  
* \[ \] **RF1.4 (SaaS \- Analítico):** Card de Total de Faturas no Dashboard principal (Bento Grid), exibindo o valor total consolidado de todas as faturas de cartões de crédito ativas no mês selecionado, permitindo uma rápida visualização do peso do crédito no orçamento geral.

### **Módulo 2: Gestão Avançada de Cartões de Crédito**

* \[x\] **RF2.1:** Cadastro de múltiplos cartões com controle de **Limite Total** e **Limite Disponível**. *(Implementado em types/card.ts e useTransactionStore.ts)*  
* \[x\] **RF2.2:** Vínculo obrigatório de despesas de crédito a um cartão.  
* \[x\] **RF2.3:** Visão consolidada de faturas e barras de progresso (Magic UI) para utilização de limites (cores baseadas no nível de utilização). *(Implementado nos componentes de Cards)*  
* \[x\] **RF2.4:** Campo manualInvoiceAmount para permitir o lançamento rápido de "gastos fantasmas/invisíveis" do dia a dia, garantindo que o sistema espelha o valor real cobrado pelo banco sem micro-gestão. *(Lógica confirmada na store)*

### **Módulo 3: Motor de Parcelamentos e Recorrências**

* \[x\] **RF3.1:** Cadastro de Despesas Fixas e Parcelamentos. *(Implementado via FixedCost e InstallmentPlan)*  
* \[x\] **RF3.2:** **Baixa Automática Iterativa:** Decremento automático de parcelas na viragem do mês, desaparecendo das projeções quando quitadas. *(Implementado nas funções de projeção e getCommittedCostsForMonth)*

### **Módulo 4: Projeção de Fluxo de Caixa (O Coração do Sistema)**

* \[x\] **RF4.1:** Geração de extrato projetado (seleção de meses futuros). *(Implementado na ProjectionsPage.tsx e utilitários)*  
* \[x\] **RF4.2:** O cálculo da projeção dita a "Sobra Líquida Estimada": (Faturamento PJ Calculado) \- (Custos Fixos) \- (Faturas/Parcelas Ativas no Mês Alvo). *(Implementado em selectProjectedMonthlyLeftover)*

### **Módulo 5: Motor de Metas e Conquistas**

* \[x\] **RF5.1:** Criação de Objetivos com valor alvo e Saldo Atual. *(Implementado em useGoalStore.ts e GoalDashboard.tsx)*  
* \[x\] **RF5.2 (Regra do Mês Cheio):** O cálculo de previsão deve utilizar Math.ceil((Alvo \- Guardado) / Aporte) para garantir que a projeção aponta sempre para um ciclo real de faturação, não iludindo o utilizador com frações de mês. *(Implementado em goalProjections.ts)*  
* \[x\] **RF5.3 (Validador de Sobrecarga):** Se a soma dos Aportes Mensais planeados para todas as metas exceder a Sobra Líquida Projetada (RF4.2), o sistema deve emitir um alerta visual (banner vermelho) impedindo o auto-engano. *(Implementado em useGoalCashflowStatus e OverloadBanner.tsx)*

### **Módulo 6: Motor de Faturamento PJ**

* \[x\] **RF6.1:** Configuração de Valor/Hora e Carga Diária. *(Implementado em contractConfig)*  
* \[x\] **RF6.2:** Integração com BrasilAPI para mapear feriados e calcular os **Dias Úteis** exatos do mês selecionado, projetando a receita automaticamente. *(Implementado em calendar.ts e business-days.ts)*

### **Módulo 7: Gestão de Contas Bancárias e Reservas Liquidas (Novo)**

*Crucial para separar o dinheiro que "já existe" do dinheiro que "vai sobrar" (Overview).*

* \[ \] **RF7.1:** Cadastro de Contas Correntes/Investimentos (ex: "Conta Nubank", "CDB Itaú").  
* \[ \] **RF7.2 (Isolamento de Saldo):** O saldo positivo destas contas **NÃO** se mistura com a "Sobra Projetada" do mês atual exibida no Dashboard. A Sobra é um indicador de *fluxo* (entradas vs saídas do mês), enquanto o Saldo das Contas é um indicador de *patrimônio líquido*.  
* \[ \] **RF7.3:** Transferência Virtual: O utilizador pode "alocar" parte do saldo de uma Conta Bancária para uma Meta específica (RF5.1), atualizando o Saldo Guardado da meta sem afetar o fluxo de caixa mensal.

### **Módulo 8: UI/UX "Frictionless" e Onboarding (SaaS)**

*Focado em retenção de clientes.*

* \[ \] **RF8.1:** Inserção monetária baseada em cliques (Quick Chips, Sliders, Virtual Numpad). *(Parcialmente pendente \- Formulários ainda padrão)*  
* \[ \] **RF8.2 (Camada 1 \- Tour Guiado):** Utilização da biblioteca driver.js para um passo-a-passo obrigatório no primeiro acesso, focando em ensinar o conceito da "Sobra Projetada".  
* \[ \] **RF8.3 (Camada 2 \- Empty States):** Ecrãs sem dados devem exibir ilustrações e textos educativos (ex: "Adicione o seu primeiro cartão para prever faturas"), em vez de ecrãs em branco.  
* \[ \] **RF8.4 (Camada 3 \- Tooltips):** Ícones (?) explicativos em campos complexos (como o manualInvoiceAmount ou o cálculo de Faturamento PJ) para não poluir a interface visual diária. *(Componente DismissibleInfoCard criado, mas tooltips e expansão pendentes)*

## **3\. Requisitos Não Funcionais (Arquitetura SaaS em Nuvem)**

* \[ \] **RNF1 (Base de Dados e Backend):** O sistema abandona a persistência local (IndexedDB). A nova fonte de verdade será uma base de dados **PostgreSQL** relacional hospedada em nuvem, gerida por um **Backend Próprio (ex: Java Spring Boot ou Node.js)**. *(Atualmente usando localStorage via Zustand persist)*  
* \[ \] **RNF2 (Multi-Tenancy & Segurança):** A autenticação e autorização **NÃO** dependerão de políticas de banco de dados (RLS). A segurança será gerida via **Tokens JWT** (utilizando provedores como Auth0, Keycloak ou Spring Security). O isolamento de dados (user\_id) será validado estritamente na **Camada de Serviço (Service Layer)** do backend em todas as requisições.  
* \[ \] **RNF3 (Sincronização de Estado):** O Zustand funcionará como cache/otimização (Optimistic UI) no frontend React. Toda a comunicação de dados será feita via chamadas de API REST autenticadas (Bearer Token) para o backend customizado.  
* \[ \] **RNF4 (Integração Futura \- Open Finance):** A arquitetura deve prever integrações seguras feitas exclusivamente pelo lado do servidor (Backend) a APIs agregadoras (Pluggy/Belvo) para importação automática de faturas, a ser disponibilizada num *Tier Premium*.  
* 