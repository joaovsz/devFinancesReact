import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Transaction } from "../../types/transaction"
import {
  formatCurrencyFromNumber,
  formatCurrencyInput,
  parseCurrencyInput
} from "../../utils/currency-input"

type CardInvoiceModalProps = {
  isOpen: boolean
  cardName: string
  monthKey: string
  currentInvoice: number
  postedInvoice: number
  manualAdjustmentValue: number
  transactions: Transaction[]
  plannedItems: Array<{
    id: string
    label: string
    value: number
    sourceLabel: string
  }>
  onClose: () => void
  onSaveManualAdjustment: (value: number) => void
  onRemoveManualAdjustment: () => void
  onMarkAsPaid: () => void
  onOpenTransactions: () => void
  onAddExpense: () => void
}

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number)
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  })
}

function formatDate(dateString: string) {
  const [year, month, day] = dateString.split("-")
  if (!year || !month || !day) {
    return dateString
  }
  return `${day}/${month}/${year}`
}

export const CardInvoiceModal = ({
  isOpen,
  cardName,
  monthKey,
  currentInvoice,
  postedInvoice,
  manualAdjustmentValue,
  transactions,
  plannedItems,
  onClose,
  onSaveManualAdjustment,
  onRemoveManualAdjustment,
  onMarkAsPaid,
  onOpenTransactions,
  onAddExpense
}: CardInvoiceModalProps) => {
  const [manualAdjustmentInput, setManualAdjustmentInput] = useState("")
  const baseInvoiceWithoutManualAdjustment = postedInvoice - manualAdjustmentValue

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setManualAdjustmentInput(
      formatCurrencyFromNumber(postedInvoice)
    )
  }, [isOpen, postedInvoice])

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/80 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Fatura de {cardName}</h2>
            <p className="mt-1 text-xs text-zinc-400">
              {getMonthLabel(monthKey)} · Prevista: {formatCurrencyFromNumber(currentInvoice)}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              Lançada no banco: {formatCurrencyFromNumber(postedInvoice)}
            </p>
          </div>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
            onClick={onClose}
            type="button"
            aria-label="Fechar fatura"
          >
            <X size={14} />
          </button>
        </div>

        <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Valor total da fatura
            </h3>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <p className="mb-2 text-[11px] text-zinc-500">
                O ajuste usa apenas o que já foi lançado pelo banco. Cobranças futuras do ciclo
                continuam projetadas, mas não entram nessa base.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                  type="text"
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                  value={manualAdjustmentInput}
                  onChange={(event) =>
                    setManualAdjustmentInput(formatCurrencyInput(event.target.value))
                  }
                />
                <div className="flex gap-2">
                  <button
                    className="rounded-xl border border-emerald-500/60 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
                    onClick={() => {
                      const totalInvoice = Math.max(parseCurrencyInput(manualAdjustmentInput), 0)
                      const nextManualAdjustment =
                        Math.max(totalInvoice - baseInvoiceWithoutManualAdjustment, 0)
                      onSaveManualAdjustment(nextManualAdjustment)
                    }}
                    type="button"
                  >
                    Salvar total
                  </button>
                  <button
                    className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
                    onClick={onRemoveManualAdjustment}
                    type="button"
                  >
                    Remover ajuste
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Itens planejados da fatura
            </h3>
            {plannedItems.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-zinc-500">
                Nenhum item planejado para este cartão neste mês.
              </div>
            ) : (
              <div className="space-y-1.5">
                {plannedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs text-zinc-100">{item.label}</p>
                      <p className="text-[10px] text-zinc-500">{item.sourceLabel}</p>
                    </div>
                    <p className="text-xs font-semibold text-zinc-200">
                      {formatCurrencyFromNumber(item.value)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Transações lançadas
            </h3>
          {transactions.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-6 text-center text-sm text-zinc-400">
              Nenhuma transação de crédito encontrada para este cartão no mês.
            </div>
          ) : (
            <div className="space-y-1.5">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs text-zinc-100">{transaction.label}</p>
                    <p className="text-[10px] text-zinc-500">{formatDate(transaction.date)}</p>
                  </div>
                  <p className="text-xs font-semibold text-zinc-200">
                    {formatCurrencyFromNumber(transaction.value)}
                  </p>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
            onClick={onClose}
            type="button"
          >
            Fechar
          </button>
          <button
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
            onClick={onAddExpense}
            type="button"
          >
            Adicionar gasto
          </button>
          <button
            className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-medium text-zinc-950 transition hover:bg-emerald-400"
            onClick={onMarkAsPaid}
            type="button"
          >
            Marcar como paga
          </button>
          <button
            className="rounded-xl border border-emerald-500/60 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
            onClick={onOpenTransactions}
            type="button"
          >
            Abrir transações
          </button>
        </div>
      </div>
    </div>
  )
}
