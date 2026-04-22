import { MouseEvent, useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { CalendarDays, ChevronDown } from "lucide-react"
import { Category } from "../../types/finance"
import { CreditCard } from "../../types/card"
import { PaymentMethod, Transaction } from "../../types/transaction"
import { parseCurrencyInput } from "../../utils/currency-input"

type TransactionFormProps = {
  categories: Category[]
  cards: CreditCard[]
  initialCreditCardId?: string
  onSubmitTransaction: (transaction: Transaction) => void
}

const quickValueChips = [10, 25, 50, 100, 200]
const numpadKeys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "00", "0", "⌫"]
const paymentMethodOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Conta" },
  { value: "debit", label: "Débito" },
  { value: "pix", label: "Pix" },
  { value: "bank-transfer", label: "Transferência" },
  { value: "bank-slip", label: "Boleto" },
  { value: "cash-money", label: "Dinheiro" },
  { value: "credit", label: "Crédito" }
]
const selectClassName =
  "w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 pr-9 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
const inputClassName =
  "w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
const labelClassName = "grid gap-1 text-xs font-medium text-zinc-400"

function getTodayDate() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function formatDateLabel(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return "Selecionar data"
  }

  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  })
}

function getInitialCardId(cards: CreditCard[], initialCreditCardId?: string) {
  if (initialCreditCardId && cards.some((card) => card.id === initialCreditCardId)) {
    return initialCreditCardId
  }

  return cards[0]?.id || ""
}

function getInitialPaymentMethod(cards: CreditCard[], initialCreditCardId?: string): PaymentMethod {
  return getInitialCardId(cards, initialCreditCardId) ? "credit" : "cash"
}

