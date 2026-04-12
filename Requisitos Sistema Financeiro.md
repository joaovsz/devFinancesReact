# **Documento de Requisitos: Sistema de Gestão Financeira Pessoal (v2.0)**

## **1\. Visão Geral**

O sistema atual funciona como um "livro-caixa" simples (entradas e saídas). O objetivo da versão 2.0 é transformar o sistema em um **Motor de Previsibilidade e Alívio de Ansiedade**, capaz de projetar o futuro financeiro, gerenciar complexidade de cartões de crédito, calcular faturamento dinâmico PJ e monitorar metas de longo prazo (como consórcios e reservas de emergência).

Tudo isso rodando de forma 100% autônoma no navegador (Frontend-Only / Local-First).

## **2\. Requisitos Funcionais (Baseados no Contexto do Usuário)**

### **Módulo 1: Categorização Inteligente, Tags e Árvore de Gastos**

O sistema deve abandonar o modelo "texto livre" e adotar categorias rígidas que reflitam a vida e as necessidades do usuário.

* **RF1.1:** Suporte a categorias pai e subcategorias.  
  * **Árvore de Categorias Padrão (Sugestão):**  
    * **Rendas:** Faturamento PJ, Recebíveis Familiares, Rendimentos.  
    * **Moradia:** Aluguel, Condomínio, Energia, Internet.  
    * **Alimentação:** Mercado, Delivery/iFood.  
    * **Saúde e Bem-Estar:** Plano de Saúde (Unimed), Terapias Nicolas, Academia.  
    * **Educação e Carreira:** Cursos/Assinaturas (Codex), Autoescola, Ferramentas (ChatGPT).  
    * **Lazer e Assinaturas:** PSN, Meli+, HBO, Spotify, Vestuário.  
    * **Impostos e Empresa:** DAS (Simples Nacional), Contabilidade (Contabilizei).  
    * **Bens e Equipamentos:** Eletrônicos (iPad, PS5), Móveis (Sofá, Máquina).  
    * **Patrimônio e Metas:** Consórcio, Reserva de Emergência.  
* **RF1.2:** Sistema de *Tags* independentes das categorias para cruzamento de dados (ex: \#Nicolas, \#Luciana, \#Carro, \#Setup\_Trabalho).

### **Módulo 2: Gestão Avançada de Cartões de Crédito**

O usuário possui múltiplos cartões e distribui as compras estrategicamente para não estourar limites.

* **RF2.1:** Cadastro de múltiplos cartões (Nubank, Ourocard, Credicard, Mercado Pago).  
* **RF2.2:** Controle de **Limite Total** e cálculo dinâmico de **Limite Disponível** baseado nas faturas futuras.  
* **RF2.3:** Vínculo obrigatório: Toda despesa de crédito deve estar atrelada a um cartão específico.  
* **RF2.4:** Visão consolidada: Uma tela que mostre "Faturas do Mês Atual" somando o valor que vencerá de todos os cartões.  
* **RF2.5:** **Indicadores Visuais de Progresso:** Barras de progresso gráficas para cada cartão mostrando a proporção entre "Limite Usado" e "Limite Total", utilizando cores de alerta (verde para seguro, amarelo para atenção, vermelho para próximo ao limite).

### **Módulo 3: Motor de Parcelamentos e Recorrências**

Crucial para o controle de ansiedade. O usuário precisa saber quando uma dívida acaba.

* **RF3.1:** Cadastro de Despesas Fixas (Recorrência infinita ou até cancelamento).  
* **RF3.2:** Cadastro de Parcelamentos com metadados: Valor da Parcela, Parcela Atual (X), Total de Parcelas (Y).  
* **RF3.3:** **Baixa Automática:** Ao virar o mês, o sistema deve decrementar as parcelas ativas. Quando "X \= Y", a despesa deve desaparecer das projeções.

### **Módulo 4: Projeção de Fluxo de Caixa (Mês a Mês)**

A funcionalidade mais requisitada. O sistema precisa simular os meses futuros.

* **RF4.1:** Geração de um extrato projetado (ex: Selecionar "Maio" ou "Outubro" e ver como estarão as contas).  
* **RF4.2:** O cálculo da projeção deve ser: (Saldo em Conta Projetado) \+ (Faturamento PJ Calculado) \- (Custos Fixos) \- (Parcelas Ativas no Mês Alvo).  
* **RF4.3:** Indicador visual de "Sobra Líquida Estimada" para cada mês futuro.

### **Módulo 5: Gestão de Metas e Caixinhas ("Baldes")**

* **RF5.1:** Criação de Objetivos com valor alvo e data limite (ex: "Lance Consórcio 53%", Alvo: R$ 26.500).  
* **RF5.2:** Separação virtual do Saldo: O sistema deve mostrar o "Saldo Total" e o "Saldo Livre" (Saldo Total \- Dinheiro alocado em Metas).  
* **RF5.3:** Indicador de progresso (barra de porcentagem) para as metas.

### **Módulo 6: Motor de Faturamento PJ (Cálculo de Dias Úteis)**

Essencial para desenvolvedores autônomos.

* **RF6.1:** Configuração de Contrato: Parâmetros base como Valor por Hora e Carga Horária Diária.  
* **RF6.2:** Integração com Calendário/Feriados: API (ex: BrasilAPI) para mapear feriados e abater dos dias úteis.  
* **RF6.3:** Projeção Automática de Receita: Injeção do faturamento estimado (Dias Úteis \* Horas \* Valor) no fluxo de caixa.

### **Módulo 7: UI/UX "Frictionless" (Sem Digitação)**

Foco em velocidade de inserção de dados, minimizando o uso do teclado para evitar atrito.

* **RF7.1:** **Inserção Monetária Baseada em Cliques:** Substituição do campo de texto tradicional de valor por componentes interativos:  
  * *Quick Chips:* Botões de valores redondos pré-definidos (ex: \+R$ 10, \+R$ 50, \+R$ 100\) que somam o valor ao serem clicados.  
  * *Virtual Numpad:* Um teclado numérico na própria interface web/app feito para cliques com o mouse ou toques rápidos, sem precisar focar em um input text.  
  * *Sliders:* Barras deslizantes para selecionar valores aproximados rapidamente.  
* **RF7.2:** **Seleção "Point-and-Click":** Categorias, cartões e tags devem ser exibidos como botões em grade (grid) grandes e facilmente clicáveis, com ícones visuais para identificação rápida.  
* **RF7.3:** **Navegação por Teclado (Power User):** Atalhos de teclado globais para selecionar opções (ex: apertar "1" seleciona "Alimentação", apertar "A" adiciona R$ 50\) para quando o usuário estiver codando e não quiser usar o mouse.

### **Módulo 8: Portabilidade e Persistência Local (No-Backend)**

Como o sistema não possui backend ou banco de dados em nuvem, a persistência e o compartilhamento entre dispositivos devem ser geridos diretamente pelo cliente.

* **RF8.1:** **Armazenamento Local (IndexedDB/LocalStorage):** O estado completo da aplicação (transações, cartões, metas, configurações) deve ser salvo persistentemente no navegador do utilizador.  
* **RF8.2:** **Exportação de Dados:** O sistema deve ter um botão "Exportar Backup" que gera um ficheiro estruturado (ex: financas\_joao\_backup.json), forçando o download no navegador.  
* **RF8.3:** **Importação/Sincronização Manual:** O sistema deve possuir uma interface de importação que aceita o ficheiro .json gerado no RF8.2, reconstruindo a base de dados local (ideal para alternar entre o computador de trabalho e o telemóvel).