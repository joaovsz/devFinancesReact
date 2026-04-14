import { motion } from "framer-motion"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { Goal } from "../../types/goal"
import { formatCurrencyFromNumber } from "../../utils/currency-input"
import {
  calculateGoalProgress,
  calculateMonthsToGoal,
  calculateRemainingAmount,
  formatGoalCompletionDate
} from "../../utils/goalProjections"

type GoalCardProps = {
  goal: Goal
  monthlyLeftoverLimit: number
  onEdit: (goal: Goal) => void
  onDelete: (id: string) => void
  onUpdateSavedAmount: (id: string, currentSaved: number) => void
}

function getProgressVisual(progress: number) {
  if (progress >= 85) {
    return {
      strokeColor: "#10b981",
      labelClassName: "text-emerald-300"
    }
  }

  if (progress >= 55) {
    return {
      strokeColor: "#f59e0b",
      labelClassName: "text-amber-300"
    }
  }

  return {
    strokeColor: "#818cf8",
    labelClassName: "text-indigo-300"
  }
}

export const GoalCard = ({
  goal,
  monthlyLeftoverLimit,
  onEdit,
  onDelete,
  onUpdateSavedAmount
}: GoalCardProps) => {
  const progress = calculateGoalProgress(goal.targetAmount, goal.currentSaved)
  const remainingAmount = calculateRemainingAmount(goal.targetAmount, goal.currentSaved)
  const monthsToGoal = calculateMonthsToGoal(
    goal.targetAmount,
    goal.currentSaved,
    goal.monthlyContribution
  )
  const completionDateLabel = formatGoalCompletionDate(monthsToGoal)
  const progressVisual = getProgressVisual(progress)
  const ringRadius = 40
  const ringCircumference = 2 * Math.PI * ringRadius
  const strokeOffset = ringCircumference * (1 - progress / 100)
  const quickSaveChips = [10, 50, 100]

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-zinc-100">{goal.name}</h3>
          <p className="mt-1 text-xs text-zinc-400">
            Aporte mensal: {formatCurrencyFromNumber(goal.monthlyContribution)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Limite de aporte por mês:{" "}
            {formatCurrencyFromNumber(Math.max(monthlyLeftoverLimit, 0))}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
            onClick={() => onEdit(goal)}
            type="button"
            aria-label={`Editar meta ${goal.name}`}
          >
            <Pencil size={14} />
          </button>
          <button
            className="rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-zinc-300 transition hover:border-rose-500/50 hover:text-rose-300"
            onClick={() => onDelete(goal.id)}
            type="button"
            aria-label={`Excluir meta ${goal.name}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[116px_1fr]">
        <div className="relative mx-auto flex items-center justify-center">
          <svg width="116" height="116" viewBox="0 0 116 116" aria-hidden>
            <circle
              cx="58"
              cy="58"
              r={ringRadius}
              stroke="#27272a"
              strokeWidth="10"
              fill="none"
            />
            <motion.circle
              cx="58"
              cy="58"
              r={ringRadius}
              stroke={progressVisual.strokeColor}
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
              transform="rotate(-90 58 58)"
              initial={{ strokeDashoffset: ringCircumference }}
              animate={{ strokeDashoffset: strokeOffset }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              strokeDasharray={ringCircumference}
            />
          </svg>
          <div className="pointer-events-none absolute text-center">
            <p className={`text-xl font-semibold ${progressVisual.labelClassName}`}>
              {Math.round(progress)}%
            </p>
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Concluído</p>
          </div>
        </div>

        <div className="grid gap-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-[11px] uppercase tracking-wide text-zinc-400">Saldo atual</div>
            <p className="text-sm font-semibold text-zinc-100">
              {formatCurrencyFromNumber(goal.currentSaved)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-[11px] uppercase tracking-wide text-zinc-400">Falta</div>
            <p className="text-sm font-semibold text-zinc-100">
              {formatCurrencyFromNumber(remainingAmount)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-[11px] uppercase tracking-wide text-zinc-400">Projeção</div>
            <p className="text-sm font-medium text-indigo-300">{completionDateLabel}</p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-[11px] uppercase tracking-wide text-zinc-400">
          Ajuste rápido do saldo atual
        </div>
        <div className="flex flex-wrap gap-2">
          {quickSaveChips.map((chipValue) => (
            <button
              key={`${goal.id}-chip-${chipValue}`}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
              onClick={() =>
                onUpdateSavedAmount(goal.id, goal.currentSaved + chipValue)
              }
              type="button"
            >
              <Plus size={12} />
              {formatCurrencyFromNumber(chipValue)}
            </button>
          ))}
        </div>
      </div>
    </article>
  )
}