export const TransactionForm = ({
  categories,
  cards,
  initialCreditCardId,
  onSubmitTransaction
}: TransactionFormProps) => {
  const [label, setLabel] = useState("")
  const [amountCents, setAmountCents] = useState(0)
  const [date, setDate] = useState(getTodayDate())
  const [option, setOption] = useState(2)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    getInitialPaymentMethod(cards, initialCreditCardId)
  )
  const [cardId, setCardId] = useState(getInitialCardId(cards, initialCreditCardId))
  const [categoryId, setCategoryId] = useState(categories[0].id)
  const [subcategoryId, setSubcategoryId] = useState(categories[0].subcategories[0].id)
  const [tagsInput, setTagsInput] = useState("")
  const [showMissingCardModal, setShowMissingCardModal] = useState(false)
  const [competenceMonth, setCompetenceMonth] = useState("")
  const dateInputRef = useRef<HTMLInputElement>(null)

  function openDatePicker() {
    try {
      (dateInputRef.current as HTMLInputElement & { showPicker?: () => void })?.showPicker?.()
    } catch {
      dateInputRef.current?.click()
    }
  }

  const filteredCategories = useMemo(
    () => option === 2 ? categories.filter((c) => c.id !== "rendas") : categories,
    [categories, option]
  )

  const selectedCategory = useMemo(
    () => filteredCategories.find((category) => category.id === categoryId) || filteredCategories[0],
    [filteredCategories, categoryId]
  )

  useEffect(() => {
    if (!cardId && cards[0]?.id) {
      setCardId(getInitialCardId(cards, initialCreditCardId))
    }
  }, [cards, cardId, initialCreditCardId])

  useEffect(() => {
    if (!initialCreditCardId || !cards.some((card) => card.id === initialCreditCardId)) {
      return
    }

    setOption(2)
    setPaymentMethod("credit")
    setCardId(initialCreditCardId)
  }, [initialCreditCardId, cards])

  function formatCents(cents: number) {
    return (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    })
  }

  function parseTags() {
    const typedTags = tagsInput
      .split(",")
      .map((tag) => tag.trim().replace(/^#/, ""))
      .filter((tag) => tag.length > 0)

    return Array.from(new Set(typedTags))
  }

  function resetValues() {
    setLabel("")
    setAmountCents(0)
    setDate(getTodayDate())
    setOption(2)
    setPaymentMethod(getInitialPaymentMethod(cards, initialCreditCardId))
    setCardId(getInitialCardId(cards, initialCreditCardId))
    setCategoryId(categories[0].id)
    setSubcategoryId(categories[0].subcategories[0].id)
    setTagsInput("")
    setCompetenceMonth("")
  }

  function addQuickValue(amount: number) {
    setAmountCents((currentCents) => currentCents + amount * 100)
  }

  function pressNumpad(key: string) {
    if (key === "⌫") {
      setAmountCents((currentCents) => Math.floor(currentCents / 10))
      return
    }

    setAmountCents((currentCents) => {
      const raw = String(currentCents) + key
      const next = Number(raw)
      return Number.isFinite(next) ? next : currentCents
    })
  }

  function selectTransaction(transactionType: number) {
    setOption(transactionType)
    if (transactionType === 1) {
      setPaymentMethod("cash")
      return
    }

    if (categoryId === "rendas") {
      const firstExpenseCategory = categories.find((c) => c.id !== "rendas") || categories[0]
      setCategoryId(firstExpenseCategory.id)
      setSubcategoryId(firstExpenseCategory.subcategories[0].id)
    }

    if (paymentMethod === "cash" && cards.length > 0) {
      setPaymentMethod("credit")
      setCardId(getInitialCardId(cards, initialCreditCardId))
    }
  }

  function handleCategory(nextCategoryId: string) {
    const nextCategory =
      filteredCategories.find((category) => category.id === nextCategoryId) || filteredCategories[0]
    setCategoryId(nextCategory.id)
    setSubcategoryId(nextCategory.subcategories[0].id)
  }

  function handlePaymentMethod(nextPaymentMethod: PaymentMethod) {
    if (nextPaymentMethod === "credit" && cards.length === 0) {
      setShowMissingCardModal(true)
      setPaymentMethod("cash")
      setCardId("")
      return
    }

    setPaymentMethod(nextPaymentMethod)
    if (nextPaymentMethod === "credit") {
      setCardId(getInitialCardId(cards, initialCreditCardId))
      return
    }

    setCardId("")
  }

  function submitTransaction(e: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) {
    e.preventDefault()
    const isCreditExpense = option === 2 && paymentMethod === "credit"
    if (!date || amountCents <= 0) {
      alert("Valor e data são obrigatórios")
      return
    }
    if (isCreditExpense && !cardId) {
      alert("Selecione um cartão para despesas no crédito")
      return
    }

    const fallbackLabel =
      selectedCategory.subcategories.find((subcategory) => subcategory.id === subcategoryId)
        ?.name || selectedCategory.name

    onSubmitTransaction({
      id: crypto.randomUUID(),
      label: label.trim() || fallbackLabel,
      value: amountCents / 100,
      date: date.toString(),
      type: option,
      paymentMethod: option === 1 ? "cash" : paymentMethod,
      cardId: isCreditExpense ? cardId : undefined,
      categoryId,
      subcategoryId,
      tags: parseTags(),
      competenceMonth: option === 1 && competenceMonth ? competenceMonth : undefined
    })
    resetValues()
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-300">
        Lançamento rápido
      </h2>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="mb-3 text-sm text-zinc-400">Valor</div>
          <div className="mb-3 text-3xl font-semibold text-zinc-100">{formatCents(amountCents)}</div>
          <label className={`${labelClassName} mb-3`}>
            Valor da transação
            <input
              className={inputClassName}
              type="text"
              inputMode="decimal"
              placeholder="R$ 0,00"
              value={amountCents > 0 ? formatCents(amountCents) : ""}
              onChange={(event) =>
                setAmountCents(Math.round(parseCurrencyInput(event.target.value) * 100))
              }
            />
          </label>
          <div className="mb-3 flex flex-wrap gap-2">
            {quickValueChips.map((chipValue) => (
              <button
                key={chipValue}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-emerald-500 hover:text-emerald-300"
                onClick={(event) => {
                  event.preventDefault()
                  addQuickValue(chipValue)
                }}
              >
                +R$ {chipValue}
              </button>
            ))}
            <button
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-amber-500 hover:text-amber-300"
              onClick={(event) => {
                event.preventDefault()
                setAmountCents(0)
              }}
            >
              Limpar
            </button>
          </div>
          <label className={`${labelClassName} mb-3`}>
            Ajuste rápido do valor
            <input
              className="w-full accent-emerald-500"
              type="range"
              min="0"
              max="500000"
              step="500"
              value={amountCents}
              onChange={(event) => setAmountCents(Number(event.target.value))}
            />
          </label>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-2.5">
            <div className="mb-2 text-[11px] uppercase tracking-wide text-zinc-500">
              Teclado numérico
            </div>
            <div className="grid grid-cols-3 gap-2">
              {numpadKeys.map((key) => {
                const isDeleteKey = key === "⌫"
                const isDoubleZeroKey = key === "00"
                return (
                  <button
                    key={key}
                    className={`h-11 rounded-xl border text-base font-semibold transition active:scale-[0.98] ${
                      isDeleteKey
                        ? "border-rose-500/45 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                        : isDoubleZeroKey
                          ? "border-indigo-500/45 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20"
                          : "border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-emerald-500 hover:text-emerald-300"
                    }`}
                    onClick={(event) => {
                      event.preventDefault()
                      pressNumpad(key)
                    }}
                  >
                    {key}
                  </button>
                )
              })}
            </div>
          </div>
        </motion.div>

        <motion.form initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid content-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`rounded-xl border px-3 py-2 text-sm transition ${
                option === 1
                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                  : "border-zinc-700 bg-zinc-900 text-zinc-300"
              }`}
              onClick={(event) => {
                event.preventDefault()
                selectTransaction(1)
              }}
            >
              Ganho
            </button>
            <button
              className={`rounded-xl border px-3 py-2 text-sm transition ${
                option === 2
                  ? "border-amber-500 bg-amber-500/15 text-amber-300"
                  : "border-zinc-700 bg-zinc-900 text-zinc-300"
              }`}
              onClick={(event) => {
                event.preventDefault()
                selectTransaction(2)
              }}
            >
              Despesa
            </button>
          </div>

          <div className={option === 1 ? "grid grid-cols-2 gap-2" : ""}>
            <label className={labelClassName}>
              Data
              <div
                className="relative flex h-11 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 transition hover:border-zinc-500 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/30"
                onClick={openDatePicker}
              >
                <CalendarDays size={16} className="text-zinc-400" />
                <span className="truncate">{formatDateLabel(date)}</span>
                <input
                  ref={dateInputRef}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  aria-label="Data da transação"
                />
              </div>
            </label>
            {option === 1 && (
              <label className={labelClassName}>
                Mês de competência
                <div className="relative">
                  <select
                    className={selectClassName}
                    value={competenceMonth}
                    onChange={(event) => setCompetenceMonth(event.target.value)}
                  >
                    <option value="">Mês Atual</option>
                    {(() => {
                      const now = new Date()
                      const year = now.getFullYear()
                      const isDecember = now.getMonth() === 11
                      const totalMonths = isDecember ? 13 : 12
                      return Array.from({ length: totalMonths }, (_, i) => {
                        const d = new Date(year, i, 1)
                        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
                        const monthLabel = d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
                        return (
                          <option key={key} value={key}>
                            {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
                          </option>
                        )
                      })
                    })()}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                </div>
              </label>
            )}
          </div>
          {option === 1 && competenceMonth && competenceMonth !== date.slice(0, 7) && (
            <span className="text-[11px] text-indigo-300">
              ⏳ Esta renda será contabilizada em{" "}
              {new Date(`${competenceMonth}-01T00:00:00`).toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric"
              })}
            </span>
          )}
          <label className={labelClassName}>
            Descrição
            <input
              className={inputClassName}
              type="text"
              placeholder="Descrição opcional"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className={labelClassName}>
              Categoria
              <div className="relative">
                <select
                  className={selectClassName}
                  value={categoryId}
                  onChange={(event) => handleCategory(event.target.value)}
                >
                  {filteredCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              </div>
            </label>
            <label className={labelClassName}>
              Subcategoria
              <div className="relative">
                <select
                  className={selectClassName}
                  value={subcategoryId}
                  onChange={(event) => setSubcategoryId(event.target.value)}
                >
                  {selectedCategory.subcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              </div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className={labelClassName}>
              Forma de pagamento
              <div className="relative">
                <select
                  className={`${selectClassName} disabled:cursor-not-allowed disabled:opacity-50`}
                  value={paymentMethod}
                  onChange={(event) => handlePaymentMethod(event.target.value as PaymentMethod)}
                  disabled={option === 1}
                >
                  {paymentMethodOptions.map((option) => (
                    <option key={`transaction-payment-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              </div>
            </label>
            <label className={labelClassName}>
              Cartão
              <div className="relative">
                <select
                  className={`${selectClassName} disabled:cursor-not-allowed disabled:opacity-50`}
                  value={cardId}
                  onChange={(event) => setCardId(event.target.value)}
                  disabled={!(option === 2 && paymentMethod === "credit")}
                >
                  {cards.length === 0 && <option value="">Nenhum cartão cadastrado</option>}
                  {cards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              </div>
            </label>
          </div>
          {option === 2 && paymentMethod === "credit" && (
            <p className="rounded-xl border border-emerald-500/60 bg-emerald-500/15 px-3 py-2 text-xs text-emerald-300">
              Vincule essa saída a um cartão de crédito cadastrado
            </p>
          )}

          <label className={labelClassName}>
            Tags
            <input
              className={inputClassName}
              type="text"
              placeholder="Separadas por vírgula"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
            />
          </label>

          <button
            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-400"
            onClick={submitTransaction}
            type="button"
          >
            Lançar transação
          </button>
        </motion.form>
      </div>
      {showMissingCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl shadow-zinc-950/60">
            <h3 className="text-lg font-semibold text-zinc-100">Cartão de crédito necessário</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Adicione um cartão de crédito na tela inicial antes de vincular uma saída ao crédito.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-400"
                onClick={() => setShowMissingCardModal(false)}
                type="button"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
