# MEMORIAL DESCRITIVO DE ATIVIDADES PRÁTICAS — PROJETO DE SOFTWARE
### VALIDAÇÃO DE ATIVIDADES COMPLEMENTARES / ATIVIDADES ACADÊMICAS EXTRAORDINÁRIAS

---

### IDENTIFICAÇÃO DO REQUERENTE E DO PROJETO

* **Aluno:** João Vitor Pereira de Souza  
* **Matrícula:** 70636043177  
* **Instituição de Ensino Superior (IES):** Instituto Infnet Rio de Janeiro (Código MEC: 3998)  
* **Curso:** Bacharelado em Engenharia de Software (Modalidade Live)  
* **Semestre / Situação:** Último Trimestre / Formando (2026)  
* **Situação Curricular (Histórico Escolar):**  
  * *Atividades Complementares Exigidas:* 240 horas  
  * *Atividades Complementares Realizadas:* 198 horas  
  * *Carga Horária Remanescente para Integralização:* **42 horas**  
* **Projeto Técnico Apresentado:** Swift Finances (v2.0) — Sistema de Gestão e Previsibilidade Financeira  
* **Aplicação Publicada em Produção (Netlify):** [https://devfinances-jvsz.netlify.app/](https://devfinances-jvsz.netlify.app/)  
* **Repositório do Código-Fonte (GitHub):** [https://github.com/joaovsz/devFinancesReact](https://github.com/joaovsz/devFinancesReact)  
* **Carga Horária Pleiteada:** 100 horas complementares *(ou o saldo integral de 42h para quitação curricular)*  

---

### 1. OBJETIVO DA SOLICITAÇÃO

O presente memorial descritivo submete à apreciação da Coordenação e do Colegiado do Curso de Bacharelado em Engenharia de Software do **Instituto Infnet** as evidências de esforço técnico, rigor metodológico e aplicação prática de competências curriculares consolidadas no desenvolvimento do ecossistema computacional **Swift Finances**.

A atividade consistiu no ciclo completo de engenharia de software: elicitação de requisitos, modelagem arquitetural orientada a domínio, codificação reativa com tipagem estrita, implementação de testes automatizados, modelagem de banco de dados relacional com segurança em nível de linha (RLS) e implantação contínua (CI/CD) em ambiente de produção em nuvem.

O projeto foi executado de forma incremental e contínua ao longo de todo o período formativo, registrando **110 commits no Git distribuídos entre julho de 2022 e setembro de 2026**, refletindo a evolução técnica e maturidade adquirida nas disciplinas formadoras do curso.

Conforme registrado no Histórico Escolar oficial da IES, restam apenas **42 horas** de atividades complementares para a integralização curricular plena do curso de Bacharelado em Engenharia de Software. O presente trabalho atesta um esforço efetivo superior a 100 horas técnicas de engenharia, constituindo subsídio farto para o deferimento das horas necessárias para a formatura.

---

### 2. DIRETRIZES DE ACESSO, AUDITORIA TÉCNICA E PRIVACIDADE DO REPOSITÓRIO

O código-fonte do projeto encontra-se hospedado no GitHub no repositório `https://github.com/joaovsz/devFinancesReact`. Em virtude de deliberações de proteção à propriedade intelectual e direitos de exploração comercial do ecossistema, o repositório pode ser mantido sob regime de visibilidade privada/restrita.

Para garantir transparência absoluta e assegurar a auditoria irrestrita pelo corpo docente e pela banca avaliadora, são disponibilizadas cinco modalidades formais de verificação:

1. **Acesso Direto como Colaborador de Leitura (GitHub):**  
   Acesso imediato de leitura concedido a qualquer professor avaliador ou membro da coordenação mediante fornecimento de seu nome de usuário do GitHub (solicitar através do perfil `@joaovsz` ou e-mail institucional).
2. **Auditoria em Produção (Live Cloud Application):**  
   O sistema está 100% publicado, ativo e operacional na nuvem no endereço oficial [https://devfinances-jvsz.netlify.app/](https://devfinances-jvsz.netlify.app/), permitindo a experimentação prática de todas as regras de negócio, persistência local e interface de ponta a ponta sem necessidade de instalação local.
3. **Pacote Autocontido de Código-Fonte (.ZIP Anexo):**  
   Disponibilização de arquivo compactado contendo o código-fonte integral, testes, documentação e diagramas estruturais para inspeção offline no momento do protocolo acadêmico.
4. **Defesa Técnica em Vídeo (3 a 5 minutos):**  
   Apresentação audiovisual detalhada demonstrando o código-fonte interno no editor, a arquitetura em camadas, a execução ao vivo dos **82 testes unitários** no terminal e a navegação no sistema em produção.
5. **Memorial Descritivo e Diagramas Vetoriais:**  
   Documentação técnica completa e diagramas vetoriais SVG de arquitetura e modelo de dados (DER) anexados a este memorial.

---

### 3. ALINHAMENTO CURRICULAR: VINCULAÇÃO COM O HISTÓRICO ESCOLAR (INSTITUTO INFNET)

O desenvolvimento do **Swift Finances** não constituiu uma codificação isolada, mas sim a aplicação empírica direta dos conhecimentos adquiridos nos blocos acadêmicos do curso de Engenharia de Software do Instituto Infnet:

| Bloco Temático (Infnet) | Disciplina Cursada (Código / Período) | Desempenho no Histórico | Aplicação Concreta e Evidência no Swift Finances |
| :--- | :--- | :---: | :--- |
| **Engenharia Disciplinada de Softwares** | **Engenharia de Testes de Software**<br>`GRLEDS02BGM1` (25E4) | **Grau: 85 (AP)** | Implementação de suíte com **82 testes unitários automatizados** com **Vitest** em 12 arquivos de teste (`src/**/*.test.ts`), validando deterministicamente regras de negócio, conciliação e fluxos críticos. |
| **Engenharia Disciplinada de Softwares** | **Engenharia de Software: Clean Code e Boas Práticas**<br>`GRLEDS02BGM2` (25E4) | **Grau: 100 (AP)** | Aplicação de princípios SOLID, separação em camadas, tipagem estrita com TypeScript (`strict: true`), ausência de dívida técnica, código autoexplicativo e modular sem acoplamento a UI. |
| **Engenharia Disciplinada de Softwares** | **Pipelines de CI/CD e DevOps**<br>`GRLEDS02BGM3` (26E1) | **Grau: 100 (AP)** | Pipeline de integração e entrega contínua (CI/CD) no Netlify com gatilho automático via GitHub, type-checking no pipeline (`tsc`), empacotamento com Vite e distribuição via CDN Edge global com HTTPS. |
| **Engenharia Disciplinada de Softwares** | **Engenharia de Software: Refatoração**<br>`GRLEDS02BGM4` (26E1) | **Grau: 75 (AP)** | Refatoração arquitetural contínua comprovada pelo histórico de 110 commits: migração do legado JavaScript/Redux para TypeScript estrito, React 19 e Zustand, desacoplando o núcleo de domínio (`src/utils/domain/`). |
| **Engenharia Disciplinada de Softwares** | **Projeto de Bloco: Engenharia Disciplinada de Softwares**<br>`GRLEDS01BGM5` (26E1) | **Grau: 100 (AP)** | Aplicação do ciclo de vida formal, gestão de repositório, boas práticas de versionamento semântico e documentação como código (*Doc-as-Code*) com `BACKLOG_V2.md`. |
| **Desenvolvimento Front-end com Frameworks** | **Desenvolvimento Web com React**<br>`GRLEDS01BFR4` (24E3)<br>**Fundamentos de React**<br>`GRLEDS01BFR2` (24E2) | **Grau: 75 (AP)**<br><br>**Grau: 88 (AP)** | SPA reativa desenvolvida em **React 19**, componentização modular, gerenciamento de estado global atômico via **Zustand** (`useTransactionStore`, `useGoalStore`) e custom hooks reativos. |
| **Desenvolvimento Front-end com Frameworks** | **Mobile-first UI com React**<br>`GRLEDS01BFR1` (26E3) | *(Cursando)* | Interface 100% responsiva, layout Bento Grid adaptável, painel numérico virtual (*Virtual Numpad*) e interações voltadas à filosofia *Calm Developer* (redução de carga cognitiva e ansiedade). |
| **Processamento de Dados** | **Fundamentos de Modelagem Relacional e SQL**<br>`GRLEDC02BFU3` (23E3)<br>**Visualização de Dados e Introdução a SQL**<br>`GRLEDC02BFU1` (23E2) | **Grau: 100 (AP)**<br><br>**Grau: 100 (AP)** | Modelagem relacional do banco de dados (`supabase-schema.sql`) em PostgreSQL com DDL estruturado, integridade referencial, Row Level Security (RLS) e gráficos analíticos interativos com **Apache ECharts**. |
| **Ciência da Computação** | **Velocidade e Qualidade com Estruturas de Dados e Algoritmos**<br>`GRLEDS01BCI1` (24E4)<br>**Estruturas de Dados e Algoritmos Avançados**<br>`GRLEDS01BCI3` (25E1) | **Grau: 100 (AP)**<br><br>**Grau: 100 (AP)** | Algoritmos de complexidade temporal $O(n)$ para projeção orçamentária prospectiva, motor de parcelamento progressivo (extinção determinística), conciliação cronológica e agregação de despesas por competência. |
| **Fundamentos do Desenvolvimento de Software** | **Programação Web com HTML 5 e CSS 3**<br>`GRLSOF00BSF1` (22E4)<br>**Interatividade em Páginas Web**<br>`GRLSOF00BSF3` (23E1) | **Grau: 100 (AP)**<br><br>**Grau: 75 (AP)** | Semântica acessível, micro-interações fluidas com **Framer Motion**, estilização utilitária de ponta a ponta com **Tailwind CSS** e persistência reativa no cliente. |
| **Engenharia de Softwares Escaláveis** | **Design Patterns e Domain-Driven Design (DDD)**<br>`ESFE01-L2` (26E2) | *(Em andamento)* | Adoção prática de DDD com separação do núcleo de domínio financeiro (`src/utils/domain/creditCards.ts`, `projections.ts`), mantendo entidades e cálculos contábeis isolados de frameworks de UI. |

---

### 4. ARQUITETURA E MODELAGEM DE DADOS DO SISTEMA

A arquitetura do sistema adota uma estrutura em camadas voltada para aplicações *Client-Side Local-First* com persistência híbrida e sincronização segura em nuvem:

* **Camada de Apresentação (UI/UX):** React 19, Tailwind CSS, componentes interativos Magic UI, Framer Motion e gráficos analíticos de alta performance com Apache ECharts.
* **Camada de Estado Global:** Zustand (`useTransactionStore`, `useGoalStore`) e validação estrita de esquemas em tempo de execução via Zod.
* **Núcleo de Domínio Financeiro Puro:** Módulos de cálculo `creditCards.ts`, `projections.ts`, `monthly-payments.ts`, `business-days.ts` e `goalProjections.ts`.
* **Persistência Híbrida & Integrações:** Armazenamento local-first resiliente (offline), sincronizador cloud Supabase (PostgreSQL + RLS) e integração com a BrasilAPI para dedução de feriados bancários em dias úteis.

> *Os diagramas vetoriais completos de Arquitetura e Entidade-Relacionamento encontram-se disponíveis no repositório na pasta `docs/diagrams/` (`architecture.svg` e `database-er.svg`).*

---

### 5. QUADRO DE APROPRIAÇÃO DE HORAS E MATERIALIDADE (100h)

Para fins de auditoria e aferição quantitativa/qualitativa pelo corpo docente, a carga horária demandada encontra-se decomposta nas etapas abaixo:

| Etapa Técnica de Engenharia de Software | Horas | Descrição das Atividades Executadas | Evidências Auditáveis no Repositório / Produção |
| :--- | :---: | :--- | :--- |
| **I. Engenharia de Requisitos & Planejamento Ágil** | 15h | Levantamento de escopo, especificação de requisitos funcionais e não funcionais, elaboração de User Stories com critérios de aceitação e organização das Sprints 0 a 4 via *Doc-as-Code*. | Arquivos `BACKLOG_V2.md` e `Requisitos Sistema Financeiro (2).md`. |
| **II. Arquitetura de Software & Modelagem de Dados** | 15h | Desenho da arquitetura em camadas, separação do núcleo de domínio, modelagem de tipos em TypeScript estrito e DDL PostgreSQL com RLS. | Diagramas SVG em `docs/diagrams/`, script DDL `supabase-schema.sql` e tipos em `src/types/`. |
| **III. Desenvolvimento do Domínio & Regras de Negócio** | 25h | Implementação dos motores de projeção de sobra líquida, ciclo operacional vs. vencimento de faturas, amortização de parcelamentos e dedução de dias úteis PJ. | Módulos em `src/utils/domain/` e `src/utils/projections.ts`. |
| **IV. Desenvolvimento Front-end & Design System** | 20h | Construção da interface reativa em React 19, componentes modulares Bento Grid, suporte a temas Dark/Light persistidos e visualizações com ECharts. | Componentes em `src/components/` e páginas em `src/pages/`. |
| **V. Testes Automatizados & Garantia de Qualidade** | 15h | Planejamento, codificação e execução de suíte de testes unitários com Vitest em 12 arquivos de teste e esquemas de validação de formulários com Zod. | 12 arquivos de teste em `src/**/*.test.ts` (82 testes aprovados). |
| **VI. Infraestrutura Cloud, CI/CD & Deploy Contínuo** | 10h | Configuração da pipeline de integração e entrega contínua (CI/CD) no Netlify com gatilho automático via GitHub, CDN Edge, SSL e integração REST com BrasilAPI. | Aplicação em produção em https://devfinances-jvsz.netlify.app/ e histórico de 110 commits. |
| **CARGA HORÁRIA TOTAL REQUERIDA:** | **100h** | *(Distribuída ao longo do período formativo)* | **110 commits no Git / Repositório & Produção** |

---

### 6. PRINCIPAIS DESAFIOS TÉCNICOS DE ENGENHARIA SUPERADOS

Durante o ciclo de vida do projeto, destacam-se três soluções de engenharia implementadas para contornar problemas de alta complexidade:

#### 1. Desacoplamento da Lógica Contábil vs. Ciclo de Vida da Interface
* **Problema:** Em implementações iniciais, cálculos de fatura, fechamento e limites disponíveis estavam acoplados aos componentes React (`Cards.tsx`), gerando duplicação de lógica e alto risco de inconsistências contábeis.
* **Solução:** Refatoração baseada nos princípios de responsabilidade única (SOLID). As regras foram isoladas em funções imutáveis em `src/utils/domain/creditCards.ts`, diferenciando deterministicamente: (a) o consumo de limite de crédito no ato da compra e (b) o impacto financeiro no fluxo de caixa no mês do vencimento. A robustez desse comportamento é atestada por 11 testes unitários dedicados.

#### 2. Modelagem Iterativa de Amortização Temporal
* **Problema:** Controlar planos de compras parceladas sem poluir a base de dados com dezenas de transações futuras redundantes.
* **Solução:** Algoritmo dinâmico (`getInstallmentProgress`) que calcula a parcela corrente (ex: 3/5) a partir do mês de competência da compra e extingue deterministicamente o compromisso da projeção de fluxo de caixa no mês subsequente à quitação integral.

#### 3. Sincronização Local-First com Isolamento Criptográfico e RLS
* **Problema:** Oferecer latência zero de resposta (operações locais no navegador) sem abrir mão de backup seguro e sincronização multi-dispositivo.
* **Solução:** Arquitetura híbrida: dados operam no cliente via Zustand com persistência local, enquanto sincronizações assíncronas enviam snapshots validados diretamente por políticas de **Row Level Security (RLS)** no PostgreSQL. Para evitar *race conditions* entre dispositivos simultâneos, foi implementada a Stored Procedure `append_transaction_to_state` com bloqueio pessimista (`FOR UPDATE`).

---

### 7. EVIDÊNCIAS DE PRODUÇÃO E DEFESA TÉCNICA EM VÍDEO

Em atendimento aos requisitos de materialidade e auditoria acadêmica, disponibilizam-se os canais de verificação:

* **Aplicação Publicada em Produção (Netlify):**  
  [https://devfinances-jvsz.netlify.app/](https://devfinances-jvsz.netlify.app/)
* **Repositório do Código-Fonte (GitHub):**  
  [https://github.com/joaovsz/devFinancesReact](https://github.com/joaovsz/devFinancesReact) *(acesso de colaborador liberado à banca mediante fornecimento de usuário)*
* **Vídeo de Defesa Técnica:**  
  [Inserir URL do Vídeo no YouTube - Não Listado] *(Duração estimada: ~04m30s)*  
  *Conteúdo do vídeo: demonstração da aplicação em produção, arquitetura de software, alinhamento com as disciplinas da graduação no Infnet, inspeção do núcleo de domínio desacoplado e execução ao vivo dos 82 testes no terminal.*

---

### 8. DECLARAÇÃO DE AUTORIA E INTEGRIDADE ACADÊMICA

Declaro para os devidos fins de comprovação acadêmica perante a Coordenação do Curso de Bacharelado em Engenharia de Software do **Instituto Infnet** que:

1. O projeto **Swift Finances** e todo o código-fonte disponibilizado no repositório supracitado é de minha integral e legítima autoria intelectual, tendo sido desenvolvido e aprimorado ao longo de meu período formativo de graduação (2022-2026).
2. Todas as dependências, bibliotecas e componentes de terceiros foram integrados sob conformidade com suas respectivas licenças de software livre (MIT e Apache 2.0).
3. A aplicação encontra-se acessível publicamente na internet e seu ambiente pode ser reproduzido fielmente a partir das instruções descritas no `README.md`.
4. Coloco-me à inteira disposição do corpo docente e da banca avaliadora para quaisquer esclarecimentos, concessão de acesso ao repositório, demonstrações presenciais ou arguições técnicas sobre o código e as decisões arquiteturais adotadas.

Nestes termos, solicito o deferimento e o cômputo das **100 horas complementares** requeridas (ou a atribuição das **42 horas remanescentes** necessárias para a integralização curricular de meu curso).

Goiânia - GO, 24 de Setembro de 2026.

<br><br>
__________________________________________________________________  
**João Vitor Pereira de Souza**  
Matrícula: 70636043177  
Graduando em Engenharia de Software — Instituto Infnet
