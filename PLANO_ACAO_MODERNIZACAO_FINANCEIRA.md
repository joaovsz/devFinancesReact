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
- [x] Configurar React Compiler no `vite.config.ts`.
- [x] Adicionar configuracao moderna de ESLint compatível com React Compiler/React Hooks.
- [x] Adicionar schemas `zod` para transacao, cartao, gasto fixo, parcelamento, ajuste de fatura e configuracoes.
- [ ] Migrar formularios principais para `react-hook-form` + `zod`.
- [ ] Isolar/remover dependencias de Supabase/Auth da experiencia principal local-first.
- [x] Adicionar testes unitarios do dominio financeiro com Vitest.
- [x] Rodar `npm run test`.
- [x] Rodar `npm run build`.
- [ ] Rodar `npm run preview` e validar fluxos manualmente.

## Dominio Financeiro

- [x] Centralizar regra de fatura operacional, fatura lancada, ajuste manual e limite em `src/utils/domain/creditCards.ts`.
- [x] Ajuste manual passa a representar diferenca contra o total calculado, nao uma despesa extra.
- [x] Ajuste negativo passa a ser permitido na edicao pela tabela de transacoes.
- [x] Pagamento de fatura ja e tratado como mudanca de estado no store, sem criar lancamento de saida.
- [x] Historico visual de parcela usa numeracao cronologica via `getInstallmentProgress`.
- [x] Cobrir comportamento com testes automatizados.
- [ ] Revisar outros componentes/paginas para remover qualquer duplicacao remanescente de regra financeira.

## Modernizacao React

- [x] Declarar React 19.2 e React DOM 19.2 no `package.json`.
- [x] Declarar `@types/react` e `@types/react-dom` 19 no `package.json`.
- [x] Declarar Vite, plugin React e TypeScript atuais no `package.json`.
- [x] Declarar `babel-plugin-react-compiler` no `package.json`.
- [x] Configurar o compiler no Vite.
- [ ] Atualizar/remover `useMemo`, `useCallback` e memoizacoes manuais apenas depois dos testes passarem.

## Formularios

- [x] Declarar `react-hook-form` e `zod` no `package.json`.
- [x] Criar pasta de schemas de formularios.
- [ ] Migrar `TransactionForm.tsx`.
- [ ] Migrar formularios de cartao em `Cards.tsx`.
- [ ] Migrar formularios de planejamento em `PlanningPage.tsx`.
- [ ] Manter chips rapidos, numpad virtual, sliders e selects point-and-click.

## Testes Obrigatorios

- [x] Nubank fecha dia 26: transacao em 27/04 lancada em 01/05 entra na fatura operacional de maio, vencendo em junho.
- [x] Mercado Pago fecha dia 09 e vence dia 15: gasto fixo com cobranca em 15/05 entra na fatura de maio, nao na de abril.
- [x] Ajuste manual de R$ 807 com base calculada de R$ 250 persiste ajuste de R$ 557.
- [x] Ajuste negativo e permitido quando o total real da fatura for menor que o calculado.
- [ ] Marcar fatura como paga nao muda Saldo Total nem Saidas.
- [x] Fatura paga libera limite, mas nao altera a linha do tempo exibida das parcelas.
- [ ] Transacoes mostra somente itens do Mes Operacional ativo.
- [x] Parcelamentos antigos sem `chargeDay` continuam aparecendo no mes correto via fallback.

## Comandos de Validacao

- [x] `npm run test`
- [x] `npm run build`
- [ ] `npm run preview`

## Fases de Execucao

### Fase 1: Tooling e Base de Qualidade

Objetivo: fechar a infraestrutura minima para conseguir migrar com seguranca.

- [x] Configurar React Compiler em `vite.config.ts`.
- [x] Criar `eslint.config.js` ou `eslint.config.mjs` no formato flat config do ESLint 9.
- [x] Habilitar regras de hooks e compatibilidade com React Compiler.
- [ ] Garantir `tsconfig.json` com `strict: true` e sem afrouxamentos novos.
- [x] Criar setup basico do Vitest com `jsdom` para testes de dominio.

Critério de saida da fase:

- [x] `npm run build` compila.
- [x] `npm run test` executa ao menos a suite inicial do dominio.
- [ ] Nenhum arquivo novo reintroduz regra duplicada de cartao/fatura fora do modulo de dominio.

### Fase 2: Tipagem e Schemas

