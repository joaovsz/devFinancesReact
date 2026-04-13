import { FocusEvent, KeyboardEvent, useEffect, useMemo, useState } from "react"
import { Pencil, X } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Transaction } from "../types/transaction"
import { useTransactionStore } from '../store/useTransactionStore'
import { defaultCategories } from "../data/categories"
import { getCurrentMonthKey } from "../utils/projections"
import { buildPlannedEntriesForMonth, PlannedEntry } from "../utils/planningEntries"
import { fetchBrazilHolidaysByYear, Holiday } from "../services/calendar"
import { formatCurrencyFromNumber, formatCurrencyInput, parseCurrencyInput } from "../utils/currency-input"

export const formatCurrency = (value: number | string) => {
  const signal = Number(value) < 0 ? "-" : "";

  // Converte para número (considerando valores decimais)
  const numericValue = Number(String(value).replace(/[^\d.-]/g, ''));

  const formattedValue = numericValue.toLocaleString("pt-br", {
    style: "currency",
    currency: "BRL"
  });

  return signal + formattedValue;
};




const Transactions = () => {
  const transactions = useTransactionStore((state) => state.transactions)
  const cards = useTransactionStore((state) => state.cards)
  const fixedCosts = useTransactionStore((state) => state.fixedCosts)
  const installmentPlans = useTransactionStore((state) => state.installmentPlans)
  const contractConfig = useTransactionStore((state) => state.contractConfig)
  const removeTransaction = useTransactionStore((state) => state.removeTransaction)
  const updateTransaction = useTransactionStore((state) => state.updateTransaction)
  const navigate = useNavigate()
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

  const allRows: Array<Transaction | PlannedEntry> = useMemo(
    () => [...plannedEntries, ...transactions],
    [plannedEntries, transactions]
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ label: string; value: string; date: string }>({
    label: "",
    value: "",
    date: ""
  })

  function removeTransactions(id:string){
    removeTransaction(id)
  }

  function startEditing(transaction: Transaction) {
    setEditingId(transaction.id)
    setDraft({
      label: transaction.label,
      value: formatCurrencyFromNumber(transaction.value),
      date: transaction.date
    })
  }

  function saveEditById(transactionId: string) {
    const transaction = transactions.find((item) => item.id === transactionId)
    if (!transaction) {
      setEditingId(null)
      return
    }

    const parsedValue = parseCurrencyInput(draft.value)
    const nextValue = parsedValue > 0 ? parsedValue : transaction.value

    updateTransaction({
      ...transaction,
      label: draft.label.trim() || transaction.label,
      value: nextValue,
      date: draft.date || transaction.date
    })

    setEditingId(null)
  }

  function handleRowBlur(event: FocusEvent<HTMLDivElement>, transactionId: string) {
    const nextTarget = event.relatedTarget as Node | null
    if (nextTarget && event.currentTarget.contains(nextTarget)) {
      return
    }

    saveEditById(transactionId)
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLDivElement>, transactionId: string) {
    if (event.key === "Enter") {
      event.preventDefault()
      saveEditById(transactionId)
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      setEditingId(null)
    }
  }

  function getCategoryLabel(transaction: Transaction) {
    const category = defaultCategories.find((item) => item.id === transaction.categoryId)
    if (!category) {
      return "Categoria não definida"
    }

    const subcategory = category.subcategories.find(
      (item) => item.id === transaction.subcategoryId
    )

    return subcategory
      ? `${category.name} / ${subcategory.name}`
      : category.name
  }

  function getPaymentLabel(transaction: Transaction) {
    if (transaction.paymentMethod !== "credit") {
      return "Conta/Débito"
    }

    const card = cards.find((item) => item.id === transaction.cardId)
    return card ? `Crédito - ${card.name}` : "Crédito"
  }

  function getTypeLabel(row: Transaction | PlannedEntry) {
    const isPlanned = "isPlanned" in row && row.isPlanned
    if (isPlanned) {
      if (row.plannedSourceType === "fixed") {
        return "Gasto fixo"
      }
      if (row.plannedSourceType === "installment") {
        return "Parcelamento"
      }
      return "Faturamento"
    }

    return row.type === 1 ? "Entrada" : "Saída"
  }

  function getTypeBadgeClass(row: Transaction | PlannedEntry) {
    const label = getTypeLabel(row)
    if (label === "Entrada" || label === "Faturamento") {
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
    }
    if (label === "Gasto fixo") {
      return "border-sky-500/40 bg-sky-500/15 text-sky-300"
    }
    if (label === "Parcelamento") {
      return "border-violet-500/40 bg-violet-500/15 text-violet-300"
    }
    return "border-amber-500/40 bg-amber-500/15 text-amber-300"
  }

  function openPlanningForEntry(entry: PlannedEntry) {
    if (entry.plannedSourceType === "fixed" && entry.sourceId) {
      navigate(`/planejamento?editFixedCostId=${entry.sourceId}`)
      return
    }

    if (entry.plannedSourceType === "installment" && entry.sourceId) {
      navigate(`/planejamento?editInstallmentId=${entry.sourceId}`)
      return
    }

    if (entry.plannedSourceType === "income") {
      navigate("/planejamento?editIncome=1")
      return
    }

    navigate("/planejamento")
  }

  if (allRows.length === 0) {
    return (
      <div className="px-5 py-12 text-center text-sm text-zinc-500">
        Nenhuma transação cadastrada.
      </div>
    )
  }

  return (
    <>
      {allRows.map((transaction) => {
        const splittedDate = transaction.date.split('-')
        const isPlanned = "isPlanned" in transaction && transaction.isPlanned
        const actualTransaction = transaction as Transaction
        const isEditing = editingId === transaction.id
        return (
          <div
            key={transaction.id}
            className={`grid min-w-[720px] grid-cols-[240px_140px_130px_130px_56px] items-center border-b border-zinc-800/70 px-5 py-4 text-sm text-zinc-200 last:border-b-0 md:min-w-0 md:grid-cols-[1.8fr_1fr_1fr_1fr_56px] ${
              isEditing ? "bg-zinc-900/70" : ""
            }`}
            onDoubleClick={(event) => {
              if (isPlanned) {
                return
              }
              const target = event.target as HTMLElement
              if (target.closest("button")) {
                return
              }
              startEditing(transaction as Transaction)
            }}
            onBlurCapture={(event) => !isPlanned && handleRowBlur(event, transaction.id)}
            onKeyDown={(event) => !isPlanned && handleRowKeyDown(event, transaction.id)}
          >
            <div className={`sticky left-0 z-10 pr-2 ${isEditing ? "bg-zinc-900/70" : "bg-zinc-900"}`}>
              {isEditing && !isPlanned ? (
                <input
                  autoFocus
                  className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100 outline-none"
                  type="text"
                  value={draft.label}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({ ...currentDraft, label: event.target.value }))
                  }
                />
              ) : (
                <div className="truncate">{transaction.label}</div>
              )}
              {!isEditing && !isPlanned && (
                <>
                  <div className="mt-1 truncate text-xs text-zinc-400">
                    {getCategoryLabel(actualTransaction)}
                  </div>
                  <div className="mt-1 truncate text-xs text-zinc-500">
                    {getPaymentLabel(actualTransaction)}
                  </div>
                  {(actualTransaction.tags?.length || 0) > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {actualTransaction.tags.map((tag) => (
                        <span
                          key={`${transaction.id}-${tag}`}
                          className="rounded-md border border-zinc-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-300"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className={`sticky left-[240px] z-10 pr-2 ${isEditing ? "bg-zinc-900/70" : "bg-zinc-900"} font-black ${transaction.type === 1 ? "text-emerald-500" : "text-amber-500"}`}>
              {isEditing && !isPlanned ? (
                <input
                  className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100 outline-none"
                  type="text"
                  inputMode="decimal"
                  value={draft.value}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      value: formatCurrencyInput(event.target.value)
                    }))
                  }
                />
              ) : (
                formatCurrency(transaction.value)
              )}
            </div>
            <div>
              <span
                className={`inline-flex rounded-lg border px-2 py-1 text-xs font-medium ${getTypeBadgeClass(transaction)}`}
              >
                {getTypeLabel(transaction)}
              </span>
            </div>
            <div className="text-zinc-400">
              {isEditing && !isPlanned ? (
                <input
                  className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100 outline-none"
                  type="date"
                  value={draft.date}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({ ...currentDraft, date: event.target.value }))
                  }
                />
              ) : (
                `${splittedDate[2]}/${splittedDate[1]}/${splittedDate[0]}`
              )}
            </div>
            <div className="flex justify-end">
              {!isPlanned && (
                <button
                  aria-label="Remover transação"
                  title="Remover transação"
                  className="rounded-lg p-1 text-red-400 transition hover:bg-red-500/15 hover:text-red-300"
                  onClick={() => { removeTransactions(transaction.id) }}
                >
                  <X size={16} />
                </button>
              )}
              {isPlanned && (
                <button
                  aria-label="Editar item planejado"
                  title="Editar item planejado"
                  className="rounded-lg p-1 text-emerald-400 transition hover:bg-emerald-500/15 hover:text-emerald-300"
                  onClick={() => openPlanningForEntry(transaction as PlannedEntry)}
                >
                  <Pencil size={15} />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}

export default Transactions
