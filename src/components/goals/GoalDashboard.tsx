import { SelectHTMLAttributes, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Building2, ChevronDown, Landmark, PiggyBank, Info, Target, X } from "lucide-react"
import { GoalCard } from "./GoalCard"
import { GoalModal } from "./GoalModal"
import { OverloadBanner } from "./OverloadBanner"
import {
  selectTotalGoalsSaved,
  selectTotalGoalsTarget,
  useGoalCashflowStatus,
  useGoalStore
} from "../../store/useGoalStore"
import { useTransactionStore } from "../../store/useTransactionStore"
import { Goal, GoalInput } from "../../types/goal"
import {
  formatCurrencyFromNumber,
  formatCurrencyInput,
  parseCurrencyInput
} from "../../utils/currency-input"
import { calculateGoalProgress } from "../../utils/goalProjections"

const selectClassName =
  "w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"

function SelectField(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={`${selectClassName} ${props.className || ""}`.trim()} />
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
      />
    </div>
  )
}

export const GoalDashboard = () => {
  const goals = useGoalStore((state) => state.goals)
  const totalTarget = useGoalStore(selectTotalGoalsTarget)
  const totalSaved = useGoalStore(selectTotalGoalsSaved)
  const addGoal = useGoalStore((state) => state.addGoal)
  const updateGoal = useGoalStore((state) => state.updateGoal)
  const deleteGoal = useGoalStore((state) => state.deleteGoal)
  const updateSavedAmount = useGoalStore((state) => state.updateSavedAmount)
  const bankAccounts = useTransactionStore((state) => state.bankAccounts)
  const addBankAccount = useTransactionStore((state) => state.addBankAccount)
  const updateBankAccount = useTransactionStore((state) => state.updateBankAccount)
  const removeBankAccount = useTransactionStore((state) => state.removeBankAccount)
  const allocateFromBankAccount = useTransactionStore((state) => state.allocateFromBankAccount)
  const { projectedMonthlyLeftover, totalMonthlyContribution } = useGoalCashflowStatus()
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [newAccountName, setNewAccountName] = useState("")
  const [newAccountType, setNewAccountType] = useState<"checking" | "savings" | "investment">(
    "checking"
  )
  const [newAccountBalance, setNewAccountBalance] = useState("")
  const [selectedAccountId, setSelectedAccountId] = useState("")
  const [selectedGoalId, setSelectedGoalId] = useState("")
  const [allocationAmountInput, setAllocationAmountInput] = useState("")
  const [allocationStatus, setAllocationStatus] = useState("")
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [editingAccountBalanceInput, setEditingAccountBalanceInput] = useState("")
  const [moneyFlights, setMoneyFlights] = useState<
    Array<{
      id: string
      startX: number
      startY: number
      endX: number
      endY: number
      delay: number
    }>
  >([])
  const guideButtonRef = useRef<HTMLButtonElement | null>(null)
  const allocateButtonRef = useRef<HTMLButtonElement | null>(null)
  const [guideTooltipPosition, setGuideTooltipPosition] = useState({
    top: 0,
    left: 0,
    width: 0
  })

  const overallProgress = calculateGoalProgress(totalTarget, totalSaved)
  const completedGoalsCount = useMemo(
    () =>
      goals.filter((goal) => goal.targetAmount > 0 && goal.currentSaved >= goal.targetAmount)
        .length,
    [goals]
  )
  const monthlyLeftoverLimit = Math.max(projectedMonthlyLeftover, 0)
  const totalBankAccountsBalance = useMemo(
    () => bankAccounts.reduce((sum, account) => sum + account.balance, 0),
    [bankAccounts]
  )
  const modalContributionLimit = useMemo(() => {
    const contributionWithoutEditingGoal = editingGoal
      ? totalMonthlyContribution - editingGoal.monthlyContribution
      : totalMonthlyContribution

    return Math.max(projectedMonthlyLeftover - contributionWithoutEditingGoal, 0)
  }, [editingGoal, projectedMonthlyLeftover, totalMonthlyContribution])

  useEffect(() => {
    if (!selectedAccountId && bankAccounts.length > 0) {
      setSelectedAccountId(bankAccounts[0].id)
    }
  }, [selectedAccountId, bankAccounts])

  useEffect(() => {
    if (!selectedGoalId && goals.length > 0) {
      setSelectedGoalId(goals[0].id)
    }
  }, [selectedGoalId, goals])

  function getAccountTypeLabel(type: "checking" | "savings" | "investment") {
    if (type === "checking") {
      return "Conta corrente"
    }
    if (type === "savings") {
      return "Poupança"
    }

    return "Investimento"
  }

  function getAccountTypeVisual(type: "checking" | "savings" | "investment") {
    if (type === "checking") {
      return {
        icon: Building2,
        colorClassName: "border-sky-500/40 bg-sky-500/10 text-sky-300"
      }
    }
    if (type === "savings") {
      return {
        icon: PiggyBank,
        colorClassName: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      }
    }

    return {
      icon: Landmark,
      colorClassName: "border-violet-500/40 bg-violet-500/10 text-violet-300"
    }
  }

  function handleAddBankAccount() {
    const balance = Math.max(parseCurrencyInput(newAccountBalance), 0)
    if (!newAccountName.trim() || balance <= 0) {
      return
    }

    addBankAccount({
      id: crypto.randomUUID(),
      name: newAccountName.trim(),
      type: newAccountType,
      balance
    })

    setNewAccountName("")
    setNewAccountType("checking")
    setNewAccountBalance("")
  }

  function handleAllocateFromAccountToGoal() {
    const amount = Math.max(parseCurrencyInput(allocationAmountInput), 0)
    if (!selectedAccountId || !selectedGoalId || amount <= 0) {
      setAllocationStatus("Preencha conta, meta e valor para alocar.")
      return
    }

    const selectedGoal = goals.find((goal) => goal.id === selectedGoalId)
    if (!selectedGoal) {
      setAllocationStatus("Meta selecionada não encontrada.")
      return
    }

    const hasAllocated = allocateFromBankAccount(selectedAccountId, amount)
    if (!hasAllocated) {
      setAllocationStatus("Saldo insuficiente na conta selecionada.")
      return
    }

    updateSavedAmount(selectedGoalId, selectedGoal.currentSaved + amount)
    setAllocationAmountInput("")
    setAllocationStatus("Valor alocado na meta com sucesso.")
    triggerAllocationAnimation(selectedGoalId)
  }

  function triggerAllocationAnimation(goalId: string) {
    if (typeof document === "undefined") {
      return
    }

    const sourceRect = allocateButtonRef.current?.getBoundingClientRect()
    const targetElement = document.querySelector<HTMLElement>(
      `[data-goal-card-id="${goalId}"]`
    )
    const targetRect = targetElement?.getBoundingClientRect()

    if (!sourceRect || !targetRect) {
      return
    }

    const startX = sourceRect.left + sourceRect.width * 0.5
    const startY = sourceRect.top + sourceRect.height * 0.5
    const endX = targetRect.left + targetRect.width * 0.5
    const endY = targetRect.top + 28
    const batchId = crypto.randomUUID()
    const nextFlights = Array.from({ length: 8 }).map((_, index) => ({
      id: `${batchId}-${index}`,
      startX: startX + (Math.random() * 18 - 9),
      startY: startY + (Math.random() * 12 - 6),
      endX: endX + (Math.random() * 36 - 18),
      endY: endY + (Math.random() * 24 - 12),
      delay: index * 0.05
    }))

    setMoneyFlights((current) => [...current, ...nextFlights])

    window.setTimeout(() => {
      setMoneyFlights((current) =>
        current.filter((flight) => !flight.id.startsWith(batchId))
      )
    }, 1300)
  }

  function startEditingAccountBalance(accountId: string, currentBalance: number) {
    setEditingAccountId(accountId)
    setEditingAccountBalanceInput(formatCurrencyFromNumber(currentBalance))
  }

  function cancelEditingAccountBalance() {
    setEditingAccountId(null)
    setEditingAccountBalanceInput("")
  }

  function saveEditingAccountBalance(accountId: string) {
    const account = bankAccounts.find((item) => item.id === accountId)
    if (!account) {
      cancelEditingAccountBalance()
      return
    }

    const nextBalance = Math.max(parseCurrencyInput(editingAccountBalanceInput), 0)
    updateBankAccount({
      ...account,
      balance: nextBalance
    })
    cancelEditingAccountBalance()
  }

  useEffect(() => {
    if (!isGuideOpen || typeof window === "undefined") {
      return
    }

    function updateGuideTooltipPosition() {
      if (!guideButtonRef.current) {
        return
      }

      const buttonRect = guideButtonRef.current.getBoundingClientRect()
      const tooltipWidth = Math.min(window.innerWidth * 0.92, 512)
      const horizontalPadding = 16
      const left = Math.max(
        horizontalPadding,
        Math.min(
          buttonRect.right - tooltipWidth,
          window.innerWidth - tooltipWidth - horizontalPadding
        )
      )

      setGuideTooltipPosition({
        top: buttonRect.bottom + 10,
        left,
        width: tooltipWidth
      })
    }

    updateGuideTooltipPosition()

    window.addEventListener("resize", updateGuideTooltipPosition)
    window.addEventListener("scroll", updateGuideTooltipPosition, true)

    return () => {
      window.removeEventListener("resize", updateGuideTooltipPosition)
      window.removeEventListener("scroll", updateGuideTooltipPosition, true)
    }
  }, [isGuideOpen])

  function openCreateGoalModal() {
    setEditingGoal(null)
    setIsGoalModalOpen(true)
  }

  function handleEditGoal(goal: Goal) {
    setEditingGoal(goal)
    setIsGoalModalOpen(true)
  }

  function handleCloseGoalModal() {
    setEditingGoal(null)
    setIsGoalModalOpen(false)
  }

  function handleSaveGoal(goalInput: GoalInput) {
    if (editingGoal) {
      updateGoal({
        ...editingGoal,
        ...goalInput
      })
    } else {
      addGoal(goalInput)
    }

    handleCloseGoalModal()
  }

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-12">
        <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 lg:col-span-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-zinc-100">
                Metas financeiras
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                Distribua sua sobra do mês planejada em múltiplas metas e acompanhe
                projeções em ciclos mensais reais.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
              <button
                ref={guideButtonRef}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100 sm:text-sm"
                onClick={() => setIsGuideOpen((current) => !current)}
                type="button"
                aria-label="Como funciona a seção de metas"
                title="Como funciona"
              >
                <Info size={16} />
                Como funciona
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-xs font-semibold text-zinc-100 transition hover:bg-indigo-400 sm:text-sm"
                onClick={openCreateGoalModal}
              >
                <Target size={16} />
                Nova meta
              </button>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 lg:col-span-4">
          <div className="text-xs uppercase tracking-wide text-zinc-400">
            Progresso consolidado
          </div>
          <p className="mt-1 text-3xl font-semibold text-emerald-400">
            {Math.round(overallProgress)}%
          </p>
          <div className="mt-4 h-2 rounded-full bg-zinc-800">
            <div
              className="h-2 rounded-full bg-emerald-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="mt-4 grid gap-2 text-xs text-zinc-300">
            <p>
              Guardado:{" "}
              <span className="font-semibold text-zinc-100">
                {formatCurrencyFromNumber(totalSaved)}
              </span>
            </p>
            <p>
              Valor total das metas:{" "}
              <span className="font-semibold text-zinc-100">
                {formatCurrencyFromNumber(totalTarget)}
              </span>
            </p>
            <p>
              Metas concluídas:{" "}
              <span className="font-semibold text-emerald-300">
                {completedGoalsCount}/{goals.length}
              </span>
            </p>
          </div>
        </article>

        <div className="lg:col-span-12">
          <OverloadBanner />
        </div>

        <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 lg:col-span-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
              Contas e reservas líquidas
            </h2>
            <span className="text-xs text-zinc-500">
              Não entra na sobra do mês
            </span>
          </div>

          <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
            <div className="text-[11px] uppercase tracking-wide text-zinc-500">
              Patrimônio líquido em contas
            </div>
            <p className="mt-1 text-xl font-semibold text-zinc-100">
              {formatCurrencyFromNumber(totalBankAccountsBalance)}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[1.3fr_0.8fr_1fr_auto]">
            <input
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
              placeholder="Nome da conta (ex: Conta Nubank)"
              value={newAccountName}
              onChange={(event) => setNewAccountName(event.target.value)}
            />
            <SelectField
              value={newAccountType}
              onChange={(event) =>
                setNewAccountType(
                  event.target.value as "checking" | "savings" | "investment"
                )
              }
            >
              <option value="checking">Conta corrente</option>
              <option value="savings">Poupança</option>
              <option value="investment">Investimento</option>
            </SelectField>
            <input
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
              inputMode="decimal"
              placeholder="Saldo inicial"
              value={newAccountBalance}
              onChange={(event) =>
                setNewAccountBalance(formatCurrencyInput(event.target.value))
              }
            />
            <button
              type="button"
              onClick={handleAddBankAccount}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
            >
              Adicionar
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {bankAccounts.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-6 text-sm text-zinc-500 sm:col-span-2 xl:col-span-3">
                Cadastre sua primeira conta para separar patrimônio da sobra mensal.
              </div>
            ) : (
              bankAccounts.map((account) => (
                <article
                  key={account.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-100">{account.name}</p>
                      {(() => {
                        const visual = getAccountTypeVisual(account.type)
                        const Icon = visual.icon
                        return (
                          <span className={`mt-1 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] uppercase tracking-wide ${visual.colorClassName}`}>
                            <Icon size={12} />
                            {getAccountTypeLabel(account.type)}
                          </span>
                        )
                      })()}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBankAccount(account.id)}
                      className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 transition hover:border-rose-500/50 hover:text-rose-300"
                    >
                      Remover
                    </button>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">Saldo atual</div>
                      {editingAccountId === account.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => saveEditingAccountBalance(account.id)}
                            className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300 transition hover:bg-emerald-500/20"
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditingAccountBalance}
                            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditingAccountBalance(account.id, account.balance)}
                          className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                        >
                          Editar saldo
                        </button>
                      )}
                    </div>
                    {editingAccountId === account.id ? (
                      <input
                        className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                        inputMode="decimal"
                        value={editingAccountBalanceInput}
                        onChange={(event) =>
                          setEditingAccountBalanceInput(formatCurrencyInput(event.target.value))
                        }
                      />
                    ) : (
                      <p className="mt-1 text-base font-semibold text-zinc-100">
                        {formatCurrencyFromNumber(account.balance)}
                      </p>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 lg:col-span-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
            Alocação virtual
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Move saldo da conta para a meta sem alterar a sobra projetada do mês.
          </p>

          <div className="mt-3 grid gap-2">
            <SelectField
              value={selectedAccountId}
              onChange={(event) => setSelectedAccountId(event.target.value)}
            >
              {bankAccounts.length === 0 && <option value="">Nenhuma conta cadastrada</option>}
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              value={selectedGoalId}
              onChange={(event) => setSelectedGoalId(event.target.value)}
            >
              {goals.length === 0 && <option value="">Nenhuma meta cadastrada</option>}
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.name}
                </option>
              ))}
            </SelectField>
            <input
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
              inputMode="decimal"
              placeholder="Valor para alocar"
              value={allocationAmountInput}
              onChange={(event) =>
                setAllocationAmountInput(formatCurrencyInput(event.target.value))
              }
            />
            <button
              ref={allocateButtonRef}
              type="button"
              onClick={handleAllocateFromAccountToGoal}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              disabled={bankAccounts.length === 0 || goals.length === 0}
            >
              Alocar na meta
            </button>
          </div>

          {allocationStatus && (
            <p className="mt-3 text-xs text-zinc-400">{allocationStatus}</p>
          )}
        </article>

        {goals.length > 0 ? (
          <div className="lg:col-span-12">
            <div className="-mx-1 overflow-x-auto pb-2 pl-1">
              <div className="flex w-max min-w-full gap-3 snap-x snap-mandatory">
                {goals.map((goal) => (
                  <div
                    key={goal.id}
                    data-goal-card-id={goal.id}
                    className="w-[86vw] min-w-[280px] max-w-[360px] flex-shrink-0 snap-start sm:w-[340px] md:w-[360px]"
                  >
                    <GoalCard
                      goal={goal}
                      monthlyLeftoverLimit={monthlyLeftoverLimit}
                      onEdit={handleEditGoal}
                      onDelete={deleteGoal}
                      onUpdateSavedAmount={updateSavedAmount}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center lg:col-span-12">
            <h2 className="text-base font-semibold text-zinc-100">
              Nenhuma meta cadastrada ainda
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Crie sua primeira meta para começar a planejar aportes mensais com
              projeção realista.
            </p>
            <button
              className="mt-4 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
              onClick={openCreateGoalModal}
            >
              Criar primeira meta
            </button>
          </article>
        )}
      </section>

      <AnimatePresence>
        {isGuideOpen && (
          <div className="fixed inset-0 z-[70] pointer-events-none">
            <motion.div
              className="pointer-events-auto absolute rounded-2xl border border-amber-500/60 bg-zinc-900 p-5 shadow-2xl shadow-zinc-950/50"
              style={{
                top: guideTooltipPosition.top,
                left: guideTooltipPosition.left,
                width: guideTooltipPosition.width
              }}
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold text-zinc-100">
                Guia rápido de organização das metas
              </h2>
              <button
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                onClick={() => setIsGuideOpen(false)}
                type="button"
                aria-label="Fechar guia de metas"
              >
                <X size={14} />
              </button>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
              <li>
                • Separe metas por prioridade: reserva de emergência, segurança e depois
                objetivos de consumo.
              </li>
              <li>
                • Defina um aporte mensal fixo por meta para manter consistência e reduzir
                decisões no dia a dia.
              </li>
              <li>
                • O prazo usa ciclos reais de recebimento:{" "}
                <span className="font-medium text-indigo-300">
                  (valor da meta - saldo atual) / aporte
                </span>{" "}
                com arredondamento para cima.
              </li>
              <li>
                • O painel de limite mensal mostra quanto da sobra do mês já foi
                distribuído entre as metas.
              </li>
              <li>
                • O aporte mensal de cada meta é limitado pela sobra do mês atual para
                evitar planejamento acima da sua capacidade.
              </li>
            </ul>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="pointer-events-none fixed inset-0 z-[85]">
        <AnimatePresence>
          {moneyFlights.map((flight) => (
            <motion.span
              key={flight.id}
              initial={{
                x: flight.startX,
                y: flight.startY,
                opacity: 0,
                scale: 0.7
              }}
              animate={{
                x: flight.endX,
                y: flight.endY,
                opacity: [0, 1, 0],
                scale: [0.7, 1, 0.9]
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.9,
                ease: "easeOut",
                delay: flight.delay
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-lg font-black text-emerald-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.55)]"
            >
              $
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      <GoalModal
        isOpen={isGoalModalOpen}
        editingGoal={editingGoal}
        maxAllowedContribution={modalContributionLimit}
        onClose={handleCloseGoalModal}
        onSave={handleSaveGoal}
      />
    </>
  )
}