Objetivo: criar uma fronteira unica de validacao para entrada de dados.

- [ ] Criar `src/types/forms.ts` se necessario para tipos de input/output dos formularios.
- [x] Criar `src/schemas/transaction.ts`.
- [x] Criar `src/schemas/card.ts`.
- [x] Criar `src/schemas/fixed-expense.ts`.
- [x] Criar `src/schemas/installment.ts`.
- [x] Criar `src/schemas/invoice-adjustment.ts`.
- [x] Criar `src/schemas/settings.ts`.
- [ ] Exportar schemas por um barrel simples apenas se isso reduzir imports repetidos sem esconder responsabilidade.

Critério de saida da fase:

- [ ] Toda gravacao de transacao e cartao passa por `zod`.
- [ ] Conversoes de moeda, parcela, datas e dias de cobranca ficam normalizadas em um ponto unico.

### Fase 3: Migracao de Formularios

Objetivo: reduzir estado manual espalhado, melhorar validacao e manter UX point-and-click.

- [ ] Migrar `src/components/transactions/TransactionForm.tsx` para `react-hook-form` + `zod`.
- [ ] Migrar formularios internos de `src/components/Cards.tsx`.
- [ ] Avaliar quebra de responsabilidade em `Cards.tsx`; se necessario, extrair formularios para `src/components/cards/`.
- [ ] Migrar entradas de `src/pages/PlanningPage.tsx`.
- [ ] Preservar chips rapidos, sliders e numpad virtual como adaptadores controlados do `react-hook-form`.
- [ ] Garantir mensagens de erro curtas, calmas e acionaveis.

Critério de saida da fase:

- [ ] Nenhum formulario principal depende de cascata manual de `useState` para cada campo.
- [ ] Validacoes de valor, data, recorrencia, parcela e cartao acontecem antes de persistir no store.

### Fase 4: Isolamento Local-First

Objetivo: tornar a experiencia principal independente de autenticacao e sincronizacao remota.

- [ ] Mapear todos os pontos de acoplamento com Supabase:
- [ ] `src/context/AuthContext.tsx`
- [ ] `src/components/auth/LoginPage.tsx`
- [ ] `src/hooks/useSupabaseSync.ts`
- [ ] `src/services/supabase-sync.ts`
- [ ] `src/lib/supabase.ts`
- [ ] `src/pages/SettingsPage.tsx`
- [ ] Definir se o modo remoto sera removido do fluxo principal ou escondido atras de feature flag local.
- [ ] Garantir boot da aplicacao sem dependencia de sessao, token ou variavel externa.
- [ ] Preservar import/export JSON como estrategia oficial de portabilidade.

Critério de saida da fase:

- [ ] Usuario consegue usar o app do zero sem login.
- [ ] Nenhuma tela principal quebra quando Supabase nao estiver configurado.
- [ ] Fluxo de configuracao remota, se mantido, passa a ser opcional e desacoplado.

### Fase 5: Cobertura de Regra Financeira

Objetivo: travar comportamento sensivel antes de otimizar UI.

- [x] Criar `src/utils/domain/creditCards.test.ts`.
- [x] Criar fixtures pequenas e legiveis para:
- [x] compra a vista no credito
- [ ] compra parcelada atravessando meses
- [x] cartao com fechamento diferente do vencimento
- [x] ajuste manual positivo e negativo
- [ ] pagamento de fatura
- [ ] Escrever testes para todos os cenarios listados em "Testes Obrigatorios".
- [x] Adicionar testes para fallback de `chargeDay` ausente.
- [ ] Adicionar testes de nao-regressao para liberacao de limite versus fluxo de caixa.

Critério de saida da fase:

- [ ] A suite de dominio cobre as regras que hoje sustentam `Cards`, `Transactions` e projecoes.
- [ ] Toda correcao futura de cartao/fatura passa primeiro por teste.

### Fase 6: Limpeza e Otimizacao React

Objetivo: simplificar o codigo depois que a seguranca funcional estiver estabelecida.

- [ ] Revisar `useMemo` e `useCallback` em `src/components/Cards.tsx`.
- [ ] Revisar `useMemo` e derivacoes em `src/components/Transactions.tsx`.
- [ ] Remover memoizacao manual que o React Compiler possa absorver.
- [ ] Extrair blocos grandes com responsabilidade misturada em componentes menores quando isso reduzir risco de regressao.
- [ ] Evitar refactors cosmeticos sem ganho claro de manutencao.

