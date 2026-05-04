# Plano de Acao: Desacoplar Dominio Financeiro, Modernizar React e Formularios

## Resumo

Este plano guia a migracao incremental do app para React 19.2, React Compiler, formularios tipados e um dominio financeiro puro para cartoes, faturas, parcelamentos e projecoes.

Regras mantidas:

- App 100% client-side/local-first.
- Persistencia local e import/export JSON preservados.
- Cartao afeta limite no momento da compra, mas afeta fluxo de caixa no mes de vencimento da fatura.
- "Fatura de maio" significa fatura operacional dos gastos do ciclo de maio, ainda que o vencimento financeiro seja em junho.

## Status Geral

- [x] Remover `eslint-config-airbnb` e plugins acoplados (`eslint-plugin-import`, `eslint-plugin-jsx-a11y`, `eslint-plugin-react`).
- [x] Remover `package-lock.json` antigo e `node_modules`.
- [x] Atualizar `package.json` com React 19, React DOM 19, tipos React 19, Vite atual, TypeScript atual, ESLint 9, React Compiler, Vitest, `react-hook-form` e `zod`.
- [x] Reinstalar dependencias do zero e gerar novo lock limpo com `npm install`.
- [x] Criar modulo puro de dominio para cartoes/faturas em `src/utils/domain/creditCards.ts`.
- [x] Mover calculos de resumo de cartao, fatura, limite usado, limite disponivel e itens planejados para o modulo de dominio.
- [x] Atualizar `Cards.tsx` para consumir o modulo de dominio em vez de duplicar regra de fatura.
- [x] Atualizar `CardInvoiceModal.tsx` para calcular ajuste manual como diferenca contra o total calculado.
- [x] Corrigir edicao de ajuste manual em `Transactions.tsx` para permitir ajuste negativo.
- [ ] Configurar React Compiler no `vite.config.ts`.
- [ ] Adicionar configuracao moderna de ESLint compatível com React Compiler/React Hooks.
- [ ] Adicionar schemas `zod` para transacao, cartao, gasto fixo, parcelamento, ajuste de fatura e configuracoes.
- [ ] Migrar formularios principais para `react-hook-form` + `zod`.
- [ ] Isolar/remover dependencias de Supabase/Auth da experiencia principal local-first.
- [ ] Adicionar testes unitarios do dominio financeiro com Vitest.
- [ ] Rodar `npm run test`.
- [ ] Rodar `npm run build`.
- [ ] Rodar `npm run preview` e validar fluxos manualmente.

## Dominio Financeiro

- [x] Centralizar regra de fatura operacional, fatura lancada, ajuste manual e limite em `src/utils/domain/creditCards.ts`.
- [x] Ajuste manual passa a representar diferenca contra o total calculado, nao uma despesa extra.
- [x] Ajuste negativo passa a ser permitido na edicao pela tabela de transacoes.
- [x] Pagamento de fatura ja e tratado como mudanca de estado no store, sem criar lancamento de saida.
- [x] Historico visual de parcela usa numeracao cronologica via `getInstallmentProgress`.
- [ ] Cobrir comportamento com testes automatizados.
- [ ] Revisar outros componentes/paginas para remover qualquer duplicacao remanescente de regra financeira.

## Modernizacao React

- [x] Declarar React 19.2 e React DOM 19.2 no `package.json`.
- [x] Declarar `@types/react` e `@types/react-dom` 19 no `package.json`.
- [x] Declarar Vite, plugin React e TypeScript atuais no `package.json`.
- [x] Declarar `babel-plugin-react-compiler` no `package.json`.
- [ ] Configurar o compiler no Vite.
- [ ] Atualizar/remover `useMemo`, `useCallback` e memoizacoes manuais apenas depois dos testes passarem.

## Formularios

- [x] Declarar `react-hook-form` e `zod` no `package.json`.
- [ ] Criar pasta de schemas de formularios.
- [ ] Migrar `TransactionForm.tsx`.
- [ ] Migrar formularios de cartao em `Cards.tsx`.
- [ ] Migrar formularios de planejamento em `PlanningPage.tsx`.
- [ ] Manter chips rapidos, numpad virtual, sliders e selects point-and-click.

## Testes Obrigatorios

- [ ] Nubank fecha dia 26: transacao em 27/04 lancada em 01/05 entra na fatura operacional de maio, vencendo em junho.
- [ ] Mercado Pago fecha dia 09 e vence dia 15: gasto fixo com cobranca em 15/05 entra na fatura de maio, nao na de abril.
- [ ] Ajuste manual de R$ 807 com base calculada de R$ 250 persiste ajuste de R$ 557.
- [ ] Ajuste negativo e permitido quando o total real da fatura for menor que o calculado.
- [ ] Marcar fatura como paga nao muda Saldo Total nem Saidas.
- [ ] Fatura paga libera limite, mas nao altera a linha do tempo exibida das parcelas.
- [ ] Transacoes mostra somente itens do Mes Operacional ativo.
- [ ] Parcelamentos antigos sem `chargeDay` continuam aparecendo no mes correto via fallback.

## Comandos de Validacao

- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run preview`

## Referencias Oficiais

- React latest: 19.2: https://react.dev/versions
- React Compiler: https://react.dev/learn/react-compiler
- Instalacao Vite do Compiler: https://react.dev/learn/react-compiler/installation
- Form Actions / `useActionState`: https://react.dev/reference/react/useActionState
- `useFormStatus`: https://react.dev/reference/react-dom/hooks/useFormStatus
