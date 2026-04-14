import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Info, Target, X } from "lucide-react"
import { GoalCard } from "./GoalCard"
import { GoalModal } from "./GoalModal"
import { OverloadBanner } from "./OverloadBanner"
import {
  selectTotalGoalsSaved,
  selectTotalGoalsTarget,
  useGoalCashflowStatus,
  useGoalStore
} from "../../store/useGoalStore"
import { Goal, GoalInput } from "../../types/goal"
import { formatCurrencyFromNumber } from "../../utils/currency-input"
import { calculateGoalProgress } from "../../utils/goalProjections"

export const GoalDashboard = () => {
  const goals = useGoalStore((state) => state.goals)
  const totalTarget = useGoalStore(selectTotalGoalsTarget)
  const totalSaved = useGoalStore(selectTotalGoalsSaved)
  const addGoal = useGoalStore((state) => state.addGoal)
  const updateGoal = useGoalStore((state) => state.updateGoal)
  const deleteGoal = useGoalStore((state) => state.deleteGoal)
  const updateSavedAmount = useGoalStore((state) => state.updateSavedAmount)
  const { projectedMonthlyLeftover, totalMonthlyContribution } = useGoalCashflowStatus()
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const guideButtonRef = useRef<HTMLButtonElement | null>(null)
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
  const modalContributionLimit = useMemo(() => {
    const contributionWithoutEditingGoal = editingGoal
      ? totalMonthlyContribution - editingGoal.monthlyContribution
      : totalMonthlyContribution

    return Math.max(projectedMonthlyLeftover - contributionWithoutEditingGoal, 0)
  }, [editingGoal, projectedMonthlyLeftover, totalMonthlyContribution])

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
            <div className="flex items-center gap-2">
              <button
                ref={guideButtonRef}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
                onClick={() => setIsGuideOpen((current) => !current)}
                type="button"
                aria-label="Como funciona a seção de metas"
                title="Como funciona"
              >
                <Info size={16} />
                Como funciona
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-indigo-400"
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

        {goals.length > 0 ? (
          goals.map((goal) => (
            <div key={goal.id} className="lg:col-span-4">
              <GoalCard
                goal={goal}
                monthlyLeftoverLimit={monthlyLeftoverLimit}
                onEdit={handleEditGoal}
                onDelete={deleteGoal}
                onUpdateSavedAmount={updateSavedAmount}
              />
            </div>
          ))
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
