import IncomeIcon from "../icons/IncomeIcon"
import ExpensesIcon from "../icons/ExpensesIcon"
import TotalIcon from "../icons/TotalIcon"
import { formatCurrency } from "../Transactions"
import { NumberTicker } from "../magic/NumberTicker"

type FinanceSummaryCardsProps = {
  incomes: number
  expenses: number
  total: number
}

export const FinanceSummaryCards = ({
  incomes,
  expenses,
  total
}: FinanceSummaryCardsProps) => {
  const summaryCards = [
    {
      type: "Entradas",
      icon: "Income",
      value: incomes,
      valueColor: "text-emerald-500"
    },
    {
      type: "Saídas",
      icon: "Expenses",
      value: expenses,
      valueColor: "text-amber-500"
    },
    {
      type: "Total",
      icon: "Total",
      value: total,
      valueColor: "text-zinc-100"
    }
  ]

  return (
    <section className="grid gap-4 md:grid-cols-3">
      {summaryCards.map((card) => (
        <div
          key={card.type}
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg shadow-zinc-950/20"
        >
          <div className="mb-4 flex items-center justify-between text-sm text-zinc-300">
            <span>{card.type}</span>
            {card.icon === "Income" ? <IncomeIcon /> : card.icon === "Expenses" ? <ExpensesIcon /> : <TotalIcon />}
          </div>
          <NumberTicker
            className={`text-2xl font-semibold ${card.valueColor}`}
            value={card.value}
            format={formatCurrency}
          />
        </div>
      ))}
    </section>
  )
}
