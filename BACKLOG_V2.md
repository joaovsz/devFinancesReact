# Backlog Técnico - Sistema Financeiro v2.0

## Objetivo
Transformar o app atual (livro-caixa) em um sistema de previsibilidade financeira local-first, conforme `Requisitos Sistema Financeiro.md` e regras do `AGENTS.md`.

## Ordem de Execução (Sprints)
1. Sprint 0: Fundação técnica e migração de stack.
2. Sprint 1: Categorias, tags e cartões.
3. Sprint 2: Parcelamentos, recorrências e projeção mensal.
4. Sprint 3: Metas (baldes), faturamento PJ e UX frictionless.
5. Sprint 4: Portabilidade, hardening e testes críticos.

## EPIC 0 - Fundação e Migração
### Issue 0.1 - Migrar Redux para Zustand
- Escopo: substituir `src/components/redux/*` por `src/store/*`.
- Tarefas:
  - Criar `useTransactionStore.ts` com ações de CRUD.
  - Migrar componentes que usam `useSelector/useDispatch`.
  - Remover dependências Redux e persist legado.
- Aceite:
  - App sem Redux Toolkit e sem `redux-persist`.
  - Estado funcional com Zustand.

### Issue 0.2 - Persistência local-first
- Escopo: persistência em IndexedDB (`idb`/`localforage`) com fallback localStorage.
- Tarefas:
  - Criar `src/store/persistence.ts` com `save/load`.
  - Versionar schema (`stateVersion`) e migrações.
- Aceite:
  - Recarregar página mantém estado completo.
  - Migração de versão não quebra dados.

### Issue 0.3 - Tailwind + base visual
- Escopo: adotar Tailwind e remover CSS por componente.
- Tarefas:
  - Configurar Tailwind no Vite.
  - Manter apenas `src/styles/global.css` com diretivas Tailwind.
  - Aplicar paleta calm developer (`zinc`, `indigo`, `emerald`, `rose`, `amber`).
- Aceite:
  - Build sem regressão visual crítica.
  - Sem dependência de `src/styles/*` por componente.

## EPIC 1 - RF1 + RF2 (Categorias/Tags e Cartões)
### Issue 1.1 - Modelo de categorias e tags
- Criar tipos em `src/types/finance.ts`: `Category`, `Subcategory`, `Tag`.
- Seed de árvore padrão (Rendas, Moradia, Alimentação etc.).
- Vincular transação a categoria/subcategoria e tags.
- Aceite: cadastro e filtro funcionando por categoria e tag.

### Issue 1.2 - Gestão de múltiplos cartões
- Modelo `CreditCard` com limite total, fechamento e vencimento.
- Vincular despesas de crédito obrigatoriamente a um cartão.
- Aceite: validação bloqueia despesa de crédito sem cartão.

### Issue 1.3 - Fatura consolidada e barras de limite
- Tela com soma de faturas do mês.
- Barra por cartão com faixas:
  - < 60%: `emerald`
  - 60-85%: `amber`
  - > 85%: `rose`
- Aceite: limite disponível calculado dinamicamente.

## EPIC 2 - RF3 + RF4 (Parcelas, Recorrência e Projeção)
### Issue 2.1 - Motor de recorrências e parcelamentos
- Tipos: `RecurringExpense`, `InstallmentPlan`.
- Implementar iterador mensal de parcelas (X/Y -> X+1/Y).
- Aceite: parcela desaparece automaticamente ao finalizar.

### Issue 2.2 - Projeção de fluxo de caixa mês a mês
- Criar `src/utils/projection.ts`.
- Fórmula oficial:
  - `saldoProjetado + faturamentoPJ - custosFixos - parcelasAtivas`.
- Aceite: visão por mês com "Sobra Líquida Estimada".

## EPIC 3 - RF5 + RF6 + RF7 (Metas, PJ e Frictionless UX)
### Issue 3.1 - Metas e baldes
- Modelo `GoalBucket` (alvo, prazo, valor alocado).
- Exibir saldo total vs saldo livre.
- Aceite: barra de progresso por meta + impacto no saldo livre.

### Issue 3.2 - Motor de faturamento PJ com dias úteis
- Modelo `ContractConfig` (valor/hora, horas/dia).
- Integração BrasilAPI: `/api/feriados/v1/{ano}`.
- Aceite: faturamento mensal estimado injetado na projeção.

### Issue 3.3 - UI frictionless
- Quick Chips (`+10`, `+50`, `+100`), Virtual Numpad e Slider.
- Grid clicável para categoria/cartão/tags.
- Atalhos globais de teclado (power user).
- Aceite: inclusão de transação sem digitação livre obrigatória.

## EPIC 4 - RF8 + Qualidade
### Issue 4.1 - Exportar/importar backup JSON
- Botões "Exportar Backup" e "Importar Backup".
- Validar schema e versão ao importar.
- Aceite: restauração completa em outro navegador/dispositivo.

### Issue 4.2 - Testes de regras críticas
- Priorizar testes para:
  - cálculo de limite/fatura;
  - iteração de parcelamentos;
  - projeção mensal;
  - cálculo de dias úteis.
- Aceite: suíte mínima cobrindo fluxos financeiros críticos.

## Definição de Pronto (DoD)
- `npm run build` sem erros.
- Fluxo principal validado em `npm run preview`.
- Estado persistido após reload.
- Sem backend e sem dependência de nuvem para funcionamento principal.
