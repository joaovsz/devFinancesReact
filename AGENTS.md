# **Repository & Agent Guidelines (System Prompt)**

**Projeto:** Sistema de Gestão Financeira Pessoal (v2.0) \- Local-First

**Objetivo:** Desenvolver um sistema focado em previsibilidade, alívio de ansiedade e baixa fricção de uso.

## **1\. Stack Tecnológica Obrigatória**

Todas as soluções propostas devem obrigatoriamente utilizar a seguinte stack:

* **Framework:** React (Vite) com TypeScript.  
* **Estilização:** Tailwind CSS (utilize classes utilitárias para tudo, evite CSS customizado).  
* **UI & Animações:** **Magic UI** (junto com Framer Motion e Lucide React para ícones).  
* **Estado Global:** Zustand (substituindo o antigo Redux Toolkit).  
* **Persistência de Dados:** IndexedDB (via localforage ou idb) ou localStorage (substituindo o redux-persist).  
* **Roteamento:** React Router DOM (priorizando layout Single Page Dashboard).

## **2\. Regras de Arquitetura (Local-First)**

* **SEM BACKEND:** Este aplicativo é 100% Client-Side. Não sugira implementações com Node.js, Firebase, ou bancos em nuvem.  
* **Privacidade:** Todos os dados (transações, cartões) devem viver exclusivamente no navegador do usuário.  
* **Portabilidade:** Implemente exportação/importação de dados via arquivos .json estruturados.

## **3\. Project Structure & Module Organization**

A estrutura do repositório (devfinances) deve ser reorganizada para a nova stack:

* src/main.tsx: App bootstrap e inicialização de temas.  
* src/App.tsx: Composição da tela principal (Dashboard).  
* src/components/: Componentes UI modulares (separados por domínio: /transactions, /cards, /ui para os do Magic UI).  
* src/store/: Gerenciamento de estado com Zustand (ex: useTransactionStore.ts).  
* src/types/: Tipagens TypeScript compartilhadas.  
* src/utils/: Funções utilitárias (cálculo de parcelas, feriados, formatação monetária).  
* src/styles/: Apenas o global.css com as diretivas do Tailwind. Remova pastas de CSS por componente.

## **4\. Regras de Interface, UX e Design System (Frictionless)**

O sistema deve minimizar o uso do teclado numérico e promover calma:

* **Paleta de Cores (Calm Developer Theme via Tailwind):**  
  * *Backgrounds (Dark Mode):* bg-zinc-950 (fundo principal), bg-zinc-900 (cards/bento), border-zinc-800 (bordas).  
  * *Primária:* indigo-500 a indigo-400 (ações neutras).  
  * *Positivo/Entradas:* emerald-500 (calmo, fluído).  
  * *Negativo/Saídas:* rose-500 (alerta suave, não causa ansiedade como o vermelho puro).  
  * *Atenção:* amber-500 (limites próximos).  
* **Interações Point-and-Click:** Use *Quick Chips* (+R$ 10, \+R$ 50), Sliders e um *Virtual Numpad* React para entradas de dados.  
* **Componentes Magic UI:** Use *Bento Grid* para organizar os painéis e *Animated Progress Bars* para limites de cartões (mudando de cor dinamicamente: Emerald \-\> Amber \-\> Rose).

## **5\. Lógicas de Negócio Críticas (Atenção do Agente)**

1. **Faturas de Cartão:** A despesa afeta o limite instantaneamente, mas só impacta o fluxo de caixa no mês de vencimento.  
2. **Parcelamentos:** Motor iterativo (se é 3/5 em Março, aparece como 4/5 em Abril e some em Junho).  
3. **Dias Úteis (Faturamento PJ):** Crie hook/função que consulte a BrasilAPI (https://brasilapi.com.br/api/feriados/v1/{ano}) para abater feriados em dias de semana do cálculo de faturamento (Valor Hora \* Horas/Dia \* Dias Úteis).

## **6\. Coding Style & Naming Conventions**

* Language: TypeScript (strict: true em tsconfig.json).  
* Indentation: 2 spaces.  
* Components/types: PascalCase (Transactions.tsx, Transaction.ts).  
* Variables/functions: camelCase.  
* Stores (Zustand): use\[Domain\]Store.ts (ex: useTransactionStore.ts).

## **7\. Build, Test, and Development Commands**

Use npm scripts from package.json:

* npm run dev: starts Vite dev server.  
* npm run build: type-checks with tsc and generates production build.  
* npm run preview: serves build locally.  
  *Valide sempre as mudanças visuais com build \+ preview, focando primeiramente na lógica do Zustand e cálculos críticos.*

## **8\. Commit & Pull Request Guidelines**

* Manter commits curtos e focados (ex: Add calm theme colors, Fix installment iteration).  
* Mensagens concisas e imperativas.  
* Scope each commit to one logical change.

## **9\. Agent-Specific Notes**

* Ao gerar código, forneça componentes completos e auto-suficientes que possam ser colados diretamente no projeto.  
* If using Codex CLI workflows, prefix shell commands with rtk (per local instruction).