Critério de saida da fase:

- [ ] Codigo mais curto e previsivel sem alterar regra de negocio.
- [ ] Nenhuma otimizacao e feita antes da cobertura minima do dominio.

## Mapa de Arquivos Prioritarios

Arquivos de maior impacto para a continuacao da modernizacao:

- `src/utils/domain/creditCards.ts`: fonte de verdade para ciclo de fatura, limite e ajuste manual.
- `src/components/Cards.tsx`: maior concentracao atual de comportamento de cartao e candidato a fatiamento.
- `src/components/cards/CardInvoiceModal.tsx`: validacao e UX do ajuste manual.
- `src/components/Transactions.tsx`: tabela operacional do mes, filtros e acoes de edicao/remocao.
- `src/components/transactions/TransactionForm.tsx`: primeiro formulario a migrar para `react-hook-form`.
- `src/pages/PlanningPage.tsx`: formulario e regras de planejamento que hoje merecem schema proprio.
- `src/store/useTransactionStore.ts`: fronteira de persistencia e mutacoes centrais do dominio.
- `src/utils/projections.ts`: revisar apos estabilizar cartoes para evitar divergencia entre projecao e realizado.

## Ordem Recomendada de Implementacao

Seguir esta ordem para reduzir regressao:

1. Configurar React Compiler, ESLint e Vitest.
2. Escrever testes do dominio financeiro antes de novas migracoes de UI.
3. Criar schemas `zod` alinhados aos tipos existentes.
4. Migrar `TransactionForm.tsx`.
5. Migrar formularios de cartao e planejamento.
6. Isolar o fluxo local-first e tornar Supabase opcional.
7. Revisar memoizacoes e simplificar componentes grandes.

## Critérios de Aceite por Tema

### Cartoes e Faturas

- [ ] Limite reduz no momento da compra.
- [ ] Fluxo de caixa so sente a despesa no vencimento da fatura.
- [ ] Nome operacional da fatura continua coerente com o ciclo exibido ao usuario.
- [ ] Ajuste manual edita a diferenca, nao duplica despesa.

### Parcelamentos

- [ ] Parcela aparece com progresso cronologico correto.
- [ ] Parcelas antigas continuam funcionando mesmo sem todos os metadados novos.
- [ ] Ultima parcela desaparece do mes seguinte sem lixo residual no resumo.

### Formularios

- [ ] Campos obrigatorios e formatos invalidos sao barrados antes de salvar.
- [ ] Fluxos point-and-click continuam mais rapidos que digitacao pura.
- [ ] Erros de validacao nao quebram a experiencia mobile.

### Local-First

- [ ] App sobe sem backend.
- [ ] Persistencia local continua integra apos reload.
- [ ] Importacao/exportacao JSON cobre o estado relevante do usuario.

## Riscos e Mitigacoes

- Risco: migrar formularios antes de fechar schemas aumenta retrabalho.
  Mitigacao: schemas primeiro, UI depois.
- Risco: refatorar `Cards.tsx` junto com regra financeira pode mascarar regressao.
  Mitigacao: separar em duas etapas, com testes entre elas.
- Risco: remocao brusca de Supabase quebrar telas de configuracao existentes.
  Mitigacao: primeiro tornar opcional, depois remover o que sobrar sem uso real.
- Risco: React Compiler ser introduzido com memoizacoes antigas conflitantes.
  Mitigacao: habilitar o compiler cedo, simplificar memoizacoes so depois dos testes verdes.

## Definicao de Pronto

Considerar a modernizacao desta frente concluida quando:

- [ ] Dominio financeiro estiver coberto por testes automatizados.
- [ ] Formularios principais estiverem em `react-hook-form` + `zod`.
- [ ] Experiencia principal estiver funcional sem Auth/Supabase.
- [ ] Build e testes passarem localmente.
- [ ] Preview manual confirmar os fluxos criticos de cartao, parcelas, planejamento e import/export.

## Referencias Oficiais

- React latest: 19.2: https://react.dev/versions
- React Compiler: https://react.dev/learn/react-compiler
- Instalacao Vite do Compiler: https://react.dev/learn/react-compiler/installation
- Form Actions / `useActionState`: https://react.dev/reference/react/useActionState
- `useFormStatus`: https://react.dev/reference/react-dom/hooks/useFormStatus
