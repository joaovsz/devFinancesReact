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




type TransactionsProps = {
  searchQuery?: string
  typeFilters?: string[]
  cardFilterId?: string
}

type ManualInvoiceEntry = {
  id: string
  label: string
  value: number
  date: string
  type: 2
  paymentMethod: "credit"
  cardId: string
  isPlanned: true
  plannedSourceType: "manualInvoice"
}

type TransactionRow = Transaction | PlannedEntry | ManualInvoiceEntry

const paymentMethodLabels: Record<Transaction["paymentMethod"], string> = {
  cash: "Conta",
  debit: "Débito",
  pix: "Pix",
  "bank-transfer": "Transferência",
  "bank-slip": "Boleto",
  "cash-money": "Dinheiro",
  credit: "Crédito"
}

const Transactions = ({
  searchQuery = "",
  typeFilters = [],
  cardFilterId
}: TransactionsProps) => {
  const transactions = useTransactionStore((state) => state.transactions)
  const cards = useTransactionStore((state) => state.cards)
  const fixedCosts = useTransactionStore((state) => state.fixedCosts)
  const installmentPlans = useTransactionStore((state) => state.installmentPlans)
  const contractConfig = useTransactionStore((state) => state.contractConfig)
  const removeTransaction = useTransactionStore((state) => state.removeTransaction)
  const updateTransaction = useTransactionStore((state) => state.updateTransaction)
  const updateFixedCost = useTransactionStore((state) => state.updateFixedCost)
  const removeFixedCost = useTransactionStore((state) => state.removeFixedCost)
  const removeInstallmentPlan = useTransactionStore((state) => state.removeInstallmentPlan)
  const updateCard = useTransactionStore((state) => state.updateCard)
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

  const manualInvoiceEntries = useMemo<ManualInvoiceEntry[]>(
    () =>
      cards
        .filter((card) => (card.manualInvoiceAmount || 0) > 0)
        .map((card) => ({
          id: `planned-manual-invoice-${card.id}-${currentMonth}`,
          label: "Ajuste manual de fatura",
          value: card.manualInvoiceAmount || 0,
          date: `${currentMonth}-01`,
          type: 2 as const,
          paymentMethod: "credit" as const,
          cardId: card.id,
          isPlanned: true as const,
          plannedSourceType: "manualInvoice" as const
        })),
    [cards, currentMonth]
  )
  const allRows: TransactionRow[] = useMemo(
    () => [...plannedEntries, ...manualInvoiceEntries, ...transactions],
    [plannedEntries, manualInvoiceEntries, transactions]
  )
  const normalizedSearch = searchQuery.trim().toLowerCase()
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

  function startEditingManualInvoice(entry: ManualInvoiceEntry) {
    setEditingId(entry.id)
    setDraft({
      label: entry.label,
      value: formatCurrencyFromNumber(entry.value),
      date: entry.date
    })
  }

  function startEditingFixedEntry(entry: PlannedEntry) {
    if (!entry.sourceId) {
      return
    }

    const cost = fixedCosts.find((item) => item.id === entry.sourceId)
    if (!cost) {
      return
    }

    setEditingId(entry.id)
    setDraft({
      label: cost.name,
      value: formatCurrencyFromNumber(cost.amount),
      date: entry.date
    })
  }

  function saveEditById(rowId: string) {
    const transaction = transactions.find((item) => item.id === rowId)
    if (!transaction) {
      const manualEntry = manualInvoiceEntries.find((item) => item.id === rowId)
      if (!manualEntry) {
        setEditingId(null)
        return
      }

      const card = cards.find((item) => item.id === manualEntry.cardId)
      if (!card) {
        setEditingId(null)
        return
      }

      updateCard({
        ...card,
        manualInvoiceAmount: Math.max(parseCurrencyInput(draft.value), 0)
      })
      setEditingId(null)
      return
    }

    const fixedEntry = plannedEntries.find(
      (item) => item.id === rowId && item.plannedSourceType === "fixed"
    )
    if (fixedEntry?.sourceId) {
      const targetCost = fixedCosts.find((item) => item.id === fixedEntry.sourceId)
      if (!targetCost) {
        setEditingId(null)
        return
      }

      const parsedValue = parseCurrencyInput(draft.value)
      updateFixedCost({
        ...targetCost,
        name: draft.label.trim() || targetCost.name,
        amount: parsedValue > 0 ? parsedValue : targetCost.amount
      })
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

  function removeManualInvoiceEntry(entry: ManualInvoiceEntry) {
    const card = cards.find((item) => item.id === entry.cardId)
    if (!card) {
      return
    }

    updateCard({
      ...card,
      manualInvoiceAmount: 0
    })
    setEditingId((current) => (current === entry.id ? null : current))
  }

  function isManualInvoiceRow(row: TransactionRow): row is ManualInvoiceEntry {
    return "isPlanned" in row && row.isPlanned && row.plannedSourceType === "manualInvoice"
  }

  function isFixedPlannedRow(row: TransactionRow): row is PlannedEntry {
    return "isPlanned" in row && row.isPlanned && row.plannedSourceType === "fixed"
  }

  function isInstallmentPlannedRow(row: TransactionRow): row is PlannedEntry {
    return "isPlanned" in row && row.isPlanned && row.plannedSourceType === "installment"
  }

  function isIncomePlannedRow(row: TransactionRow): row is PlannedEntry {
    return "isPlanned" in row && row.isPlanned && row.plannedSourceType === "income"
  }

  function isRowEditable(row: TransactionRow) {
    if (!("isPlanned" in row) || !row.isPlanned) {
      return true
    }

    return row.plannedSourceType === "manualInvoice" || row.plannedSourceType === "fixed"
  }

  function removeFixedEntry(entry: PlannedEntry) {
    if (!entry.sourceId) {
      return
    }
    removeFixedCost(entry.sourceId)
    setEditingId((current) => (current === entry.id ? null : current))
  }

  function removeInstallmentEntry(entry: PlannedEntry) {
    if (!entry.sourceId) {
      return
    }
    removeInstallmentPlan(entry.sourceId)
    setEditingId((current) => (current === entry.id ? null : current))
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
      return paymentMethodLabels[transaction.paymentMethod] || "Conta"
    }

    const card = cards.find((item) => item.id === transaction.cardId)
    return card ? `Crédito - ${card.name}` : "Crédito"
  }

  function getCreditCardLabel(row: TransactionRow) {
    if (row.paymentMethod !== "credit") {
      return "—"
    }

    const card = cards.find((item) => item.id === row.cardId)
    if (card) {
      return card.name
    }

    return row.cardId ? "Cartão removido" : "Crédito sem cartão"
  }

  function getTypeLabel(row: TransactionRow) {
    const isPlanned = "isPlanned" in row && row.isPlanned
    if (isPlanned) {
      if (row.plannedSourceType === "fixed") {
        return "Gasto fixo"
      }
      if (row.plannedSourceType === "installment") {
        return "Parcelamento"
      }
      if (row.plannedSourceType === "manualInvoice") {
        return "Ajuste fatura"
      }
      return "Faturamento"
    }

    return row.type === 1 ? "Entrada" : "Saída"
  }

  function getTypeBadgeClass(row: TransactionRow) {
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
    if (label === "Ajuste fatura") {
      return "border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
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

  const filteredRows = useMemo(
    () =>
      allRows.filter((row) => {
        const typeLabel = getTypeLabel(row)
        if (typeFilters.length > 0 && !typeFilters.includes(typeLabel)) {
          return false
        }

        if (cardFilterId) {
          if (!(row.paymentMethod === "credit" && row.cardId === cardFilterId)) {
            return false
          }
        }

        if (!normalizedSearch) {
          return true
        }

        const labelMatch = row.label.toLowerCase().includes(normalizedSearch)
        const typeMatch = typeLabel.toLowerCase().includes(normalizedSearch)

        if ("isPlanned" in row && row.isPlanned) {
          return labelMatch || typeMatch
        }

        const transaction = row as Transaction
        const categoryMatch = getCategoryLabel(transaction).toLowerCase().includes(normalizedSearch)
        const paymentMatch = getPaymentLabel(transaction).toLowerCase().includes(normalizedSearch)

        return labelMatch || typeMatch || categoryMatch || paymentMatch
      }),
    [allRows, typeFilters, cardFilterId, normalizedSearch]
  )

  if (filteredRows.length === 0) {
    return (
      <div className="px-5 py-12 text-center text-sm text-zinc-500">
        Nenhum resultado para os filtros aplicados.
      </div>
    )
  }

  return (
    <>
      {filteredRows.map((transaction) => {
        const splittedDate = transaction.date.split('-')
        const isPlanned = "isPlanned" in transaction && transaction.isPlanned
        const isManualInvoice = isManualInvoiceRow(transaction)
        const isFixedPlanned = isFixedPlannedRow(transaction)
        const isInstallmentPlanned = isInstallmentPlannedRow(transaction)
        const isIncomePlanned = isIncomePlannedRow(transaction)
        const isEditable = isRowEditable(transaction)
        const actualTransaction = transaction as Transaction
        const isEditing = editingId === transaction.id
        return (
          <div
            key={transaction.id}
            className={`grid min-w-[860px] grid-cols-[220px_130px_120px_170px_120px_56px] items-center border-b border-zinc-800/70 px-5 py-4 text-sm text-zinc-200 last:border-b-0 md:min-w-0 md:grid-cols-[1.8fr_1fr_1fr_1.2fr_1fr_56px] ${
              isEditing ? "bg-zinc-900/70" : ""
            }`}
            onDoubleClick={(event) => {
              const target = event.target as HTMLElement
              if (target.closest("button")) {
                return
              }
              if (!isEditable) {
                return
              }
              if (isManualInvoice) {
                startEditingManualInvoice(transaction)
                return
              }
              if (isFixedPlanned) {
                startEditingFixedEntry(transaction)
                return
              }
              startEditing(transaction as Transaction)
            }}
            onBlurCapture={(event) =>
              isEditable && handleRowBlur(event, transaction.id)
            }
            onKeyDown={(event) =>
              isEditable && handleRowKeyDown(event, transaction.id)
            }
          >
            <div className="pr-2">
              {isEditing && isEditable ? (
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
            <div className={`pr-2 font-black ${transaction.type === 1 ? "text-emerald-500" : "text-amber-500"}`}>
              {isEditing && isEditable ? (
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
            <div className="truncate pr-2 text-xs text-zinc-300">
              {getCreditCardLabel(transaction)}
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
                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <button
                      aria-label="Salvar transação"
                      title="Salvar transação"
                      className="rounded-lg p-1 text-emerald-400 transition hover:bg-emerald-500/15 hover:text-emerald-300"
                      onClick={() => saveEditById(transaction.id)}
                    >
                      salvar
                    </button>
                  ) : (
                    <button
                      aria-label="Editar transação"
                      title="Editar transação"
                      className="rounded-lg p-1 text-emerald-400 transition hover:bg-emerald-500/15 hover:text-emerald-300"
                      onClick={() => startEditing(transaction as Transaction)}
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                  <button
                    aria-label="Remover transação"
                    title="Remover transação"
                    className="rounded-lg p-1 text-red-400 transition hover:bg-red-500/15 hover:text-red-300"
                    onClick={() => { removeTransactions(transaction.id) }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              {isPlanned && (
                ("plannedSourceType" in transaction && transaction.plannedSourceType === "manualInvoice" ? (
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <button
                        aria-label="Salvar ajuste manual"
                        title="Salvar ajuste manual"
                        className="rounded-lg p-1 text-emerald-400 transition hover:bg-emerald-500/15 hover:text-emerald-300"
                        onClick={() => saveEditById(transaction.id)}
                      >
                        salvar
                      </button>
                    ) : (
                      <button
                        aria-label="Editar ajuste manual"
                        title="Editar ajuste manual"
                        className="rounded-lg p-1 text-emerald-400 transition hover:bg-emerald-500/15 hover:text-emerald-300"
                        onClick={() => startEditingManualInvoice(transaction)}
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    <button
                      aria-label="Remover ajuste manual"
                      title="Remover ajuste manual"
                      className="rounded-lg p-1 text-red-400 transition hover:bg-red-500/15 hover:text-red-300"
                      onClick={() => removeManualInvoiceEntry(transaction)}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : isFixedPlanned ? (
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <button
                        aria-label="Salvar gasto fixo"
                        title="Salvar gasto fixo"
                        className="rounded-lg p-1 text-emerald-400 transition hover:bg-emerald-500/15 hover:text-emerald-300"
                        onClick={() => saveEditById(transaction.id)}
                      >
                        salvar
                      </button>
                    ) : (
                      <button
                        aria-label="Editar gasto fixo"
                        title="Editar gasto fixo"
                        className="rounded-lg p-1 text-emerald-400 transition hover:bg-emerald-500/15 hover:text-emerald-300"
                        onClick={() => startEditingFixedEntry(transaction)}
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    <button
                      aria-label="Remover gasto fixo"
                      title="Remover gasto fixo"
                      className="rounded-lg p-1 text-red-400 transition hover:bg-red-500/15 hover:text-red-300"
                      onClick={() => removeFixedEntry(transaction)}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : isInstallmentPlanned ? (
                  <div className="flex items-center gap-1">
                    <div className="group relative">
                      <button
                        aria-label="Editar parcelamento indisponível na tela de transações"
                        className="cursor-not-allowed rounded-lg p-1 text-zinc-600"
                        type="button"
                        disabled
                      >
                        <Pencil size={15} />
                      </button>
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-56 -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200 shadow-lg group-hover:block">
                        Parcelamentos só podem ser editados na tela de Planejamento.
                      </span>
                    </div>
                    <button
                      aria-label="Remover parcelamento"
                      title="Remover parcelamento"
                      className="rounded-lg p-1 text-red-400 transition hover:bg-red-500/15 hover:text-red-300"
                      onClick={() => removeInstallmentEntry(transaction)}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : isIncomePlanned ? (
                  <div className="flex items-center gap-1">
                    <button
                      aria-label="Editar faturamento"
                      title="Editar faturamento no Planejamento"
                      className="rounded-lg p-1 text-emerald-400 transition hover:bg-emerald-500/15 hover:text-emerald-300"
                      onClick={() => openPlanningForEntry(transaction as PlannedEntry)}
                    >
                      <Pencil size={15} />
                    </button>
                    <div className="group relative">
                      <button
                        aria-label="Remover faturamento indisponível na tela de transações"
                        className="cursor-not-allowed rounded-lg p-1 text-zinc-600"
                        type="button"
                        disabled
                      >
                        <X size={15} />
                      </button>
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-56 -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200 shadow-lg group-hover:block">
                        Faturamento é calculado no Planejamento e não pode ser removido nesta tela.
                      </span>
                    </div>
                  </div>
                ) : (
                  <button
                    aria-label="Editar item planejado"
                    title="Editar item planejado"
                    className="rounded-lg p-1 text-emerald-400 transition hover:bg-emerald-500/15 hover:text-emerald-300"
                    onClick={() => openPlanningForEntry(transaction as PlannedEntry)}
                  >
                    <Pencil size={15} />
                  </button>
                ))
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}

export default Transactions
