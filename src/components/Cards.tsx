import { useEffect, useMemo, useState } from "react"
import { fetchBrazilHolidaysByYear, Holiday } from "../services/calendar"
import { getCurrentMonthKey } from "../utils/projections"
import { buildPlannedEntriesForMonth } from "../utils/planningEntries"
import { useTransactionStore } from "../store/useTransactionStore"
import { CreditCardsPanel } from "./cards/CreditCardsPanel"
import { FinanceSummaryCards } from "./transactions/FinanceSummaryCards"

export const Cards = () => {
  const cards = useTransactionStore((state) => state.cards)
  const transactions = useTransactionStore((state) => state.transactions)
  const fixedCosts = useTransactionStore((state) => state.fixedCosts)
  const installmentPlans = useTransactionStore((state) => state.installmentPlans)
  const contractConfig = useTransactionStore((state) => state.contractConfig)
  const totalIncomes = useTransactionStore((state) => state.totalIncomes)
  const totalExpenses = useTransactionStore((state) => state.totalExpenses)
  const addCard = useTransactionStore((state) => state.addCard)
  const updateCard = useTransactionStore((state) => state.updateCard)

  const currentMonth = getCurrentMonthKey()
  const [holidays, setHolidays] = useState<Holiday[]>([])

  useEffect(() => {
    let ignore = false
    const year = Number(currentMonth.split("-")[0])

    if (!(contractConfig.incomeMode === "pj" && contractConfig.useHolidayApi)) {
      setHolidays([])
      return () => {
        ignore = true
      }
    }

    fetchBrazilHolidaysByYear(year)
      .then((data) => {
        if (!ignore) {
          setHolidays(data)
        }
      })
      .catch(() => {
        if (!ignore) {
          setHolidays([])
        }
      })

    return () => {
      ignore = true
    }
  }, [currentMonth, contractConfig.incomeMode, contractConfig.useHolidayApi])

  const plannedEntries = useMemo(
    () =>
      buildPlannedEntriesForMonth({
        monthKey: currentMonth,
        fixedCosts,
        installmentPlans,
        contractConfig,
        holidays
      }),
    [currentMonth, fixedCosts, installmentPlans, contractConfig, holidays]
  )

  const plannedIncomes = plannedEntries
    .filter((entry) => entry.type === 1)
    .reduce((sum, entry) => sum + entry.value, 0)
  const plannedExpenses = plannedEntries
    .filter((entry) => entry.type === 2)
    .reduce((sum, entry) => sum + entry.value, 0)

  const summaryIncomes = totalIncomes + plannedIncomes
  const summaryExpenses = totalExpenses + plannedExpenses
  const summaryTotal = summaryIncomes - summaryExpenses

  return (
    <>
      <FinanceSummaryCards
        incomes={summaryIncomes}
        expenses={summaryExpenses}
        total={summaryTotal}
      />

      <CreditCardsPanel
        cards={cards}
        transactions={transactions}
        fixedCosts={fixedCosts}
        installmentPlans={installmentPlans}
        onAddCard={addCard}
        onUpdateCard={updateCard}
      />
    </>
  )
}
