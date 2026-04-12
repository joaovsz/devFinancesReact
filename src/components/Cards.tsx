import { MouseEvent, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronDown, CreditCard, Plus, Wallet } from "lucide-react"
import { fetchBrazilHolidaysByYear, Holiday } from "../services/calendar"
import { getCurrentMonthKey } from "../utils/projections"
import { buildPlannedEntriesForMonth } from "../utils/planningEntries"
import { useTransactionStore } from "../store/useTransactionStore"
import { NumberTicker } from "./magic/NumberTicker"
import { formatCurrency } from "./Transactions"
import { bankPresets, BankPreset } from "../data/banks"
import {
  formatCurrencyFromNumber,
  formatCurrencyInput,
  parseCurrencyInput
} from "../utils/currency-input"
import { fetchBankInstitutions } from "../services/banks"
import { CreditCard as CardType } from "../types/card"
import { DismissibleInfoCard } from "./ui/DismissibleInfoCard"

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
  const removeCard = useTransactionStore((state) => state.removeCard)

  const currentMonth = getCurrentMonthKey()
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [showAddCardForm, setShowAddCardForm] = useState(false)
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null)
  const [institutions, setInstitutions] = useState<BankPreset[]>(bankPresets)
  const [selectedBankId, setSelectedBankId] = useState(bankPresets[0].id)
  const [newCardLimit, setNewCardLimit] = useState("")
  const [newCardCloseDay, setNewCardCloseDay] = useState("")
  const [newCardDueDay, setNewCardDueDay] = useState("")
  const dayOptions = Array.from({ length: 31 }, (_, index) => String(index + 1))

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

  useEffect(() => {
    let ignore = false
    fetchBankInstitutions().then((items) => {
      if (ignore || items.length === 0) {
        return
      }
      setInstitutions(items)
      if (!items.some((item) => item.id === selectedBankId)) {
        setSelectedBankId(items[0].id)
      }
    })

    return () => {
      ignore = true
    }
  }, [])

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

  const recentTransactions = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 6),
    [transactions]
  )

  const cardUsage = useMemo(
    () =>
      cards.map((card) => {
        const monthKey = getCurrentMonthKey()
        const transactionUsage = transactions
          .filter(
            (transaction) =>
              transaction.type === 2 &&
              transaction.paymentMethod === "credit" &&
              transaction.cardId === card.id
          )
          .reduce((sum, transaction) => sum + transaction.value, 0)

        const plannedFixedUsage = fixedCosts
          .filter((cost) => cost.paymentMethod === "credit" && cost.cardId === card.id)
          .reduce((sum, cost) => sum + cost.amount, 0)

        const plannedInstallments = installmentPlans
          .filter((plan) => plan.paymentMethod === "credit" && plan.cardId === card.id)
          .reduce((sum, plan) => {
            const start = Number(plan.startMonth.split("-")[0]) * 12 + Number(plan.startMonth.split("-")[1])
            const target = Number(monthKey.split("-")[0]) * 12 + Number(monthKey.split("-")[1])
            const currentInstallment = target - start + 1
            if (currentInstallment < 1 || currentInstallment > plan.totalInstallments) {
              return sum
            }
            return sum + plan.installmentValue
          }, 0)

        const used = transactionUsage + plannedFixedUsage + plannedInstallments + (card.manualInvoiceAmount || 0)
        const available = Math.max(card.limitTotal - used, 0)
        const usagePercentage = Math.min((used / Math.max(card.limitTotal, 1)) * 100, 100)

        return {
          ...card,
          used,
          available,
          usagePercentage
        }
      }),
    [cards, transactions, fixedCosts, installmentPlans]
  )

  const totalCreditUsed = cardUsage.reduce((sum, card) => sum + card.used, 0)
  const totalCreditLimit = cardUsage.reduce((sum, card) => sum + card.limitTotal, 0)

  function getCardBrandColor(cardName: string, currentColor: string) {
    return cardName.toLowerCase().includes("ourocard") ? "#FFCD00" : currentColor
  }

  function hexToRgba(hex: string, alpha: number) {
    const normalized = hex.replace("#", "")
    const bigint = parseInt(
      normalized.length === 3
        ? normalized.split("").map((char) => char + char).join("")
        : normalized,
      16
    )
    const r = (bigint >> 16) & 255
    const g = (bigint >> 8) & 255
    const b = bigint & 255
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  function updateCardField(card: CardType, field: keyof CardType, value: string) {
    const numericValue = Number(value)
    if (Number.isNaN(numericValue)) {
      return
    }

    updateCard({
      ...card,
      [field]: numericValue
    })
  }

  function handleAddCard() {
    if (!selectedBankId || !newCardLimit || !newCardCloseDay || !newCardDueDay) {
      return
    }

    const selectedBank = institutions.find((bank) => bank.id === selectedBankId)
    addCard({
      id: crypto.randomUUID(),
      bankId: selectedBank?.id,
      name: selectedBank?.name || "Novo Cartão",
      brandColor: selectedBank?.brandColor || "#10B981",
      logoUrl: selectedBank?.logoUrl,
      limitTotal: parseCurrencyInput(newCardLimit),
      closeDay: Number(newCardCloseDay),
      dueDay: Number(newCardDueDay),
      manualInvoiceAmount: 0
    })

    setNewCardLimit("")
    setNewCardCloseDay("")
    setNewCardDueDay("")
    setShowAddCardForm(false)
  }

  function handleRemoveCard(cardId: string) {
    removeCard(cardId)
    setExpandedCardId((current) => (current === cardId ? null : current))
  }

  return (
    <section className="grid gap-4 lg:grid-cols-12">
      <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 lg:col-span-6">
        <div className="mb-2 text-xs uppercase tracking-wide text-zinc-400">Saldo total</div>
        <NumberTicker
          className={`text-4xl ${summaryTotal >= 0 ? "text-zinc-100" : "text-amber-300"}`}
          value={summaryTotal}
          format={formatCurrency}
        />
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="mb-1 text-xs text-zinc-500">Entradas</div>
            <NumberTicker className="text-lg text-emerald-400" value={summaryIncomes} format={formatCurrency} />
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="mb-1 text-xs text-zinc-500">Saídas</div>
            <NumberTicker className="text-lg text-amber-400" value={summaryExpenses} format={formatCurrency} />
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 lg:col-span-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-zinc-400">Crédito usado</span>
          <CreditCard size={16} className="text-zinc-500" />
        </div>
        <NumberTicker className="text-2xl text-zinc-100" value={totalCreditUsed} format={formatCurrency} />
        <div className="mt-3 h-2 w-full rounded-full bg-zinc-800">
          <div
            className="h-2 rounded-full bg-amber-400"
            style={{ width: `${Math.min((totalCreditUsed / Math.max(totalCreditLimit, 1)) * 100, 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs font-bold text-zinc-500">
          Limite total: {formatCurrency(totalCreditLimit)}
        </p>
      </article>

      <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 lg:col-span-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-zinc-400">Movimentação</span>
          <Wallet size={16} className="text-zinc-500" />
        </div>
        <p className="text-sm text-zinc-300">
          {transactions.length} transações registradas.
        </p>
        <Link
          to="/transacoes"
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
        >
          Abrir transações
        </Link>
      </article>

      <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 lg:col-span-8">
        <DismissibleInfoCard
          storageKey="info-card-credit-cards"
          title="Como usar Meus Cartões"
          description="Aqui você acompanha limite usado/disponível e gerencia cada cartão."
          items={[
            "Dê duplo clique no cartão para abrir edição.",
            "No modo edição você pode alterar limite, fechamento e vencimento.",
            "Também é possível remover o cartão."
          ]}
        />
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">Meus cartões</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cardUsage.map((card) => (
            (() => {
              const brandColor = getCardBrandColor(card.name, card.brandColor)
              const isExpanded = expandedCardId === card.id
              return (
            <div
              key={card.id}
              className="w-full self-start rounded-xl border p-2.5 select-none"
              style={{
                aspectRatio: isExpanded ? undefined : "2.2 / 1",
                borderColor: hexToRgba(brandColor, 0.65),
                background: `linear-gradient(135deg, ${hexToRgba(brandColor, 0.22)}, var(--card-gradient-end))`
              }}
              onDoubleClick={(event: MouseEvent<HTMLElement>) => {
                const target = event.target as HTMLElement
                if (target.closest("input, select, button, textarea")) {
                  return
                }
                setExpandedCardId((currentCardId) =>
                  currentCardId === card.id ? null : card.id
                )
              }}
            >
              <div className="flex h-full flex-col justify-between">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="block max-w-[48%] truncate whitespace-nowrap text-sm font-medium text-zinc-100">
                    {card.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-zinc-100">
                      Fechamento {card.closeDay} | Vencimento {card.dueDay}
                    </span>
                    {card.logoUrl ? (
                      <img
                        src={card.logoUrl}
                        alt={card.name}
                        className="h-6 w-6 rounded-full bg-white/90 object-contain p-0.5"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: brandColor }} />
                    )}
                  </div>
                </div>
                {isExpanded ? (
                  <div className="mt-2 grid gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/30 p-2">
                    <input
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                      type="text"
                      inputMode="decimal"
                      placeholder="Limite"
                      value={formatCurrencyFromNumber(card.limitTotal)}
                      onChange={(event) =>
                        updateCardField(
                          card,
                          "limitTotal",
                          String(parseCurrencyInput(event.target.value))
                        )
                      }
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        size={1}
                        className="h-10 max-h-10 w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                        value={String(card.closeDay)}
                        onChange={(event) => updateCardField(card, "closeDay", event.target.value)}
                      >
                        {dayOptions.map((day) => (
                          <option key={`card-close-${card.id}-${day}`} value={day}>
                            Fech. {day}
                          </option>
                        ))}
                      </select>
                      <select
                        size={1}
                        className="h-10 max-h-10 w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                        value={String(card.dueDay)}
                        onChange={(event) => updateCardField(card, "dueDay", event.target.value)}
                      >
                        {dayOptions.map((day) => (
                          <option key={`card-due-${card.id}-${day}`} value={day}>
                            Venc. {day}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      className="rounded-xl border border-red-500/60 bg-red-500/15 px-3 py-2 text-xs font-medium text-red-200 transition hover:bg-red-500/25"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        handleRemoveCard(card.id)
                      }}
                      type="button"
                    >
                      Remover cartão
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="mb-1 h-2 w-full rounded-full bg-zinc-800">
                      <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${card.usagePercentage}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-100">
                      <span>
                        Usado: <NumberTicker className="font-black" value={card.used} format={formatCurrency} />
                      </span>
                      <span>
                        Disponível:{" "}
                        <NumberTicker className="font-black" value={card.available} format={formatCurrency} />
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
              )
            })()
          ))}
          <div
            className="w-full self-start rounded-xl border border-zinc-700/80 bg-zinc-950 p-2.5"
            style={{ aspectRatio: showAddCardForm ? undefined : "2.2 / 1" }}
          >
            {!showAddCardForm ? (
              <button
                className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-400 transition hover:text-zinc-200"
                onClick={() => setShowAddCardForm(true)}
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-zinc-200">
                  <Plus size={20} />
                </span>
                <span className="text-xs font-medium">Adicionar cartão</span>
              </button>
            ) : (
              <div className="grid gap-2">
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 pr-8 text-xs text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                    value={selectedBankId}
                    onChange={(event) => setSelectedBankId(event.target.value)}
                  >
                    {institutions.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                </div>
                <input
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                  type="text"
                  inputMode="decimal"
                  placeholder="Limite"
                  value={newCardLimit}
                  onChange={(event) => setNewCardLimit(formatCurrencyInput(event.target.value))}
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    size={1}
                    className="h-10 max-h-10 w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                    value={newCardCloseDay}
                    onChange={(event) => setNewCardCloseDay(event.target.value)}
                  >
                    <option value="">Fech.</option>
                    {dayOptions.map((day) => (
                      <option key={`home-close-${day}`} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                  <select
                    size={1}
                    className="h-10 max-h-10 w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                    value={newCardDueDay}
                    onChange={(event) => setNewCardDueDay(event.target.value)}
                  >
                    <option value="">Venc.</option>
                    {dayOptions.map((day) => (
                      <option key={`home-due-${day}`} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="rounded-xl border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
                    onClick={() => setShowAddCardForm(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="rounded-xl bg-emerald-500 px-2 py-2 text-xs font-medium text-white transition hover:bg-emerald-400"
                    onClick={handleAddCard}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 lg:col-span-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">Últimas transações</h2>
          <Link to="/transacoes" className="text-xs text-zinc-500 hover:text-zinc-300">Ver todas</Link>
        </div>
        <div className="space-y-2">
          {recentTransactions.length === 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-6 text-center text-xs text-zinc-500">
              Sem lançamentos recentes.
            </div>
          )}
          {recentTransactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm text-zinc-200">{transaction.label}</div>
                <div className="text-[11px] text-zinc-500">{transaction.date.split("-").reverse().join("/")}</div>
              </div>
              <span className={`text-sm font-black ${transaction.type === 1 ? "text-emerald-400" : "text-amber-400"}`}>
                {transaction.type === 1 ? "+" : "-"}{formatCurrency(transaction.value)}
              </span>
            </div>
          ))}
        </div>
      </article>
    </section>
  )
}
