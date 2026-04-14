import { Info } from "lucide-react"
import { useGoalCashflowStatus } from "../../store/useGoalStore"
import { formatCurrencyFromNumber } from "../../utils/currency-input"

export const OverloadBanner = () => {
  const {
    projectedMonthlyLeftover,
    totalMonthlyContribution,
    remainingCashAfterGoals
  } = useGoalCashflowStatus()
  const availableForDistribution = Math.max(remainingCashAfterGoals, 0)

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-zinc-300">
          <Info size={18} />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-zinc-100">
            Limite mensal de aportes
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Cada meta respeita a sobra do mês atual para evitar planejamento acima da
            capacidade real.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-zinc-400">
                Sobra do mês atual
              </div>
              <p className="text-sm font-semibold text-zinc-100">
                {formatCurrencyFromNumber(projectedMonthlyLeftover)}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-zinc-400">
                Soma dos Aportes
              </div>
              <p className="text-sm font-semibold text-zinc-100">
                {formatCurrencyFromNumber(totalMonthlyContribution)}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-zinc-400">
                Disponível para novas metas
              </div>
              <p className="text-sm font-semibold text-zinc-100">
                {formatCurrencyFromNumber(availableForDistribution)}
              </p>
            </div>
          </div>
          {remainingCashAfterGoals < 0 && (
            <p className="mt-2 text-xs text-zinc-400">
              Os aportes atuais estão acima da sobra do mês em{" "}
              {formatCurrencyFromNumber(Math.abs(remainingCashAfterGoals))}. Edite as metas
              para reenquadrar os valores.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
