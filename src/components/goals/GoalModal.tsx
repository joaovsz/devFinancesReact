import { FormEvent, useEffect, useMemo, useState } from "react"
import { Goal, GoalInput } from "../../types/goal"
import {
  formatCurrencyFromNumber,
  formatCurrencyInput,
  parseCurrencyInput
} from "../../utils/currency-input"
import { calculateMonthsToGoal, formatGoalCompletionDate } from "../../utils/goalProjections"

type GoalModalProps = {
  isOpen: boolean
  editingGoal: Goal | null
  maxAllowedContribution: number
  onClose: () => void
  onSave: (goal: GoalInput) => void
}

export const GoalModal = ({
  isOpen,
  editingGoal,
  maxAllowedContribution,
  onClose,
  onSave
}: GoalModalProps) => {
  const [name, setName] = useState("")
  const [targetAmountInput, setTargetAmountInput] = useState("")
  const [currentSavedInput, setCurrentSavedInput] = useState("")
  const [monthlyContribution, setMonthlyContribution] = useState(500)

  const safeMaxAllowedContribution = Math.max(maxAllowedContribution, 0)
  const targetAmount = parseCurrencyInput(targetAmountInput)
  const currentSaved = parseCurrencyInput(currentSavedInput)
  const sliderMax = useMemo(
    () => Math.ceil(safeMaxAllowedContribution),
    [safeMaxAllowedContribution]
  )
  const monthsToGoal = calculateMonthsToGoal(
    targetAmount,
    currentSaved,
    monthlyContribution
  )
  const completionLabel = formatGoalCompletionDate(monthsToGoal)
  const quickContributionChips = [10, 50, 100, 250]
  const isSaveDisabled = !name.trim() || targetAmount <= 0

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (editingGoal) {
      setName(editingGoal.name)
      setTargetAmountInput(formatCurrencyFromNumber(editingGoal.targetAmount))
      setCurrentSavedInput(formatCurrencyFromNumber(editingGoal.currentSaved))
      setMonthlyContribution(
        Math.min(editingGoal.monthlyContribution, safeMaxAllowedContribution)
      )
      return
    }

    setName("")
    setTargetAmountInput("")
    setCurrentSavedInput("")
    setMonthlyContribution(Math.min(500, safeMaxAllowedContribution))
  }, [isOpen, editingGoal, safeMaxAllowedContribution])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setMonthlyContribution((current) => Math.min(current, safeMaxAllowedContribution))
  }, [isOpen, safeMaxAllowedContribution])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaveDisabled) {
      return
    }

    const clampedContribution = Math.min(monthlyContribution, safeMaxAllowedContribution)

    onSave({
      name: name.trim(),
      targetAmount,
      currentSaved,
      monthlyContribution: clampedContribution
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">
              {editingGoal ? "Editar meta" : "Nova meta financeira"}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Ajuste o aporte com slider e acompanhe o prazo em tempo real.
            </p>
          </div>
          <button
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
            onClick={onClose}
            type="button"
          >
            Fechar
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-zinc-400">
              Nome da meta
              <input
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm normal-case text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                placeholder="Ex: Reserva de emergência"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-zinc-400">
              Valor da meta
              <input
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm normal-case text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                inputMode="decimal"
                placeholder="R$ 0,00"
                value={targetAmountInput}
                onChange={(event) =>
                  setTargetAmountInput(formatCurrencyInput(event.target.value))
                }
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-zinc-400">
            Saldo atual
            <input
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm normal-case text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
              inputMode="decimal"
              placeholder="R$ 0,00"
              value={currentSavedInput}
              onChange={(event) =>
                setCurrentSavedInput(formatCurrencyInput(event.target.value))
              }
            />
          </label>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-zinc-400">
                Aporte mensal fixo
              </div>
              <div className="text-sm font-semibold text-emerald-300">
                {formatCurrencyFromNumber(monthlyContribution)}
              </div>
            </div>
            <p className="mb-2 text-xs text-zinc-400">
              Limite deste mês:{" "}
              <span className="font-medium text-zinc-200">
                {formatCurrencyFromNumber(safeMaxAllowedContribution)}
              </span>
            </p>
            <input
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-700 accent-emerald-500"
              type="range"
              min="0"
              max={sliderMax}
              step="1"
              value={monthlyContribution}
              onChange={(event) =>
                setMonthlyContribution(
                  Math.min(Number(event.target.value), safeMaxAllowedContribution)
                )
              }
              disabled={safeMaxAllowedContribution <= 0}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {quickContributionChips.map((chipValue) => (
                <button
                  key={`contribution-chip-${chipValue}`}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
                  onClick={() =>
                    setMonthlyContribution((current) =>
                      Math.min(current + chipValue, safeMaxAllowedContribution)
                    )
                  }
                  type="button"
                  disabled={safeMaxAllowedContribution <= 0}
                >
                  + {formatCurrencyFromNumber(chipValue)}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3">
            <div className="text-[11px] uppercase tracking-wide text-indigo-300">
              Projeção em ciclos mensais
            </div>
            <p className="mt-1 text-sm text-indigo-100">{completionLabel}</p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              type="submit"
              disabled={isSaveDisabled}
            >
              {editingGoal ? "Salvar alterações" : "Criar meta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
