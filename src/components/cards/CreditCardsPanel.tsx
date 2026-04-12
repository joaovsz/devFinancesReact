import { MouseEvent, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { v4 as uuid } from "uuid"
import { CreditCard } from "../../types/card"
import { Transaction } from "../../types/transaction"
import { FixedCost, InstallmentPlan } from "../../types/planning"
import { formatCurrency } from "../Transactions"
import { bankPresets } from "../../data/banks"
import { NumberTicker } from "../magic/NumberTicker"
import {
  getCurrentMonthKey,
  getInstallmentTotalForMonth
} from "../../utils/projections"

type CreditCardsPanelProps = {
  cards: CreditCard[]
  transactions: Transaction[]
  fixedCosts: FixedCost[]
  installmentPlans: InstallmentPlan[]
  onAddCard: (card: CreditCard) => void
  onUpdateCard: (card: CreditCard) => void
}

export const CreditCardsPanel = ({
  cards,
  transactions,
  fixedCosts,
  installmentPlans,
  onAddCard,
  onUpdateCard
}: CreditCardsPanelProps) => {
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null)
  const [showAddCardForm, setShowAddCardForm] = useState(false)
  const [selectedBankId, setSelectedBankId] = useState(bankPresets[0].id)
  const [newCardLimit, setNewCardLimit] = useState("")
  const [newCardCloseDay, setNewCardCloseDay] = useState("")
  const [newCardDueDay, setNewCardDueDay] = useState("")
  const dayOptions = Array.from({ length: 31 }, (_, index) => String(index + 1))
  const selectClassName =
    "w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 pr-9 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"

  function hexToRgba(hex: string, alpha: number) {
    const normalized = hex.replace("#", "")
    const bigint = parseInt(normalized.length === 3
      ? normalized.split("").map((char) => char + char).join("")
      : normalized, 16)
    const r = (bigint >> 16) & 255
    const g = (bigint >> 8) & 255
    const b = bigint & 255
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  function calculateCardUsage(currentCardId: string) {
    const currentMonth = getCurrentMonthKey()

    const transactionUsage = transactions
      .filter(
        (transaction) =>
          transaction.type === 2 &&
          transaction.paymentMethod === "credit" &&
          transaction.cardId === currentCardId
      )
      .reduce((totalValue, transaction) => totalValue + transaction.value, 0)

    return transactionUsage + calculatePlannedCardUsageForMonth(currentCardId, currentMonth)
  }

  function calculatePlannedCardUsageForMonth(currentCardId: string, monthKey: string) {
    const plannedFixedUsage = fixedCosts
      .filter((cost) => cost.paymentMethod === "credit" && cost.cardId === currentCardId)
      .reduce((totalValue, cost) => totalValue + cost.amount, 0)

    const plannedInstallmentsUsage = getInstallmentTotalForMonth(
      installmentPlans.filter(
        (plan) => plan.paymentMethod === "credit" && plan.cardId === currentCardId
      ),
      monthKey
    )

    return plannedFixedUsage + plannedInstallmentsUsage
  }

  function formatMoneyInput(value: number) {
    return value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  function parseMoneyInput(value: string) {
    const normalized = value
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "")

    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }

  function normalizeMoneyInput(value: string) {
    const cleaned = value.replace(/[^\d,]/g, "")
    if (!cleaned.includes(",")) {
      return cleaned
    }

    const [intPart, ...decimalParts] = cleaned.split(",")
    return `${intPart},${decimalParts.join("").slice(0, 2)}`
  }

  function getCurrentMonthInvoiceTotal() {
    const now = new Date()
    const targetMonth = now.getMonth()
    const targetYear = now.getFullYear()

    const transactionsTotal = transactions
      .filter((transaction) => {
        if (!(transaction.type === 2 && transaction.paymentMethod === "credit")) {
          return false
        }

        const transactionDate = new Date(transaction.date)
        return (
          transactionDate.getMonth() === targetMonth &&
          transactionDate.getFullYear() === targetYear
        )
      })
      .reduce((totalValue, transaction) => totalValue + transaction.value, 0)

    const monthKey = getCurrentMonthKey()
    const plannedCardsTotal = cards.reduce(
      (totalValue, card) => totalValue + calculatePlannedCardUsageForMonth(card.id, monthKey),
      0
    )

    const manualTotal = cards.reduce(
      (totalValue, card) => totalValue + (card.manualInvoiceAmount || 0),
      0
    )

    return transactionsTotal + plannedCardsTotal + manualTotal
  }

  function getUsageBarColor(usagePercentage: number) {
    if (usagePercentage >= 85) {
      return "bg-amber-500"
    }

    if (usagePercentage >= 60) {
      return "bg-amber-400"
    }

    return "bg-emerald-500"
  }

  function updateCardField(card: CreditCard, field: keyof CreditCard, value: string) {
    const numericValue = Number(value)

    if (field === "brandColor") {
      onUpdateCard({
        ...card,
        brandColor: value
      })
      return
    }

    if (Number.isNaN(numericValue)) {
      return
    }

    onUpdateCard({
      ...card,
      [field]: numericValue
    })
  }

  function handleAddCard(e: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) {
    e.preventDefault()

    if (!selectedBankId || !newCardLimit || !newCardCloseDay || !newCardDueDay) {
      alert("Preencha os campos do novo cartão")
      return
    }

    const selectedBank = bankPresets.find((bank) => bank.id === selectedBankId)

    onAddCard({
      id: uuid(),
      name: selectedBank?.name || "Novo Cartão",
      brandColor: selectedBank?.brandColor || "#10B981",
      limitTotal: parseMoneyInput(newCardLimit),
      closeDay: Number(newCardCloseDay),
      dueDay: Number(newCardDueDay),
      manualInvoiceAmount: 0
    })

    setNewCardLimit("")
    setNewCardCloseDay("")
    setNewCardDueDay("")
    setShowAddCardForm(false)
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-300">
        Limite de cartões
      </h2>
      <p className="mb-3 text-xs text-zinc-500">
        Dê dois cliques no cartão para abrir as configurações.
      </p>
      <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="text-xs uppercase tracking-wide text-zinc-400">
          Faturas do mês atual
        </div>
        <NumberTicker
          className="mt-1 text-xl font-semibold text-zinc-100"
          value={getCurrentMonthInvoiceTotal()}
          format={formatCurrency}
        />
      </div>
      <div className="grid items-start gap-3 md:grid-cols-2">
        {cards.map((card) => {
          const currentMonth = getCurrentMonthKey()
          const plannedCardUsage = calculatePlannedCardUsageForMonth(card.id, currentMonth)
          const usedLimit = calculateCardUsage(card.id) + (card.manualInvoiceAmount || 0)
          const usagePercentage = Math.min((usedLimit / card.limitTotal) * 100, 100)
          const availableLimit = card.limitTotal - usedLimit
          const isExpanded = expandedCardId === card.id

          return (
            <motion.article
              layout
              animate={{
                scale: isExpanded ? 1.03 : 1,
                y: isExpanded ? -3 : 0,
                boxShadow: isExpanded
                  ? "0 14px 34px rgba(16, 185, 129, 0.25)"
                  : "0 0 0 rgba(0,0,0,0)"
              }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              key={card.id}
              className={`self-start rounded-xl border p-4 select-none ${
                isExpanded ? "ring-1 ring-emerald-500/60" : ""
              }`}
              onDoubleClick={(event: MouseEvent<HTMLElement>) => {
                const target = event.target as HTMLElement
                if (target.closest("input, select, button, textarea")) {
                  return
                }
                setExpandedCardId((currentCardId) =>
                  currentCardId === card.id ? null : card.id
                )
              }}
              style={{
                borderColor: hexToRgba(card.brandColor, 0.65),
                background: `linear-gradient(135deg, ${hexToRgba(card.brandColor, 0.22)}, rgba(9, 9, 11, 0.92))`
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-100 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
                  {card.name}
                </span>
                <span className="text-xs text-zinc-100/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]">
                  Fechamento {card.closeDay} | Vencimento {card.dueDay}
                </span>
              </div>
              <div className="mb-2 h-2 w-full rounded-full bg-zinc-800">
                <div
                  className={`h-2 rounded-full transition-all ${getUsageBarColor(usagePercentage)}`}
                  style={{ width: `${usagePercentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-100/95 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
                <span>
                  Usado:{" "}
                  <NumberTicker value={usedLimit} format={formatCurrency} />
                </span>
                <span>
                  Disponível:{" "}
                  <NumberTicker
                    value={availableLimit > 0 ? availableLimit : 0}
                    format={formatCurrency}
                  />
                </span>
              </div>
              {plannedCardUsage > 0 && (
                <p className="mt-2 text-[11px] text-zinc-100/85 drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]">
                  Planejado no mês: {formatCurrency(plannedCardUsage)}
                </p>
              )}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="grid grid-cols-2 gap-3 overflow-hidden"
                  >
                    <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-zinc-400">
                      Limite total
                      <input
                        className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none"
                        type="text"
                        inputMode="decimal"
                        value={formatMoneyInput(card.limitTotal)}
                        onChange={(event) =>
                          updateCardField(
                            card,
                            "limitTotal",
                            String(parseMoneyInput(event.target.value))
                          )
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-zinc-400">
                      Fatura manual
                      <input
                        className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none"
                        type="text"
                        inputMode="decimal"
                        value={formatMoneyInput(card.manualInvoiceAmount || 0)}
                        onChange={(event) =>
                          updateCardField(
                            card,
                            "manualInvoiceAmount",
                            String(parseMoneyInput(event.target.value))
                          )
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-zinc-400">
                      Fechamento
                      <input
                        className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none"
                        type="number"
                        min="1"
                        max="31"
                        value={card.closeDay}
                        onChange={(event) => updateCardField(card, "closeDay", event.target.value)}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-zinc-400">
                      Vencimento
                      <input
                        className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none"
                        type="number"
                        min="1"
                        max="31"
                        value={card.dueDay}
                        onChange={(event) => updateCardField(card, "dueDay", event.target.value)}
                      />
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.article>
          )
        })}
      </div>
      <div className="mt-4 flex justify-end">
        <button
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
          onClick={(event) => {
            event.preventDefault()
            setShowAddCardForm((currentValue) => !currentValue)
          }}
        >
          {showAddCardForm ? "Cancelar" : "+ Adicionar cartão"}
        </button>
      </div>
      {showAddCardForm && (
        <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <h3 className="mb-3 text-sm font-semibold text-zinc-100">Adicionar cartão</h3>
          <div className="grid gap-2 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
            <div className="relative">
              <select
                className={`${selectClassName} md:col-span-2`}
                value={selectedBankId}
                onChange={(event) => setSelectedBankId(event.target.value)}
              >
                {bankPresets.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
              />
            </div>
            <input
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
              type="text"
              inputMode="decimal"
              placeholder="Limite"
              value={newCardLimit}
              onChange={(event) => setNewCardLimit(normalizeMoneyInput(event.target.value))}
              onBlur={() => setNewCardLimit(formatMoneyInput(parseMoneyInput(newCardLimit)))}
            />
            <div className="relative">
              <select
                className={selectClassName}
                value={newCardCloseDay}
                onChange={(event) => setNewCardCloseDay(event.target.value)}
              >
                <option value="">Fech.</option>
                {dayOptions.map((day) => (
                  <option key={`close-${day}`} value={day}>
                    Dia {day}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
              />
            </div>
            <div className="relative">
              <select
                className={selectClassName}
                value={newCardDueDay}
                onChange={(event) => setNewCardDueDay(event.target.value)}
              >
                <option value="">Venc.</option>
                {dayOptions.map((day) => (
                  <option key={`due-${day}`} value={day}>
                    Dia {day}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
              />
            </div>
            <button
              className="rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-400"
              onClick={handleAddCard}
            >
              Salvar
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
